import { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Smart call button: uses Twilio tracked number when available,
 * falls back to provider's real number immediately (no loading block).
 */
export default function CallNowButton({ providerId, realPhone, source = 'provider_card', variant = 'compact' }) {
  const [twilioNumber, setTwilioNumber] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    supabase
      .rpc('get_provider_twilio_number', { p_provider_id: providerId })
      .then(({ data }) => {
        if (data) setTwilioNumber(data);
      })
      .catch(() => {});
  }, [providerId]);

  const phoneNumber = twilioNumber || realPhone;
  if (!phoneNumber) return null;

  function handleClick() {
    // Fire-and-forget analytics log
    supabase
      .from('custom_events')
      .insert({
        event_type: 'call_initiated',
        event_data: {
          provider_id: providerId,
          source,
          tracked: !!twilioNumber,
        },
      })
      .then(() => {})
      .catch(() => {});
  }

  if (variant === 'full') {
    return (
      <a
        href={`tel:${phoneNumber}`}
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2 w-full py-3 bg-rose-accent text-white font-semibold rounded-xl hover:bg-rose-dark transition"
      >
        <Phone size={16} />
        Call Now
      </a>
    );
  }

  return (
    <a
      href={`tel:${phoneNumber}`}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
    >
      <Phone size={14} />
      Call
    </a>
  );
}
