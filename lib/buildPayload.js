/**
 * buildPayload.js
 *
 * Shared payload logic used by both:
 *   - server.js          (local Express dev server)
 *   - api/monthly/[month].js  (Vercel serverless function)
 *
 * All Supabase access goes through lib/supabaseReadOnly.js — no writes ever.
 */

import { query } from './supabaseReadOnly.js';

// ── Constants ────────────────────────────────────────────────────────────────

export const MONTHS = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11',
  '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
];

const MONTH_LABELS = {
  '2025-07': 'July 2025',      '2025-08': 'August 2025',
  '2025-09': 'September 2025', '2025-10': 'October 2025',
  '2025-11': 'November 2025',  '2025-12': 'December 2025',
  '2026-01': 'January 2026',   '2026-02': 'February 2026',
  '2026-03': 'March 2026',     '2026-04': 'April 2026',
};

const LABEL_NORMALIZE = {
  'Painting':   'Paintings',
  'Drawing':    'Drawings',
  'Sculpture':  'Sculptures',
  'Photograph': 'Photographs',
  'Print':      'Prints',
  'Video':      'Videos',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseList(s) {
  if (!s) return [];
  // Supabase returns array columns as real JS arrays; CSVs return them as strings
  if (Array.isArray(s)) return s;
  if (typeof s !== 'string' || s.trim() === '' || s.trim() === '[]') return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeLabel(s) {
  const t = (s || '').trim();
  return LABEL_NORMALIZE[t] ?? t;
}

function firstImage(row) {
  const urls = parseList(row?.image_urls ?? '');
  return urls[0] ?? '';
}

function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number);
  return {
    first: new Date(y, m - 1, 1),
    last:  new Date(y, m, 0),
  };
}

function* pairs(arr) {
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      yield [arr[i], arr[j]];
}

function pairKey(a, b) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

// ── Data loader (SELECT-only via the read-only wrapper) ──────────────────────

const PAGE_SIZE = 1000;

/**
 * Fetch all matching rows from a table using parallel page requests.
 * 1. Gets the total count with a HEAD request.
 * 2. Fires all page fetches simultaneously instead of sequentially.
 * filterFn(queryBuilder) → queryBuilder — optional, adds .gte/.lt filters etc.
 */
async function fetchAll(tableName, selectFields, filterFn = null) {
  // filterFn is applied AFTER .select() so .gte/.lt are available on the FilterBuilder
  function withFilter(q) { return filterFn ? filterFn(q) : q; }

  // Step 1: count (one cheap HEAD request)
  const { count, error: countErr } = await withFilter(
    query(tableName).select('*', { count: 'exact', head: true })
  );
  if (countErr) throw new Error(`Supabase error counting '${tableName}': ${countErr.message}`);
  if (!count) return [];

  // Step 2: all pages in parallel
  const totalPages = Math.ceil(count / PAGE_SIZE);
  const results = await Promise.all(
    Array.from({ length: totalPages }, (_, i) =>
      withFilter(query(tableName).select(selectFields)).range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
    )
  );

  const all = [];
  for (const { data, error } of results) {
    if (error) throw new Error(`Supabase error on '${tableName}': ${error.message}`);
    all.push(...data);
  }
  return all;
}

/** Returns the ISO start of the month after ym (e.g. '2026-03' → '2026-04-01'). */
function nextMonthStart(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export async function loadAllData(ym) {
  const ymStart  = `${ym}-01`;
  const ymEnd    = nextMonthStart(ym);

  const [venuesRaw, showsRaw, seenRaw, wtsRaw, viewsRaw, listsRaw] = await Promise.all([
    fetchAll('venues',     'venue_id, venue_name, neighborhood, city, latitude, longitude, gallery_stage_name'),
    fetchAll('shows',      'show_id, show_title, display_title, venue_id, start_date, end_date, show_medium, show_subject_matter, image_urls, short_description, artist_names'),
    fetchAll('seen_shows', 'id, created_at, user_id, show_id'),
    fetchAll('want_to_see','id, created_at, user_id, show_id'),
    // Only this month's views needed (viewsTally + mediums stats)
    fetchAll('show_views', 'id, show_id, created_at', q => q.gte('created_at', ymStart).lt('created_at', ymEnd)),
    // Only this month's saved lists needed (gallery crawl)
    fetchAll('saved_lists','id, created_at, shows',   q => q.gte('created_at', ymStart).lt('created_at', ymEnd)),
  ]);

  return { venuesRaw, showsRaw, seenRaw, wtsRaw, viewsRaw, listsRaw };
}

// ── Payload cache ─────────────────────────────────────────────────────────────
// Caches the fully-built payload per month for 10 minutes in memory.
// On Vercel, warm lambda instances reuse this cache across requests.
// The API response also sets Cache-Control so Vercel's CDN caches at the edge.

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const _cache = new Map(); // ym → { payload, ts }

export async function getPayload(ym) {
  const hit = _cache.get(ym);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.payload;
  const rawData = await loadAllData(ym);
  const payload = buildPayload(ym, rawData);
  _cache.set(ym, { payload, ts: Date.now() });
  return payload;
}

// ── Payload builder ──────────────────────────────────────────────────────────

export function buildPayload(ym, rawData) {
  const { venuesRaw, showsRaw, seenRaw, wtsRaw, viewsRaw, listsRaw } = rawData;

  // Index tables
  const venues = {};
  for (const v of venuesRaw) {
    if ((v.city ?? '').trim() === 'New York') venues[v.venue_id] = v;
  }
  const shows = {};
  for (const s of showsRaw) {
    if (s.venue_id in venues) shows[s.show_id] = s;
  }

  const seenNyc  = seenRaw.filter(r => r.show_id in shows);
  // viewsRaw is pre-filtered to this month by loadAllData — no further filter needed
  const viewsTally = {};
  for (const r of viewsRaw) {
    if (r.show_id in shows) viewsTally[r.show_id] = (viewsTally[r.show_id] ?? 0) + 1;
  }
  // allViewsTally used for closing_next_month.view_count — same data (this-month views)
  const allViewsTally = viewsTally;

  const saveCounts = {};
  for (const r of wtsRaw) {
    if (r.show_id in shows) saveCounts[r.show_id] = (saveCounts[r.show_id] ?? 0) + 1;
  }

  const { first: firstDay, last: lastDay } = monthBounds(ym);

  const checkins = seenNyc.filter(r => r.created_at.slice(0, 7) === ym);
  const seenTally = {};
  for (const r of checkins) seenTally[r.show_id] = (seenTally[r.show_id] ?? 0) + 1;

  function showCard(showId, seenCount, saveCount) {
    const s = shows[showId];
    const v = venues[s.venue_id];
    return {
      show_id:           showId,
      title:             s.display_title || s.show_title,
      venue_name:        v.venue_name,
      neighborhood:      v.neighborhood,
      gallery_tier:      v.gallery_stage_name,
      seen_count:        seenCount,
      save_count:        saveCount,
      mediums:           parseList(s.show_medium ?? ''),
      artists:           parseList(s.artist_names ?? ''),
      end_date:          s.end_date ?? '',
      featured_image:    firstImage(s),
      short_description: (s.short_description ?? '').trim(),
    };
  }

  // Top 5 seen
  const top5Ids = Object.entries(seenTally)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  const top5Seen = top5Ids.map(sid => showCard(sid, seenTally[sid], saveCounts[sid] ?? 0));

  // Top 5 saved this month
  const wtsTally = {};
  for (const r of wtsRaw) {
    if (r.show_id in shows && r.created_at.slice(0, 7) === ym)
      wtsTally[r.show_id] = (wtsTally[r.show_id] ?? 0) + 1;
  }
  const top5Saved = Object.entries(wtsTally)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([sid]) => showCard(sid, seenTally[sid] ?? 0, wtsTally[sid]));

  // Top 5 by views this month
  const top5Views = Object.entries(viewsTally)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([sid]) => ({ ...showCard(sid, seenTally[sid] ?? 0, saveCounts[sid] ?? 0), view_count: viewsTally[sid] }));

  // Show of the month
  function score(sid) { const sc = saveCounts[sid] ?? 0; return seenTally[sid] * (sc > 0 ? sc : 1); }
  let eligible = Object.keys(seenTally).filter(sid => (saveCounts[sid] ?? 0) >= 1);
  if (!eligible.length) eligible = Object.keys(seenTally);
  const sotmId = eligible.reduce((best, sid) => score(sid) > score(best) ? sid : best, eligible[0]);
  const showOfTheMonth = { ...showCard(sotmId, seenTally[sotmId], saveCounts[sotmId] ?? 0), view_count: viewsTally[sotmId] ?? 0 };

  // Map check-ins
  const mapCheckins = checkins.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).flatMap(r => {
    const s = shows[r.show_id], v = venues[s.venue_id];
    const lat = parseFloat(v.latitude), lon = parseFloat(v.longitude);
    if (isNaN(lat) || isNaN(lon)) return [];
    return [{ timestamp: r.created_at, lat, lon, neighborhood: v.neighborhood, show_title: s.display_title || s.show_title, venue_name: v.venue_name }];
  });

  // Neighborhoods
  const hoodTally = {};
  for (const mc of mapCheckins) hoodTally[mc.neighborhood] = (hoodTally[mc.neighborhood] ?? 0) + 1;
  const neighborhoods = Object.entries(hoodTally).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([neighborhood, checkin_count]) => ({ neighborhood, checkin_count }));

  // Returning favorites
  const byMonth = {};
  for (const r of seenNyc) (byMonth[r.created_at.slice(0, 7)] ??= []).push(r);
  const prevMonthTop5 = {};
  for (const mo of MONTHS) {
    if (mo >= ym) continue;
    const tally = {};
    for (const r of (byMonth[mo] ?? [])) tally[r.show_id] = (tally[r.show_id] ?? 0) + 1;
    prevMonthTop5[mo] = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  }
  const prevTop5Ids = new Set(Object.values(prevMonthTop5).flat());
  const showPrevMonths = {};
  for (const [mo, ids] of Object.entries(prevMonthTop5)) for (const sid of ids) (showPrevMonths[sid] ??= []).push(mo);
  const returningFavorites = top5Ids.filter(sid => prevTop5Ids.has(sid)).map(sid => ({
    show_id: sid, title: shows[sid].display_title || shows[sid].show_title,
    venue_name: venues[shows[sid].venue_id].venue_name, neighborhood: venues[shows[sid].venue_id].neighborhood,
    seen_this_month: seenTally[sid], also_top5_in: showPrevMonths[sid] ?? [],
  }));

  // Closing this month
  const closingThisMonth = Object.entries(seenTally).flatMap(([sid, cnt]) => {
    const s = shows[sid], endStr = (s.end_date ?? '').trim();
    if (!endStr) return [];
    const endD = new Date(endStr + 'T00:00:00');
    if (endD < firstDay || endD > lastDay) return [];
    const title = s.display_title || s.show_title;
    if (title.toLowerCase().includes('title tbd')) return [];
    return [{ show_id: sid, title, venue_name: venues[s.venue_id].venue_name, neighborhood: venues[s.venue_id].neighborhood, end_date: endStr, seen_count: cnt }];
  }).sort((a, b) => b.seen_count - a.seen_count).slice(0, 10).sort((a, b) => a.end_date.localeCompare(b.end_date));

  // Closing next month
  const nextFirst = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 1);
  const nextLast  = new Date(nextFirst.getFullYear(), nextFirst.getMonth() + 1, 0);
  const closingNextMonth = Object.entries(shows).flatMap(([sid, s]) => {
    const endStr = (s.end_date ?? '').trim();
    if (!endStr) return [];
    const endD = new Date(endStr + 'T00:00:00');
    if (endD < nextFirst || endD > nextLast) return [];
    const title = s.display_title || s.show_title;
    if (title.toLowerCase().includes('title tbd')) return [];
    return [{ show_id: sid, title, venue_name: venues[s.venue_id].venue_name, neighborhood: venues[s.venue_id].neighborhood, end_date: endStr, view_count: allViewsTally[sid] ?? 0 }];
  }).sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 10);

  // Medium / Subject Matter table stats
  function buildTableStats(field) {
    const mViews = {}, mShows = {};
    for (const [sid, vc] of Object.entries(viewsTally)) {
      if (!vc) continue;
      const s = shows[sid]; if (!s) continue;
      for (const rawLabel of parseList(s[field] ?? '')) {
        const label = normalizeLabel(rawLabel);
        mViews[label] = (mViews[label] ?? 0) + vc;
        (mShows[label] ??= new Set()).add(sid);
      }
    }
    let rows = Object.entries(mViews).map(([label, totalViews]) => {
      const sc = mShows[label].size;
      return { label, views: totalViews, shows: sc, views_per_show: +(totalViews / sc).toFixed(1), highest_intensity: false };
    });
    rows.sort((a, b) => b.views - a.views);
    rows = rows.slice(0, 10);
    if (rows.length) rows.reduce((best, r) => r.views_per_show > best.views_per_show ? r : best, rows[0]).highest_intensity = true;
    return rows;
  }
  const mediumsStats        = buildTableStats('show_medium');
  const subjectMattersStats = buildTableStats('show_subject_matter');

  // Shows on view this month — for pie charts (count by medium / subject matter)
  function buildOnViewCounts(field) {
    const tally = {};
    for (const s of Object.values(shows)) {
      const startStr = (s.start_date ?? '').trim();
      const endStr   = (s.end_date   ?? '').trim();
      if (!startStr || !endStr) continue;
      const start = new Date(startStr + 'T00:00:00');
      const end   = new Date(endStr   + 'T00:00:00');
      if (start > lastDay || end < firstDay) continue;
      for (const rawLabel of parseList(s[field] ?? '')) {
        if (!rawLabel) continue;
        const label = normalizeLabel(rawLabel);
        tally[label] = (tally[label] ?? 0) + 1;
      }
    }
    return Object.entries(tally)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }
  const onViewMedium  = buildOnViewCounts('show_medium');
  const onViewSubject = buildOnViewCounts('show_subject_matter');

  // Gallery Crawl
  const monthLists = listsRaw.filter(l => l.created_at.slice(0, 7) === ym);
  const monthCoOcc = {};
  let listsWithOverlap = 0;
  for (const lst of monthLists) {
    const rawIds = parseList(lst.shows ?? '');
    const validIds = [], seen = new Set();
    for (const rawId of rawIds) {
      const sid = String(typeof rawId === 'number' ? Math.round(rawId) : rawId);
      if (!shows[sid] || seen.has(sid)) continue;
      const title = shows[sid].display_title || shows[sid].show_title;
      if (title.toLowerCase().includes('title tbd')) continue;
      validIds.push(sid); seen.add(sid);
    }
    if (validIds.length >= 2) {
      listsWithOverlap++;
      for (const [a, b] of pairs(validIds)) { const k = pairKey(a, b); monthCoOcc[k] = (monthCoOcc[k] ?? 0) + 1; }
    }
  }
  let galleryCrawl = null;
  if (listsWithOverlap >= 5 && Object.keys(monthCoOcc).length > 0) {
    const monthCoocShows = new Set(Object.keys(monthCoOcc).flatMap(k => k.split('__')));
    function buildMonthCrawl(seedA, seedB, excluded, maxSize = 5, minAvg = 2.0) {
      const crawl = [seedA, seedB], crawlSet = new Set([seedA, seedB]);
      for (let i = 0; i < maxSize - 2; i++) {
        let bestShow = null, bestAvg = 0;
        for (const candidate of monthCoocShows) {
          if (crawlSet.has(candidate) || excluded.has(candidate)) continue;
          const scores = crawl.map(s => monthCoOcc[pairKey(candidate, s)] ?? 0);
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg > bestAvg) { bestAvg = avg; bestShow = candidate; }
        }
        if (!bestShow || bestAvg < minAvg) break;
        crawl.push(bestShow); crawlSet.add(bestShow);
      }
      return crawl;
    }
    const sortedPairs = Object.entries(monthCoOcc).sort((a, b) => b[1] - a[1]).map(([k]) => k.split('__'));
    galleryCrawl = [];
    const used = new Set();
    for (const [seedA, seedB] of sortedPairs) {
      if (galleryCrawl.length >= 2) break;
      if (used.has(seedA) || used.has(seedB)) continue;
      const crawlIds = buildMonthCrawl(seedA, seedB, used);
      galleryCrawl.push({
        list_count: monthCoOcc[pairKey(seedA, seedB)],
        shows: crawlIds.map(sid => ({ show_id: sid, title: shows[sid].display_title || shows[sid].show_title, venue_name: venues[shows[sid].venue_id].venue_name, neighborhood: venues[shows[sid].venue_id].neighborhood, featured_image: firstImage(shows[sid]) })),
      });
      for (const sid of crawlIds) used.add(sid);
    }
    if (!galleryCrawl.length) galleryCrawl = null;
  }

  return {
    month:                 ym,
    label:                 MONTH_LABELS[ym] ?? ym,
    total_checkins:        checkins.length,
    total_shows_seen:      Object.keys(seenTally).length,
    show_of_the_month:     showOfTheMonth,
    top_5_seen:            top5Seen,
    top_5_saved:           top5Saved,
    top_5_views:           top5Views,
    map_checkins:          mapCheckins,
    neighborhoods,
    returning_favorites:   returningFavorites,
    closing_this_month:    closingThisMonth,
    closing_next_month:    closingNextMonth,
    mediums_stats:         mediumsStats,
    subject_matters_stats: subjectMattersStats,
    on_view_stats:         { medium: onViewMedium, subject: onViewSubject },
    gallery_crawl:         galleryCrawl,
  };
}
