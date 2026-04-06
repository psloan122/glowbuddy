import { Link } from 'react-router-dom';

export default function FounderStory({ full = false }) {
  return (
    <div className="rounded-2xl px-6 py-5 md:px-8 md:py-6" style={{ backgroundColor: '#FBF0EC' }}>
      <p className="font-display italic text-[15px] md:text-base leading-relaxed text-text-primary/80">
        &ldquo;My wife called five med spas in New Orleans just to find out what Botox
        costs. Nobody would tell her the price without booking a consultation.
        We built GlowBuddy so nobody has to make that call again.&rdquo;
      </p>

      {full && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          GlowBuddy is built on a simple idea: patients deserve to know what things
          cost before they walk in the door. Every price on this site comes from a
          real person who went through it. No estimates. No advertised rates.
          Just what people actually paid.
        </p>
      )}

      <p className="mt-3 text-xs text-text-secondary/60">
        &mdash; Founder, GlowBuddy
      </p>

      {!full && (
        <Link
          to="/about"
          className="inline-block mt-2 text-xs text-rose-accent hover:text-rose-dark transition-colors"
        >
          Read our story &rarr;
        </Link>
      )}
    </div>
  );
}
