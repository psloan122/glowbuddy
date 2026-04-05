import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GoalSearchBar({ outcomes }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Client-side fuzzy match
  const q = query.trim().toLowerCase();
  const matches = q.length >= 2
    ? outcomes.filter((o) => {
        const text = `${o.label} ${o.description}`.toLowerCase();
        return q.split(/\s+/).some((word) => word.length >= 2 && text.includes(word));
      }).slice(0, 6)
    : [];

  function selectOutcome(outcome) {
    setQuery('');
    setOpen(false);
    navigate(`/goals/${outcome.slug}`);
  }

  return (
    <div ref={ref} className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
      />
      <input
        type="text"
        placeholder="Describe your goal... (e.g. look less tired)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) selectOutcome(matches[0]);
          if (e.key === 'Escape') setOpen(false);
        }}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0369A1] focus:ring-2 focus:ring-sky-200/50 outline-none transition text-sm"
      />

      {open && q.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
          {matches.length > 0 ? (
            matches.map((o) => (
              <button
                key={o.slug}
                onClick={() => selectOutcome(o)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50/60 transition-colors"
              >
                <span className="font-medium text-text-primary">{o.label}</span>
                <span className="text-text-secondary ml-2 text-xs">{o.description}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-text-secondary">
              No matching goals found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
