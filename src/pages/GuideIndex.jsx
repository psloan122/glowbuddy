import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, Syringe, Sparkles, Zap, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORY_META = {
  injectables: { label: 'Injectables', icon: Syringe, color: '#C94F78', bg: '#FBE8EF' },
  skin: { label: 'Skin Treatments', icon: Sparkles, color: '#0369A1', bg: '#E0F2FE' },
  'body-laser': { label: 'Body / Laser', icon: Zap, color: '#7C3AED', bg: '#EDE9FE' },
  wellness: { label: 'Wellness / Medical', icon: Heart, color: '#059669', bg: '#D1FAE5' },
};

const CATEGORY_ORDER = ['injectables', 'skin', 'body-laser', 'wellness'];

function GuideCard({ guide }) {
  const starCount = guide.satisfaction_rate
    ? Math.round(guide.satisfaction_rate / 20)
    : 0;

  return (
    <Link
      to={`/guide/${guide.slug}`}
      className="glow-card p-5 flex flex-col justify-between hover:border-rose-accent/30 hover:shadow-md transition group"
    >
      <div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1 group-hover:text-rose-accent transition-colors">
          {guide.name}
        </h3>
        <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {guide.tagline}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {guide.avg_cost_low != null && guide.avg_cost_high != null && (
            <span className="text-xs text-text-secondary">
              ${Number(guide.avg_cost_low).toLocaleString()}–${Number(guide.avg_cost_high).toLocaleString()}
              {guide.avg_cost_unit ? ` ${guide.avg_cost_unit}` : ''}
            </span>
          )}
          {guide.satisfaction_rate && (
            <span className="flex items-center gap-1">
              <span className="flex items-center gap-px">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    style={{
                      color: '#F59E0B',
                      fill: i < starCount ? '#F59E0B' : 'none',
                    }}
                  />
                ))}
              </span>
              <span className="text-[11px] text-text-secondary">{guide.satisfaction_rate}%</span>
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-rose-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          Learn more <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

export default function GuideIndex() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Glossary of Terms — Common Treatments Explained | GlowBuddy';
    const desc = 'A plain-English glossary of common aesthetic treatments. What they are, what they cost, and what to expect — no industry jargon. Botox, fillers, lasers, and more.';
    let meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', desc);
    } else {
      meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = desc;
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    supabase
      .from('procedure_guides')
      .select('id, name, slug, category, tagline, satisfaction_rate, avg_cost_low, avg_cost_high, avg_cost_unit')
      .eq('is_published', true)
      .order('name')
      .then(({ data }) => {
        setGuides(data || []);
        setLoading(false);
      });
  }, []);

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = guides.filter((g) => g.category === cat);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <p className="text-text-secondary animate-pulse text-center">Loading guides...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          Glossary of Terms
        </h1>
        <p className="text-lg text-text-secondary max-w-lg mx-auto">
          Common treatments and what they mean &mdash; no industry jargon.
        </p>
      </div>

      {/* Category sections */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;

        return (
          <section key={cat} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: meta.bg }}
              >
                <Icon size={16} style={{ color: meta.color }} />
              </span>
              <h2 className="text-lg font-bold text-text-primary">{meta.label}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Bottom CTA */}
      <div className="text-center mt-8">
        <p className="text-sm text-text-secondary mb-4">
          Have a question about a treatment not listed here?
        </p>
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: '#C94F78' }}
        >
          Browse all prices
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
