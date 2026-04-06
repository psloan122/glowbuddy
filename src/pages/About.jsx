import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import FounderStory from '../components/FounderStory';

export default function About() {
  useEffect(() => {
    document.title = 'About \u2014 GlowBuddy';
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display italic text-[32px] md:text-[40px] font-normal tracking-[-0.5px] text-text-primary mb-2">
        Know before you glow.
      </h1>
      <p className="text-text-secondary mb-8">
        The story behind GlowBuddy.
      </p>

      <FounderStory full />

      <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-text-secondary">
        <p>
          GlowBuddy is a crowdsourced pricing platform for cosmetic treatments.
          Every price you see comes from a real patient who shared what they
          actually paid &mdash; not an advertised rate, not a &ldquo;starting
          at&rdquo; number.
        </p>
        <p>
          We believe price transparency makes the entire industry better. When
          patients can compare prices across providers, they make more informed
          decisions. And providers who offer fair pricing get the recognition
          they deserve.
        </p>
        <p>
          GlowBuddy is free to browse. No account required. No ads between you
          and the data. Just real prices from real people.
        </p>
      </div>

      <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
        <Link
          to="/browse"
          className="text-sm text-rose-accent hover:text-rose-dark transition-colors"
        >
          Find prices &rarr;
        </Link>
        <Link
          to="/log"
          className="text-sm text-rose-accent hover:text-rose-dark transition-colors"
        >
          Share what you paid &rarr;
        </Link>
        <Link
          to="/business"
          className="text-sm text-rose-accent hover:text-rose-dark transition-colors"
        >
          For providers &rarr;
        </Link>
      </div>
    </div>
  );
}
