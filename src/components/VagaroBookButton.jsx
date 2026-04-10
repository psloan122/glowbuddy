import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Book on Vagaro button. Only renders if provider has active Vagaro connection.
 * Tracks referrals via booking_referrals table.
 *
 * variant="card" — compact text link for provider cards
 * variant="detail-page" — full button for provider profile
 */
export default function VagaroBookButton({
  providerId,
  procedureName,
  estimatedPrice,
  variant = 'card',
}) {
  const [integration, setIntegration] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    supabase
      .from('provider_integrations')
      .select('vagaro_booking_url, connection_status')
      .eq('provider_id', providerId)
      .eq('connection_status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIntegration(data);
      })
      .catch(() => {});
  }, [providerId]);

  if (!integration) return null;

  function handleClick() {
    const referralToken = crypto.randomUUID();
    const trackedUrl = `${integration.vagaro_booking_url}${integration.vagaro_booking_url.includes('?') ? '&' : '?'}ref=${referralToken}`;

    // Fire-and-forget referral tracking
    supabase
      .from('booking_referrals')
      .insert({
        provider_id: providerId,
        platform: 'vagaro',
        referral_token: referralToken,
        procedure_name: procedureName || null,
        estimated_value: estimatedPrice || null,
        session_id: sessionStorage.getItem('gb_session') || null,
      })
      .then(() => {})
      .catch(() => {});

    window.open(trackedUrl, '_blank');
  }

  if (variant === 'detail-page') {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2 w-full py-3 border-2 border-gray-200 text-text-primary font-semibold rounded-xl hover:bg-gray-50 transition"
      >
        <img src="/logos/vagaro.svg" alt="Vagaro" className="h-4" loading="lazy" width={48} height={16} onError={(e) => e.target.style.display = 'none'} />
        Book on Vagaro
        <ExternalLink size={14} />
      </button>
    );
  }

  // Card variant
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-rose-accent hover:text-rose-dark transition"
    >
      Book Now
      <ExternalLink size={10} />
    </button>
  );
}
