import axios from 'axios';

export async function searchGooglePlaces(req, res) {
  const { query, location, minRating } = req.body;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'Google Places API key not configured. Add it in Settings.' });
  }

  try {
    const textQuery = location ? `${query} in ${location}` : query;
    const searchRes = await axios.post('https://places.googleapis.com/v1/places:searchText', {
      textQuery,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.rating,places.websiteUri,places.primaryType,places.primaryTypeDisplayName,places.photos',
      },
    });

    let places = searchRes.data.places || [];

    if (minRating) {
      places = places.filter(p => p.rating >= parseFloat(minRating));
    }

    function getPhotoUrl(photos) {
      if (!photos || photos.length === 0) return '';
      const name = photos[0].name;
      return `https://places.googleapis.com/v1/${name}/media?maxHeightPx=200&maxWidthPx=200&key=${apiKey}`;
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
      photoUrl: getPhotoUrl(p.photos),
    }));

    const noWebsite = results.filter(r => !r.hasWebsite && r.phone);

    res.json({ total: results.length, noWebsiteCount: noWebsite.length, all: results, noWebsite });
  } catch (err) {
    console.error('Google Places API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to search Google Places', details: err.response?.data || err.message });
  }
}
