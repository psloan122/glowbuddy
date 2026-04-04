import { supabase } from './supabase';

async function invoke(template, to, data) {
  try {
    await supabase.functions.invoke('send-email', {
      body: { template, to, data },
    });
  } catch (err) {
    console.error(`[email] Failed to send ${template}:`, err);
  }
}

export function sendWelcomeUser(email) {
  invoke('welcome_user', email);
}

export function sendProviderWelcome(email, data) {
  invoke('provider_welcome', email, data);
}

export function sendSpecialOfferReceipt(email, data) {
  invoke('special_offer_receipt', email, data);
}

export function sendSpecialOfferExpiring(email, data) {
  invoke('special_offer_expiring', email, data);
}

export function sendWeeklyDigest(email, data) {
  invoke('weekly_digest', email, data);
}

export function sendPriceAlert(email, data) {
  invoke('price_alert', email, data);
}
