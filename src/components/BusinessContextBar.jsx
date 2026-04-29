import { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronDown, X, ArrowUpRight } from 'lucide-react';
import useClaimedProvider from '../hooks/useClaimedProvider';
import useTier from '../hooks/useTier';
import { TIER_BADGE_STYLE, TIER_BADGE_LABEL } from '../lib/tierBadge';
import { CONTEXT_BAR_TABS, tabSlugFromLabel } from '../lib/businessTabs';

const EXCLUDED_PATHS = ['/business', '/business/claim', '/business/onboarding', '/business/add'];

export default function BusinessContextBar() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { provider, loading } = useClaimedProvider();
  const tierHelpers = useTier(provider);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname, searchParams]);

  // Close sheet on Escape
  useEffect(() => {
    if (!sheetOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') setSheetOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  // Self-gate: only show on /business/* paths, excluding specific pages
  if (!pathname.startsWith('/business')) return null;
  if (EXCLUDED_PATHS.includes(pathname)) return null;
  if (loading || !provider) return null;

  const activeSlug = searchParams.get('tab') || 'overview';
  const initials = (provider.name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const badgeStyle = TIER_BADGE_STYLE[tierHelpers.tier] || TIER_BADGE_STYLE.free;
  const badgeLabel = TIER_BADGE_LABEL[tierHelpers.tier] || 'Free';

  return (
    <>
      <div
        className="sticky md:hidden z-40 bg-white"
        style={{ top: 'calc(52px + env(safe-area-inset-top, 0px))', borderBottom: '0.5px solid #eee' }}
      >
        {/* ── Mobile only — sidebar handles desktop navigation ── */}
        <div className="flex items-center justify-between px-4 h-[44px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-text-primary truncate">
              {provider.name}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-[1px] rounded-full shrink-0"
              style={badgeStyle}
            >
              {badgeLabel}
            </span>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1 text-[12px] font-medium text-text-secondary"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Menu <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* ── Mobile bottom sheet ── */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.4)', zIndex: 70 }}
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl pt-3 px-4"
            style={{ zIndex: 80, maxHeight: '70vh', overflowY: 'auto', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />
              <button
                onClick={() => setSheetOpen(false)}
                className="absolute right-4 top-4 text-text-secondary"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Provider info */}
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ width: 28, height: 28, background: '#E8347A' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-text-primary truncate">
                  {provider.name}
                </p>
                {provider.city && provider.state && (
                  <p className="text-[11px] text-text-secondary">
                    {provider.city}, {provider.state}
                  </p>
                )}
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-[1px] rounded-full shrink-0"
                style={badgeStyle}
              >
                {badgeLabel}
              </span>
            </div>

            {/* Tab list */}
            <div className="space-y-1 mb-5">
              {CONTEXT_BAR_TABS.map(({ slug, label }) => {
                const isActive = slug === activeSlug;
                return (
                  <Link
                    key={slug}
                    to={`/business/dashboard?tab=${slug}`}
                    className="block px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors"
                    style={{
                      background: isActive ? '#FDE8F0' : 'transparent',
                      color: isActive ? '#C8005A' : '#333',
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <Link
                to={`/provider/${provider.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[13px] font-medium"
                style={{ color: '#888' }}
              >
                View public profile <ArrowUpRight size={13} />
              </Link>
              {tierHelpers.isFree && (
                <Link
                  to="/business/dashboard?tab=settings"
                  className="inline-block text-[11px] font-bold uppercase tracking-wide px-4 py-2 rounded-full"
                  style={{ background: '#E8347A', color: '#fff' }}
                >
                  Upgrade
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
