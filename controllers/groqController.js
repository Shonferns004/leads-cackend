import axios from 'axios';

export async function generateTemplate(req, res) {
  const { niche } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'GROQ_API_KEY not configured' });
  }

  if (!niche || !niche.trim()) {
    return res.status(400).json({ error: 'Niche is required' });
  }

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a WhatsApp outreach copywriter for a web development agency. Generate a short, personalized cold message template. Use placeholders {{name}} for first name, {{business}} for business name, {{category}} for category, {{location}} for location. Keep it under 200 words. Be friendly and professional. Return ONLY the message text, no explanation.',
        },
        {
          role: 'user',
          content: `Write a WhatsApp cold outreach template for ${niche} businesses that don't have a website.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const template = response.data.choices?.[0]?.message?.content?.trim();
    if (!template) {
      return res.status(500).json({ error: 'No template generated' });
    }

    res.json({ template });
  } catch (err) {
    console.error('Groq API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate template', details: err.response?.data || err.message });
  }
}
