-- 020: Add data_source columns to procedures table
-- Supports provider quotes and verified menu prices as distinct data types

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'patient_report';

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS quote_date date;

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS quote_notes text;

-- Index for filtering by data source
CREATE INDEX IF NOT EXISTS idx_procedures_data_source
  ON procedures (data_source) WHERE status = 'active';

COMMENT ON COLUMN procedures.data_source IS 'patient_report | provider_quote | verified_menu';
COMMENT ON COLUMN procedures.quote_date IS 'Date the price was quoted (for provider_quote)';
COMMENT ON COLUMN procedures.quote_notes IS 'Notes about the quote source (for provider_quote)';
