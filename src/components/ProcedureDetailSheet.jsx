import { memo, useEffect, useRef } from 'react';
import { ArrowLeft, Share2, ChevronRight, AlertTriangle } from 'lucide-react';
import { getProcedureMetadata } from '../data/procedureMetadata';

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
/*  Internal: bullet list renderer                                    */
/* ------------------------------------------------------------------ */
function BulletList({ items, color = 'var(--color-ink)' }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            lineHeight: 1.6,
            color,
            marginBottom: 6,
          }}
        >
          <span style={{ flexShrink: 0, lineHeight: '1.6' }}>{'\u2022'}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
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

/* ------------------------------------------------------------------ */
/*  Recovery timeline labels                                          */
/* ------------------------------------------------------------------ */
const RECOVERY_STEPS = [
  { key: 'day1', label: 'Day 1' },
  { key: 'days2to3', label: 'Days 2-3' },
  { key: 'days4to7', label: 'Days 4-7' },
  { key: 'days7to14', label: 'Week 2' },
  { key: 'fullHeal', label: 'Full Recovery' },
];

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

  useEffect(() => { ensureKeyframes(); }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const metadata = getProcedureMetadata(procedureName);
  if (!metadata) return null;

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
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      }
    } catch { /* user cancelled */ }
  }

  const sectionPadding = { padding: '20px 0' };
  const bodyText = {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--color-ink)',
    margin: 0,
  };

  const hasRecovery = metadata.recovery && typeof metadata.recovery === 'object'
    && RECOVERY_STEPS.some(s => metadata.recovery[s.key]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.4)',
          animation: 'fadeInBackdrop 0.25s ease-out',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#FFFFFF',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUpSheet 0.3s ease-out',
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: '#FFFFFF',
            borderBottom: '1px solid #EDE8E3',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            aria-label="Back"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              color: 'var(--color-ink)',
            }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <h2
            style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
              color: 'var(--color-ink)', margin: 0, textAlign: 'center', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '0 8px',
            }}
          >
            {procedureName}
          </h2>

          <button
            onClick={handleShare}
            aria-label="Share"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center', color: 'var(--color-ink)',
            }}
          >
            <Share2 size={18} />
          </button>
        </header>

        {/* ── Scrollable Content ── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch', padding: '0 20px',
          }}
        >
          {/* ── Emergency Warning ── */}
          {metadata.emergencyWarnings?.length > 0 && (
            <div style={{ padding: '16px 0 12px 0' }}>
              <div
                style={{
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderLeft: '4px solid #DC2626', borderRadius: 2,
                  padding: '14px 16px',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                }}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: '#991B1B',
                  }}>
                    EMERGENCY WARNING
                  </span>
                </div>
                <BulletList items={metadata.emergencyWarnings} color="#991B1B" />
              </div>
            </div>
          )}

          {/* ── Price + Category ── */}
          <div style={sectionPadding}>
            {price != null && (
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                color: 'var(--color-ink)', margin: '0 0 4px 0',
              }}>
                ${typeof price === 'number' ? price.toLocaleString() : price}
                {priceUnit && (
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 400,
                    color: '#999', marginLeft: 2,
                  }}>
                    {priceUnit}
                  </span>
                )}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: price != null ? 12 : 0 }}>
              {metadata.category && (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                  color: '#666', border: '1px solid #EDE8E3', borderRadius: 2,
                  padding: '4px 10px', background: '#FAFAFA',
                }}>
                  {metadata.category}
                </span>
              )}
              {metadata.subcategory && (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                  color: '#666', border: '1px solid #EDE8E3', borderRadius: 2,
                  padding: '4px 10px', background: '#FAFAFA',
                }}>
                  {metadata.subcategory}
                </span>
              )}
            </div>
          </div>

          <Divider />

          {/* ── Price Reality ── */}
          {metadata.priceReality && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Price Reality</SectionHeader>
                <p style={bodyText}>{metadata.priceReality}</p>
              </div>
              <Divider />
            </>
          )}

          {/* ── Pain Level ── */}
          {metadata.painLevel != null && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Pain Level</SectionHeader>
                <div style={{ marginBottom: 8 }}>
                  <PainDots level={metadata.painLevel} />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                    color: 'var(--color-ink)', marginLeft: 8,
                  }}>
                    {metadata.painLevel} / 5
                  </span>
                </div>
                {metadata.painDescription && (
                  <p style={{ ...bodyText, fontSize: 13, color: '#666' }}>
                    {metadata.painDescription}
                  </p>
                )}
              </div>
              <Divider />
            </>
          )}

          {/* ── Heads Up (friend-voice) ── */}
          {metadata.headsUp && (
            <>
              <div style={sectionPadding}>
                <div style={{
                  background: '#FFFBEB', border: '1px solid #FDE68A',
                  borderLeft: '3px solid #F59E0B', borderRadius: 2,
                  padding: '16px 18px',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#92400E', margin: '0 0 10px 0',
                  }}>
                    HEADS UP
                  </p>
                  <p style={{ ...bodyText, fontSize: 13, color: '#78350F' }}>
                    {metadata.headsUp}
                  </p>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* ── Who Should NOT Book ── */}
          {metadata.whoShouldNotBook?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Who Should Not Book</SectionHeader>
                <BulletList items={metadata.whoShouldNotBook} color="#991B1B" />
              </div>
              <Divider />
            </>
          )}

          {/* ── Before You Go ── */}
          {metadata.beforeYouGo?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Before You Go</SectionHeader>
                <BulletList items={metadata.beforeYouGo} />
              </div>
              <Divider />
            </>
          )}

          {/* ── What Happens (process steps) ── */}
          {metadata.processSteps?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>What Happens</SectionHeader>
                <ol style={{ margin: 0, padding: '0 0 0 20px' }}>
                  {metadata.processSteps.map((step, i) => (
                    <li
                      key={i}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: 13,
                        lineHeight: 1.6, color: 'var(--color-ink)',
                        marginBottom: 6, paddingLeft: 4,
                      }}
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <Divider />
            </>
          )}

          {/* ── Recovery Timeline ── */}
          {hasRecovery && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Recovery Timeline</SectionHeader>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  {/* Vertical line */}
                  <div style={{
                    position: 'absolute', left: 5, top: 6, bottom: 6,
                    width: 2, background: '#EDE8E3',
                  }} />
                  {RECOVERY_STEPS.map((step) => {
                    const text = metadata.recovery[step.key];
                    if (!text) return null;
                    return (
                      <div key={step.key} style={{ position: 'relative', marginBottom: 16 }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: -20, top: 6,
                          width: 12, height: 12, borderRadius: '50%',
                          background: 'var(--color-hot-pink)', border: '2px solid #FFF',
                        }} />
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: 12,
                          fontWeight: 700, color: 'var(--color-ink)',
                          margin: '0 0 2px 0', letterSpacing: '0.04em',
                        }}>
                          {step.label}
                        </p>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: 13,
                          lineHeight: 1.5, color: '#666', margin: 0,
                        }}>
                          {text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* ── Questions to Ask ── */}
          {metadata.questionsToAsk?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Questions to Ask</SectionHeader>
                <BulletList items={metadata.questionsToAsk} />
              </div>
              <Divider />
            </>
          )}

          {/* ── Red Flags ── */}
          {metadata.redFlags?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderLeft: '3px solid #DC2626', borderRadius: 2,
                  padding: '16px 18px',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#991B1B', margin: '0 0 10px 0',
                  }}>
                    RED FLAGS
                  </p>
                  <BulletList items={metadata.redFlags} color="#991B1B" />
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* ── Aftercare ── */}
          {metadata.aftercare?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Aftercare</SectionHeader>
                <BulletList items={metadata.aftercare} />
              </div>
              <Divider />
            </>
          )}

          {/* ── Amenities to Ask About ── */}
          {metadata.amenitiesToAskAbout?.length > 0 && (
            <>
              <div style={sectionPadding}>
                <SectionHeader>Amenities to Ask About</SectionHeader>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {metadata.amenitiesToAskAbout.map((item, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                        color: 'var(--color-ink)', border: '1px solid #EDE8E3',
                        borderRadius: 2, padding: '6px 12px', background: '#FFFFFF',
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

          {/* ── Footer CTAs ── */}
          <div style={{ padding: '24px 0 40px 0' }}>
            {providerName && (
              <a
                href={providerSlug ? `/provider/${providerSlug}` : '#'}
                className="btn-editorial btn-editorial-primary"
                style={{
                  display: 'block', width: '100%', textAlign: 'center',
                  padding: '14px 0', fontFamily: 'var(--font-body)',
                  fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#FFFFFF',
                  background: 'var(--color-hot-pink)', border: 'none',
                  borderRadius: 2, textDecoration: 'none', cursor: 'pointer',
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
                  display: 'block', width: '100%',
                  marginTop: providerName ? 16 : 0,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
                  color: '#999', textAlign: 'center', padding: '10px 0',
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
