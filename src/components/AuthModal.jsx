import { useState } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { signUpWithPassword, signInWithPassword, signInWithGoogle } from '../lib/auth';

export default function AuthModal({ mode: initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode || 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password || sending) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSending(true);
    setError('');

    if (mode === 'signup') {
      const { data, error: authError } = await signUpWithPassword(email, password);
      if (authError) {
        // If user already exists, suggest signing in
        if (authError.message?.toLowerCase().includes('already registered')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else {
          setError(authError.message);
        }
      } else if (data?.user) {
        // signUp creates a session immediately — onAuthStateChange in App.jsx
        // will handle the rest (close modal, start onboarding)
      }
    } else {
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) {
        if (authError.message?.toLowerCase().includes('invalid login')) {
          setError('Invalid email or password.');
        } else {
          setError(authError.message);
        }
      }
      // Success: onAuthStateChange in App.jsx handles the rest
    }

    setSending(false);
  }

  async function handleGoogle() {
    setError('');
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError.message);
    }
    // OAuth redirects — modal will close on auth state change
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-8 max-w-[440px] w-full shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Logo mark */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-0 mb-4">
            <span className="text-2xl font-bold text-rose-accent">Glow</span>
            <span className="text-2xl font-light text-text-primary">Buddy</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary">
            {mode === 'signup' ? 'Join GlowBuddy' : 'Welcome back'}
          </h2>
          {mode === 'signup' && (
            <p className="text-sm text-text-secondary mt-1">
              Log prices, earn badges, and enter our monthly $250 giveaway.
            </p>
          )}
        </div>

        {/* Value props (signup only) */}
        {mode === 'signup' && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">💉</span>
              <p className="text-sm text-text-primary">Help women know what things actually cost</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">🏆</span>
              <p className="text-sm text-text-primary">Earn badges and win monthly treatment giveaways</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg flex-shrink-0">🔒</span>
              <p className="text-sm text-text-primary">Anonymous by default — your name never appears</p>
            </div>
          </div>
        )}

        {/* Email + password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
            required
            autoFocus
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
              required
              minLength={6}
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
          {mode === 'signup' && (
            <p className="text-xs text-text-secondary">At least 6 characters</p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#C94F78' }}
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : mode === 'signup' ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-text-secondary">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google OAuth */}
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

        {/* Mode toggle + fine print */}
        <div className="text-center mt-5">
          {mode === 'signup' ? (
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setPassword(''); }}
                className="text-rose-accent hover:text-rose-dark font-medium transition"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setPassword(''); }}
                className="text-rose-accent hover:text-rose-dark font-medium transition"
              >
                Sign up
              </button>
            </p>
          )}
          <p className="text-xs text-text-secondary/60 mt-2">Free forever. No spam.</p>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500 text-center mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}
