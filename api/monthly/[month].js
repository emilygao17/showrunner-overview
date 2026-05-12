/**
 * Vercel serverless function: GET /api/monthly/:month
 *
 * On Vercel, environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are set
 * in the project dashboard — no .env file needed in production.
 * The dotenv import is a no-op when those vars are already set.
 */

import 'dotenv/config';
import { MONTHS, getPayload } from '../../lib/buildPayload.js';

export default async function handler(req, res) {
  const { month } = req.query;

  if (!MONTHS.includes(month)) {
    return res.status(404).json({ error: `Unknown month: ${month}. Valid: ${MONTHS.join(', ')}` });
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
