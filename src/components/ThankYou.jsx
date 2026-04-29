import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getEntryBreakdown } from '../lib/points';
import { signUpWithPassword, signInWithGoogle, getAuthErrorMessage } from '../lib/auth';
import EmailConfirmation from './EmailConfirmation';

const GIVEAWAY_ACTIVE = false; // Enable when official sweepstakes rules are in place

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
  giveawayEmail = '',
}) {
  const needsEmailVerify = procedure?.status === 'pending_confirmation';
  const navigate = useNavigate();
  const [signupEmail, setSignupEmail] = useState(giveawayEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [showSignup, setShowSignup] = useState(true);
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

  async function handleInlineSignup(e) {
    e.preventDefault();
    if (!signupEmail || !password || signupLoading) return;
    setSignupLoading(true);
    setSignupError('');
    const { data, error } = await signUpWithPassword(signupEmail, password);
    if (error) {
      setSignupError(getAuthErrorMessage(error));
      setSignupLoading(false);
      return;
    }
    if (data?.user?.id && procedure?.id) {
      await supabase
        .from('procedures')
        .update({ user_id: data.user.id })
        .eq('id', procedure.id)
        .is('user_id', null);
    }
    if (data?.session) {
      navigate('/my/history');
    } else {
      setSignupDone(true);
    }
    setSignupLoading(false);
  }

  async function handleGoogleSignup() {
    await signInWithGoogle();
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

  if (signupDone) {
    return (
      <div className="max-w-lg mx-auto">
        <EmailConfirmation email={signupEmail} procedureId={procedure.id} />
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

      {/* ── Entry count card (giveaway — hidden until rules are in place) ── */}
      {GIVEAWAY_ACTIVE && (
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
      )}

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
              Adds a verified badge to your submission — builds trust with other users
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

      {/* ── Account creation (non-auth) OR bottom actions (auth) ── */}
      {!user ? (
        <div>
          {showSignup && (
            <div className="rounded-xl border border-gray-200 p-5 mb-4">
              <p className="text-sm text-gray-500 mb-4">
                Track your treatments, set price alerts, and keep your submission history.
              </p>
              <form onSubmit={handleInlineSignup} className="space-y-3">
                {giveawayEmail ? (
                  <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500">
                    {giveawayEmail}
                  </div>
                ) : (
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                )}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signupError && (
                  <p className="text-xs text-red-500">{signupError}</p>
                )}
                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#C94F78' }}
                >
                  {signupLoading ? 'Creating account...' : <>Create my account <ArrowRight size={16} /></>}
                </button>
              </form>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-sm font-medium text-text-primary hover:bg-gray-50 transition"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.092 17.64 11.783 17.64 9.205Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => setShowSignup(false)}
                className="w-full text-gray-400 text-sm py-2 mt-1 hover:text-gray-600 transition"
              >
                Skip for now →
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/browse')}
              className="w-full py-3 rounded-xl font-medium text-white"
              style={{ backgroundColor: '#C94F78' }}
            >
              Keep Browsing
            </button>
            {!showSignup && (
              <button
                onClick={handleSkip}
                className="w-full text-gray-400 text-sm py-2"
              >
                No thanks, just browsing
              </button>
            )}
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
            onClick={() => navigate('/my/history')}
            className="w-full text-gray-400 text-sm py-2"
          >
            View my submission history
          </button>
        </div>
      )}

      {skipToast && (
        <div className="fixed safe-bottom-above-nav left-1/2 -translate-x-1/2 z-[100] bg-white rounded-xl shadow-lg border border-gray-100 px-6 py-4 flex items-center gap-3">
          <span className="text-lg">✓</span>
          <p className="text-sm text-text-primary">Price submitted!</p>
        </div>
      )}
    </div>
  );
}
