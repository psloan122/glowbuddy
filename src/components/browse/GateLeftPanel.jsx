/*
 * GateLeftPanel — inline editorial gate shown in the left half of the
 * split-view when the user has a city but hasn't picked a treatment yet.
 *
 * Replaces the old centered "What treatment are you pricing out?" modal
 * box, which hid the map and made the page feel like a form. The new
 * gate is a secondary refinement affordance — the primary experience
 * is the map on the right, which shows every active provider in the
 * city as gray pins immediately. Picking a treatment colors the pins
 * with prices (GasBuddy pattern).
 *
 * Headline uses Playfair 900 (editorial display), body uses Outfit.
 * Pills match ProcedureGate's editorial square style (2px radius,
 * 11px uppercase Outfit 500, border #EDE8E3) so they sit in the same
 * visual family as the rest of the /browse chrome.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PROCEDURE_PILLS } from '../../lib/constants';
import SuggestTreatmentBlock from '../SuggestTreatmentBlock';

export default function GateLeftPanel({
  city,
  state,
  providerCount,
  loading,
  onSelectPill,
  pillCounts = {},
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = PROCEDURE_PILLS.filter((p) => p.isPrimary);
  const more = PROCEDURE_PILLS.filter((p) => !p.isPrimary);

  const locationStr = city && state ? `${city}, ${state}` : city || '';
  const countStr = loading
    ? '…'
    : `${providerCount} ${providerCount === 1 ? 'provider' : 'providers'}`;

  return (
    <div style={{ padding: '16px 8px 40px 8px' }}>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 400,
          fontSize: 14,
          color: '#111',
          marginBottom: 2,
        }}
      >
        {countStr} in this area
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 13,
          color: '#B8A89A',
          marginBottom: 20,
        }}
      >
        Select a treatment to compare prices.
      </p>

      <div
        style={{
          borderTop: '1px solid #EDE8E3',
          paddingTop: 22,
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {primary.map((pill) => (
            <GatePillButton
              key={`${pill.slug}-${pill.brand || 'base'}`}
              pill={pill}
              count={pillCounts[pill.label]}
              onSelect={onSelectPill}
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 14px',
              borderRadius: '2px',
              border: '1px solid #EDE8E3',
              background: 'white',
              color: '#555',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              margin: '0 4px 6px 0',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E8347A';
              e.currentTarget.style.color = '#E8347A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#EDE8E3';
              e.currentTarget.style.color = '#555';
            }}
          >
            More
            {moreOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {moreOpen && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0,
              marginTop: 4,
            }}
          >
            {more.map((pill) => (
              <GatePillButton
                key={`${pill.slug}-${pill.brand || 'base'}-more`}
                pill={pill}
                count={pillCounts[pill.label]}
                onSelect={onSelectPill}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid #EDE8E3',
          paddingTop: 20,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 12,
            color: '#888',
          }}
        >
          Or tap any pin on the map to explore a specific med spa.
        </p>

        <SuggestTreatmentBlock
          source="gate_left_panel"
          city={city}
          state={state}
        />
      </div>
    </div>
  );
}

function GatePillButton({ pill, count, onSelect }) {
  const hasCount = count != null && count > 0;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(pill)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '8px 14px',
        borderRadius: '2px',
        border: '1px solid #EDE8E3',
        background: 'white',
        color: '#555',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        margin: '0 4px 6px 0',
        transition: 'all .15s',
        opacity: hasCount ? 1 : 0.45,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#E8347A';
        e.currentTarget.style.color = '#E8347A';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#EDE8E3';
        e.currentTarget.style.color = '#555';
      }}
    >
      {pill.label}
      {hasCount && (
        <span style={{ fontWeight: 400, fontSize: 10, color: '#B8A89A', letterSpacing: 0 }}>
          {count}
        </span>
      )}
    </button>
  );
}
