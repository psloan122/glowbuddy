import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';

const NAV_LINKS = [
  { to: '/', label: 'Browse' },
  { to: '/log', label: 'Log a Treatment' },
  { to: '/insights', label: 'Insights' },
  { to: '/specials', label: 'Specials' },
  { to: '/community', label: 'Community' },
  { to: '/business', label: 'Business' },
];

export default function Navbar() {
  const { user } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signInMsg, setSignInMsg] = useState('');

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email) return;
    setSigningIn(true);
    setSignInMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setSignInMsg(error.message);
    } else {
      setSignInMsg('Check your email for a magic link!');
      setEmail('');
    }
    setSigningIn(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMobileOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-0 shrink-0">
            <span className="text-xl font-bold text-rose-accent">Glow</span>
            <span className="text-xl font-light text-text-primary">Buddy</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/my-treatments"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  My Treatments
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowSignIn(true)}
                className="text-sm font-medium text-rose-accent hover:text-rose-dark transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <div className="flex flex-col gap-2 pt-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-rose-light/50 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link
                    to="/my-treatments"
                    className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-rose-light/50 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Treatments
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-rose-light/50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowSignIn(true);
                    setMobileOpen(false);
                  }}
                  className="px-3 py-2 text-sm text-left font-medium text-rose-accent hover:text-rose-dark hover:bg-rose-light/50 rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sign-in modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Sign In</h2>
              <button
                onClick={() => {
                  setShowSignIn(false);
                  setSignInMsg('');
                }}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
                required
              />
              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors disabled:opacity-50"
              >
                {signingIn ? 'Sending...' : 'Send Magic Link'}
              </button>
              {signInMsg && (
                <p className="text-sm text-center text-text-secondary">
                  {signInMsg}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
