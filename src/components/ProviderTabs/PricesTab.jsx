import { Link } from 'react-router-dom';
import {
  Flag,
  ShieldCheck,
  Users,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Globe,
  ExternalLink,
} from 'lucide-react';
import ProcedureCard from '../ProcedureCard';
import FinancingWidget from '../FinancingWidget';
import { getStalenessPercentage } from '../../lib/freshness';
import { AVG_PRICES } from '../../lib/constants';
import {
  normalizePrice,
  groupForProviderDisplay,
  inferNeurotoxinBrand,
  formatUnitsIncluded,
} from '../../lib/priceUtils';
import { getProcedureLabel } from '../../lib/procedureLabel';
import useProviderPrices from '../../hooks/useProviderPrices';

const STALE_DAYS = 90;
const MIN_SAMPLES_FOR_VS_AVG = 5;

function daysOld(scrapedAt, createdAt) {
  const ts = scrapedAt || createdAt;
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24));
}

function SourceBadge({ item }) {
  if (item.verified === true && item.source === 'manual') {
    return (
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
        <ShieldCheck size={10} />
        Verified
      </span>
    );
  }
  if (item.source === 'scrape') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5"
        style={{
          letterSpacing: '0.08em',
          borderRadius: '4px',
          background: '#F5F2EE',
          color: '#666',
          border: '1px dashed #ccc',
        }}
      >
        <Globe size={10} />
        Public menu
      </span>
    );
  }
  return null;
}

function BrandChip({ item, perUnitPrice }) {
  const info = inferNeurotoxinBrand({
    procedureType: item.procedure_type,
    brand: item.brand || null,
    perUnitPrice,
  });
  if (!info) return null;
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold uppercase text-hot-pink px-2 py-0.5"
      style={{
        letterSpacing: '0.08em',
        borderRadius: '4px',
        border: '1px solid rgba(232, 52, 122, 0.4)',
      }}
      title={info.tooltip}
    >
      {info.label}
    </span>
  );
}

function StalenessPill({ item }) {
  const age = daysOld(item.scraped_at, item.created_at);
  if (age == null || age < STALE_DAYS) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5"
      style={{
        letterSpacing: '0.08em',
        borderRadius: '4px',
        background: '#FFF7ED',
        color: '#B45309',
        border: '1px solid #FED7AA',
      }}
    >
      <AlertTriangle size={10} />
      May be outdated
    </span>
  );
}

function PriceRow({ item, cityComp, cityCount, nationalAvg }) {
  const normalized = item.normalized || normalizePrice(item);

  // Compare against city avg only when sample size is sufficient AND we have
  // a comparable value. Falls back to national avg when the city sample is
  // too small.
  let vsAvg = null;
  if (
    normalized.comparableValue != null &&
    cityComp &&
    cityComp.level === 'city' &&
    cityCount >= MIN_SAMPLES_FOR_VS_AVG
  ) {
    vsAvg = { pct: cityComp.pctDiff, ref: cityComp.refPrice, label: 'vs city avg' };
  } else if (
    normalized.comparableValue != null &&
    nationalAvg?.avg &&
    Number(item.price) > 0
  ) {
    const pct = Math.round(((Number(item.price) - nationalAvg.avg) / nationalAvg.avg) * 100);
    vsAvg = { pct, ref: nationalAvg.avg, label: 'vs national avg' };
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink font-medium">
          {item.treatment_area || normalized.compareUnit || 'Listed price'}
        </p>
        {formatUnitsIncluded(item.units_or_volume) && !item.treatment_area && (
          <p className="text-[11px] text-text-secondary mt-0.5 font-light">{formatUnitsIncluded(item.units_or_volume)}</p>
        )}
        {!formatUnitsIncluded(item.units_or_volume) && !item.treatment_area && normalized.unitSubtext && (
          <p className="text-[11px] text-text-secondary mt-0.5 font-light">
            {normalized.unitSubtext}
            {(item.price_label || '').toLowerCase() === 'flat_package' && (
              <span style={{ marginLeft: 4, cursor: 'help' }} title="Fixed price — ask provider what's included (e.g. 20 units, one area)">ⓘ</span>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <BrandChip item={item} perUnitPrice={normalized.comparableValue} />
          <SourceBadge item={item} />
          <StalenessPill item={item} />
        </div>
        {item.source === 'scrape' && (
          <p className="font-display italic text-[11px] text-text-secondary mt-1">
            Pulled from provider&apos;s public website
            {item.source_url && (
              <>
                {' '}
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-hot-pink not-italic hover:underline font-semibold uppercase text-[10px]"
                  style={{ letterSpacing: '0.08em' }}
                >
                  view source <ExternalLink size={9} />
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <div className="text-right flex flex-col items-end gap-1 shrink-0">
        <p
          className="font-display text-ink leading-none"
          style={{ fontWeight: 900, fontSize: '22px' }}
        >
          {normalized.displayPrice}
        </p>
        {item.price_label === 'per_unit' && item._visit_price > 0 && (
          <p className="text-[11px] text-text-secondary font-light" style={{ whiteSpace: 'nowrap' }}>
            avg visit ${item._visit_price.toLocaleString()}
          </p>
        )}
        {vsAvg && vsAvg.pct !== 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{
              letterSpacing: '0.06em',
              borderRadius: '4px',
              background: vsAvg.pct < 0 ? '#F0FAF5' : '#FFF1F5',
              color: vsAvg.pct < 0 ? '#1A7A3A' : '#C8001A',
              border: `1px solid ${vsAvg.pct < 0 ? '#1A7A3A' : '#C8001A'}`,
            }}
            title={`${Math.abs(vsAvg.pct)}% ${vsAvg.pct < 0 ? 'below' : 'above'} ${vsAvg.label} ($${Math.round(vsAvg.ref).toLocaleString()})`}
          >
            {vsAvg.pct < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {Math.abs(vsAvg.pct)}% {vsAvg.label}
          </span>
        )}
      </div>
    </div>
  );
}

// Fallback shown when a provider has scraped rows but all of them were
// suppressed — we hide the ambiguous prices but still want to signal that
// pricing exists.
function ContactForPricingFallback() {
  return (
    <div
      className="glow-card p-6 text-center"
      style={{
        background: '#FFFFFF',
      }}
    >
      <p
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '13px',
          color: '#B8A89A',
          lineHeight: 1.5,
        }}
      >
        Pricing available — contact for per-unit rates
      </p>
    </div>
  );
}

export default function PricesTab({
  verifiedPricing,
  communityData,
  provider,
  user,
  isProviderOwner,
  onDisputeTarget,
  cityState,
}) {
  const { priceComparisons, communityAverages } = useProviderPrices(provider?.id, cityState);

  // After migration 053, verifiedPricing only contains displayable rows.
  // groupForProviderDisplay drops any stragglers whose category is 'hidden'
  // and returns one bucket per procedure_type.
  const groupedDisplay = groupForProviderDisplay(verifiedPricing);
  const displayableGroups = Object.entries(groupedDisplay).filter(
    ([, group]) => group.items.length > 0,
  );
  const hasAnyDisplayablePrice = displayableGroups.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left column: Provider's Listed Prices */}
      <div>
        <p className="editorial-kicker mb-2 flex items-center gap-2">
          <ShieldCheck size={12} className="text-verified" />
          Published by {provider?.name || 'this provider'}
        </p>
        <h2 className="font-display font-bold text-[22px] text-ink mb-1">The Menu</h2>
        <p className="text-[12px] text-text-secondary mb-4 font-light">Official prices &middot; Updated by provider</p>

        {hasAnyDisplayablePrice ? (
          <div className="glow-card overflow-hidden p-0">
            <div className="divide-y divide-rule">
              {displayableGroups.map(([procedureType, group]) => {
                const cityComp = priceComparisons?.[procedureType];
                const cityCount = communityAverages?.[procedureType]?.count || 0;
                const nationalAvg = AVG_PRICES[procedureType];
                // Display label collapses combined strings like "Botox /
                // Dysport / Xeomin" down to a clean category name. The
                // group key (procedureType) stays as the raw DB value.
                const groupLabel = getProcedureLabel(procedureType, null);
                return (
                  <div key={procedureType} className="p-4">
                    <p
                      className="text-[10px] font-semibold uppercase text-hot-pink mb-3"
                      style={{ letterSpacing: '0.12em' }}
                    >
                      {groupLabel}
                    </p>
                    <div className="space-y-2.5">
                      {group.items.map((item) => (
                        <PriceRow
                          key={item.id}
                          item={item}
                          cityComp={cityComp}
                          cityCount={cityCount}
                          nationalAvg={nationalAvg}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ContactForPricingFallback />
        )}

        {/* Financing widget */}
        {(() => {
          const avgPrice = verifiedPricing.length > 0
            ? verifiedPricing.reduce((sum, item) => sum + Number(item.price), 0) / verifiedPricing.length
            : null;
          return (
            <FinancingWidget
              procedureName={verifiedPricing[0]?.procedure_type}
              estimatedCost={avgPrice}
              providerId={provider?.id}
              variant="full"
            />
          );
        })()}
      </div>

      {/* Right column: Community Prices */}
      <div>
        <p className="editorial-kicker mb-2 flex items-center gap-2">
          <Users size={12} className="text-community" />
          Reported by patients
        </p>
        <h2 className="font-display font-bold text-[22px] text-ink mb-1">
          What people actually paid
        </h2>
        <p className="text-[12px] text-text-secondary mb-4 font-light">Real prices shared by patients &middot; Not advertised rates</p>

        {/* Staleness warning when >50% of community prices are stale */}
        {communityData.length > 0 && getStalenessPercentage(communityData) > 50 && (
          <div
            className="flex items-start gap-2.5 rounded-xl p-3 mb-4 text-sm"
            style={{ background: '#FFFBEB', border: '1px solid rgba(217, 119, 6, 0.2)' }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
            <p style={{ color: '#92400E' }}>
              Most community prices here are over 6 months old and may no longer be accurate.
              <Link
                to={`/log?provider=${encodeURIComponent(provider?.name || '')}&city=${encodeURIComponent(provider?.city || '')}&state=${encodeURIComponent(provider?.state || '')}`}
                className="font-medium ml-1 hover:underline"
                style={{ color: '#B45309' }}
              >
                Share a fresh price &rarr;
              </Link>
            </p>
          </div>
        )}

        {communityData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {communityData.map((procedure, index) => (
              <div key={procedure.id} className="relative">
                <ProcedureCard procedure={procedure} index={index} />

                {user && isProviderOwner && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDisputeTarget(procedure);
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
          <div className="glow-card p-8 text-center">
            <p className="font-display italic text-[18px] text-text-secondary">
              No community prices yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
