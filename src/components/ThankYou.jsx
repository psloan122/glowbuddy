import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { getEntryBreakdown } from '../lib/points';
import EmailConfirmation from './EmailConfirmation';

const VERIFY_EMAIL = 'verify@knowbeforeyouglow.com';

const CELEBRATIONS = {
  pioneer: {
    emoji: '🌟',
    headline: "You're a Pioneer!",
    sub: (providerName) => `First price at ${providerName || 'this location'}`,
  },
  first_submission: {
    emoji: '✨',
    headline: "First one's always special",
    sub: () => 'Your first price report — thank you!',
  },
  returning: {
    emoji: '💪',
    headline: 'Another one!',
    sub: (_, city) =>
      `Thanks for keeping${city ? ` ${city}` : ''} prices fresh`,
  },
  hundredth: {
    emoji: '🏆',
    headline: '100 submissions!!',
    sub: () => "You're basically a legend",
  },
};

function normalizeProcName(type) {
  if (!type) return 'Treatment';
  if (type.includes('/') && /botox|dysport|xeomin/i.test(type)) return 'Neurotoxin';
  if (type.includes('/') && /juvederm|restylane|sculptra|filler/i.test(type)) return 'Filler';
  return type;
}

function EntryLine({ label, value, delay, pending }) {
  return (
    <div
      className="entry-line flex items-center justify-between"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`text-sm ${pending ? 'text-gray-400 italic' : 'text-gray-600'}`}>
        {label}
      </span>
      {!pending && (
        <span className="text-sm font-bold" style={{ color: '#C94F78' }}>
          +{value}
        </span>
      )}
    </div>
  );
}

export default function ThankYou({
  procedure,
  user,
  outlierFlagged,
  entries = 1,
  hasReceipt = false,
  activeCount = null,
  hasRating = false,
  hasReview = false,
  hasResultPhoto = false,
  receiptVerified = false,
  pioneerResult = null,
  isNewProvider = false,
  providerName = '',
}) {
  const needsEmailVerify = procedure?.status === 'pending_confirmation';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [verifyCopied, setVerifyCopied] = useState(false);
  const [skipToast, setSkipToast] = useState(false);

  const pioneerTier = pioneerResult?.pioneer_tier || null;
  const { lines: entryLines, total: totalEntries } = getEntryBreakdown(
    activeCount,
    hasReceipt,
    hasRating,
    hasReview,
    hasResultPhoto,
    receiptVerified,
    null,
    pioneerTier
  );

  // Determine celebration type
  const celebKey = pioneerResult ? 'pioneer'
    : (activeCount == null || activeCount === 0) ? 'first_submission'
    : activeCount === 99 ? 'hundredth'
    : 'returning';
  const cel = CELEBRATIONS[celebKey];
  const procDisplay = normalizeProcName(procedure?.procedure_type);
  const effectiveProviderName = providerName || pioneerResult?.provider_name || '';

  async function handleCreateAccount(e) {
    e.preventDefault();
    if (!email || sending) return;
    setSending(true);
    await supabase.auth.signInWithOtp({ email });
    const month = format(new Date(), 'yyyy-MM');
    await supabase.from('giveaway_entries').insert({
      email,
      procedure_id: procedure.id,
      month,
      user_id: null,
      entries: totalEntries,
      has_receipt: hasReceipt,
    });
    setSending(false);
    setEmailSent(true);
  }

  function handleShare() {
    const city = procedure?.city;
    const text = `Just submitted a ${procDisplay} price on @GlowBuddy — now women${city ? ` in ${city}` : ''} know what to expect before they book 💪 knowbeforeyouglow.com`;
    if (navigator.share) {
      navigator.share({ text, url: 'https://knowbeforeyouglow.com' }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  function handleSkip() {
    setSkipToast(true);
    setTimeout(() => navigate('/'), 100);
  }

  if (emailSent) {
    return (
      <div className="max-w-lg mx-auto">
        <EmailConfirmation email={email} procedureId={procedure.id} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">

      {/* ── System banners ── */}
      {outlierFlagged && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4 text-left">
          Thanks! Your submission is under review and will appear shortly.
        </div>
      )}
      {needsEmailVerify && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-4 text-left">
          <p className="font-medium mb-1">We saved your price — one more step.</p>
          <p className="text-amber-800">
            Verify your email below to publish it. Until then it won&apos;t show up in search results.
          </p>
        </div>
      )}
      {isNewProvider && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 mb-4 text-left">
          <p className="font-medium mb-1">
            Price saved! We&apos;ll review {providerName || 'this provider'} and add them within 24 hours.
          </p>
          <p className="text-blue-700 text-xs mt-2">
            Are you the owner?{' '}
            <Link to="/business/claim" className="font-semibold text-rose-accent hover:text-rose-dark underline">
              Claim this listing &rarr;
            </Link>
          </p>
        </div>
      )}

      {/* ── Celebration hero ── */}
      <div className="text-center py-6">
        <div className="text-5xl mb-3">{cel.emoji}</div>
        <h2 className="text-2xl font-bold text-text-primary">{cel.headline}</h2>
        <p className="text-gray-500 mt-1 text-sm">
          {cel.sub(effectiveProviderName, procedure?.city, procDisplay)}
        </p>
        {!outlierFlagged && !needsEmailVerify && (
          <p className="text-xs text-gray-400 mt-2">
            You just helped people{procedure?.city ? ` in ${procedure.city}` : ''} know what to expect.
          </p>
        )}
      </div>

      {/* ── Entry count card ── */}
      <div className="rounded-2xl p-5 my-4" style={{ background: '#FFF0F5' }}>
        <p className="text-center text-sm text-gray-500 mb-3">Giveaway entries earned</p>
        <div className="space-y-2">
          {entryLines.map((line, i) => (
            <EntryLine
              key={i}
              label={line.label}
              value={line.value}
              delay={i * 150}
              pending={!!line.pending}
            />
          ))}
        </div>
        <div
          className="border-t mt-3 pt-3 flex justify-between items-center"
          style={{ borderColor: '#F4C0D1' }}
        >
          <span className="font-semibold text-sm text-text-primary">This month&apos;s total</span>
          <span className="text-2xl font-bold" style={{ color: '#C94F78' }}>
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* ── Receipt CTA ── */}
      {!hasReceipt && (
        <div
          className="border-2 border-dashed rounded-xl p-4 flex items-center gap-3 mb-4"
          style={{ borderColor: '#F4C0D1' }}
        >
          <span className="text-3xl flex-shrink-0">🧾</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-text-primary">Upload your receipt</p>
            <p className="text-xs text-gray-400">
              Turn {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} into {totalEntries * 3} — 3x multiplier
            </p>
          </div>
          <button
            onClick={() => navigate(user ? '/my-treatments' : '/log')}
            className="text-sm text-white px-3 py-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: '#C94F78' }}
          >
            Upload
          </button>
        </div>
      )}

      {/* ── Social share ── */}
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center px-4 py-3 rounded-xl mb-4 font-medium text-sm"
        style={{ background: '#111', color: '#fff' }}
      >
        {shareCopied
          ? 'Copied to clipboard!'
          : `I just helped women${procedure?.city ? ` in ${procedure.city}` : ''} know ${procDisplay} prices 💉`}
      </button>

      {/* ── Verified badge unlock ── */}
      <div className="rounded-xl bg-gray-50 p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span>🔵</span>
          <p className="font-medium text-sm text-text-primary">Unlock Verified badge</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Forward your appointment confirmation to get a blue checkmark on your profile
        </p>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-600 flex-1 truncate">{VERIFY_EMAIL}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(VERIFY_EMAIL);
              setVerifyCopied(true);
              setTimeout(() => setVerifyCopied(false), 2000);
            }}
            className="text-xs font-semibold shrink-0"
            style={{ color: '#C94F78' }}
          >
            {verifyCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Email capture (non-auth) OR Bottom actions (auth) ── */}
      {!user ? (
        <div>
          <div className="rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="text-base font-bold text-text-primary mb-1">
              Enter the $250 giveaway
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Create a free account to see your price report and earn badges.
            </p>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
              <button
                type="submit"
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition text-sm disabled:opacity-50"
                style={{ backgroundColor: '#C94F78' }}
              >
                {sending ? 'Sending...' : (
                  <>Create My Account <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/browse')}
              className="w-full py-3 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#C94F78' }}
            >
              Keep Browsing
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-gray-400 text-sm py-2"
            >
              No thanks, just browsing
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/browse')}
            className="w-full py-3 rounded-xl font-medium text-white"
            style={{ backgroundColor: '#C94F78' }}
          >
            Keep Browsing
          </button>
          <button
            onClick={() => navigate('/my-treatments')}
            className="w-full text-gray-400 text-sm py-2"
          >
            View my submission history
          </button>
        </div>
      )}

      {skipToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-xl shadow-lg border border-gray-100 px-6 py-4 flex items-center gap-3">
          <span className="text-lg">✓</span>
          <p className="text-sm text-text-primary">Price submitted!</p>
        </div>
      )}
    </div>
  );
}
