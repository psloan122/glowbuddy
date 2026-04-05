import { Link } from 'react-router-dom';

export default function OutcomePill({ slug, label, selected, onClick }) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition border ${
          selected
            ? 'border-[#0369A1] bg-[#E0F2FE] text-[#0369A1]'
            : 'border-gray-200 bg-white text-text-secondary hover:border-[#0369A1] hover:text-[#0369A1]'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      to={`/goals/${slug}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition border border-gray-200 bg-white text-text-secondary hover:border-[#0369A1] hover:text-[#0369A1]"
    >
      {label}
    </Link>
  );
}
