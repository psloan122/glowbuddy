import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User, Plus } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../App';

const HIDDEN_PREFIXES = [
  '/log',
  '/auth',
  '/reset-password',
  '/business/dashboard',
  '/business/onboarding',
  '/admin',
];

// Brand colors
const HOT_PINK = '#E8347A';
const MUTED = '#B8A89A';
const RULE = '#EDE8E3';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user, openAuthModal } = useContext(AuthContext);

  // Hide on non-consumer pages
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const path = location.pathname;

  // Dashboard has its own QuickActionsBar
  if (path === '/' && user) return null;

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bg-white"
      style={{
        // Pin to the physical bottom, add safe-area padding so the
        // iOS Safari home-indicator strip doesn't swallow tap targets.
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        borderTop: `1px solid ${RULE}`,
        // z-index 9999 keeps us above any accidental stacking context
        // created by page wrappers (transforms, isolation, etc.).
        zIndex: 9999,
        // Force our own stacking context so children are hit-testable
        // regardless of sibling transforms on the same page.
        isolation: 'isolate',
        // Guarantee we receive touch events even if an ancestor set
        // touch-action or pointer-events to something restrictive.
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-end justify-around px-2" style={{ height: 56 }}>
        <NavTab
          to="/"
          icon={Home}
          label="Home"
          active={path === '/'}
        />
        <NavTab
          to="/browse"
          icon={Search}
          label="Prices"
          active={path === '/browse' || path.startsWith('/browse') || path.startsWith('/prices')}
        />

        {/* Center [+] — flat hot-pink circle, lifted -12px above the nav */}
        <div className="flex flex-col items-center" style={{ marginTop: -12 }}>
          <Link
            to="/log"
            className="flex items-center justify-center text-white"
            style={{
              backgroundColor: HOT_PINK,
              width: 48,
              height: 48,
              borderRadius: '50%',
              boxShadow: 'none',
            }}
            aria-label="Share what you paid"
          >
            <Plus size={22} strokeWidth={2.5} />
          </Link>
        </div>

        <NavTab
          to="/alerts"
          icon={Bell}
          label="Alerts"
          active={path === '/alerts'}
        />
        <NavTab
          to={user ? '/my-treatments' : undefined}
          icon={User}
          label="Me"
          active={path.startsWith('/my') || path === '/settings' || path === '/rewards'}
          onClick={!user ? () => openAuthModal('signup') : undefined}
        />
      </div>
    </nav>
  );
}

function NavTab({ to, icon: Icon, label, active, onClick }) {
  const color = active ? HOT_PINK : MUTED;
  const labelStyle = {
    fontSize: 10,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    color,
  };

  const cls = 'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors';

  if (onClick) {
    return (
      <button onClick={onClick} className={cls} style={{ color }}>
        <Icon size={22} />
        <span style={labelStyle}>{label}</span>
      </button>
    );
  }

  return (
    <Link to={to} className={cls} style={{ color }}>
      <Icon size={22} />
      <span style={labelStyle}>{label}</span>
    </Link>
  );
}
