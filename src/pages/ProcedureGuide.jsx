import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Star,
  Clock,
  CalendarDays,
  Timer,
  Zap,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Stethoscope,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CopyableQuestion from '../components/CopyableQuestion';
import ProcedureCard from '../components/ProcedureCard';
import ProviderAvatar from '../components/ProviderAvatar';
import { procedureToSlug, slugToProcedure } from '../lib/constants';
import { providerProfileUrl } from '../lib/slugify';

function PainDots({ level }) {
  const num = parseInt(level, 10) || 0;
  const filled = Math.min(Math.ceil(num / 2), 5);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: i < filled ? '#C94F78' : '#E5E7EB' }}
        />
      ))}
    </span>
  );
}

function SpecRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <Icon size={16} className="text-text-secondary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-text-secondary leading-tight">{label}</p>
        <p className={`text-sm font-medium leading-snug ${highlight ? 'text-verified' : 'text-text-primary'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function ProcedureGuide() {
  const { slug } = useParams();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [redFlagsOpen, setRedFlagsOpen] = useState(true);

  // Detect user city from localStorage
  const userCity = localStorage.getItem('gb_city') || null;
  const userState = localStorage.getItem('gb_state') || null;

  useEffect(() => {
    supabase
      .from('procedure_guides')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
      .then(({ data }) => {
        setGuide(data);
        setLoading(false);
      });
  }, [slug]);

  // Fetch local prices + providers when guide loads
  useEffect(() => {
    if (!guide) return;
    const types = guide.procedure_types || [];
    if (types.length === 0) return;

    // Prices
    supabase
      .from('procedures')
      .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_slug, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, trust_tier, data_source, has_receipt')
      .in('procedure_type', types)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setPrices(data || []));

    // Providers offering this procedure
    supabase
      .from('providers')
      .select('id, name, slug, city, state, avg_rating, review_count, is_claimed, is_verified, procedure_tags, photo_reference')
      .eq('is_claimed', true)
      .eq('is_active', true)
      .contains('procedure_tags', [types[0]])
      .limit(4)
      .then(({ data }) => setProviders(data || []));
  }, [guide]);

  // SEO
  useEffect(() => {
    if (!guide) return;
    const location = [userCity, userState].filter(Boolean).join(', ');
    document.title = `${guide.name} Guide — What to Expect, Costs & Tips | GlowBuddy`;

    const desc = `Everything you need to know before your first ${guide.name} treatment. Average cost $${guide.avg_cost_low}–$${guide.avg_cost_high}, satisfaction rate ${guide.satisfaction_rate}%. Questions to ask, red flags, and real prices.`;
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
    const questions = guide.content?.questions_to_ask || [];
    if (questions.length > 0) {
      const faqItems = questions.map((q) => ({
        '@type': 'Question',
        name: typeof q === 'string' ? q : q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: typeof q === 'string'
            ? `Ask your provider: "${q}"`
            : `${q.why || ''} Ask your provider: "${q.question}"`,
        },
      }));
      const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems };
      let existing = document.getElementById('gb-guide-faq');
      if (existing) {
        existing.textContent = JSON.stringify(schema);
      } else {
        const script = document.createElement('script');
        script.id = 'gb-guide-faq';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }

    return () => {
      const el = document.getElementById('gb-guide-faq');
      if (el) el.remove();
    };
  }, [guide, userCity, userState]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-text-secondary animate-pulse text-center">Loading guide...</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Guide Not Found</h1>
        <Link to="/guides" className="text-rose-accent hover:text-rose-dark font-medium transition">
          Browse all guides &rarr;
        </Link>
      </div>
    );
  }

  const specs = guide.specs || {};
  const content = guide.content || {};
  const questions = content.questions_to_ask || [];
  const redFlags = content.red_flags || [];
  const citations = content.source_citations || [];
  const feedUrl = guide.procedure_types?.[0]
    ? `/browse?procedure=${encodeURIComponent(procedureToSlug(guide.procedure_types[0]))}`
    : '/browse';

  const categoryLabel = { injectables: 'Injectables', skin: 'Skin Treatments', 'body-laser': 'Body / Laser', wellness: 'Wellness / Medical' };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-rose-accent transition mb-6">
        <ArrowLeft size={14} />
        All Treatment Guides
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <span className="inline-block text-xs font-medium text-rose-accent bg-rose-light px-3 py-1 rounded-full mb-3">
          {categoryLabel[guide.category] || guide.category}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          {guide.name}
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl">{guide.tagline}</p>

        {guide.satisfaction_rate && (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  style={{
                    color: '#F59E0B',
                    fill: i < Math.round(guide.satisfaction_rate / 20) ? '#F59E0B' : 'none',
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-text-primary">
              {guide.satisfaction_rate}% say it&rsquo;s worth it
            </span>
            <span className="text-xs text-text-secondary">(RealSelf data)</span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        {/* Left: Specs sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="glow-card p-5 lg:sticky lg:top-24">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              At a Glance
            </h2>

            {specs.consultationRequired && (
              <SpecRow icon={Stethoscope} label="Consultation" value={specs.consultationRequired} />
            )}
            {specs.treatmentTime && (
              <SpecRow icon={Clock} label="Treatment Time" value={specs.treatmentTime} />
            )}
            {specs.sessionsNeeded && (
              <SpecRow icon={CalendarDays} label="Sessions Needed" value={specs.sessionsNeeded} />
            )}
            {specs.resultsAppear && (
              <SpecRow icon={Timer} label="Results Appear" value={specs.resultsAppear} />
            )}
            {specs.resultsDuration && (
              <SpecRow icon={Sparkles} label="Results Last" value={specs.resultsDuration} />
            )}
            {specs.downtime && (
              <SpecRow icon={Zap} label="Downtime" value={specs.downtime} />
            )}
            {(specs.fdaApproved || guide.fda_approved) && (
              <SpecRow
                icon={ShieldCheck}
                label="FDA Status"
                value={`Approved${specs.fdaApprovalYear ? ` (${specs.fdaApprovalYear})` : ''}`}
                highlight
              />
            )}
            {!specs.fdaApproved && !guide.fda_approved && specs.fdaCleared && (
              <SpecRow icon={ShieldCheck} label="FDA Status" value="Device cleared" />
            )}
            {specs.averageCost && (
              <SpecRow icon={DollarSign} label="Avg Cost" value={specs.averageCost} />
            )}
            {specs.painLevel && (
              <div className="flex items-start gap-3 py-3">
                <Zap size={16} className="text-text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-text-secondary leading-tight">Pain Level</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <PainDots level={specs.painLevel.match(/\d+/)?.[0] || '0'} />
                    <span className="text-xs text-text-secondary">{specs.painLevel}</span>
                  </div>
                </div>
              </div>
            )}
            {specs.unitsTypical && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-text-secondary">Typical First-Timer</p>
                <p className="text-sm font-medium text-text-primary">{specs.unitsTypical}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          {content.what_it_is && (
            <section className="mb-8">
              <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
                What It Is
              </h2>
              <p className="text-text-secondary leading-relaxed">{content.what_it_is}</p>
            </section>
          )}

          {content.how_it_works && (
            <section className="mb-8">
              <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
                How It Works
              </h2>
              <p className="text-text-secondary leading-relaxed">{content.how_it_works}</p>
            </section>
          )}

          {content.first_time_what_to_expect && (
            <section className="mb-8">
              <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
                What to Expect Your First Time
              </h2>
              <p className="text-text-secondary leading-relaxed">{content.first_time_what_to_expect}</p>
            </section>
          )}

          {(content.good_candidate || content.not_good_candidate) && (
            <section className="mb-8">
              <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
                Are You a Good Candidate?
              </h2>
              {content.good_candidate && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-verified mb-1.5">Good candidates:</p>
                  <p className="text-text-secondary leading-relaxed">{content.good_candidate}</p>
                </div>
              )}
              {content.not_good_candidate && (
                <div>
                  <p className="text-sm font-semibold text-red-500 mb-1.5">May not be right for you if:</p>
                  <p className="text-text-secondary leading-relaxed">{content.not_good_candidate}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Full-width sections */}

      {/* Questions to Ask */}
      {questions.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setQuestionsOpen(!questionsOpen)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h2 className="font-display text-xl font-semibold text-text-primary">
              Questions to Ask Your Provider
            </h2>
            {questionsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {questionsOpen && (
            <div className="space-y-2">
              {questions.map((q, i) => {
                const questionText = typeof q === 'string' ? q : q.question;
                const why = typeof q === 'object' ? q.why : null;
                return (
                  <div key={i}>
                    <CopyableQuestion question={questionText} />
                    {why && (
                      <p className="text-xs text-text-secondary ml-4 mt-1 mb-1">
                        <span className="font-medium">Why this matters:</span> {why}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Red Flags */}
      {redFlags.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setRedFlagsOpen(!redFlagsOpen)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <h2 className="font-display text-xl font-semibold text-text-primary">
              Red Flags to Watch For
            </h2>
            {redFlagsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {redFlagsOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {redFlags.map((flag, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                  <p className="text-sm text-text-primary">{flag}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Prices in Your Area */}
      {prices.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-text-primary mb-1">
            What Patients Paid for {guide.name}
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            {userCity && userState
              ? `Real prices near ${userCity}, ${userState}`
              : 'Real prices from GlowBuddy patients'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prices.slice(0, 6).map((p) => (
              <ProcedureCard key={p.id} procedure={p} />
            ))}
          </div>
          <Link
            to={feedUrl}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-accent hover:text-rose-dark transition mt-4"
          >
            See all {guide.name} prices
            <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* Providers Near You */}
      {providers.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-text-primary mb-1">
            Providers Offering {guide.name}
          </h2>
          <p className="text-sm text-text-secondary mb-4">Claimed and verified on GlowBuddy</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {providers.slice(0, 4).map((prov) => {
              const url = providerProfileUrl(prov.slug, prov.name, prov.city, prov.state);
              return (
                <Link
                  key={prov.id}
                  to={url || `/provider/${prov.slug}`}
                  className="glow-card p-4 flex items-center gap-3 hover:border-rose-accent/30 transition"
                >
                  <ProviderAvatar name={prov.name} size={44} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{prov.name}</p>
                    {prov.city && prov.state && (
                      <p className="text-xs text-text-secondary">{prov.city}, {prov.state}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {prov.is_verified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-verified">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      )}
                      {prov.avg_rating && (
                        <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
                          <Star size={10} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                          {prov.avg_rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-accent hover:text-rose-dark transition mt-4"
          >
            Find more providers
            <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {/* Sources */}
      {citations.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Sources</h2>
          <div className="rounded-xl bg-warm-gray p-4">
            <ul className="space-y-1.5">
              {citations.map((cite, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ExternalLink size={10} className="shrink-0 mt-1 text-text-secondary" />
                  <span className="text-xs text-text-secondary">{cite}</span>
                </li>
              ))}
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
          Browse {guide.name} prices near you
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Disclaimer */}
      <div className="rounded-xl bg-warm-gray px-5 py-4 mb-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong>Medical disclaimer:</strong> This guide is for informational purposes only and does not constitute medical advice.
          Always consult a licensed medical professional before undergoing any treatment. Individual results vary.
          GlowBuddy does not endorse or recommend specific providers or products.
        </p>
      </div>
    </div>
  );
}
