/*
 * SuggestTreatmentBlock — small inline form rendered at the bottom of
 * every treatment picker.
 *
 * The first-timer demographic regularly looks for treatments we haven't
 * indexed yet (exosomes, polynucleotides, peptide therapy, etc). Instead
 * of dead-ending them with "no results", every picker offers a one-line
 * "Don't see your treatment? Suggest it →" link that expands into a
 * single text input + submit button. Submissions go straight into the
 * `treatment_suggestions` table created in migration 062.
 *
 * Props:
 *   variant      — 'editorial' (default, dark border, used in /browse
 *                  gate panels) or 'soft' (rounded rose-tinted, used
 *                  inside the /log form)
 *   source       — short string identifying which picker the suggestion
 *                  came from (e.g. "gate_left_panel", "log_step1") so
 *                  we can prioritize follow-up work by where the demand
 *                  is concentrated
 *   city, state  — optional city/state captured at submit time. The
 *                  parent should pass the user's current /browse city
 *                  if known so we can geo-prioritize new treatments.
 *
 * The form auto-collapses + thanks the user 3 seconds after a successful
 * submit so the picker UI snaps back to its normal state.
 */

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';

export default function SuggestTreatmentBlock({
  variant = 'editorial',
  source,
  city,
  state,
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const trimmed = value.trim();
    if (!trimmed) return;
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    // Pull city/state from props first (the picker has the most
    // specific context — e.g. what the /browse user just selected),
    // then fall back to gating localStorage so we still capture
    // geo-context on the gate state where city/state aren't passed.
    const ctxCity = city || getGatingCity() || null;
    const ctxState = state || getGatingState() || null;

    // suggested_by is best-effort — anon users still get to suggest
    // treatments, in which case we just store NULL.
    let userId = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id || null;
    } catch {
      userId = null;
    }

    const { error: insertError } = await supabase
      .from('treatment_suggestions')
      .insert({
        treatment_name: trimmed,
        suggested_by: userId,
        city: ctxCity,
        state: ctxState,
        source: source || null,
      });

    setSubmitting(false);

    if (insertError) {
      setError('Could not send — please try again.');
      return;
    }

    setSubmitted(true);
    setValue('');
    // Auto-collapse after a beat so the picker UI returns to normal.
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
    }, 3000);
  }

  if (submitted) {
    return (
      <div
        style={{
          marginTop: 14,
          padding: '10px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 500,
          color: '#1A7A3A',
          background: '#F0FAF5',
          border: '1px solid #C8E6D2',
          borderRadius: variant === 'soft' ? 8 : 2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Check size={14} />
        Thanks &mdash; we got your suggestion.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 14,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 500,
          color: '#888',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontStyle: 'italic',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#E8347A')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
      >
        Don&rsquo;t see your treatment? Suggest it
        <ArrowRight size={12} />
      </button>
    );
  }

  // Open form
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: 14,
        padding: variant === 'soft' ? '12px 14px' : '12px',
        background: variant === 'soft' ? '#FDF6F0' : '#FBF9F7',
        border: '1px solid #EDE8E3',
        borderRadius: variant === 'soft' ? 8 : 2,
      }}
    >
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: '#888',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Suggest a treatment
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Polynucleotides, Exosomes…"
          maxLength={120}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 10px',
            border: '1px solid #EDE8E3',
            borderRadius: variant === 'soft' ? 6 : 2,
            background: 'white',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: '#111',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#E8347A')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#EDE8E3')}
        />
        <button
          type="submit"
          disabled={!value.trim() || submitting}
          style={{
            padding: '8px 14px',
            background: value.trim() && !submitting ? '#E8347A' : '#EDE8E3',
            color: value.trim() && !submitting ? 'white' : '#B8A89A',
            border: 'none',
            borderRadius: variant === 'soft' ? 6 : 2,
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: value.trim() && !submitting ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && (
        <p
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: '#C0392B',
          }}
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setValue('');
          setError(null);
        }}
        style={{
          marginTop: 6,
          background: 'transparent',
          border: 'none',
          padding: 0,
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 400,
          color: '#B8A89A',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </form>
  );
}
