import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, InfoWindowF } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import MapInfoCard from './MapInfoCard';

const MAP_STYLES = {
  width: '100%',
  height: '100%',
};

const DEFAULT_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

// ── Canvas-based price pill icon ──
const pillCache = new Map();

function createPricePillIcon(label) {
  if (pillCache.has(label)) return pillCache.get(label);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 12px "DM Mono", monospace, system-ui';
  const textWidth = ctx.measureText(label).width;
  const padding = 20;
  const width = Math.max(42, Math.ceil(textWidth) + padding);
  const height = 26;
  canvas.width = width;
  canvas.height = height;

  // Pink pill background with shadow
  ctx.shadowColor = 'rgba(201,79,120,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 13);
  ctx.fillStyle = '#C94F78';
  ctx.fill();

  // Reset shadow for text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // White text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px "DM Mono", monospace, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);

  const result = { url: canvas.toDataURL(), width, height };
  pillCache.set(label, result);
  return result;
}

// ── Format price label for pin ──
function formatPinLabel(provider, procedureFilter) {
  if (!provider.has_submissions || provider.avg_price <= 0) return null;

  const avg = provider.avg_price;

  // If filtered to a per-unit procedure (Botox, Dysport, etc.)
  if (procedureFilter) {
    const lf = procedureFilter.toLowerCase();
    if (lf.includes('botox') || lf.includes('dysport') || lf.includes('xeomin') || lf.includes('jeuveau')) {
      return `$${Math.round(avg)}/u`;
    }
    if (lf.includes('glp') || lf.includes('semaglutide') || lf.includes('tirzepatide')) {
      return `$${Math.round(avg)}/mo`;
    }
  }

  // Smart formatting based on price range
  if (avg < 100) return `$${Math.round(avg)}/u`;
  if (avg < 1000) return `$${Math.round(avg)}`;
  return `$${(avg / 1000).toFixed(1)}k`;
}

export default function ProviderMap({
  providers,
  center,
  zoom,
  selectedProvider,
  onSelectProvider,
  onBoundsChanged,
  procedureFilter,
}) {
  const [mapsReady, setMapsReady] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const markersRef = useRef([]);
  const clustererRef = useRef(null);
  const hoverInfoRef = useRef(null);

  // Wait for Google Maps to load
  useEffect(() => {
    if (window.google?.maps?.Map) {
      setMapsReady(true);
      return;
    }
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
  }, []);

  // Pan/zoom the map when center or zoom props change
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);
  useEffect(() => {
    if (!mapRef) return;
    const centerChanged =
      prevCenter.current.lat !== center.lat || prevCenter.current.lng !== center.lng;
    const zoomChanged = prevZoom.current !== zoom;
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
          const icon = createPricePillIcon(label);
          marker = new window.google.maps.Marker({
            map: mapRef,
            position,
            title: p.provider_name,
            icon: {
              url: icon.url,
              scaledSize: new window.google.maps.Size(icon.width, icon.height),
              anchor: new window.google.maps.Point(icon.width / 2, icon.height),
            },
            zIndex: 10,
            optimized: false,
          });
        } else {
          // Has submissions but no avg price — show as small pink dot
          marker = new window.google.maps.Marker({
            map: mapRef,
            position,
            title: p.provider_name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#C94F78',
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

      // Hover info window
      marker.addListener('mouseover', () => {
        const ratingPart = p.google_rating ? ` · ★ ${Number(p.google_rating).toFixed(1)}` : '';
        const location = [p.city, p.state].filter(Boolean).join(', ');
        hoverWindow.setContent(
          `<div style="font-family:'Inter',system-ui,sans-serif;padding:4px 0;min-width:140px;">` +
            `<p style="font-weight:500;font-size:13px;margin:0 0 2px;color:#1A1A1A;">${p.provider_name}</p>` +
            `<p style="font-size:12px;color:#6B7280;margin:0;">${location}${ratingPart}</p>` +
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

    // ── Cluster empty pins ──
    if (emptyMarkers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map: mapRef,
        markers: emptyMarkers,
        renderer: {
          render: ({ count, position }) => {
            return new window.google.maps.Marker({
              position: position,
              label: {
                text: String(count),
                color: '#6B7280',
                fontSize: '11px',
                fontWeight: '500',
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: 'white',
                fillOpacity: 1,
                strokeColor: '#D1D5DB',
                strokeWeight: 2,
                scale: 16,
              },
              zIndex: 2,
            });
          },
        },
      });
    }

    return () => {
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

  if (!mapsReady) {
    return (
      <div className="flex items-center justify-center h-full bg-warm-gray">
        <span className="text-sm text-text-secondary animate-pulse">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={MAP_STYLES}
        center={center}
        zoom={zoom}
        options={DEFAULT_OPTIONS}
        onLoad={handleLoad}
        onIdle={handleIdle}
      >
        {selectedProvider && (
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

      {/* Legend */}
      <div
        className="absolute bottom-8 left-3 bg-white rounded-lg shadow-md border border-gray-100 px-3 py-2 z-10"
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="inline-block rounded-full"
            style={{
              width: 28,
              height: 14,
              backgroundColor: '#C94F78',
              borderRadius: 7,
            }}
          />
          <span className="text-[11px] text-text-primary font-medium">Has price data</span>
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
          <span className="text-[11px] text-text-secondary">No prices yet</span>
        </div>
      </div>
    </div>
  );
}
