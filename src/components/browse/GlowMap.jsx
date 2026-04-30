/*
 * GlowMap — Mapbox GL map component (react-map-gl v8).
 *
 * Declarative <Marker> components — React handles reconciliation;
 * highlight is just a re-render of the affected pin.
 *
 * Supercluster clustering:
 *   - pins loaded into a supercluster index keyed on pinnedGroups
 *   - clusters form at zoom ≤ 12; individual pins at zoom 13+
 *   - cluster click → flyTo expansion zoom
 */

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import Supercluster from 'supercluster';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, X, LocateFixed, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { providerProfileUrl } from '../../lib/slugify';
import MapLoadingFallback from '../MapLoadingFallback';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
// Custom style from VITE_MAPBOX_STYLE; falls back to Mapbox light-v11 so
// the map always renders even without a configured style URL.
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/light-v11';

const DEFAULT_VIEW = { longitude: -98.35, latitude: 39.5, zoom: 4 };

// Cap on gray "no prices yet" pins rendered to the map.
// Priced pins are always shown; unpriced are capped to avoid
// cluttering low-data cities and hurting Marker reconciliation perf.
const MAX_UNPRICED_PINS = 50;

const PRICE_COLORS = {
  great:     '#1D9E75', // > 20% below city avg — green
  good:      '#E8347A', // at or near avg       — hot pink
  high:      '#C8001A', // > 20% above avg       — red
  noPrice:   '#B8A89A', // no price yet          — gray
  highlight: '#111111', // hovered / selected    — black
};

function colorForGroup(group, cityAvg) {
  if (group.bestPrice == null) return PRICE_COLORS.noPrice;
  if (!cityAvg || cityAvg <= 0) return PRICE_COLORS.good;
  const pct = (group.bestPrice - cityAvg) / cityAvg;
  if (pct < -0.2) return PRICE_COLORS.great;
  if (pct > 0.2)  return PRICE_COLORS.high;
  return PRICE_COLORS.good;
}

function fmtShortPrice(n) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(0)}`;
}

const POPUP_LABEL_UNIT = {
  per_unit: '/unit', per_syringe: '/syringe', per_session: '/session',
  per_vial: '/vial', per_cycle: '/cycle',
};

function fmtPopupPrice(n) {
  const v = Number(n) || 0;
  if (v >= 100 || Number.isInteger(v)) return `$${Math.round(v).toLocaleString()}`;
  return `$${v.toFixed(2)}`;
}

function providerInitials(name) {
  if (!name) return '?';
  const words = name.replace(/^(Dr\.?|Prof\.?)\s+/i, '').trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function debounce(fn, ms) {
  let timer;
  const d = (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  d.cancel = () => clearTimeout(timer);
  return d;
}

// ── Price pill pin — SVG matching GlowMap's buildPinIcon exactly ──────────
// Rendered as inline React SVG so there are no data-URI encoding overheads
// and no SVG <filter id> collisions between markers on the same page.
// Drop-shadow is applied via CSS filter on the wrapper div.
const PricePin = memo(function PricePin({
  color, label, highlighted, onMouseEnter, onMouseLeave,
}) {
  const w     = highlighted ? 64 : 56;
  const h     = highlighted ? 30 : 26;
  const stroke = highlighted ? '#111111' : '#FFFFFF';
  const strokeW = highlighted ? 2.5 : 2;
  const fontSize = highlighted ? 13 : 11;
  const text = label.length > 7 ? `${label.slice(0, 6)}\u2026` : label;
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ filter: 'drop-shadow(0 1px 1.2px rgba(0,0,0,0.25))' }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block' }}
      >
        <rect
          x="1" y="1"
          rx={h / 2} ry={h / 2}
          width={w - 2} height={h - 2}
          fill={color}
          stroke={stroke}
          strokeWidth={strokeW}
        />
        <text
          x={w / 2} y={h / 2 + 4}
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="Outfit, Arial, sans-serif"
          fontWeight="700"
          fontSize={fontSize}
        >
          {text}
        </text>
      </svg>
    </div>
  );
});

// ── No-price pill — SVG matching GlowMap's buildNoPricePinIcon ───────────
const NoPricePin = memo(function NoPricePin({
  highlighted, onMouseEnter, onMouseLeave,
}) {
  const w          = highlighted ? 96 : 88;
  const h          = highlighted ? 26 : 24;
  const textColor  = highlighted ? '#ffffff' : '#6B7280';
  const bgColor    = highlighted ? '#111111' : '#ffffff';
  const borderColor = highlighted ? '#111111' : '#D1D5DB';
  const fontSize   = highlighted ? 12 : 11;
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.12))' }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: 'block' }}
      >
        <rect
          x="1" y="1"
          rx={h / 2} ry={h / 2}
          width={w - 2} height={h - 2}
          fill={bgColor}
          stroke={borderColor}
          strokeWidth="1.5"
        />
        <text
          x={w / 2} y={h / 2 + fontSize / 2 - 1}
          textAnchor="middle"
          fill={textColor}
          fontFamily="Outfit, Arial, sans-serif"
          fontWeight="500"
          fontSize={fontSize}
        >
          No prices yet
        </text>
      </svg>
    </div>
  );
});

// ── Cluster bubble — pink circle with white count, matching GlowMap ──────
const ClusterPin = memo(function ClusterPin({ count }) {
  const size     = count >= 100 ? 48 : count >= 10 ? 40 : 34;
  const fontSize = count >= 100 ? 13 : 12;
  const label    = count > 999 ? '999+' : String(count);
  // Clusters with fewer than 5 providers render at 70% opacity to signal
  // lower confidence — same N >= 5 threshold as city_benchmarks.is_reliable.
  // No text prefix: the count itself is already self-explanatory.
  const isLowN   = count < 5;
  return (
    <div style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))', opacity: isLowN ? 0.7 : 1 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        <circle
          cx={size / 2} cy={size / 2} r={size / 2 - 2}
          fill="#E8347A" stroke="#fff" strokeWidth="2"
        />
        <text
          x={size / 2} y={size / 2 + fontSize / 2 - 1}
          textAnchor="middle"
          fill="#fff"
          fontFamily="Outfit, Arial, sans-serif"
          fontWeight="700"
          fontSize={fontSize}
        >
          {label}
        </text>
      </svg>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────
export default memo(function GlowMap({
  allProviders = [],
  procedures   = [],
  cityAvg,
  city,
  state,
  highlightedId,
  selectedId,
  onPinClick,
  onMapClick,
  onBoundsChange,
  onUserMovedMap,
  onPinHover,
  showSearchArea,
  onSearchAreaClick,
  mobileLegendTop,   // eslint-disable-line no-unused-vars
  bottomPadding = 0,
  isMobile = false,
  searchableProviders = [],
  activePriceLabel = null,
}) {
  const mapRef = useRef(null);
  const [ready, setReady]           = useState(false);
  const [mapError, setMapError]     = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [styleUrl, setStyleUrl]               = useState(MAPBOX_STYLE);
  const [styleFallbackAttempted, setStyleFallbackAttempted] = useState(false);

  const userInteracted     = useRef(false);
  const initialCenteredRef = useRef(false);
  const lastCityKeyRef     = useRef(null);

  // ── Data refs — updated every render so memo/effects always have
  // fresh data without depending on array-reference equality.
  const allProvidersRef = useRef(allProviders);
  allProvidersRef.current = allProviders;
  const proceduresRef = useRef(procedures);
  proceduresRef.current = procedures;
  const cityAvgRef = useRef(cityAvg);
  cityAvgRef.current = cityAvg;

  // ── Stable fingerprints — the groups useMemo runs only when real
  // data changes, not on every parent re-render with new array refs.
  const providerFingerprint = useMemo(
    () => (allProviders || []).map((p) => p.id || `${p.name}|${p.city}`).join(','),
    [allProviders],
  );
  const procedureFingerprint = useMemo(() => {
    if (!procedures?.length) return '';
    return procedures.map((r) => {
      const v = r.normalized_compare_value ?? r.price_paid ?? '';
      return `${r.provider_id || r.provider_name}:${v}`;
    }).join(',');
  }, [procedures]);

  // ── Provider search overlay ──────────────────────────────────────────
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [provQuery, setProvQuery]           = useState('');
  const searchInputRef = useRef(null);

  const searchResults = useMemo(() => {
    if (!provQuery) return [];
    const q = provQuery.toLowerCase();
    return (searchableProviders || [])
      .filter((p) => p.lat && p.lng && (p.name || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchableProviders, provQuery]);

  useEffect(() => {
    if (searchExpanded) searchInputRef.current?.focus();
  }, [searchExpanded]);

  // ── Stable callback refs ─────────────────────────────────────────────
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onUserMovedMapRef = useRef(onUserMovedMap);
  const onMapClickRef     = useRef(onMapClick);
  const onPinClickRef     = useRef(onPinClick);
  const onPinHoverRef     = useRef(onPinHover);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { onUserMovedMapRef.current = onUserMovedMap; }, [onUserMovedMap]);
  useEffect(() => { onMapClickRef.current     = onMapClick;     }, [onMapClick]);
  useEffect(() => { onPinClickRef.current     = onPinClick;     }, [onPinClick]);
  useEffect(() => { onPinHoverRef.current     = onPinHover;     }, [onPinHover]);

  // ── Debounced moveEnd → viewport update + bounds report ─────────────
  // Triggered by onMoveEnd (replaces onIdle).
  // Bounds are captured at event time and passed as params so the debounce
  // always fires with the latest snapshot — not stale ref values.
  const debouncedMoveEndRef = useRef(
    debounce((zoom, rawBounds) => {
      // 1. Update supercluster viewport so clusters recompute.
      setViewport({ zoom, bounds: rawBounds });

      // 2. Report bounds to parent (guarded: only after initial geocoding).
      if (!initialCenteredRef.current) return;
      if (!rawBounds) return;
      const [west, south, east, north] = rawBounds;
      onBoundsChangeRef.current?.({ north, south, east, west });
      if (userInteracted.current) onUserMovedMapRef.current?.();
    }, 300),
  );
  useEffect(() => { const d = debouncedMoveEndRef.current; return () => d.cancel(); }, []);

  // ── City geocoding (Mapbox REST) ─────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const key = city && state ? `${city}|${state}` : null;
    if (!key || key === lastCityKeyRef.current) return;
    lastCityKeyRef.current   = key;
    userInteracted.current   = false;
    initialCenteredRef.current = false;

    if (!MAPBOX_TOKEN) return;
    let cancelled = false;

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(`${city} ${state}`)}.json` +
      `?country=US&types=place&access_token=${MAPBOX_TOKEN}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const feature = data.features?.[0];
        if (!feature) { initialCenteredRef.current = true; return; }
        const [lng, lat] = feature.center;
        mapRef.current?.getMap()?.once('moveend', () => {
          if (!cancelled) initialCenteredRef.current = true;
        });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 600 });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[GlowMap] geocode error', err);
        initialCenteredRef.current = true;
      });

    return () => { cancelled = true; };
  }, [ready, city, state]);

  // ── Bottom padding (mobile sheet) ────────────────────────────────────
  // Mapbox easeTo with padding reframes the camera so the usable viewport
  // area (above the sheet) stays centered — equivalent to Google Maps'
  // setOptions({ padding }) + panTo(center).
  useEffect(() => {
    if (!ready) return;
    mapRef.current?.getMap()?.easeTo({
      padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 },
      duration: 0,
    });
  }, [ready, bottomPadding]);

  // ── Fly to selected provider ──────────────────────────────────────────
  // When a pin is tapped and selectedId changes, smoothly center the map
  // on that provider at zoom ≥ 14 so the pin sits in the visible area
  // above the bottom sheet (GlowMap just highlighted in place; this is
  // better UX for mobile).
  useEffect(() => {
    if (!ready || !selectedId) return;
    // groups is read from the current closure — fresh from the last render
    // that triggered this effect (when selectedId changed).
    const group = groups.find((g) => g.provider_id === selectedId);
    if (!group?.lat || !group?.lng) return;
    const currentZoom = mapRef.current?.getMap()?.getZoom() ?? 0;
    mapRef.current?.flyTo({
      center:   [group.lng, group.lat],
      zoom:     Math.max(currentZoom, 14),
      duration: 800,
    });
    // Intentionally NOT setting userInteracted — this is a programmatic
    // fly triggered by a pin tap, not user exploration of the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  // ── 20 s load timeout ────────────────────────────────────────────────
  useEffect(() => {
    if (ready || mapError) return;
    const t = setTimeout(() => {
      console.error('[MAP_DEBUG] 20s timeout — map never loaded', {
        ready,
        mapError,
        mapboxToken: MAPBOX_TOKEN ? MAPBOX_TOKEN.slice(0, 20) + '…' : 'MISSING',
        mapboxStyle: styleUrl,
      });
      setMapError('Map load timed out');
    }, 20_000);
    return () => clearTimeout(t);
  }, [ready, mapError]);

  // ── Build provider groups (one per provider, price merged in) ────────
  //
  // Mirrors the reconciliation logic in GlowMap's marker useEffect.
  // Runs only when providerFingerprint or procedureFingerprint changes,
  // not on every parent re-render. Data is read from refs so we always
  // have the latest values that produced those fingerprints.
  const groups = useMemo(() => {
    const currentProviders  = allProvidersRef.current;
    const currentProcedures = proceduresRef.current;

    // Index providers by composite key for name-based procedure matching.
    const providerByComposite = new Map();
    for (const p of Array.isArray(currentProviders) ? currentProviders : []) {
      if (!p) continue;
      const k =
        `${(p.name || p.provider_name || '').trim().toLowerCase()}` +
        `|${(p.city  || '').trim().toLowerCase()}` +
        `|${(p.state || '').trim().toLowerCase()}`;
      if (k !== '||') providerByComposite.set(k, p);
    }

    // Build price index keyed by provider_id.
    const priceByProviderId = new Map();
    for (const r of currentProcedures || []) {
      let pid = r.provider_id || null;
      if (!pid) {
        const k =
          `${(r.provider_name || '').trim().toLowerCase()}` +
          `|${(r.city  || '').trim().toLowerCase()}` +
          `|${(r.state || '').trim().toLowerCase()}`;
        const match = providerByComposite.get(k);
        if (match?.id) pid = match.id;
      }
      if (!pid) continue;
      if (!priceByProviderId.has(pid)) priceByProviderId.set(pid, { rows: [], bestRow: null });
      const entry = priceByProviderId.get(pid);
      entry.rows.push(r);
      // Only rows matching the active price label count toward bestPrice.
      // Without this guard a $55/session row would produce a "$55" map pin
      // that sits alongside a $9/unit city average — a category error.
      if (!activePriceLabel || r.normalized_compare_unit === activePriceLabel) {
        const v = Number(
          r.normalized_compare_value != null &&
          Number.isFinite(Number(r.normalized_compare_value))
            ? r.normalized_compare_value
            : r.price_paid,
        );
        if (Number.isFinite(v) && v > 0) {
          const bestV = entry.bestRow
            ? Number(
                entry.bestRow.normalized_compare_value != null &&
                Number.isFinite(Number(entry.bestRow.normalized_compare_value))
                  ? entry.bestRow.normalized_compare_value
                  : entry.bestRow.price_paid,
              )
            : Infinity;
          if (v < bestV) entry.bestRow = r;
        }
      }
    }
    for (const entry of priceByProviderId.values()) {
      const r = entry.bestRow;
      entry.bestPrice = r
        ? Number(
            r.normalized_compare_value != null &&
            Number.isFinite(Number(r.normalized_compare_value))
              ? r.normalized_compare_value
              : r.price_paid,
          )
        : null;
    }

    const nextGroups = new Map();

    // Primary: one group per provider in allProviders.
    for (const p of Array.isArray(currentProviders) ? currentProviders : []) {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key   = p.id || `${p.name || p.provider_name}|${p.city}|${p.state}`;
      const priced = (p.id && priceByProviderId.get(p.id)) || null;
      nextGroups.set(key, {
        key,
        provider_id:   p.id || null,
        provider_slug: p.slug || p.provider_slug || null,
        provider_name: p.name || p.provider_name || 'Unknown',
        city:   p.city   || '',
        state:  p.state  || '',
        lat,
        lng,
        google_rating:       p.google_rating ?? null,
        google_review_count: p.google_review_count ?? null,
        provider_type:       p.provider_type ?? null,
        rows:      priced?.rows     || [],
        bestRow:   priced?.bestRow  || null,
        bestPrice: priced?.bestPrice ?? null,
        bestPriceLabel: priced?.bestRow?.normalized_compare_unit || priced?.bestRow?.price_label || null,
      });
    }

    // Synthetic pins for procedures whose provider isn't in allProviders.
    for (const [pid, entry] of priceByProviderId.entries()) {
      if (!pid || nextGroups.has(pid)) continue;
      const r = entry.bestRow || entry.rows[0];
      if (!r) continue;
      const lat = Number(r.provider_lat);
      const lng = Number(r.provider_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      nextGroups.set(pid, {
        key:           pid,
        provider_id:   pid,
        provider_slug: r.provider_slug || null,
        provider_name: r.provider_name || 'Unknown',
        city:   r.city   || '',
        state:  r.state  || '',
        lat,
        lng,
        rows:      entry.rows,
        bestRow:   entry.bestRow,
        bestPrice: entry.bestPrice,
      });
    }

    return [...nextGroups.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFingerprint, procedureFingerprint, activePriceLabel]);

  // Cap unpriced pins; always render all priced pins.
  const pinnedGroups = useMemo(() => {
    const priced   = groups.filter((g) => g.bestPrice != null);
    const unpriced = groups.filter((g) => g.bestPrice == null).slice(0, MAX_UNPRICED_PINS);
    return [...priced, ...unpriced];
  }, [groups]);

  // ── Supercluster ─────────────────────────────────────────────────────
  // The index is rebuilt only when pinnedGroups changes.
  // getClusters() is cheap — called on every viewport change.
  const [scIndex, setScIndex] = useState(null);
  const [viewport, setViewport] = useState({ zoom: DEFAULT_VIEW.zoom, bounds: null });

  useEffect(() => {
    if (!pinnedGroups.length) { setScIndex(null); return; }
    const sc = new Supercluster({ radius: 60, maxZoom: 12, minPoints: 2 });
    sc.load(
      pinnedGroups.map((g) => ({
        type: 'Feature',
        properties: g,
        geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
      })),
    );
    setScIndex(sc);
  }, [pinnedGroups]);

  const clusters = useMemo(() => {
    if (!scIndex || !viewport.bounds) return [];
    return scIndex.getClusters(viewport.bounds, Math.floor(viewport.zoom));
  }, [scIndex, viewport]);

  // ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* ── Mapbox GL canvas ──────────────────────────────────────── */}
      {MAPBOX_TOKEN && (
        <MapGL
          key={retryNonce}
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={DEFAULT_VIEW}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          mapStyle={styleUrl}
          // Gesture handling — matches Google Maps gestureHandling:'greedy':
          // single-finger drag pans the map; two-finger pinch zooms.
          dragPan={true}
          scrollZoom={true}
          touchZoomRotate={true}
          // Rotation + pitch disabled — keeps the map locked to 2-D top-down.
          dragRotate={false}
          touchPitch={false}
          pitchWithRotate={false}
          // Keyboard shortcuts off — matches GlowMap keyboardShortcuts:false.
          keyboard={false}
          // Attribution hidden; NavigationControl rendered manually below.
          attributionControl={false}
          onLoad={() => {
            setReady(true);
            setMapError(null);
            // Seed viewport so clusters compute before the first moveend
            const m = mapRef.current;
            if (m) {
              const b = m.getMap()?.getBounds();
              setViewport({
                zoom: DEFAULT_VIEW.zoom,
                bounds: b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] : null,
              });
            }
          }}
          onError={(e) => {
            const errStatus = e?.error?.status;
            const isStyleError = errStatus === 403 || errStatus === 404;
            if (isStyleError && !styleFallbackAttempted && styleUrl !== 'mapbox://styles/mapbox/light-v11') {
              console.warn('[GlowMap] custom style failed; falling back to default');
              setStyleUrl('mapbox://styles/mapbox/light-v11');
              setStyleFallbackAttempted(true);
              return;
            }
            console.error('[MAP_DEBUG] onError fired', {
              message:     e?.error?.message,
              status:      errStatus,
              url:         e?.error?.url,
              sourceError: e?.error?.sourceError,
              stack:       e?.error?.stack,
              rawEvent:    e,
            });
            setMapError(e?.error?.message || 'Failed to load map');
          }}
          onMoveEnd={(e) => {
            const m = mapRef.current;
            if (!m) return;
            const b = m.getMap()?.getBounds();
            const rawBounds = b
              ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
              : null;
            debouncedMoveEndRef.current?.(e.viewState.zoom, rawBounds);
          }}
          onDragStart={() => { userInteracted.current = true; }}
          onZoom={() => { if (initialCenteredRef.current) userInteracted.current = true; }}
          onClick={() => onMapClickRef.current?.()}
        >
          {/* ── Clustered pins ─────────────────────────────────────── */}
          {ready && clusters.map((feature) => {
            const [longitude, latitude] = feature.geometry.coordinates;

            // ── Cluster bubble ──────────────────────────────────────
            if (feature.properties.cluster) {
              const { cluster_id, point_count } = feature.properties;
              return (
                <Marker
                  key={`cluster-${cluster_id}`}
                  longitude={longitude}
                  latitude={latitude}
                  anchor="center"
                  style={{ zIndex: 200, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.originalEvent?.stopPropagation();
                    const expansion = scIndex?.getClusterExpansionZoom(cluster_id);
                    if (expansion != null) {
                      mapRef.current?.flyTo({
                        center: [longitude, latitude],
                        zoom: expansion,
                        duration: 500,
                      });
                    }
                  }}
                >
                  <ClusterPin count={point_count} />
                </Marker>
              );
            }

            // ── Individual pin ──────────────────────────────────────
            const g = feature.properties;
            const isSelected = g.provider_id != null && g.provider_id === selectedId;
            const isHighlighted =
              g.provider_id != null &&
              (g.provider_id === highlightedId || isSelected);
            const isPriced = g.bestPrice != null;
            const color    = isHighlighted
              ? PRICE_COLORS.highlight
              : colorForGroup(g, cityAvgRef.current);
            const zIndex   = isHighlighted ? 1000 : (isPriced ? 100 : 50);
            const dimmed = selectedId != null && !isSelected;

            return (
              <Marker
                key={g.key}
                longitude={longitude}
                latitude={latitude}
                anchor="bottom"
                style={{
                  zIndex,
                  cursor: 'pointer',
                  opacity: dimmed ? 0.5 : 1,
                  transform: isSelected ? 'scale(1.1)' : undefined,
                  transition: 'opacity 200ms, transform 200ms',
                }}
                onClick={(e) => {
                  e.originalEvent?.stopPropagation();
                  onPinClickRef.current?.(g);
                }}
              >
                {isPriced ? (
                  <PricePin
                    color={color}
                    label={fmtShortPrice(g.bestPrice)}
                    highlighted={isHighlighted}
                    onMouseEnter={() => {
                      if (g.provider_id) onPinHoverRef.current?.(g.provider_id, true);
                    }}
                    onMouseLeave={() => {
                      if (g.provider_id) onPinHoverRef.current?.(g.provider_id, false);
                    }}
                  />
                ) : (
                  <NoPricePin
                    highlighted={isHighlighted}
                    onMouseEnter={() => {
                      if (g.provider_id) onPinHoverRef.current?.(g.provider_id, true);
                    }}
                    onMouseLeave={() => {
                      if (g.provider_id) onPinHoverRef.current?.(g.provider_id, false);
                    }}
                  />
                )}
              </Marker>
            );
          })}

          {/* ── Desktop popup — anchored to the selected pin ───── */}
          {!isMobile && selectedId != null && (() => {
            const sel = groups.find((g) => g.provider_id === selectedId);
            if (!sel?.lat || !sel?.lng) return null;
            const hasPrice = sel.bestPrice != null && sel.bestPrice > 0;
            const unit = POPUP_LABEL_UNIT[sel.bestPriceLabel] || '';
            const profileUrl = providerProfileUrl(sel.provider_slug, sel.provider_name, sel.city, sel.state);
            return (
              <Popup
                longitude={sel.lng}
                latitude={sel.lat}
                anchor="bottom"
                offset={[0, -10]}
                closeOnClick={false}
                onClose={() => onMapClickRef.current?.()}
                style={{ zIndex: 1100 }}
                maxWidth="none"
              >
                <div style={{ width: 280, fontFamily: 'var(--font-body)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: '#E91E8C',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, userSelect: 'none',
                    }}>
                      {providerInitials(sel.provider_name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 14, color: '#1A1A1A', lineHeight: 1.3,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {sel.provider_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {sel.provider_type || 'Med Spa'}
                        {sel.google_rating != null && (
                          <>
                            <span style={{ color: '#ccc' }}>&middot;</span>
                            <Star size={11} fill="#1A1A1A" stroke="#1A1A1A" style={{ marginTop: -1 }} />
                            <span style={{ fontWeight: 600, color: '#1A1A1A' }}>
                              {Number(sel.google_rating).toFixed(1)}
                            </span>
                            {sel.google_review_count != null && (
                              <span style={{ color: '#999' }}>({sel.google_review_count})</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasPrice ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>
                      From {fmtPopupPrice(sel.bestPrice)}{unit && <span style={{ fontWeight: 400, color: '#666' }}>{unit}</span>}
                      {sel.rows?.length > 0 && (
                        <span style={{ fontWeight: 400, color: '#888', marginLeft: 4 }}>
                          &middot; {sel.rows.length} {sel.rows.length === 1 ? 'price' : 'prices'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#E91E8C', fontWeight: 500, fontStyle: 'italic', marginBottom: 10 }}>
                      No prices yet &middot; Be first &rarr;
                    </div>
                  )}
                  {profileUrl ? (
                    <Link
                      to={profileUrl}
                      style={{
                        display: 'block', textAlign: 'center', fontSize: 13, fontWeight: 700,
                        color: 'white', background: '#E91E8C', borderRadius: 8, padding: '8px 0',
                        textDecoration: 'none', letterSpacing: '0.02em',
                      }}
                    >
                      View Profile &rarr;
                    </Link>
                  ) : (
                    <div style={{
                      textAlign: 'center', fontSize: 13, fontWeight: 600,
                      color: '#888', background: '#F5F0EC', borderRadius: 8, padding: '8px 0',
                    }}>
                      No profile yet
                    </div>
                  )}
                </div>
              </Popup>
            );
          })()}

          {/* ── Zoom control — top-right, compass hidden ─────────── */}
          {/* Mapbox only accepts corner positions; "right-center" is  */}
          {/* a Google Maps ControlPosition and would crash addControl. */}
          {/* showCompass={false}: rotation is disabled.               */}
          <NavigationControl
            position="top-right"
            showCompass={false}
          />
        </MapGL>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {!ready && !mapError && (
        <div
          style={{
            position: 'absolute', inset: 0, background: '#F5F0EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
          }}
        >
          <div
            aria-hidden
            style={{
              opacity: 0.08, position: 'absolute', inset: 0,
              backgroundImage:
                'linear-gradient(#999 1px, transparent 1px),' +
                'linear-gradient(90deg, #999 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid #E8347A', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
              }}
            />
            <p
              style={{
                fontFamily: 'var(--font-body)', fontSize: 12, color: '#999',
                fontWeight: 300, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              Loading map
            </p>
          </div>
        </div>
      )}

      {/* ── "Search this area" pill ───────────────────────────────── */}
      {showSearchArea && !mapError && (
        <button
          type="button"
          onClick={() => onSearchAreaClick?.()}
          style={{
            position: 'absolute',
            top: isMobile ? 'calc(max(12px, env(safe-area-inset-top, 20px)) + 72px)' : 12,
            left: '50%', transform: 'translateX(-50%)', zIndex: 45,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#fff', border: '1px solid #EDE8E3',
            borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            color: '#333', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF0F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          <Search size={14} strokeWidth={2.5} />
          Search this area
        </button>
      )}

      {/* ── Locate me ─────────────────────────────────────────────── */}
      {ready && !mapError && (
        <button
          type="button"
          aria-label="Center on my location"
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                mapRef.current?.flyTo({
                  center: [pos.coords.longitude, pos.coords.latitude],
                  zoom: 13, duration: 600,
                });
                userInteracted.current = true;
              },
              (err) => {
                // eslint-disable-next-line no-console
                console.warn('[GlowMap] locate-me failed:', err.message);
              },
              { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
            );
          }}
          style={{
            position: 'absolute', bottom: 80, right: 12, zIndex: 10,
            background: 'white', border: '1px solid #ddd', borderRadius: 8,
            padding: '8px 10px', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LocateFixed size={18} color="#555" />
        </button>
      )}

      {/* ── Error fallback ─────────────────────────────────────────── */}
      {mapError && !ready && (
        <MapLoadingFallback
          onRetry={() => { setMapError(null); setRetryNonce((n) => n + 1); }}
        />
      )}

      {/* ── Provider name search overlay ──────────────────────────── */}
      {searchableProviders.length > 0 && ready && !mapError && (
        <div
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 46,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', background: 'white',
              border: '1px solid #EDE8E3', borderRadius: 999,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', overflow: 'hidden',
              width: searchExpanded ? 220 : 36, height: 36,
              transition: 'width 0.2s ease',
            }}
          >
            <button
              type="button"
              aria-label={searchExpanded ? 'Close provider search' : 'Search providers'}
              onClick={() => {
                if (searchExpanded) { setSearchExpanded(false); setProvQuery(''); }
                else { setSearchExpanded(true); }
              }}
              style={{
                width: 36, height: 36, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#555', padding: 0,
              }}
            >
              {searchExpanded ? <X size={15} /> : <Search size={15} />}
            </button>
            {searchExpanded && (
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Find a provider…"
                value={provQuery}
                onChange={(e) => setProvQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setSearchExpanded(false); setProvQuery(''); }
                }}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  background: 'transparent', paddingRight: 10,
                }}
              />
            )}
          </div>

          {searchResults.length > 0 && (
            <div
              style={{
                background: 'white', border: '1px solid #EDE8E3', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden', width: 220,
              }}
            >
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 15, duration: 600 });
                    onPinClickRef.current?.({
                      provider_id:   p.id,
                      provider_slug: p.slug,
                      provider_name: p.name,
                      city:  p.city,
                      state: p.state,
                      lat:   p.lat,
                      lng:   p.lng,
                    });
                    setSearchExpanded(false);
                    setProvQuery('');
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', borderBottom: '1px solid #F5F0EC',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  {p.city && p.state && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#888', marginTop: 1 }}>
                      {p.city}, {p.state}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {provQuery.length >= 2 && searchResults.length === 0 && (
            <div style={{ background: 'white', border: '1px solid #EDE8E3', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '10px 12px', width: 220 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#888', margin: 0 }}>No providers found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
