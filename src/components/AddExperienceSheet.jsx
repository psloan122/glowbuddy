import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const KEYFRAME_ID = 'add-experience-sheet-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAME_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAME_ID;
  style.textContent = `
    @keyframes sheetSlideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

const RECOVERY_OPTIONS = [
  { value: 'easier', label: 'Easier than expected' },
  { value: 'about_right', label: 'About what I expected' },
  { value: 'harder', label: 'Harder than expected' },
];

const ALONE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'depends', label: 'Depends' },
];

export default function AddExperienceSheet({
  procedureName,
  userId,
  onClose,
  onSuccess,
}) {
  const [painLevel, setPainLevel] = useState(null);
  const [surprise, setSurprise] = useState('');
  const [wishKnown, setWishKnown] = useState('');
  const [wouldGoAlone, setWouldGoAlone] = useState(null);
  const [recoveryRating, setRecoveryRating] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { ensureKeyframes(); }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSubmit() {
    if (!painLevel) {
      setError('Please rate the pain level.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const { error: dbError } = await supabase.from('user_experiences').insert({
        procedure_name: procedureName,
        user_id: userId || null,
        pain_level: painLevel,
        surprise: surprise.trim() || null,
        wish_known: wishKnown.trim() || null,
        would_go_alone: wouldGoAlone,
        recovery_rating: recoveryRating,
      });

      if (dbError) throw dbError;
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  const labelStyle = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#999',
    margin: '0 0 10px 0',
    display: 'block',
  };

  const textareaStyle = {
    width: '100%',
    minHeight: 80,
    border: '1px solid #EDE8E3',
    borderRadius: 2,
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    lineHeight: 1.5,
    color: 'var(--color-ink)',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const pillStyle = (active) => ({
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 16px',
    border: `1px solid ${active ? 'var(--color-hot-pink)' : '#EDE8E3'}`,
    borderRadius: 2,
    background: active ? '#FFF0F5' : '#FFFFFF',
    color: active ? 'var(--color-hot-pink)' : '#666',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.4)',
        }}
      />

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#FFFFFF',
          display: 'flex', flexDirection: 'column',
          animation: 'sheetSlideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <header
          style={{
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

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
            color: 'var(--color-ink)', margin: 0, textAlign: 'center', flex: 1,
            padding: '0 8px',
          }}>
            Share Your Experience
          </h2>

          <div style={{ width: 50 }} />
        </header>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '0 20px',
        }}>
          {submitted ? (
            /* Success state */
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                color: 'var(--color-ink)', margin: '0 0 12px 0',
              }}>
                Thank you!
              </p>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6,
                color: '#666', margin: '0 0 24px 0',
              }}>
                Your experience helps other women make better decisions.
              </p>
              <button
                onClick={onClose}
                style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#FFFFFF', background: 'var(--color-hot-pink)',
                  border: 'none', borderRadius: 2, padding: '14px 32px',
                  cursor: 'pointer',
                }}
              >
                DONE
              </button>
            </div>
          ) : (
            /* Form */
            <div style={{ padding: '20px 0 40px 0' }}>
              {/* Procedure chip */}
              <div style={{ marginBottom: 24 }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  color: 'var(--color-hot-pink)', background: '#FFF0F5',
                  border: '1px solid var(--color-hot-pink)', borderRadius: 2,
                  padding: '6px 14px', display: 'inline-block',
                }}>
                  {procedureName}
                </span>
              </div>

              {/* Pain level */}
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>How much did it hurt?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPainLevel(n)}
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: `2px solid ${painLevel === n ? 'var(--color-hot-pink)' : '#EDE8E3'}`,
                        background: painLevel === n ? 'var(--color-hot-pink)' : '#FFFFFF',
                        color: painLevel === n ? '#FFFFFF' : '#666',
                        fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: 'var(--font-body)', fontSize: 11, color: '#999',
                  marginTop: 4, paddingRight: 4,
                }}>
                  <span>Barely felt it</span>
                  <span>Ouch</span>
                </div>
              </div>

              {/* Surprise */}
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>What surprised you?</label>
                <textarea
                  value={surprise}
                  onChange={(e) => setSurprise(e.target.value)}
                  placeholder="Anything you didn't expect..."
                  maxLength={500}
                  style={textareaStyle}
                />
              </div>

              {/* Wish known */}
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>What do you wish you'd known?</label>
                <textarea
                  value={wishKnown}
                  onChange={(e) => setWishKnown(e.target.value)}
                  placeholder="Advice for someone going in for the first time..."
                  maxLength={500}
                  style={textareaStyle}
                />
              </div>

              {/* Would go alone */}
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Would you go alone?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ALONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWouldGoAlone(opt.value)}
                      style={pillStyle(wouldGoAlone === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recovery rating */}
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>How was recovery?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {RECOVERY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecoveryRating(opt.value)}
                      style={pillStyle(recoveryRating === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: '#DC2626', margin: '0 0 16px 0',
                }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  display: 'block', width: '100%', padding: '14px 0',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: submitting ? '#CCC' : 'var(--color-hot-pink)',
                  border: 'none', borderRadius: 2, cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'SUBMITTING...' : 'SHARE EXPERIENCE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
