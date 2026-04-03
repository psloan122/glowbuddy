CREATE TABLE IF NOT EXISTS custom_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  properties jsonb,
  session_id text,
  created_at timestamp DEFAULT NOW()
);

-- Index for querying by event name
CREATE INDEX IF NOT EXISTS idx_custom_events_name ON custom_events (event_name);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_custom_events_created ON custom_events (created_at);

-- Allow anonymous inserts (client-side analytics)
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON custom_events FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admins) can read
CREATE POLICY "Authenticated users can read events"
  ON custom_events FOR SELECT
  USING (auth.role() = 'authenticated');
