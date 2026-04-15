import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatPricingUnit } from '../../utils/formatPricingUnit';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const HOT_PINK = '#E8347A';
const CARD_BG = '#FFFCF7';
const BORDER  = '#EDE8E3';
const FONT_DISPLAY = 'var(--font-display)';
const FONT_BODY    = 'var(--font-body)';

export default function DemandIntelTab({ provider, tierHelpers, onPostSpecial }) {
  const [intel, setIntel] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!provider?.id) return;

    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      const [intelRes, heatmapRes] = await Promise.all([
        supabase.rpc('get_provider_demand_intel', {
          p_provider_id: provider.id,
        }),
        supabase.rpc('get_city_demand_heatmap', {
          p_provider_id: provider.id,
        }),
      ]);

      if (cancelled) return;

      if (intelRes.error || heatmapRes.error) {
        setError(intelRes.error || heatmapRes.error);
      } else {
        setIntel(intelRes.data || []);
        setHeatmap(heatmapRes.data || []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [provider?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: HOT_PINK }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: '2px',
          padding: '24px',
          fontFamily: FONT_BODY,
          color: '#666',
        }}
      >
        Demand intel is temporarily unavailable. Try again in a moment.
      </div>
    );
  }

  const heatmapData = heatmap.map((row) => ({
    label: row.procedure_type,
    count: row.alert_count,
  }));

  const hasMenuRows = intel.length > 0;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: '28px',
            color: '#111',
            margin: 0,
          }}
        >
          Demand Intel
        </h2>
        <p
          className="mt-1"
          style={{ fontFamily: FONT_BODY, color: '#666', fontSize: '14px' }}
        >
          See how many patients near you are watching for the procedures on your menu.
        </p>
      </div>

      {/* ── 1. City heatmap (always visible) ───────────────────── */}
      <div
        className="mb-8"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderTop: `3px solid ${HOT_PINK}`,
          borderRadius: '2px',
          padding: '24px',
        }}
      >
        <p
          className="mb-1"
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: '10px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: '#888',
          }}
        >
          City Heatmap
        </p>
        <p
          className="mb-4"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: '20px',
            color: '#111',
          }}
        >
          Procedures patients near you are watching
        </p>

        {heatmapData.length === 0 ? (
          <p
            style={{
              fontFamily: FONT_BODY,
              color: '#666',
              fontSize: '14px',
            }}
          >
            No active alerts in {provider?.city || 'your city'} yet. Check back as
            patients in the area set up alerts for procedures on your menu.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={heatmapData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                width={140}
              />
              <Tooltip cursor={{ fill: 'rgba(232,52,122,0.06)' }} />
              <Bar
                dataKey="count"
                fill={HOT_PINK}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 2. Empty state when nothing on the menu matches alerts ── */}
      {!hasMenuRows && (
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: '2px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <Sparkles
            size={28}
            style={{ color: HOT_PINK, margin: '0 auto 12px' }}
          />
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: '20px',
              color: '#111',
              margin: 0,
            }}
          >
            No alerts in {provider?.city || 'your city'} yet for procedures on your menu
          </p>
          <p
            className="mt-2"
            style={{
              fontFamily: FONT_BODY,
              color: '#666',
              fontSize: '14px',
            }}
          >
            Add prices on the Menu tab to start matching the patients in this city.
          </p>
          <Link
            to="/business/dashboard?tab=menu"
            className="inline-block mt-4"
            style={{
              background: HOT_PINK,
              color: '#fff',
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              borderRadius: '2px',
            }}
          >
            Go to Menu
          </Link>
        </div>
      )}

      {/* ── 3. Per-procedure cards ─────────────────────────────── */}
      {hasMenuRows && (
        <div className="space-y-4">
          {intel.map((row) => (
            <DemandCard
              key={row.procedure_type}
              row={row}
              provider={provider}
              tierHelpers={tierHelpers}
              onPostSpecial={onPostSpecial}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DemandCard({ row, provider, tierHelpers, onPostSpecial }) {
  const isPaid = tierHelpers?.isPaid;
  const cityLabel = provider?.city || 'your city';
  const procedureLabel = ((n) => !n ? 'Treatment' : n.includes('/') ? 'Neurotoxin' : n)(row.procedure_type);
  const alertCount = Number(row.alert_count || 0);
  const avgThreshold = row.avg_threshold ? Number(row.avg_threshold) : null;
  const currentPrice = row.current_price ? Number(row.current_price) : null;
  const alreadyReachable = Number(row.already_reachable || 0);
  const reachable10 = Number(row.reachable_with_10pct || 0);

  // Suggested promo price = avg threshold (rounded), falling back to a
  // 10%-off-current-price if no alerts have explicit thresholds.
  const suggestedPrice =
    avgThreshold && Number.isFinite(avgThreshold)
      ? Math.round(avgThreshold)
      : currentPrice
      ? Math.round(currentPrice * 0.9)
      : null;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: '2px',
        padding: '20px',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: '18px',
            color: '#111',
            margin: 0,
          }}
        >
          {procedureLabel}
        </p>
        {!isPaid && (
          <Lock size={14} style={{ color: '#888' }} />
        )}
      </div>

      <p
        className="mb-4"
        style={{
          fontFamily: FONT_BODY,
          color: '#333',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 700, color: HOT_PINK }}>
          {alertCount}
        </span>{' '}
        {alertCount === 1 ? 'patient in ' : 'patients in '}
        {cityLabel} have a {procedureLabel} alert
      </p>

      {/* Actionability block — blurred for free tier */}
      <div style={{ position: 'relative' }}>
        <div
          style={
            !isPaid
              ? {
                  filter: 'blur(5px)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }
              : undefined
          }
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            style={{ fontFamily: FONT_BODY, fontSize: '13px', color: '#444' }}
          >
            <div>
              <span style={{ color: '#888' }}>Avg threshold</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111' }}>
                {avgThreshold !== null ? `$${avgThreshold.toFixed(0)}` : '—'}
              </p>
            </div>
            <div>
              <span style={{ color: '#888' }}>Your menu price</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111' }}>
                {currentPrice !== null
                  ? `$${currentPrice.toFixed(0)}${
                      row.current_price_label && formatPricingUnit(row.current_price_label)
                        ? ` ${formatPricingUnit(row.current_price_label)}`
                        : ''
                    }`
                  : '—'}
              </p>
            </div>
            <div>
              <span style={{ color: '#888' }}>Already reachable</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111' }}>
                {alreadyReachable} {alreadyReachable === 1 ? 'patient' : 'patients'}
              </p>
            </div>
            <div>
              <span style={{ color: '#888' }}>Reachable at 10% off</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111' }}>
                +{reachable10} {reachable10 === 1 ? 'patient' : 'patients'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA row */}
      <div className="mt-5">
        {isPaid ? (
          suggestedPrice !== null && (
            <button
              type="button"
              onClick={() =>
                onPostSpecial?.({
                  procedure_type: procedureLabel,
                  suggested_price: suggestedPrice,
                })
              }
              style={{
                background: HOT_PINK,
                color: '#fff',
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: '12px',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                padding: '10px 18px',
                borderRadius: '2px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Post a ${suggestedPrice} special →
            </button>
          )
        ) : (
          <Link
            to="/business/dashboard?tab=settings"
            style={{
              color: HOT_PINK,
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.04em',
              textDecoration: 'none',
            }}
          >
            Upgrade to reach them →
          </Link>
        )}
      </div>
    </div>
  );
}
