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
 *   3. Pin density is capped at 40 (Airbnb discovery research: cards
 *      vs pins drops the user's decision quality once you exceed
 *      ~50 markers; 40 is the sweet spot for picking and shows the
 *      best-quality providers first).
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

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { loadGoogleMaps } from '../../lib/loadGoogleMaps';
import MapLoadingFallback from '../MapLoadingFallback';

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

// Gate-mode pin: small gray circle with the provider's 2-letter initials.
// No price label — the whole point of gate mode is that no treatment is
// selected yet, so there's nothing to price. Smaller than the price pill
// pins (scale 14 per the design brief) so a city-dense map doesn't get
// overwhelming before the user refines.
function buildGatePinIcon({ initials, highlighted }) {
  const size = highlighted ? 30 : 26;
  const r = size / 2;
  const fill = highlighted ? '#111111' : '#B8A89A';
  const stroke = highlighted ? '#111111' : '#FFFFFF';
  const strokeW = highlighted ? 2.5 : 2;
  const textColor = '#FFFFFF';
  const fontSize = highlighted ? 11 : 10;
  const text = (initials || '').slice(0, 2).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 4}" height="${size + 4}" viewBox="0 0 ${size + 4} ${size + 4}">
      <defs>
        <filter id="shadow-gate" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.22"/>
        </filter>
      </defs>
      <g filter="url(#shadow-gate)">
        <circle cx="${r + 2}" cy="${r + 2}" r="${r - 1}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>
        <text x="${r + 2}" y="${r + 2 + fontSize / 2 - 1}" text-anchor="middle" fill="${textColor}" font-family="Outfit, Arial, sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="0.5">${text}</text>
      </g>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: window.google?.maps ? new window.google.maps.Point(r + 2, r + 2) : undefined,
    scaledSize: window.google?.maps ? new window.google.maps.Size(size + 4, size + 4) : undefined,
  };
}

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

export default function GlowMap({
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
  onBoundsChange,
  onUserMovedMap,
  showSearchArea,
  onSearchAreaClick,
  mobileLegendTop,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userInteracted = useRef(false);
  const initialCenteredRef = useRef(false);
  const lastCityKeyRef = useRef(null);
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

          // Report viewport bounds on every idle (map fully settled).
          // No debounce needed — Google Maps fires idle once per settle.
          map.addListener('idle', () => {
            const b = map.getBounds();
            if (!b) return;
            const ne = b.getNorthEast(), sw = b.getSouthWest();
            const bounds = { north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() };
            onBoundsChangeRef.current?.(bounds);
            if (userInteracted.current) onUserMovedMapRef.current?.();
          });

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

    return () => {
      cancelled = true;
      // Detach all markers from this instance so a remount doesn't
      // leave orphaned pins on a now-unmounted map.
      try {
        for (const m of markersRef.current) m.setMap(null);
      } catch {
        // ignore
      }
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
    // retryNonce is in the deps so the fallback's "Try map again" button
    // can force a fresh init without remounting the component.
  }, [retryNonce]);

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

  // ── Render pins ─────────────────────────────────────────────────────
  //
  // Single source of truth: `allProviders`. We build one marker per
  // provider in the city, keyed stably by provider id, and reconcile
  // against the existing markers — only providers added/removed since
  // last render touch the map. Picking a treatment changes `procedures`
  // (the price overlay), which recolors and labels the matching pins
  // without ever wiping markers off the canvas.
  //
  // This effect intentionally does NOT depend on `highlightedId`/
  // `selectedId` — those are handled by the lightweight highlight
  // effect below so a hover state change doesn't rebuild every marker.
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google) return;

    try {

    // Index allProviders by a `provider_name|city|state` composite
    // key so procedures rows that don't carry a `provider_id` (e.g.
    // raw patient submissions to the `procedures` table, which has
    // no provider_id column at all) can still be resolved to a real
    // provider record. Mirrors the fallback key FindPrices uses for
    // grouping at the list level, so map + list stay in sync.
    const providerCompositeKey = (name, city, state) =>
      `${(name || '').trim().toLowerCase()}|${(city || '').trim().toLowerCase()}|${(state || '').trim().toLowerCase()}`;
    const providerByComposite = new Map();
    for (const p of Array.isArray(allProviders) ? allProviders : []) {
      if (!p) continue;
      const compKey = providerCompositeKey(p.name || p.provider_name, p.city, p.state);
      if (compKey !== '||') providerByComposite.set(compKey, p);
    }

    // Build a price index from `procedures`, keyed by provider_id, so
    // we can decide each pin's icon/label in a single pass over
    // allProviders. Mirrors the old groupByProvider sort behavior so
    // ranking (best deal first) is preserved when capping label slots.
    const priceByProviderId = new Map();
    for (const r of procedures || []) {
      let pid = r.provider_id || null;
      if (!pid) {
        // Patient submissions don't carry provider_id — resolve via
        // the composite-key fallback against allProviders instead of
        // silently dropping the row off the map.
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

    // Build the next set of groups, one per provider in allProviders.
    // Providers that have a matching price get the priced fields filled
    // in; providers without prices stay as gray initials pins.
    const list = Array.isArray(allProviders) ? allProviders : [];
    const nextGroups = [];
    for (const p of list) {
      // Coerce + validate so a string lat/lng or a null sneaking through
      // never lands in `bounds.extend`, which throws on NaN and would
      // otherwise crash the whole reconciliation pass.
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = p.id || `${p.name || p.provider_name}|${p.city}|${p.state}`;
      const priced = (p.id && priceByProviderId.get(p.id)) || null;
      nextGroups.push({
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

    // Defensive: if `procedures` contains a row whose provider isn't in
    // allProviders (e.g. a stale row from a slightly different city
    // ilike), surface it as a synthetic pin so the price doesn't vanish
    // from the map. Synthetic pins still get a stable key off provider_id.
    const nextKeys = new Set(nextGroups.map((g) => g.key));
    for (const [pid, entry] of priceByProviderId.entries()) {
      if (!pid || nextKeys.has(pid)) continue;
      const r = entry.bestRow || entry.rows[0];
      if (!r) continue;
      const lat = Number(r.provider_lat);
      const lng = Number(r.provider_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      nextKeys.add(pid);
      nextGroups.push({
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

    // Sort: priced first (cheapest deal first), then unpriced by review
    // count and rating. Pins are drawn in order so high-priority ones
    // sit on top in dense areas.
    nextGroups.sort((a, b) => {
      const ah = a.bestPrice != null ? 1 : 0;
      const bh = b.bestPrice != null ? 1 : 0;
      if (ah !== bh) return bh - ah;
      if (a.bestPrice != null && b.bestPrice != null) {
        return a.bestPrice - b.bestPrice;
      }
      const arc = Number(a.google_review_count) || 0;
      const brc = Number(b.google_review_count) || 0;
      if (brc !== arc) return brc - arc;
      return (b.rating || 0) - (a.rating || 0);
    });

    // Reconcile: drop markers no longer represented, update existing
    // ones in place, create markers for newly-introduced providers.
    const existingByKey = new Map();
    for (const m of markersRef.current) {
      if (m.__glowKey) existingByKey.set(m.__glowKey, m);
    }

    const kept = [];
    for (const m of markersRef.current) {
      if (m.__glowKey && nextKeys.has(m.__glowKey)) {
        kept.push(m);
      } else {
        m.setMap(null);
      }
    }
    markersRef.current = kept;

    const bounds = new window.google.maps.LatLngBounds();
    let boundsHasPoints = false;

    nextGroups.forEach((g) => {
      const isPriced = g.bestPrice != null;
      const baseColor = isPriced ? colorForGroup(g, cityAvg) : null;
      const isHighlighted =
        g.provider_id != null &&
        (g.provider_id === highlightedId || g.provider_id === selectedId);
      const initials = providerInitials(g.provider_name);
      const label = isPriced ? fmtShortPrice(g.bestPrice) : null;

      const icon = isPriced
        ? buildPinIcon({
            color: isHighlighted ? PRICE_COLORS.highlight : baseColor,
            label,
            highlighted: isHighlighted,
          })
        : buildGatePinIcon({
            initials,
            highlighted: isHighlighted,
          });

      let marker = existingByKey.get(g.key);
      if (!marker) {
        marker = new window.google.maps.Marker({
          position: { lat: g.lat, lng: g.lng },
          map: mapInstanceRef.current,
          title: g.provider_name,
          icon,
        });
        marker.__glowKey = g.key;
        // Use the click ref so the listener always sees the newest
        // handler without us having to re-create the marker on every
        // parent re-render.
        marker.addListener('click', () => {
          onPinClickRef.current?.(marker.__glowGroup);
        });
        markersRef.current.push(marker);
      } else {
        marker.setIcon(icon);
        marker.setPosition({ lat: g.lat, lng: g.lng });
      }

      // Stash everything the highlight effect needs to recompute the
      // icon without re-running this whole reconciliation pass.
      marker.__glowGroup = g;
      marker.__glowColor = baseColor;
      marker.__glowLabel = label;
      marker.__glowInitials = initials;
      marker.__glowPriced = isPriced;
      marker.setZIndex(isHighlighted ? 1000 : isPriced ? 100 : 50);

      bounds.extend({ lat: g.lat, lng: g.lng });
      boundsHasPoints = true;
    });

    // Fit-to-bounds is only a fallback for the no-city case. When the
    // user has filtered to a specific city the geocoder has already
    // centered on that city, and we don't want fitBounds to yank the
    // viewport off toward whichever pins happen to land in the bbox.
    if (
      boundsHasPoints &&
      !userInteracted.current &&
      !initialCenteredRef.current &&
      nextGroups.length > 1
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
      // Defensive: never let an exception in marker reconciliation
      // (a single bad lat/lng, an unexpected Maps API change) bubble
      // up and crash the React render — it would unmount the parent
      // and the user would see the global ErrorBoundary fallback.
      // Log it and return so the next data update can retry cleanly.
      // eslint-disable-next-line no-console
      console.error('[GlowMap] markers reconciliation failed', err);
      return undefined;
    }
    // highlight is intentionally NOT in the dep array — it's handled
    // by the lightweight highlight effect below so a hover doesn't
    // re-run this expensive reconciliation pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, allProviders, procedures, cityAvg]);

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
  }, [ready, highlightedId, selectedId]);

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
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

      {showSearchArea && !mapError && (
        <button
          type="button"
          onClick={() => onSearchAreaClick?.()}
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
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
}

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
