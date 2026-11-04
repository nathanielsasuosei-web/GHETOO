import { neon } from '@neondatabase/serverless';

// Resolve the Neon Postgres URL. Vercel/Neon provide POSTGRES_URL_NO_SSL,
// POSTGRES_URL, DATABASE_URL — we accept all three, preferring the pooled
// non-SSL variant that the project already has configured.
function resolveDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();
}

let sqlInstance = null;
let warnedNoUrl = false;

export function getDatabaseUrl() {
  return resolveDatabaseUrl();
}

export function hasPostgres() {
  return Boolean(resolveDatabaseUrl());
}

export function getSql() {
  const url = resolveDatabaseUrl();
  if (!url) {
    if (!warnedNoUrl) {
      warnedNoUrl = true;
      console.warn('[comments] No POSTGRES_URL_NO_SSL / DATABASE_URL set — using JSON fallback for comments');
    }
    return null;
  }
  if (!sqlInstance) {
    sqlInstance = neon(url);
  }
  return sqlInstance;
}

// For testing: reset cached instance
export function _resetSqlForTests() {
  sqlInstance = null;
  warnedNoUrl = false;
}
