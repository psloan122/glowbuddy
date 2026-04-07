import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  ExternalLink,
  Globe,
  Phone,
  ShieldCheck,
  Users,
  Flag,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import ProcedureCard from '../components/ProcedureCard';
import SpecialCard from '../components/SpecialCard';
import DisputeModal from '../components/DisputeModal';

export default function ProviderProfile() {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);

  const [provider, setProvider] = useState(null);
  const [communityData, setCommunityData] = useState([]);
  const [verifiedPricing, setVerifiedPricing] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProviderOwner, setIsProviderOwner] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch provider record
      const { data: providerRow } = await supabase
        .from('providers')
        .select('*')
        .eq('slug', slug)
        .single();

      setProvider(providerRow);

      // Fetch community submissions for this provider
      const { data: community } = await supabase
        .from('procedures')
        .select('*')
        .eq('provider_slug', slug)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setCommunityData(community || []);

      if (providerRow) {
        // Fetch verified pricing
        const { data: pricing } = await supabase
          .from('provider_pricing')
          .select('*')
          .eq('provider_id', providerRow.id);

        setVerifiedPricing(pricing || []);

        // Fetch active specials
        const { data: activeSpecials } = await supabase
          .from('specials')
          .select('*')
          .eq('provider_id', providerRow.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        setSpecials(activeSpecials || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [slug]);

  // Check if current user owns a provider account (for flag button visibility)
  useEffect(() => {
    async function checkOwnership() {
      if (!user) {
        setIsProviderOwner(false);
        return;
      }

      const { data } = await supabase
        .from('providers')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      setIsProviderOwner(!!data);
    }

    checkOwnership();
  }, [user]);

  // SEO
  useEffect(() => {
    const name =
      provider?.name ||
      (communityData.length > 0
        ? communityData[0].provider_name
        : 'Provider');
    document.title = `${name} Prices & Reviews | GlowBuddy`;
    const meta = document.querySelector('meta[name="description"]');
    const content = `See real prices and verified menu for ${name}. Compare what patients paid and view current specials on GlowBuddy.`;
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = content;
      document.head.appendChild(newMeta);
    }
  }, [provider, communityData]);

  function handleDisputeSubmitted() {
    // Refresh community data after a flag
    supabase
      .from('procedures')
      .select('*')
      .eq('provider_slug', slug)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCommunityData(data || []));
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading provider...
        </div>
      </div>
    );
  }

  const providerName =
    provider?.name ||
    (communityData.length > 0
      ? communityData[0].provider_name
      : 'Unknown Provider');

  const providerCity =
    provider?.city ||
    (communityData.length > 0 ? communityData[0].city : null);

  const providerState =
    provider?.state ||
    (communityData.length > 0 ? communityData[0].state : null);

  return (
    <div className="bg-cream min-h-screen page-enter">
      {/* 1. Provider Header — editorial dark masthead */}
      <div className="bg-ink" style={{ borderBottom: '2px solid #E8347A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5 min-w-0 flex-1">
              <ProviderAvatar name={providerName} size={72} />
              <div className="min-w-0 flex-1">
                {/* Kicker — location */}
                {(providerCity || providerState) && (
                  <p
                    className="text-[10px] font-semibold uppercase mb-3"
                    style={{ color: '#E8B4C8', letterSpacing: '0.12em' }}
                  >
                    {[providerCity, providerState].filter(Boolean).join(' / ')}
                  </p>
                )}

                {/* Name — Playfair Display 900 */}
                <h1
                  className="font-display text-white mb-3"
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(32px, 5vw, 56px)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {providerName}
                </h1>

                {/* Inline badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {provider?.provider_type && (
                    <span
                      className="inline-flex items-center text-[10px] font-semibold uppercase px-2 py-0.5 text-blush"
                      style={{
                        letterSpacing: '0.08em',
                        borderRadius: '4px',
                        border: '1px solid #E8B4C8',
                      }}
                    >
                      {provider.provider_type}
                    </span>
                  )}
                  {provider?.is_verified && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5"
                      style={{
                        letterSpacing: '0.08em',
                        borderRadius: '4px',
                        background: '#0D2A1A',
                        color: '#4CAF50',
                        border: '1px solid #1A4A2A',
                      }}
                    >
                      <CheckCircle size={10} />
                      {isClaimed ? 'Claimed & Verified' : 'Verified Practice'}
                    </span>
                  )}
                  {provider?.first_timer_friendly && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5"
                      style={{
                        letterSpacing: '0.08em',
                        borderRadius: '4px',
                        background: '#1A1A1A',
                        color: '#E8B4C8',
                        border: '1px solid #333',
                      }}
                    >
                      <Heart size={10} />
                      Welcomes First-Timers
                    </span>
                  )}
                </div>

                {/* Ratings + location meta */}
                <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#999] mb-3">
                  {(providerCity || providerState) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {[providerCity, providerState].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {googleRating && (
                    <span className="flex items-center gap-1">
                      <Star size={12} style={{ color: '#E8347A', fill: '#E8347A' }} />
                      <span className="font-medium text-white">
                        {Number(googleRating).toFixed(1)}
                      </span>
                      {googleReviewCount && (
                        <span>({googleReviewCount.toLocaleString()})</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Social proof line — claimed only */}
                {isClaimed && (
                  <p className="text-[11px] text-[#888] font-light mb-2">
                    {[
                      verifiedPricing.length > 0 && `${verifiedPricing.length} verified price${verifiedPricing.length !== 1 ? 's' : ''}`,
                      reviews.length > 0 && `${reviews.length} patient review${reviews.length !== 1 ? 's' : ''}`,
                      baPhotos.length > 0 && `${baPhotos.length} before/after${baPhotos.length !== 1 ? 's' : ''}`,
                    ].filter(Boolean).join(' \u00b7 ') || 'Claimed and verified on GlowBuddy'}
                  </p>
                )}

              {/* GlowBuddy Rating */}
              {(provider?.weighted_rating || provider?.avg_rating) && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 text-[12px] text-[#999]">
                    <StarRating
                      value={Math.round(provider.weighted_rating || provider.avg_rating)}
                      readOnly
                      size={12}
                    />
                    <span className="font-medium text-white">
                      {provider.weighted_rating || provider.avg_rating}
                    </span>
                    <span className="text-[#666]">weighted</span>
                    {provider.review_count > 0 && (
                      <span>
                        &middot; {provider.review_count} review
                        {provider.review_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Google Maps link */}
              {googleMapsUrl && (
                <div className="mb-2">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold uppercase text-hot-pink hover:text-blush transition inline-flex items-center gap-1"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    View on Google Maps
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {/* Hours */}
              {hoursText && (() => {
                const DAY_ABBREV = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const rows = hoursText.split(',').map((s) => s.trim()).filter(Boolean).map((entry) => {
                  const colonIdx = entry.indexOf(':');
                  if (colonIdx === -1) return null;
                  const day = entry.slice(0, colonIdx).trim();
                  const hours = entry.slice(colonIdx + 1).trim();
                  return { day, abbrev: DAY_ABBREV[day] || day.slice(0, 3), hours, isToday: day === today };
                }).filter(Boolean);

                const todayRow = rows.find((r) => r.isToday);
                const isClosed = (h) => /closed/i.test(h);
                const isOpenNow = todayRow && !isClosed(todayRow.hours);

                return (
                  <div className="mt-3">
                    {/* Mobile: collapsed by default */}
                    <div className="md:hidden">
                      <button
                        onClick={() => setHoursExpanded(!hoursExpanded)}
                        className="flex items-center gap-1.5 text-[11px] text-[#999]"
                      >
                        <Clock size={11} className="shrink-0" />
                        {todayRow && (
                          <>
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                              style={{ background: isOpenNow ? '#4CAF50' : '#666' }}
                            />
                            <span className="font-medium text-white">
                              {todayRow.hours}
                            </span>
                          </>
                        )}
                        <span className="text-[#666] uppercase" style={{ letterSpacing: '0.06em' }}>
                          {hoursExpanded ? 'Hide hours' : 'See all hours'}
                        </span>
                        {hoursExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                      {hoursExpanded && (
                        <div className="mt-2 ml-5 grid grid-cols-[40px_1fr] gap-y-1 text-[11px]">
                          {rows.map((r) => [
                            <span
                              key={`${r.day}-label`}
                              className="text-[#888] flex items-center gap-1"
                              style={r.isToday ? { fontWeight: 500 } : undefined}
                            >
                              {r.isToday && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full"
                                  style={{ background: isClosed(r.hours) ? '#666' : '#4CAF50' }}
                                />
                              )}
                              {r.abbrev}
                            </span>,
                            <span
                              key={`${r.day}-hours`}
                              style={
                                isClosed(r.hours)
                                  ? { color: '#666' }
                                  : r.isToday
                                    ? { fontWeight: 500, color: '#fff' }
                                    : { color: '#bbb' }
                              }
                            >
                              {r.hours}
                            </span>,
                          ])}
                        </div>
                      )}
                    </div>
                    {/* Desktop: always visible */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-[#666] mb-2" style={{ letterSpacing: '0.08em' }}>
                        <Clock size={11} className="shrink-0" />
                        <span>Hours</span>
                      </div>
                      <div className="ml-5 grid grid-cols-[40px_1fr] gap-y-1 text-[11px]">
                        {rows.map((r) => [
                          <span
                            key={`${r.day}-label`}
                            className="text-[#888] flex items-center gap-1"
                            style={r.isToday ? { fontWeight: 500 } : undefined}
                          >
                            {r.isToday && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full"
                                style={{ background: isClosed(r.hours) ? '#666' : '#4CAF50' }}
                              />
                            )}
                            {r.abbrev}
                          </span>,
                          <span
                            key={`${r.day}-hours`}
                            style={
                              isClosed(r.hours)
                                ? { color: '#666' }
                                : r.isToday
                                  ? { fontWeight: 500, color: '#fff' }
                                  : { color: '#bbb' }
                            }
                          >
                            {r.hours}
                          </span>,
                        ])}
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>

            {/* Contact links + Write Review */}
            <div className="flex flex-wrap items-center gap-2">
              {isClaimed && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="btn-editorial btn-editorial-primary"
                >
                  <Star size={12} />
                  Write Review
                </button>
              )}

              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase text-white transition-colors"
                  style={{
                    letterSpacing: '0.12em',
                    border: '1px solid #333',
                    borderRadius: '2px',
                    background: 'transparent',
                  }}
                >
                  <ExternalLink size={11} />
                  Website
                </a>
              )}
              {provider?.instagram && (
                <a
                  href={`https://instagram.com/${provider.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase text-white transition-colors"
                  style={{
                    letterSpacing: '0.12em',
                    border: '1px solid #333',
                    borderRadius: '2px',
                    background: 'transparent',
                  }}
                >
                  <Globe size={11} />
                  Instagram
                </a>
              )}
              {phone && (
                <CallNowButton
                  providerId={provider?.id}
                  realPhone={phone}
                  source="provider_detail"
                  variant="compact"
                />
              )}
              <VagaroBookButton
                providerId={provider?.id}
                variant="detail-page"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* 2. Warning Banner — competitors advertising on unclaimed page */}
      {/* Hidden for regular logged-in patients — only owners, business users, and admins see this */}
      {!isClaimed && competitorCount > 0 && (!user || isProviderOwner || isAdmin) && (
        <div
          className="mb-6 flex items-center gap-3 p-4 rounded-xl"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <AlertTriangle size={20} className="shrink-0" style={{ color: '#D97706' }} />
          <p className="text-sm font-medium" style={{ color: '#92400E' }}>
            {competitorCount} competitor{competitorCount !== 1 ? 's are' : ' is'} advertising on this unclaimed page.{' '}
            <Link to={claimUrl} className="underline font-semibold" style={{ color: '#92400E' }}>
              Claim it free
            </Link>{' '}
            to remove them.
          </p>
        </div>
      )}

      {/* 3. Community Prices + Verification Breakdown — trust level 1 (unclaimed) */}
      {communityData.length > 0 && !isClaimed && (
        <div className="glow-card p-6 mb-6">
          <h2 className="text-lg font-bold text-text-primary mb-1">
            What patients report paying at {providerName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                provider={provider}
              />
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Verified Menu */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-verified" />
            Their Menu
          </h2>

          {verifiedPricing.length > 0 ? (
            <div className="glow-card overflow-hidden">
              <div className="divide-y divide-gray-100">
                {verifiedPricing.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {item.procedure_type}
                      </p>
                      {item.units_or_volume && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          {item.units_or_volume}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-text-primary">
                        ${Number(item.price).toLocaleString()}
                      </p>
                      {item.price_label && (
                        <p className="text-xs text-text-secondary">
                          {item.price_label}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glow-card p-6 text-center">
              <p className="text-text-secondary text-sm">
                This provider hasn't uploaded their menu yet.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Community Prices */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <Users size={20} className="text-community" />
            What Patients Paid
          </h2>

          {communityData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {communityData.map((procedure, index) => (
                <div key={procedure.id} className="relative">
                  <ProcedureCard procedure={procedure} index={index} />

                  {/* Flag button: only for authenticated provider owners */}
                  {user && isProviderOwner && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDisputeTarget(procedure);
                      }}
                      className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-white/90 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-rose-accent transition-colors z-10"
                      title="Flag this price"
                    >
                      <Flag size={12} />
                      Flag
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glow-card p-6 text-center">
              <p className="text-text-secondary text-sm">
                No community prices yet for this provider.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap gap-4 mt-8">
        <Link
          to="/log"
          className="inline-flex items-center gap-2 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
        >
          <Plus size={18} />
          Add a price for this provider
        </Link>

        {provider?.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={18} />
            Book / Visit Website
          </a>
        )}
      </div>

      {/* Dispute Modal */}
      {disputeTarget && (
        <DisputeModal
          procedure={disputeTarget}
          providerId={provider?.id}
          onClose={() => setDisputeTarget(null)}
          onSubmitted={handleDisputeSubmitted}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          provider={provider}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            refreshReviews();
            setShowReviewModal(false);
          }}
        />
      )}

      </div>
    </div>
  );
}
