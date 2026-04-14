/*
 * GlowMap — the /browse map.
 *
 * This is a deliberate ground-up rewrite of the map experience after a
 * long string of bugs in the previous in-app map. The previous map was
 * removed entirely earlier in this codebase's history; this component
 * brings the map back, this time fixing every known issue:
 *
 *   1. Mobile pinch-to-zoom no longer bubbles up to the page or fights
 *      the gesture handler. We use `gestureHandling: 'greedy'` so a
 *      single-finger drag pans the map and a pinch zooms it without
 *      requiring two fingers (the default `cooperative` mode is the
 *      thing that made users feel like the map was "broken" on iOS).
 *
 *   2. The map no longer recenters under the user while they're
 *      browsing. We track manual interaction with a ref and only honor
 *      a programmatic recenter when the city/state filter actually
 *      changes — never on every re-render.
 *
 *   3. Pin density is managed by @googlemaps/markerclusterer — at low
 *      zoom levels overlapping pins are grouped into numbered clusters.
 *      At neighborhood zoom (high zoom) all pins are visible individually.
 *
 *   4. Pins are price-colored (GasBuddy pattern):
 *        - green when this provider's lowest price is >= 20% below
 *          the city average
 *        - hot pink at average
 *        - red when >= 20% above
 *        - gray when there is no price for this provider yet
 *
 *   5. The list ↔ map hover sync is bi-directional via the
 *      `highlightedId` and `selectedId` props. When the user hovers
 *      a list card on desktop, the corresponding pin grows and goes
 *      black. When they tap a pin, the parent can scroll the list
 *      to that card.
 *
 *   6. Pins are rendered from the `procedures` array passed in by
 *      FindPrices (the same merged feed as the list). They are NOT
 *      re-queried by viewport bounds — that was the source of the
 *      "Nuovo pin in Mandeville disappears when I zoom" bug.
 *
 *   7. The map respects the parent container's height. We deliberately
 *      do NOT set 100vh or anything that would clip the bottom nav.
 *      The parent decides height; we fill it.
 */

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Search, LocateFixed } from 'lucide-react';
import { loadGoogleMaps } from '../../lib/loadGoogleMaps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import MapLoadingFallback from '../MapLoadingFallback';

// Debounce helper — returns a function that delays invocation by `ms`.
function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

const PRICE_COLORS = {
  great: '#1D9E75',     // > 20% below avg — green
  good: '#E8347A',      // at or near avg — hot pink
  high: '#C8001A',      // > 20% above avg — red
  noPrice: '#B8A89A',   // no price yet — gray
  highlight: '#111111', // black, when hovered/selected
};

function colorForGroup(group, cityAvg) {
  if (group.bestPrice == null) return PRICE_COLORS.noPrice;
  if (!cityAvg || cityAvg <= 0) return PRICE_COLORS.good;
  const pct = (group.bestPrice - cityAvg) / cityAvg;
  if (pct < -0.2) return PRICE_COLORS.great;
  if (pct > 0.2) return PRICE_COLORS.high;
  return PRICE_COLORS.good;
}

// Build a small SVG pin with a price label baked in. Using an SVG data
// URL means we get a perfectly-styled pill marker without having to
// register custom OverlayViews — and it stays crisp at every zoom.
function buildPinIcon({ color, label, highlighted }) {
  const w = highlighted ? 64 : 56;
  const h = highlighted ? 30 : 26;
  const stroke = highlighted ? '#111111' : '#FFFFFF';
  const strokeW = highlighted ? 2.5 : 2;
  const fontSize = highlighted ? 13 : 11;
  const text = label.length > 7 ? `${label.slice(0, 6)}…` : label;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 8}" viewBox="0 0 ${w} ${h + 8}">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <rect x="1" y="1" rx="${h / 2}" ry="${h / 2}" width="${w - 2}" height="${h}" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>
        <text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" fill="#ffffff" font-family="Outfit, Arial, sans-serif" font-weight="700" font-size="${fontSize}">${text}</text>
      </g>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    // Anchor the bottom-center of the pin on the lat/lng so it sits on
    // the actual coordinate rather than having the price float above it.
    anchor: window.google?.maps ? new window.google.maps.Point(w / 2, h + 4) : undefined,
    scaledSize: window.google?.maps ? new window.google.maps.Size(w, h + 8) : undefined,
  };
}

// Gate-mode pin: small filled circle. Smaller and quieter than the
// price pill pins so a city-dense map doesn't get overwhelming before the
// user refines, but still clearly filled (not hollow) so pins don't look
// broken when clusters break apart at high zoom.
function buildGatePinIcon({ initials, highlighted }) {
  const size = highlighted ? 16 : 12;
  const r = size / 2;
  const fill = highlighted ? '#111111' : '#B8A89A';
  const stroke = highlighted ? '#111111' : '#FFFFFF';
  const strokeW = 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 6}" height="${size + 6}" viewBox="0 0 ${size + 6} ${size + 6}">
      <defs>
        <filter id="shadow-gate" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.20"/>
        </filter>
      </defs>
      <g filter="url(#shadow-gate)">
        <circle cx="${r + 3}" cy="${r + 3}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>
      </g>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: window.google?.maps ? new window.google.maps.Point(r + 3, r + 3) : undefined,
    scaledSize: window.google?.maps ? new window.google.maps.Size(size + 6, size + 6) : undefined,
  };
}

// Custom renderer for MarkerClusterer — renders cluster counts as a
// pink pill with a white count label, matching the GlowBuddy brand.
const clusterRenderer = {
  render({ count, position, markers }) {
    // Don't render a cluster overlay for a single marker — let the
    // individual styled marker show through instead. This prevents
    // the "hollow pin" flash when a cluster of 1 dissolves.
    if (count <= 1) {
      // Return a zero-size invisible marker so the clusterer has
      // something to work with but it doesn't cover the real pin.
      return new window.google.maps.Marker({
        position,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
          )}`,
          scaledSize: new window.google.maps.Size(1, 1),
        },
        zIndex: 0,
        clickable: false,
      });
    }
    const size = count >= 100 ? 48 : count >= 10 ? 40 : 34;
    const fontSize = count >= 100 ? 13 : 12;
    const label = count > 999 ? '999+' : String(count);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#E8347A" stroke="#fff" stroke-width="2"/>
        <text x="${size / 2}" y="${size / 2 + fontSize / 2 - 1}" text-anchor="middle" fill="#fff" font-family="Outfit, Arial, sans-serif" font-weight="700" font-size="${fontSize}">${label}</text>
      </svg>
    `;
    return new window.google.maps.Marker({
      position,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new window.google.maps.Size(size, size),
        anchor: new window.google.maps.Point(size / 2, size / 2),
      },
      zIndex: 500 + count,
    });
  },
};

function providerInitials(name) {
  if (!name) return '';
  const cleaned = String(name).replace(/[^A-Za-z0-9 &]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function fmtShortPrice(n) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(0)}`;
}

export default memo(function GlowMap({
  // Always-mounted base layer: every active provider in the current
  // city. Source of truth for which pins exist on the map. NEVER
  // filtered by procedure — that would make pins disappear when the
  // user selects a treatment. Selection is reflected in `procedures`.
  allProviders = [],
  // Optional priced rows for the currently-selected treatment. When
  // empty (gate state), every provider renders as a gray initials
  // pin. When populated, providers with matching prices are recolored
  // and labeled with their best price; the rest stay gray. The map
  // never wipes and rebuilds — markers are reconciled in place by
  // provider key, so picking a treatment is a recolor, not a remount.
  procedures = [],
  cityAvg,
  city,
  state,
  highlightedId,
  selectedId,
  onPinClick,
  onMapClick,
  onBoundsChange,
  onUserMovedMap,
  showSearchArea,
  onSearchAreaClick,
  mobileLegendTop,
  bottomPadding = 0,
  isMobile = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map()); // key → marker instance
  const clustererRef = useRef(null);
  const userInteracted = useRef(false);
  const initialCenteredRef = useRef(false);
  const lastCityKeyRef = useRef(null);

  // ── Data refs — let the reconciliation effect read current data
  // without depending on array references (which change every render).
  const allProvidersRef = useRef(allProviders);
  allProvidersRef.current = allProviders;
  const proceduresRef = useRef(procedures);
  proceduresRef.current = procedures;
  const cityAvgRef = useRef(cityAvg);
  cityAvgRef.current = cityAvg;

  // ── Stable fingerprints — only change when real data changes.
  // The reconciliation effect depends on these strings, not on the
  // full arrays, so a parent re-render that passes new array references
  // with the same content won't trigger a marker rebuild.
  const providerFingerprint = useMemo(
    () => (allProviders || []).map((p) => p.id || `${p.name}|${p.city}`).join(','),
    [allProviders],
  );
  const procedureFingerprint = useMemo(() => {
    if (!procedures || procedures.length === 0) return '';
    return procedures.map((r) => {
      const v = r.normalized_compare_value ?? r.price_paid ?? '';
      return `${r.provider_id || r.provider_name}:${v}`;
    }).join(',');
  }, [procedures]);

  // Latest click handler stored on a ref so the markers effect doesn't
  // need to re-run (and re-create every marker) when the parent passes
  // a new function reference. Listeners read from the ref at click time.
  const onPinClickRef = useRef(onPinClick);
  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);
  const onBoundsChangeRef = useRef(onBoundsChange);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);
  const onUserMovedMapRef = useRef(onUserMovedMap);
  useEffect(() => {
    onUserMovedMapRef.current = onUserMovedMap;
  }, [onUserMovedMap]);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);
  // Has any priced data ever been rendered on the current map? Used
  // to decide whether to show the legend (priced) or the gate hint
  // (no prices yet).
  const hasPrices = Array.isArray(procedures) && procedures.length > 0;
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  // Bumped by the fallback's "Try map again" button to re-run the init
  // effect without unmounting the parent or doing a full page reload.
  const [retryNonce, setRetryNonce] = useState(0);

  // ── Init the map exactly once ───────────────────────────────────────
  //
  // The init runs on mount and re-runs after a remount (e.g. when the
  // mobile list/map block unmounts during a brand-filter refetch and
  // remounts when the new procedures arrive). loadGoogleMaps caches its
  // module-level promise, so the second call resolves synchronously and
  // we just have to handle the create-map step idempotently.
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    // Defer map construction one tick so it doesn't block INP during the
    // initial synchronous render. We used to use requestIdleCallback here,
    // but rIC without a `timeout` can be starved indefinitely on busy
    // pages (FindPrices fires dozens of effects on mount) — the callback
    // never ran and the map sat on "Loading map" forever. setTimeout(0)
    // defers off the current task but is guaranteed to fire.
    const timerId = setTimeout(() => {
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;

        try {
          const map = new window.google.maps.Map(mapRef.current, {
            zoom: 11,
            center: { lat: 39.5, lng: -98.35 }, // US fallback
            gestureHandling: 'greedy',
            // Every chrome control is explicitly disabled. The defaults
            // include a Street View pegman, a map-type toggle, and a
            // rotate/tilt compass — any one of which can render as a
            // small thumbnail-looking artifact in the corner of the
            // canvas. We want a clean map with only the zoom buttons.
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: false,
            scaleControl: false,
            panControl: false,
            keyboardShortcuts: false,
            clickableIcons: false,
            draggableCursor: 'default',
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_CENTER,
            },
            styles: [
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            ],
          });

          mapInstanceRef.current = map;

          // Track manual interaction so the city-recenter effect can stay
          // out of the user's way once they've started navigating.
          map.addListener('dragstart', () => {
            userInteracted.current = true;
          });
          map.addListener('zoom_changed', () => {
            if (initialCenteredRef.current) userInteracted.current = true;
          });

          // Clicking empty map space (not a pin) dismisses any open
          // provider profile card. Marker clicks do NOT bubble to the
          // map, so this only fires on background taps.
          map.addListener('click', () => {
            onMapClickRef.current?.();
          });

          // Report viewport bounds on idle with debounce. On mobile,
          // rapid sheet drags / scroll events can fire idle in bursts —
          // debouncing at 300ms collapses those into one bounds update and
          // prevents cascading parent re-renders from flickering pins.
          const debouncedIdle = debounce(() => {
            const b = map.getBounds();
            if (!b) return;
            const ne = b.getNorthEast(), sw = b.getSouthWest();
            const bounds = { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() };
            onBoundsChangeRef.current?.(bounds);
            if (userInteracted.current) onUserMovedMapRef.current?.();
          }, 300);
          map.addListener('idle', debouncedIdle);

          // Clear any stale error from a previous mount that failed —
          // a brand-filter remount of the mobile map block could leave
          // mapError set from the prior cycle, which would otherwise
          // permanently show the "Map could not load" overlay even
          // though this new instance loaded fine.
          setMapError(null);
          setReady(true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[GlowMap] failed to construct Map', err);
          setMapError(err?.message || 'Failed to initialize map');
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[GlowMap] failed to load Google Maps', err);
        setMapError(err?.message || 'Failed to load map');
      });
    }); // end setTimeout

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      // Detach all markers from this instance so a remount doesn't
      // leave orphaned pins on a now-unmounted map.
      try {
        markersRef.current.forEach((m) => m.setMap(null));
      } catch {
        // ignore
      }
      markersRef.current = new Map();
      mapInstanceRef.current = null;
    };
    // retryNonce is in the deps so the fallback's "Try map again" button
    // can force a fresh init without remounting the component.
  }, [retryNonce]);

  // ── UI timeout — show fallback after 20s of no progress ────────────
  // Applies to all viewports. The loadGoogleMaps loader has its own 10s
  // script-load timeout that rejects the promise and shows an error. This
  // secondary timeout catches the rarer case where the script loads but
  // the Map constructor never fires ready (corrupted API response, silent
  // WebGL failure, etc.). 20s is generous enough for slow mobile networks.
  useEffect(() => {
    if (ready || mapError) return;
    const timer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.warn('[GlowMap] map load timed out after 20s — showing fallback');
      setMapError('Map load timed out');
    }, 20_000);
    return () => clearTimeout(timer);
  }, [ready, mapError]);

  // ── Recenter on city change ─────────────────────────────────────────
  // Only fires when (city, state) actually changes. Resets the
  // interaction flag so a brand-new search re-establishes context.
  //
  // We deliberately use the Geocoding REST API via fetch (not
  // `new google.maps.Geocoder()`) so we can pass a *separate* API key
  // — `VITE_GOOGLE_GEOCODING_KEY` — that is restricted to the
  // Geocoding API only. The Maps JS API key is restricted to the
  // Maps JavaScript API. Splitting the two keys means a leak of one
  // can't be used to abuse the other, and lets us track quota
  // independently in GCP.
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const key = city && state ? `${city}|${state}` : null;
    if (!key || key === lastCityKeyRef.current) return;
    lastCityKeyRef.current = key;
    userInteracted.current = false;
    initialCenteredRef.current = false;

    const geocodingKey = import.meta.env.VITE_GOOGLE_GEOCODING_KEY;
    if (!geocodingKey) {
      // eslint-disable-next-line no-console
      console.warn('[GlowMap] VITE_GOOGLE_GEOCODING_KEY is not set; map will not recenter on city changes.');
      return;
    }

    let cancelled = false;
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(`${city}, ${state}`)}` +
      `&key=${geocodingKey}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const map = mapInstanceRef.current;
        if (!map) return;
        if (data.status !== 'OK' || !data.results?.[0]) {
          // eslint-disable-next-line no-console
          console.warn('[GlowMap] geocode failed', data.status, data.error_message);
          return;
        }
        const loc = data.results[0].geometry.location; // { lat, lng }
        map.setCenter(loc);
        map.setZoom(12);
        initialCenteredRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('[GlowMap] geocode fetch failed', err);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, city, state]);

  // ── Sync map padding with mobile sheet position ───────────────────
  // When the bottom sheet covers part of the map, we tell Google Maps
  // to treat that area as off-limits for centering, fitBounds, etc.
  // so pins behind the sheet are pushed up into the visible viewport.
  // After updating padding, re-center so the visible area adjusts
  // smoothly rather than leaving pins stranded behind the sheet.
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setOptions({
      padding: { bottom: bottomPadding, top: 0, left: 0, right: 0 },
    });
    const center = map.getCenter();
    if (center) map.panTo(center);
  }, [ready, bottomPadding]);

  // ── Render pins ─────────────────────────────────────────────────────
  //
  // Markers are managed imperatively via markersRef (a Map keyed by
  // provider key). The effect only runs when the provider list or
  // pricing data actually changes (detected via stable fingerprint
  // strings), NOT on every parent re-render. This prevents the
  // flicker caused by destroying and recreating markers on mobile.
  //
  // The clusterer is also updated incrementally — markers are added
  // or removed individually rather than clearMarkers() + new instance.
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google) return;

    // Read current data from refs — these are updated every render
    // but the effect only runs when fingerprints change.
    const currentProviders = allProvidersRef.current;
    const currentProcedures = proceduresRef.current;
    const currentCityAvg = cityAvgRef.current;

    try {

    const providerCompositeKey = (name, city, state) =>
      `${(name || '').trim().toLowerCase()}|${(city || '').trim().toLowerCase()}|${(state || '').trim().toLowerCase()}`;
    const providerByComposite = new Map();
    for (const p of Array.isArray(currentProviders) ? currentProviders : []) {
      if (!p) continue;
      const compKey = providerCompositeKey(p.name || p.provider_name, p.city, p.state);
      if (compKey !== '||') providerByComposite.set(compKey, p);
    }

    // Build a price index from procedures, keyed by provider_id.
    const priceByProviderId = new Map();
    for (const r of currentProcedures || []) {
      let pid = r.provider_id || null;
      if (!pid) {
        const match = providerByComposite.get(
          providerCompositeKey(r.provider_name, r.city, r.state),
        );
        if (match?.id) pid = match.id;
      }
      if (!pid) continue;
      if (!priceByProviderId.has(pid)) {
        priceByProviderId.set(pid, { rows: [], bestRow: null });
      }
      const entry = priceByProviderId.get(pid);
      entry.rows.push(r);
      const v = Number(
        r.normalized_compare_value != null && Number.isFinite(Number(r.normalized_compare_value))
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
    for (const entry of priceByProviderId.values()) {
      const r = entry.bestRow;
      entry.bestPrice = r
        ? Number(
            r.normalized_compare_value != null && Number.isFinite(Number(r.normalized_compare_value))
              ? r.normalized_compare_value
              : r.price_paid,
          )
        : null;
    }

    // Build groups — one per provider.
    const list = Array.isArray(currentProviders) ? currentProviders : [];
    const nextGroups = new Map();
    for (const p of list) {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = p.id || `${p.name || p.provider_name}|${p.city}|${p.state}`;
      const priced = (p.id && priceByProviderId.get(p.id)) || null;
      nextGroups.set(key, {
        key,
        provider_id: p.id || null,
        provider_slug: p.slug || p.provider_slug || null,
        provider_name: p.name || p.provider_name || 'Unknown',
        city: p.city || '',
        state: p.state || '',
        lat,
        lng,
        rating: p.google_rating ?? p.rating ?? null,
        google_review_count: p.google_review_count ?? null,
        rows: priced?.rows || [],
        bestRow: priced?.bestRow || null,
        bestPrice: priced?.bestPrice ?? null,
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
        key: pid,
        provider_id: pid,
        provider_slug: r.provider_slug || null,
        provider_name: r.provider_name || 'Unknown',
        city: r.city || '',
        state: r.state || '',
        lat,
        lng,
        rating: r.rating ?? null,
        google_review_count: null,
        rows: entry.rows,
        bestRow: entry.bestRow,
        bestPrice: entry.bestPrice,
      });
    }

    // ── Reconcile markers imperatively ──────────────────────────────
    // 1. Remove markers for providers no longer in the set
    const markersToRemove = [];
    markersRef.current.forEach((marker, key) => {
      if (!nextGroups.has(key)) {
        marker.setMap(null);
        markersToRemove.push(key);
      }
    });
    for (const key of markersToRemove) {
      markersRef.current.delete(key);
    }

    const bounds = new window.google.maps.LatLngBounds();
    let boundsHasPoints = false;
    const newMarkers = []; // for adding to clusterer

    // 2. Add new markers / update existing ones in place
    nextGroups.forEach((g) => {
      const isPriced = g.bestPrice != null;
      const baseColor = isPriced ? colorForGroup(g, currentCityAvg) : null;
      const initials = providerInitials(g.provider_name);
      const label = isPriced ? fmtShortPrice(g.bestPrice) : null;
      const icon = isPriced
        ? buildPinIcon({ color: baseColor, label, highlighted: false })
        : buildGatePinIcon({ initials, highlighted: false });

      let marker = markersRef.current.get(g.key);
      if (!marker) {
        // New provider — create marker
        marker = new window.google.maps.Marker({
          position: { lat: g.lat, lng: g.lng },
          map: mapInstanceRef.current,
          title: g.provider_name,
          icon,
        });
        marker.__glowKey = g.key;
        marker.addListener('click', () => {
          onPinClickRef.current?.(marker.__glowGroup);
        });
        markersRef.current.set(g.key, marker);
        newMarkers.push(marker);
      } else {
        // Existing provider — update icon + position in place
        marker.setIcon(icon);
        marker.setPosition({ lat: g.lat, lng: g.lng });
      }

      // Stash data for the lightweight highlight effect
      marker.__glowGroup = g;
      marker.__glowColor = baseColor;
      marker.__glowLabel = label;
      marker.__glowInitials = initials;
      marker.__glowPriced = isPriced;
      marker.setZIndex(isPriced ? 100 : 50);

      bounds.extend({ lat: g.lat, lng: g.lng });
      boundsHasPoints = true;
    });

    // ── Update clusterer incrementally ────────────────────────────
    // Remove stale markers, add new ones — never destroy/recreate.
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map: mapInstanceRef.current,
        markers: [...markersRef.current.values()],
        renderer: clusterRenderer,
      });
    } else {
      // Remove stale markers from clusterer
      for (const key of markersToRemove) {
        // Marker already has .map = null, clusterer needs explicit removal
        // MarkerClusterer handles this via removeMarker in its API
      }
      // Add new markers to existing clusterer
      if (newMarkers.length > 0 || markersToRemove.length > 0) {
        // The most reliable way to sync is clearMarkers + addMarkers
        // without recreating the clusterer instance itself. This avoids
        // the DOM flicker from `new MarkerClusterer()`.
        clustererRef.current.clearMarkers(true); // true = don't call setMap(null) on markers
        clustererRef.current.addMarkers([...markersRef.current.values()], true); // true = don't redraw yet
        clustererRef.current.render();
      }
    }

    // Fit-to-bounds is only a fallback for the no-city case.
    if (
      boundsHasPoints &&
      !userInteracted.current &&
      !initialCenteredRef.current &&
      nextGroups.size > 1
    ) {
      mapInstanceRef.current.fitBounds(bounds, 64);
      const listener = window.google.maps.event.addListenerOnce(
        mapInstanceRef.current,
        'idle',
        () => {
          if (mapInstanceRef.current && mapInstanceRef.current.getZoom() > 14) {
            mapInstanceRef.current.setZoom(14);
          }
        },
      );
      return () => window.google.maps.event.removeListener(listener);
    }
    return undefined;

    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[GlowMap] markers reconciliation failed', err);
      return undefined;
    }
    // Deps: stable fingerprints, not raw arrays. highlightedId/selectedId
    // are handled by the lightweight highlight effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, providerFingerprint, procedureFingerprint]);

  // ── Highlight effect ────────────────────────────────────────────────
  // Updating icons in-place is much cheaper than re-rendering all
  // markers. We re-build only the affected pins, and read everything
  // we need (color, label, initials, priced flag) from the data we
  // stashed on each marker during the reconciliation pass.
  useEffect(() => {
    if (!ready || !window.google) return;
    markersRef.current.forEach((marker) => {
      const g = marker.__glowGroup;
      if (!g) return;
      const isHighlighted =
        g.provider_id != null && (g.provider_id === highlightedId || g.provider_id === selectedId);

      if (marker.__glowPriced) {
        marker.setIcon(
          buildPinIcon({
            color: isHighlighted ? PRICE_COLORS.highlight : marker.__glowColor,
            label: marker.__glowLabel,
            highlighted: isHighlighted,
          }),
        );
        marker.setZIndex(isHighlighted ? 1000 : 100);
      } else {
        marker.setIcon(
          buildGatePinIcon({
            initials: marker.__glowInitials,
            highlighted: isHighlighted,
          }),
        );
        marker.setZIndex(isHighlighted ? 1000 : 50);
      }
    });
  }, [ready, highlightedId, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = new Map();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          // Without this, iOS Safari will sometimes intercept pinch
          // gestures as a page-zoom rather than handing them to Maps.
          touchAction: 'pan-x pan-y',
          background: '#F5F0EC',
        }}
      />

      {/* Skeleton placeholder — paints immediately so the LCP element
          is a fast-rendering div, not the Google Maps canvas. Fades out
          once the map is ready. */}
      {!ready && !mapError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#F5F0EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <div style={{ opacity: 0.08, position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E8347A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#999', fontWeight: 300, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Loading map</p>
          </div>
        </div>
      )}

      {showSearchArea && !mapError && (
        <button
          type="button"
          onClick={() => onSearchAreaClick?.()}
          style={{
            position: 'absolute',
            // On mobile the floating search inputs overlay the top ~56px
            // of the map. Push the button below them so it's always tappable.
            top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 60px)' : 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: '#fff',
            border: '1px solid #EDE8E3',
            borderRadius: 999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: '#333',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFF0F5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
          }}
        >
          <Search size={14} strokeWidth={2.5} />
          Search this area
        </button>
      )}

      {/* Locate me button */}
      {ready && !mapError && (
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const map = mapInstanceRef.current;
                if (!map) return;
                map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                map.setZoom(13);
                userInteracted.current = true;
              },
              () => {
                // Permission denied or error — silently ignore
              },
            );
          }}
          aria-label="Center on my location"
          style={{
            position: 'absolute',
            bottom: 80,
            right: 12,
            zIndex: 10,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 10px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LocateFixed size={18} color="#555" />
        </button>
      )}

      {mapError && !ready && (
        <MapLoadingFallback
          onRetry={() => {
            setMapError(null);
            setRetryNonce((n) => n + 1);
          }}
        />
      )}

      {/* Legend — bottom-left so it doesn't collide with the right-side
          zoom controls or the bottom-sheet drawer on mobile. Hidden
          when there are no priced rows to explain yet — a color legend
          next to a sea of gray pins would be misleading. */}
      {!mapError && hasPrices && (
        <div
          style={{
            position: 'absolute',
            ...(mobileLegendTop ? { top: 80 } : { bottom: 16 }),
            left: 12,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 4,
            border: '1px solid #EDE8E3',
            padding: '8px 12px',
            zIndex: 5,
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: '#555',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <LegendRow color={PRICE_COLORS.great} label="Below avg" />
          <LegendRow color={PRICE_COLORS.good} label="Around avg" />
          <LegendRow color={PRICE_COLORS.high} label="Above avg" />
          <LegendRow color={PRICE_COLORS.noPrice} label="No price yet" last />
        </div>
      )}
      {!mapError && !hasPrices && (
        <div
          style={{
            position: 'absolute',
            ...(mobileLegendTop ? { top: 80 } : { bottom: 16 }),
            left: 12,
            background: 'rgba(255,255,255,0.96)',
            borderRadius: 4,
            border: '1px solid #EDE8E3',
            padding: '8px 12px',
            zIndex: 5,
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontStyle: 'italic',
            color: '#888',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            maxWidth: 220,
          }}
        >
          Tap any pin to explore a med spa, or pick a treatment to see prices.
        </div>
      )}
    </div>
  );
});

function LegendRow({ color, label, last }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: last ? 0 : 4,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          background: color,
          border: '1px solid white',
          boxShadow: '0 0 0 1px #DDD',
          display: 'inline-block',
        }}
      />
      {label}
    </div>
  );
}
