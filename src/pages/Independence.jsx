import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Independence() {
  useEffect(() => {
    document.title = 'Our Data Policy — Know Before You Glow';
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display italic text-[32px] md:text-[40px] font-normal tracking-[-0.5px] text-text-primary mb-2">
        Our Data Policy
      </h1>
      <p className="text-text-secondary mb-10">
        How prices work on Know Before You Glow.
      </p>

      <div className="space-y-8 text-[15px] leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            How prices are sourced
          </h2>
          <p>
            Every price on Know Before You Glow comes from one of two sources:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>Patient-reported prices</strong> — real patients share
              what they actually paid after their appointment. Submissions can
              include receipt uploads for verification.
            </li>
            <li>
              <strong>Provider-published pricing</strong> — prices listed on
              provider websites and menus, collected and normalized by our team.
            </li>
          </ul>
          <p className="mt-2">
            We display a trust badge on every price so you can see its source at
            a glance: receipt-verified (green), photo-included (blue), or
            self-reported (gray). Older prices are labeled with their age so you
            know how current the data is.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            No provider pays for ranking
          </h2>
          <p>
            Provider order on Know Before You Glow is determined entirely by
            neutral criteria — price, rating, recency, or distance. There are no
            &ldquo;featured&rdquo; placements, no boosted listings, and no
            pay-to-rank arrangements. Providers can claim their profile through
            our{' '}
            <Link
              to="/business"
              className="text-rose-accent hover:text-rose-dark transition-colors"
            >
              business portal
            </Link>
            , but claiming does not affect search position or visibility.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            How to report inaccurate prices
          </h2>
          <p>
            If you see a price that looks wrong — outdated, misattributed, or
            just off — we want to know. You can:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              Tap the <strong>info icon</strong> on any price card and select
              &ldquo;Report this price.&rdquo;
            </li>
            <li>
              Email us at{' '}
              <a
                href="mailto:hello@knowbeforeyouglow.com"
                className="text-rose-accent hover:text-rose-dark transition-colors"
              >
                hello@knowbeforeyouglow.com
              </a>{' '}
              with the provider name, treatment, and what looks wrong.
            </li>
            <li>
              Submit your own price to help keep the data fresh — the more
              reports we have, the more accurate the averages become.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Medical disclaimer
          </h2>
          <p>
            Know Before You Glow is a price transparency tool, not a medical
            resource. Dosage calculators and treatment guides are for
            informational purposes only and do not constitute medical advice.
            Always consult a licensed medical professional before undergoing any
            treatment. Individual results vary.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
        <Link
          to="/browse"
          className="text-sm text-rose-accent hover:text-rose-dark transition-colors"
        >
          Find prices &rarr;
        </Link>
        <Link
          to="/about"
          className="text-sm text-rose-accent hover:text-rose-dark transition-colors"
        >
          About us &rarr;
        </Link>
        <Link
          to="/log"
          className="text-sm text-rose-accent hover:text-rose-dark transition-colors"
        >
          Share what you paid &rarr;
        </Link>
      </div>
    </div>
  );
}
