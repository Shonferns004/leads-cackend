import axios from 'axios';
import { supabase } from '../config/supabase.js';

export async function searchGooglePlaces(req, res) {
  const { query, location, radius = 5000, minRating } = req.body;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'Google Places API key not configured. Add it in Settings.' });
  }

  try {
    const geocode = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: location, key: apiKey },
    });
    if (!geocode.data.results.length) {
      return res.status(400).json({ error: 'Location not found' });
    }
    const { lat, lng } = geocode.data.results[0].geometry.location;

    const textQuery = `${query} in ${location}`;
    const searchRes = await axios.post('https://places.googleapis.com/v1/places:searchText', {
      textQuery,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.rating,places.websiteUri,places.primaryType,places.primaryTypeDisplayName',
      },
    });

    let places = searchRes.data.places || [];

    if (minRating) {
      places = places.filter(p => p.rating >= parseFloat(minRating));
    }

    const results = places.map(p => ({
      place_id: p.id,
      name: p.displayName?.text || 'Unknown',
      category: p.primaryTypeDisplayName?.text || p.primaryType || 'Business',
      address: p.formattedAddress || '',
      phone: p.internationalPhoneNumber || '',
      rating: p.rating || 0,
      hasWebsite: !!p.websiteUri,
      website: p.websiteUri || '',
    }));

    const noWebsite = results.filter(r => !r.hasWebsite && r.phone);

    res.json({ total: results.length, noWebsiteCount: noWebsite.length, all: results, noWebsite });
  } catch (err) {
    console.error('Google Places API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to search Google Places', details: err.response?.data || err.message });
  }
}
