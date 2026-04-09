import { Link } from 'react-router-dom';
import ProviderAvatar from './ProviderAvatar';
import FairPriceBadge from './FairPriceBadge';
import { providerProfileUrl } from '../lib/slugify';
import SpecialBanner, { hasActiveSpecial, SpecialUpgradeSlot } from './SpecialBanner';
import { haversineMiles, formatMiles } from '../lib/distance';
import { getProcedureLabel } from '../lib/procedureLabel';
import { inferNeurotoxinBrand } from '../lib/priceUtils';

// Brand-group card for the browse page.
//
// Renders a single card containing 2+ rows from the SAME provider + SAME
// procedure category (e.g. PBK Medspa offering Botox $15, Xeomin $14,
// Dysport $5 — all neurotoxins). The grouping itself is performed upstream
// by `src/lib/groupBrandRows.js`; this component just renders the group.
//
// Props:
//   group: { kind: 'group', key, rows, lead, category }
//     rows   — sorted ascending by comparable price
//     lead   — cheapest row in the group
//     category — normalized category tag (e.g. "neurotoxin") or null
//
// Layout mirrors the spec:
//
//   BOTOX / DYSPORT / XEOMIN
//   From $5 / unit
//
//   Botox    $15 / unit  [BOTOX chip]
//   Xeomin   $14 / unit  [XEOMIN chip]
//   Dysport   $5 / unit  [DYSPORT chip]
//
//   PBK Medspa · Brooklyn, NY

function brandLabel(row) {
  // For neurotoxins, use price-aware brand inference (overrides "Botox"
  // when per-unit price suggests Dysport). Falls back to the clean
  // category label for non-neurotoxins.
  const perUnit =
    row.normalized_compare_unit === 'per unit' &&
    Number.isFinite(Number(row.normalized_compare_value))
      ? Number(row.normalized_compare_value)
      : null;
  const info = inferNeurotoxinBrand({
    procedureType: row.procedure_type,
    brand: row.brand || null,
    perUnitPrice: perUnit,
  });
  if (info) return info.label;
  return getProcedureLabel(row.procedure_type, row.brand);
}

function brandKey(row) {
  return brandLabel(row).toLowerCase();
}

function priceDisplay(row) {
  if (row.normalized_display) return row.normalized_display;
  const n = Number(row.price_paid);
  if (!Number.isFinite(n)) return '--';
  return `$${n.toLocaleString()}`;
}

function leadPriceDisplay(row) {
  // "From $X / unit" — just the lead's normalized_display if present
  if (row.normalized_display) return `From ${row.normalized_display}`;
  const n = Number(row.price_paid);
  if (!Number.isFinite(n)) return '';
  return `From $${n.toLocaleString()}`;
}

export default function BrandGroupCard({ group, userLat, userLng }) {
  const { rows, lead } = group;

  // Distance badge — rendered next to the city/state line when we know
  // both the user's coordinates and the lead row's provider coordinates.
  const distanceLabel = formatMiles(
    haversineMiles(userLat, userLng, lead.provider_lat, lead.provider_lng),
  );

  // Distinct brand labels, in the order they appear in the sorted rows
  const seen = new Set();
  const distinctBrands = [];
  for (const row of rows) {
    const key = brandKey(row);
    if (!seen.has(key)) {
      seen.add(key);
      distinctBrands.push(brandLabel(row));
    }
  }

  const profileUrl = providerProfileUrl(
    lead.provider_slug,
    lead.provider_name,
    lead.city,
    lead.state,
  );
  const Wrapper = profileUrl ? Link : 'div';
  const wrapperProps = profileUrl ? { to: profileUrl } : {};

  const dysportRow = rows.find((r) => {
    const perUnit =
      r.normalized_compare_unit === 'per unit' &&
      Number.isFinite(Number(r.normalized_compare_value))
        ? Number(r.normalized_compare_value)
        : null;
    const info = inferNeurotoxinBrand({
      procedureType: r.procedure_type,
      brand: r.brand || null,
      perUnitPrice: perUnit,
    });
    return info?.isDysport;
  });
  const hasDaxxify = rows.some(
    (r) => r.brand && r.brand.toLowerCase() === 'daxxify',
  );

  // Try to pull a per-unit Botox-equivalent price off the Dysport row so we
  // can show the exact calculated equivalent (2.5× units) rather than a
  // generic multiplier blurb. Only trust the pre-normalized per-unit value.
  const dysportPerUnit =
    dysportRow &&
    dysportRow.normalized_compare_unit === 'per unit' &&
    Number.isFinite(Number(dysportRow.normalized_compare_value))
      ? Number(dysportRow.normalized_compare_value)
      : null;

  return (
    <Wrapper
      {...wrapperProps}
      className="group block glow-card p-5 hover:no-underline"
    >
      {/* Active special banner — driven by the lead row's provider. */}
      <SpecialBanner
        text={lead.active_special}
        expiresAt={lead.special_expires_at}
      />

      {/* Kicker — brands, uppercase tracked */}
      <p className="editorial-kicker mb-2">
        {distinctBrands.map((b) => b.toUpperCase()).join(' / ')}
      </p>

      {/* Lead price — "From $X / unit" */}
      <div className="flex items-baseline gap-2 mb-3 flex-wrap">
        <span className="price-display-light whitespace-normal">
          {leadPriceDisplay(lead)}
        </span>
      </div>

      {/* FairPrice badge for the lead */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <FairPriceBadge
          price={lead.normalized_compare_value || lead.price_paid}
          procedureType={lead.procedure_type}
          state={lead.state}
          city={lead.city}
        />
      </div>

      {/* Per-brand rows list */}
      <div
        className="mt-1 mb-1"
        style={{ borderTop: '1px solid #F0F0F0', paddingTop: '10px' }}
      >
        {rows.map((row, idx) => {
          const label = brandLabel(row);
          return (
            <div
              key={`${row.id || idx}-${brandKey(row)}`}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <span
                className="text-[13px] text-ink"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
              >
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] text-ink"
                  style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}
                >
                  {priceDisplay(row)}
                </span>
                <span
                  className="inline-flex items-center text-[10px] font-medium uppercase text-hot-pink border border-hot-pink/40 px-2 py-0.5"
                  style={{ letterSpacing: '0.06em', borderRadius: '4px' }}
                  title={`${label} listed by ${row.provider_name || 'this provider'}`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dysport equivalency note — shown once per group if any row is Dysport */}
      {dysportRow && (
        <p
          className="italic mb-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '11px',
            color: '#B8A89A',
            lineHeight: 1.4,
          }}
          title="Dysport requires approximately 2.5× more units than Botox for equivalent effect"
        >
          {dysportPerUnit
            ? `Dysport \u2248 $${(dysportPerUnit * 2.5).toFixed(2)} Botox equivalent (2.5\u00D7 units)`
            : 'Dysport units \u2260 Botox units. Typically 2.5\u00D7 more units needed.'}
        </p>
      )}

      {/* Daxxify longevity note — shown once per group if any row is Daxxify */}
      {hasDaxxify && (
        <p
          className="italic mb-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '11px',
            color: '#B8A89A',
            lineHeight: 1.4,
          }}
          title="Daxxify is formulated to last longer than traditional neurotoxins"
        >
          Daxxify lasts 6+ months vs 3&ndash;4 for Botox.
        </p>
      )}

      {/* Provider row — divider above */}
      <div className="pt-3 mt-1" style={{ borderTop: '1px solid #F0F0F0' }}>
        <div className="flex items-center gap-2.5">
          <ProviderAvatar name={lead.provider_name} size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">
              {lead.provider_name}
            </p>
            {lead.city && lead.state && (
              <p className="text-[11px] font-light text-text-secondary">
                {lead.city}, {lead.state}
                {distanceLabel && (
                  <span className="text-text-secondary"> &middot; {distanceLabel}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade slot — unclaimed providers with no active special. */}
      {!hasActiveSpecial(lead.active_special, lead.special_expires_at) &&
        lead.is_claimed === false && <SpecialUpgradeSlot />}
    </Wrapper>
  );
}
