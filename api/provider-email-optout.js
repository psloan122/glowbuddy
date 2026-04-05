import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const OPTOUT_SECRET = process.env.OPTOUT_SECRET;
if (!OPTOUT_SECRET) {
  console.error('[optout] OPTOUT_SECRET env var is not set');
}

function generateToken(providerId) {
  return createHmac('sha256', OPTOUT_SECRET)
    .update(providerId)
    .digest('hex')
    .slice(0, 32);
}

export default async function handler(req, res) {
  if (!OPTOUT_SECRET) {
    return res.status(500).send(errorPage('Server configuration error.'));
  }

  const { id, token } = req.query;

  if (!id || !token) {
    return res.status(400).send(errorPage('Missing parameters.'));
  }

  // Verify signed token
  const expected = generateToken(id);
  if (token !== expected) {
    return res.status(403).send(errorPage('Invalid or expired link.'));
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Set opted out
  const { error } = await supabase
    .from('providers')
    .update({ activity_email_opted_out: true })
    .eq('id', id);

  if (error) {
    console.error('Opt-out error:', error);
    return res.status(500).send(errorPage('Something went wrong. Please try again.'));
  }

  // Track event
  await supabase
    .from('custom_events')
    .insert({
      event_name: 'provider_activity_email_opted_out',
      properties: { provider_id: id },
    });

  // Get provider slug for the claim link
  const { data: provider } = await supabase
    .from('providers')
    .select('slug, name')
    .eq('id', id)
    .single();

  const slug = provider?.slug || '';
  const name = provider?.name || 'Your practice';

  return res.status(200).send(successPage(name, slug));
}

function successPage(name, slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed | GlowBuddy</title>
  <style>
    body { margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FDFBF9; color: #1A1A2E; text-align: center; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { font-size: 15px; color: #6B7280; line-height: 1.6; margin: 0 0 20px; }
    a.btn { display: inline-block; background: #C94F78; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-weight: 600; font-size: 15px; }
    a.btn:hover { opacity: 0.9; }
    .logo { font-size: 22px; font-weight: 700; color: #C94F78; margin-bottom: 32px; }
    .logo span { font-weight: 400; color: #1A1A2E; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Glow<span>Buddy</span></div>
    <h1>You&rsquo;ve been unsubscribed</h1>
    <p>You won&rsquo;t receive weekly activity updates for <strong>${escapeHtml(name)}</strong>. Your page remains visible on GlowBuddy.</p>
    <p>You can claim your listing any time to manage your page, add pricing, and remove competitor ads.</p>
    <a class="btn" href="https://glowbuddy.com/business/onboarding?provider=${encodeURIComponent(slug)}&source=optout">Claim Your Listing</a>
  </div>
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error | GlowBuddy</title>
  <style>
    body { margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FDFBF9; color: #1A1A2E; text-align: center; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { font-size: 15px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Oops</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
