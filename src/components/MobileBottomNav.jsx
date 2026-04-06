import { Link, useLocation } from 'react-router-dom';
import { Search, MapPin, Bell, User, Plus } from 'lucide-react';
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

export default function MobileBottomNav() {
  const location = useLocation();
  const { user, openAuthModal } = useContext(AuthContext);

  // Hide on non-consumer pages
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const path = location.pathname;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around px-2 h-14">
        <NavTab
          to="/"
          icon={Search}
          label="Browse"
          active={path === '/'}
        />
        <NavTab
          to="/map"
          icon={MapPin}
          label="Map"
          active={path === '/map'}
        />

        {/* Center [+] — elevated pink FAB */}
        <div className="flex flex-col items-center -mt-5">
          <Link
            to="/log"
            className="flex items-center justify-center rounded-full text-white"
            style={{
              backgroundColor: '#C94F78',
              width: 52,
              height: 52,
              boxShadow: '0 4px 12px rgba(201,79,120,0.35)',
            }}
            aria-label="Share what you paid"
          >
            <Plus size={26} strokeWidth={2.5} />
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
  const cls = `flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors ${
    active ? 'text-[#C94F78]' : 'text-[#9CA3AF]'
  }`;

  if (onClick) {
    return (
      <button onClick={onClick} className={cls}>
        <Icon size={22} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  }

  return (
    <Link to={to} className={cls}>
      <Icon size={22} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
