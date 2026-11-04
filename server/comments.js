import { getSql, hasPostgres } from './pg.js';
import { getState, saveNow, id } from './db.js';

const MAX_COMMENT_LEN = 2000;
const MIN_COMMENT_LEN = 1;

// Ensure Postgres table exists (idempotent). Called lazily.
let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        comment TEXT NOT NULL CHECK (char_length(comment) >= 1 AND char_length(comment) <= 2000),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    // Add created_at index for ordering
    await sql`CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments (created_at DESC)`;
    tableEnsured = true;
  } catch (err) {
    console.error('[comments] ensureTable failed:', err.message);
    // Don't throw — fallback to JSON so site stays up
  }
}

function sanitizeForJson(comment) {
  return String(comment ?? '').trim();
}

export function isValidComment(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= MIN_COMMENT_LEN && trimmed.length <= MAX_COMMENT_LEN;
}

export function clampComment(value) {
  return String(value ?? '').trim().slice(0, MAX_COMMENT_LEN);
}

// Public API — works with Postgres when available, otherwise JSON file
export async function listComments({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sql = getSql();
  if (sql && hasPostgres()) {
    await ensureTable();
    try {
      const rows = await sql`SELECT id, comment, created_at FROM comments ORDER BY created_at DESC LIMIT ${safeLimit}`;
      return rows.map((r) => ({
        id: String(r.id),
        comment: r.comment,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      }));
    } catch (err) {
      console.error('[comments] Postgres list failed, falling back to JSON:', err.message);
      // fallthrough to JSON
    }
  }
  const state = getState();
  state.comments ||= [];
  return [...state.comments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, safeLimit);
}

export async function createComment(rawComment) {
  if (!isValidComment(rawComment)) {
    const err = new Error('Comment must be 1–2000 characters.');
    err.status = 400;
    throw err;
  }
  const comment = clampComment(rawComment);
  const sql = getSql();
  if (sql && hasPostgres()) {
    await ensureTable();
    try {
      // Parameterized query — $1 placeholder equivalent via tagged template
      const rows = await sql`INSERT INTO comments (comment) VALUES (${comment}) RETURNING id, comment, created_at`;
      const row = rows[0];
      return {
        id: String(row.id),
        comment: row.comment,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      };
    } catch (err) {
      console.error('[comments] Postgres insert failed, falling back to JSON:', err.message);
      // fallthrough
    }
  }
  // JSON fallback — mirrors the Postgres shape
  const state = getState();
  state.comments ||= [];
  const entry = {
    id: id('cmt_'),
    comment,
    createdAt: new Date().toISOString(),
  };
  state.comments.unshift(entry);
  // keep only most recent 500 to bound file size
  if (state.comments.length > 500) state.comments = state.comments.slice(0, 500);
  saveNow();
  return entry;
}

// For admin/moderation — delete by id
export async function deleteComment(targetId) {
  const sql = getSql();
  if (sql && hasPostgres()) {
    await ensureTable();
    try {
      await sql`DELETE FROM comments WHERE id = ${Number(targetId)}`;
      return true;
    } catch (err) {
      console.error('[comments] Postgres delete failed:', err.message);
    }
  }
  const state = getState();
  state.comments ||= [];
  const idx = state.comments.findIndex((c) => c.id === targetId || String(c.id) === String(targetId));
  if (idx !== -1) {
    state.comments.splice(idx, 1);
    saveNow();
    return true;
  }
  return false;
}

// Reset for tests
export function _resetTableEnsured() {
  tableEnsured = false;
}
