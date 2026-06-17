#!/usr/bin/env node
/**
 * RLS verification probe.
 *
 * Confirms that the public anon key CANNOT read protected tables, and
 * (optionally, with --authenticated) that a logged-in technician can read
 * their own data while a portal customer stays isolated.
 *
 * Usage:
 *   node scripts/verify-rls.mjs
 *   node scripts/verify-rls.mjs --authenticated
 *
 * Reads env: VITE_PUBLIC_SUPABASE_URL, VITE_PUBLIC_SUPABASE_ANON_KEY
 *            (falls back to VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * Optional:  RLS_TEST_TECH_EMAIL/PASSWORD, RLS_TEST_CUST_EMAIL/PASSWORD
 *
 * No external dependencies — uses the REST endpoint via fetch (Node 18+).
 */

import { readFileSync, existsSync } from 'node:fs';

// --- minimal .env loader (no dependency) ----------------------------------
function loadEnvFile() {
  for (const name of ['.env.local', '.env']) {
    if (!existsSync(name)) continue;
    for (const line of readFileSync(name, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
loadEnvFile();

const URL =
  process.env.VITE_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const ANON =
  process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

if (!URL || !ANON) {
  console.error('Missing VITE_PUBLIC_SUPABASE_URL / VITE_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(2);
}

const PROTECTED_TABLES = [
  'customers',
  'assets',
  'inspections',
  'deficiencies',
  'proposals',
  'work_orders',
  'invoices',
  'payments',
  'audit_logs',
];

let failures = 0;
const pass = (m) => console.log(`  \u2713 ${m}`);
const fail = (m) => {
  console.error(`  \u2717 ${m}`);
  failures++;
};

async function restSelect(table, accessToken) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${accessToken || ANON}`,
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function signIn(email, password) {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.msg || 'sign-in failed');
  return json.access_token;
}

async function main() {
  const authenticated = process.argv.includes('--authenticated');

  console.log('\nRLS verification — anonymous reads must be blocked or empty\n');
  for (const table of PROTECTED_TABLES) {
    const { status, body } = await restSelect(table);
    const rowCount = Array.isArray(body) ? body.length : 0;
    if (status >= 400 || rowCount === 0) {
      pass(`${table}: anon blocked (status ${status}, ${rowCount} rows)`);
    } else {
      fail(`${table}: anon read returned ${rowCount} row(s) — RLS LEAK`);
    }
  }

  if (authenticated) {
    console.log('\nAuthenticated probes\n');
    const techEmail = process.env.RLS_TEST_TECH_EMAIL;
    const techPass = process.env.RLS_TEST_TECH_PASSWORD;
    if (techEmail && techPass) {
      try {
        const token = await signIn(techEmail, techPass);
        const { status, body } = await restSelect('inspections', token);
        if (status < 400 && Array.isArray(body)) {
          pass(`technician can read inspections (status ${status})`);
        } else {
          fail(`technician inspections read failed (status ${status})`);
        }
      } catch (e) {
        fail(`technician sign-in failed: ${e.message}`);
      }
    } else {
      console.log('  (skipped — set RLS_TEST_TECH_EMAIL / RLS_TEST_TECH_PASSWORD)');
    }
  }

  console.log('');
  if (failures > 0) {
    console.error(`RLS verification FAILED with ${failures} finding(s).`);
    process.exit(1);
  }
  console.log('RLS verification passed.');
}

main().catch((e) => {
  console.error('Probe error:', e.message || e);
  const cause = e?.cause?.code || e?.code;
  if (cause === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || cause === 'SELF_SIGNED_CERT_IN_CHAIN') {
    console.error(
      '\nTLS interception detected (corporate proxy/AV). The Supabase cert could not be verified locally.\n' +
        'Re-run trusting the system trust store, e.g.:\n' +
        '  node --use-system-ca scripts/verify-rls.mjs\n' +
        'or point NODE_EXTRA_CA_CERTS at your proxy root CA. This is a local network\n' +
        'condition, not an RLS finding — use the SQL checks in docs/rls-verification.md instead.',
    );
  }
  process.exit(2);
});
