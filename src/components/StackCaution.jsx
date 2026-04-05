import { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function StackCaution({ treatmentName }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!treatmentName) return;

    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from('treatment_stacking')
        .select('*')
        .or(`treatment_a.eq.${treatmentName},treatment_b.eq.${treatmentName}`)
        .in('compatibility', ['space_apart', 'avoid']);

      const sorted = (data || []).sort((a, b) => {
        const order = { avoid: 0, space_apart: 1 };
        return (order[a.compatibility] || 0) - (order[b.compatibility] || 0);
      });

      setRules(sorted);
      setLoading(false);
    }

    load();
  }, [treatmentName]);

  if (loading || rules.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-4">
        <AlertTriangle size={18} className="text-amber-500" />
        Stacking Cautions
      </h2>
      <div className="space-y-2">
        {rules.map((rule) => {
          const other = rule.treatment_a === treatmentName ? rule.treatment_b : rule.treatment_a;
          const isAvoid = rule.compatibility === 'avoid';
          const isExpanded = expandedId === rule.id;

          return (
            <div
              key={rule.id}
              className={`rounded-xl border p-3 ${
                isAvoid ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-2">
                {isAvoid ? (
                  <span className="text-red-500 text-sm mt-0.5">🚫</span>
                ) : (
                  <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {isAvoid
                      ? `Avoid combining with ${other}.`
                      : `If you get ${other}, ${rule.timing_note?.toLowerCase() || 'space treatments apart.'}`}
                  </p>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                    className="mt-1 flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Why?
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 text-xs text-text-secondary border-t border-gray-200/50 pt-2">
                      <p>{rule.why}</p>
                      {rule.source_url && (
                        <a
                          href={rule.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 font-medium text-[#0369A1] hover:underline"
                        >
                          <ExternalLink size={10} />
                          {rule.source_type === 'fda_label'
                            ? 'FDA Label'
                            : rule.source_type === 'peer_reviewed'
                            ? 'Peer-reviewed source'
                            : 'Clinical source'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
