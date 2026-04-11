import { Link, useLocation } from 'react-router-dom';
import { Heart, Bookmark, Search, Plus, User } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../App';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';
import { buildBrowseUrl } from '../lib/urlParams';

const HIDDEN_PREFIXES = [
  '/auth',
  '/reset-password',
  '/business/dashboard',
  '/business/onboarding',
  '/admin',
];

const HOT_PINK = '#E8347A';
const MUTED = '#888';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user, openAuthModal } = useContext(AuthContext);

  // Hide on routes that have their own nav
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const path = location.pathname;

  const savedCity = getGatingCity();
  const savedState = getGatingState();
  const findPricesHref = buildBrowseUrl({
    city: savedCity || undefined,
    state: savedState || undefined,
  });

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bg-white"
      style={{
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        borderTop: '0.5px solid #eee',
        zIndex: 100,
        isolation: 'isolate',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-end justify-around px-2" style={{ height: 64 }}>
        {/* My Glow */}
        <NavTab
          to="/my-treatments"
          icon={Heart}
          label="My Glow"
          active={path === '/my-treatments' || path.startsWith('/my/')}
          gated={!user}
          onGatedTap={openAuthModal}
        />

        {/* Saved */}
        <NavTab
          to="/alerts"
          icon={Bookmark}
          label="Saved"
          active={path === '/alerts'}
          gated={!user}
          onGatedTap={openAuthModal}
        />

        {/* Center: FIND PRICES — elevated pink circle */}
        <div className="flex flex-col items-center" style={{ marginTop: -20 }}>
          <Link
            to={findPricesHref}
            className="flex items-center justify-center text-white"
            style={{
              backgroundColor: HOT_PINK,
              width: 56,
              height: 56,
              borderRadius: '50%',
              boxShadow: '0 4px 12px rgba(232, 52, 122, 0.4)',
            }}
            aria-label="Find Prices"
          >
            <Search size={24} strokeWidth={2.5} />
          </Link>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              color: HOT_PINK,
              marginTop: 3,
            }}
          >
            Find Prices
          </span>
        </div>

        {/* Log It */}
        <NavTab
          to="/log"
          icon={Plus}
          label="Log It"
          active={path === '/log'}
          gated={!user}
          onGatedTap={openAuthModal}
        />

        {/* Account */}
        <NavTab
          to="/settings"
          icon={User}
          label="Account"
          active={path === '/settings' || path === '/account' || path === '/rewards'}
          gated={!user}
          onGatedTap={openAuthModal}
        />
      </div>
    </nav>
  );
}

function NavTab({ to, icon: Icon, label, active, gated, onGatedTap }) {
  const color = active ? HOT_PINK : MUTED;
  const labelStyle = {
    fontSize: 10,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    color,
  };

  if (gated) {
    return (
      <button
        type="button"
        onClick={() => onGatedTap?.()}
        className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors"
        style={{ color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Icon size={22} />
        <span style={labelStyle}>{label}</span>
      </button>
    );
  }

  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors"
      style={{ color }}
    >
      <Icon size={22} />
      <span style={labelStyle}>{label}</span>
    </Link>
  );
}
