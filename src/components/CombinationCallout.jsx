import { Sparkles } from 'lucide-react';

export default function CombinationCallout({ treatments }) {
  if (!treatments || treatments.length < 2) return null;

  const primary = treatments.find((t) => t.relevance === 3);
  const supporting = treatments.filter((t) => t.relevance < 3).slice(0, 2);

  if (!primary || supporting.length === 0) return null;

  return (
    <div className="rounded-xl p-4 bg-gradient-to-r from-[#E0F2FE] to-[#F0F9FF] border border-sky-200">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-[#0369A1]" />
        <span className="text-sm font-semibold text-[#0369A1]">Combination Approach</span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">
        Many patients combine <span className="font-medium text-text-primary">{primary.treatment_name}</span>{' '}
        with{' '}
        {supporting.map((t, i) => (
          <span key={t.treatment_name}>
            {i > 0 && ' and '}
            <span className="font-medium text-text-primary">{t.treatment_name}</span>
          </span>
        ))}{' '}
        for enhanced results. Ask your provider about a treatment plan that addresses this goal from multiple angles.
      </p>
    </div>
  );
}
