-- RLS policy to reject obviously invalid procedure submissions.
-- Enforces sane price range, minimum field lengths, and
-- ensures created_at is not backdated.

DROP POLICY IF EXISTS "insert_procedures" ON procedures;

CREATE POLICY "insert_procedures" ON procedures
FOR INSERT WITH CHECK (
  price_paid > 0
  AND price_paid < 50000
  AND char_length(provider_name) >= 2
  AND char_length(city) >= 2
  AND char_length(procedure_type) >= 3
  AND created_at >= NOW() - INTERVAL '1 minute'
);
