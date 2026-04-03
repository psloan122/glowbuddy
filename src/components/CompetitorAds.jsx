import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProviderAvatar from './ProviderAvatar';

const GRADIENTS = [
  'from-rose-light to-rose-accent/30',
  'from-purple-100 to-purple-300/30',
  'from-amber-100 to-amber-300/30',
  'from-emerald-100 to-emerald-300/30',
  'from-sky-100 to-sky-300/30',
];

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(miles, city, state) {
  if (miles < 1) return `${miles.toFixed(1)} mi away`;
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  if (miles < 25) return `${Math.round(miles)} mi away`;
  if (miles < 50) return `${Math.round(miles)} mi away \u00b7 ${city}`;
  return [city, state].filter(Boolean).join(', ');
}

export default function CompetitorAds({
  providerSlug,
  providerId,
  lat,
  lng,
  city,
  state,
  procedureTypes,
  claimUrl,
  onCompetitorsLoaded,
}) {
  const [competitors, setCompetitors] = useState([]);

  useEffect(() => {
    if (!state || procedureTypes.length === 0) return;
    fetchCompetitors();
  }, [lat, lng, city, state, JSON.stringify(procedureTypes)]);

  async function fetchCompetitors() {
    let results = [];

    // Try proximity-based if we have coordinates
    if (lat && lng) {
      results = await queryByProximity(25);
      if (results.length < 2) {
        results = await queryByProximity(50);
      }
    }

    // Fallback: same state, no radius
    if (results.length < 2) {
      const existing = new Set(results.map((r) => r.slug));
      const stateResults = await queryByState();
      const extras = stateResults.filter((r) => !existing.has(r.slug));
      results = [...results, ...extras];
    }

    // Max 4
    results = results.slice(0, 4);

    // Drop 4th if it's > 40 miles away
    if (results.length === 4 && results[3].distanceMiles > 40) {
      results = results.slice(0, 3);
    }

    setCompetitors(results);
    onCompetitorsLoaded?.(results.length);

    if (results.length > 0) {
      const eventData = {
        unclaimed_slug: providerSlug,
        competitor_count: results.length,
        closest_miles: results[0]?.distanceMiles
          ? Number(results[0].distanceMiles.toFixed(1))
          : null,
        city,
      };

      window.dispatchEvent(
        new CustomEvent('competitor_section_shown', { detail: eventData })
      );

      supabase
        .from('custom_events')
        .insert({ event_name: 'competitor_section_shown', properties: eventData })
        .then(() => {});
    }
  }

  async function queryByProximity(radiusMiles) {
    const latDelta = radiusMiles / 69;
    const lngDelta = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));

    let query = supabase
      .from('providers')
      .select(
        `id, name, slug, city, state, lat, lng,
         weighted_rating, review_count, verified_review_count,
         is_claimed, logo_url, tagline, provider_type,
         google_rating, google_review_count`
      )
      .eq('is_claimed', true)
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(20);

    if (providerId) query = query.neq('id', providerId);

    const { data: providers } = await query;
    if (!providers || providers.length === 0) return [];

    return await enrichAndSort(providers, radiusMiles);
  }

  async function queryByState() {
    let query = supabase
      .from('providers')
      .select(
        `id, name, slug, city, state, lat, lng,
         weighted_rating, review_count, verified_review_count,
         is_claimed, logo_url, tagline, provider_type,
         google_rating, google_review_count`
      )
      .eq('state', state)
      .eq('is_claimed', true)
      .order('weighted_rating', { ascending: false })
      .limit(10);

    if (providerId) query = query.neq('id', providerId);

    const { data: providers } = await query;
    if (!providers || providers.length === 0) return [];

    return await enrichAndSort(providers, null);
  }

  async function enrichAndSort(providers, radiusMiles) {
    const slugs = providers.map((p) => p.slug).filter(Boolean);
    if (slugs.length === 0) return [];

    // Fetch procedures + photos in parallel
    const [procRes, photoRes] = await Promise.all([
      supabase
        .from('procedures')
        .select('provider_slug, procedure_type, price_paid, trust_tier')
        .in('provider_slug', slugs)
        .eq('status', 'active'),
      supabase
        .from('provider_photos')
        .select('provider_id, public_url')
        .in(
          'provider_id',
          providers.map((p) => p.id)
        )
        .order('display_order'),
    ]);

    const procBySlug = {};
    for (const proc of procRes.data || []) {
      if (!procBySlug[proc.provider_slug]) procBySlug[proc.provider_slug] = [];
      procBySlug[proc.provider_slug].push(proc);
    }

    const photoById = {};
    for (const photo of photoRes.data || []) {
      if (!photoById[photo.provider_id]) photoById[photo.provider_id] = photo.public_url;
    }

    // Calculate distance, find best procedure match
    const enriched = providers.map((p) => {
      const dist =
        lat && lng && p.lat && p.lng ? haversine(lat, lng, p.lat, p.lng) : Infinity;
      const procs = procBySlug[p.slug] || [];

      // Best matching procedure type
      const bestMatch = procedureTypes.find((t) =>
        procs.some((pr) => pr.procedure_type === t)
      );
      const matchingProcs = procs.filter((pr) => pr.procedure_type === bestMatch);
      const prices = matchingProcs.map((pr) => Number(pr.price_paid));
      const avgPrice = prices.length
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : null;
      const hasVerified = matchingProcs.some(
        (pr) => pr.trust_tier && pr.trust_tier.includes('receipt')
      );

      return {
        ...p,
        distanceMiles: dist,
        photoUrl: photoById[p.id] || null,
        relevantProcedure: bestMatch || null,
        avgPrice,
        hasVerifiedPrices: hasVerified,
        hasProcedureMatch: !!bestMatch,
      };
    });

    // Filter by radius if specified
    const filtered = radiusMiles
      ? enriched.filter((p) => p.distanceMiles <= radiusMiles)
      : enriched;

    // Weighted relevance score
    const maxDist = Math.max(...filtered.map((p) => p.distanceMiles).filter(isFinite), 1);

    const scored = filtered.map((p) => {
      // Proximity: 40% — closer = higher
      const proximityScore =
        p.distanceMiles !== Infinity ? (1 - p.distanceMiles / maxDist) * 40 : 0;

      // Rating: 30% — higher = better
      const rating = p.weighted_rating || p.google_rating || 0;
      const ratingScore = (rating / 5) * 30;

      // Data quality: 20% — more verified reviews = higher
      const verifiedCount = p.verified_review_count || 0;
      const totalCount = p.review_count || 1;
      const qualityScore = Math.min((verifiedCount / totalCount) * 20, 20);

      // Procedure match: 10%
      const procedureScore = p.hasProcedureMatch ? 10 : 0;

      const totalScore = proximityScore + ratingScore + qualityScore + procedureScore;

      return { ...p, _score: totalScore };
    });

    // Sort by score descending; tiebreak on price (cheaper first) when within 5 pts
    scored.sort((a, b) => {
      if (Math.abs(a._score - b._score) <= 5 && a.avgPrice && b.avgPrice) {
        return a.avgPrice - b.avgPrice;
      }
      return b._score - a._score;
    });

    return scored;
  }

  function handleCardClick(competitor, index) {
    const eventData = {
      from_slug: providerSlug,
      to_slug: competitor.slug,
      distance_miles: competitor.distanceMiles !== Infinity
        ? Number(competitor.distanceMiles.toFixed(1))
        : null,
      rank: index + 1,
    };

    window.dispatchEvent(
      new CustomEvent('competitor_card_clicked', { detail: eventData })
    );

    supabase
      .from('custom_events')
      .insert({ event_name: 'competitor_card_clicked', properties: eventData })
      .then(() => {});
  }

  if (competitors.length === 0) return null;

  return (
    <div className="bg-warm-gray" style={{ padding: '40px 0', marginTop: 40 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-base font-medium text-text-primary">
              Verified providers near {city || state}
            </p>
            <p className="text-[13px] text-gray-400 mt-0.5">
              These practices have claimed their listings and publish verified prices.
            </p>
          </div>
          <Link
            to={claimUrl}
            className="text-[11px] text-gray-400 hover:text-gray-500 transition-colors shrink-0 ml-4 mt-1"
          >
            Ad &middot; Claim this listing to remove &rarr;
          </Link>
        </div>

        {/* Cards — scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0 lg:grid-cols-4">
          {competitors.map((c, i) => (
            <Link
              key={c.slug}
              to={`/provider/${c.slug}`}
              onClick={() => handleCardClick(c, i)}
              className="block shrink-0 w-[240px] md:w-auto rounded-xl bg-white overflow-hidden transition-all duration-150 hover:-translate-y-0.5"
              style={{
                border: '0.5px solid #E5E7EB',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Photo */}
              <div className="relative h-[120px]">
                {c.photoUrl ? (
                  <div
                    className="w-full h-full bg-gray-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${c.photoUrl})` }}
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center`}
                  >
                    <ProviderAvatar name={c.name} size={48} />
                  </div>
                )}
                {/* Distance badge */}
                {c.distanceMiles !== Infinity && (
                  <span
                    className="absolute bottom-2 left-2 text-[11px] text-white px-2 py-0.5 rounded"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                  >
                    {formatDistance(c.distanceMiles, c.city, c.state)}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-3.5">
                <p className="text-sm font-semibold text-text-primary truncate mb-0.5">
                  {c.name}
                </p>
                <p className="text-[11px] text-gray-400 mb-2 truncate">
                  {[c.city, c.state].filter(Boolean).join(', ')}
                  {c.provider_type && ` \u00b7 ${c.provider_type}`}
                </p>

                {/* Rating */}
                {(c.weighted_rating || c.google_rating) && (
                  <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
                    <Star size={11} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                    <span>
                      {Number(c.weighted_rating || c.google_rating).toFixed(1)}
                    </span>
                    {c.weighted_rating && c.verified_review_count > 0 ? (
                      <span>
                        &middot; {c.review_count} verified review
                        {c.review_count !== 1 ? 's' : ''}
                      </span>
                    ) : c.google_review_count ? (
                      <span>
                        &middot; {c.google_review_count} Google review
                        {c.google_review_count !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Relevant procedure + price */}
                {c.relevantProcedure && c.avgPrice && (
                  <p className="text-[13px] font-medium text-text-primary mb-1.5 truncate">
                    {c.relevantProcedure} &middot; avg ${c.avgPrice}
                  </p>
                )}

                {/* Trust badge */}
                {c.hasVerifiedPrices ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-[7px] py-0.5 rounded-lg"
                    style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                  >
                    <CheckCircle size={10} />
                    Verified prices
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-[7px] py-0.5 rounded-lg"
                    style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}
                  >
                    <Users size={10} />
                    Community reported
                  </span>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-3.5 py-2.5"
                style={{ borderTop: '0.5px solid #F3F4F6' }}
              >
                <span className="text-xs font-medium" style={{ color: '#C94F78' }}>
                  View Profile &rarr;
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-[7px] py-0.5 rounded-lg"
                  style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                >
                  <CheckCircle size={9} />
                  Claimed
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
