import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Trophy, Mail, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { getEntryBreakdown } from '../lib/points';
import { PIONEER_TIERS, getPioneerToastMessage } from '../lib/pioneerLogic';
import EmailConfirmation from './EmailConfirmation';

const VERIFY_EMAIL = 'verify@glowbuddy.com';

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

}) {
  // True when anonymous submission is waiting on email verification.
  // These rows live in `procedures` with status = 'pending_confirmation'
  // and are invisible to browse queries until claimPendingSubmission
  // flips them to 'active'. Telling the user "your price is live!" in
  // this state is a lie that breaks trust when they can't find it.
  const needsEmailVerify = procedure?.status === 'pending_confirmation';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [skipToast, setSkipToast] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleCreateAccount(e) {
    e.preventDefault();
    if (!email || sending) return;
    setSending(true);

    // Send magic link
    await supabase.auth.signInWithOtp({ email });

    // Insert giveaway entry
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

  function handleSignIn() {
    if (!email) return;
    handleCreateAccount({ preventDefault: () => {} });
  }

  function handleSkip() {
    setSkipToast(true);
    setTimeout(() => {
      navigate('/');
    }, 100);
  }

  // If email has been sent, show confirmation
  if (emailSent) {
    return (
      <div className="max-w-lg mx-auto">
        <EmailConfirmation email={email} procedureId={procedure.id} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Outlier banner */}
      {outlierFlagged && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6 text-left">
          Thanks! Your submission is under review and will appear shortly.
        </div>
      )}

      {/* Pending-confirmation banner — honest messaging for anonymous users */}
      {needsEmailVerify && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-6 text-left">
          <p className="font-medium mb-1">We saved your price — one more step.</p>
          <p className="text-amber-800">
            Verify your email below to publish it. Until then it won&apos;t show
            up in search results.
          </p>
        </div>
      )}

      {/* Checkmark */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: '#C94F78' }}
      >
        <Check size={32} className="text-white" />
      </div>

      {/* Pioneer celebration */}
      {pioneerResult && (() => {
        const tier = PIONEER_TIERS[pioneerResult.pioneer_tier] || PIONEER_TIERS.pioneer;
        return (
          <div
            className="rounded-xl p-4 mb-5 text-left"
            style={{ background: '#FFFBEB', border: '1px solid rgba(251, 191, 36, 0.3)' }}
          >
            <div>
              <p
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: '#B45309', fontWeight: 600 }}
              >
                {tier.label}
              </p>
              <p className="text-sm font-medium text-text-primary leading-snug">
                {getPioneerToastMessage(pioneerResult.provider_name, pioneerResult.pioneer_tier)}
              </p>
              <p className="text-xs mt-2" style={{ color: '#B45309' }}>
                You&apos;ve also entered the Pioneer Giveaway ($200/month)
              </p>
            </div>
          </div>
        );
      })()}

      {/* Headline */}
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        {needsEmailVerify
          ? 'Almost there'
          : outlierFlagged
            ? 'Your price is under review'
            : 'Your price is live.'}
      </h2>

      <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
        {needsEmailVerify
          ? 'Verify your email below to publish your submission and enter this month\u2019s giveaway.'
          : outlierFlagged
            ? 'Our team is reviewing your submission. It\u2019ll appear in results shortly.'
            : `You just helped people${procedure.city ? ` in ${procedure.city}` : ''} who are researching ${procedure.procedure_type} prices know what to expect.`}
      </p>

      {/* Entry count card */}
      <div className="bg-rose-light/30 rounded-xl p-4 mb-8 text-left">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-rose-accent" />
          <p className="text-sm font-semibold text-text-primary">
            You earned {totalEntries} giveaway{' '}
            {totalEntries === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="space-y-1">
          {entryLines.map((line, i) => (
            <p key={i} className={`text-xs ${line.pending ? 'text-text-secondary/60 italic' : 'text-text-secondary'}`}>
              {line.pending ? (
                line.label
              ) : (
                <>
                  {i > 0 ? '+ ' : ''}
                  {line.value} {line.value === 1 ? 'entry' : 'entries'} for{' '}
                  {line.label.toLowerCase()}
                </>
              )}
            </p>
          ))}
          {entryLines.length > 1 && (
            <p className="text-xs font-semibold text-rose-accent pt-1 border-t border-rose-accent/10">
              = {totalEntries} total entries this month
            </p>
          )}
        </div>
        {!hasReceipt && (
          <p className="text-xs text-text-secondary mt-2 pt-2 border-t border-rose-accent/10">
            Upload a receipt next time to earn 3x more entries
          </p>
        )}
      </div>

      {/* Share button */}
      <button
        onClick={() => {
          if (navigator.share) {
            navigator.share({
              title: 'I shared my price on GlowBuddy',
              text: `I just shared what I paid for ${procedure.procedure_type}${procedure.city ? ` in ${procedure.city}` : ''}. Check out real prices from real patients.`,
              url: 'https://glowbuddy.com',
            }).catch(() => {});
          } else {
            navigator.clipboard.writeText('https://glowbuddy.com');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors mb-5"
        style={{ backgroundColor: '#C94F78' }}
      >
        <Share2 size={14} />
        Share your contribution
      </button>

      {/* Email forward verification prompt */}
      <div
        className="rounded-xl p-4 text-left mt-4"
        style={{ background: '#FBE8EF', border: '0.5px solid #F4C0D1' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} className="text-rose-accent shrink-0" />
          <p className="text-sm font-medium text-text-primary">
            Get a Verified badge
          </p>
        </div>
        <p className="text-[13px] text-text-secondary mb-3">
          Forward your appointment confirmation email to verify your visit and
          earn +1 giveaway entry.
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(VERIFY_EMAIL);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-[13px] font-medium text-white rounded-full px-4 py-2 hover:opacity-90 transition"
          style={{ backgroundColor: '#C94F78' }}
        >
          {copied ? 'Copied!' : `Copy ${VERIFY_EMAIL}`}
        </button>
        <p className="text-[11px] text-text-secondary mt-2">
          Forward from the same email you used to sign up. We auto-verify
          within minutes.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-8 mt-8" />

      {/* Email capture — only shown when not authenticated */}
      {!user ? (
        <div className="text-left">
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Want to see how you compare?
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            Create a free account to see your price report, earn badges,
            and enter our monthly $250 treatment giveaway.
          </p>

          <form onSubmit={handleCreateAccount} className="space-y-3 mb-4">
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
              {sending ? (
                'Sending...'
              ) : (
                <>
                  Create My Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center space-y-3">
            <button
              onClick={handleSignIn}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Already have an account?{' '}
              <span className="font-medium text-rose-accent">Sign in</span>
            </button>

            <div>
              <button
                onClick={handleSkip}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                No thanks, just browsing
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated user — simple confirmation */
        <div>
          <p className="text-sm text-text-secondary mb-6">
            Your price is{' '}
            {outlierFlagged ? 'under review and will be' : 'now'} live.
            Check your{' '}
            <button
              onClick={() => navigate('/my-treatments')}
              className="font-medium text-rose-accent hover:text-rose-dark transition-colors"
            >
              treatment history
            </button>{' '}
            to see your price report and badges.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/my-treatments')}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition text-sm"
              style={{ backgroundColor: '#C94F78' }}
            >
              View My Treatments
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Back to browsing
            </button>
          </div>
        </div>
      )}

      {/* Skip toast (rendered briefly before navigation) */}
      {skipToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-xl shadow-lg border border-gray-100 px-6 py-4 flex items-center gap-3 animate-fade-in">
          <span className="text-lg">&check;</span>
          <p className="text-sm text-text-primary">
            Price submitted! It&apos;ll appear once our team reviews it.
          </p>
        </div>
      )}
    </div>
  );
}
