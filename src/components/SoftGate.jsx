import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SoftGate({ onUnlock }) {
  const [email, setEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  // Don't render if already unlocked
  if (localStorage.getItem('gb_unlocked') === 'true') {
    return null;
  }

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email) return;
    setSigningIn(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for a magic link!');
      localStorage.setItem('gb_unlocked', 'true');
      setEmail('');
      if (onUnlock) onUnlock();
    }
    setSigningIn(false);
  }

  function handleLogClick() {
    localStorage.setItem('gb_unlocked', 'true');
    if (onUnlock) onUnlock();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl text-center">
        <div className="flex items-center justify-center w-14 h-14 bg-rose-light rounded-full mx-auto mb-5">
          <Lock size={24} className="text-rose-accent" />
        </div>

        <h2 className="text-xl font-bold text-text-primary mb-2">
          23 more prices in your area
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Share yours to unlock the full GlowBuddy database. No account needed.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            to="/log"
            onClick={handleLogClick}
            className="w-full py-3 text-white font-medium rounded-xl hover:opacity-90 transition-colors text-center"
            style={{ backgroundColor: '#C94F78' }}
          >
            Log My Treatment to Unlock
          </Link>

          {!showEmailInput ? (
            <button
              onClick={() => setShowEmailInput(true)}
              className="w-full py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              I already have an account
            </button>
          ) : (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {signingIn ? 'Sending...' : 'Send Magic Link'}
              </button>
              {message && (
                <p className="text-sm text-text-secondary">{message}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
