import { supabase } from '../config/supabase.js';

export async function getLeads(req, res) {
  const { status, search } = req.query;
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,address.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function getLead(req, res) {
  const { id } = req.params;
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function createLead(req, res) {
  const { name, category, address, phone, rating, website } = req.body;
  const { data, error } = await supabase.from('leads').insert({
    name, category, address, phone, rating, website,
    status: 'New',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

export async function bulkCreateLeads(req, res) {
  const { leads } = req.body;
  const enriched = leads.map(l => ({ ...l, status: 'New' }));
  const { data, error } = await supabase.from('leads').insert(enriched).select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

export async function updateLead(req, res) {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function deleteLead(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}

export async function getStats(req, res) {
  const { data: allLeads, error } = await supabase.from('leads').select('status');
  if (error) return res.status(500).json({ error: error.message });
  const total = allLeads.length;
  const contacted = allLeads.filter(l => l.status === 'Contacted').length;
  res.json({ total, contacted });
}
