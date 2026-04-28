import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff, CheckCircle, ArrowLeft, Mail, Syringe, Trophy, Lock } from 'lucide-react';
import { signUpWithPassword, signInWithPassword, signInWithGoogle, resetPassword, getAuthErrorMessage } from '../lib/auth';
import { supabase } from '../lib/supabase';

function getPasswordStrength(password) {
  if (!password) return null;
  if (password.length < 6) return { level: 0, label: 'Too short', color: '#EF4444' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { level: 2, label: 'Medium', color: '#F59E0B' };
  return { level: 3, label: 'Strong', color: '#10B981' };
}

function validateEmail(email) {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return '';
}

function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'At least 6 characters';
  return '';
}

function validateConfirm(confirm, password) {
  if (!confirm) return 'Please confirm your password';
  if (confirm !== password) return "Passwords don't match";
  return '';
}

// Shared wrapper: full-screen on mobile, centered card on desktop.
// Mobile:  fixed inset-0, white background, scrollable, safe-area padding.
// Desktop: dark backdrop overlay, centred floating card (max-w 440px).
function ModalShell({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-[90] sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:backdrop-blur-sm sm:px-4">
      <div
        className="fixed inset-0 bg-white overflow-y-auto sm:static sm:inset-auto sm:overflow-y-auto sm:rounded-xl sm:max-w-[440px] sm:w-full sm:shadow-xl sm:max-h-[90vh]"
        // 100dvh keeps the modal height equal to the *visible* viewport on iOS —
        // it shrinks when the software keyboard appears so content stays reachable.
        // On desktop sm:static overrides fixed, so height auto.
        style={{ height: '100dvh' }}
      >
        <div
          className="px-6 sm:px-8 sm:py-8"
          style={{
            paddingTop:    'max(env(safe-area-inset-top, 0px), 20px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 28px)',
          }}
        >
          {/* Close button — offset from notch/dynamic island */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute text-text-secondary hover:text-text-primary transition"
              style={{
                top:   'calc(env(safe-area-inset-top, 0px) + 12px)',
                right: '16px',
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AuthModal({ mode: initialMode, providerMode = false, flow = 'default', hint = null, onClose }) {
  const isBusiness = flow === 'business';
  const [mode, setMode] = useState(initialMode || 'signup'); // signup | signin | forgot
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [loadingText, setLoadingText] = useState('Setting up your experience...');
  const [showEscape, setShowEscape] = useState(false);

  // In business flow, always provider. Otherwise seeded from prop.
  const [isProvider, setIsProvider] = useState(isBusiness || providerMode);
  const [businessName, setBusinessName] = useState('');
  const [businessRole, setBusinessRole] = useState('Owner');

  // Inline validation
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', confirm: '' });

  // Collapse value props while user is filling in a field (frees vertical
  // space above the keyboard so inputs stay centred in the visible area).
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);

  const passwordRef = useRef(null);

  function onAnyFocus() {
    clearTimeout(typingTimer.current);
    setIsTyping(true);
  }

  function onAnyBlur() {
    // Short delay so tabbing between fields doesn't flicker the props back.
    typingTimer.current = setTimeout(() => setIsTyping(false), 200);
  }

  // When the iOS software keyboard opens it resizes window.visualViewport
  // rather than the layout viewport. Scroll the focused input into view so
  // it stays above the keyboard. No-op on Android (keyboard resizes the
  // layout viewport directly) and desktop.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const handler = () => {
      const el = document.activeElement;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  function handleBlur(field) {
    onAnyBlur();
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    } else if (field === 'confirm') {
      setFieldErrors((prev) => ({ ...prev, confirm: validateConfirm(confirmPassword, password) }));
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setSuccess(false);
    setForgotSent(false);
    setAgreedToTerms(false);
    // Business flow is always provider; default flow resets to patient.
    setIsProvider(isBusiness);
    setBusinessName('');
    setBusinessRole('Owner');
    setTouched({ email: false, password: false, confirm: false });
    setFieldErrors({ email: '', password: '', confirm: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    const emailErr = validateEmail(email);
    const passwordErr = mode !== 'forgot' ? validatePassword(password) : '';
    const confirmErr = mode === 'signup' ? validateConfirm(confirmPassword, password) : '';

    setFieldErrors({ email: emailErr, password: passwordErr, confirm: confirmErr });
    setTouched({ email: true, password: true, confirm: true });

    if (emailErr || passwordErr || confirmErr) return;

    setSending(true);
    setError('');

    if (mode === 'forgot') {
      const { error: resetErr } = await resetPassword(email);
      if (resetErr) {
        setError(getAuthErrorMessage(resetErr));
      } else {
        setForgotSent(true);
      }
      setSending(false);
      return;
    }

    if (mode === 'signup') {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const fullName = [trimmedFirst, trimmedLast].filter(Boolean).join(' ');
      const metadata = {
        ...(trimmedFirst ? { first_name: trimmedFirst, full_name: fullName } : {}),
        user_role: isProvider ? 'provider' : 'patient',
        ...(isProvider ? {
          business_name: businessName.trim(),
          business_role: businessRole,
        } : {}),
      };

      if (isProvider) {
        sessionStorage.setItem('gb_pending_action', JSON.stringify({ path: '/business/claim' }));
      }

      const { data, error: authError } = await signUpWithPassword(email, password, metadata);
      if (authError) {
        if (isProvider) sessionStorage.removeItem('gb_pending_action');
        setError(getAuthErrorMessage(authError));
      } else if (data?.user) {
        if (trimmedFirst) {
          supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            first_name: trimmedFirst,
            updated_at: new Date().toISOString(),
          }).then(() => {});
        }
        setSuccess(true);
        setHasSession(!!data.session);
      }
    } else {
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) {
        setError(getAuthErrorMessage(authError));
      }
    }

    setSending(false);
  }

  async function handleGoogle() {
    setError('');
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(getAuthErrorMessage(authError));
    }
  }

  const strength = mode === 'signup' ? getPasswordStrength(password) : null;

  // Safety timeout: if session exists but onAuthStateChange hasn't redirected
  // after 3s, update the text; after 5s show escape hatch.
  useEffect(() => {
    if (!success) return;
    if (hasSession) {
      const textTimer   = setTimeout(() => setLoadingText('Almost there — taking a little longer...'), 3000);
      const escapeTimer = setTimeout(() => setShowEscape(true), 5000);
      const hardTimer   = setTimeout(() => onClose(), 8000);
      return () => {
        clearTimeout(textTimer);
        clearTimeout(escapeTimer);
        clearTimeout(hardTimer);
      };
    }
  }, [success, hasSession, onClose]);

  // ── Success state after signup ─────────────────────────────────────
  if (success) {
    if (!hasSession) {
      return (
        <ModalShell onClose={onClose}>
          <div className="text-center pt-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E1F5EE' }}>
              <CheckCircle size={32} style={{ color: '#0F6E56' }} />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Check your email!</h2>
            <p className="text-sm text-text-secondary mb-1">We sent a verification link to</p>
            <p className="text-sm font-medium text-text-primary mb-4">{email}</p>
            <p className="text-xs text-text-secondary mb-6">
              Click the link to finish setting up your account. Check spam if you don't see it.
            </p>
            <button onClick={onClose} className="text-sm font-medium transition" style={{ color: '#C94F78' }}>
              Close
            </button>
          </div>
        </ModalShell>
      );
    }

    return (
      <ModalShell onClose={null}>
        <div className="text-center pt-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E1F5EE' }}>
            <CheckCircle size={32} style={{ color: '#0F6E56' }} />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Account created!</h2>
          <p className="text-sm text-text-secondary animate-pulse">{loadingText}</p>
          {showEscape && (
            <button onClick={onClose} className="mt-4 text-sm font-medium transition" style={{ color: '#C94F78' }}>
              Continue to Know Before You Glow →
            </button>
          )}
        </div>
      </ModalShell>
    );
  }

  // ── Forgot password sent ────────────────────────────────────────────
  if (forgotSent) {
    return (
      <ModalShell onClose={onClose}>
        <div className="text-center pt-8">
          <div className="flex items-center justify-center w-14 h-14 bg-rose-light rounded-full mx-auto mb-5">
            <Mail size={24} className="text-rose-accent" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
          <p className="text-sm text-text-secondary mb-1">We sent a password reset link to</p>
          <p className="text-sm font-medium text-text-primary mb-6">{email}</p>
          <p className="text-xs text-text-secondary mb-6">Don't see it? Check your spam folder.</p>
          <button
            onClick={() => switchMode('signin')}
            className="text-sm text-rose-accent hover:text-rose-dark font-medium transition"
          >
            Back to sign in
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Main sign-up / sign-in / forgot form ───────────────────────────
  return (
    <ModalShell onClose={onClose}>
      {/* Back arrow for forgot-password mode */}
      {mode === 'forgot' && (
        <button
          onClick={() => switchMode('signin')}
          className="absolute text-text-secondary hover:text-text-primary transition"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: '16px' }}
        >
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-5 mt-2">
        {mode === 'forgot' ? (
          <>
            <h2 className="text-xl font-bold text-text-primary">Reset your password</h2>
            <p className="text-sm text-text-secondary mt-1">
              Enter your email and we'll send you a reset link.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-rose-accent">Know Before You Glow</span>
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {mode === 'signup'
                ? (isBusiness ? 'Create your provider account' : 'Join Know Before You Glow')
                : (isBusiness ? 'Sign in to your dashboard' : 'Welcome back')}
            </h2>
            {mode === 'signup' && (
              <p className="text-sm text-text-secondary mt-1">
                {isBusiness || isProvider
                  ? 'Manage your listing, publish prices, and attract new patients.'
                  : 'Share prices, earn badges, and help others save.'}
              </p>
            )}
            {hint && !isBusiness && (
              <p className="text-sm text-text-secondary mt-2 px-2">{hint}</p>
            )}
          </>
        )}
      </div>

      {/* Google OAuth — always visible near the top */}
      {mode !== 'forgot' && (
        <>
          <button
            onClick={handleGoogle}
            className="w-full py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </>
      )}

      {/* Role toggle — patient vs provider (signup only, hidden in business flow) */}
      {mode === 'signup' && !isBusiness && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setIsProvider(false)}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold border transition ${
              !isProvider
                ? 'bg-rose-accent text-white border-rose-accent'
                : 'bg-white text-text-secondary border-gray-200 hover:border-rose-accent/50'
            }`}
          >
            I&apos;m a patient
          </button>
          <button
            type="button"
            onClick={() => setIsProvider(true)}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold border transition ${
              isProvider
                ? 'bg-rose-accent text-white border-rose-accent'
                : 'bg-white text-text-secondary border-gray-200 hover:border-rose-accent/50'
            }`}
          >
            I&apos;m a provider
          </button>
        </div>
      )}

      {/* Value props — patient signup only, hidden in business flow */}
      {mode === 'signup' && !isProvider && !isBusiness && (
        <div
          className={`overflow-hidden transition-all duration-200 ${
            isTyping ? 'max-h-0 opacity-0' : 'max-h-60 opacity-100'
          }`}
        >
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <Syringe size={18} className="flex-shrink-0 text-rose-accent" />
              <p className="text-sm text-text-primary">Help women know what things actually cost</p>
            </div>
            <div className="flex items-center gap-3">
              <Trophy size={18} className="flex-shrink-0 text-rose-accent" />
              <p className="text-sm text-text-primary">Earn badges and track your treatments</p>
            </div>
            <div className="flex items-center gap-3">
              <Lock size={18} className="flex-shrink-0 text-rose-accent" />
              <p className="text-sm text-text-primary">Anonymous by default — your name never appears</p>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
        >
          <span className="shrink-0 mt-0.5">!</span>
          <p>{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name fields (signup only) */}
        {mode === 'signup' && (
          <>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onFocus={onAnyFocus}
                onBlur={() => handleBlur('firstName')}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent transition"
                required
                autoComplete="given-name"
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onFocus={onAnyFocus}
                onBlur={onAnyBlur}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent transition"
                autoComplete="family-name"
              />
            </div>
            {isProvider && (
              <>
                <input
                  type="text"
                  placeholder="Business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onFocus={onAnyFocus}
                  onBlur={onAnyBlur}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent transition"
                  required
                  autoComplete="organization"
                />
                <select
                  value={businessRole}
                  onChange={(e) => setBusinessRole(e.target.value)}
                  onFocus={onAnyFocus}
                  onBlur={onAnyBlur}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent transition bg-white"
                >
                  <option value="Owner">Owner</option>
                  <option value="Office Manager">Office Manager</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </>
            )}
          </>
        )}

        {/* Email */}
        <div>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            onFocus={onAnyFocus}
            onBlur={() => handleBlur('email')}
            aria-describedby={touched.email && fieldErrors.email ? 'auth-email-error' : undefined}
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
              touched.email && fieldErrors.email
                ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                : 'border-gray-200 focus:ring-rose-accent/50 focus:border-rose-accent'
            }`}
            required
          />
          {touched.email && fieldErrors.email && (
            <p id="auth-email-error" role="alert" className="text-xs text-red-500 mt-1 ml-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        {mode !== 'forgot' && (
          <div>
            <div className="relative">
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                onFocus={onAnyFocus}
                onBlur={() => handleBlur('password')}
                aria-describedby={touched.password && fieldErrors.password ? 'auth-password-error' : undefined}
                className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                  touched.password && fieldErrors.password
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : 'border-gray-200 focus:ring-rose-accent/50 focus:border-rose-accent'
                }`}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <p id="auth-password-error" role="alert" className="text-xs text-red-500 mt-1 ml-1">{fieldErrors.password}</p>
            )}

            {/* Password strength (signup only) */}
            {mode === 'signup' && strength && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: i <= strength.level ? strength.color : '#E5E7EB' }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>
        )}

        {/* Confirm password (signup only) */}
        {mode === 'signup' && (
          <div>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (touched.confirm) setFieldErrors((prev) => ({ ...prev, confirm: '' }));
              }}
              onFocus={onAnyFocus}
              onBlur={() => handleBlur('confirm')}
              aria-describedby={touched.confirm && fieldErrors.confirm ? 'auth-confirm-error' : undefined}
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                touched.confirm && fieldErrors.confirm
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-gray-200 focus:ring-rose-accent/50 focus:border-rose-accent'
              }`}
              required
            />
            {touched.confirm && fieldErrors.confirm && (
              <p id="auth-confirm-error" role="alert" className="text-xs text-red-500 mt-1 ml-1">{fieldErrors.confirm}</p>
            )}
          </div>
        )}

        {/* Terms & Privacy (signup only) */}
        {mode === 'signup' && (
          <label className="flex gap-2 text-[13px] text-text-secondary cursor-pointer my-1">
            <input
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 accent-rose-accent"
            />
            <span>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-rose-accent hover:text-rose-dark transition">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-rose-accent hover:text-rose-dark transition">
                Privacy Policy
              </a>
              . I am 18 or older.
            </span>
          </label>
        )}

        {/* Forgot password link (signin only) */}
        {mode === 'signin' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-xs text-text-secondary hover:text-rose-accent transition"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={sending || (mode === 'signup' && !agreedToTerms)}
          className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#C94F78' }}
        >
          {sending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {mode === 'signup' ? 'Creating account...' : mode === 'forgot' ? 'Sending...' : 'Signing in...'}
            </span>
          ) : mode === 'signup' ? (
            isProvider ? 'Create Business Account' : 'Create Account'
          ) : mode === 'forgot' ? (
            'Send Reset Link'
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Mode toggle + fine print */}
      <div className="text-center mt-5">
        {mode === 'signup' ? (
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <button
              onClick={() => switchMode('signin')}
              className="text-rose-accent hover:text-rose-dark font-medium transition"
            >
              Sign in
            </button>
          </p>
        ) : mode === 'signin' ? (
          <p className="text-sm text-text-secondary">
            {isBusiness ? 'New to Know Before You Glow?' : "Don't have an account?"}{' '}
            <button
              onClick={() => switchMode('signup')}
              className="text-rose-accent hover:text-rose-dark font-medium transition"
            >
              {isBusiness ? 'Create provider account' : 'Sign up'}
            </button>
          </p>
        ) : null}
        {mode !== 'forgot' && (
          <p className="text-xs text-text-secondary/60 mt-2">Free forever. No spam.</p>
        )}
      </div>
    </ModalShell>
  );
}
