#!/usr/bin/env python3
"""
build_month_payload.py

Generates one JSON payload per month (2025-07 through 2026-03) from the
raw CSV data files. Outputs to payloads/<YYYY-MM>.json.

Usage:
    python3 build_month_payload.py
"""

import csv
import json
import ast
import os
from collections import defaultdict
from itertools import combinations
from datetime import datetime, date
import calendar

DATA_DIR    = "data files"
OUTPUT_DIR  = "payloads"
MONTHS      = [
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11",
    "2025-12", "2026-01", "2026-02", "2026-03",
]

MONTH_LABELS = {
    "2025-07": "July 2025",      "2025-08": "August 2025",
    "2025-09": "September 2025", "2025-10": "October 2025",
    "2025-11": "November 2025",  "2025-12": "December 2025",
    "2026-01": "January 2026",   "2026-02": "February 2026",
    "2026-03": "March 2026",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── Helpers ────────────────────────────────────────────────────────────────

def parse_list(s):
    """Parse a Python/JSON list string like '["Paintings","Drawings"]' → list."""
    s = s.strip()
    if not s or s == "[]":
        return []
    try:
        return ast.literal_eval(s)
    except Exception:
        return []

def first_image(row):
    """Return the first URL from image_urls, or '' if none."""
    urls = parse_list(row.get("image_urls", ""))
    return urls[0] if urls else ""

def trunc(s):
    return s.strip()

# Normalize inconsistent singular/plural data entry in show_medium / show_subject_matter
LABEL_NORMALIZE = {
    'Painting':   'Paintings',
    'Drawing':    'Drawings',
    'Sculpture':  'Sculptures',
    'Photograph': 'Photographs',
    'Print':      'Prints',
    'Video':      'Videos',
}

def normalize_label(s):
    s = s.strip()
    return LABEL_NORMALIZE.get(s, s)

def month_bounds(ym):
    """Return (first_day, last_day) as date objects for a 'YYYY-MM' string."""
    y, m = int(ym[:4]), int(ym[5:7])
    first = date(y, m, 1)
    last  = date(y, m, calendar.monthrange(y, m)[1])
    return first, last


# ── Load tables ────────────────────────────────────────────────────────────

print("Loading CSVs…")

with open(f"{DATA_DIR}/venues_rows (1).csv") as f:
    venues_raw = list(csv.DictReader(f))

# venue lookup: venue_id → row (only NYC)
venues = {}
for v in venues_raw:
    if v.get("city", "").strip() == "New York":
        venues[v["venue_id"]] = v

print(f"  NYC venues: {len(venues)}")

with open(f"{DATA_DIR}/shows_rows (4).csv") as f:
    shows_raw = list(csv.DictReader(f))

# shows lookup: show_id → row (only shows whose venue is NYC)
shows = {}
for s in shows_raw:
    if s["venue_id"] in venues:
        shows[s["show_id"]] = s

print(f"  NYC shows:  {len(shows)}")

with open(f"{DATA_DIR}/seen_shows_rows.csv") as f:
    seen_raw = list(csv.DictReader(f))

# Filter to NYC shows only
seen_nyc = [r for r in seen_raw if r["show_id"] in shows]
print(f"  NYC check-ins: {len(seen_nyc)} / {len(seen_raw)}")

with open(f"{DATA_DIR}/want_to_see_rows.csv") as f:
    wts_raw = list(csv.DictReader(f))

# save_count per show (all-time, NYC shows only)
save_counts = defaultdict(int)
for r in wts_raw:
    if r["show_id"] in shows:
        save_counts[r["show_id"]] += 1

print(f"  Want-to-see entries (NYC): {sum(save_counts.values())}")

with open(f"{DATA_DIR}/saved_lists_rows.csv") as f:
    saved_lists_raw = list(csv.DictReader(f))

print(f"  Saved lists: {len(saved_lists_raw)}")

with open(f"{DATA_DIR}/show_views_rows.csv") as f:
    views_raw = list(csv.DictReader(f))

# Filter to NYC shows only
views_nyc = [r for r in views_raw if r["show_id"] in shows]
print(f"  Show views (NYC): {len(views_nyc)} / {len(views_raw)}")

# All-time view counts per show
all_views_tally = defaultdict(int)
for r in views_nyc:
    all_views_tally[r["show_id"]] += 1



# ── Build show card dict ───────────────────────────────────────────────────

def show_card(show_id, seen_count, save_count):
    s = shows[show_id]
    v = venues[s["venue_id"]]
    return {
        "show_id":         show_id,
        "title":           s.get("display_title") or s["show_title"],
        "venue_name":      v["venue_name"],
        "neighborhood":    v["neighborhood"],
        "gallery_tier":    v["gallery_stage_name"],
        "seen_count":      seen_count,
        "save_count":      save_count,
        "mediums":         parse_list(s.get("show_medium", "")),
        "artists":         parse_list(s.get("artist_names", "")),
        "end_date":        s.get("end_date", ""),
        "featured_image":  first_image(s),
        "short_description": trunc(s.get("short_description", "")),
    }


# ── Per-month top-5 (needed for returning_favorites) ──────────────────────

print("Computing per-month top-5 for returning_favorites…")

# Group check-ins by month
by_month = defaultdict(list)
for r in seen_nyc:
    ym = r["created_at"][:7]
    by_month[ym].append(r)

month_top5_ids = {}   # ym → [show_id, …] (up to 5)

for ym in MONTHS:
    checkins = by_month.get(ym, [])
    tally = defaultdict(int)
    for r in checkins:
        tally[r["show_id"]] += 1
    top5 = sorted(tally, key=lambda sid: tally[sid], reverse=True)[:5]
    month_top5_ids[ym] = top5


# ── Build each monthly payload ─────────────────────────────────────────────

for ym in MONTHS:
    print(f"\nBuilding {ym}…")
    checkins = by_month.get(ym, [])
    first_day, last_day = month_bounds(ym)

    # ── Aggregate seen counts this month ──
    seen_tally = defaultdict(int)
    for r in checkins:
        seen_tally[r["show_id"]] += 1

    nyc_checkins = [r for r in checkins]   # already filtered to NYC above

    total_checkins  = len(nyc_checkins)
    total_shows_seen = len(seen_tally)

    # ── Top 5 seen ──
    top5_ids = month_top5_ids[ym]
    top_5_seen = [
        show_card(sid, seen_tally[sid], save_counts[sid])
        for sid in top5_ids
    ]

    # ── Top 5 saved this month (filtered by created_at month) ──
    wts_tally = defaultdict(int)
    for r in wts_raw:
        if r["show_id"] in shows and r["created_at"][:7] == ym:
            wts_tally[r["show_id"]] += 1
    top5_saved_ids = sorted(wts_tally, key=lambda sid: wts_tally[sid], reverse=True)[:5]
    top_5_saved = [
        show_card(sid, seen_tally.get(sid, 0), wts_tally[sid])
        for sid in top5_saved_ids
    ]

    # ── Top 5 by show views this month ──
    views_tally = defaultdict(int)
    for r in views_nyc:
        if r["created_at"][:7] == ym:
            views_tally[r["show_id"]] += 1
    top5_views_ids = sorted(views_tally, key=lambda sid: views_tally[sid], reverse=True)[:5]
    top_5_views = [
        {**show_card(sid, seen_tally.get(sid, 0), save_counts[sid]), "view_count": views_tally[sid]}
        for sid in top5_views_ids
    ]

    # ── Show of the month ──
    # Score = seen × save (fall back to seen if no saves)
    def score(sid):
        sc = save_counts[sid]
        return seen_tally[sid] * (sc if sc > 0 else 1)

    eligible = [sid for sid in seen_tally if save_counts[sid] >= 1]
    if not eligible:
        eligible = list(seen_tally.keys())   # fallback: all seen shows

    sotm_id  = max(eligible, key=score)
    show_of_the_month = {
        **show_card(sotm_id, seen_tally[sotm_id], save_counts[sotm_id]),
        "view_count": views_tally.get(sotm_id, 0),
    }

    # ── Map check-ins ──
    map_checkins = []
    for r in sorted(nyc_checkins, key=lambda x: x["created_at"]):
        s  = shows[r["show_id"]]
        v  = venues[s["venue_id"]]
        try:
            lat = float(v["latitude"])
            lon = float(v["longitude"])
        except (ValueError, TypeError):
            continue
        map_checkins.append({
            "timestamp":   r["created_at"],
            "lat":         lat,
            "lon":         lon,
            "neighborhood": v["neighborhood"],
            "show_title":  s.get("display_title") or s["show_title"],
            "venue_name":  v["venue_name"],
        })

    # ── Neighborhoods ──
    hood_tally = defaultdict(int)
    for mc in map_checkins:
        hood_tally[mc["neighborhood"]] += 1

    neighborhoods = [
        {"neighborhood": hood, "checkin_count": cnt}
        for hood, cnt in sorted(hood_tally.items(), key=lambda x: -x[1])[:6]
    ]

    # ── Returning favorites ──
    prev_months = [m for m in MONTHS if m < ym]
    prev_top5_ids = set()
    show_prev_months = defaultdict(list)   # show_id → [ym, …]
    for pm in prev_months:
        for sid in month_top5_ids.get(pm, []):
            prev_top5_ids.add(sid)
            show_prev_months[sid].append(pm)

    returning_favorites = []
    for sid in top5_ids:
        if sid in prev_top5_ids:
            returning_favorites.append({
                "show_id":       sid,
                "title":         shows[sid].get("display_title") or shows[sid]["show_title"],
                "venue_name":    venues[shows[sid]["venue_id"]]["venue_name"],
                "neighborhood":  venues[shows[sid]["venue_id"]]["neighborhood"],
                "seen_this_month": seen_tally[sid],
                "also_top5_in":  show_prev_months[sid],
            })

    # ── Closing this month ──
    closing_this_month = []
    for sid, cnt in seen_tally.items():
        s = shows[sid]
        end_str = s.get("end_date", "").strip()
        if not end_str:
            continue
        try:
            end_d = date.fromisoformat(end_str)
        except ValueError:
            continue
        if not (first_day <= end_d <= last_day):
            continue
        title = s.get("display_title") or s["show_title"]
        if "title tbd" in title.lower():
            continue
        closing_this_month.append({
            "show_id":    sid,
            "title":      title,
            "venue_name": venues[s["venue_id"]]["venue_name"],
            "neighborhood": venues[s["venue_id"]]["neighborhood"],
            "end_date":   end_str,
            "seen_count": cnt,
        })

    closing_this_month.sort(key=lambda x: -x["seen_count"])
    closing_this_month = closing_this_month[:10]
    closing_this_month.sort(key=lambda x: x["end_date"])

    # ── Closing next month ──
    next_y = first_day.year + (1 if first_day.month == 12 else 0)
    next_m = 1 if first_day.month == 12 else first_day.month + 1
    next_first = date(next_y, next_m, 1)
    next_last  = date(next_y, next_m, calendar.monthrange(next_y, next_m)[1])

    closing_next_month = []
    for sid, s in shows.items():
        end_str = s.get("end_date", "").strip()
        if not end_str:
            continue
        try:
            end_d = date.fromisoformat(end_str)
        except ValueError:
            continue
        if not (next_first <= end_d <= next_last):
            continue
        title = s.get("display_title") or s["show_title"]
        if "title tbd" in title.lower():
            continue
        closing_next_month.append({
            "show_id":      sid,
            "title":        title,
            "venue_name":   venues[s["venue_id"]]["venue_name"],
            "neighborhood": venues[s["venue_id"]]["neighborhood"],
            "end_date":     end_str,
            "view_count":   all_views_tally.get(sid, 0),
        })

    closing_next_month.sort(key=lambda x: x["end_date"])
    closing_next_month = closing_next_month[:10]

    # ── Medium / Subject Matter table stats ──
    def build_table_stats(field):
        m_views = defaultdict(int)
        m_shows = defaultdict(set)
        for sid, vc in views_tally.items():
            if vc == 0:
                continue
            s = shows.get(sid)
            if not s:
                continue
            for label in parse_list(s.get(field, "")):
                label = normalize_label(label)
                m_views[label] += vc
                m_shows[label].add(sid)
        rows = []
        for label, total_views in m_views.items():
            sc = len(m_shows[label])
            rows.append({
                "label": label,
                "views": total_views,
                "shows": sc,
                "views_per_show": round(total_views / sc, 1),
                "highest_intensity": False,
            })
        rows.sort(key=lambda x: -x["views"])
        rows = rows[:10]
        if rows:
            max_row = max(rows, key=lambda x: x["views_per_show"])
            max_row["highest_intensity"] = True
        return rows

    mediums_stats = build_table_stats("show_medium")
    subject_matters_stats = build_table_stats("show_subject_matter")

    # ── Gallery Crawl (per-month co-occurrence) ──
    month_lists = [l for l in saved_lists_raw if l["created_at"][:7] == ym]

    month_co_occ = defaultdict(int)
    lists_with_overlap = 0
    for lst in month_lists:
        raw_ids = parse_list(lst["shows"])
        valid_ids = []
        for sid in raw_ids:
            sid_str = str(int(sid)) if isinstance(sid, (int, float)) else str(sid)
            if sid_str not in shows:
                continue
            title = shows[sid_str].get("display_title") or shows[sid_str]["show_title"]
            if "title tbd" in title.lower():
                continue
            valid_ids.append(sid_str)
        valid_ids = list(dict.fromkeys(valid_ids))
        if len(valid_ids) >= 2:
            lists_with_overlap += 1
            for a, b in combinations(valid_ids, 2):
                month_co_occ[tuple(sorted([a, b]))] += 1

    gallery_crawl = None
    if lists_with_overlap >= 5 and month_co_occ:
        month_cooc_shows = {sid for pair in month_co_occ for sid in pair}

        def build_month_crawl(seed_a, seed_b, excluded, max_size=5, min_avg=2.0):
            crawl = [seed_a, seed_b]
            crawl_set = {seed_a, seed_b}
            for _ in range(max_size - 2):
                best_show, best_avg = None, 0.0
                for candidate in month_cooc_shows:
                    if candidate in crawl_set or candidate in excluded:
                        continue
                    scores = [month_co_occ.get(tuple(sorted([candidate, s])), 0) for s in crawl]
                    avg = sum(scores) / len(scores)
                    if avg > best_avg:
                        best_avg = avg
                        best_show = candidate
                if best_show is None or best_avg < min_avg:
                    break
                crawl.append(best_show)
                crawl_set.add(best_show)
            return crawl

        sorted_month_pairs = sorted(month_co_occ, key=lambda p: month_co_occ[p], reverse=True)
        gallery_crawl = []
        used = set()
        for seed_a, seed_b in sorted_month_pairs:
            if len(gallery_crawl) >= 2:
                break
            if seed_a in used or seed_b in used:
                continue
            crawl_ids = build_month_crawl(seed_a, seed_b, excluded=used)
            gallery_crawl.append({
                "list_count": month_co_occ[tuple(sorted([seed_a, seed_b]))],
                "shows": [
                    {
                        "show_id":        sid,
                        "title":          shows[sid].get("display_title") or shows[sid]["show_title"],
                        "venue_name":     venues[shows[sid]["venue_id"]]["venue_name"],
                        "neighborhood":   venues[shows[sid]["venue_id"]]["neighborhood"],
                        "featured_image": first_image(shows[sid]),
                    }
                    for sid in crawl_ids
                ],
            })
            used.update(crawl_ids)
        if not gallery_crawl:
            gallery_crawl = None

    # ── Assemble payload ──
    payload = {
        "month":              ym,
        "label":              MONTH_LABELS[ym],
        "total_checkins":     total_checkins,
        "total_shows_seen":   total_shows_seen,
        "show_of_the_month":  show_of_the_month,
        "top_5_seen":         top_5_seen,
        "top_5_saved":        top_5_saved,
        "top_5_views":        top_5_views,
        "map_checkins":       map_checkins,
        "neighborhoods":      neighborhoods,
        "returning_favorites": returning_favorites,
        "closing_this_month": closing_this_month,
        "closing_next_month":    closing_next_month,
        "mediums_stats":         mediums_stats,
        "subject_matters_stats": subject_matters_stats,
        "gallery_crawl":         gallery_crawl,
    }

    out_path = f"{OUTPUT_DIR}/{ym}.json"
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"  ✓ {out_path}  "
          f"({total_checkins} check-ins, {len(top_5_seen)} top shows, "
          f"{len(map_checkins)} map pts, {len(closing_this_month)} closing)")

print("\nDone. All payloads written to payloads/")
