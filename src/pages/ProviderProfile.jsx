import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buildBrowseUrl } from '../lib/urlParams';
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
  ChevronDown,
  ChevronUp,
  Heart,
  Sparkles,
  ShieldCheck,
  Camera,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { VALID_STATE_CODES } from '../lib/constants';
import { setPageMeta } from '../lib/seo';
import { providerSlugFromParts, slugToDisplayName } from '../lib/slugify';
import { extractPlaceData } from '../lib/places';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
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
import CallNowButton from '../components/CallNowButton';
import VagaroBookButton from '../components/VagaroBookButton';
import VagaroWidget from '../components/VagaroWidget';
import PioneerCredit from '../components/PioneerCredit';
import { getGuideUrl } from '../lib/guideMapping';
import { getProcedureLabel } from '../lib/procedureLabel';
import useSavedProviders from '../hooks/useSavedProviders';

import { SkeletonGrid } from '../components/SkeletonCard';

const PROFILE_TABS = ['Overview', 'Before & Afters', 'Reviews', 'Prices'];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function ProviderProfile() {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);

  const [provider, setProvider] = useState(null);
  const [communityData, setCommunityData] = useState([]);
  const [verifiedPricing, setVerifiedPricing] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [vagaroIntegration, setVagaroIntegration] = useState(null);
  const [providerPhotos, setProviderPhotos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [baPhotos, setBaPhotos] = useState([]);
  const [injectors, setInjectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProviderOwner, setIsProviderOwner] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const { isSaved, saveProvider, unsaveProvider } = useSavedProviders();

  const [googleData, setGoogleData] = useState(null);
  const [competitorCount, setCompetitorCount] = useState(0);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [pageViews, setPageViews] = useState(0);
  const carouselRef = useRef(null);

  const isClaimed = provider?.is_claimed === true;
  const isPageOwner = !!user && provider?.owner_user_id === user?.id;
  const isAdmin = user?.user_metadata?.user_role === 'admin';

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
        .select('id, name, slug, city, state, zip, address, phone, website, lat, lng, google_place_id, google_rating, google_review_count, google_maps_url, google_synced_at, hours_text, is_claimed, is_verified, is_active, owner_user_id, provider_type, instagram, first_timer_friendly, first_timer_special, glow_rewards_enabled, avg_rating, weighted_rating, review_count, verified_review_count, photo_review_count, unverified_review_count, photo_reference, procedure_tags')
        .eq('slug', slug)
        .single();

      // 2. Try procedures by provider_slug (claimed providers)
      const { data: community } = await supabase
        .from('procedures')
        .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, trust_tier, provider_slug')
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
            .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, trust_tier, provider_slug')
            .eq('state', state)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(100);

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
              .select('id, provider_id, procedure_type, brand, price, units_or_volume, treatment_area, price_label, notes, source, verified, source_url, scraped_at, created_at')
              .eq('provider_id', finalProvider.id)
              .eq('display_suppressed', false),
            supabase
              .from('specials')
              .select('id, provider_id, title, description, procedure_type, discount_type, discount_value, original_price, is_active, expires_at, created_at')
              .eq('provider_id', finalProvider.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false }),
            supabase
              .from('provider_photos')
              .select('id, provider_id, url, caption, display_order')
              .eq('provider_id', finalProvider.id)
              .order('display_order'),
            supabase
              .from('reviews')
              .select('id, provider_id, user_id, rating, body, procedure_type, is_verified, photo_url, trust_tier, status, created_at')
              .eq('provider_id', finalProvider.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false }),
            supabase
              .from('before_after_photos')
              .select('id, provider_id, injector_id, before_url, after_url, procedure_type, notes, display_order, status, injectors(name)')
              .eq('provider_id', finalProvider.id)
              .eq('status', 'active')
              .order('display_order'),
            supabase
              .from('injectors')
              .select('id, provider_id, name, display_name, slug, title, bio, photo_url, city, avg_rating, is_active')
              .eq('provider_id', finalProvider.id)
              .eq('is_active', true),
          ]);

        setVerifiedPricing(pricingRes.data || []);
        setSpecials(specialsRes.data || []);
        setProviderPhotos(photosRes.data || []);
        setReviews(reviewsRes.data || []);
        setBaPhotos(baRes.data || []);
        setInjectors(injectorsRes.data || []);

        // Fetch Vagaro integration (non-blocking)
        supabase
          .from('provider_integrations')
          .select('vagaro_widget_url, widget_embed_enabled, connection_status')
          .eq('provider_id', finalProvider.id)
          .eq('connection_status', 'active')
          .maybeSingle()
          .then(({ data: intData }) => {
            if (intData) setVagaroIntegration(intData);
          });
      }

      setLoading(false);
    }

    fetchData();
  }, [slug]);

  // Track page view for analytics
  useEffect(() => {
    if (loading || !provider?.id) return;
    supabase
      .from('custom_events')
      .insert({
        event_name: 'provider_page_view',
        properties: {
          provider_id: provider.id,
          provider_slug: slug,
          is_claimed: provider.is_claimed || false,
        },
      })
      .then(() => {});
  }, [loading, provider?.id, slug]);

  // Fetch page views this week (for unclaimed banner)
  useEffect(() => {
    if (loading || isClaimed) return;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('custom_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', 'provider_page_view')
      .contains('properties', { provider_slug: slug })
      .gte('created_at', oneWeekAgo)
      .then(({ count }) => setPageViews(count || 0));
  }, [loading, isClaimed, slug]);

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
    // Load Google Maps if not already loaded
    if (!window.google?.maps?.places) {
      try {
        await loadGoogleMaps();
        // Wait a tick for places library to init
        await new Promise((r) => setTimeout(r, 100));
      } catch { return; }
    }
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
  }, [user?.id]);

  // Check provider follow status
  useEffect(() => {
    if (!user || !slug) { setIsFollowing(false); setFollowId(null); return; }
    supabase
      .from('provider_follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider_slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setIsFollowing(!!data);
        setFollowId(data?.id || null);
      });
  }, [user?.id, slug]);

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

    const title = location
      ? `${name} Prices & Reviews in ${location} | GlowBuddy`
      : `${name} Prices & Reviews | GlowBuddy`;

    const submissionCount = communityData.length;
    const verifiedCount = communityData.filter(p => p.receipt_verified).length;
    const countStr = submissionCount > 0
      ? `${submissionCount} submission${submissionCount !== 1 ? 's' : ''}${verifiedCount > 0 ? `, ${verifiedCount} verified receipt${verifiedCount !== 1 ? 's' : ''}` : ''}.`
      : '';
    const content = `See what patients paid at ${name}${location ? ` in ${location}` : ''}. ${countStr} Real prices, not starting-at guesses.`;

    setPageMeta({
      title,
      description: content,
      canonical: `https://glowbuddy.com/provider/${slug}`,
    });

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
      .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, trust_tier, provider_slug')
      .eq('provider_slug', slug)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCommunityData(data || []));
  }

  async function handleFollowProvider() {
    if (isFollowing && followId) {
      await supabase.from('provider_follows').delete().eq('id', followId);
      setIsFollowing(false);
      setFollowId(null);
    } else if (user) {
      const { data } = await supabase
        .from('provider_follows')
        .insert({ user_id: user.id, provider_slug: slug })
        .select('id')
        .single();
      if (data) {
        setIsFollowing(true);
        setFollowId(data.id);
      }
    }
  }

  function refreshReviews() {
    if (!provider) return;
    supabase
      .from('reviews')
      .select('id, provider_id, user_id, rating, body, procedure_type, is_verified, photo_url, trust_tier, status, created_at')
      .eq('provider_id', provider.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []));
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SkeletonGrid count={3} />
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

  // Computed stats for unclaimed banner
  const avgPrice = communityData.length > 0
    ? Math.round(communityData.reduce((sum, p) => sum + Number(p.price_paid), 0) / communityData.length)
    : null;

  // Combine all photos: provider uploads + Google
  const allPhotos = [
    ...(providerPhotos || []).map((p) => ({ url: p.url, source: 'provider' })),
    ...(photos || []).map((p) => ({ url: p.displayUrl, source: 'google', attribution: p.attribution })),
  ].slice(0, 5);
  const hasGooglePhotos = allPhotos.some((p) => p.source === 'google');

  // Claim URL with pre-filled params
  const claimUrl =
    `/business/onboarding?name=${encodeURIComponent(providerName || '')}` +
    `&city=${encodeURIComponent(providerCity || '')}` +
    `&state=${encodeURIComponent(providerState || '')}` +
    (googleData?.placeId ? `&place_id=${encodeURIComponent(googleData.placeId)}` : '');

  // Back-to-results link — carries the provider's city through to /browse
  // so the user lands back on their city's results, and FindPrices will
  // also rehydrate any prior filters from sessionStorage.
  const backToBrowseHref = buildBrowseUrl({
    city: providerCity || undefined,
    state: providerState || undefined,
  });

  return (
    <div className="bg-cream min-h-screen page-enter">
      {/* 1. Provider Header — editorial white masthead */}
      <div className="bg-white" style={{ borderBottom: '3px solid #E8347A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          {/* Back to /browse — preserves city and any persisted filters */}
          <Link
            to={backToBrowseHref}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-text-secondary hover:text-hot-pink mb-6 transition-colors"
            style={{ letterSpacing: '0.10em' }}
          >
            <ChevronUp size={12} className="rotate-[-90deg]" />
            {providerCity ? `Back to ${providerCity} prices` : 'Back to all prices'}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5 min-w-0 flex-1">
              <ProviderAvatar name={providerName} size={72} />
              <div className="min-w-0 flex-1">
                {/* Kicker — location */}
                {(providerCity || providerState) && (
                  <p
                    className="text-[10px] font-semibold uppercase mb-3 text-hot-pink"
                    style={{ letterSpacing: '0.18em' }}
                  >
                    {[providerCity, providerState].filter(Boolean).join(' / ')}
                  </p>
                )}

                {/* Name — Playfair Display 900 */}
                <h1
                  className="font-display text-ink mb-3"
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
                      className="inline-flex items-center text-[10px] font-semibold uppercase px-2 py-0.5 text-hot-pink"
                      style={{
                        letterSpacing: '0.08em',
                        borderRadius: '4px',
                        border: '1px solid #E8347A',
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
                        background: '#F0FAF5',
                        color: '#1A7A3A',
                        border: '1px solid #1A7A3A',
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
                        background: '#FFF0F6',
                        color: '#C8005A',
                        border: '1px solid #E8347A',
                      }}
                    >
                      <Heart size={10} />
                      Welcomes First-Timers
                    </span>
                  )}
                </div>

                {/* Ratings + location meta */}
                <div className="flex flex-wrap items-center gap-4 text-[12px] text-text-secondary mb-3">
                  {(providerCity || providerState) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {[providerCity, providerState].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {googleRating && (
                    <span className="flex items-center gap-1">
                      <Star size={12} style={{ color: '#E8347A', fill: '#E8347A' }} />
                      <span className="font-medium text-ink">
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
                  <p className="text-[11px] text-text-secondary font-light mb-2">
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
                  <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                    <StarRating
                      value={Math.round(provider.weighted_rating || provider.avg_rating)}
                      readOnly
                      size={12}
                    />
                    <span className="font-medium text-ink">
                      {provider.weighted_rating || provider.avg_rating}
                    </span>
                    <span className="text-text-secondary">weighted</span>
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
                    className="text-[11px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition inline-flex items-center gap-1"
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
                        className="flex items-center gap-1.5 text-[11px] text-text-secondary"
                      >
                        <Clock size={11} className="shrink-0" />
                        {todayRow && (
                          <>
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                              style={{ background: isOpenNow ? '#1A7A3A' : '#999' }}
                            />
                            <span className="font-medium text-ink">
                              {todayRow.hours}
                            </span>
                          </>
                        )}
                        <span className="text-text-secondary uppercase" style={{ letterSpacing: '0.06em' }}>
                          {hoursExpanded ? 'Hide hours' : 'See all hours'}
                        </span>
                        {hoursExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                      {hoursExpanded && (
                        <div className="mt-2 ml-5 grid grid-cols-[40px_1fr] gap-y-1 text-[11px]">
                          {rows.map((r) => [
                            <span
                              key={`${r.day}-label`}
                              className="text-text-secondary flex items-center gap-1"
                              style={r.isToday ? { fontWeight: 500 } : undefined}
                            >
                              {r.isToday && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full"
                                  style={{ background: isClosed(r.hours) ? '#999' : '#1A7A3A' }}
                                />
                              )}
                              {r.abbrev}
                            </span>,
                            <span
                              key={`${r.day}-hours`}
                              style={
                                isClosed(r.hours)
                                  ? { color: '#999' }
                                  : r.isToday
                                    ? { fontWeight: 500, color: '#111' }
                                    : { color: '#666' }
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
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-text-secondary mb-2" style={{ letterSpacing: '0.08em' }}>
                        <Clock size={11} className="shrink-0" />
                        <span>Hours</span>
                      </div>
                      <div className="ml-5 grid grid-cols-[40px_1fr] gap-y-1 text-[11px]">
                        {rows.map((r) => [
                          <span
                            key={`${r.day}-label`}
                            className="text-text-secondary flex items-center gap-1"
                            style={r.isToday ? { fontWeight: 500 } : undefined}
                          >
                            {r.isToday && (
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full"
                                style={{ background: isClosed(r.hours) ? '#999' : '#1A7A3A' }}
                              />
                            )}
                            {r.abbrev}
                          </span>,
                          <span
                            key={`${r.day}-hours`}
                            style={
                              isClosed(r.hours)
                                ? { color: '#999' }
                                : r.isToday
                                  ? { fontWeight: 500, color: '#111' }
                                  : { color: '#666' }
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
                  className="btn-editorial btn-editorial-secondary"
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
                  className="btn-editorial btn-editorial-secondary"
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
          <p className="text-sm text-text-secondary mb-4">
            Real prices shared by patients &middot; Not advertised rates
          </p>
          {(() => {
            const receiptCount = communityData.filter(p => p.receipt_verified).length;
            const photoCount = communityData.filter(p => p.result_photo_url).length;
            return (receiptCount > 0 || photoCount > 0) && (
              <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                {receiptCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={14} className="text-verified" />
                    {receiptCount} receipt-verified
                  </span>
                )}
                {photoCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Camera size={14} />
                    {photoCount} with photos
                  </span>
                )}
              </div>
            );
          })()}
          <PioneerCredit providerSlug={slug} />
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
              // Group key is the raw procedure_type ("Botox / Dysport /
              // Xeomin"). Display label collapses combined strings down
              // to a clean category name.
              const displayLabel = getProcedureLabel(type, null);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 rounded-lg bg-warm-gray"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{displayLabel}</p>
                    <p className="text-xs text-text-secondary">
                      {prices.length} {prices.length === 1 ? 'price' : 'prices'}
                      {prices.length > 1 && ` · $${min}–$${max}`}
                      {getGuideUrl(type) && (
                        <>
                          {' · '}
                          <Link
                            to={getGuideUrl(type)}
                            className="text-[#0369A1] hover:text-sky-800 font-medium transition-colors"
                          >
                            What is {displayLabel}? &rarr;
                          </Link>
                        </>
                      )}
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

      {/* 3. Empty State — no submissions yet (unclaimed) */}
      {communityData.length === 0 && !isClaimed && (
        <div className="glow-card p-6 mb-6 text-center border border-dashed border-rose-accent/30">
          <p className="text-lg font-semibold text-text-primary mb-1">
            0 prices shared at {providerName} yet.
          </p>
          <p className="text-sm text-text-secondary mb-4">
            Had a treatment here? You&apos;d be the first to share what you paid.
          </p>
          <p className="text-xs font-medium mb-4" style={{ color: '#B45309' }}>
            First to share = Pioneer badge + bonus entries
          </p>
          <Link
            to={`/log?provider_id=${provider?.id || ''}&provider=${encodeURIComponent(providerName || '')}&city=${encodeURIComponent(providerCity || '')}&state=${encodeURIComponent(providerState || '')}&place_id=${encodeURIComponent(provider?.google_place_id || '')}&slug=${encodeURIComponent(slug)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            <Plus size={18} />
            + Share what I paid here
          </Link>
        </div>
      )}

      {/* 5. Competitor Ads — unclaimed, mid-page placement */}
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

      {/* 6. Unclaimed — Manage listing (page owner) */}
      {!isClaimed && isPageOwner && (
        <div className="mb-6 glow-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">You own this listing</p>
            <p className="text-xs text-text-secondary mt-0.5">Manage your profile, pricing, and specials</p>
          </div>
          <Link
            to="/business/dashboard"
            className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-dark transition shrink-0"
          >
            Manage your listing &rarr;
          </Link>
        </div>
      )}

      {/* 6b. Unclaimed — Patient actions (logged-in regular user) */}
      {!isClaimed && user && !isPageOwner && !isProviderOwner && !isAdmin && (
        <div className="mb-6 glow-card p-5">
          <p className="text-sm font-medium text-text-primary mb-3">Been here? Help others decide.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/log?provider_id=${provider?.id || ''}&provider=${encodeURIComponent(providerName || '')}&city=${encodeURIComponent(providerCity || '')}&state=${encodeURIComponent(providerState || '')}&slug=${encodeURIComponent(slug)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-accent text-white text-sm font-semibold rounded-xl hover:bg-rose-dark transition-colors"
            >
              <Plus size={16} />
              Add a price
            </Link>
            <PriceAlertButton
              procedureType={communityData.length > 0 ? communityData[0].procedure_type : undefined}
              city={providerCity}
              state={providerState}
            />
            <button
              onClick={handleFollowProvider}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                isFollowing
                  ? 'border-2 border-rose-accent text-rose-accent hover:bg-rose-light'
                  : 'border border-gray-200 text-text-primary hover:bg-gray-50'
              }`}
            >
              <Heart size={14} className={isFollowing ? 'fill-rose-accent text-rose-accent' : ''} />
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={() => isSaved(slug) ? unsaveProvider(slug) : saveProvider(slug, provider?.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                isSaved(slug)
                  ? 'border-2 border-rose-accent text-rose-accent hover:bg-rose-light'
                  : 'border border-gray-200 text-text-primary hover:bg-gray-50'
              }`}
            >
              <Bookmark size={14} className={isSaved(slug) ? 'fill-rose-accent text-rose-accent' : ''} />
              {isSaved(slug) ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* 6c. Unclaimed Banner — claim CTA (not logged in, business owners, admins) */}
      {!isClaimed && !isPageOwner && (!user || isProviderOwner || isAdmin) && (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          {/* Part 1: What's happening — live stats */}
          {(pageViews > 0 || communityData.length > 0) && (
            <div className="p-5" style={{ background: '#F9FAFB' }}>
              <div className="flex flex-wrap gap-8">
                {pageViews > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{pageViews.toLocaleString()}</p>
                    <p className="text-xs text-text-secondary">viewed this page this week</p>
                  </div>
                )}
                {communityData.length > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{communityData.length}</p>
                    <p className="text-xs text-text-secondary">patients shared prices here</p>
                  </div>
                )}
                {avgPrice && (
                  <div>
                    <p className="text-2xl font-bold text-text-primary">${avgPrice.toLocaleString()}</p>
                    <p className="text-xs text-text-secondary">average reported</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Part 2: What they're missing */}
          <div className="p-5">
            <p className="font-semibold text-text-primary text-[15px] mb-3">Claim your free listing to:</p>
            <ul className="space-y-2 text-sm text-text-secondary mb-5">
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-verified mt-0.5 shrink-0" />
                Remove competitor ads from this page
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-verified mt-0.5 shrink-0" />
                Add your official price menu
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-verified mt-0.5 shrink-0" />
                Respond to patient submissions
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={15} className="text-verified mt-0.5 shrink-0" />
                Post specials and promotions
              </li>
            </ul>

            <Link
              to={claimUrl}
              className="block w-full sm:w-auto sm:inline-flex items-center justify-center gap-1.5 text-center text-white px-6 py-3 rounded-xl text-sm font-semibold transition"
              style={{ background: '#C94F78' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#A83D62')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#C94F78')}
            >
              Claim This Listing &mdash; It&rsquo;s Free
            </Link>
            <p className="text-xs text-text-secondary mt-2 sm:text-left text-center">
              Takes 2 minutes. Free forever.
            </p>
          </div>
        </div>
      )}

      {/* 7. Photo Carousel — visual proof */}
      {allPhotos.length > 0 ? (
        <div className="mb-6">
          <div
            ref={carouselRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory rounded-xl"
          >
            {allPhotos.map((photo, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[85%] sm:w-auto sm:flex-1 h-48 sm:h-64 rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={photo.url}
                  alt={`${providerName} photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          {hasGooglePhotos && (
            <p className="text-[10px] text-gray-400 text-right pr-2 mt-1">
              Photos via Google
            </p>
          )}
        </div>
      ) : (
        <div
          className="mb-6 rounded-xl h-48 sm:h-64 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FBF0EC, #FFF0F3)' }}
        >
          <span className="text-5xl font-bold text-rose-accent/30">
            {(providerName || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* 8. Locked Provider Prices — unclaimed only */}
      {!isClaimed && (
        <div className="glow-card p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
            <Lock size={28} className="text-gray-400 mb-2" />
            <p className="text-sm font-semibold text-text-primary mb-1">
              Official prices from {providerName}
            </p>
            <p className="text-xs text-text-secondary mb-3 text-center max-w-xs">
              Claim your free listing to publish your price menu and attract new patients.
            </p>
            <Link
              to={claimUrl}
              className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-dark transition"
            >
              Claim &amp; Add Prices &rarr;
            </Link>
          </div>
          {/* Placeholder rows behind the blur */}
          <div className="opacity-40 pointer-events-none" aria-hidden="true">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              Published by {providerName}
            </h2>
            {['Botox', 'Lip Filler', 'RF Microneedling'].map((name) => (
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

      {/* 9. First-Timer Special */}
      {provider?.first_timer_special && (
        <div className="glow-card p-5 mb-6 border border-sky-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#0369A1]" />
            <h3 className="text-sm font-semibold text-[#0369A1]">First-Timer Special</h3>
          </div>
          <p className="text-sm text-text-primary">{provider.first_timer_special}</p>
        </div>
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
            <>
              <PricesTab
                verifiedPricing={verifiedPricing}
                communityData={communityData}
                provider={provider}
                user={user}
                isProviderOwner={isProviderOwner}
                onDisputeTarget={setDisputeTarget}
                cityState={{ city: providerCity, state: providerState }}
              />
              {vagaroIntegration?.widget_embed_enabled && vagaroIntegration?.vagaro_widget_url && (
                <VagaroWidget
                  widgetUrl={vagaroIntegration.vagaro_widget_url}
                  providerName={provider?.name}
                />
              )}
            </>
          )}
        </>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-4 mt-8">
        <Link
          to={`/log?provider_id=${provider?.id || ''}&provider=${encodeURIComponent(providerName || '')}&city=${encodeURIComponent(providerCity || '')}&state=${encodeURIComponent(providerState || '')}&place_id=${encodeURIComponent(provider?.google_place_id || '')}&slug=${encodeURIComponent(slug)}`}
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
    </div>
  );
}
