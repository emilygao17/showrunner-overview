/**
 * Vercel serverless function: GET /api/monthly/:month
 *
 * On Vercel, environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are set
 * in the project dashboard — no .env file needed in production.
 * The dotenv import is a no-op when those vars are already set.
 */

import 'dotenv/config';
import { getPayload } from '../../lib/buildPayload.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function handler(req, res) {
  const { month } = req.query;

  if (!MONTH_RE.test(month)) {
    return res.status(400).json({ error: `Invalid month format: ${month}. Expected YYYY-MM.` });
  }

  try {
    const payload = await getPayload(month);
    // Cache-Control: Vercel's CDN caches for 5 min, serves stale while revalidating
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).json(payload);
  } catch (err) {
    if (err.message.startsWith('Supabase not configured')) {
      return res.status(503).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
