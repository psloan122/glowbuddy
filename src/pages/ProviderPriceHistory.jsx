/**
 * ProviderPriceHistory — /provider/:slug/prices
 *
 * Full price history for a provider. Grouped by procedure type, each row
 * shows price, unit, date reported, source, and confidence tier. Sort and
 * filter controls at the top. Price trend line per group when ≥3 points exist.
 *
 * Designed to feel like a receipt — clean, date-stamped, sourced, shareable.
 */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Globe,
  Users,
  Flag,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizePrice, groupForProviderDisplay } from '../lib/priceUtils';
import { getProcedureLabel } from '../lib/procedureLabel';
import { setPageMeta } from '../lib/seo';

const FONT_BODY = 'var(--font-body)';
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const HOT_PINK = '#E8347A';
const BORDER = '#EDE8E3';
const CARD_BG = '#FFFCF7';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sourceInfo(item) {
  if (item.source === 'community' || (item.source === 'manual' && !item.verified)) {
    return { label: 'Community', icon: <Users size={10} />, style: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' } };
  }
  if (item.verified === true) {
    return { label: 'Verified', icon: <ShieldCheck size={10} />, style: { background: '#F0FAF5', color: '#1A7A3A', border: '1px solid #1A7A3A' } };
  }
  if (item.source === 'scrape') {
    return { label: 'Public menu', icon: <Globe size={10} />, style: { background: '#F5F2EE', color: '#888', border: '1px dashed #CCC' } };
  }
  if (item.source === 'business_menu') {
    return { label: 'Provider', icon: <ShieldCheck size={10} />, style: { background: '#F5F2EE', color: '#555', border: '1px solid #DDD' } };
  }
  return null;
}

function confidenceTierLabel(tier) {
  if (tier == null) return null;
  if (tier <= 1) return { label: 'High', color: '#1A7A3A' };
  if (tier <= 2) return { label: 'Good', color: '#B45309' };
  if (tier <= 3) return { label: 'Fair', color: '#888' };
  return null;
}

// Build an ordered list of prices for the trend line (oldest → newest)
function buildTrend(items) {
  const dated = items
    .map((item) => {
      const n = normalizePrice(item);
      const v = n.comparableValue;
      const ts = item.scraped_at || item.created_at;
      return v != null && ts ? { value: v, ts: new Date(ts).getTime(), label: n.displayPrice } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);

  if (dated.length < 2) return null;
  return dated;
}

function TrendLine({ items }) {
  const trend = buildTrend(items);
  if (!trend) return null;

  const first = trend[0];
  const last = trend[trend.length - 1];
  const diff = last.value - first.value;
  const pct = Math.round((diff / first.value) * 100);
  const isUp = diff > 0;
  const isFlat = diff === 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        borderRadius: 3,
        background: isFlat ? '#F5F2EE' : isUp ? '#FFF1F5' : '#F0FAF5',
        border: `1px solid ${isFlat ? '#DDD' : isUp ? '#F8C2D6' : '#BBF0D0'}`,
        marginBottom: 10,
        flexWrap: 'wrap',
      }}
    >
      {isFlat ? null : isUp
        ? <TrendingUp size={13} style={{ color: '#C8001A', flexShrink: 0 }} />
        : <TrendingDown size={13} style={{ color: '#1A7A3A', flexShrink: 0 }} />}
      <span
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12,
          color: isFlat ? '#888' : isUp ? '#C8001A' : '#1A7A3A',
          fontWeight: 500,
        }}
      >
        {trend.map((t) => t.label).join(' → ')}
        {!isFlat && (
          <span style={{ marginLeft: 6, fontWeight: 700 }}>
            {isUp ? '↑' : '↓'} {Math.abs(pct)}% over {trend.length} data point{trend.length !== 1 ? 's' : ''}
          </span>
        )}
        {isFlat && ' — price stable across reported data'}
      </span>
    </div>
  );
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

function sortItems(items, sort) {
  const copy = [...items];
  if (sort === 'oldest') {
    return copy.sort((a, b) => new Date(a.scraped_at || a.created_at || 0) - new Date(b.scraped_at || b.created_at || 0));
  }
  if (sort === 'newest') {
    return copy.sort((a, b) => new Date(b.scraped_at || b.created_at || 0) - new Date(a.scraped_at || a.created_at || 0));
  }
  if (sort === 'low') {
    return copy.sort((a, b) => Number(a.price) - Number(b.price));
  }
  if (sort === 'high') {
    return copy.sort((a, b) => Number(b.price) - Number(a.price));
  }
  return copy;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PriceHistoryRow({ item, onFlag }) {
  const normalized = normalizePrice(item);
  const src = sourceInfo(item);
  const tier = confidenceTierLabel(item.confidence_tier);
  const dateTs = item.scraped_at || item.created_at;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '8px 16px',
        padding: '12px 16px',
        borderBottom: `1px solid ${BORDER}`,
        alignItems: 'start',
      }}
    >
      {/* Left: meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          {src && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '1px 6px', borderRadius: 3,
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: FONT_BODY,
                ...src.style,
              }}
            >
              {src.icon}{src.label}
            </span>
          )}
          {tier && (
            <span
              style={{
                fontFamily: FONT_BODY, fontSize: 9, fontWeight: 600,
                color: tier.color, letterSpacing: '0.06em',
              }}
            >
              {tier.label} confidence
            </span>
          )}
          {item.treatment_area && (
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: '#888' }}>
              {item.treatment_area}
            </span>
          )}
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: '#AAA', margin: 0 }}>
          {dateTs ? formatDate(dateTs) : 'Date unknown'}
          {item.source === 'scrape' && item.source_url && (
            <>
              {' · '}
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#888', textDecoration: 'underline' }}
              >
                source ↗
              </a>
            </>
          )}
        </p>
        {item.notes && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: '#888', marginTop: 3, fontStyle: 'italic' }}>
            {item.notes}
          </p>
        )}
      </div>

      {/* Right: price + flag */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 18,
            color: '#111', margin: 0, lineHeight: 1.1,
          }}
        >
          {normalized.displayPrice}
        </p>
        <button
          type="button"
          onClick={() => onFlag?.(item)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '3px 0', display: 'inline-flex', alignItems: 'center',
            gap: 3, color: '#CCC', marginTop: 4,
          }}
          title="Flag this price as incorrect"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#999'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#CCC'; }}
        >
          <Flag size={11} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 10 }}>flag</span>
        </button>
      </div>
    </div>
  );
}

function ProcedureGroup({ procedureType, items, sort, onFlag }) {
  const [expanded, setExpanded] = useState(true);
  const label = getProcedureLabel(procedureType, null);
  const sorted = sortItems(items, sort);
  const displayCount = items.length;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '12px 16px',
          background: '#FBF8F5', border: 'none', cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${BORDER}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13,
              color: '#111', letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: FONT_BODY, fontSize: 10, color: '#888',
              background: '#EDE8E3', padding: '2px 7px', borderRadius: 10,
            }}
          >
            {displayCount} record{displayCount !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown
          size={15}
          style={{
            color: '#888', flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {expanded && (
        <>
          <TrendLine items={items} />
          <div>
            {sorted.map((item) => (
              <PriceHistoryRow key={item.id} item={item} onFlag={onFlag} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProviderPriceHistory() {
  const { slug } = useParams();

  const [provider, setProvider] = useState(null);
  const [allPrices, setAllPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filterProc, setFilterProc] = useState('all');
  const [flagTarget, setFlagTarget] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: provRow } = await supabase
        .from('providers')
        .select('id, name, slug, city, state')
        .eq('slug', slug)
        .single();

      if (!provRow) {
        setLoading(false);
        return;
      }

      setProvider(provRow);
      setPageMeta(
        `${provRow.name} — Full Price History`,
        `All reported prices for ${provRow.name} in ${provRow.city}, ${provRow.state}. Sourced and date-stamped.`
      );

      const { data: pricing } = await supabase
        .from('provider_pricing')
        .select('id, provider_id, procedure_type, brand, price, units_or_volume, treatment_area, price_label, notes, source, verified, source_url, confidence_tier, scraped_at, created_at')
        .eq('provider_id', provRow.id)
        .eq('display_suppressed', false)
        .lt('confidence_tier', 6)
        .order('created_at', { ascending: false });

      setAllPrices(pricing || []);
      setLoading(false);
    }

    load();
  }, [slug]);

  // Group, filter
  const grouped = groupForProviderDisplay(allPrices);
  const allProcTypes = Object.keys(grouped);
  const filteredGrouped = filterProc === 'all'
    ? grouped
    : Object.fromEntries(Object.entries(grouped).filter(([k]) => k === filterProc));

  const visibleGroups = Object.entries(filteredGrouped).filter(([, g]) => g.items.length > 0);

  const totalVisible = visibleGroups.reduce((s, [, g]) => s + g.items.length, 0);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: FONT_BODY, color: '#888', fontSize: 14 }}>Loading prices…</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ fontFamily: FONT_BODY, color: '#888', fontSize: 14, marginBottom: 16 }}>Provider not found.</p>
        <Link to="/browse" style={{ color: HOT_PINK, fontFamily: FONT_BODY, fontSize: 13 }}>← Back to search</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFCF7', paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          background: 'white',
          borderBottom: `1px solid ${BORDER}`,
          padding: '16px 16px 0',
          position: 'sticky',
          top: 'calc(52px + env(safe-area-inset-top, 0px))',
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Back link */}
          <Link
            to={`/provider/${slug}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: FONT_BODY, fontSize: 12, color: '#888',
              textDecoration: 'none', marginBottom: 10,
            }}
          >
            <ArrowLeft size={13} />
            {provider.name}
          </Link>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <h1
              style={{
                fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 22,
                color: '#111', margin: 0, lineHeight: 1.15,
              }}
            >
              Price History
            </h1>
            <span
              style={{
                fontFamily: FONT_BODY, fontSize: 11, color: '#888',
                fontWeight: 400,
              }}
            >
              {provider.city}, {provider.state}
            </span>
          </div>

          {/* Controls row */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              paddingBottom: 12, flexWrap: 'wrap',
            }}
          >
            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ArrowUpDown size={12} style={{ color: '#888' }} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{
                  fontFamily: FONT_BODY, fontSize: 12, color: '#333',
                  border: `1px solid ${BORDER}`, borderRadius: 3,
                  padding: '4px 8px', background: 'white', cursor: 'pointer',
                }}
              >
                <option value="newest">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="low">Lowest price</option>
                <option value="high">Highest price</option>
              </select>
            </div>

            {/* Filter by procedure */}
            {allProcTypes.length > 1 && (
              <select
                value={filterProc}
                onChange={(e) => setFilterProc(e.target.value)}
                style={{
                  fontFamily: FONT_BODY, fontSize: 12, color: '#333',
                  border: `1px solid ${BORDER}`, borderRadius: 3,
                  padding: '4px 8px', background: 'white', cursor: 'pointer',
                }}
              >
                <option value="all">All procedures</option>
                {allProcTypes.map((pt) => (
                  <option key={pt} value={pt}>{getProcedureLabel(pt, null)}</option>
                ))}
              </select>
            )}

            <span
              style={{
                fontFamily: FONT_BODY, fontSize: 11, color: '#AAA',
                marginLeft: 'auto',
              }}
            >
              {totalVisible} record{totalVisible !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ maxWidth: 720, margin: '12px auto 0', padding: '0 16px' }}>
        <p
          style={{
            fontFamily: FONT_BODY, fontSize: 11, color: '#B8A89A',
            lineHeight: 1.5, margin: 0,
          }}
        >
          Prices are sourced from public provider menus, community submissions, and verified receipts.
          GlowBuddy is independent — no paid placements.{' '}
          <Link
            to={`/log?provider_id=${provider.id}&provider=${encodeURIComponent(provider.name)}&city=${encodeURIComponent(provider.city)}&state=${encodeURIComponent(provider.state)}&slug=${encodeURIComponent(slug)}`}
            style={{ color: HOT_PINK, textDecoration: 'none', fontWeight: 600 }}
          >
            Add a price you paid →
          </Link>
        </p>
      </div>

      {/* Groups */}
      <div style={{ maxWidth: 720, margin: '16px auto 0', padding: '0 16px' }}>
        {visibleGroups.length === 0 ? (
          <div
            style={{
              textAlign: 'center', padding: '48px 24px',
              background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 2,
            }}
          >
            <p style={{ fontFamily: FONT_BODY, color: '#888', fontSize: 14 }}>
              No price records found.
            </p>
          </div>
        ) : (
          visibleGroups.map(([procedureType, group]) => (
            <ProcedureGroup
              key={procedureType}
              procedureType={procedureType}
              items={group.items}
              sort={sort}
              onFlag={setFlagTarget}
            />
          ))
        )}
      </div>

      {/* Flag modal (simple toast — full dispute form is on provider page) */}
      {flagTarget && (
        <div
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#111', color: 'white', padding: '10px 16px', borderRadius: 4,
            fontFamily: FONT_BODY, fontSize: 12, zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <Flag size={12} />
          Thanks — price flagged for review.
          <button
            type="button"
            onClick={() => setFlagTarget(null)}
            style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
