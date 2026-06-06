import { supabase } from '../config/supabase.js';

export async function getTemplates(req, res) {
  const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function createTemplate(req, res) {
  const { name, body } = req.body;
  const { data, error } = await supabase.from('templates').insert({ name, body }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

export async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, body } = req.body;
  const { data, error } = await supabase.from('templates').update({ name, body }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function deleteTemplate(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
