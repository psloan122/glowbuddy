import { Link, useLocation } from 'react-router-dom';
import { Heart, Bookmark, Search, Plus, User, Lock } from 'lucide-react';
import { useContext, useState, useRef } from 'react';
import { AuthContext } from '../App';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';
import { buildBrowseUrl } from '../lib/urlParams';

const HIDDEN_PREFIXES = [
  '/auth',
  '/reset-password',
  '/business',
  '/admin',
];

const HOT_PINK = '#E8347A';
const MUTED = '#888';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user, openAuthModal } = useContext(AuthContext);

  // Hide on routes that have their own nav
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  // Hide when mobile map is active (Find Prices with a city selected)
  if (location.pathname === '/browse') {
    const sp = new URLSearchParams(location.search);
    if (sp.has('city')) return null;
  }

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
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
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
          onGatedTap={() => openAuthModal('signup', null, { hint: 'Create a free account to track your treatments.' })}
        />

        {/* Saved */}
        <NavTab
          to="/alerts"
          icon={Bookmark}
          label="Saved"
          active={path === '/alerts'}
          gated={!user}
          onGatedTap={() => openAuthModal('signup', null, { hint: 'Create a free account to save providers and set price alerts.' })}
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

        {/* Log a price */}
        <NavTab
          to="/log"
          icon={Plus}
          label="Log a price"
          active={path === '/log'}
          gated={!user}
          onGatedTap={() => openAuthModal('signup', null, { hint: 'Create a free account to share what you paid and help others.' })}
        />

        {/* Account */}
        <NavTab
          to="/settings"
          icon={User}
          label="Account"
          active={path === '/settings' || path === '/account' || path === '/rewards'}
          gated={!user}
          onGatedTap={() => openAuthModal('signup')}
        />
      </div>
    </nav>
  );
}

const GATED_TOOLTIP = {
  'My Glow': 'Sign in to track treatments',
  'Saved': 'Sign in to save providers',
  'Log a price': 'Sign in to share what you paid',
};

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

  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimer = useRef(null);

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    }, 500);
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current);
  }

  if (gated) {
    return (
      <button
        type="button"
        onClick={() => onGatedTap?.()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors"
        style={{ color, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.45, position: 'relative' }}
        aria-label={`${label} — sign in required`}
      >
        {showTooltip && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              background: 'rgba(17,17,17,0.92)',
              color: 'white',
              fontSize: 11,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              zIndex: 200,
              pointerEvents: 'none',
            }}
          >
            {GATED_TOOLTIP[label] || 'Sign in to continue'}
          </div>
        )}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Icon size={22} />
          <Lock
            size={8}
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              color: MUTED,
              strokeWidth: 2.5,
            }}
          />
        </div>
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
