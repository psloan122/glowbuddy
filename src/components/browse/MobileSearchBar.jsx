import { Search, SlidersHorizontal } from 'lucide-react';

export default function MobileSearchBar({
  procedureLabel,
  cityLabel,
  onPillTap,
  onTreatmentTap,
  onLocationTap,
  onFilterTap,
  activeFilterCount,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Search pill */}
      <div
        role="button"
        tabIndex={0}
        onClick={onPillTap}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 40,
          padding: '0 14px',
          background: '#F7F7F7',
          border: '1px solid #EBEBEB',
          borderRadius: 24,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <Search size={16} style={{ color: '#999', flexShrink: 0 }} />

        {/* Treatment half */}
        <div
          onClick={(e) => { e.stopPropagation(); onTreatmentTap(); }}
          style={{
            maxWidth: 100,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 14,
            color: procedureLabel ? '#1A1A1A' : '#999',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
          }}
        >
          {procedureLabel || 'Treatment'}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#DEDEDE', flexShrink: 0 }} />

        {/* Location half */}
        <div
          onClick={(e) => { e.stopPropagation(); onLocationTap(); }}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 13,
            color: cityLabel ? '#666' : '#999',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
          }}
        >
          {cityLabel || 'Location'}
        </div>
      </div>

      {/* Filter button */}
      <button
        type="button"
        onClick={onFilterTap}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          border: '1px solid #EBEBEB',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          position: 'relative',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          padding: 0,
        }}
        aria-label="Filters"
      >
        <SlidersHorizontal size={18} style={{ color: '#1A1A1A' }} />
        {activeFilterCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 18,
            height: 18,
            background: '#E91E8C',
            borderRadius: 9,
            fontSize: 10,
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            border: '2px solid white',
          }}>
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
