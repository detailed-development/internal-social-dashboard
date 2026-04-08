#!/usr/bin/env node

/**
 * db:hydrate — runs migrations + all seed scripts in the correct order.
 *
 * Usage:
 *   DATABASE_URL="..." node scripts/hydrate.js
 *   DATABASE_URL="..." META_USER_TOKEN="..." node scripts/hydrate.js   # includes Meta sync
 *
 * Steps:
 *   1. prisma migrate deploy   — apply schema
 *   2. seed-ga-properties.js   — create clients with GA4 / GTM / website info
 *   3. seed-from-meta.js       — connect Instagram + Facebook accounts (skipped if no META_USER_TOKEN)
 *   4. seed-groups.js          — organise clients into sidebar groups
 */

import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(label, cmd, args, opts = {}) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('═'.repeat(60));
  try {
    execFileSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
  } catch (err) {
    if (opts.optional) {
      console.log(`  ⏭  Skipped (${opts.reason || 'failed'})`);
      return false;
    }
    console.error(`\n  ✕  "${label}" failed (exit ${err.status})`);
    process.exit(err.status || 1);
  }
  return true;
}

// 1. Migrations — use local prisma to avoid npx pulling a wrong major version
const prismaCliPath = resolve(root, 'node_modules', '.bin', 'prisma');
run('Applying migrations', prismaCliPath, ['migrate', 'deploy']);

// 2. Client registry (GA4 properties, GTM, websites)
run('Seeding clients + GA4 properties', 'node', [resolve(__dirname, 'seed-ga-properties.js')]);

// 3. Meta social accounts (optional — needs META_USER_TOKEN)
if (process.env.META_USER_TOKEN) {
  run('Seeding from Meta Graph API', 'node', [resolve(__dirname, 'seed-from-meta.js')]);
} else {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  Skipping Meta seed (no META_USER_TOKEN set)');
  console.log('═'.repeat(60));
}

// 4. Groups
run('Seeding client groups', 'node', [resolve(__dirname, 'seed-groups.js')]);

console.log(`\n${'═'.repeat(60)}`);
console.log('  ✓  Database hydrated!');
console.log('═'.repeat(60) + '\n');
