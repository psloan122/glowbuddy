import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2, ArrowRight, Mail } from 'lucide-react';
import { procedureToSlug } from '../lib/constants';
import { getProcedureLabel } from '../lib/procedureLabel';
import { supabase } from '../lib/supabase';

export default function PriceReportCard({ procedure, stateAvg, nationalAvg, stateCount, nationalCount }) {
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const price = Number(procedure.price_paid);
  const procedureSlug = procedureToSlug(procedure.procedure_type);
  const procedureLabel = getProcedureLabel(procedure.procedure_type, procedure.brand);

  let stateComparison = null;
  if (stateAvg != null && stateAvg > 0) {
    const diff = ((price - stateAvg) / stateAvg) * 100;
    const absDiff = Math.abs(diff).toFixed(0);
    const isAbove = diff > 0;
    stateComparison = {
      text: `${absDiff}% ${isAbove ? 'above' : 'below'} average in ${procedure.state}`,
      isAbove,
    };
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setSending(true);

    // Sign in with magic link
    await supabase.auth.signInWithOtp({ email });

    setEmailSubmitted(true);
    setSending(false);
  }

  // If no email submitted yet, show email capture
  if (!emailSubmitted) {
    return (
      <div
        id="price-report"
        className="bg-gradient-to-br from-rose-light to-white rounded-2xl p-6 border border-rose-accent/20"
      >
        <h3 className="text-lg font-bold text-text-primary mb-2">
          Your Price Report is Ready
        </h3>

        <p className="text-sm text-text-primary mb-2">
          You paid{' '}
          <span className="font-bold text-lg">
            ${price.toLocaleString()}
          </span>{' '}
          for{' '}
          <span className="font-semibold">{procedureLabel}</span>
          {procedure.city && ` in ${procedure.city}`}
        </p>

        <p className="text-sm text-text-secondary mb-5">
          Enter your email to see how your price compares — and help others know what to expect.
        </p>

        <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 text-white font-medium rounded-xl hover:opacity-90 transition-colors text-sm disabled:opacity-50"
            style={{ backgroundColor: '#C94F78' }}
          >
            {sending ? 'Sending...' : 'See My Report'}
          </button>
        </form>

        <p className="text-xs text-text-secondary mt-3">
          We'll send a magic link to sign in. No password needed.
        </p>
      </div>
    );
  }

  // Full report after email submitted
  return (
    <div
      id="price-report"
      className="bg-gradient-to-br from-rose-light to-white rounded-2xl p-6 border border-rose-accent/20"
    >
      <h3 className="text-lg font-bold text-text-primary mb-4">
        Your Price Report
      </h3>

      <p className="text-sm text-text-primary mb-3">
        You paid{' '}
        <span className="font-bold text-lg">
          ${price.toLocaleString()}
        </span>{' '}
        for{' '}
        <span className="font-semibold">{procedureLabel}</span>
        {procedure.city && ` in ${procedure.city}`}
      </p>

      {stateComparison && (
        <p
          className={`text-sm font-medium mb-2 ${
            stateComparison.isAbove ? 'text-red-500' : 'text-verified'
          }`}
        >
          {stateComparison.text}
          {stateCount > 0 && (
            <span className="text-text-secondary font-normal">
              {' '}({stateCount} reports)
            </span>
          )}
        </p>
      )}

      {nationalAvg != null && nationalAvg > 0 && (
        <p className="text-sm text-text-secondary mb-4">
          National average:{' '}
          <span className="font-semibold">
            ${Number(nationalAvg).toLocaleString()}
          </span>
          {nationalCount > 0 && (
            <span> ({nationalCount} reports)</span>
          )}
        </p>
      )}

      <p className="text-xs text-verified mb-4">
        Check your email for a magic link to sign in and save your history.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={() => alert('Screenshot to share!')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white font-medium rounded-xl hover:opacity-90 transition-colors text-sm"
          style={{ backgroundColor: '#C94F78' }}
        >
          <Share2 size={16} />
          Share your report
        </button>

        <Link
          to={`/procedure/${procedureSlug}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          See all {procedureLabel} prices near you
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
