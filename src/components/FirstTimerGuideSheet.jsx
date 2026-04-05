import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CopyableQuestion from './CopyableQuestion';
import DosageCalculator from './DosageCalculator';
import { procedureToSlug } from '../lib/constants';
import { Link } from 'react-router-dom';

export default function FirstTimerGuideSheet({ treatmentName, onClose, onActivateMode }) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState({ expect: true });

  useEffect(() => {
    if (!treatmentName) return;
    setLoading(true);
    supabase
      .from('treatment_guides')
      .select('*')
      .eq('treatment_name', treatmentName)
      .single()
      .then(({ data }) => {
        setGuide(data);
        setLoading(false);
      });
  }, [treatmentName]);

  function toggle(key) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  if (!treatmentName) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[80]"
        onClick={onClose}
      />

      {/* Panel: bottom sheet on mobile, side panel on desktop */}
      <div className="fixed z-[85] bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-white overflow-y-auto md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-[440px] md:max-h-full md:rounded-t-none md:rounded-l-2xl shadow-2xl">
        {/* Mobile handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#0369A1]" />
            <h2 className="text-lg font-bold text-text-primary">
              First-Timer Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-text-secondary animate-pulse text-sm py-8 text-center">
              Loading guide...
            </p>
          ) : !guide ? (
            <p className="text-text-secondary text-sm py-8 text-center">
              No guide available for this treatment yet.
            </p>
          ) : (
            <>
              {/* Treatment name */}
              <h3 className="text-xl font-bold text-text-primary">{treatmentName}</h3>

              {/* Starter dose callout */}
              {guide.starter_dose_note && (
                <div className="rounded-xl p-4 bg-[#E0F2FE] border border-sky-200">
                  <p className="text-sm font-medium text-[#0369A1] mb-1">Starter Dose</p>
                  <p className="text-sm text-text-primary">{guide.starter_dose_note}</p>
                </div>
              )}

              {/* What to Expect */}
              <AccordionSection
                title="What to Expect"
                open={openSections.expect}
                onToggle={() => toggle('expect')}
              >
                <p className="text-sm text-text-secondary leading-relaxed">{guide.what_to_expect}</p>
              </AccordionSection>

              {/* Fair Price Context */}
              {guide.fair_price_context && (
                <AccordionSection
                  title="Fair Price"
                  open={openSections.price}
                  onToggle={() => toggle('price')}
                >
                  <p className="text-sm text-text-secondary leading-relaxed">{guide.fair_price_context}</p>
                  {guide.typical_price_range_low && guide.typical_price_range_high && (
                    <div className="mt-3 rounded-lg bg-warm-gray p-3">
                      <p className="text-sm font-medium text-text-primary">
                        Typical range: ${guide.typical_price_range_low}&ndash;${guide.typical_price_range_high}
                        {guide.price_unit && <span className="text-text-secondary font-normal"> {guide.price_unit}</span>}
                      </p>
                    </div>
                  )}
                </AccordionSection>
              )}

              {/* Questions to Ask */}
              {guide.questions_to_ask?.length > 0 && (
                <AccordionSection
                  title="Questions to Ask"
                  open={openSections.questions}
                  onToggle={() => toggle('questions')}
                >
                  <div className="space-y-2">
                    {guide.questions_to_ask.map((q, i) => (
                      <CopyableQuestion key={i} question={q} />
                    ))}
                  </div>
                </AccordionSection>
              )}

              {/* Red Flags */}
              {guide.red_flags?.length > 0 && (
                <AccordionSection
                  title="Red Flags"
                  open={openSections.flags}
                  onToggle={() => toggle('flags')}
                >
                  <ul className="space-y-2">
                    {guide.red_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="text-red-500 shrink-0 mt-0.5">&bull;</span>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </AccordionSection>
              )}

              {/* Price range card */}
              {guide.typical_price_range_low && guide.typical_price_range_high && (
                <div className="glow-card p-4 border border-sky-200">
                  <p className="text-sm font-medium text-[#0369A1] mb-2">First-Timer Price Range</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-text-primary">
                      ${guide.typical_price_range_low}&ndash;${guide.typical_price_range_high}
                    </span>
                    {guide.price_unit && (
                      <span className="text-sm text-text-secondary">{guide.price_unit}</span>
                    )}
                  </div>
                  {guide.duration_of_results && (
                    <p className="text-xs text-text-secondary mt-1">
                      Results last: {guide.duration_of_results}
                    </p>
                  )}
                </div>
              )}

              {/* Full guide link */}
              {guide.slug && (
                <Link
                  to={`/guides/${guide.slug}`}
                  className="block text-center text-sm font-medium text-[#0369A1] hover:text-sky-800 transition py-2"
                  onClick={onClose}
                >
                  Read full guide &rarr;
                </Link>
              )}

              {/* Source attribution */}
              {guide.sources?.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Information sourced from{' '}
                    {guide.sources.map((url, i) => {
                      const domain = (() => {
                        try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
                      })();
                      const shortMap = {
                        'accessdata.fda.gov': 'FDA',
                        'plasticsurgery.org': 'ASPS',
                        'aad.org': 'AAD',
                        'asds.net': 'ASDS',
                        'pubmed.ncbi.nlm.nih.gov': 'PubMed',
                      };
                      const short = shortMap[domain] || domain;
                      return (
                        <span key={i}>
                          {i > 0 && ', '}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0369A1] hover:underline"
                          >
                            {short}
                          </a>
                        </span>
                      );
                    })}
                    . See{' '}
                    <Link
                      to={`/guides/${guide.slug}`}
                      className="text-[#0369A1] hover:underline"
                      onClick={onClose}
                    >
                      full guide
                    </Link>
                    {' '}for complete citations.
                  </p>
                </div>
              )}

              {/* Activate mode CTA */}
              {onActivateMode && (
                <button
                  onClick={onActivateMode}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition"
                  style={{ backgroundColor: '#0369A1' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#075985')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0369A1')}
                >
                  <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
                  Activate First-Timer Mode
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-warm-gray/50 transition"
      >
        {title}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
