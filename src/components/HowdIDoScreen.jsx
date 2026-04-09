import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, ArrowRight, Trophy, Mail, MapPin, Share2, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { getEntryBreakdown } from '../lib/points';
import { PIONEER_TIERS, getPioneerToastMessage } from '../lib/pioneerLogic';
import EmailConfirmation from './EmailConfirmation';
import SavingsShareCard from './SavingsShareCard';
import { getProcedureLabel } from '../lib/procedureLabel';

const VERIFY_EMAIL = 'verify@knowbeforeyouglow.com';

// Typical units per treatment for savings calculation
const TYPICAL_UNITS = {
  'Botox / Dysport / Xeomin': 28,
  'Lip Filler': 1,
  'Cheek Filler': 1,
  'HydraFacial': 1,
};

function getTypicalUnits(procedureType) {
  return TYPICAL_UNITS[procedureType] || 1;
}

// Animate a number from 0 to target
function useCountUp(target, duration = 600, delay = 300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

export default function HowdIDoScreen({
  procedure,
  comparison, // { avg_price, median_price, sample_size, min_price, max_price, percentile, city, state }
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

  cheaperProviders = [], // [{ provider_name, avg_price }]
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const barRef = useRef(null);
  const [barAnimated, setBarAnimated] = useState(false);

  const userPrice = Number(procedure.price_paid);
  const avgPrice = Number(comparison.avg_price);
  const minPrice = Number(comparison.min_price);
  const maxPrice = Number(comparison.max_price);
  const percentile = comparison.percentile; // 0–100, lower = cheaper
  const typicalUnits = getTypicalUnits(procedure.procedure_type);

  const diff = (avgPrice - userPrice) * typicalUnits;
  const paidBelow = userPrice < avgPrice;
  const paidAbove = userPrice > avgPrice;
  const absDiff = Math.abs(diff);

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

  // Determine unit label
  const isPerUnit = procedure.procedure_type === 'Botox / Dysport / Xeomin';
  const unitLabel = isPerUnit ? '/unit' : '';

  // Savings count-up animation
  const animatedSavings = useCountUp(Math.round(absDiff), 600, 400);

  // Progress bar animation
  useEffect(() => {
    const timeout = setTimeout(() => setBarAnimated(true), 300);
    return () => clearTimeout(timeout);
  }, []);

  // Position on the bar (0% = min, 100% = max)
  const range = maxPrice - minPrice;
  const barPosition = range > 0
    ? Math.max(0, Math.min(100, ((userPrice - minPrice) / range) * 100))
    : 50;

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

      {/* Checkmark */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: '#C94F78' }}
      >
        <Check size={32} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Your price is live.</h2>
      <p className="text-sm text-text-secondary mb-6">
        You just helped {comparison?.sample_size || ''} people in {comparison?.city || comparison?.state || 'your area'} who are researching {getProcedureLabel(procedure.procedure_type, procedure.brand)} prices.
      </p>

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

      {/* ═══ COMPARISON CARD ═══ */}
      <div className="glow-card p-6 text-left mb-6">
        {/* You paid */}
        <p className="text-sm text-text-secondary mb-1">You paid</p>
        <p className="text-3xl font-bold" style={{ color: '#C94F78' }}>
          ${userPrice.toLocaleString()}{unitLabel}
        </p>

        {/* Avg + range */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              {comparison.city || comparison.state} avg
            </span>
            <span className="font-semibold text-text-primary">
              ${Number(avgPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{unitLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">City range</span>
            <span className="font-semibold text-text-primary">
              ${minPrice.toLocaleString()} &ndash; ${maxPrice.toLocaleString()}{unitLabel}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 mb-2">
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            {/* Gradient bar */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, #059669 0%, #FCD34D 50%, #DC2626 100%)' }}
            />
            {/* User position indicator */}
            <div
              ref={barRef}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-sm transition-all duration-[800ms] ease-out"
              style={{
                borderColor: '#C94F78',
                left: barAnimated ? `calc(${barPosition}% - 8px)` : '-8px',
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-text-secondary mt-1.5">
            <span>cheap</span>
            <span className="font-medium text-text-primary text-xs" style={{ marginLeft: `${Math.max(10, Math.min(80, barPosition - 10))}%` }}>
              You&apos;re here
            </span>
            <span>expensive</span>
          </div>
        </div>

        {/* Savings or overpay line */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {paidBelow ? (
            <>
              <p className="text-sm font-semibold text-text-primary">
                You saved ~${animatedSavings.toLocaleString()} vs average
                {typicalUnits > 1 && (
                  <span className="font-normal text-text-secondary">
                    {' '}on a typical {typicalUnits}-unit treatment
                  </span>
                )}
                {' '}&#x1F49A;
              </p>
              {percentile != null && percentile <= 30 && (
                <p className="text-sm text-text-secondary mt-1">
                  Top {Math.round(100 - percentile)}% of prices in {comparison.city || comparison.state} &#x1F389;
                </p>
              )}
            </>
          ) : paidAbove ? (
            <>
              <p className="text-sm font-semibold text-text-primary">
                You paid ${animatedSavings.toLocaleString()} more than avg
                {typicalUnits > 1 && (
                  <span className="font-normal text-text-secondary">
                    {' '}on a typical {typicalUnits}-unit treatment
                  </span>
                )}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                You&apos;ll know better next time. &#x1F440;
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-text-primary">
              Right at the local average &#x2705;
            </p>
          )}
        </div>

        {/* Share button */}
        <button
          onClick={() => setShowShareCard(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
          style={{ backgroundColor: '#C94F78' }}
        >
          <Share2 size={14} />
          {absDiff > 0 ? 'Share your savings' : 'Share your price'}
        </button>

        {/* Cheaper providers (only when user paid above avg) */}
        {paidAbove && cheaperProviders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-text-secondary mb-2">
              These providers average ${Math.round(avgPrice - cheaperProviders[0].avg_price)} less:
            </p>
            <div className="space-y-1.5">
              {cheaperProviders.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary flex items-center gap-1.5">
                    <MapPin size={12} className="text-text-secondary" />
                    {p.provider_name}
                  </span>
                  <span className="font-semibold text-text-primary">
                    ${Number(p.avg_price).toLocaleString()}{unitLabel} avg
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ GIVEAWAY ENTRIES ═══ */}
      <div className="bg-rose-light/30 rounded-xl p-4 mb-5 text-left">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-rose-accent" />
          <p className="text-sm font-semibold text-text-primary">
            This submission earned you:
          </p>
        </div>
        <div className="space-y-1">
          {entryLines.map((line, i) => (
            <p key={i} className={`text-xs ${line.pending ? 'text-text-secondary/60 italic' : 'text-text-secondary'}`}>
              {line.pending ? (
                line.label
              ) : (
                <>
                  +{line.value} {line.label}
                </>
              )}
            </p>
          ))}
          {entryLines.length > 1 && (
            <>
              <div className="border-t border-rose-accent/10 my-1" />
              <p className="text-xs font-semibold text-rose-accent">
                Total: {totalEntries} new {totalEntries === 1 ? 'entry' : 'entries'}
              </p>
            </>
          )}
        </div>
        {!hasReceipt && (
          <p className="text-xs text-text-secondary mt-2 pt-2 border-t border-rose-accent/10">
            Upload a receipt next time to earn 3x more entries
          </p>
        )}
      </div>

      {/* ═══ EMAIL FORWARD CTA ═══ */}
      <div
        className="rounded-xl p-4 text-left mb-6"
        style={{ background: '#FBE8EF', border: '0.5px solid #F4C0D1' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} className="text-rose-accent shrink-0" />
          <p className="text-sm font-medium text-text-primary">
            Get a Verified badge
          </p>
        </div>
        <p className="text-[13px] text-text-secondary mb-3">
          Forward your confirmation email to earn +3 entries.
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
      </div>

      {/* ═══ REFERRAL CTA ═══ */}
      <Link
        to="/refer"
        className="flex items-center gap-3 rounded-xl p-4 text-left mb-6 hover:no-underline transition-colors"
        style={{ background: '#ECFDF5', border: '0.5px solid #A7F3D0' }}
      >
        <Gift size={20} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Refer a friend, both get $10</p>
          <p className="text-xs text-text-secondary">Share your link and earn wallet credit when they verify a receipt.</p>
        </div>
        <ArrowRight size={16} className="text-text-secondary shrink-0 ml-auto" />
      </Link>

      {/* ═══ BOTTOM ACTIONS ═══ */}
      <div className="border-t border-gray-100 pt-6">
        {!user ? (
          <div className="text-left">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Want to track your treatments?
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Create a free account to earn badges and enter our monthly $250 treatment giveaway.
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
                {sending ? 'Sending...' : (
                  <>Create My Account <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/browse')}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition text-sm"
              style={{ backgroundColor: '#C94F78' }}
            >
              Find more providers
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => {
                // Reset the form — navigate to /log
                navigate('/log');
                window.location.reload();
              }}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Log another treatment
            </button>
          </div>
        )}
      </div>

      {/* Share card modal */}
      {showShareCard && (
        <SavingsShareCard
          procedureType={procedure.procedure_type}
          pricePerUnit={String(userPrice)}
          unitLabel={unitLabel}
          city={comparison.city || comparison.state || ''}
          yearlySavings={absDiff * 3}
          percentile={percentile}
          paidBelow={paidBelow}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
