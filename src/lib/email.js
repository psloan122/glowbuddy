import { supabase } from './supabase';

async function invoke(template, to, data) {
  try {
    await supabase.functions.invoke('send-email', {
      body: { template, to, data },
    });
  } catch {
    // Email send is fire-and-forget — failures are silent
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

export function sendDisputeNotification(email, data) {
  invoke('dispute_notification', email, data);
}

export function sendGlowReport(email, data) {
  invoke('glow_report', email, data);
}

export function sendReferralReward(email, data) {
  invoke('referral_reward', email, data);
}

export function sendReferralWelcomeCredit(email, data) {
  invoke('referral_welcome_credit', email, data);
}

export function sendWrappedReady(email, data) {
  invoke('wrapped_ready', email, data);
}

export function sendListingApproved(email, data) {
  invoke('provider_listing_approved', email, data);
}
