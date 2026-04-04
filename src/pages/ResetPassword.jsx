import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { updatePassword, getAuthErrorMessage } from '../lib/auth';
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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.title = 'Reset Password | GlowBuddy';

    // Check if there's a valid session (Supabase sets it from the recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSending(true);
    setError('');

    const { error: updateErr } = await updatePassword(password);
    if (updateErr) {
      setError(getAuthErrorMessage(updateErr));
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    }
    setSending(false);
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-rose-accent" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Invalid or expired link
        </h1>
        <p className="text-text-secondary mb-6">
          This password reset link is no longer valid. Please request a new one.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
          style={{ backgroundColor: '#C94F78' }}
        >
          Go Home
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5" style={{ backgroundColor: '#E1F5EE' }}>
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

  const strength = getPasswordStrength(password);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Set a new password
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
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
              required
              minLength={6}
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
          disabled={sending || password.length < 6 || password !== confirmPassword}
          className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#C94F78' }}
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
