import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { AuthContext } from '../App';
import { signOut } from '../lib/auth';
import { getUnreadCount } from '../lib/priceAlerts';
import NotificationBell from './NotificationBell';

// ─── Navigation structure ───

const TOP_LINKS = [
  { to: '/browse', label: 'Find Prices' },
];

const DISCOVER_LINKS = [
  { to: '/guides', label: 'Treatment Guides', icon: '\uD83D\uDCDA', sub: 'First-timer guides for every treatment' },
  { to: '/specials', label: 'Specials', icon: '\u2728', sub: 'New deals from verified providers' },
  { to: '/insights', label: 'Insights', icon: '\uD83D\uDCCA', sub: 'Price trends & data' },
  { to: '/prices', label: 'City Reports', icon: '\uD83C\uDFD9\uFE0F', sub: 'Prices by location' },
  { to: '/calculator', label: 'Savings Calc', icon: '\uD83D\uDCB0', sub: 'See how much you save' },
];

const COMMUNITY_LINKS = [
  { to: '/community', label: 'Feed', icon: '\uD83D\uDC65', sub: 'What patients are sharing' },
  { to: '/following', label: 'Following', icon: '\u2764\uFE0F', sub: 'Your followed providers' },
];

const MY_GLOW_LINKS = [
  { to: '/my-stack', label: 'My Stack', icon: '\uD83D\uDC89', sub: 'Your treatment stack' },
  { to: '/build-my-routine', label: 'My Routine', icon: '\uD83D\uDCC5', sub: 'Build your schedule' },
  { to: '/budget', label: 'Budget', icon: '\uD83D\uDCB8', sub: 'Track what you spend' },
  { to: '/my/history', label: 'My History', icon: '\uD83D\uDCCB', sub: 'Past submissions' },
  { to: '/alerts', label: 'Alerts', icon: '\uD83D\uDD14', sub: 'Price drop notifications' },
];

const DROPDOWNS = [
  { key: 'discover', label: 'Discover', tagline: 'Prices, trends & deals', links: DISCOVER_LINKS },
  { key: 'community', label: 'Community', tagline: 'Real patients, real talk', links: COMMUNITY_LINKS },
  { key: 'myglow', label: 'My Glow', tagline: 'Your personal glow tracker', links: MY_GLOW_LINKS },
];

// ─── Desktop dropdown ───

function NavDropdown({ dropdown, isActive, openKey, setOpenKey }) {
  const timeoutRef = useRef(null);
  const isOpen = openKey === dropdown.key;

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenKey(dropdown.key);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => {
      setOpenKey((prev) => (prev === dropdown.key ? null : prev));
    }, 120);
  }

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpenKey(isOpen ? null : dropdown.key)}
        className={`flex items-center gap-1 text-sm font-medium transition-colors ${
          isActive ? 'text-[#C94F78]' : 'text-text-primary hover:text-[#C94F78]'
        }`}
      >
        {dropdown.label}
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="min-w-[240px] bg-white rounded-lg shadow-lg border border-gray-100 py-2">
            <p className="px-4 pb-2 text-[11px] font-medium text-text-secondary/60 uppercase tracking-wide">
              {dropdown.tagline}
            </p>
            {dropdown.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpenKey(null)}
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#FBE8EF] hover:text-[#C94F78] transition-colors"
              >
                <span className="text-base leading-5 mt-px">{link.icon}</span>
                <div>
                  <span className="text-sm font-medium text-text-primary">{link.label}</span>
                  {link.sub && (
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-tight">{link.sub}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Navbar ───

export default function Navbar() {
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null);
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

  // Close dropdowns on ESC
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenKey(null);
        setAvatarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setOpenKey(null);
    setMobileOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  // Fetch unread alert count
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    getUnreadCount().then(setUnreadCount);
    const interval = setInterval(() => getUnreadCount().then(setUnreadCount), 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Check if a dropdown should show active state
  function isDropdownActive(dropdown) {
    return dropdown.links.some((link) =>
      link.to === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(link.to)
    );
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

          {/* ═══ Desktop nav links ═══ */}
          <div className="hidden md:flex items-center gap-5 lg:gap-6">
            {TOP_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  (link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to))
                    ? 'text-[#C94F78]'
                    : 'text-text-primary hover:text-[#C94F78]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {DROPDOWNS.map((dd) => (
              <NavDropdown
                key={dd.key}
                dropdown={dd}
                isActive={isDropdownActive(dd)}
                openKey={openKey}
                setOpenKey={setOpenKey}
              />
            ))}

            <Link
              to="/business"
              className={`text-sm font-medium transition-colors ${
                location.pathname.startsWith('/business')
                  ? 'text-[#C94F78]'
                  : 'text-text-primary hover:text-[#C94F78]'
              }`}
            >
              Business
            </Link>
          </div>

          {/* ═══ Desktop right: CTA + auth ═══ */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/log"
              className="px-4 py-1.5 text-sm font-medium text-white rounded-full transition hover:opacity-90"
              style={{ backgroundColor: '#C94F78' }}
            >
              Log a Treatment
            </Link>

            {user && <NotificationBell />}

            {user ? (
              <div ref={avatarRef} className="relative">
                <button
                  onClick={() => setAvatarOpen(!avatarOpen)}
                  className="flex items-center gap-1.5"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                    style={{ backgroundColor: '#C94F78' }}
                  >
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
                    <Link
                      to="/refer"
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm font-medium text-rose-accent hover:bg-rose-light/50 transition-colors"
                    >
                      Refer &amp; Earn $10
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-primary hover:bg-rose-light/50 transition-colors"
                    >
                      Settings
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
                  className="px-4 py-1.5 text-sm font-medium text-white rounded-full hover:opacity-90 transition"
                  style={{ backgroundColor: '#C94F78' }}
                >
                  Sign up
                </button>
              </>
            )}
          </div>

          {/* ═══ Mobile hamburger ═══ */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* ═══ Mobile menu ═══ */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100">
            <div className="flex flex-col pt-3">
              {/* Top-level links */}
              {TOP_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    (link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to))
                      ? 'text-[#C94F78] bg-[#FBE8EF]'
                      : 'text-text-primary hover:text-[#C94F78] hover:bg-[#FBE8EF]'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Grouped sections */}
              {DROPDOWNS.map((dd) => (
                <div key={dd.key} className="mt-3">
                  <p className="px-4 pb-1 text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider">
                    {dd.label}
                  </p>
                  {dd.links.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-lg transition-colors ${
                        (link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to))
                          ? 'text-[#C94F78] bg-[#FBE8EF] font-medium'
                          : 'text-text-primary hover:text-[#C94F78] hover:bg-[#FBE8EF]'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="text-sm w-5 text-center">{link.icon}</span>
                      {link.label}
                      {link.to === '/alerts' && unreadCount > 0 && (
                        <span className="w-2 h-2 bg-rose-accent rounded-full" />
                      )}
                    </Link>
                  ))}
                </div>
              ))}

              {/* Business */}
              <div className="mt-3">
                <Link
                  to="/business"
                  className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname.startsWith('/business')
                      ? 'text-[#C94F78] bg-[#FBE8EF]'
                      : 'text-text-primary hover:text-[#C94F78] hover:bg-[#FBE8EF]'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  Business
                </Link>
              </div>

              {/* Share a Price CTA */}
              <Link
                to="/log"
                className="mx-4 mt-4 py-2.5 text-sm font-medium text-white rounded-full text-center transition hover:opacity-90"
                style={{ backgroundColor: '#C94F78' }}
                onClick={() => setMobileOpen(false)}
              >
                Log a Treatment
              </Link>

              {/* Divider + auth / account */}
              <div className="mx-4 mt-4 pt-3 border-t border-gray-100">
                {user ? (
                  <div className="flex flex-col gap-0.5">
                    <Link
                      to="/my-treatments"
                      className="py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      My Treatments
                    </Link>
                    <Link
                      to="/rewards"
                      className="py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      My Rewards
                    </Link>
                    <Link
                      to="/refer"
                      className="py-2 text-sm font-medium text-rose-accent transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      Refer &amp; Earn $10
                    </Link>
                    <Link
                      to="/settings"
                      className="py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="py-2 text-sm text-left text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { openAuthModal('signin'); setMobileOpen(false); }}
                      className="flex-1 py-2.5 text-sm text-text-secondary hover:text-text-primary transition text-center"
                    >
                      Log in
                    </button>
                    <button
                      onClick={() => { openAuthModal('signup'); setMobileOpen(false); }}
                      className="flex-1 py-2.5 text-sm font-medium text-white rounded-full hover:opacity-90 transition text-center"
                      style={{ backgroundColor: '#C94F78' }}
                    >
                      Sign up
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
