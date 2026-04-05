import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import OutcomeCard from './OutcomeCard';
import GoalSearchBar from './GoalSearchBar';

export default function OutcomeSelector() {
  const [outcomes, setOutcomes] = useState([]);
  const [treatmentCounts, setTreatmentCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: outcomeData } = await supabase
        .from('outcomes')
        .select('*')
        .order('sort_order');

      const { data: countData } = await supabase
        .from('outcome_treatments')
        .select('outcome_id');

      if (outcomeData) setOutcomes(outcomeData);

      if (countData) {
        const counts = {};
        for (const row of countData) {
          counts[row.outcome_id] = (counts[row.outcome_id] || 0) + 1;
        }
        setTreatmentCounts(counts);
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary animate-pulse text-sm">Loading goals...</p>
      </div>
    );
  }

  return (
    <div>
      <GoalSearchBar outcomes={outcomes} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {outcomes.map((outcome) => (
          <OutcomeCard
            key={outcome.id}
            outcome={outcome}
            treatmentCount={treatmentCounts[outcome.id] || 0}
          />
        ))}
      </div>
    </div>
  );
}
