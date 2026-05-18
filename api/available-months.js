/**
 * Vercel serverless function: GET /api/available-months
 *
 * Returns { months: ['YYYY-MM', ...] } — the full range of months between the
 * earliest and latest activity data in Supabase (inclusive). New months appear
 * automatically as data arrives; no code change needed when a month rolls over.
 */

import 'dotenv/config';
import { getAvailableMonths } from '../lib/buildPayload.js';

export default async function handler(_req, res) {
  try {
    const months = await getAvailableMonths();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ months });
  } catch (err) {
    if (err.message.startsWith('Supabase not configured')) {
      return res.status(503).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
