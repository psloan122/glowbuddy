-- Track whether expiry warning email has been sent for a special
ALTER TABLE provider_specials ADD COLUMN IF NOT EXISTS expiry_warning_sent boolean DEFAULT false;

-- Index for cron job: find active specials expiring soon that haven't been warned
CREATE INDEX IF NOT EXISTS idx_specials_expiring_unwarn
  ON provider_specials (ends_at)
  WHERE is_active = true AND expiry_warning_sent = false;
