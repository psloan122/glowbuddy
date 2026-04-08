import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, InfoWindowF } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import MapInfoCard from './MapInfoCard';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';

const MAP_STYLES = {
  width: '100%',
  height: '100%',
};

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

const DEFAULT_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: !IS_MOBILE,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  rotateControl: false,
  gestureHandling: IS_MOBILE ? 'greedy' : 'cooperative',
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

// ── Canvas-based price pill icon ──
// Editorial style: white pill, hot-pink border, 2px corners, Playfair text.
// Variant colors override border + text color when the provider is below
// or above the city average.
const pillCache = new Map();

const PINK = '#E8347A';
const BELOW = '#1A7A3A';
const ABOVE = '#C8001A';
const INK = '#111111';

function createPricePillIcon(label, variant = 'default') {
  const cacheKey = `${variant}|${label}`;
  if (pillCache.has(cacheKey)) return pillCache.get(cacheKey);

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const scale = Math.min(2, dpr);

  const borderColor =
    variant === 'below' ? BELOW : variant === 'above' ? ABOVE : PINK;
  const textColor =
    variant === 'below' ? BELOW : variant === 'above' ? ABOVE : INK;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '700 12px "Playfair Display", Georgia, serif';
  const textWidth = ctx.measureText(label).width;
  const padding = 20;
  const width = Math.max(42, Math.ceil(textWidth) + padding);
  const height = 24;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // White pill background with hot-pink border, sharp 2px corners
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, height - 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  // Ink price text — Playfair 700
  ctx.fillStyle = textColor;
  ctx.font = '700 12px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2 + 0.5);

  const result = { url: canvas.toDataURL(), width, height };
  pillCache.set(cacheKey, result);
  return result;
}

// ── Canvas-based cluster icon ──
// Editorial: solid hot-pink circle, white Outfit numerals, no shadow.
const clusterCache = new Map();

function createClusterIcon(count, size) {
  const key = `${count}-${size}`;
  if (clusterCache.has(key)) return clusterCache.get(key);

  const canvas = document.createElement('canvas');
  const scale = 2; // retina
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Solid hot-pink circle, no shadow
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = PINK;
  ctx.fill();

  // White count text — Outfit 600
  const fontSize = size < 44 ? 13 : 15;
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px "Outfit", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(count), size / 2, size / 2 + 0.5);

  const result = { url: canvas.toDataURL(), width: size, height: size };
  clusterCache.set(key, result);
  return result;
}

// ── Format price label for pin ──
// Only labels providers that have a qualifying per-unit-equivalent price
// (< $500). Providers without such a price get a gray dot — never a misleading
// package-price label. Migration 053 removed all estimated/ambiguous prices
// so every surviving value is a direct per-unit / per-syringe / per-session /
// per-month number.
function formatPinLabel(provider, procedureFilter) {
  const avg = Number(provider.per_unit_avg) || 0;
  if (!provider.has_per_unit_price || avg <= 0 || avg >= 500) return null;

  // If filtered to a per-unit procedure (Botox, Dysport, etc.)
  if (procedureFilter) {
    const lf = procedureFilter.toLowerCase();
    if (
      lf.includes('botox') ||
      lf.includes('dysport') ||
      lf.includes('xeomin') ||
      lf.includes('jeuveau')
    ) {
      return `$${avg}/u`;
    }
    if (lf.includes('glp') || lf.includes('semaglutide') || lf.includes('tirzepatide')) {
      return `$${avg}/mo`;
    }
  }

  // Default per-unit formatting (always < $500)
  if (avg < 100) return `$${avg}/u`;
  return `$${avg}`;
}

export default function ProviderMap({
  providers,
  center,
  zoom,
  selectedProvider,
  onSelectProvider,
  onBoundsChanged,
  procedureFilter,
  hasPricesOnly = false,
}) {
  const [mapsReady, setMapsReady] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const markersRef = useRef([]);
  const emptyMarkersRef = useRef([]);
  const clustererRef = useRef(null);
  const hoverInfoRef = useRef(null);
  // Tracks staggered setMap timeouts so we can cancel mid-flight on unmount
  // or when providers change before the stagger has fully played out.
  const animTimeoutsRef = useRef([]);
  // Flipped true the first time the user pans, pinches, or zooms the map.
  // Once set, we stop auto-re-centering on parent re-renders so the user's
  // gesture isn't fought by a setCenter/setZoom call. Reset externally
  // when `center` prop changes (e.g. user searched a new city) — see the
  // pan/zoom effect below.
  const userInteractedRef = useRef(false);

  // Wait for Google Maps to load
  useEffect(() => {
    if (window.google?.maps?.Map) {
      setMapsReady(true);
      return;
    }
    // Trigger load if not already loaded
    loadGoogleMaps().catch(() => {});
    const interval = setInterval(() => {
      if (window.google?.maps?.Map) {
        setMapsReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleLoad = useCallback((map) => {
    setMapRef(map);
    // Track manual interaction so we don't re-center on top of the user's
    // gesture. `dragstart` catches pans, `zoom_changed` catches pinches
    // and the +/- buttons. Both fire synchronously from user input.
    map.addListener('dragstart', () => {
      userInteractedRef.current = true;
    });
    map.addListener('zoom_changed', () => {
      userInteractedRef.current = true;
    });
  }, []);

  // Pan/zoom the map when center or zoom props change. A prop change means
  // the parent asked for a new view (user searched a new city, clicked
  // "locate me", etc.) so we intentionally reset the interaction flag and
  // apply the new center/zoom. Re-renders that leave lat/lng/zoom
  // unchanged are short-circuited so we don't fight the user's gestures.
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);
  useEffect(() => {
    if (!mapRef) return;
    const centerChanged =
      prevCenter.current.lat !== center.lat || prevCenter.current.lng !== center.lng;
    const zoomChanged = prevZoom.current !== zoom;
    if (!centerChanged && !zoomChanged) return;

    // Fresh intent from the parent — re-arm the re-center logic.
    userInteractedRef.current = false;

    if (centerChanged) {
      mapRef.panTo(center);
      prevCenter.current = center;
    }
    if (zoomChanged) {
      mapRef.setZoom(zoom);
      prevZoom.current = zoom;
    }
  }, [center, zoom, mapRef]);

  const handleIdle = useCallback(() => {
    if (!mapRef || !onBoundsChanged) return;
    const bounds = mapRef.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    onBoundsChanged({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    });
  }, [mapRef, onBoundsChanged]);

  // ── Create/update markers ──
  const onSelectRef = useRef(onSelectProvider);
  onSelectRef.current = onSelectProvider;

  useEffect(() => {
    if (!mapRef) return;

    // Cancel any pending stagger timeouts from a previous render
    animTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animTimeoutsRef.current = [];

    // Clear existing markers
    markersRef.current.forEach((m) => {
      if (typeof m.setMap === 'function') m.setMap(null);
      else m.map = null;
    });
    markersRef.current = [];

    // Clear existing clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    // Respect prefers-reduced-motion: skip the stagger entirely.
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pricedIndex = 0;

    // Close any hover info window
    if (hoverInfoRef.current) {
      hoverInfoRef.current.close();
      hoverInfoRef.current = null;
    }

    const validProviders = providers.filter((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    const emptyMarkers = [];
    const hoverWindow = new window.google.maps.InfoWindow({ disableAutoPan: true });
    hoverInfoRef.current = hoverWindow;

    for (const p of validProviders) {
      const position = { lat: Number(p.lat), lng: Number(p.lng) };
      const hasData = p.has_submissions;

      let marker;

      if (hasData) {
        // ── Price pill marker ──
        const label = formatPinLabel(p, procedureFilter);
        if (label) {
          // Variant detection: provider may carry a `vs_city_avg_pct` field
          // populated by upstream code. Default = pink.
          const pct = Number(p.vs_city_avg_pct);
          const variant =
            Number.isFinite(pct) && pct <= -5
              ? 'below'
              : Number.isFinite(pct) && pct >= 5
                ? 'above'
                : 'default';
          const icon = createPricePillIcon(label, variant);
          // Stagger the priced pills onto the map for an editorial entrance.
          // First 20 markers stagger at 30ms each; the rest snap in.
          // Reduced motion users skip the stagger and the DROP animation.
          const stagger = !reducedMotion && pricedIndex < 20;
          marker = new window.google.maps.Marker({
            map: stagger ? null : mapRef,
            position,
            title: p.provider_name,
            icon: {
              url: icon.url,
              scaledSize: new window.google.maps.Size(icon.width, icon.height),
              anchor: new window.google.maps.Point(icon.width / 2, icon.height),
            },
            zIndex: 10,
            optimized: false,
            animation: stagger ? window.google.maps.Animation.DROP : null,
          });
          if (stagger) {
            const delay = pricedIndex * 30;
            const id = setTimeout(() => {
              marker.setMap(mapRef);
            }, delay);
            animTimeoutsRef.current.push(id);
          }
          pricedIndex += 1;
        } else {
          // Has data but no qualifying per-unit price — show as small gray dot
          // (e.g. only package prices on file, or all prices >= $500)
          marker = new window.google.maps.Marker({
            map: mapRef,
            position,
            title: p.provider_name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#9CA3AF',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
              scale: 5,
            },
            zIndex: 5,
          });
        }
      } else {
        // ── Empty dot marker ──
        marker = new window.google.maps.Marker({
          position,
          title: p.provider_name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: 'white',
            fillOpacity: 1,
            strokeColor: '#D1D5DB',
            strokeWeight: 2,
            scale: 4,
          },
          zIndex: 1,
        });
        emptyMarkers.push(marker);
      }

      // Hover info window — editorial typography
      marker.addListener('mouseover', () => {
        const ratingPart = p.google_rating ? ` &middot; ★ ${Number(p.google_rating).toFixed(1)}` : '';
        const location = [p.city, p.state].filter(Boolean).join(', ');
        const priceLine = (p.has_submissions && Number(p.per_unit_avg) > 0)
          ? `<p style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:20px;color:#111111;margin:6px 0 0;line-height:1;">$${Number(p.per_unit_avg)}<span style="font-family:'Outfit',sans-serif;font-weight:400;font-size:11px;color:#666;margin-left:4px;">avg</span></p>`
          : '';
        hoverWindow.setContent(
          `<div style="font-family:'Outfit',sans-serif;padding:4px 0;min-width:160px;">` +
            `<p style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:14px;margin:0 0 2px;color:#111111;line-height:1.2;">${p.provider_name}</p>` +
            `<p style="font-family:'Outfit',sans-serif;font-size:11px;color:#666;margin:0;">${location}${ratingPart}</p>` +
            priceLine +
            `<p style="font-family:'Outfit',sans-serif;font-size:10px;font-weight:600;color:#E8347A;margin:6px 0 0;text-transform:uppercase;letter-spacing:0.08em;">View full pricing &rarr;</p>` +
          `</div>`
        );
        hoverWindow.open(mapRef, marker);
      });
      marker.addListener('mouseout', () => {
        hoverWindow.close();
      });

      // Click handler
      marker.addListener('click', () => {
        hoverWindow.close();
        onSelectRef.current(p);
      });

      markersRef.current.push(marker);
    }

    // Store empty markers for visibility toggling
    emptyMarkersRef.current = emptyMarkers;

    // ── Cluster empty pins ──
    if (emptyMarkers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map: mapRef,
        markers: emptyMarkers,
        algorithmOptions: { maxZoom: 13 },
        renderer: {
          render: ({ count, position }) => {
            const size = count < 5 ? 36 : count < 20 ? 44 : count < 50 ? 52 : 60;
            const icon = createClusterIcon(count, size);
            return new window.google.maps.Marker({
              position,
              icon: {
                url: icon.url,
                scaledSize: new window.google.maps.Size(size, size),
                anchor: new window.google.maps.Point(size / 2, size / 2),
              },
              zIndex: 5,
            });
          },
        },
      });
    }

    return () => {
      animTimeoutsRef.current.forEach((t) => clearTimeout(t));
      animTimeoutsRef.current = [];
      markersRef.current.forEach((m) => {
        if (typeof m.setMap === 'function') m.setMap(null);
        else m.map = null;
      });
      markersRef.current = [];
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      if (hoverInfoRef.current) {
        hoverInfoRef.current.close();
        hoverInfoRef.current = null;
      }
    };
  }, [mapRef, providers, procedureFilter]);

  // ── Toggle empty marker visibility when hasPricesOnly changes ──
  useEffect(() => {
    emptyMarkersRef.current.forEach((m) => {
      if (typeof m.setVisible === 'function') m.setVisible(!hasPricesOnly);
    });
    if (clustererRef.current) {
      if (hasPricesOnly) {
        clustererRef.current.clearMarkers();
      } else {
        clustererRef.current.addMarkers(emptyMarkersRef.current);
      }
    }
  }, [hasPricesOnly]);

  if (!mapsReady) {
    return (
      <div className="flex items-center justify-center h-full bg-warm-gray">
        <span className="text-sm text-text-secondary animate-pulse">Loading map...</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{
        // Tell the browser the map handles its own touch gestures so iOS
        // Safari doesn't try to pinch-zoom the page on top of the map.
        // `pan-y` keeps vertical page scroll working on the container
        // edges where the map gives up the gesture.
        touchAction: 'pan-y',
        overflow: 'hidden',
      }}
    >
      <GoogleMap
        mapContainerStyle={MAP_STYLES}
        center={center}
        zoom={zoom}
        options={DEFAULT_OPTIONS}
        onLoad={handleLoad}
        onIdle={handleIdle}
      >
        {selectedProvider && !IS_MOBILE && (
          <InfoWindowF
            position={{
              lat: Number(selectedProvider.lat),
              lng: Number(selectedProvider.lng),
            }}
            onCloseClick={() => onSelectProvider(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -14) }}
          >
            <MapInfoCard provider={selectedProvider} />
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Legend — editorial: 2px radius, hard border, no shadow */}
      <div
        className="absolute bottom-8 left-3 bg-white px-3 py-2 z-10"
        style={{
          pointerEvents: 'none',
          borderRadius: '2px',
          border: '1px solid #E8E8E8',
          boxShadow: 'none',
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="inline-block"
            style={{
              width: 28,
              height: 16,
              background: 'white',
              border: '1.5px solid #E8347A',
              borderRadius: '2px',
            }}
          />
          <span
            className="text-[10px] uppercase font-semibold text-ink"
            style={{ letterSpacing: '0.08em' }}
          >
            Has price data
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center" style={{ width: 28 }}>
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: 'white',
                border: '2px solid #D1D5DB',
              }}
            />
          </span>
          <span
            className="text-[10px] uppercase font-semibold text-text-secondary"
            style={{ letterSpacing: '0.08em' }}
          >
            No prices yet
          </span>
        </div>
      </div>
    </div>
  );
}
