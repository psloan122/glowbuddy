import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PLATFORM_LABELS = {
  vagaro: 'Vagaro',
  mindbody: 'Mindbody',
  boulevard: 'Boulevard',
  square: 'Square',
  jane: 'Jane',
  acuity: 'Acuity',
  glossgenius: 'GlossGenius',
  simplepractice: 'SimplePractice',
};

/**
 * Unified "Book Now" button for provider profiles.
 *
 * Priority:
 *   1. Vagaro integration (via provider_integrations, has rich features)
 *   2. Generic booking URL (via providers.booking_url, simple link)
 *
 * variant="detail-page" — full-width button for provider profile
 * variant="card" — compact text link for provider cards
 */
export default function BookNowButton({
  providerId,
  bookingUrl,
  bookingPlatform,
  procedureName,
  estimatedPrice,
  variant = 'card',
}) {
  const [vagaroUrl, setVagaroUrl] = useState(null);

  // Check for Vagaro integration (richer flow takes priority)
  useEffect(() => {
    if (!providerId) return;
    supabase
      .from('provider_integrations')
      .select('vagaro_booking_url, connection_status')
      .eq('provider_id', providerId)
      .eq('connection_status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.vagaro_booking_url) setVagaroUrl(data.vagaro_booking_url);
      })
      .catch(() => {});
  }, [providerId]);

  // Determine which URL and platform to use
  const url = vagaroUrl || bookingUrl;
  const platform = vagaroUrl ? 'vagaro' : bookingPlatform;

  if (!url) return null;

  const label = PLATFORM_LABELS[platform] || 'Online';

  function handleClick() {
    const referralToken = crypto.randomUUID();
    const trackedUrl = `${url}${url.includes('?') ? '&' : '?'}ref=${referralToken}`;

    // Track referral (fire-and-forget)
    supabase
      .from('booking_referrals')
      .insert({
        provider_id: providerId,
        platform: platform || 'unknown',
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
        className="inline-flex items-center justify-center gap-2 w-full py-3 bg-rose-accent text-white font-semibold rounded-xl hover:bg-rose-dark transition"
      >
        Book on {label}
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
