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
  fullscreenControl: false,
};

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
    }, 200);
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

  // ── Create/update markers imperatively ──
  // We keep a stable ref to onSelectProvider to avoid re-creating markers
  // when the callback identity changes
  const onSelectRef = useRef(onSelectProvider);
  onSelectRef.current = onSelectProvider;

  useEffect(() => {
    if (!mapRef) return;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const useAdvanced = !!window.google?.maps?.marker?.AdvancedMarkerElement;

    const validProviders = providers.filter((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });

    for (const p of validProviders) {
      const position = { lat: Number(p.lat), lng: Number(p.lng) };
      const hasData = p.has_submissions;

      if (useAdvanced) {
        // Custom HTML pill markers via AdvancedMarkerElement
        const el = document.createElement('div');

        if (hasData) {
          el.className = 'map-pin map-pin--priced';
          if (procedureFilter && p.avg_price > 0) {
            el.textContent = `$${p.avg_price}`;
          } else if (p.submission_count > 0) {
            el.textContent =
              p.submission_count === 1 ? '1 price' : `${p.submission_count} prices`;
          }
        } else {
          el.className = 'map-pin map-pin--empty';
          el.textContent = p.provider_name.split(' ').slice(0, 2).join(' ');
        }

        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          map: mapRef,
          position,
          content: el,
          title: p.provider_name,
        });

        marker.addListener('click', () => onSelectRef.current(p));
        markersRef.current.push(marker);
      } else {
        // Fallback: standard google.maps.Marker
        const icon = hasData
          ? undefined // default red pin
          : {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#9CA3AF',
              fillOpacity: 0.9,
              strokeColor: '#6B7280',
              strokeWeight: 1.5,
            };

        let labelText;
        if (!hasData) {
          labelText = '?';
        } else if (procedureFilter && p.avg_price > 0) {
          labelText = `$${p.avg_price}`;
        } else {
          labelText =
            p.submission_count === 1 ? '1 price' : `${p.submission_count} prices`;
        }

        const marker = new window.google.maps.Marker({
          map: mapRef,
          position,
          title: p.provider_name,
          icon,
          label: {
            text: labelText,
            color: hasData ? '#1A1A2E' : '#FFFFFF',
            fontSize: hasData ? '10px' : '10px',
            fontWeight: hasData ? '500' : '700',
          },
        });

        marker.addListener('click', () => onSelectRef.current(p));
        markersRef.current.push(marker);
      }
    }

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
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
          options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        >
          <MapInfoCard provider={selectedProvider} />
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
