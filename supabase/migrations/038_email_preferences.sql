-- Migration 038: Email preferences on profiles
-- Adds email opt-in/out toggles and timezone for personalized sends.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_monthly_report BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_price_alerts BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_giveaway BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS report_timezone TEXT DEFAULT 'America/Chicago';
