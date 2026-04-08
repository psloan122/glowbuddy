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
import { loadGoogleMaps } from '../../lib/loadGoogleMaps';

const PRICE_COLORS = {
  great: '#1D9E75',     // > 20% below avg — green
  good: '#E8347A',      // at or near avg — hot pink
  high: '#C8001A',      // > 20% above avg — red
  noPrice: '#B8A89A',   // no price yet — gray
  highlight: '#111111', // black, when hovered/selected
};

// Group merged feed rows by provider_id (or provider_name+city as a
// fallback when provider_id is missing — patient submissions sometimes
// don't have one). Returns an array sorted by best-quality first so we
// can take the top N pins without losing the most useful providers.
function groupByProvider(rows, cityAvg) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const map = new Map();
  for (const r of rows) {
    if (r.provider_lat == null || r.provider_lng == null) continue;
    const key = r.provider_id || `${r.provider_name}|${r.city}|${r.state}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        provider_id: r.provider_id || null,
        provider_slug: r.provider_slug || null,
        provider_name: r.provider_name || 'Unknown',
        city: r.city || '',
        state: r.state || '',
        lat: Number(r.provider_lat),
        lng: Number(r.provider_lng),
        rating: r.rating || null,
        rows: [],
        bestRow: null,
      });
    }
    const entry = map.get(key);
    entry.rows.push(r);
    // Track the row whose normalized comparable value (or raw price) is
    // lowest — that becomes the headline price on the pin.
    const v = Number(
      r.normalized_compare_value != null && Number.isFinite(Number(r.normalized_compare_value))
        ? r.normalized_compare_value
        : r.price_paid,
    );
    if (Number.isFinite(v) && v > 0) {
      const best = entry.bestRow;
      const bestV = best
        ? Number(
            best.normalized_compare_value != null && Number.isFinite(Number(best.normalized_compare_value))
              ? best.normalized_compare_value
              : best.price_paid,
          )
        : Infinity;
      if (v < bestV) entry.bestRow = r;
    }
  }

  const groups = [...map.values()].map((g) => {
    const v = g.bestRow
      ? Number(
          g.bestRow.normalized_compare_value != null && Number.isFinite(Number(g.bestRow.normalized_compare_value))
            ? g.bestRow.normalized_compare_value
            : g.bestRow.price_paid,
        )
      : null;
    return { ...g, bestPrice: Number.isFinite(v) ? v : null };
  });

  // Sort: pins with prices first, then by how good the deal is vs avg
  // (lowest first), then by rating. Ties at the end fall back to name.
  groups.sort((a, b) => {
    const ah = a.bestPrice != null ? 1 : 0;
    const bh = b.bestPrice != null ? 1 : 0;
    if (ah !== bh) return bh - ah;
    if (a.bestPrice != null && b.bestPrice != null) {
      return a.bestPrice - b.bestPrice;
    }
    return (b.rating || 0) - (a.rating || 0);
  });

  return groups;
}

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

function fmtShortPrice(n) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(0)}`;
}

export default function GlowMap({
  procedures,
  cityAvg,
  city,
  state,
  highlightedId,
  selectedId,
  onPinClick,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userInteracted = useRef(false);
  const initialCenteredRef = useRef(false);
  const lastCityKeyRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // ── Init the map exactly once ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 11,
          center: { lat: 39.5, lng: -98.35 }, // US fallback
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
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

        setReady(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[GlowMap] failed to load Google Maps', err);
        setMapError(err?.message || 'Failed to load map');
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
  // Re-runs whenever the merged feed changes. We capped at 40 markers
  // (Airbnb research) and pre-sorted by quality so the most useful
  // providers always make the cut.
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google) return;

    // Wipe existing markers cleanly. Setting map to null detaches them
    // from the canvas; dropping the array lets the GC reclaim them.
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!procedures || procedures.length === 0) return;

    const groups = groupByProvider(procedures, cityAvg).slice(0, 40);

    // If we have at least 2 pins and the user hasn't taken over the
    // viewport yet, fit the bounds to all rendered pins on the FIRST
    // render after a city change. After that, we leave the viewport
    // alone — the recenter effect handles new cities.
    const bounds = new window.google.maps.LatLngBounds();
    let boundsHasPoints = false;

    groups.forEach((g) => {
      const color = colorForGroup(g, cityAvg);
      const label = g.bestPrice != null ? fmtShortPrice(g.bestPrice) : '—';
      const isHighlighted = g.provider_id != null && (g.provider_id === highlightedId || g.provider_id === selectedId);

      const marker = new window.google.maps.Marker({
        position: { lat: g.lat, lng: g.lng },
        map: mapInstanceRef.current,
        title: g.provider_name,
        icon: buildPinIcon({ color, label, highlighted: isHighlighted }),
        zIndex: isHighlighted ? 1000 : g.bestPrice != null ? 100 : 50,
      });

      // Stash the group on the marker so the highlight effect can read
      // it back without re-running groupByProvider.
      marker.__glowGroup = g;
      marker.__glowColor = color;
      marker.__glowLabel = label;

      marker.addListener('click', () => {
        onPinClick?.(g);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: g.lat, lng: g.lng });
      boundsHasPoints = true;
    });

    // Fit-to-bounds is only a fallback for the no-city case. When the
    // user has filtered to a specific city, the geocoder has already
    // centered the map on that city — and we want that center to WIN,
    // not get overridden by a fitBounds that pulls the viewport off
    // toward whichever pins happen to be in the result set (e.g.
    // "Botox in Mandeville" would otherwise yank the map down to
    // Metairie because the only $12 pin is there).
    //
    // Rule: only fitBounds when the geocoder has NOT centered yet.
    // - City filter set → geocoder ran → initialCenteredRef.current === true
    //   → SKIP fitBounds, geocode center wins.
    // - No city filter → geocoder didn't run → initialCenteredRef.current === false
    //   → fitBounds runs as a one-time fallback so the user lands on
    //     their data instead of staring at the whole continental US.
    if (
      boundsHasPoints &&
      !userInteracted.current &&
      !initialCenteredRef.current &&
      groups.length > 1
    ) {
      mapInstanceRef.current.fitBounds(bounds, 64);
      // Cap zoom so we don't fly into a single-pin closeup.
      const listener = window.google.maps.event.addListenerOnce(
        mapInstanceRef.current,
        'idle',
        () => {
          if (mapInstanceRef.current && mapInstanceRef.current.getZoom() > 14) {
            mapInstanceRef.current.setZoom(14);
          }
        },
      );
      // Auto-cleanup if the component unmounts before idle fires.
      return () => window.google.maps.event.removeListener(listener);
    }
  }, [ready, procedures, cityAvg, onPinClick]); // highlight handled separately

  // ── Highlight effect ────────────────────────────────────────────────
  // Updating icons in-place is much cheaper than re-rendering all
  // markers. We re-build only the affected pins.
  useEffect(() => {
    if (!ready || !window.google) return;
    markersRef.current.forEach((marker) => {
      const g = marker.__glowGroup;
      if (!g) return;
      const isHighlighted =
        g.provider_id != null && (g.provider_id === highlightedId || g.provider_id === selectedId);
      marker.setIcon(
        buildPinIcon({
          color: isHighlighted ? PRICE_COLORS.highlight : marker.__glowColor,
          label: marker.__glowLabel,
          highlighted: isHighlighted,
        }),
      );
      marker.setZIndex(
        isHighlighted ? 1000 : marker.__glowGroup.bestPrice != null ? 100 : 50,
      );
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

      {mapError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FBF9F7',
            color: '#888',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            padding: 24,
            textAlign: 'center',
          }}
        >
          Map could not load. The list view is still available.
        </div>
      )}

      {/* Legend — bottom-left so it doesn't collide with the right-side
          zoom controls or the bottom-sheet drawer on mobile. */}
      {!mapError && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
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
