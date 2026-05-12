/**
 * supabaseReadOnly.js
 *
 * READ-ONLY Supabase wrapper for the Showrunner app.
 *
 * This file MUST NEVER be modified to allow write operations.
 * The app is strictly read-only: it queries Supabase to build monthly
 * report payloads and serves them via the Express API. No data is ever
 * written, updated, or deleted through this client.
 *
 * Exports:
 *   query(tableName) — returns a Supabase QueryBuilder scoped to .select()
 *
 * Write methods (.insert, .update, .delete, .upsert, .rpc) are blocked at
 * THREE layers so no code path can reach a write, regardless of how the
 * client or builder objects are used:
 *
 *   Layer 1 — client.rpc() replaced with a hard throw.
 *   Layer 2 — client.from() wrapped so every builder it returns has write
 *              methods replaced with hard throws before the caller sees it.
 *   Layer 3 — query() (the only exported function) adds the same blocks
 *              once more as a final safety net.
 *
 * The underlying SupabaseClient object is never exported.
 */

import { createClient } from '@supabase/supabase-js';

// ── Constants ────────────────────────────────────────────────────────────────

const BLOCKED_METHODS = ['insert', 'update', 'delete', 'upsert', 'rpc'];

function blockedMethod(methodName) {
  return function () {
    throw new Error(
      `WRITE OPERATION BLOCKED: This app is read-only. Method '${methodName}' is not allowed.`
    );
  };
}

/** Replace every write method on an object with a hard throw (mutates obj). */
function lockWrites(obj) {
  for (const method of BLOCKED_METHODS) {
    obj[method] = blockedMethod(method);
  }
  return obj;
}

// ── Client creation ──────────────────────────────────────────────────────────

let _client = null;

function getClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase not configured: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are not set. ' +
      'Copy .env.example to .env and fill in your credentials.'
    );
  }

  if (!_client) {
    const raw = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // ── Layer 1: block rpc() directly on the client ──────────────────────────
    // rpc() bypasses .from() entirely, so it must be blocked here.
    raw.rpc = blockedMethod('rpc');

    // ── Layer 2: wrap from() so every builder it returns is write-locked ─────
    // This means even if getClient() were somehow exposed, every builder
    // produced from it would already have writes blocked before the caller
    // touches it.
    const originalFrom = raw.from.bind(raw);
    raw.from = function (tableName) {
      const builder = originalFrom(tableName);
      lockWrites(builder);
      return builder;
    };

    _client = raw;
  }

  return _client;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * query(tableName)
 *
 * The only way to interact with Supabase in this app.
 * Returns a write-locked Supabase query builder. Chain .select() on it.
 *
 * Example:
 *   const { data, error } = await query('shows')
 *     .select('show_id, venue_id')
 *     .eq('show_id', id);
 *
 * The underlying SupabaseClient is never exported and cannot be accessed
 * outside this module.
 */
export function query(tableName) {
  const client = getClient();

  // client.from() already locks writes (Layer 2).
  // lockWrites() here is Layer 3 — a redundant safety net.
  const builder = client.from(tableName);
  lockWrites(builder);
  return builder;
}
