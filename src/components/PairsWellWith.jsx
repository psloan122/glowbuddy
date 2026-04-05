import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StackCompatibilityCard from './StackCompatibilityCard';

export default function PairsWellWith({ treatmentName }) {
  const [rules, setRules] = useState([]);
  const [localPrices, setLocalPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!treatmentName) return;

    async function load() {
      setLoading(true);

      // Fetch good combos for this treatment
      const { data } = await supabase
        .from('treatment_stacking')
        .select('*')
        .or(`treatment_a.eq.${treatmentName},treatment_b.eq.${treatmentName}`)
        .in('compatibility', ['great_combo', 'same_day_ok'])
        .limit(6);

      const sorted = (data || []).sort((a, b) => {
        const order = { great_combo: 0, same_day_ok: 1 };
        return (order[a.compatibility] || 0) - (order[b.compatibility] || 0);
      });

      setRules(sorted.slice(0, 3));

      // Fetch local average prices for the paired treatments
      const otherNames = sorted.slice(0, 3).map((r) =>
        r.treatment_a === treatmentName ? r.treatment_b : r.treatment_a
      );

      if (otherNames.length > 0) {
        const { data: priceData } = await supabase
          .from('procedures')
          .select('procedure_type, price_paid')
          .eq('status', 'active')
          .in('procedure_type', otherNames);

        const grouped = {};
        (priceData || []).forEach((p) => {
          if (!grouped[p.procedure_type]) grouped[p.procedure_type] = { total: 0, count: 0 };
          grouped[p.procedure_type].total += Number(p.price_paid) || 0;
          grouped[p.procedure_type].count += 1;
        });

        const avgs = {};
        Object.entries(grouped).forEach(([type, { total, count }]) => {
          avgs[type] = Math.round(total / count);
        });
        setLocalPrices(avgs);
      }

      setLoading(false);
    }

    load();
  }, [treatmentName]);

  if (loading || rules.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-4">
        <Sparkles size={18} className="text-emerald-500" />
        Pairs Well With {treatmentName}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map((rule) => {
          const other = rule.treatment_a === treatmentName ? rule.treatment_b : rule.treatment_a;
          return (
            <StackCompatibilityCard
              key={rule.id}
              rule={rule}
              otherTreatment={other}
              localPrice={localPrices[other]}
            />
          );
        })}
      </div>
    </div>
  );
}
