import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAuthErrorMessage } from '../lib/auth';
import { AuthContext } from '../App';

function getPasswordStrength(password) {
  if (!password) return null;
  if (password.length < 8) return { level: 0, label: 'Too short', color: '#EF4444' };

  let score = 0;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { level: 2, label: 'Medium', color: '#F59E0B' };
  return { level: 3, label: 'Strong', color: '#10B981' };
}

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useContext(AuthContext);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // For signup/email confirmation — verify OTP immediately and redirect
  useEffect(() => {
    if (!tokenHash || !type) return;
    if (type === 'recovery') return; // recovery shows the form instead

    let cancelled = false;
    setVerifying(true);

    (async () => {
      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type === 'signup' ? 'signup' : 'email',
      });
      if (cancelled) return;

      if (otpErr) {
        setError(getAuthErrorMessage(otpErr));
        setVerifying(false);
      } else {
        showToast?.("Email confirmed! You're now signed in.");
        navigate('/', { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [tokenHash, type, navigate, showToast]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSending(true);
    setError('');

    // Step 1: verify the recovery OTP to establish a session
    const { error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    if (otpErr) {
      setError(getAuthErrorMessage(otpErr));
      setSending(false);
      return;
    }

    // Step 2: update the password now that we have a session
    const { error: updateErr } = await supabase.auth.updateUser({
      password,
    });
    if (updateErr) {
      setError(getAuthErrorMessage(updateErr));
      setSending(false);
      return;
    }

    setSuccess(true);
    showToast?.('Password updated successfully');
    setTimeout(() => navigate('/', { replace: true }), 2000);
    setSending(false);
  }

  // No token_hash in URL — invalid link
  if (!tokenHash || !type) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Invalid link
        </h1>
        <p className="text-text-secondary mb-6">
          This link is missing required parameters. Please try again from your email.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
          style={{ backgroundColor: '#E8347A' }}
        >
          Go Home
        </button>
      </div>
    );
  }

  // Signup/email confirmation — show spinner while verifying
  if (type !== 'recovery') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {verifying ? (
          <>
            <Loader2 size={32} className="animate-spin text-rose-accent" />
            <p className="text-sm text-text-secondary">Confirming your email...</p>
          </>
        ) : error ? (
          <div className="max-w-md mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Confirmation failed
            </h1>
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-xl mb-6 text-sm"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              <span className="shrink-0 mt-0.5">!</span>
              <p>{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
              style={{ backgroundColor: '#E8347A' }}
            >
              Go Home
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  // Recovery — success state
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5"
          style={{ backgroundColor: '#E1F5EE' }}
        >
          <CheckCircle size={32} style={{ color: '#0F6E56' }} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Password updated!
        </h1>
        <p className="text-text-secondary">
          Redirecting you now...
        </p>
      </div>
    );
  }

  // Recovery — password form
  const strength = getPasswordStrength(password);

  return (
    <div
      className="max-w-md mx-auto px-4 py-16"
      style={{ maxWidth: 400 }}
    >
      <div className="text-center mb-8">
        <span
          className="text-2xl font-bold"
          style={{ color: '#E8347A' }}
        >
          Know Before You Glow
        </span>
        <h1 className="text-2xl font-bold text-text-primary mt-4 mb-2">
          Set your new password
        </h1>
        <p className="text-text-secondary">
          Choose a strong password for your account.
        </p>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
        >
          <span className="shrink-0 mt-0.5">!</span>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
              required
              minLength={8}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {strength && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: i <= strength.level ? strength.color : '#E5E7EB',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Confirm password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
            required
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-500 mt-1 ml-1">Passwords don't match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={sending || password.length < 8 || password !== confirmPassword}
          className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#E8347A' }}
        >
          {sending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Updating...
            </span>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
    </div>
  );
}
