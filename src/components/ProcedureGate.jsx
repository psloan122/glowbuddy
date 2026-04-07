import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PROCEDURE_PILLS } from '../lib/constants';

/**
 * Procedure-selection gate shown on the browse/map page when no procedure
 * has been chosen yet. Two visual variants:
 *
 *   variant="overlay" — floating card centered over the map (translucent
 *                       backdrop, compact pill grid)
 *   variant="block"   — full-width inline panel for the list view
 *
 * Calls onSelect(pill) when a pill is clicked. The parent is expected to
 * push the selection into URL state and trigger price fetching.
 */
export default function ProcedureGate({ variant = 'block', onSelect, cityLabel }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = PROCEDURE_PILLS.filter((p) => p.isPrimary);
  const more = PROCEDURE_PILLS.filter((p) => !p.isPrimary);

  const heading = variant === 'overlay'
    ? 'Select a treatment to compare prices'
    : 'What treatment are you pricing out?';

  const subtext = variant === 'overlay'
    ? cityLabel
      ? `Real prices from providers in ${cityLabel}`
      : 'Pick a treatment to see real prices from providers near you'
    : 'Selecting a treatment shows you real prices from providers near you, so you can compare before you book.';

  if (variant === 'overlay') {
    return (
      <div
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        aria-modal="true"
        role="dialog"
      >
        {/* Soft backdrop so the map dots fade behind it */}
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px] pointer-events-auto" />

        <div
          className="relative pointer-events-auto max-w-md w-[92%] bg-white rounded-2xl shadow-2xl border border-gray-100 px-5 py-5"
          style={{ boxShadow: '0 20px 50px rgba(201, 79, 120, 0.18)' }}
        >
          <h2 className="text-base font-bold text-text-primary text-center mb-1">
            {heading}
          </h2>
          <p className="text-xs text-text-secondary text-center mb-4">
            {subtext}
          </p>
          <PillGrid
            primary={primary}
            more={more}
            moreOpen={moreOpen}
            onToggleMore={() => setMoreOpen((v) => !v)}
            onSelect={onSelect}
            compact
          />
        </div>
      </div>
    );
  }

  // block variant
  return (
    <div className="glow-card p-6 md:p-8 max-w-2xl mx-auto text-center">
      <h2 className="text-xl font-bold text-text-primary mb-1">{heading}</h2>
      <p className="text-sm text-text-secondary mb-5">{subtext}</p>
      <PillGrid
        primary={primary}
        more={more}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((v) => !v)}
        onSelect={onSelect}
      />
    </div>
  );
}

function PillGrid({ primary, more, moreOpen, onToggleMore, onSelect, compact }) {
  return (
    <>
      <div className={`flex flex-wrap justify-center gap-2 ${compact ? '' : 'mb-2'}`}>
        {primary.map((pill) => (
          <PillButton key={pill.slug} pill={pill} onSelect={onSelect} compact={compact} />
        ))}
        <button
          type="button"
          onClick={onToggleMore}
          className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white text-text-secondary hover:border-rose-accent hover:text-rose-accent transition ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          }`}
          aria-expanded={moreOpen}
        >
          More
          {moreOpen ? <ChevronUp size={compact ? 12 : 14} /> : <ChevronDown size={compact ? 12 : 14} />}
        </button>
      </div>

      {moreOpen && (
        <div className={`flex flex-wrap justify-center gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
          {more.map((pill) => (
            <PillButton key={pill.slug} pill={pill} onSelect={onSelect} compact={compact} />
          ))}
        </div>
      )}
    </>
  );
}

function PillButton({ pill, onSelect, compact }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pill)}
      className={`inline-flex items-center rounded-full border border-rose-accent/30 bg-rose-light/40 text-rose-dark font-medium hover:bg-rose-accent hover:text-white transition ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      }`}
    >
      {pill.label}
    </button>
  );
}
