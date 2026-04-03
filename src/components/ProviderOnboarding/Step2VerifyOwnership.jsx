import { useState } from 'react';
import { Mail, Phone, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Step2VerifyOwnership({ placeData, onComplete }) {
  const [method, setMethod] = useState(null); // 'email' | 'phone' | 'manual'
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [domainWarning, setDomainWarning] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check domain match
  function checkDomainMatch(email) {
    if (!placeData?.website || !email.includes('@')) return true;
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const websiteDomain = placeData.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return emailDomain === websiteDomain || websiteDomain.includes(emailDomain) || emailDomain.includes(websiteDomain);
  }

  async function handleSendCode() {
    setError('');
    setSending(true);

    const matches = checkDomainMatch(email);
    setDomainWarning(!matches);

    // Use Supabase magic link OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      // If user doesn't exist with this email, just proceed with manual
      setError('Could not send verification code. You can proceed with manual review.');
      setSending(false);
      return;
    }

    setCodeSent(true);
    setSending(false);
    startCooldown();
  }

  function startCooldown() {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleVerifyCode() {
    setError('');
    setVerifying(true);

    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setError('Please enter the full 6-digit code.');
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: codeStr,
      type: 'email',
    });

    if (verifyError) {
      setAttempts((prev) => prev + 1);
      if (attempts >= 2) {
        setError('Too many attempts. Please try manual review instead.');
      } else {
        setError('Invalid code. Please try again.');
      }
      setVerifying(false);
      return;
    }

    setVerifying(false);
    onComplete('email');
  }

  function handleCodeInput(index, val) {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;

    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    // Auto-focus next
    if (val && index < 5) {
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }
  }

  function handleCodeKeyDown(index, e) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`);
      prev?.focus();
    }
  }

  function handleManualReview() {
    onComplete('manual');
  }

  function handlePhoneVerify() {
    // For now, phone verification falls through to manual
    onComplete('phone');
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Verify you own this practice</h1>
      <p className="text-text-secondary mb-6">
        We need to confirm you're authorized to manage this listing.
      </p>

      {/* Practice reference card */}
      {placeData && (
        <div className="bg-warm-gray rounded-xl px-4 py-3 mb-8 flex items-center gap-3">
          <CheckCircle size={16} className="text-verified flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{placeData.name}</p>
            <p className="text-xs text-text-secondary">{placeData.formattedAddress}</p>
          </div>
        </div>
      )}

      {!method ? (
        <div className="space-y-3">
          {/* Email option */}
          <button
            onClick={() => setMethod('email')}
            className="w-full glow-card p-5 text-left hover:border-rose-accent/40 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-light flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-rose-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-primary">Verify by email</h3>
                  <span className="text-xs bg-verified/10 text-verified px-2 py-0.5 rounded-full font-medium">Recommended</span>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  We'll send a code to an email address associated with your practice domain.
                </p>
                <span className="text-xs text-text-secondary mt-2 inline-block">Fastest — usually instant</span>
              </div>
            </div>
          </button>

          {/* Phone option */}
          <button
            onClick={() => setMethod('phone')}
            className="w-full glow-card p-5 text-left hover:border-rose-accent/40 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-light flex items-center justify-center flex-shrink-0">
                <Phone size={20} className="text-rose-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">Verify by phone</h3>
                <p className="text-sm text-text-secondary mt-1">
                  We'll call or text the phone number listed for your practice.
                </p>
                {placeData?.phone && (
                  <p className="text-sm font-medium text-text-primary mt-1">{placeData.phone}</p>
                )}
                <span className="text-xs text-text-secondary mt-2 inline-block">2-3 minutes</span>
              </div>
            </div>
          </button>

          {/* Manual review */}
          <button
            onClick={() => setMethod('manual')}
            className="w-full glow-card p-5 text-left hover:border-rose-accent/40 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-light flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-rose-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">Request manual review</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Our team will verify your ownership within 1-2 business days. We may ask for a business license or other documentation.
                </p>
                <span className="text-xs text-text-secondary mt-2 inline-block">1-2 business days</span>
              </div>
            </div>
          </button>
        </div>
      ) : method === 'email' ? (
        <div>
          {!codeSent ? (
            <div className="glow-card p-6">
              <h3 className="font-semibold text-text-primary mb-4">Enter your practice email</h3>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@yourpractice.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm mb-2"
              />
              <p className="text-xs text-text-secondary mb-4">
                Must match your practice's website domain (e.g. @glowspa.com)
              </p>
              {domainWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-yellow-700">
                    This email domain doesn't match your website. You can still proceed but verification may take longer.
                  </p>
                </div>
              )}
              {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
              <button
                onClick={handleSendCode}
                disabled={!email || sending}
                className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
              >
                {sending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Send verification code'}
              </button>
            </div>
          ) : (
            <div className="glow-card p-6">
              <h3 className="font-semibold text-text-primary mb-2">Enter the 6-digit code</h3>
              <p className="text-sm text-text-secondary mb-6">We sent it to {email}</p>

              <div className="flex justify-center gap-2 mb-6">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition"
                  />
                ))}
              </div>

              {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

              <button
                onClick={handleVerifyCode}
                disabled={verifying || code.join('').length !== 6}
                className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50 mb-3"
              >
                {verifying ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Verify'}
              </button>

              <button
                onClick={handleSendCode}
                disabled={resendCooldown > 0}
                className="w-full text-sm text-text-secondary hover:text-text-primary transition disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          )}
          <button onClick={() => setMethod(null)} className="mt-4 text-sm text-text-secondary hover:text-text-primary transition">
            &larr; Choose different method
          </button>
        </div>
      ) : method === 'phone' ? (
        <div className="glow-card p-6 text-center">
          <Phone size={32} className="text-rose-accent mx-auto mb-4" />
          <h3 className="font-semibold text-text-primary mb-2">Phone verification</h3>
          {placeData?.phone ? (
            <p className="text-sm text-text-secondary mb-6">
              We'll send a text to <strong>{placeData.phone}</strong>
            </p>
          ) : (
            <p className="text-sm text-text-secondary mb-6">
              No phone number found. We'll proceed with manual review instead.
            </p>
          )}
          <button
            onClick={handlePhoneVerify}
            className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            {placeData?.phone ? 'Send verification text' : 'Proceed with manual review'}
          </button>
          <button onClick={() => setMethod(null)} className="mt-4 text-sm text-text-secondary hover:text-text-primary transition block mx-auto">
            &larr; Choose different method
          </button>
        </div>
      ) : (
        <div className="glow-card p-6 text-center">
          <Clock size={32} className="text-rose-accent mx-auto mb-4" />
          <h3 className="font-semibold text-text-primary mb-2">Manual review requested</h3>
          <p className="text-sm text-text-secondary mb-6">
            Our team will verify your ownership within 1-2 business days. We'll email you when your listing is ready.
          </p>
          <button
            onClick={handleManualReview}
            className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Continue setting up your profile &rarr;
          </button>
          <button onClick={() => setMethod(null)} className="mt-4 text-sm text-text-secondary hover:text-text-primary transition block mx-auto">
            &larr; Choose different method
          </button>
        </div>
      )}
    </div>
  );
}
