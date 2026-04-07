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
import PriceTooltip from '../PriceTooltip';
import { getStalenessPercentage } from '../../lib/freshness';
import { AVG_PRICES } from '../../lib/constants';
import {
  normalizePrice,
  groupForProviderDisplay,
  inferNeurotoxinBrand,
} from '../../lib/priceUtils';
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

// True when this provider has more than one distinct comparable bucket
// (per-unit + area, or per-unit + per-syringe, etc.) — used to surface a
// "prices are not directly comparable" notice above the table.
function hasMixedPriceTypes(items) {
  if (!items || items.length < 2) return false;
  const cats = new Set();
  for (const item of items) {
    const n = normalizePrice(item);
    cats.add(n.category);
    if (cats.size > 1) return true;
  }
  return false;
}

function MixedPriceNotice() {
  return (
    <div
      className="flex items-start gap-2 p-3 mb-3 text-[11px]"
      style={{ background: '#F5F2EE', border: '1px solid #E8E8E8', borderRadius: '2px' }}
    >
      <AlertTriangle size={12} className="shrink-0 mt-0.5 text-text-secondary" />
      <p className="text-text-secondary leading-snug font-light">
        Prices shown as listed. Per-unit estimates calculated from standard
        treatment areas where possible. Always confirm pricing before booking.
      </p>
    </div>
  );
}

function subsectionTitleForCategory(category) {
  if (category === 'per_unit') return 'Per unit pricing';
  if (category === 'per_syringe') return 'Per syringe pricing';
  if (category === 'per_session') return 'Per session pricing';
  if (category === 'per_month') return 'Monthly pricing';
  return 'Direct pricing';
}

function PriceSubsection({ title, items, cityComp, cityCount, nationalAvg, showDivider }) {
  return (
    <div className={showDivider ? 'mt-3 pt-3 border-t border-rule' : ''}>
      <p
        className="text-[10px] font-semibold uppercase text-text-secondary mb-2"
        style={{ letterSpacing: '0.12em' }}
      >
        {title}
      </p>
      <div className="space-y-2.5">
        {items.map((item) => (
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
}

function PriceRow({ item, cityComp, cityCount, nationalAvg }) {
  const normalized = item.normalized || normalizePrice(item);
  const isEstimate = normalized.isEstimate;

  // Compare against city avg only when sample size is sufficient AND we have
  // a comparable value to compare. Falls back to national avg for per-unit
  // pricing only.
  let vsAvg = null;
  if (
    normalized.comparableValue != null &&
    !isEstimate &&
    cityComp &&
    cityComp.level === 'city' &&
    cityCount >= MIN_SAMPLES_FOR_VS_AVG
  ) {
    vsAvg = { pct: cityComp.pctDiff, ref: cityComp.refPrice, label: 'vs city avg' };
  } else if (
    normalized.comparableValue != null &&
    !isEstimate &&
    nationalAvg?.avg &&
    Number(item.price) > 0
  ) {
    const pct = Math.round(((Number(item.price) - nationalAvg.avg) / nationalAvg.avg) * 100);
    vsAvg = { pct, ref: nationalAvg.avg, label: 'vs national avg' };
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] text-ink font-medium">
            {item.treatment_area || normalized.compareUnit || 'Listed price'}
          </p>
          {(isEstimate || normalized.category === 'flat_area' || normalized.category === 'flat_treatment') && (
            <PriceTooltip text={normalized.tooltip} />
          )}
        </div>
        {item.units_or_volume && !item.treatment_area && (
          <p className="text-[11px] text-text-secondary mt-0.5 font-light">{item.units_or_volume}</p>
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

        {verifiedPricing.length > 0 ? (
          <>
            {hasMixedPriceTypes(verifiedPricing) && <MixedPriceNotice />}
            <div className="glow-card overflow-hidden p-0">
              <div className="divide-y divide-rule">
                {Object.entries(groupForProviderDisplay(verifiedPricing)).map(
                  ([procedureType, groups]) => {
                    const cityComp = priceComparisons?.[procedureType];
                    const cityCount = communityAverages?.[procedureType]?.count || 0;
                    const nationalAvg = AVG_PRICES[procedureType];
                    return (
                      <div key={procedureType} className="p-4">
                        <p
                          className="text-[10px] font-semibold uppercase text-hot-pink mb-3"
                          style={{ letterSpacing: '0.12em' }}
                        >
                          {procedureType}
                        </p>
                        {groups.perUnit.length > 0 && (
                          <PriceSubsection
                            title={subsectionTitleForCategory(groups.perUnit[0]?.normalized?.category)}
                            items={groups.perUnit}
                            cityComp={cityComp}
                            cityCount={cityCount}
                            nationalAvg={nationalAvg}
                          />
                        )}
                        {groups.area.length > 0 && (
                          <PriceSubsection
                            title="Area / package pricing"
                            items={groups.area}
                            cityComp={cityComp}
                            cityCount={cityCount}
                            nationalAvg={nationalAvg}
                            showDivider={groups.perUnit.length > 0}
                          />
                        )}
                        {groups.other.length > 0 && (
                          <PriceSubsection
                            title="Other pricing"
                            items={groups.other}
                            cityComp={cityComp}
                            cityCount={cityCount}
                            nationalAvg={nationalAvg}
                            showDivider={groups.perUnit.length > 0 || groups.area.length > 0}
                          />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="glow-card p-8 text-center">
            <p className="font-display italic text-[18px] text-text-secondary">
              No prices yet.
            </p>
          </div>
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
