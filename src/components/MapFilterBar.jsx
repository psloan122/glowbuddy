import { MapPin, LocateFixed } from 'lucide-react';
import { PROCEDURE_TYPES, PROCEDURE_CATEGORIES } from '../lib/constants';

const DISTANCES = [
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 25, label: '25 mi' },
  { value: 50, label: '50 mi' },
];

export default function MapFilterBar({
  filters,
  onFilterChange,
  userLocation,
  onLocateMe,
  locating,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border-b border-gray-100">
      {/* Procedure type */}
      <select
        value={filters.procedureType}
        onChange={(e) => onFilterChange({ procedureType: e.target.value })}
        className="text-sm border border-gray-200 rounded-sm px-3 py-2 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-rose-accent/30 min-w-0"
      >
        <option value="">All Procedures</option>
        {Object.entries(PROCEDURE_CATEGORIES).map(([category, procedures]) => (
          <optgroup key={category} label={category}>
            {procedures.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* City / zip input */}
      <div className="relative flex-1 min-w-[140px] max-w-[220px]">
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="City, town, or zip"
          value={filters.cityOrZip}
          onChange={(e) => onFilterChange({ cityOrZip: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-sm pl-8 pr-3 py-2 bg-white text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-rose-accent/30"
        />
      </div>

      {/* Distance — only when we have user location */}
      {userLocation && (
        <select
          value={filters.distance}
          onChange={(e) => onFilterChange({ distance: Number(e.target.value) })}
          className="text-sm border border-gray-200 rounded-sm px-3 py-2 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-rose-accent/30"
        >
          {DISTANCES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      )}

      {/* Use my location — when no location */}
      {!userLocation && (
        <button
          onClick={onLocateMe}
          disabled={locating}
          className="flex items-center gap-1.5 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-sm px-3 py-2 hover:bg-rose-light/50 transition disabled:opacity-50"
        >
          <LocateFixed size={14} className={locating ? 'animate-pulse' : ''} />
          {locating ? 'Locating...' : 'Near me'}
        </button>
      )}
    </div>
  );
}
