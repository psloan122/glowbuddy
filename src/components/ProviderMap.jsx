import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, InfoWindowF } from '@react-google-maps/api';
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
// Creates a pink rounded-rect pill with white text, returned as a data URL.
const pillCache = new Map();

function createPricePillIcon(label) {
  if (pillCache.has(label)) return pillCache.get(label);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 12px "DM Mono", monospace, system-ui';
  const textWidth = ctx.measureText(label).width;
  const width = Math.max(48, Math.round(textWidth + 20));
  const height = 26;
  canvas.width = width;
  canvas.height = height;

  // Pink pill background
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 13);
  ctx.fillStyle = '#C94F78';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // White text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px "DM Mono", monospace, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);

  const url = canvas.toDataURL();
  pillCache.set(label, url);
  return url;
}

function createEmptyPillIcon(label) {
  const key = `empty:${label}`;
  if (pillCache.has(key)) return pillCache.get(key);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  const textWidth = ctx.measureText(label).width;
  const width = Math.max(48, Math.round(textWidth + 16));
  const height = 24;
  canvas.width = width;
  canvas.height = height;

  // White pill background
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 12);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gray text
  ctx.fillStyle = '#6B7280';
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);

  const url = canvas.toDataURL();
  pillCache.set(key, url);
  return url;
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

    // Clear all existing markers
    markersRef.current.forEach((m) => {
      if (typeof m.setMap === 'function') m.setMap(null);
      else m.map = null;
    });
    markersRef.current = [];

    const validProviders = providers.filter((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    console.log(`Rendering ${validProviders.length} markers (${providers.length} providers passed in)`);

    for (const p of validProviders) {
      const position = { lat: Number(p.lat), lng: Number(p.lng) };
      const hasData = p.has_submissions;

      // Build label
      let label;
      if (hasData) {
        if (procedureFilter && p.avg_price > 0) {
          label = `$${p.avg_price}`;
        } else if (p.submission_count > 0) {
          label = p.submission_count === 1 ? '1 price' : `${p.submission_count} prices`;
        } else {
          label = '\u2713'; // checkmark
        }
      } else {
        // Truncate name to first 2 words
        label = p.provider_name.split(' ').slice(0, 2).join(' ');
      }

      // Create icon
      const iconUrl = hasData
        ? createPricePillIcon(label)
        : createEmptyPillIcon(label);
      const iconWidth = hasData
        ? Math.max(48, label.length * 8 + 20)
        : Math.max(48, label.length * 7 + 16);
      const iconHeight = hasData ? 26 : 24;

      const marker = new window.google.maps.Marker({
        map: mapRef,
        position,
        title: p.provider_name,
        icon: {
          url: iconUrl,
          scaledSize: new window.google.maps.Size(iconWidth, iconHeight),
          anchor: new window.google.maps.Point(iconWidth / 2, iconHeight / 2),
        },
        zIndex: hasData ? 10 : 1,
        optimized: false,
      });

      marker.addListener('click', () => onSelectRef.current(p));
      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach((m) => {
        if (typeof m.setMap === 'function') m.setMap(null);
        else m.map = null;
      });
      markersRef.current = [];
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
  );
}
