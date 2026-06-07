import axios from 'axios';
import { supabase } from '../config/supabase.js';

const WHATSAPP_API = 'https://graph.facebook.com/v18.0';

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp API not configured. Add token and phone number ID in Settings.');
  }
  return { token, phoneNumberId };
}

export async function sendMessage(req, res) {
  try {
    const { to, template, variables } = req.body;
    const { token, phoneNumberId } = getConfig();

    let body = template;
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    const response = await axios.post(
      `${WHATSAPP_API}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\s+/g, ''),
        type: 'text',
        text: { preview_url: false, body },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await supabase.from('messages').insert({
      lead_phone: to,
      body,
      status: 'sent',
      wa_message_id: response.data.messages?.[0]?.id,
    });

    res.json({ success: true, waResponse: response.data });
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send WhatsApp message', details: err.response?.data || err.message });
  }
}

export async function sendBulk(req, res) {
  try {
    const { leads, template, variables } = req.body;
    const results = [];
    for (const lead of leads) {
      try {
        const varMap = { ...variables };
        if (lead.name) varMap.name = lead.name.split(' ')[0];
        if (lead.name) varMap.business = lead.name;
        if (lead.category) varMap.category = lead.category;
        if (lead.address) varMap.location = lead.address;

        let body = template;
        for (const [key, value] of Object.entries(varMap)) {
          body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }

        const { token, phoneNumberId } = getConfig();
        const response = await axios.post(
          `${WHATSAPP_API}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: lead.phone.replace(/\s+/g, ''),
            type: 'text',
            text: { preview_url: false, body },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        results.push({ phone: lead.phone, status: 'sent', waMessageId: response.data.messages?.[0]?.id });
      } catch (err) {
        results.push({ phone: lead.phone, status: 'failed', error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function handleWebhook(req, res) {
  // Meta WhatsApp verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // Incoming message
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;
    if (!messages) return res.sendStatus(200);

    for (const msg of messages) {
      const from = msg.from;
      const text = msg.text?.body || '';
      const waMessageId = msg.id;

      await supabase.from('messages').insert({
        lead_phone: from,
        body: text,
        status: 'received',
        wa_message_id: waMessageId,
        direction: 'incoming',
      });

      await supabase.from('replies').insert({
        lead_phone: from,
        message: text,
        wa_message_id: waMessageId,
        read: false,
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200);
  }
}

export async function getMessages(req, res) {
  const { lead_phone } = req.query;
  let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
  if (lead_phone) query = query.eq('lead_phone', lead_phone);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}
