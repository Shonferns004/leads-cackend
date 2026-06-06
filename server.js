import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import leadRoutes from './routes/leadRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/leads', leadRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LeadHunter backend running on http://localhost:${PORT}`);
});
