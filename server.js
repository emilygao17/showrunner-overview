/**
 * server.js — local development server only.
 *
 * In production, Vercel serves api/monthly/[month].js as a serverless function.
 * Run locally with:  npm start   or   npm run dev
 */

import 'dotenv/config';
import express from 'express';
import { MONTHS, getPayload } from './lib/buildPayload.js';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('.'));

app.get('/api/monthly/:month', async (req, res) => {
  const { month } = req.params;
  if (!MONTHS.includes(month)) {
    return res.status(404).json({ error: `Unknown month: ${month}. Valid: ${MONTHS.join(', ')}` });
  }
  try {
    const payload = await getPayload(month);
    // Cache-Control: CDN caches for 5 min, serves stale while revalidating
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.json(payload);
  } catch (err) {
    if (err.message.startsWith('Supabase not configured')) {
      return res.status(503).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Showrunner dev server → http://localhost:${PORT}`);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠  Supabase not configured — copy .env.example to .env');
  }
});
