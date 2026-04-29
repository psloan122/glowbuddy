import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Sparkles,
  BarChart3,
  Star,
  Users,
  Camera,
  FileText,
  AlertTriangle,
  Plug,
  Settings,
  ArrowUpRight,
} from 'lucide-react';
import { SIDEBAR_ITEMS } from '../../lib/businessTabs';
import { TIER_BADGE_STYLE, TIER_BADGE_LABEL } from '../../lib/tierBadge';

const ICON_MAP = {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Sparkles,
  BarChart3,
  Star,
  Users,
  Camera,
  FileText,
  AlertTriangle,
  Plug,
  Settings,
};

export default function BusinessSidebar({ provider, tierHelpers }) {
  const [searchParams] = useSearchParams();
  const activeSlug = searchParams.get('tab') || 'overview';

  const initials = (provider?.name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const badgeStyle = TIER_BADGE_STYLE[tierHelpers?.tier] || TIER_BADGE_STYLE.free;
  const badgeLabel = TIER_BADGE_LABEL[tierHelpers?.tier] || 'Free';

  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-biz-navy text-white sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto">
      {/* Provider identity */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 flex items-center justify-center rounded-lg text-[11px] font-bold"
            style={{ width: 36, height: 36, background: 'var(--color-biz-teal)' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate leading-tight">{provider?.name}</p>
            {provider?.city && provider?.state && (
              <p className="text-[11px] opacity-50 truncate">{provider.city}, {provider.state}</p>
            )}
          </div>
        </div>
        <span
          className="inline-block mt-2.5 text-[9px] font-bold uppercase tracking-wide px-2 py-[2px] rounded"
          style={badgeStyle}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {SIDEBAR_ITEMS.map(({ slug, label, icon }) => {
          const Icon = ICON_MAP[icon] || LayoutDashboard;
          const isActive = slug === activeSlug;
          return (
            <Link
              key={slug}
              to={`/business/dashboard?tab=${slug}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                background: isActive ? 'rgba(13,148,136,0.15)' : 'transparent',
                color: isActive ? 'var(--color-biz-teal-light)' : 'rgba(255,255,255,0.65)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={16} style={{ opacity: isActive ? 1 : 0.5 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {provider?.slug && (
          <a
            href={`/provider/${provider.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-biz-teal-light)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            View public page <ArrowUpRight size={12} />
          </a>
        )}
      </div>
    </aside>
  );
}
