import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import { supabase } from './config/supabase.js';

import leadRoutes from './routes/leadRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import groqRoutes from './routes/groqRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const SECRET = process.env.SESSION_SECRET || 'leadhunter-default-secret';

function createToken(username) {
  const payload = `${username}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

function verifyToken(token) {
  try {
    const parts = token.split(':');
    if (parts.length < 3) return null;
    const hmac = parts.pop();
    const payload = parts.join(':');
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (hmac === expected) return { username: parts[0] };
  } catch {}
  return null;
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.APP_USERNAME && password === process.env.APP_PASSWORD) {
    const token = createToken(username);
    return res.json({ success: true, token });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/logout', (_req, res) => {
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') && auth.slice(7);
  const session = token && verifyToken(token);
  if (session) return res.json({ authenticated: true, username: session.username });
  res.json({ authenticated: false });
});

function isAuthenticated(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') && auth.slice(7);
  const session = token && verifyToken(token);
  if (session) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIVITIES_FILE = path.join(__dirname, 'activities.json');

function readActivities() {
  try {
    if (!fs.existsSync(ACTIVITIES_FILE)) return [];
    return JSON.parse(fs.readFileSync(ACTIVITIES_FILE, 'utf-8'));
  } catch { return []; }
}

function writeActivities(activities) {
  fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2));
}

app.use('/api/leads', isAuthenticated, leadRoutes);
app.use('/api/templates', isAuthenticated, templateRoutes);
app.use('/api/search', isAuthenticated, searchRoutes);
app.use('/api/groq', isAuthenticated, groqRoutes);
app.use('/api/whatsapp', isAuthenticated, whatsappRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/activities', isAuthenticated, (req, res) => {
  try {
    const { type, lead_name, lead_phone, category, detail } = req.body;
    const entry = {
      id: Date.now() + Math.random().toString(36).slice(2, 6),
      type: type || 'unknown',
      lead_name: lead_name || '',
      lead_phone: lead_phone || '',
      category: category || '',
      detail: detail || '',
      created_at: new Date().toISOString(),
    };
    const activities = readActivities();
    activities.unshift(entry);
    writeActivities(activities);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities', isAuthenticated, (req, res) => {
  try {
    let activities = readActivities();
    const { type, search, limit: l } = req.query;
    if (type) activities = activities.filter(a => a.type === type);
    if (search) {
      const q = search.toLowerCase();
      activities = activities.filter(a =>
        a.lead_name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q)
      );
    }
    if (l) activities = activities.slice(0, parseInt(l));
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cron/keep-alive', async (req, res) => {
  try {
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    res.json({ status: 'ok', leadCount: count ?? 0, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LeadHunter backend running on http://localhost:${PORT}`);
});
