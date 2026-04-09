import { useState, useContext, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Heart } from 'lucide-react';
import { AuthContext } from '../App';
import { signOut } from '../lib/auth';
import { getUnreadCount } from '../lib/priceAlerts';
import NotificationBell from './NotificationBell';
import {
  getCity as getGatingCity,
  getState as getGatingState,
} from '../lib/gating';
import { buildBrowseUrl } from '../lib/urlParams';

// ─── Navigation structure ───
// "Find Prices" is generated lazily inside the component so we can carry
// the user's saved city/state forward into the /browse URL.

const DISCOVER_LINKS = [
  { to: '/guides', label: 'Glossary', sub: 'Common treatments explained — no jargon' },
  { to: '/specials', label: 'Specials', sub: 'New deals from verified providers' },
  { to: '/insights', label: 'Insights', sub: 'Price trends & data' },
  { to: '/prices', label: 'City Reports', sub: 'Prices by location' },
  { to: '/calculator', label: 'Savings Calc', sub: 'See how much you save' },
];

const COMMUNITY_LINKS = [
  { to: '/community', label: 'Feed', sub: 'What patients are sharing' },
  { to: '/following', label: 'Following', sub: 'Your followed providers' },
  { to: '/glow-fund', label: 'The Glow Fund', sub: '5% of profits fund survivors', heart: true },
];

const MY_GLOW_LINKS = [
  { to: '/request-bid', label: 'Bid Requests', sub: 'Let providers compete for you', badge: 'SOON' },
  { to: '/my-stack', label: 'My Stack', sub: 'Your treatment stack' },
  { to: '/build-my-routine', label: 'My Routine', sub: 'Build your schedule' },
  { to: '/budget', label: 'Budget', sub: 'Track what you spend' },
  { to: '/my/history', label: 'My History', sub: 'Past submissions' },
  { to: '/alerts', label: 'Alerts', sub: 'Price drop notifications' },
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
        className={`flex items-center gap-1 text-[12px] font-medium uppercase transition-colors ${
          isActive ? 'text-hot-pink' : 'text-ink hover:text-hot-pink'
        }`}
        style={{ letterSpacing: '0.08em' }}
      >
        {dropdown.label}
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="min-w-[260px] bg-white border border-rule rounded-none py-3" style={{ borderTop: '2px solid #111' }}>
            <p
              className="px-4 pb-2 text-[10px] font-semibold text-hot-pink uppercase"
              style={{ letterSpacing: '0.12em' }}
            >
              {dropdown.tagline}
            </p>
            {dropdown.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpenKey(null)}
                className="block px-4 py-2.5 hover:bg-cream transition-colors group"
              >
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink group-hover:text-hot-pink">
                  {link.label}
                  {link.heart && (
                    <Heart size={11} fill="#E8347A" stroke="#E8347A" aria-hidden="true" />
                  )}
                  {link.badge && (
                    <span
                      style={{
                        background: '#EEEDFE',
                        color: '#7F77DD',
                        borderRadius: '3px',
                        fontSize: '9px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        padding: '2px 6px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {link.badge}
                    </span>
                  )}
                </span>
                {link.sub && (
                  <p className="text-[11px] text-text-secondary mt-0.5 leading-tight font-light">
                    {link.sub}
                  </p>
                )}
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

  // Carry the user's saved city/state into Find Prices so the gate
  // doesn't reappear after they've already chosen a location.
  const savedCity = getGatingCity();
  const savedState = getGatingState();
  const findPricesHref = buildBrowseUrl({
    city: savedCity || undefined,
    state: savedState || undefined,
  });
  const TOP_LINKS = [{ to: findPricesHref, label: 'Find Prices', match: '/browse' }];
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
        setMobileOpen(false);
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

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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
    <>
      <nav
        className="sticky top-0 z-50 bg-white"
        style={{ borderBottom: '1px solid #EDE8E3' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[52px] md:h-16">
            {/* Logo — desktop wordmark + mobile stacked KBYG mark */}
            <Link to="/" className="shrink-0 flex items-baseline">
              {/* Mobile: stacked Know Before You / Glow. */}
              <span
                className="md:hidden flex flex-col leading-none"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span
                  className="text-ink"
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  Know Before You
                </span>
                <span
                  className="font-display italic text-hot-pink"
                  style={{ fontSize: 22, fontWeight: 900, lineHeight: 0.95 }}
                >
                  Glow.
                </span>
              </span>

              {/* Desktop: horizontal wordmark */}
              <span className="hidden md:flex items-baseline">
                <span
                  className="font-display italic text-[26px] text-hot-pink"
                  style={{ fontWeight: 900, lineHeight: 1 }}
                >
                  Glow
                </span>
                <span
                  className="font-display text-[26px] text-ink"
                  style={{ fontWeight: 900, lineHeight: 1 }}
                >
                  Buddy
                </span>
              </span>
            </Link>

            {/* ═══ Desktop nav links ═══ */}
            <div className="hidden md:flex items-center gap-7">
              {TOP_LINKS.map((link) => {
                const matchPath = link.match || link.to;
                const active = matchPath === '/' ? location.pathname === '/' : location.pathname.startsWith(matchPath);
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    className={`text-[12px] font-medium uppercase transition-colors ${
                      active ? 'text-hot-pink' : 'text-ink hover:text-hot-pink'
                    }`}
                    style={{ letterSpacing: '0.08em' }}
                  >
                    {link.label}
                  </Link>
                );
              })}

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
                className={`text-[12px] font-medium uppercase transition-colors ${
                  location.pathname.startsWith('/business')
                    ? 'text-hot-pink'
                    : 'text-ink hover:text-hot-pink'
                }`}
                style={{ letterSpacing: '0.08em' }}
              >
                Business
              </Link>
            </div>

            {/* ═══ Desktop right: CTA + auth ═══ */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/log" className="btn-editorial btn-editorial-primary">
                Log a Treatment
              </Link>

              {user && <NotificationBell />}

              {user ? (
                <div ref={avatarRef} className="relative">
                  <button
                    onClick={() => setAvatarOpen(!avatarOpen)}
                    className="flex items-center gap-1.5"
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-[11px] font-semibold text-white bg-hot-pink rounded-none">
                      {getInitials()}
                    </div>
                    <ChevronDown size={14} className="text-text-secondary" />
                  </button>

                  {avatarOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 bg-white border border-rule rounded-none py-2 z-50"
                      style={{ borderTop: '2px solid #111' }}
                    >
                      <Link
                        to="/my-treatments"
                        onClick={() => setAvatarOpen(false)}
                        className="block px-4 py-2.5 text-[13px] text-ink hover:bg-cream hover:text-hot-pink transition-colors"
                      >
                        My Treatments
                      </Link>
                      <Link
                        to="/rewards"
                        onClick={() => setAvatarOpen(false)}
                        className="block px-4 py-2.5 text-[13px] text-ink hover:bg-cream hover:text-hot-pink transition-colors"
                      >
                        My Rewards
                      </Link>
                      <Link
                        to="/refer"
                        onClick={() => setAvatarOpen(false)}
                        className="block px-4 py-2.5 text-[13px] font-medium text-hot-pink hover:bg-cream transition-colors"
                      >
                        Refer &amp; Earn $10
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setAvatarOpen(false)}
                        className="block px-4 py-2.5 text-[13px] text-ink hover:bg-cream hover:text-hot-pink transition-colors"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-text-secondary hover:text-hot-pink hover:bg-cream transition-colors"
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
                    className="text-[12px] font-medium uppercase text-ink hover:text-hot-pink transition-colors"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="btn-editorial btn-editorial-secondary"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>

            {/* ═══ Mobile hamburger ═══ */}
            <button
              className="md:hidden p-2 text-ink"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile full-screen overlay (cream background) ═══ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-cream md:hidden overflow-y-auto"
          style={{ borderTop: '3px solid #E8347A' }}
        >
          <div className="flex items-center justify-between h-[52px] px-4 border-b border-rule">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-baseline">
              <span
                className="flex flex-col leading-none"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span
                  className="text-ink"
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  Know Before You
                </span>
                <span
                  className="font-display italic text-hot-pink"
                  style={{ fontSize: 22, fontWeight: 900, lineHeight: 0.95 }}
                >
                  Glow.
                </span>
              </span>
            </Link>
            <button
              className="p-2 text-ink"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-6 py-8">
            {/* Top-level links */}
            {TOP_LINKS.map((link) => {
              const matchPath = link.match || link.to;
              const active = matchPath === '/' ? location.pathname === '/' : location.pathname.startsWith(matchPath);
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`block py-3 font-display text-[28px] transition-colors ${
                    active ? 'text-hot-pink' : 'text-ink hover:text-hot-pink'
                  }`}
                  style={{ fontWeight: 900 }}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              to="/business"
              className={`block py-3 font-display text-[28px] transition-colors ${
                location.pathname.startsWith('/business') ? 'text-hot-pink' : 'text-ink hover:text-hot-pink'
              }`}
              style={{ fontWeight: 900 }}
              onClick={() => setMobileOpen(false)}
            >
              Business
            </Link>

            {/* Grouped sections */}
            {DROPDOWNS.map((dd) => (
              <div key={dd.key} className="mt-8 pt-6 border-t border-rule">
                <p
                  className="text-[10px] font-semibold text-hot-pink uppercase mb-3"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {dd.label}
                </p>
                {dd.links.map((link) => {
                  const active = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 py-2.5 text-[15px] transition-colors ${
                        active ? 'text-hot-pink' : 'text-ink hover:text-hot-pink'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                      {link.heart && (
                        <Heart size={13} fill="#E8347A" stroke="#E8347A" aria-hidden="true" />
                      )}
                      {link.to === '/alerts' && unreadCount > 0 && (
                        <span className="w-2 h-2 bg-hot-pink rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* CTA */}
            <Link
              to="/log"
              className="btn-editorial btn-editorial-primary mt-10 w-full"
              onClick={() => setMobileOpen(false)}
            >
              Log a Treatment
            </Link>

            {/* Auth */}
            <div className="mt-8 pt-6 border-t border-rule">
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link to="/my-treatments" className="py-2 text-[14px] text-ink hover:text-hot-pink" onClick={() => setMobileOpen(false)}>
                    My Treatments
                  </Link>
                  <Link to="/rewards" className="py-2 text-[14px] text-ink hover:text-hot-pink" onClick={() => setMobileOpen(false)}>
                    My Rewards
                  </Link>
                  <Link to="/refer" className="py-2 text-[14px] font-medium text-hot-pink" onClick={() => setMobileOpen(false)}>
                    Refer &amp; Earn $10
                  </Link>
                  <Link to="/settings" className="py-2 text-[14px] text-ink hover:text-hot-pink" onClick={() => setMobileOpen(false)}>
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="py-2 text-[14px] text-left text-text-secondary hover:text-hot-pink"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { openAuthModal('signin'); setMobileOpen(false); }}
                    className="btn-editorial btn-editorial-secondary w-full"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => { openAuthModal('signup'); setMobileOpen(false); }}
                    className="btn-editorial btn-editorial-primary w-full"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
