#!/usr/bin/env node
/**
 * verifyReadOnly.js
 *
 * Scans the codebase for any Supabase write method calls:
 *   .insert(  .update(  .delete(  .upsert(  .rpc(
 *
 * Exits with code 1 if any matches are found outside
 * lib/supabaseReadOnly.js (where they are legitimately defined as blockers).
 *
 * Usage:  node scripts/verifyReadOnly.js
 *   or:   npm run verify:readonly
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT      = resolve(new URL('../', import.meta.url).pathname);
const WRAPPER   = join(ROOT, 'lib', 'supabaseReadOnly.js');
const SELF      = join(ROOT, 'scripts', 'verifyReadOnly.js');
const SKIP_DIRS = new Set(['node_modules', '.git', 'payloads', 'data files']);

const WRITE_METHODS = ['.insert(', '.update(', '.delete(', '.upsert(', '.rpc('];

// ── Walk files ────────────────────────────────────────────────────────────────

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    // Only scan JS/TS — Python files can't call Supabase JS methods
  else if (/\.(js|mjs|cjs|ts|jsx|tsx)$/.test(entry)) yield full;
  }
}

// ── Scan ─────────────────────────────────────────────────────────────────────

let found = 0;

for (const filePath of walk(ROOT)) {
  const isWrapper = resolve(filePath) === resolve(WRAPPER);
  // Skip this script itself — it legitimately contains the method name strings
  if (resolve(filePath) === resolve(SELF)) continue;
  const lines = readFileSync(filePath, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const method of WRITE_METHODS) {
      if (!line.includes(method)) continue;

      // In the wrapper file, these are expected (they're the blockers) — skip
      if (isWrapper) continue;

      const rel = relative(ROOT, filePath);
      console.error(`WRITE METHOD FOUND: ${rel}:${i + 1}  →  ${line.trim()}`);
      found++;
    }
  }
}

// ── Result ───────────────────────────────────────────────────────────────────

if (found === 0) {
  console.log('✓ Read-only verified: no write methods found outside lib/supabaseReadOnly.js');
  process.exit(0);
} else {
  console.error(`\n✗ ${found} write method occurrence(s) found. Remove them before deploying.`);
  process.exit(1);
}
