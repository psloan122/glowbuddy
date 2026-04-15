import { useRef, useEffect } from 'react';
import { Search, X, MapPin, Crosshair } from 'lucide-react';
import {
  PROCEDURE_PILLS,
  findPillByLabel,
} from '../../lib/constants';

export default function MobileMapSearchOverlay({
  open,
  onClose,
  focusField = 'treatment',
  // Procedure search
  procRef,
  procFilter,
  brandFilter,
  procQuery,
  setProcQuery,
  procOpen,
  setProcOpen,
  procMatches,
  selectProcedure,
  selectPill,
  clearProcedure,
  resolveProcedureFromQuery,
  // Location search
  locRef,
  locQuery,
  handleLocInput,
  locOpen,
  setLocOpen,
  locResults,
  locLoading,
  selectLocation,
  clearLocation,
  selectedLoc,
  onUseMyLocation,
}) {
  const overlayRef = useRef(null);
  const procInputRef = useRef(null);
  const locInputRef = useRef(null);

  // Lock body scroll while open. Save and restore the previous value so
  // we don't clobber FindPrices' own scroll lock when closing.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Auto-focus the correct input when the overlay opens
  useEffect(() => {
    if (open) {
      // Short delay so the slide-up animation starts first
      const t = setTimeout(() => {
        if (focusField === 'location') {
          locInputRef.current?.focus();
        } else if (!procFilter) {
          procInputRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open, focusField, procFilter]);

  // Wrap selectPill/selectProcedure to auto-close overlay
  function handleSelectPill(pill) {
    selectPill(pill);
    onClose();
  }

  function handleSelectProcedure(proc) {
    selectProcedure(proc);
    onClose();
  }

  function handleClearProcedure() {
    clearProcedure();
  }

  // Location change does NOT auto-close

  const QUICK_PILLS = PROCEDURE_PILLS.filter((p) =>
    ['Botox', 'Dysport', 'Xeomin', 'Jeuveau', 'Daxxify', 'Fillers'].includes(p.label)
  );

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'white',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
        display: 'flex',
        flexDirection: 'column',
        willChange: 'transform',
        touchAction: 'manipulation',
      }}
    >
      {/* Top bar: close + title */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px 12px',
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
          aria-label="Close search"
        >
          <X size={22} style={{ color: '#111' }} />
        </button>
        <span style={{
          flex: 1, textAlign: 'center', fontFamily: 'var(--font-body)',
          fontWeight: 700, fontSize: 16, color: '#111',
          marginRight: 36, /* offset for the close button */
        }}>
          Search
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        {/* Near me — top action */}
        {onUseMyLocation && (
          <button
            type="button"
            onClick={() => { onUseMyLocation(); onClose(); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 14px',
              marginBottom: 12,
              background: 'white',
              border: '1px solid #EDE8E3',
              borderRadius: 8,
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 36, height: 36, borderRadius: 18,
              background: '#EFF6FF', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Crosshair size={16} style={{ color: '#2563EB' }} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#111',
              }}>
                Near me
              </span>
              <span style={{
                fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 11, color: '#888',
              }}>
                Use your current location
              </span>
            </span>
          </button>
        )}

        {/* Procedure input */}
        <div ref={procRef} className="relative" style={{ marginBottom: 12 }}>
          {procFilter ? (
            <div
              className="flex items-center gap-2 bg-white px-3"
              style={{ height: 44, borderRadius: 8, border: '1px solid #EDE8E3' }}
            >
              <Search size={16} className="text-text-secondary shrink-0" />
              <span
                className="flex-1 text-[14px] text-ink truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {brandFilter || procFilter.label || procFilter.primary}
              </span>
              <button
                onClick={handleClearProcedure}
                className="shrink-0 text-text-secondary/60 hover:text-ink p-0.5"
                aria-label="Clear treatment"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 bg-white px-3"
              style={{ height: 44, borderRadius: 8, border: '1px solid #EDE8E3' }}
            >
              <Search size={16} className="text-text-secondary shrink-0" />
              <input
                ref={procInputRef}
                type="text"
                value={procQuery}
                onChange={(e) => { setProcQuery(e.target.value); setProcOpen(true); }}
                onFocus={() => procQuery.trim() && setProcOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const next = resolveProcedureFromQuery(procQuery);
                    if (next) {
                      // Resolved — select and close
                      setProcQuery('');
                      setProcOpen(false);
                      onClose();
                    }
                  }
                  if (e.key === 'Escape') setProcOpen(false);
                }}
                placeholder="💆 What are you looking for?"
                className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-text-secondary"
                style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}
              />
            </div>
          )}
          {/* Treatment dropdown */}
          {procOpen && procQuery.trim() && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white z-50 overflow-hidden"
              style={{ borderRadius: 8, border: '1px solid #E8E8E8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              {(() => {
                const matchedPill = findPillByLabel(procQuery);
                return (
                  <>
                    {matchedPill && (
                      <button
                        key={`pill-${matchedPill.slug}`}
                        onClick={() => handleSelectPill(matchedPill)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-cream transition-colors text-ink"
                        style={{ borderBottom: '1px solid #F0F0F0' }}
                      >
                        {matchedPill.label}
                      </button>
                    )}
                    {procMatches.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleSelectProcedure(p)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-cream transition-colors text-ink"
                      >
                        {p}
                      </button>
                    ))}
                    {!matchedPill && procMatches.length === 0 && (
                      <div className="px-4 py-3 text-sm text-text-secondary">No matches</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Location input */}
        <div ref={locRef} className="relative" style={{ marginBottom: 16 }}>
          <div
            className="flex items-center gap-2 bg-white px-3"
            style={{ height: 44, borderRadius: 8, border: '1px solid #EDE8E3' }}
          >
            <MapPin size={16} className="text-text-secondary shrink-0" />
            <input
              ref={locInputRef}
              type="text"
              value={locQuery || (selectedLoc ? `${selectedLoc.city}${selectedLoc.state ? `, ${selectedLoc.state}` : ''}` : '')}
              onChange={(e) => handleLocInput(e.target.value)}
              onFocus={() => {
                if (selectedLoc && !locQuery) {
                  handleLocInput(`${selectedLoc.city}${selectedLoc.state ? `, ${selectedLoc.state}` : ''}`);
                }
                if (locQuery.trim()) setLocOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && locResults.length > 0 && !locResults[0].kind) {
                  selectLocation(locResults[0]);
                }
                if (e.key === 'Escape') setLocOpen(false);
              }}
              placeholder="📍 City or area..."
              className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-text-secondary"
              style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}
            />
            {selectedLoc && (
              <button
                onClick={clearLocation}
                className="shrink-0 text-text-secondary/60 hover:text-ink p-0.5"
                aria-label="Clear location"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {/* Location dropdown */}
          {locOpen && locQuery.trim() && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white z-50 overflow-hidden"
              style={{ borderRadius: 8, border: '1px solid #E8E8E8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            >
              {locLoading ? (
                <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">Searching...</div>
              ) : locResults.length > 0 && locResults[0].kind === 'areaCodeHint' ? (
                <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>
                  <p style={{ color: '#111', fontWeight: 500, marginBottom: 4 }}>Looks like a phone area code.</p>
                  <p>Try a city name or 5-digit zip.</p>
                </div>
              ) : locResults.length > 0 && locResults[0].kind === 'partialZipHint' ? (
                <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>Keep typing — US zip codes are 5 digits.</div>
              ) : locResults.length > 0 ? (
                locResults.map((loc, i) => (
                  <button
                    key={`${loc.city}-${loc.state}-${i}`}
                    onClick={() => selectLocation(loc)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-cream transition-colors flex items-center gap-2 text-ink"
                  >
                    <MapPin size={14} className="text-text-secondary shrink-0" />
                    {loc.city}{loc.state ? `, ${loc.state}` : ''}
                    {loc.zip ? ` (${loc.zip})` : ''}
                  </button>
                ))
              ) : locQuery.trim().length >= 2 ? (
                <div className="px-4 py-3 text-sm text-text-secondary">No locations found</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Quick treatment pills */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
          }}
        >
          {QUICK_PILLS.map((pill) => {
            const isActive = procFilter?.slug === pill.slug && (
              !pill.brand || brandFilter === pill.brand
            );
            return (
              <button
                key={`overlay-pill-${pill.slug}-${pill.brand || 'base'}`}
                type="button"
                onClick={() => {
                  if (isActive) { handleClearProcedure(); } else { handleSelectPill(pill); }
                }}
                onTouchEnd={(e) => {
                  // iOS Safari sometimes swallows onClick on transformed
                  // containers. Fire the handler on touchEnd as a fallback.
                  e.preventDefault();
                  if (isActive) { handleClearProcedure(); } else { handleSelectPill(pill); }
                }}
                style={{
                  height: 44,
                  minWidth: 44,
                  padding: '0 18px',
                  borderRadius: 22,
                  border: `1px solid ${isActive ? '#E8347A' : '#EDE8E3'}`,
                  background: isActive ? '#E8347A' : 'white',
                  color: isActive ? '#fff' : '#555',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                {pill.label === 'Fillers' ? 'Filler' : pill.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
