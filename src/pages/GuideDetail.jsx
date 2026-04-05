import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CopyableQuestion from '../components/CopyableQuestion';
import DosageCalculator from '../components/DosageCalculator';
import { procedureToSlug } from '../lib/constants';

export default function GuideDetail() {
  const { slug } = useParams();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('treatment_guides')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setGuide(data);
        setLoading(false);
      });
  }, [slug]);

  // SEO
  useEffect(() => {
    if (!guide) return;
    document.title = `First Time ${guide.treatment_name} Guide — What to Expect, Costs & Tips | GlowBuddy`;

    const desc = `Everything you need to know before your first ${guide.treatment_name} treatment. Fair price ranges ($${guide.typical_price_range_low}–$${guide.typical_price_range_high}), starter doses, questions to ask, and red flags.`;
    let meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', desc);
    } else {
      meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = desc;
      document.head.appendChild(meta);
    }

    // FAQPage structured data
    const faqItems = (guide.questions_to_ask || []).map((q) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Ask your provider: "${q}" — this is one of the most important questions for first-time ${guide.treatment_name} patients.`,
      },
    }));

    if (faqItems.length > 0) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems,
      };
      let existing = document.getElementById('gb-faq-schema');
      if (existing) {
        existing.textContent = JSON.stringify(schema);
      } else {
        const script = document.createElement('script');
        script.id = 'gb-faq-schema';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }

    return () => {
      const el = document.getElementById('gb-faq-schema');
      if (el) el.remove();
    };
  }, [guide]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-text-secondary animate-pulse text-center">Loading guide...</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Guide Not Found</h1>
        <Link to="/" className="text-rose-accent hover:text-rose-dark font-medium transition">
          Back to Home
        </Link>
      </div>
    );
  }

  const feedUrl = `/?procedure=${encodeURIComponent(procedureToSlug(guide.treatment_name))}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl p-6 md:p-8 mb-8 bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF] border border-sky-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-[#0369A1]" />
          <span className="text-sm font-medium text-[#0369A1]">First-Timer Guide</span>
        </div>
        <h1 className="font-display text-[32px] md:text-[40px] leading-tight font-semibold text-text-primary mb-3">
          Your First {guide.treatment_name}
        </h1>
        <p className="text-text-secondary max-w-lg leading-relaxed">
          Everything you need to know before your first appointment — from fair prices to the right questions to ask.
        </p>
      </div>

      {/* Starter Dose */}
      {guide.starter_dose_note && (
        <section className="mb-8">
          <div className="glow-card p-5 border border-sky-200">
            <h2 className="text-sm font-semibold text-[#0369A1] mb-2">Recommended Starter Dose</h2>
            <p className="text-text-primary leading-relaxed">{guide.starter_dose_note}</p>
            {guide.avg_first_session_units && (
              <p className="text-sm text-text-secondary mt-2">
                Typical first session: {guide.avg_first_session_units}
              </p>
            )}
          </div>
        </section>
      )}

      {/* What to Expect */}
      {guide.what_to_expect && (
        <section className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">What to Expect</h2>
          <p className="text-text-secondary leading-relaxed">{guide.what_to_expect}</p>
        </section>
      )}

      {/* Fair Price */}
      {(guide.fair_price_context || guide.typical_price_range_low) && (
        <section className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">Fair Price Range</h2>
          {guide.fair_price_context && (
            <p className="text-text-secondary leading-relaxed mb-4">{guide.fair_price_context}</p>
          )}
          {guide.typical_price_range_low && guide.typical_price_range_high && (
            <div className="glow-card p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-text-primary">
                  ${guide.typical_price_range_low}&ndash;${guide.typical_price_range_high}
                </span>
                {guide.price_unit && (
                  <span className="text-text-secondary">{guide.price_unit}</span>
                )}
              </div>
              {guide.duration_of_results && (
                <p className="text-sm text-text-secondary mt-2">
                  Results typically last: {guide.duration_of_results}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Dosage Calculator */}
      <section className="mb-8">
        <DosageCalculator treatmentName={guide.treatment_name} />
      </section>

      {/* Questions to Ask */}
      {guide.questions_to_ask?.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">
            Questions to Ask Your Provider
          </h2>
          <p className="text-sm text-text-secondary mb-3">Tap to copy any question</p>
          <div className="space-y-2">
            {guide.questions_to_ask.map((q, i) => (
              <CopyableQuestion key={i} question={q} />
            ))}
          </div>
        </section>
      )}

      {/* Red Flags */}
      {guide.red_flags?.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">Red Flags to Watch For</h2>
          <div className="glow-card p-5 border border-red-100">
            <ul className="space-y-3">
              {guide.red_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="text-red-500 shrink-0 mt-0.5">&bull;</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Duration */}
      {guide.duration_of_results && (
        <section className="mb-8">
          <div className="rounded-xl bg-warm-gray p-5">
            <p className="text-sm font-medium text-text-secondary mb-1">How Long Results Last</p>
            <p className="text-lg font-semibold text-text-primary">{guide.duration_of_results}</p>
            {guide.consultation_recommended && (
              <p className="text-xs text-text-secondary mt-2">
                A consultation is recommended before your first treatment.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Sources */}
      {guide.sources?.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-text-primary mb-3">Sources</h2>
          <div className="rounded-xl bg-warm-gray p-4">
            <p className="text-xs text-text-secondary mb-2">
              The information in this guide is sourced from published clinical data and professional organization statistics:
            </p>
            <ul className="space-y-1.5">
              {guide.sources.map((url, i) => {
                const domain = (() => {
                  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
                })();
                const labelMap = {
                  'accessdata.fda.gov': 'FDA Prescribing Information',
                  'plasticsurgery.org': 'American Society of Plastic Surgeons (ASPS)',
                  'aad.org': 'American Academy of Dermatology (AAD)',
                  'asds.net': 'American Society for Dermatologic Surgery (ASDS)',
                  'pubmed.ncbi.nlm.nih.gov': 'PubMed / NIH',
                  'hydrafacial.com': 'HydraFacial (Manufacturer)',
                };
                const label = labelMap[domain] || domain;
                return (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0369A1] hover:text-sky-800 transition"
                    >
                      <ExternalLink size={10} className="shrink-0" />
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mb-8">
        <Link
          to={feedUrl}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-white font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: '#C94F78' }}
        >
          Browse {guide.treatment_name} prices near you
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
