import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Globe,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getProcedureLabel } from '../lib/procedureLabel';
import { formatUnitSuffix } from '../utils/formatPricingUnit';

const STALE_DAYS = 90;
const SHOW_INITIAL = 3;

// Human-readable price label suffixes shown next to community avg prices.
// Mirrors the short-form SUFFIX_MAP in formatPricingUnit.js.
const LABEL_DISPLAY = {
  per_unit:       '/unit',
  per_syringe:    '/syringe',
  per_vial:       '/vial',
  flat_package:   ' flat',
  per_session:    '/session',
  per_area:       '/area',
  per_ml:         '/ml',
};

function daysOld(scrapedAt, createdAt) {
  const ts = scrapedAt || createdAt;
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Sub-components ──────────────────────────────────────────────────────────

function AdvertisedPriceRow({ item }) {
  const { normalized } = item;
  const age = daysOld(item.scraped_at, item.created_at);
  const isStale = age != null && age >= STALE_DAYS;
  const isProviderListed = item.source === 'provider_listed';
  const isVerifiedManual = item.verified === true && item.source === 'manual';
  const isScrape = item.source === 'scrape' || item.source === 'cheerio_scraper';

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {item.treatment_area ? (
          <p className="text-[12px] text-text-secondary">{item.treatment_area}</p>
        ) : normalized?.unitSubtext ? (
          <p className="text-[11px] text-text-secondary font-light">{normalized.unitSubtext}</p>
        ) : null}
        <div className="flex flex-wrap gap-1 mt-1">
          {(isProviderListed || isVerifiedManual) && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase px-1.5 py-0.5"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '3px',
                background: '#F0FAF5',
                color: '#1A7A3A',
                border: '1px solid #1A7A3A',
              }}
            >
              <ShieldCheck size={9} /> Verified
            </span>
          )}
          {isScrape && !isProviderListed && !isVerifiedManual && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase px-1.5 py-0.5"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '3px',
                background: '#F5F2EE',
                color: '#666',
                border: '1px dashed #ccc',
              }}
            >
              <Globe size={9} /> Public menu
            </span>
          )}
          {isStale && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5"
              style={{
                borderRadius: '3px',
                background: '#FFF7ED',
                color: '#B45309',
                border: '1px solid #FED7AA',
              }}
            >
              <AlertTriangle size={9} /> May be outdated
            </span>
          )}
        </div>
      </div>
      <p
        className="font-display text-ink shrink-0"
        style={{ fontWeight: 900, fontSize: '20px', lineHeight: 1 }}
      >
        {normalized?.displayPrice || '--'}
      </p>
    </div>
  );
}

function CommunityRow({ row, labelSuffix, isProviderOwner, onDispute }) {
  const price = Number(row.price_paid);
  if (!price) return null;
  const ago = formatDistanceToNow(new Date(row.created_at), { addSuffix: true });

  return (
    <div className="flex items-center justify-between text-[12px] group">
      <div className="flex items-center gap-1.5 min-w-0">
        {row.receipt_verified && (
          <CheckCircle size={11} className="shrink-0" style={{ color: '#1A7A3A' }} />
        )}
        <span className="text-text-secondary truncate">{ago}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isProviderOwner && (
          <button
            onClick={() => onDispute?.(row)}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-text-secondary bg-white border border-gray-200 rounded"
          >
            <Flag size={9} /> Flag
          </button>
        )}
        <span className="font-semibold text-ink">
          ${price.toLocaleString()}{labelSuffix}
        </span>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

/**
 * Dual-source price block for a single procedure type.
 *
 * Shows advertised prices (from provider_pricing) on the left and
 * patient-reported prices (from the procedures table) on the right.
 * Collapses to a single column when only one source has data.
 *
 * Props:
 *   procedureType   — string DB value (e.g. "Botox / Dysport / Xeomin")
 *   advertisedRows  — provider_pricing items already normalized by groupForProviderDisplay
 *   communityRows   — procedures table rows for this provider + procedure_type
 *   provider        — provider object (used for Add Price link)
 *   isProviderOwner — show Flag buttons on community rows
 *   onDisputeTarget — callback(row) when a flag button is clicked
 */
export default function ProcedurePriceBlock({
  procedureType,
  advertisedRows,
  communityRows,
  provider,
  isProviderOwner,
  onDisputeTarget,
}) {
  const [expanded, setExpanded] = useState(false);

  const hasAdvertised = advertisedRows.length > 0;
  const hasCommunity = communityRows.length > 0;

  const label = getProcedureLabel(procedureType, null);

  // Show "Provider Verified" header badge only when at least one row
  // comes directly from the provider (not scraped or community-sourced).
  const isProviderVerified = advertisedRows.some((r) => r.source === 'provider_listed');

  // Unit suffix inferred from the primary advertised row, used to annotate
  // community avg prices so they stay comparable (e.g. "$12/unit").
  const primaryLabel = advertisedRows[0]?.price_label;
  const labelSuffix = primaryLabel
    ? (LABEL_DISPLAY[primaryLabel] ?? formatUnitSuffix(primaryLabel))
    : '';

  // Community avg price across all patient submissions for this procedure.
  const communityPrices = communityRows
    .map((r) => Number(r.price_paid))
    .filter((p) => p > 0);
  const avgCommunity =
    communityPrices.length > 0
      ? Math.round(communityPrices.reduce((a, b) => a + b, 0) / communityPrices.length)
      : null;

  // Savings % = how much cheaper the avg patient-reported price is vs the
  // lowest advertised price. Positive = patients paid less than advertised.
  const minAdvertised = hasAdvertised
    ? Math.min(...advertisedRows.map((r) => Number(r.price)).filter((p) => p > 0))
    : null;
  const savingsPct =
    minAdvertised && avgCommunity
      ? Math.round(((minAdvertised - avgCommunity) / minAdvertised) * 100)
      : null;

  const addPriceHref = `/log?provider_id=${provider?.id || ''}&provider=${encodeURIComponent(
    provider?.name || ''
  )}&city=${encodeURIComponent(provider?.city || '')}&state=${encodeURIComponent(
    provider?.state || ''
  )}&procedure=${encodeURIComponent(procedureType)}`;

  const visibleRows = expanded ? communityRows : communityRows.slice(0, SHOW_INITIAL);
  const hiddenCount = communityRows.length - SHOW_INITIAL;

  // ── Shared community column JSX (inlined in both dual and single-column) ──
  const communityColJsx = (
    <>
      {/* Average + savings badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p
            className="font-display text-ink"
            style={{ fontWeight: 900, fontSize: '20px', lineHeight: 1 }}
          >
            {avgCommunity ? `$${avgCommunity.toLocaleString()}${labelSuffix}` : '--'}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            avg &middot; {communityRows.length}{' '}
            {communityRows.length === 1 ? 'report' : 'reports'}
          </p>
        </div>
        {savingsPct !== null && savingsPct !== 0 && (
          <span
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0"
            style={{
              letterSpacing: '0.06em',
              borderRadius: '4px',
              background: savingsPct > 0 ? '#F0FAF5' : '#FFF1F5',
              color: savingsPct > 0 ? '#1A7A3A' : '#C8001A',
              border: `1px solid ${savingsPct > 0 ? '#1A7A3A' : '#C8001A'}`,
            }}
          >
            {savingsPct > 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {Math.abs(savingsPct)}%{' '}
            {savingsPct > 0 ? 'below advertised' : 'above advertised'}
          </span>
        )}
      </div>

      {/* Individual submissions */}
      <div className="space-y-2">
        {visibleRows.map((row) => (
          <CommunityRow
            key={row.id}
            row={row}
            labelSuffix={labelSuffix}
            isProviderOwner={isProviderOwner}
            onDispute={onDisputeTarget}
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium"
          style={{ color: '#C94F78' }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded
            ? 'Show less'
            : `${hiddenCount} more report${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}
    </>
  );

  return (
    <div className="glow-card overflow-hidden">
      {/* ── Header: procedure label + optional Provider Verified badge ── */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: '#F0EBE5' }}
      >
        <p
          className="text-[10px] font-semibold uppercase"
          style={{ color: '#C94F78', letterSpacing: '0.12em' }}
        >
          {label}
        </p>
        {isProviderVerified && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5"
            style={{
              letterSpacing: '0.06em',
              borderRadius: '4px',
              background: '#F0FAF5',
              color: '#1A7A3A',
              border: '1px solid #1A7A3A',
            }}
          >
            <ShieldCheck size={10} />
            Provider Verified
          </span>
        )}
      </div>

      {/* ── Body ── */}
      {hasAdvertised && hasCommunity ? (
        // Dual column: advertised left, patient-reported right.
        // On mobile the grid stacks vertically with a horizontal divider.
        <div
          className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-rule"
        >
          <div className="p-4">
            <p
              className="text-[10px] font-semibold uppercase mb-3 text-text-secondary"
              style={{ letterSpacing: '0.1em' }}
            >
              Advertised
            </p>
            <div className="space-y-3">
              {advertisedRows.map((row) => (
                <AdvertisedPriceRow key={row.id} item={row} />
              ))}
            </div>
          </div>

          <div className="p-4">
            <p
              className="text-[10px] font-semibold uppercase mb-3 text-text-secondary"
              style={{ letterSpacing: '0.1em' }}
            >
              Patient-reported
            </p>
            {communityColJsx}
          </div>
        </div>
      ) : hasAdvertised ? (
        // Advertised only — full width, with "Be the first" nudge.
        <div className="p-4">
          <div className="space-y-3">
            {advertisedRows.map((row) => (
              <AdvertisedPriceRow key={row.id} item={row} />
            ))}
          </div>
          <div className="border-t mt-4 pt-3" style={{ borderColor: '#F0EBE5' }}>
            <p
              className="text-[12px] italic mb-2"
              style={{ color: '#B8A89A' }}
            >
              No patient reports yet.
            </p>
            <Link
              to={addPriceHref}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: '#C94F78' }}
            >
              + Be the first to share what you paid
            </Link>
          </div>
        </div>
      ) : (
        // Community only — full width.
        <div className="p-4">
          <p
            className="text-[10px] font-semibold uppercase mb-3 text-text-secondary"
            style={{ letterSpacing: '0.1em' }}
          >
            Patient-reported
          </p>
          {communityColJsx}
        </div>
      )}
    </div>
  );
}
