import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  ExternalLink,
  Globe,
  Phone,
  Plus,
  Star,
  Lock,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { VALID_STATE_CODES } from '../lib/constants';
import { providerSlugFromParts, slugToDisplayName } from '../lib/slugify';
import { extractPlaceData } from '../lib/places';
import DisputeModal from '../components/DisputeModal';
import ReviewModal from '../components/ReviewModal';
import ProviderAvatar from '../components/ProviderAvatar';
import StarRating from '../components/StarRating';
import OverviewTab from '../components/ProviderTabs/OverviewTab';
import BeforeAfterTab from '../components/ProviderTabs/BeforeAfterTab';
import ReviewsTab from '../components/ProviderTabs/ReviewsTab';
import PricesTab from '../components/ProviderTabs/PricesTab';
import CompetitorAds from '../components/CompetitorAds';
import PriceAlertButton from '../components/PriceAlertButton';
import FairPriceBadge from '../components/FairPriceBadge';

const PROFILE_TABS = ['Overview', 'Before & Afters', 'Reviews', 'Prices'];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function ProviderProfile() {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);

  const [provider, setProvider] = useState(null);
  const [communityData, setCommunityData] = useState([]);
  const [verifiedPricing, setVerifiedPricing] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [providerPhotos, setProviderPhotos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [baPhotos, setBaPhotos] = useState([]);
  const [injectors, setInjectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProviderOwner, setIsProviderOwner] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [competitorCount, setCompetitorCount] = useState(0);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const carouselRef = useRef(null);

  const isClaimed = provider?.is_claimed === true;

  // Default tab: mobile shows B&A, desktop shows Overview
  const [activeTab, setActiveTab] = useState(() =>
    window.innerWidth < 768 ? 'Before & Afters' : 'Overview'
  );

  /**
   * Parse slug to extract state code and derive a display name.
   * Slug format: "provider-name-city-STATE" (from providerSlugFromParts).
   */
  function parseSlug(s) {
    const parts = s.split('-');
    const last = parts[parts.length - 1];
    if (parts.length >= 3 && VALID_STATE_CODES.has(last.toUpperCase())) {
      return { state: last.toUpperCase(), displayName: slugToDisplayName(s) };
    }
    return { state: null, displayName: slugToDisplayName(s) };
  }

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Try claimed provider by slug
      const { data: providerRow } = await supabase
        .from('providers')
        .select('*')
        .eq('slug', slug)
        .single();

      // 2. Try procedures by provider_slug (claimed providers)
      const { data: community } = await supabase
        .from('procedures')
        .select('*')
        .eq('provider_slug', slug)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      let finalProvider = providerRow;
      let finalCommunity = community || [];

      // 3. If no provider row AND no community data by slug, try matching via generated slug
      if (!providerRow && finalCommunity.length === 0) {
        const { state } = parseSlug(slug);
        if (state) {
          const { data: stateProcedures } = await supabase
            .from('procedures')
            .select('*')
            .eq('state', state)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          finalCommunity = (stateProcedures || []).filter(
            (p) =>
              p.provider_name &&
              p.city &&
              p.state &&
              providerSlugFromParts(p.provider_name, p.city, p.state) === slug
          );
        }
      }

      setProvider(finalProvider);
      setCommunityData(finalCommunity);

      // 4. Fetch related data for claimed providers
      if (finalProvider) {
        const [pricingRes, specialsRes, photosRes, reviewsRes, baRes, injectorsRes] =
          await Promise.all([
            supabase
              .from('provider_pricing')
              .select('*')
              .eq('provider_id', finalProvider.id),
            supabase
              .from('specials')
              .select('*')
              .eq('provider_id', finalProvider.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false }),
            supabase
              .from('provider_photos')
              .select('*')
              .eq('provider_id', finalProvider.id)
              .order('display_order'),
            supabase
              .from('reviews')
              .select('*')
              .eq('provider_id', finalProvider.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false }),
            supabase
              .from('before_after_photos')
              .select('*, injectors(name)')
              .eq('provider_id', finalProvider.id)
              .eq('status', 'active')
              .order('display_order'),
            supabase
              .from('injectors')
              .select('*')
              .eq('provider_id', finalProvider.id)
              .eq('is_active', true),
          ]);

        setVerifiedPricing(pricingRes.data || []);
        setSpecials(specialsRes.data || []);
        setProviderPhotos(photosRes.data || []);
        setReviews(reviewsRes.data || []);
        setBaPhotos(baRes.data || []);
        setInjectors(injectorsRes.data || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [slug]);

  // 5. Auto-fetch Google Places for unclaimed providers
  useEffect(() => {
    if (loading) return;
    // Skip if provider is claimed and has fresh Google data
    if (provider?.is_claimed) return;
    if (
      provider?.google_synced_at &&
      Date.now() - new Date(provider.google_synced_at).getTime() < SEVEN_DAYS_MS
    ) {
      // Use cached Google data from provider row
      setGoogleData({
        name: provider.name,
        city: provider.city,
        state: provider.state,
        phone: provider.phone,
        website: provider.website,
        googleRating: provider.google_rating,
        googleReviewCount: provider.google_review_count,
        googleMapsUrl: provider.google_maps_url,
        hoursText: provider.hours_text,
        googlePhotos: [],
      });
      return;
    }

    // Derive search query from slug or community data
    const providerName =
      provider?.name ||
      (communityData.length > 0 ? communityData[0].provider_name : null);
    const city =
      provider?.city ||
      (communityData.length > 0 ? communityData[0].city : null);
    const state =
      provider?.state ||
      (communityData.length > 0 ? communityData[0].state : null);

    if (!providerName) {
      // Only have the slug — use display name
      const parsed = parseSlug(slug);
      if (parsed.displayName) {
        fetchGooglePlaces(parsed.displayName, null, parsed.state);
      }
      return;
    }

    fetchGooglePlaces(providerName, city, state);
  }, [loading, provider, communityData, slug]);

  async function fetchGooglePlaces(name, city, state) {
    // Wait for Google Maps to load
    if (!window.google?.maps?.places) return;

    const query = [name, city, state].filter(Boolean).join(' ');
    const mapDiv = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(mapDiv);

    service.textSearch({ query, type: 'establishment' }, (results, status) => {
      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results?.length) return;

      const topResult = results[0];
      service.getDetails(
        {
          placeId: topResult.place_id,
          fields: [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'url',
            'photos',
            'opening_hours',
            'address_components',
            'geometry',
            'place_id',
          ],
        },
        (place, detailStatus) => {
          if (detailStatus !== window.google.maps.places.PlacesServiceStatus.OK || !place) return;

          const data = extractPlaceData(place);
          setGoogleData(data);

          // Cache to providers table (best effort)
          cacheGoogleData(data);
        }
      );
    });
  }

  async function cacheGoogleData(data) {
    try {
      const row = {
        slug,
        name: data.name,
        city: data.city || undefined,
        state: data.state || undefined,
        phone: data.phone || undefined,
        website: data.website || undefined,
        lat: data.lat,
        lng: data.lng,
        google_place_id: data.placeId || undefined,
        google_rating: data.googleRating,
        google_review_count: data.googleReviewCount,
        google_maps_url: data.googleMapsUrl || undefined,
        hours_text: data.hoursText || undefined,
        google_synced_at: new Date().toISOString(),
        is_claimed: false,
      };

      // Remove undefined keys
      Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);

      if (provider?.id) {
        // Update existing
        await supabase.from('providers').update(row).eq('id', provider.id);
      } else {
        // Insert new unclaimed row
        await supabase.from('providers').insert(row);
      }
    } catch {
      // Best effort — don't break the page
    }
  }

  // Check ownership
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
      googleData?.name ||
      provider?.name ||
      (communityData.length > 0 ? communityData[0].provider_name : null) ||
      slugToDisplayName(slug);
    const city =
      googleData?.city ||
      provider?.city ||
      (communityData.length > 0 ? communityData[0].city : null);
    const state =
      googleData?.state ||
      provider?.state ||
      (communityData.length > 0 ? communityData[0].state : null);

    const location = [city, state].filter(Boolean).join(', ');
    const ratingStr =
      provider?.avg_rating && provider?.review_count
        ? ` — ${provider.avg_rating} stars (${provider.review_count} reviews)`
        : '';

    document.title = location
      ? `${name} Prices & Reviews in ${location} | GlowBuddy`
      : `${name} Prices & Reviews | GlowBuddy`;

    const content = `See real prices, reviews${ratingStr}, and verified menu for ${name}${location ? ` in ${location}` : ''}. Compare what patients paid on GlowBuddy.`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = content;
      document.head.appendChild(newMeta);
    }

    // Review schema markup
    if ((provider?.weighted_rating || provider?.avg_rating) && provider?.review_count) {
      const existingSchema = document.getElementById('gb-review-schema');
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name,
        ...(location && { address: { '@type': 'PostalAddress', addressLocality: city, addressRegion: state } }),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: provider.weighted_rating || provider.avg_rating,
          reviewCount: provider.review_count,
          bestRating: 5,
          worstRating: 1,
        },
      };
      if (existingSchema) {
        existingSchema.textContent = JSON.stringify(schema);
      } else {
        const script = document.createElement('script');
        script.id = 'gb-review-schema';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }
  }, [provider, communityData, googleData, slug]);

  function handleDisputeSubmitted() {
    supabase
      .from('procedures')
      .select('*')
      .eq('provider_slug', slug)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCommunityData(data || []));
  }

  function refreshReviews() {
    if (!provider) return;
    supabase
      .from('reviews')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []));
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

  // Resolve display values — prefer Google data, then provider row, then community data, then slug
  const providerName =
    googleData?.name ||
    provider?.name ||
    (communityData.length > 0 ? communityData[0].provider_name : null) ||
    slugToDisplayName(slug);

  const providerCity =
    googleData?.city ||
    provider?.city ||
    (communityData.length > 0 ? communityData[0].city : null);

  const providerState =
    googleData?.state ||
    provider?.state ||
    (communityData.length > 0 ? communityData[0].state : null);

  const phone = googleData?.phone || provider?.phone;
  const website = googleData?.website || provider?.website;
  const googleRating = googleData?.googleRating || provider?.google_rating;
  const googleReviewCount = googleData?.googleReviewCount || provider?.google_review_count;
  const googleMapsUrl = googleData?.googleMapsUrl || provider?.google_maps_url;
  const hoursText = googleData?.hoursText || provider?.hours_text;
  const photos = googleData?.googlePhotos || [];
  const providerLat = googleData?.lat || provider?.lat || null;
  const providerLng = googleData?.lng || provider?.lng || null;

  // Claim URL with pre-filled params
  const claimUrl =
    `/business/onboarding?name=${encodeURIComponent(providerName || '')}` +
    `&city=${encodeURIComponent(providerCity || '')}` +
    `&state=${encodeURIComponent(providerState || '')}` +
    (googleData?.placeId ? `&place_id=${encodeURIComponent(googleData.placeId)}` : '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Unclaimed Banner */}
      {!isClaimed && (
        <div
          className="mb-6 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
          style={{ background: '#FBE8EF', border: '0.5px solid #F4C0D1' }}
        >
          <div>
            <p className="font-semibold" style={{ color: '#9B2C5E', fontSize: 14 }}>
              Is this your business?
            </p>
            <p className="text-sm" style={{ color: '#C94F78' }}>
              Claim this listing to manage your profile, respond to reviews, and publish your prices.
            </p>
            {competitorCount > 0 && (
              <p
                className="text-xs font-medium mt-2 pt-2"
                style={{ color: '#92400E', borderTop: '0.5px solid #F4C0D1' }}
              >
                &#9888;&#65039; {competitorCount} verified competitor{' '}
                {competitorCount === 1 ? 'practice is' : 'practices are'} appearing on
                your page.
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <Link
              to={claimUrl}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
              style={{ background: '#C94F78' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#A83D62')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#C94F78')}
            >
              Claim This Listing &rarr;
            </Link>
            <p className="mt-1.5" style={{ fontSize: 11, color: '#9B2C5E' }}>
              {competitorCount > 0
                ? 'Claim free to remove competitor ads'
                : 'Free forever \u00b7 Takes 2 minutes'}
            </p>
          </div>
        </div>
      )}

      {/* Google Photos Carousel */}
      {photos.length > 0 && (
        <div className="mb-6">
          <div
            ref={carouselRef}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
              if (e.key === 'ArrowRight') setPhotoIndex((i) => (i + 1) % photos.length);
            }}
            className="relative rounded-xl overflow-hidden h-48 sm:h-64 bg-gray-100 outline-none"
          >
            <img
              src={photos[photoIndex].displayUrl}
              alt={`${providerName} photo ${photoIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {photoIndex + 1} / {photos.length}
                </div>
              </>
            )}
            {photos[photoIndex].attribution && (
              <div
                className="absolute bottom-2 left-2 text-[10px] text-white/70"
                dangerouslySetInnerHTML={{ __html: photos[photoIndex].attribution }}
              />
            )}
          </div>
          <p className="text-[10px] text-gray-400 text-right pr-2 mt-1">
            Powered by Google
          </p>
        </div>
      )}

      {/* Provider Header */}
      <div className="glow-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {photos.length === 0 && <ProviderAvatar name={providerName} size={64} />}
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {providerName}
              </h1>

              {(providerCity || providerState) && (
                <p className="flex items-center gap-1 text-text-secondary mb-3">
                  <MapPin size={14} />
                  {[providerCity, providerState].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {provider?.provider_type && (
                  <span className="inline-block bg-rose-light text-rose-dark px-3 py-1 text-xs font-medium rounded-full">
                    {provider.provider_type}
                  </span>
                )}
                {provider?.is_verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-verified bg-verified/10 px-3 py-1 rounded-full">
                    <CheckCircle size={14} />
                    Verified Provider
                  </span>
                )}
              </div>

              {/* GlowBuddy Rating */}
              {(provider?.weighted_rating || provider?.avg_rating) && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <StarRating
                      value={Math.round(provider.weighted_rating || provider.avg_rating)}
                      readOnly
                      size={14}
                    />
                    <span className="font-medium text-text-primary">
                      {provider.weighted_rating || provider.avg_rating}
                    </span>
                    <span className="text-text-secondary/70">weighted</span>
                    {provider.review_count > 0 && (
                      <span>
                        &middot; {provider.review_count} review
                        {provider.review_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {provider.review_count > 0 && (
                    <p className="text-xs text-text-secondary mt-0.5 hidden sm:block">
                      {provider.verified_review_count > 0 &&
                        `${provider.verified_review_count} verified`}
                      {provider.verified_review_count > 0 && provider.photo_review_count > 0 &&
                        ' \u00b7 '}
                      {provider.photo_review_count > 0 &&
                        `${provider.photo_review_count} with photos`}
                      {(provider.verified_review_count > 0 || provider.photo_review_count > 0) &&
                        provider.unverified_review_count > 0 &&
                        ' \u00b7 '}
                      {provider.unverified_review_count > 0 &&
                        `${provider.unverified_review_count} unverified`}
                    </p>
                  )}
                  {provider?.verified_review_count > 0 && (
                    <p className="text-xs text-text-secondary mt-0.5 sm:hidden">
                      {provider.verified_review_count} &#10003; verified
                    </p>
                  )}
                </div>
              )}

              {/* Google Rating */}
              {googleRating && (
                <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-2">
                  <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                  <span className="font-medium text-text-primary">
                    {Number(googleRating).toFixed(1)}
                  </span>
                  {googleReviewCount && (
                    <span>
                      &middot; {googleReviewCount.toLocaleString()} Google reviews
                    </span>
                  )}
                  {googleMapsUrl && (
                    <>
                      <span>&middot;</span>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-accent hover:text-rose-dark transition inline-flex items-center gap-0.5"
                      >
                        View on Google Maps
                        <ExternalLink size={12} />
                      </a>
                    </>
                  )}
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
                  <div className="mt-2">
                    {/* Mobile: collapsed by default */}
                    <div className="md:hidden">
                      <button
                        onClick={() => setHoursExpanded(!hoursExpanded)}
                        className="flex items-center gap-1.5 text-[13px] text-text-secondary"
                      >
                        <Clock size={12} className="shrink-0" />
                        {todayRow && (
                          <>
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                              style={{ background: isOpenNow ? '#10B981' : '#9CA3AF' }}
                            />
                            <span className="font-medium text-text-primary">
                              {todayRow.hours}
                            </span>
                          </>
                        )}
                        <span className="text-text-secondary">
                          {hoursExpanded ? 'Hide hours' : 'See all hours'}
                        </span>
                        {hoursExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {hoursExpanded && (
                        <div className="mt-2 ml-5 grid grid-cols-[40px_1fr] gap-y-1 text-[13px]">
                          {rows.map((r) => [
                            <span
                              key={`${r.day}-label`}
                              className="text-text-secondary flex items-center gap-1"
                              style={r.isToday ? { fontWeight: 500 } : undefined}
                            >
                              {r.isToday && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full"
                                  style={{ background: isClosed(r.hours) ? '#9CA3AF' : '#10B981' }}
                                />
                              )}
                              {r.abbrev}
                            </span>,
                            <span
                              key={`${r.day}-hours`}
                              style={
                                isClosed(r.hours)
                                  ? { color: '#9CA3AF' }
                                  : r.isToday
                                    ? { fontWeight: 500, color: 'var(--color-text-primary)' }
                                    : { color: 'var(--color-text-primary)' }
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
                      <div className="flex items-center gap-1.5 text-[13px] text-text-secondary mb-2">
                        <Clock size={12} className="shrink-0" />
                        <span>Hours</span>
                      </div>
                      <div className="ml-5 grid grid-cols-[40px_1fr] gap-y-1 text-[13px]">
                        {rows.map((r) => [
                          <span
                            key={`${r.day}-label`}
                            className="text-text-secondary flex items-center gap-1"
                            style={r.isToday ? { fontWeight: 500 } : undefined}
                          >
                            {r.isToday && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full"
                                style={{ background: isClosed(r.hours) ? '#9CA3AF' : '#10B981' }}
                              />
                            )}
                            {r.abbrev}
                          </span>,
                          <span
                            key={`${r.day}-hours`}
                            style={
                              isClosed(r.hours)
                                ? { color: '#9CA3AF' }
                                : r.isToday
                                  ? { fontWeight: 500, color: 'var(--color-text-primary)' }
                                  : { color: 'var(--color-text-primary)' }
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
          <div className="flex flex-wrap items-center gap-3">
            {isClaimed && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-dark transition"
              >
                <Star size={14} />
                Write a Review
              </button>
            )}

            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={14} />
                Website
              </a>
            )}
            {provider?.instagram && (
              <a
                href={`https://instagram.com/${provider.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Globe size={14} />
                Instagram
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Phone size={14} />
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* What Patients Paid — always show when community data exists */}
      {communityData.length > 0 && !isClaimed && (
        <div className="glow-card p-6 mb-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">
            What Patients Paid
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(
              communityData.reduce((acc, p) => {
                const type = p.procedure_type || 'Other';
                if (!acc[type]) acc[type] = [];
                acc[type].push(Number(p.price_paid));
                return acc;
              }, {})
            ).map(([type, prices]) => {
              const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 rounded-lg bg-warm-gray"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{type}</p>
                    <p className="text-xs text-text-secondary">
                      {prices.length} {prices.length === 1 ? 'price' : 'prices'}
                      {prices.length > 1 && ` · $${min}–$${max}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <p className="text-lg font-bold text-text-primary">${avg}</p>
                      <FairPriceBadge
                        price={avg}
                        procedureType={type}
                        state={providerState}
                        city={providerCity}
                      />
                    </div>
                    <p className="text-xs text-text-secondary">avg</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Provider Prices — unclaimed only */}
      {!isClaimed && (
        <div className="glow-card p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
            <Lock size={28} className="text-gray-400 mb-2" />
            <p className="text-sm font-semibold text-text-primary mb-1">
              Provider&rsquo;s Listed Prices
            </p>
            <p className="text-xs text-text-secondary mb-3 text-center max-w-xs">
              Claim this listing to publish your official price menu and attract new patients.
            </p>
            <Link
              to={claimUrl}
              className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-dark transition"
            >
              Claim & Add Prices &rarr;
            </Link>
          </div>
          {/* Placeholder rows behind the blur */}
          <div className="opacity-40 pointer-events-none" aria-hidden="true">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              Provider&rsquo;s Menu
            </h2>
            {['Botox / Dysport', 'Lip Filler', 'RF Microneedling'].map((name) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 mb-2 rounded-lg bg-warm-gray"
              >
                <span className="text-sm text-text-primary">{name}</span>
                <span className="text-sm font-bold text-text-primary">$---</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Ads — unclaimed only, after What Patients Paid */}
      {!isClaimed && (providerCity || providerState) && (
        <CompetitorAds
          providerSlug={slug}
          providerId={provider?.id}
          lat={providerLat}
          lng={providerLng}
          city={providerCity}
          state={providerState}
          procedureTypes={[
            ...new Set(communityData.map((p) => p.procedure_type).filter(Boolean)),
          ]}
          claimUrl={claimUrl}
          onCompetitorsLoaded={setCompetitorCount}
        />
      )}

      {/* Tab Navigation — full tabs for claimed, simplified for unclaimed */}
      {isClaimed && (
        <>
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6 -mb-px overflow-x-auto">
              {PROFILE_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-b-2 border-rose-accent text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                  {tab === 'Reviews' && reviews.length > 0 && (
                    <span className="ml-1.5 text-xs text-text-secondary">
                      ({reviews.length})
                    </span>
                  )}
                  {tab === 'Before & Afters' && baPhotos.length > 0 && (
                    <span className="ml-1.5 text-xs text-text-secondary">
                      ({baPhotos.length})
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'Overview' && (
            <OverviewTab
              provider={provider}
              providerPhotos={providerPhotos}
              specials={specials}
              injectors={injectors}
              reviews={reviews}
              baPhotos={baPhotos}
              communityData={communityData}
              verifiedPricing={verifiedPricing}
              isProviderOwner={isProviderOwner}
              user={user}
              onDisputeTarget={setDisputeTarget}
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === 'Before & Afters' && (
            <BeforeAfterTab
              photos={baPhotos}
              injectors={injectors}
              provider={provider}
              isProviderOwner={isProviderOwner}
            />
          )}

          {activeTab === 'Reviews' && (
            <ReviewsTab
              reviews={reviews}
              provider={provider}
              onReviewSubmitted={refreshReviews}
            />
          )}

          {activeTab === 'Prices' && (
            <PricesTab
              verifiedPricing={verifiedPricing}
              communityData={communityData}
              provider={provider}
              user={user}
              isProviderOwner={isProviderOwner}
              onDisputeTarget={setDisputeTarget}
            />
          )}
        </>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-4 mt-8">
        <Link
          to="/log"
          className="inline-flex items-center gap-2 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
        >
          <Plus size={18} />
          Add a price for this provider
        </Link>
        <PriceAlertButton
          procedureType={communityData.length > 0 ? communityData[0].procedure_type : undefined}
          city={providerCity}
          state={providerState}
        />
        {website && (
          <a
            href={website}
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
  );
}
