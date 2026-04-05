import { useState, useEffect, useMemo } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export default function RoutineVisualizer({ treatments, conflicts }) {
  const [cadenceMap, setCadenceMap] = useState({});

  useEffect(() => {
    supabase
      .from('treatment_cadence')
      .select('treatment_name, recommended_weeks_between')
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((c) => { map[c.treatment_name] = c.recommended_weeks_between; });
        setCadenceMap(map);
      });
  }, []);

  // Build 6-month calendar with treatments plotted
  const calendar = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        events: [],
      });
    }

    // Plot each treatment by cadence
    (treatments || []).forEach((name) => {
      const weeks = cadenceMap[name];
      if (!weeks) return;

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
          });
        }
        date = new Date(date.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        if (date > new Date(now.getFullYear(), now.getMonth() + 6, 0)) break;
      }
    });

    return months;
  }, [treatments, cadenceMap]);

  // Find conflicts in the calendar
  const conflictDates = useMemo(() => {
    const results = [];
    if (!conflicts || conflicts.length === 0) return results;

    const conflictMap = {};
    conflicts.forEach((c) => {
      const key = [c.treatment_a, c.treatment_b].sort().join('|');
      conflictMap[key] = c;
    });

    calendar.forEach((month) => {
      // Check for events within 14 days of each other that have conflicts
      for (let i = 0; i < month.events.length; i++) {
        for (let j = i + 1; j < month.events.length; j++) {
          const a = month.events[i];
          const b = month.events[j];
          const key = [a.treatment, b.treatment].sort().join('|');
          if (conflictMap[key]) {
            const dayDiff = Math.abs(a.day - b.day);
            if (dayDiff < 14) {
              results.push({
                month: month.label,
                treatments: [a.treatment, b.treatment],
                rule: conflictMap[key],
              });
            }
          }
        }
      }
    });

    return results;
  }, [calendar, conflicts]);

  if (!treatments || treatments.length === 0) {
    return (
      <div className="glow-card p-6 text-center">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-text-secondary">Select treatments to see your 6-month routine calendar.</p>
      </div>
    );
  }

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

      {/* Calendar grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {calendar.map((month) => (
          <div key={month.label} className="glow-card p-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              {month.label}
            </h4>
            {month.events.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No treatments</p>
            ) : (
              <div className="space-y-1.5">
                {month.events.map((event, i) => (
                  <div key={`${event.treatment}-${i}`} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getColor(event.treatment) }}
                    />
                    <span className="text-xs text-text-primary truncate">
                      {event.treatment.split(' / ')[0]}
                    </span>
                    <span className="text-[10px] text-text-secondary ml-auto">
                      ~{event.day}th
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Conflict warnings */}
      {conflictDates.length > 0 && (
        <div className="mt-4 space-y-2">
          {conflictDates.map((conflict, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  Potential conflict in {conflict.month}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {conflict.treatments[0]} and {conflict.treatments[1]} are scheduled too close together.
                  {conflict.rule.timing_note && ` ${conflict.rule.timing_note}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-secondary italic text-center mt-4">
        This calendar is an estimate based on recommended treatment cadences — not a booking tool. Consult your provider for personalized scheduling.
      </p>
    </div>
  );
}
