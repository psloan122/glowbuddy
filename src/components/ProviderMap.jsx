import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
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

  if (!mapsReady) {
    return (
      <div className="flex items-center justify-center h-full bg-warm-gray">
        <span className="text-sm text-text-secondary animate-pulse">Loading map...</span>
      </div>
    );
  }

  function getMarkerIcon(p) {
    if (!p.has_submissions) {
      // Gray pin for providers without price data
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#9CA3AF',
        fillOpacity: 0.9,
        strokeColor: '#6B7280',
        strokeWeight: 1.5,
      };
    }
    return undefined; // default red marker
  }

  function getMarkerLabel(p) {
    if (!p.has_submissions) {
      return {
        text: '?',
        color: '#FFFFFF',
        fontSize: '10px',
        fontWeight: '700',
      };
    }
    if (procedureFilter && p.avg_price > 0) {
      return {
        text: `$${p.avg_price}`,
        color: '#1A1A2E',
        fontSize: '11px',
        fontWeight: '600',
      };
    }
    return {
      text: p.submission_count === 1 ? '1 price' : `${p.submission_count} prices`,
      color: '#1A1A2E',
      fontSize: '10px',
      fontWeight: '500',
    };
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
      {providers.map((p) => (
        <MarkerF
          key={p.key}
          position={{ lat: p.lat, lng: p.lng }}
          title={p.provider_name}
          icon={getMarkerIcon(p)}
          label={getMarkerLabel(p)}
          onClick={() => onSelectProvider(p)}
        />
      ))}

      {selectedProvider && (
        <InfoWindowF
          position={{ lat: selectedProvider.lat, lng: selectedProvider.lng }}
          onCloseClick={() => onSelectProvider(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        >
          <MapInfoCard provider={selectedProvider} />
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
