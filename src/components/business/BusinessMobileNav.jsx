import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Star, BarChart3, Settings } from 'lucide-react';

const TEAL = '#0D9488';
const MUTED = '#9CA3AF';

const NAV_ITEMS = [
  { slug: 'overview', label: 'Overview', icon: LayoutDashboard },
  { slug: 'menu', label: 'Prices', icon: DollarSign },
  { slug: 'reviews', label: 'Reviews', icon: Star },
  { slug: 'analytics', label: 'Analytics', icon: BarChart3 },
  { slug: 'settings', label: 'Settings', icon: Settings },
];

export default function BusinessMobileNav() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (!location.pathname.startsWith('/business/dashboard')) return null;

  const activeSlug = searchParams.get('tab') || 'overview';

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bg-biz-navy"
      style={{
        bottom: 0,
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
      }}
    >
      <div className="flex items-center justify-around px-2" style={{ height: 56 }}>
        {NAV_ITEMS.map(({ slug, label, icon: Icon }) => {
          const isActive = slug === activeSlug;
          return (
            <Link
              key={slug}
              to={`/business/dashboard?tab=${slug}`}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[44px]"
              style={{ color: isActive ? TEAL : MUTED }}
            >
              <Icon size={20} />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
