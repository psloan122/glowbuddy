import { useState, useEffect, useMemo } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TREATMENT_COLORS = {
  'Botox / Dysport / Xeomin': '#C94F78',
  'Lip Filler': '#8B5CF6',
  'Cheek Filler': '#6366F1',
  'Microneedling': '#10B981',
  'RF Microneedling': '#059669',
  'Chemical Peel': '#F59E0B',
  'HydraFacial': '#0EA5E9',
  'PRP/PRF': '#EF4444',
  'Sculptra': '#EC4899',
  'Kybella': '#F97316',
};

function getColor(name) {
  return TREATMENT_COLORS[name] || '#6B7280';
}

export default function RoutineVisualizer({ treatments, conflicts, cadenceMap: cadenceMapProp, localPrices }) {
  const [fetchedCadence, setFetchedCadence] = useState({});

  // Fallback fetch if cadenceMap not passed as prop (backward compat with StackBuilder)
  useEffect(() => {
    if (cadenceMapProp) return;
    supabase
      .from('treatment_cadence')
      .select('treatment_name, recommended_weeks_between')
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((c) => { map[c.treatment_name] = c.recommended_weeks_between; });
        setFetchedCadence(map);
      });
  }, [cadenceMapProp]);

  const cadenceMap = cadenceMapProp || fetchedCadence;

  // Build 6-month calendar with treatments plotted
  const calendar = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        shortLabel: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        events: [],
      });
    }

    // Plot each treatment by cadence (default 12 weeks if missing)
    (treatments || []).forEach((name) => {
      const weeks = cadenceMap[name] || 12;
      const intervalDays = weeks * 7;
      let date = new Date(now);

      for (let attempt = 0; attempt < 10; attempt++) {
        const monthIdx = months.findIndex(
          (m) => m.year === date.getFullYear() && m.month === date.getMonth()
        );
        if (monthIdx >= 0 && monthIdx < months.length) {
          months[monthIdx].events.push({
            treatment: name,
            day: date.getDate(),
            date: new Date(date),
            weeks,
            price: (localPrices && localPrices[name]) || null,
          });
        }
        date = new Date(date.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        if (date > new Date(now.getFullYear(), now.getMonth() + 6, 0)) break;
      }
    });

    return months;
  }, [treatments, cadenceMap, localPrices]);

  // Build conflict map for inline warnings
  const conflictMap = useMemo(() => {
    const map = {};
    if (!conflicts || conflicts.length === 0) return map;
    conflicts.forEach((c) => {
      const key = [c.treatment_a, c.treatment_b].sort().join('|');
      map[key] = c;
    });
    return map;
  }, [conflicts]);

  // Find conflicts per month
  const monthConflicts = useMemo(() => {
    const result = {};
    if (!conflicts || conflicts.length === 0) return result;

    calendar.forEach((month) => {
      const monthWarnings = [];
      for (let i = 0; i < month.events.length; i++) {
        for (let j = i + 1; j < month.events.length; j++) {
          const a = month.events[i];
          const b = month.events[j];
          const key = [a.treatment, b.treatment].sort().join('|');
          if (conflictMap[key]) {
            const dayDiff = Math.abs(a.day - b.day);
            if (dayDiff < 14) {
              monthWarnings.push({
                treatments: [a.treatment, b.treatment],
                rule: conflictMap[key],
              });
            }
          }
        }
      }
      if (monthWarnings.length > 0) {
        result[month.label] = monthWarnings;
      }
    });

    return result;
  }, [calendar, conflicts, conflictMap]);

  if (!treatments || treatments.length === 0) {
    return (
      <div className="glow-card p-6 text-center">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-text-secondary">Select treatments to see your 6-month routine calendar.</p>
      </div>
    );
  }

  // Filter to months that have events
  const activeMonths = calendar.filter((m) => m.events.length > 0);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {treatments.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: getColor(name) }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Month-by-month vertical list */}
      <div className="space-y-4">
        {activeMonths.map((month) => {
          const monthTotal = month.events.reduce((sum, e) => sum + (e.price || 150), 0);
          const warnings = monthConflicts[month.label] || [];

          return (
            <div key={month.label} className="glow-card p-4">
              {/* Month header */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#C94F78' }}>
                  {month.label}
                </h4>
                <span className="text-sm font-medium text-text-secondary">
                  ~${monthTotal.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-gray-200 mb-3" />

              {/* Treatment rows */}
              <div className="space-y-3">
                {month.events.map((event, i) => (
                  <div key={`${event.treatment}-${i}`} className="flex items-start gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: getColor(event.treatment) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {event.treatment}
                        </span>
                        <span className="text-xs text-text-secondary shrink-0">
                          ~{MONTHS_SHORT[month.month]} {event.day}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Every {event.weeks} weeks{event.price ? ` · ~$${event.price.toLocaleString()}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inline conflict warnings for this month */}
              {warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        {warning.treatments[0]} and {warning.treatments[1]} are scheduled close together.
                        {warning.rule.timing_note && ` ${warning.rule.timing_note}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-secondary italic text-center mt-4">
        This calendar is an estimate based on recommended treatment cadences — not a booking tool. Consult your provider for personalized scheduling.
      </p>
    </div>
  );
}
