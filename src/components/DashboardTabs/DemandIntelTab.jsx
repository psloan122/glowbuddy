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

const BIZ_FONT = 'system-ui, -apple-system, sans-serif';
const TEAL = '#0D9488';

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
        <Loader2 size={24} className="animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-[13px] text-text-secondary" style={{ fontFamily: BIZ_FONT }}>
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
    <div style={{ fontFamily: BIZ_FONT }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[18px] font-semibold text-text-primary" style={{ fontFamily: BIZ_FONT }}>
          Demand Intel
        </h2>
        <p className="text-[13px] text-text-secondary mt-1">
          See how many patients near you are watching for the procedures on your menu.
        </p>
      </div>

      {/* City heatmap */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6" style={{ borderTop: `3px solid ${TEAL}` }}>
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
          City Heatmap
        </p>
        <p className="text-[16px] font-semibold text-text-primary mb-4" style={{ fontFamily: BIZ_FONT }}>
          Procedures patients near you are watching
        </p>

        {heatmapData.length === 0 ? (
          <p className="text-[13px] text-text-secondary">
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
              <XAxis type="number" tick={{ fontSize: 12, fontFamily: BIZ_FONT }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fontFamily: BIZ_FONT }}
                width={140}
              />
              <Tooltip cursor={{ fill: 'rgba(13,148,136,0.06)' }} />
              <Bar
                dataKey="count"
                fill={TEAL}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Empty state */}
      {!hasMenuRows && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Sparkles size={24} style={{ color: TEAL, margin: '0 auto 12px' }} />
          <p className="text-[16px] font-semibold text-text-primary" style={{ fontFamily: BIZ_FONT }}>
            No alerts in {provider?.city || 'your city'} yet for procedures on your menu
          </p>
          <p className="text-[13px] text-text-secondary mt-2">
            Add prices on the Menu tab to start matching the patients in this city.
          </p>
          <Link
            to="/business/dashboard?tab=menu"
            className="inline-block mt-4 text-white px-4 py-2 rounded-md text-[13px] font-semibold"
            style={{ background: TEAL }}
          >
            Go to Menu
          </Link>
        </div>
      )}

      {/* Per-procedure cards */}
      {hasMenuRows && (
        <div className="space-y-3">
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

  const suggestedPrice =
    avgThreshold && Number.isFinite(avgThreshold)
      ? Math.round(avgThreshold)
      : currentPrice
      ? Math.round(currentPrice * 0.9)
      : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[16px] font-semibold text-text-primary" style={{ fontFamily: BIZ_FONT }}>
          {procedureLabel}
        </p>
        {!isPaid && <Lock size={14} className="text-text-secondary" />}
      </div>

      <p className="text-[13px] text-text-primary mb-4">
        <span className="font-bold" style={{ color: TEAL }}>
          {alertCount}
        </span>{' '}
        {alertCount === 1 ? 'patient in ' : 'patients in '}
        {cityLabel} have a {procedureLabel} alert
      </p>

      {/* Actionability block */}
      <div style={{ position: 'relative' }}>
        <div
          style={
            !isPaid
              ? { filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }
              : undefined
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
            <div>
              <span className="text-[11px] text-text-secondary uppercase tracking-wide">Avg threshold</span>
              <p className="font-bold text-text-primary mt-0.5">
                {avgThreshold !== null ? `$${avgThreshold.toFixed(0)}` : '—'}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-text-secondary uppercase tracking-wide">Your price</span>
              <p className="font-bold text-text-primary mt-0.5">
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
              <span className="text-[11px] text-text-secondary uppercase tracking-wide">Reachable now</span>
              <p className="font-bold text-text-primary mt-0.5">
                {alreadyReachable} {alreadyReachable === 1 ? 'patient' : 'patients'}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-text-secondary uppercase tracking-wide">At 10% off</span>
              <p className="font-bold text-text-primary mt-0.5">
                +{reachable10} {reachable10 === 1 ? 'patient' : 'patients'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4">
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
              className="text-white px-4 py-2 rounded-md text-[13px] font-semibold border-none cursor-pointer"
              style={{ background: TEAL }}
            >
              Post a ${suggestedPrice} special →
            </button>
          )
        ) : (
          <Link
            to="/business/dashboard?tab=settings"
            className="text-[13px] font-semibold no-underline"
            style={{ color: TEAL }}
          >
            Upgrade to reach them →
          </Link>
        )}
      </div>
    </div>
  );
}
