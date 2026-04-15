/**
 * ProviderPriceSummary — compact 3-row price preview shown on the provider
 * detail page (OverviewTab). Shows the lead price per procedure type with
 * source badge, then a "View all N prices →" link to the full history page.
 */
import { Link } from 'react-router-dom';
import { ShieldCheck, Globe } from 'lucide-react';
import { normalizePrice, groupForProviderDisplay } from '../lib/priceUtils';
import { getProcedureLabel } from '../lib/procedureLabel';

const MAX_SUMMARY_ROWS = 3;

function sourceLabel(item) {
  if (item.verified === true && item.source === 'manual') return 'verified';
  if (item.source === 'scrape') return 'public menu';
  if (item.source === 'business_menu') return 'provider';
  return null;
}

export default function ProviderPriceSummary({ verifiedPricing, providerSlug }) {
  if (!verifiedPricing || verifiedPricing.length === 0) return null;

  // One bucket per procedure type, hidden rows already filtered
  const grouped = groupForProviderDisplay(verifiedPricing);
  const entries = Object.entries(grouped).filter(([, g]) => g.items.length > 0);
  if (entries.length === 0) return null;

  // Lead item per group = first item (groupForProviderDisplay preserves insertion order)
  const summaryRows = entries.slice(0, MAX_SUMMARY_ROWS).map(([procedureType, group]) => {
    const item = group.items[0];
    const normalized = item.normalized || normalizePrice(item);
    return { procedureType, item, normalized };
  });

  const totalCount = verifiedPricing.filter((item) => {
    const n = normalizePrice(item);
    return n.category !== 'hidden';
  }).length;

  return (
    <div>
      <div
        style={{
          border: '1px solid #EDE8E3',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {summaryRows.map(({ procedureType, item, normalized }, idx) => {
          const label = getProcedureLabel(procedureType, item.brand || null);
          const src = sourceLabel(item);
          return (
            <div
              key={procedureType}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: idx < summaryRows.length - 1 ? '1px solid #EDE8E3' : 'none',
                background: '#FFFCF7',
              }}
            >
              {/* Left: procedure name + source badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#111',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {label}
                </span>
                {src && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-body)',
                      ...(src === 'verified'
                        ? { background: '#F0FAF5', color: '#1A7A3A', border: '1px solid #1A7A3A' }
                        : { background: '#F5F2EE', color: '#888', border: '1px dashed #CCC' }),
                    }}
                  >
                    {src === 'verified' ? <ShieldCheck size={8} /> : <Globe size={8} />}
                    {src}
                  </span>
                )}
              </div>

              {/* Right: price */}
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 900,
                  fontSize: 16,
                  color: '#111',
                  whiteSpace: 'nowrap',
                  marginLeft: 12,
                }}
              >
                {normalized.displayPrice}
              </span>
            </div>
          );
        })}
      </div>

      {/* "View all" link */}
      {totalCount > 0 && (
        <div style={{ marginTop: 8 }}>
          <Link
            to={`/provider/${providerSlug}/prices`}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: '#E8347A',
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            View all {totalCount} reported price{totalCount !== 1 ? 's' : ''} →
          </Link>
        </div>
      )}
    </div>
  );
}
