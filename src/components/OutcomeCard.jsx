import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function OutcomeCard({ outcome, treatmentCount }) {
  return (
    <Link
      to={`/goals/${outcome.slug}`}
      className="glow-card p-5 hover:border-[#0369A1]/30 transition group block"
    >
      <h3 className="font-semibold text-text-primary mb-1 group-hover:text-[#0369A1] transition">
        {outcome.label}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        {outcome.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {treatmentCount} treatment{treatmentCount !== 1 ? 's' : ''}
        </span>
        <ArrowRight size={16} className="text-text-secondary group-hover:text-[#0369A1] transition" />
      </div>
    </Link>
  );
}
