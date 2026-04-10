/*
 * GateLeftPanel — inline editorial gate shown in the left half of the
 * split-view when the user has a city but hasn't picked a treatment yet.
 *
 * Shows a search bar + 5 broad category pills (Botox, Filler, Laser,
 * Body, Skin) instead of 13+ individual treatment pills.
 */

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CATEGORY_PILLS } from '../../lib/constants';
import SuggestTreatmentBlock from '../SuggestTreatmentBlock';

export default function GateLeftPanel({
  city,
  state,
  providerCount,
  loading,
  onSelectPill,
  pillCounts = {},
  onSearch,
  treatmentSearch = '',
  activeCategorySlug,
}) {
  const [localQuery, setLocalQuery] = useState(treatmentSearch);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalQuery(treatmentSearch);
  }, [treatmentSearch]);

  function handleInputChange(e) {
    const val = e.target.value;
    setLocalQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => onSearch?.(val.trim()), 300);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && localQuery.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch?.(localQuery.trim());
    }
  }

  const countStr = loading
    ? '\u2026'
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
        Select a category or search for a treatment.
      </p>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#B8A89A',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search any treatment\u2026"
          style={{
            width: '100%',
            height: 40,
            padding: '0 36px 0 34px',
            borderRadius: 20,
            border: '1.5px solid #e0e0e0',
            background: '#FAFAFA',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 400,
            color: '#333',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#E8347A'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
        />
        {localQuery && (
          <button
            type="button"
            onClick={() => {
              setLocalQuery('');
              if (debounceRef.current) clearTimeout(debounceRef.current);
              onSearch?.('');
            }}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#aaa',
              padding: 0,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Category pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 22,
        }}
      >
        {CATEGORY_PILLS.map((pill) => {
          const count = pillCounts[pill.label];
          const hasCount = count != null && count > 0;
          const isActive = activeCategorySlug === pill.slug;
          return (
            <button
              key={pill.slug}
              type="button"
              onClick={() => onSelectPill?.(pill)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 14px',
                borderRadius: 20,
                border: isActive
                  ? '2px solid #E8347A'
                  : '1.5px solid #e0e0e0',
                background: isActive ? '#fdf0f5' : 'white',
                color: isActive ? '#E8347A' : '#555',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all .15s',
                whiteSpace: 'nowrap',
                opacity: hasCount ? 1 : 0.45,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#E8347A';
                  e.currentTarget.style.color = '#E8347A';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.color = '#555';
                }
              }}
            >
              <span>{pill.emoji}</span>
              <span>{pill.label}</span>
              {hasCount && (
                <span style={{ fontWeight: 400, fontSize: 10, color: '#B8A89A' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
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
