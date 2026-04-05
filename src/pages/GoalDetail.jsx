import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TreatmentRecommendationCard from '../components/TreatmentRecommendationCard';
import CombinationCallout from '../components/CombinationCallout';
import OutcomePill from '../components/OutcomePill';

export default function GoalDetail() {
  const { slug } = useParams();
  const [outcome, setOutcome] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [relatedOutcomes, setRelatedOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch this outcome
      const { data: outcomeData } = await supabase
        .from('outcomes')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!outcomeData) {
        setOutcome(null);
        setLoading(false);
        return;
      }

      setOutcome(outcomeData);

      // Fetch treatments for this outcome
      const { data: treatmentData } = await supabase
        .from('outcome_treatments')
        .select('*')
        .eq('outcome_id', outcomeData.id)
        .order('relevance', { ascending: false });

      setTreatments(treatmentData || []);

      // Fetch related outcomes (share at least one treatment)
      if (treatmentData?.length > 0) {
        const treatmentNames = treatmentData.map((t) => t.treatment_name);
        const { data: relatedLinks } = await supabase
          .from('outcome_treatments')
          .select('outcome_id')
          .in('treatment_name', treatmentNames)
          .neq('outcome_id', outcomeData.id);

        if (relatedLinks?.length > 0) {
          const relatedIds = [...new Set(relatedLinks.map((r) => r.outcome_id))].slice(0, 4);
          const { data: relatedData } = await supabase
            .from('outcomes')
            .select('*')
            .in('id', relatedIds);
          setRelatedOutcomes(relatedData || []);
        }
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  // SEO
  useEffect(() => {
    if (!outcome) return;
    document.title = `How to ${outcome.label} — Best Treatments & Costs | GlowBuddy`;

    const desc = `Discover the best treatments to ${outcome.label.toLowerCase()}. Compare ${treatments.length} options with sourced clinical data, typical sessions, and real prices from patients.`;
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
    const faqItems = treatments.map((t) => ({
      '@type': 'Question',
      name: `Does ${t.treatment_name} help ${outcome.label.toLowerCase()}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: t.why_it_works,
      },
    }));

    if (faqItems.length > 0) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems,
      };
      let existing = document.getElementById('gb-goal-faq-schema');
      if (existing) {
        existing.textContent = JSON.stringify(schema);
      } else {
        const script = document.createElement('script');
        script.id = 'gb-goal-faq-schema';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }

    return () => {
      const el = document.getElementById('gb-goal-faq-schema');
      if (el) el.remove();
    };
  }, [outcome, treatments]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-text-secondary animate-pulse text-center">Loading goal...</p>
      </div>
    );
  }

  if (!outcome) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Goal Not Found</h1>
        <Link to="/" className="text-rose-accent hover:text-rose-dark font-medium transition">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl p-6 md:p-8 mb-8 bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF] border border-sky-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-[#0369A1]" />
          <span className="text-sm font-medium text-[#0369A1]">Treatment Goal</span>
        </div>
        <h1 className="font-display text-[32px] md:text-[40px] leading-tight font-semibold text-text-primary mb-3">
          {outcome.label}
        </h1>
        <p className="text-text-secondary max-w-lg leading-relaxed">
          {outcome.description}. Here are the most effective treatments, ranked by relevance with sourced clinical data.
        </p>
      </div>

      {/* Combination callout */}
      {treatments.length >= 2 && (
        <section className="mb-8">
          <CombinationCallout treatments={treatments} />
        </section>
      )}

      {/* Treatment recommendations */}
      <section className="mb-8">
        <h2 className="font-display text-2xl font-semibold text-text-primary mb-4">
          Recommended Treatments
        </h2>
        <div className="space-y-4">
          {treatments.map((rec) => (
            <TreatmentRecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      </section>

      {/* Related goals */}
      {relatedOutcomes.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-text-primary mb-3">
            Related Goals
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedOutcomes.map((o) => (
              <OutcomePill key={o.id} slug={o.slug} label={o.label} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-white font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: '#C94F78' }}
        >
          Browse prices near you
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
