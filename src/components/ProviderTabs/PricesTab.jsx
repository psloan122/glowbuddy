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
import { normalizePrice, groupForProviderDisplay } from '../../lib/priceUtils';
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
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-verified bg-verified/10 px-2 py-0.5 rounded-full">
        <ShieldCheck size={11} />
        Verified
      </span>
    );
  }
  if (item.source === 'scrape') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
        <Globe size={11} />
        Public menu
      </span>
    );
  }
  return null;
}

function StalenessPill({ item }) {
  const age = daysOld(item.scraped_at, item.created_at);
  if (age == null || age < STALE_DAYS) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <AlertTriangle size={11} />
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
      className="flex items-start gap-2 rounded-lg p-3 mb-3 text-[12px]"
      style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
    >
      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-text-secondary" />
      <p className="text-text-secondary leading-snug">
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
    <div className={showDivider ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-2">
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
          <p className="text-sm text-text-primary">
            {item.treatment_area || normalized.compareUnit || 'Listed price'}
          </p>
          {(isEstimate || normalized.category === 'flat_area' || normalized.category === 'flat_treatment') && (
            <PriceTooltip text={normalized.tooltip} />
          )}
        </div>
        {item.units_or_volume && !item.treatment_area && (
          <p className="text-[11px] text-text-secondary mt-0.5">{item.units_or_volume}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <SourceBadge item={item} />
          <StalenessPill item={item} />
        </div>
        {item.source === 'scrape' && (
          <p className="text-[11px] text-text-secondary italic mt-1">
            Pulled from provider&apos;s public website
            {item.source_url && (
              <>
                {' '}
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-700 not-italic hover:underline"
                >
                  view source <ExternalLink size={9} />
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <div className="text-right flex flex-col items-end gap-1 shrink-0">
        <p className="text-base font-bold text-text-primary leading-tight">
          {normalized.displayPrice}
        </p>
        {vsAvg && vsAvg.pct !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              vsAvg.pct < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
            title={`${Math.abs(vsAvg.pct)}% ${vsAvg.pct < 0 ? 'below' : 'above'} ${vsAvg.label} ($${Math.round(vsAvg.ref).toLocaleString()})`}
          >
            {vsAvg.pct < 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
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
        <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <ShieldCheck size={20} className="text-verified" />
          Published by {provider?.name || 'this provider'}
        </h2>
        <p className="text-sm text-text-secondary mb-4">Official prices &middot; Updated by provider</p>

        {verifiedPricing.length > 0 ? (
          <>
            {hasMixedPriceTypes(verifiedPricing) && <MixedPriceNotice />}
            <div className="glow-card overflow-hidden">
              <div className="divide-y divide-gray-100">
                {Object.entries(groupForProviderDisplay(verifiedPricing)).map(
                  ([procedureType, groups]) => {
                    const cityComp = priceComparisons?.[procedureType];
                    const cityCount = communityAverages?.[procedureType]?.count || 0;
                    const nationalAvg = AVG_PRICES[procedureType];
                    return (
                      <div key={procedureType} className="p-4">
                        <p className="text-sm font-semibold text-text-primary mb-3">
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
          <div className="glow-card p-6 text-center">
            <p className="text-text-secondary text-sm">
              This provider hasn&apos;t uploaded their menu yet.
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
        <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <Users size={20} className="text-community" />
          Reported by patients
        </h2>
        <p className="text-sm text-text-secondary mb-4">Real prices shared by patients &middot; Not advertised rates</p>

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
          <div className="glow-card p-6 text-center">
            <p className="text-text-secondary text-sm">
              No community prices yet for this provider.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
