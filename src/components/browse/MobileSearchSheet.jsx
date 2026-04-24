import { useState, useRef, useEffect } from 'react';
import { X, Search, MapPin, Crosshair } from 'lucide-react';
import { PROCEDURE_PILLS, findPillByLabel } from '../../lib/constants';

const QUICK_PILLS = PROCEDURE_PILLS.filter((p) =>
  ['Botox', 'Dysport', 'Xeomin', 'Jeuveau', 'Daxxify', 'Fillers'].includes(p.label)
);

const TABS = ['treatment', 'location', 'filters'];
const TAB_LABELS = { treatment: 'Treatment', location: 'Location', filters: 'Filters' };

export default function MobileSearchSheet({
  open,
  onClose,
  // Procedure search
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
  // Filters
  hasPricesOnly,
  setHasPricesOnly,
  verifiedOnly,
  setVerifiedOnly,
}) {
  const [activeTab, setActiveTab] = useState('treatment');
  const procInputRef = useRef(null);
  const locInputRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Reset to treatment tab when sheet opens
  useEffect(() => {
    if (open) setActiveTab('treatment');
  }, [open]);

  // Auto-focus relevant input when tab changes
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (activeTab === 'treatment' && !procFilter) procInputRef.current?.focus();
      if (activeTab === 'location') locInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [open, activeTab, procFilter]);

  // Pill/procedure selection → advance to location tab
  function handleSelectPill(pill) {
    selectPill(pill);
    setActiveTab('location');
  }

  function handleSelectProcedure(proc) {
    selectProcedure(proc);
    setActiveTab('location');
  }

  // Location selection → advance to filters tab
  function handleSelectLocation(loc) {
    selectLocation(loc);
    setActiveTab('filters');
  }

  function handleUseMyLocation() {
    onUseMyLocation();
    onClose();
  }

  function handleClearAll() {
    clearProcedure();
    clearLocation();
    setHasPricesOnly(false);
    setVerifiedOnly(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'white',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
        display: 'flex',
        flexDirection: 'column',
        willChange: 'transform',
        touchAction: 'manipulation',
      }}
    >
      {/* Header: close + tab pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #F0EDE9',
        gap: 8,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'none', border: 'none',
            cursor: 'pointer', flexShrink: 0,
          }}
          aria-label="Close search"
        >
          <X size={20} style={{ color: '#111' }} />
        </button>

        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                background: activeTab === tab ? '#111' : 'transparent',
                color: activeTab === tab ? '#fff' : '#888',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Balance spacer */}
        <div style={{ width: 36, flexShrink: 0 }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 16px' }}>

        {/* ── TREATMENT TAB ── */}
        {activeTab === 'treatment' && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 22,
              color: '#111', margin: '0 0 4px',
            }}>
              What?
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13,
              color: '#888', margin: '0 0 16px',
            }}>
              Pick a treatment to see prices
            </p>

            {/* Selected treatment chip */}
            {procFilter && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: '#FFF0F5', border: '1px solid #F8C2D6',
                marginBottom: 14,
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: '#C94F78',
                }}>
                  {brandFilter || procFilter.label || procFilter.primary}
                </span>
                <button
                  type="button"
                  onClick={clearProcedure}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  aria-label="Clear treatment"
                >
                  <X size={16} style={{ color: '#C94F78' }} />
                </button>
              </div>
            )}

            {/* Free-text search input */}
            <div data-proc-input style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 46,
                padding: '0 12px', borderRadius: 8, border: '1px solid #EDE8E3', background: 'white',
              }}>
                <Search size={16} style={{ color: '#888', flexShrink: 0 }} />
                <input
                  ref={procInputRef}
                  type="text"
                  value={procQuery}
                  onChange={(e) => { setProcQuery(e.target.value); setProcOpen(true); }}
                  onFocus={() => procQuery.trim() && setProcOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const next = resolveProcedureFromQuery(procQuery);
                      if (next) { setProcQuery(''); setProcOpen(false); setActiveTab('location'); }
                    }
                    if (e.key === 'Escape') setProcOpen(false);
                  }}
                  placeholder="Search treatments..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: 16, color: '#111',
                  }}
                />
              </div>
              {procOpen && procQuery.trim() && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                  background: 'white', borderRadius: 8, border: '1px solid #E8E8E8',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden',
                }}>
                  {(() => {
                    const matchedPill = findPillByLabel(procQuery);
                    return (
                      <>
                        {matchedPill && (
                          <button
                            key={`pill-${matchedPill.slug}`}
                            type="button"
                            onClick={() => handleSelectPill(matchedPill)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '12px 16px',
                              background: 'none', border: 'none', borderBottom: '1px solid #F0F0F0',
                              fontFamily: 'var(--font-body)', fontSize: 14, color: '#111', cursor: 'pointer',
                            }}
                          >
                            {matchedPill.label}
                          </button>
                        )}
                        {procMatches.slice(0, 6).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleSelectProcedure(p)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '12px 16px',
                              background: 'none', border: 'none',
                              fontFamily: 'var(--font-body)', fontSize: 14, color: '#111', cursor: 'pointer',
                            }}
                          >
                            {p}
                          </button>
                        ))}
                        {!matchedPill && procMatches.length === 0 && (
                          <div style={{
                            padding: '12px 16px', fontFamily: 'var(--font-body)',
                            fontSize: 13, color: '#888',
                          }}>
                            No matches
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quick pills */}
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
              letterSpacing: '0.10em', textTransform: 'uppercase', color: '#888',
              margin: '0 0 10px',
            }}>
              Popular
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_PILLS.map((pill) => {
                const isActive = procFilter?.slug === pill.slug && (!pill.brand || brandFilter === pill.brand);
                return (
                  <button
                    key={`sheet-pill-${pill.slug}-${pill.brand || 'base'}`}
                    type="button"
                    onClick={() => { if (isActive) { clearProcedure(); } else { handleSelectPill(pill); } }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (isActive) { clearProcedure(); } else { handleSelectPill(pill); }
                    }}
                    style={{
                      height: 44, padding: '0 18px', borderRadius: 22,
                      border: `1px solid ${isActive ? '#E8347A' : '#EDE8E3'}`,
                      background: isActive ? '#E8347A' : 'white',
                      color: isActive ? '#fff' : '#555',
                      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
                      letterSpacing: '0.04em', whiteSpace: 'nowrap', cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                    }}
                  >
                    {pill.label === 'Fillers' ? 'Filler' : pill.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LOCATION TAB ── */}
        {activeTab === 'location' && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 22,
              color: '#111', margin: '0 0 4px',
            }}>
              Where?
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13,
              color: '#888', margin: '0 0 16px',
            }}>
              Search a city or use your location
            </p>

            {/* Near me button */}
            <button
              type="button"
              onClick={handleUseMyLocation}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px', marginBottom: 12,
                background: 'white', border: '1px solid #EDE8E3', borderRadius: 8,
                cursor: 'pointer', touchAction: 'manipulation',
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
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#111' }}>
                  Near me
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 11, color: '#888' }}>
                  Use your current location
                </span>
              </span>
            </button>

            {/* City search input */}
            <div data-loc-input style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 46,
                padding: '0 12px', borderRadius: 8, border: '1px solid #EDE8E3', background: 'white',
              }}>
                <MapPin size={16} style={{ color: '#888', flexShrink: 0 }} />
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
                      handleSelectLocation(locResults[0]);
                    }
                    if (e.key === 'Escape') setLocOpen(false);
                  }}
                  placeholder="City or area..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: 16, color: '#111',
                  }}
                />
                {selectedLoc && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    aria-label="Clear location"
                  >
                    <X size={16} style={{ color: '#888' }} />
                  </button>
                )}
              </div>
              {locOpen && locQuery.trim() && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                  background: 'white', borderRadius: 8, border: '1px solid #E8E8E8',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden',
                }}>
                  {locLoading ? (
                    <div style={{
                      padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#888',
                    }}>
                      Searching...
                    </div>
                  ) : locResults.length > 0 && locResults[0].kind === 'areaCodeHint' ? (
                    <div style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                      <p style={{ color: '#111', fontWeight: 500, marginBottom: 4 }}>Looks like a phone area code.</p>
                      <p style={{ color: '#888', margin: 0 }}>Try a city name or 5-digit zip.</p>
                    </div>
                  ) : locResults.length > 0 && locResults[0].kind === 'partialZipHint' ? (
                    <div style={{
                      padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#888',
                    }}>
                      Keep typing — US zip codes are 5 digits.
                    </div>
                  ) : locResults.length > 0 ? (
                    locResults.map((loc, i) => (
                      <button
                        key={`${loc.city}-${loc.state}-${i}`}
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '12px 16px',
                          background: 'none', border: 'none', borderBottom: '1px solid #F0F0F0',
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontFamily: 'var(--font-body)', fontSize: 14, color: '#111', cursor: 'pointer',
                        }}
                      >
                        <MapPin size={14} style={{ color: '#888', flexShrink: 0 }} />
                        {loc.city}{loc.state ? `, ${loc.state}` : ''}{loc.zip ? ` (${loc.zip})` : ''}
                      </button>
                    ))
                  ) : locQuery.trim().length >= 2 ? (
                    <div style={{
                      padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#888',
                    }}>
                      No locations found
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Selected location chip */}
            {selectedLoc && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: '#FFF0F5', border: '1px solid #F8C2D6',
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: '#C94F78',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <MapPin size={13} />
                  {selectedLoc.city}{selectedLoc.state ? `, ${selectedLoc.state}` : ''}
                </span>
                <button
                  type="button"
                  onClick={clearLocation}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  aria-label="Clear location"
                >
                  <X size={16} style={{ color: '#C94F78' }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FILTERS TAB ── */}
        {activeTab === 'filters' && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 22,
              color: '#111', margin: '0 0 4px',
            }}>
              Filters
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13,
              color: '#888', margin: '0 0 24px',
            }}>
              Narrow down your results
            </p>

            {/* Has prices toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 0', borderBottom: '1px solid #F0EDE9',
            }}>
              <div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
                  color: '#111', margin: '0 0 2px',
                }}>
                  Has prices
                </p>
                <p style={{
                  fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12,
                  color: '#888', margin: 0,
                }}>
                  Only show providers with listed prices
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHasPricesOnly(!hasPricesOnly)}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: hasPricesOnly ? '#E8347A' : '#DDD',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Toggle has prices filter"
              >
                <div style={{
                  position: 'absolute', top: 3, left: hasPricesOnly ? 23 : 3,
                  width: 22, height: 22, borderRadius: 11,
                  background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Verified only toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 0', borderBottom: '1px solid #F0EDE9',
            }}>
              <div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14,
                  color: '#111', margin: '0 0 2px',
                }}>
                  Verified only
                </p>
                <p style={{
                  fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12,
                  color: '#888', margin: 0,
                }}>
                  Community-confirmed prices
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: verifiedOnly ? '#E8347A' : '#DDD',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Toggle verified only filter"
              >
                <div style={{
                  position: 'absolute', top: 3, left: verifiedOnly ? 23 : 3,
                  width: 22, height: 22, borderRadius: 11,
                  background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer: clear all + show results */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
        borderTop: '1px solid #F0EDE9',
        background: 'white',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          type="button"
          onClick={handleClearAll}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 13, color: '#888',
            textDecoration: 'underline', padding: '8px 0', whiteSpace: 'nowrap',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, height: 50, borderRadius: 25, border: 'none', cursor: 'pointer',
            background: '#E8347A', color: 'white',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}
        >
          <Search size={15} />
          Show results
        </button>
      </div>
    </div>
  );
}
