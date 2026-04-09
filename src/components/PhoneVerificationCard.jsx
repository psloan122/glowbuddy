import { useState, useEffect, useContext } from 'react';
import { Phone, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

// PhoneVerificationCard
//
// Three visual states driven by `phase`:
//   - 'idle'     — user hasn't started. Shows the current verified
//                  phone (if any) + an input to enter/change it.
//   - 'pending'  — we called verify-phone-start and are waiting for
//                  the user to enter the 6-digit code.
//   - 'verified' — profiles.phone_verified = true. Shows the masked
//                  number + a "Change number" link that drops back to
//                  'idle'.
//
// Below the phone block, three always-visible SMS preference toggles
// drive profiles.notification_prefs.sms / .price_alerts / .specials.
// These toggles persist on click without a separate save button so
// the UX matches the email prefs above.

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm';

const DEFAULT_PREFS = {
  sms: true,
  email: true,
  price_alerts: true,
  specials: true,
};

const SMS_PREFS = [
  {
    key: 'sms',
    label: 'SMS notifications',
    description: 'Master switch for all text messages from Know Before You Glow.',
  },
  {
    key: 'price_alerts',
    label: 'Price alert matches',
    description: 'Get texted when a provider posts a special matching one of your price alerts.',
  },
  {
    key: 'specials',
    label: 'New specials nearby',
    description: 'Occasional texts when top-tier providers in your city run new specials.',
  },
];

// Normalize user input into E.164 format ("+15551234567"). Accepts raw
// 10-digit US numbers, numbers with spaces/dashes/parens, and anything
// already starting with a "+". Everything else is returned as-is so
// the server-side regex can reject it with a clear error.
function normalizePhone(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/[^0-9]/g, '');
  }
  const digits = trimmed.replace(/[^0-9]/g, '');
  // Assume US if caller gives us a 10-digit or 11-digit (with leading 1) number.
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return trimmed;
}

function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone);
  if (s.length < 6) return s;
  return s.slice(0, 3) + ' ••• ••' + s.slice(-2);
}

export default function PhoneVerificationCard() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [savedPhone, setSavedPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const [phase, setPhase] = useState('idle'); // 'idle' | 'pending' | 'verified'
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // ── Load existing profile state ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase
      .from('profiles')
      .select('phone, phone_verified, notification_prefs')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setSavedPhone(data.phone || '');
          setPhoneVerified(Boolean(data.phone_verified));
          setPrefs({ ...DEFAULT_PREFS, ...(data.notification_prefs || {}) });
          if (data.phone_verified) {
            setPhase('verified');
          }
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Step 1: send the verification code ────────────────────────────
  async function handleSendCode() {
    setError('');
    setInfo('');
    const phone = normalizePhone(input);
    if (!phone) {
      setError('Please enter a phone number.');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone-start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ phone }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Failed to send verification code.');
        return;
      }
      setInput(phone); // lock in the normalized value
      setPhase('pending');
      setInfo(
        `Code sent. Enter it below to finish verifying. Expires in ${body.ttl_minutes || 10} minutes.`,
      );
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSending(false);
    }
  }

  // ── Step 2: confirm the code ──────────────────────────────────────
  async function handleVerifyCode() {
    setError('');
    setInfo('');
    if (!/^[0-9]{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from the text message.');
      return;
    }

    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone-confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ phone: input, code: code.trim() }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        const attemptsLeft =
          body.attempts_left != null ? ` (${body.attempts_left} left)` : '';
        setError((body.error || 'Verification failed.') + attemptsLeft);
        return;
      }
      setSavedPhone(input);
      setPhoneVerified(true);
      setCode('');
      setPhase('verified');
      setInfo('Phone number verified.');
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setVerifying(false);
    }
  }

  // ── Toggle an SMS preference ──────────────────────────────────────
  async function togglePref(key) {
    if (!user?.id) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ notification_prefs: next })
      .eq('user_id', user.id);
    if (updErr) {
      // Revert on failure
      setPrefs(prefs);
      setError('Failed to save preference.');
    }
  }

  function handleChangeNumber() {
    setPhase('idle');
    setInput('');
    setCode('');
    setError('');
    setInfo('');
  }

  if (!user) return null;

  return (
    <div className="glow-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Phone size={18} className="text-rose-accent" />
        <h2 className="text-lg font-bold text-text-primary">Phone &amp; SMS</h2>
      </div>
      <p className="text-sm text-text-secondary mb-5">
        Add a verified phone number to get texted when a provider posts
        a special that matches one of your price alerts.
      </p>

      {loading ? (
        <div className="py-4 flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* ── Verified state ── */}
          {phase === 'verified' && (
            <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {maskPhone(savedPhone)}
                  </p>
                  <p className="text-xs text-text-secondary">Verified</p>
                </div>
              </div>
              <button
                onClick={handleChangeNumber}
                className="text-xs text-rose-accent hover:underline"
              >
                Change number
              </button>
            </div>
          )}

          {/* ── Idle (enter number) ── */}
          {phase === 'idle' && (
            <div className="space-y-3">
              {phoneVerified && savedPhone && (
                <p className="text-xs text-text-secondary">
                  Current: {maskPhone(savedPhone)}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className={INPUT_CLASS}
                  disabled={sending}
                  autoComplete="tel"
                />
                <button
                  onClick={handleSendCode}
                  disabled={sending || !input.trim()}
                  className="px-5 py-3 text-white font-medium rounded-xl text-sm whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-2"
                  style={{ backgroundColor: '#C94F78' }}
                >
                  {sending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send code'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Pending (enter code) ── */}
          {phase === 'pending' && (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">
                Sent to{' '}
                <span className="font-medium text-text-primary">{input}</span>
                {' · '}
                <button
                  onClick={handleChangeNumber}
                  className="text-rose-accent hover:underline"
                >
                  use a different number
                </button>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                  }
                  placeholder="6-digit code"
                  className={INPUT_CLASS}
                  disabled={verifying}
                  autoComplete="one-time-code"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || code.length !== 6}
                  className="px-5 py-3 text-white font-medium rounded-xl text-sm whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-2"
                  style={{ backgroundColor: '#C94F78' }}
                >
                  {verifying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
              <button
                onClick={handleSendCode}
                disabled={sending}
                className="text-xs text-rose-accent hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          )}

          {/* Status messages */}
          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-600">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && !error && (
            <p className="mt-3 text-xs text-green-700">{info}</p>
          )}

          {/* ── SMS preference toggles ── */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold uppercase text-text-secondary mb-3" style={{ letterSpacing: '0.08em' }}>
              Text message preferences
            </p>
            <div className="space-y-3">
              {SMS_PREFS.map((pref) => {
                const disabled =
                  pref.key !== 'sms' && !prefs.sms; // child prefs greyed out when master is off
                return (
                  <div
                    key={pref.key}
                    className={`flex items-start justify-between gap-4 py-2 ${disabled ? 'opacity-50' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {pref.label}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {pref.description}
                      </p>
                    </div>
                    <button
                      onClick={() => !disabled && togglePref(pref.key)}
                      disabled={disabled}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        prefs[pref.key] ? 'bg-rose-accent' : 'bg-gray-300'
                      } ${disabled ? 'cursor-not-allowed' : ''}`}
                      aria-label={`Toggle ${pref.label}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          prefs[pref.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-text-secondary mt-4">
              Message &amp; data rates may apply. Reply STOP to any Know Before You Glow text to unsubscribe.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
