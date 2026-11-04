-- Comments table for Young Silence — secure by default
-- Run with: psql "$POSTGRES_URL_NO_SSL" -f scripts/create-comments-table.sql
-- Or via Neon console / direct connection

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  comment TEXT NOT NULL CHECK (char_length(comment) >= 1 AND char_length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments (created_at DESC);

-- If Data API was ever enabled, enable RLS and deny anon by default.
-- This app does NOT use the Data API — it queries via @neondatabase/serverless
-- with parameterized queries server-side. Keep Data API disabled in neon.ts.
-- If you must enable it, uncomment below:
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY comments_select ON comments FOR SELECT USING (true);
-- CREATE POLICY comments_insert_own ON comments FOR INSERT WITH CHECK (false); -- block direct inserts via API

COMMENT ON TABLE comments IS 'Fan comments — inserted via POST /api/comments with parameterized SQL, rate-limited and XSS-safe (rendered as text)';
