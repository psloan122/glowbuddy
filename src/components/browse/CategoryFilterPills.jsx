import { memo, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { CATEGORY_SUB_TYPES } from '../../lib/constants';

/**
 * Grouped category filter pills for the browse page.
 *
 * Top row: [All] [Toxins ▾] [Filler ▾] [Peels ▾] [Laser ▾] [Body ▾] [Skin ▾]
 * Tapping a category expands inline sub-chips for that type.
 * Selecting none within a category = show all of that category.
 */

const FILTER_GROUPS = [
  { key: 'neurotoxin', label: 'Toxins', hasSubs: false },
  { key: 'filler', label: 'Filler', hasSubs: true },
  { key: 'chemical-peel', label: 'Peels', hasSubs: false },
  { key: 'laser', label: 'Laser', hasSubs: true },
  { key: 'body', label: 'Body', hasSubs: true },
  { key: 'skin', label: 'Skin', hasSubs: true },
  { key: 'microneedling', label: 'Needling', hasSubs: true },
  { key: 'weight-loss', label: 'GLP-1', hasSubs: true },
];

const pillBase = {
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  borderRadius: 2,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
};

export default memo(function CategoryFilterPills({
  activeSlug,
  activeBrand,
  activeSubProcedure,
  onSelectCategory,
  onSelectSubType,
  onClear,
}) {
  const [expanded, setExpanded] = useState(null);

  const handleGroupClick = useCallback(
    (group) => {
      if (group.hasSubs && CATEGORY_SUB_TYPES[group.key]) {
        setExpanded((prev) => (prev === group.key ? null : group.key));
      }
      onSelectCategory(group.key);
    },
    [onSelectCategory],
  );

  const handleSubClick = useCallback(
    (sub) => {
      onSelectSubType(sub.procedureType);
    },
    [onSelectSubType],
  );

  const subs = expanded ? CATEGORY_SUB_TYPES[expanded] : null;

  return (
    <div>
      {/* Top-level category row */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* All button */}
        <button
          type="button"
          onClick={onClear}
          style={{
            ...pillBase,
            height: 28,
            padding: '0 10px',
            border: `1px solid ${!activeSlug ? '#E8347A' : '#EDE8E3'}`,
            background: !activeSlug ? '#E8347A' : 'white',
            color: !activeSlug ? '#fff' : '#555',
          }}
        >
          All
        </button>

        {FILTER_GROUPS.map((group) => {
          const isActive = activeSlug === group.key;
          const isExpanded = expanded === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => handleGroupClick(group)}
              style={{
                ...pillBase,
                height: 28,
                padding: '0 10px',
                border: `1px solid ${isActive ? '#E8347A' : '#EDE8E3'}`,
                background: isActive ? '#E8347A' : 'white',
                color: isActive ? '#fff' : '#555',
              }}
            >
              {group.label}
              {group.hasSubs && (
                <ChevronDown
                  size={10}
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded sub-type chips */}
      {subs && subs.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingTop: 6,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {subs.map((sub) => {
            const isActive = activeSubProcedure === sub.procedureType;
            return (
              <button
                key={sub.procedureType}
                type="button"
                onClick={() => handleSubClick(sub)}
                style={{
                  ...pillBase,
                  height: 26,
                  padding: '0 8px',
                  fontSize: 10,
                  border: `1px solid ${isActive ? '#E8347A' : '#D6CFC6'}`,
                  background: isActive ? '#FFF0F5' : 'white',
                  color: isActive ? '#E8347A' : '#777',
                }}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
