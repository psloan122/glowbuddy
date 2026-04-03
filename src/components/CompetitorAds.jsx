import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProviderAvatar from './ProviderAvatar';

export default function CompetitorAds({
  providerSlug,
  providerId,
  city,
  state,
  procedureTypes,
  claimUrl,
  onCompetitorsLoaded,
}) {
  const [competitors, setCompetitors] = useState([]);

  useEffect(() => {
    if (!city || !state || procedureTypes.length === 0) return;
    fetchCompetitors();
  }, [city, state, JSON.stringify(procedureTypes)]);

  async function fetchCompetitors() {
    // Try same city first
    let results = await queryCompetitors(city, state, 'city');

    // Expand to state if fewer than 3
    if (results.length < 3) {
      const existing = new Set(results.map((r) => r.slug));
      const stateResults = await queryCompetitors(null, state, 'state');
      const extras = stateResults.filter((r) => !existing.has(r.slug));
      results = [...results, ...extras].slice(0, 3);
    }

    setCompetitors(results);
    onCompetitorsLoaded?.(results.length);

    // Fire impression event
    if (results.length > 0) {
      window.dispatchEvent(
        new CustomEvent('competitor_impression', {
          detail: {
            unclaimed_provider: providerSlug,
            competitor_count: results.length,
            city,
            state,
          },
        })
      );

      supabase
        .from('custom_events')
        .insert({
          event_name: 'competitor_impression',
          properties: {
            unclaimed_provider: providerSlug,
            competitor_count: results.length,
            city,
            state,
          },
        })
        .then(() => {});
    }
  }

  async function queryCompetitors(filterCity, filterState, scope) {
    let query = supabase
      .from('providers')
      .select(
        'id, name, slug, city, state, weighted_rating, review_count, logo_url, tagline'
      )
      .eq('state', filterState)
      .eq('is_claimed', true)
      .order('weighted_rating', { ascending: false })
      .limit(6);

    if (scope === 'city' && filterCity) {
      query = query.eq('city', filterCity);
    } else if (filterCity) {
      // State scope — exclude providers already found in city
      query = query.neq('city', filterCity);
    }

    if (providerId) {
      query = query.neq('id', providerId);
    }

    const { data: providers } = await query;
    if (!providers || providers.length === 0) return [];

    const slugs = providers.map((p) => p.slug).filter(Boolean);
    if (slugs.length === 0) return [];

    // Get matching procedures for these providers
    const { data: procedures } = await supabase
      .from('procedures')
      .select('provider_slug, procedure_type, price_paid')
      .in('provider_slug', slugs)
      .in('procedure_type', procedureTypes)
      .eq('status', 'active');

    // Get first photo per provider
    const ids = providers.map((p) => p.id);
    const { data: photos } = await supabase
      .from('provider_photos')
      .select('provider_id, public_url')
      .in('provider_id', ids)
      .order('display_order');

    // Index procedures by slug
    const procBySlug = {};
    for (const proc of procedures || []) {
      if (!procBySlug[proc.provider_slug]) procBySlug[proc.provider_slug] = [];
      procBySlug[proc.provider_slug].push(proc);
    }

    // First photo per provider
    const photoById = {};
    for (const photo of photos || []) {
      if (!photoById[photo.provider_id]) photoById[photo.provider_id] = photo.public_url;
    }

    return providers
      .filter((p) => procBySlug[p.slug]?.length > 0)
      .slice(0, 3)
      .map((p) => {
        const procs = procBySlug[p.slug];
        // Best match: first procedure type that this competitor offers
        const bestMatch = procedureTypes.find((t) =>
          procs.some((pr) => pr.procedure_type === t)
        );
        const matchingPrices = procs
          .filter((pr) => pr.procedure_type === bestMatch)
          .map((pr) => Number(pr.price_paid));
        const minPrice = Math.min(...matchingPrices);

        return {
          ...p,
          photoUrl: photoById[p.id] || null,
          relevantProcedure: bestMatch,
          fromPrice: minPrice,
        };
      });
  }

  function handleCardClick(competitor) {
    window.dispatchEvent(
      new CustomEvent('competitor_click', {
        detail: {
          from_provider: providerSlug,
          to_provider: competitor.slug,
        },
      })
    );

    supabase
      .from('custom_events')
      .insert({
        event_name: 'competitor_click',
        properties: {
          from_provider: providerSlug,
          to_provider: competitor.slug,
        },
      })
      .then(() => {});
  }

  if (competitors.length === 0) return null;

  return (
    <div
      className="mt-8 pt-8 pb-8 bg-warm-gray"
      style={{ borderTop: '0.5px solid #E5E7EB' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[13px] font-medium text-gray-400 tracking-[0.3px]">
            Other providers near you
          </span>
          <Link
            to={claimUrl}
            className="text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
          >
            Ad &middot; Claim this listing to remove
          </Link>
        </div>

        {/* Cards — horizontal scroll on mobile, 3-col grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {competitors.map((c) => (
            <Link
              key={c.slug}
              to={`/provider/${c.slug}`}
              onClick={() => handleCardClick(c)}
              className="block shrink-0 w-[200px] md:w-auto rounded-xl bg-white hover:shadow-md transition-shadow"
              style={{ border: '0.5px solid #E5E7EB' }}
            >
              {/* Photo / Avatar fallback */}
              {c.photoUrl ? (
                <div
                  className="h-20 rounded-t-xl bg-gray-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${c.photoUrl})` }}
                />
              ) : (
                <div className="h-20 rounded-t-xl bg-gradient-to-br from-rose-light to-rose-accent/20 flex items-center justify-center">
                  <ProviderAvatar name={c.name} size={40} />
                </div>
              )}

              <div className="p-4">
                <p className="text-sm font-medium text-text-primary truncate mb-0.5">
                  {c.name}
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  {[c.city, c.state].filter(Boolean).join(', ')}
                </p>

                {/* Rating */}
                {c.weighted_rating && (
                  <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    <span>{c.weighted_rating}</span>
                    {c.review_count > 0 && (
                      <span>
                        &middot; {c.review_count} review
                        {c.review_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Relevant procedure + price */}
                {c.relevantProcedure && (
                  <p className="text-[13px] font-medium text-text-primary mb-2 truncate">
                    {c.relevantProcedure} from ${c.fromPrice}
                  </p>
                )}

                {/* Verified badge */}
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[10px]"
                  style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                >
                  <CheckCircle size={10} />
                  Verified listing
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
