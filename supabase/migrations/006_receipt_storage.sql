-- Receipt columns on procedures
ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS has_receipt boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS receipt_path text,
  ADD COLUMN IF NOT EXISTS receipt_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS receipt_parsed boolean DEFAULT false;

-- Entry tracking on giveaway_entries
ALTER TABLE giveaway_entries
  ADD COLUMN IF NOT EXISTS entries integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS has_receipt boolean DEFAULT false;

-- Note: Create 'receipts' bucket manually in Supabase dashboard:
--   Storage > New bucket > 'receipts' > Private
--   Max file size: 10MB
--   Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf

-- Storage RLS policies
CREATE POLICY "users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "service role can read receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');
