import { supabase } from '../config/supabase.js';

export async function getMeetings(req, res) {
  const { data, error } = await supabase.from('meetings').select('*').order('date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function createMeeting(req, res) {
  const { business_name, contact_phone, date, time, type, budget, notes, lead_id } = req.body;
  const { data, error } = await supabase.from('meetings').insert({
    business_name, contact_phone, date, time, type, budget, notes, lead_id, status: 'Scheduled',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

export async function updateMeeting(req, res) {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('meetings').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function deleteMeeting(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
