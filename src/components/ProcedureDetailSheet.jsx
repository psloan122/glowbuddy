import { memo, useEffect, useRef } from 'react';
import { X, ArrowLeft, Share2, ChevronRight } from 'lucide-react';
import { getProcedureMetadata } from '../lib/procedureMetadata';

/* ------------------------------------------------------------------ */
/*  Internal: section header (small-caps label)                       */
/* ------------------------------------------------------------------ */
function SectionHeader({ children }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#999',
      margin: '0 0 12px 0',
    }}>
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal: thin divider between sections                           */
/* ------------------------------------------------------------------ */
function Divider() {
  return (
    <hr style={{
      border: 'none',
      borderTop: '1px solid #EDE8E3',
      margin: 0,
    }} />
  );
}

/* ------------------------------------------------------------------ */
/*  Internal: pain dots (1-5)                                         */
/* ------------------------------------------------------------------ */
function PainDots({ level }) {
  const dots = [];
  for (let i = 1; i <= 5; i++) {
    dots.push(
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: i <= level ? 'var(--color-hot-pink)' : '#EDE8E3',
          marginRight: 6,
        }}
      />
    );
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center' }}>{dots}</span>;
}

/* ------------------------------------------------------------------ */
/*  Keyframe injection (runs once)                                    */
/* ------------------------------------------------------------------ */
const KEYFRAME_ID = 'procedure-detail-sheet-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAME_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAME_ID;
  style.textContent = `
    @keyframes slideUpSheet {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/* ================================================================== */
/*  ProcedureDetailSheet                                              */
/* ================================================================== */
export default memo(function ProcedureDetailSheet({
  procedureName,
  providerName,
  providerSlug,
  price,
  priceUnit,
  onClose,
  onAddExperience,
}) {
  const scrollRef = useRef(null);

  // Inject keyframes on mount
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const metadata = getProcedureMetadata(procedureName);

  if (!metadata) return null;

  /* ---- share handler ---- */
  async function handleShare() {
    const shareData = {
      title: `${procedureName} — GlowBuddy`,
      text: `Check out the full intelligence profile for ${procedureName} on GlowBuddy.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        // Optionally surface a toast here
      }
    } catch {
      // User cancelled or clipboard failed — silent
    }
  }

  /* ---- style constants ---- */
  const sectionPadding = { padding: '20px 0' };
  const bodyText = {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--color-ink)',
    margin: 0,
  };
  const bulletItem = {
    ...bodyText,
    paddingLeft: 4,
    marginBottom: 6,
  };

  return (
    <>
      {/* ---- Backdrop ---- */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.4)',
          animation: 'fadeInBackdrop 0.25s ease-out',
        }}
      />

      {/* ---- Sheet ---- */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUpSheet 0.3s ease-out',
        }}
      >
        {/* ============================================================ */}
        {/*  1. Sticky Header                                            */}
        {/* ============================================================ */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#FFFFFF',
            borderBottom: '1px solid #EDE8E3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            aria-label="Back"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-ink)',
            }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--color-ink)',
              margin: 0,
              textAlign: 'center',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 8px',
            }}
          >
            {procedureName}
          </h2>

          <button
            onClick={handleShare}
            aria-label="Share"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--color-ink)',
            }}
          >
            <Share2 size={18} />
          </button>
        </header>

        {/* ============================================================ */}
        {/*  Scrollable content                                          */}
        {/* ============================================================ */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 20px',
          }}
        >
          {/* -------------------------------------------------------- */}
          {/*  2. Price + Quick Stats                                    */}
          {/* -------------------------------------------------------- */}
          <div style={sectionPadding}>
            {price != null && (
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  margin: '0 0 4px 0',
                }}
              >
                ${typeof price === 'number' ? price.toLocaleString() : price}
                {priceUnit && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      fontWeight: 400,
                      color: '#999',
                      marginLeft: 2,
                    }}
                  >
                    {priceUnit}
                  </span>
                )}
              </p>
            )}

            {/* Quick stats row: duration + category */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: price != null ? 12 : 0 }}>
              {metadata.duration && (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                  color: '#666', border: '1px solid #EDE8E3', borderRadius: 2,
                  padding: '4px 10px', background: '#FAFAFA',
                }}>
                  {metadata.duration}
                </span>
              )}
              {metadata.category && (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                  color: '#666', border: '1px solid #EDE8E3', borderRadius: 2,
                  padding: '4px 10px', background: '#FAFAFA',
                }}>
                  {metadata.category}
                </span>
              )}
            </div>
          </div>

          <Divider />

          {/* -------------------------------------------------------- */}
          {/*  3. What Is It?                                           */}
          {/* -------------------------------------------------------- */}
          {metadata.description && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>What Is It?</SectionHeader>
                <p style={bodyText}>{metadata.description}</p>
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  4. How It Works                                          */}
          {/* -------------------------------------------------------- */}
          {metadata.howItWorks && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>How It Works</SectionHeader>
                <p style={bodyText}>{metadata.howItWorks}</p>
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  5. Pain Level                                            */}
          {/* -------------------------------------------------------- */}
          {metadata.painLevel != null && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Pain Level</SectionHeader>
                <div style={{ marginBottom: 8 }}>
                  <PainDots level={metadata.painLevel} />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      marginLeft: 8,
                    }}
                  >
                    {metadata.painLevel} / 5
                  </span>
                </div>
                {(metadata.painNote || metadata.painDescription) && (
                  <p style={{ ...bodyText, fontSize: 13, color: '#666' }}>
                    {metadata.painNote || metadata.painDescription}
                  </p>
                )}
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  6. Recovery                                              */}
          {/* -------------------------------------------------------- */}
          {metadata.recovery && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Recovery & Downtime</SectionHeader>
                <p style={bodyText}>{metadata.recovery}</p>
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  7. Results                                               */}
          {/* -------------------------------------------------------- */}
          {metadata.results && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Results</SectionHeader>
                <p style={bodyText}>{metadata.results}</p>
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  8. Warnings / Things to Know                            */}
          {/* -------------------------------------------------------- */}
          {metadata.warnings?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderLeft: '3px solid #F59E0B',
                    borderRadius: 2,
                    padding: '16px 18px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#92400E',
                      margin: '0 0 10px 0',
                    }}
                  >
                    THINGS TO KNOW
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {metadata.warnings.map((w, i) => (
                      <li
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          fontFamily: 'var(--font-body)',
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: '#78350F',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ flexShrink: 0, lineHeight: '1.6' }}>{'\u2022'}</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  9. Ideal For                                             */}
          {/* -------------------------------------------------------- */}
          {metadata.idealFor?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Best For</SectionHeader>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {metadata.idealFor.map((item, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--color-ink)',
                        border: '1px solid #EDE8E3',
                        borderRadius: 2,
                        padding: '6px 12px',
                        background: '#FFFFFF',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* -------------------------------------------------------- */}
          {/*  14. Footer CTAs                                         */}
          {/* -------------------------------------------------------- */}
          <div style={{ padding: '24px 0 40px 0' }}>
            {providerName && (
              <a
                href={providerSlug ? `/provider/${providerSlug}` : '#'}
                className="btn-editorial btn-editorial-primary"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  padding: '14px 0',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: 'var(--color-hot-pink)',
                  border: 'none',
                  borderRadius: 2,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  boxShadow: 'none',
                }}
              >
                BOOK AT {providerName.toUpperCase()} <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />
              </a>
            )}

            {onAddExperience && (
              <button
                onClick={onAddExperience}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: providerName ? 16 : 0,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#999',
                  textAlign: 'center',
                  padding: '10px 0',
                  letterSpacing: '0.02em',
                }}
              >
                Had this done? Share your experience <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});
