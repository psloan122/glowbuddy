import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { AuthContext } from '../App';
import { signOut } from '../lib/auth';
import { getUnreadCount } from '../lib/priceAlerts';
import NotificationBell from './NotificationBell';

const NAV_LINKS = [
  { to: '/', label: 'Browse' },
  { to: '/map', label: 'Map' },
  { to: '/log', label: 'Log a Treatment' },
  { to: '/insights', label: 'Insights' },
  { to: '/specials', label: 'Specials' },
  { to: '/community', label: 'Community' },
  { to: '/following', label: 'Following' },
  { to: '/budget', label: 'Budget' },
  { to: '/my-stack', label: 'My Stack' },
  { to: '/build-my-routine', label: 'Routine' },
  { to: '/business', label: 'Business' },
];

export default function Navbar() {
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const avatarRef = useRef(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch unread alert count
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    getUnreadCount().then(setUnreadCount);
    const interval = setInterval(() => getUnreadCount().then(setUnreadCount), 60000);
    return () => clearInterval(interval);
  }, [user]);

  function handleNavClick() {
    setMobileOpen(false);
  }

  function getInitials() {
    const email = user?.email || '';
    return email.charAt(0).toUpperCase();
  }

  async function handleSignOut() {
    await signOut();
    setAvatarOpen(false);
    setMobileOpen(false);
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-0 shrink-0">
            <span className="font-display italic text-[22px] font-semibold text-rose-accent">Glow</span>
            <span className="text-xl font-light text-text-primary">Buddy</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-text-primary hover:text-rose-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user && <NotificationBell />}
            {user ? (
              /* Avatar dropdown */
              <div ref={avatarRef} className="relative">
                <button
                  onClick={() => setAvatarOpen(!avatarOpen)}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: '#C94F78' }}>
                    {getInitials()}
                  </div>
                  <ChevronDown size={14} className="text-text-secondary" />
                </button>
                {avatarOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      to="/my-treatments"
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-primary hover:bg-rose-light/50 transition-colors"
                    >
                      My Treatments
                    </Link>
                    <Link
                      to="/rewards"
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-primary hover:bg-rose-light/50 transition-colors"
                    >
                      My Rewards
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-rose-light/50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('signin')}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-4 py-1.5 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-full hover:bg-rose-light/50 transition"
                >
                  Sign up
                </button>
              </>
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
                  className="px-3 py-2 text-sm font-medium text-text-primary hover:text-rose-accent hover:bg-rose-light/50 rounded-lg transition-colors"
                  onClick={handleNavClick}
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
                  <Link
                    to="/rewards"
                    className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-rose-light/50 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Rewards
                  </Link>
                  <Link
                    to="/alerts"
                    className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-rose-light/50 rounded-lg transition-colors flex items-center gap-1.5"
                    onClick={() => setMobileOpen(false)}
                  >
                    Price Alerts
                    {unreadCount > 0 && (
                      <span className="w-2 h-2 bg-rose-accent rounded-full" />
                    )}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 text-sm text-left text-text-secondary hover:text-text-primary hover:bg-rose-light/50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 pt-2">
                  <button
                    onClick={() => {
                      openAuthModal('signin');
                      setMobileOpen(false);
                    }}
                    className="flex-1 py-2 text-sm text-text-secondary hover:text-text-primary transition text-center"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      setMobileOpen(false);
                    }}
                    className="flex-1 py-2 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-full hover:bg-rose-light/50 transition text-center"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
