import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, MapPin, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { getEntryBreakdown } from '../lib/points';
import { PIONEER_TIERS } from '../lib/pioneerLogic';
import EmailConfirmation from './EmailConfirmation';
import SavingsShareCard from './SavingsShareCard';
import { getProcedureLabel } from '../lib/procedureLabel';

const VERIFY_EMAIL = 'verify@knowbeforeyouglow.com';

// Typical units per treatment for savings calculation
const TYPICAL_UNITS = {
  'Botox / Dysport / Xeomin': 28,
  'Botox': 28,
  'Dysport': 28,
  'Xeomin': 28,
  'Lip Filler': 1,
  'Cheek Filler': 1,
  'HydraFacial': 1,
};

function getTypicalUnits(procedureType) {
  return TYPICAL_UNITS[procedureType] || 1;
}

function normalizeProcName(type) {
  if (!type) return 'Treatment';
  if (type.includes('/') && /botox|dysport|xeomin/i.test(type)) return 'Neurotoxin';
  if (type.includes('/') && /juvederm|restylane|sculptra|filler/i.test(type)) return 'Filler';
  return type;
}

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
    sub: (_, city) => `Thanks for keeping${city ? ` ${city}` : ''} prices fresh`,
  },
  hundredth: {
    emoji: '🏆',
    headline: '100 submissions!!',
    sub: () => "You're basically a legend",
  },
};

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
  comparison,
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
  cheaperProviders = [],
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verifyCopied, setVerifyCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const barRef = useRef(null);
  const [barAnimated, setBarAnimated] = useState(false);

  const userPrice = Number(procedure.price_paid);
  const avgPrice = Number(comparison.avg_price);
  const minPrice = Number(comparison.min_price);
  const maxPrice = Number(comparison.max_price);
  const percentile = comparison.percentile;
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

  const isPerUnit = ['Botox / Dysport / Xeomin', 'Botox', 'Dysport', 'Xeomin'].includes(procedure.procedure_type);
  const unitLabel = isPerUnit ? '/unit' : '';

  const animatedSavings = useCountUp(Math.round(absDiff), 600, 400);

  useEffect(() => {
    const timeout = setTimeout(() => setBarAnimated(true), 300);
    return () => clearTimeout(timeout);
  }, []);

  const range = maxPrice - minPrice;
  const barPosition = range > 0
    ? Math.max(0, Math.min(100, ((userPrice - minPrice) / range) * 100))
    : 50;

  // Celebration
  const celebKey = pioneerResult ? 'pioneer'
    : (activeCount == null || activeCount === 0) ? 'first_submission'
    : activeCount === 99 ? 'hundredth'
    : 'returning';
  const cel = CELEBRATIONS[celebKey];
  const procDisplay = normalizeProcName(procedure.procedure_type);
  const effectiveProviderName = pioneerResult?.provider_name || '';

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
    <div className="max-w-lg mx-auto">

      {/* ── Outlier banner ── */}
      {outlierFlagged && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4 text-left">
          Thanks! Your submission is under review and will appear shortly.
        </div>
      )}

      {/* ── Celebration hero ── */}
      <div className="text-center py-6">
        <div className="text-5xl mb-3">{cel.emoji}</div>
        <h2 className="text-2xl font-bold text-text-primary">{cel.headline}</h2>
        <p className="text-gray-500 mt-1 text-sm">
          {cel.sub(effectiveProviderName, procedure.city, procDisplay)}
        </p>
        {!outlierFlagged && (
          <p className="text-xs text-gray-400 mt-2">
            You just helped {comparison?.sample_size || ''} people in{' '}
            {comparison?.city || comparison?.state || 'your area'} who are researching{' '}
            {getProcedureLabel(procedure.procedure_type, procedure.brand)} prices.
          </p>
        )}
      </div>

      {/* ── Comparison card ── */}
      <div className="glow-card p-6 text-left mb-6">
        <p className="text-sm text-text-secondary mb-1">You paid</p>
        <p className="text-3xl font-bold" style={{ color: '#C94F78' }}>
          ${userPrice.toLocaleString()}{unitLabel}
        </p>

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
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, #059669 0%, #FCD34D 50%, #DC2626 100%)' }}
            />
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
            <span
              className="font-medium text-text-primary text-xs"
              style={{ marginLeft: `${Math.max(10, Math.min(80, barPosition - 10))}%` }}
            >
              You&apos;re here
            </span>
            <span>expensive</span>
          </div>
        </div>

        {/* Savings/overpay line */}
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

        {/* Share savings button — opens SavingsShareCard */}
        <button
          onClick={() => setShowShareCard(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm"
          style={{ background: '#111', color: '#fff' }}
        >
          {absDiff > 0
            ? `I just ${paidBelow ? 'saved' : 'paid'} ${paidBelow ? '~' : ''}$${Math.round(absDiff).toLocaleString()} ${paidBelow ? 'vs' : 'above'} average 💉`
            : `I just helped women${procedure.city ? ` in ${procedure.city}` : ''} know ${procDisplay} prices 💉`}
        </button>

        {/* Cheaper providers */}
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

      {/* ── Entry count card ── */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: '#FFF0F5' }}>
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

      {/* ── Verified badge unlock ── */}
      <div className="rounded-xl bg-gray-50 p-4 mb-5">
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

      {/* ── Referral CTA ── */}
      <Link
        to="/refer"
        className="flex items-center gap-3 rounded-xl p-4 text-left mb-6 hover:no-underline transition-colors"
        style={{ background: '#ECFDF5', border: '0.5px solid #A7F3D0' }}
      >
        <Gift size={20} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Refer a friend, both get $10</p>
          <p className="text-xs text-text-secondary">
            Share your link and earn wallet credit when they verify a receipt.
          </p>
        </div>
        <ArrowRight size={16} className="text-text-secondary shrink-0 ml-auto" />
      </Link>

      {/* ── Email capture (non-auth) OR bottom actions (auth) ── */}
      {!user ? (
        <div>
          <div className="rounded-xl border border-gray-200 p-5 mb-4">
            <h3 className="text-base font-bold text-text-primary mb-1">
              Enter the $250 giveaway
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Create a free account to earn badges and track your submissions.
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
