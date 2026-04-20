import { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';
import {
  getCity as getGatingCity,
  getState as getGatingState,
  getZip as getGatingZip,
} from '../lib/gating';

// Lightweight user location hook used by browse cards to drive the
// "X mi away" badge. It resolves a lat/lng pair from the best available
// signal without interrupting the user:
//
//   1. Cached `gb_user_location` in sessionStorage (so we don't re-query
//      or re-geocode on every navigation within a session)
//   2. Explicit { city, state } override passed by the caller
//      (geocoded via the Mapbox Geocoding REST API)
//   3. `profiles.preferred_lat / preferred_lng` for signed-in users
//   4. Profile `preferred_city / preferred_state` → geocoded
//   5. Gating localStorage city/state/zip → geocoded
//
// We do NOT prompt for browser geolocation here — that ship sailed for
// most users by the time they hit /browse, and asking again would be
// noisy. MapView still handles the explicit "recenter on me" flow.
//
// The returned value is `{ lat, lng, source, loading }`. `source` is
// one of 'cache' | 'override' | 'profile' | 'gating' | null and is
// useful for debug copy in dev.

const SESSION_KEY = 'gb_user_location_v1';

function readSessionLoc() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Number.isFinite(Number(parsed.lat)) &&
      Number.isFinite(Number(parsed.lng))
    ) {
      return {
        lat: Number(parsed.lat),
        lng: Number(parsed.lng),
        source: parsed.source || 'cache',
      };
    }
  } catch {
    // Session storage corruption shouldn't break the page.
  }
  return null;
}

function writeSessionLoc(loc) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc));
  } catch {
    // Quota exceeded or disabled — best effort.
  }
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Forward geocode a city/state/zip string → { lat, lng }.
// Uses the Mapbox Geocoding REST API (no Google Maps SDK required).
async function geocodeViaMapbox(query) {
  if (!query || !MAPBOX_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(query)}.json` +
      `?country=US&access_token=${MAPBOX_TOKEN}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.center) return null;
    const [lng, lat] = feature.center;
    return { lat, lng };
  } catch {
    return null;
  }
}

export default function useUserLocation(override) {
  const { user } = useContext(AuthContext);
  const [loc, setLoc] = useState(() => readSessionLoc());
  const [loading, setLoading] = useState(!loc);
  // Track the override signature so switching cities reruns the chain.
  const overrideKey = override
    ? `${override.city || ''}|${override.state || ''}`
    : '';
  const lastOverrideRef = useRef('');

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Caller-provided override wins (e.g. user picked a city from the
      // filter bar). Re-geocode on signature change so the badge tracks
      // the filter rather than the original session cache.
      if (override?.city && override?.state) {
        if (lastOverrideRef.current === overrideKey && loc?.source === 'override') {
          return;
        }
        lastOverrideRef.current = overrideKey;
        setLoading(true);
        const coords = await geocodeViaMapbox(
          `${override.city}, ${override.state}, USA`,
        );
        if (cancelled) return;
        if (coords) {
          const next = { ...coords, source: 'override' };
          setLoc(next);
          writeSessionLoc(next);
        }
        setLoading(false);
        return;
      }

      // No override — if we already have a cached value, keep it.
      if (loc) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Profile lat/lng for signed-in users.
      if (user?.id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_lat, preferred_lng, preferred_city, preferred_state, preferred_zip')
            .eq('id', user.id)
            .maybeSingle();

          if (cancelled) return;

          if (profile?.preferred_lat && profile?.preferred_lng) {
            const next = {
              lat: Number(profile.preferred_lat),
              lng: Number(profile.preferred_lng),
              source: 'profile',
            };
            setLoc(next);
            writeSessionLoc(next);
            setLoading(false);
            return;
          }

          const fallbackQuery =
            profile?.preferred_zip ||
            (profile?.preferred_city && profile?.preferred_state
              ? `${profile.preferred_city}, ${profile.preferred_state}, USA`
              : null);
          if (fallbackQuery) {
            const coords = await geocodeViaMapbox(fallbackQuery);
            if (!cancelled && coords) {
              const next = { ...coords, source: 'profile' };
              setLoc(next);
              writeSessionLoc(next);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Profile fetch failed — continue to the next fallback.
        }
      }

      if (cancelled) return;

      // Gating (localStorage) city/state/zip.
      const savedCity = getGatingCity();
      const savedState = getGatingState();
      const savedZip = getGatingZip();
      const gatingQuery =
        savedZip ||
        (savedCity && savedState ? `${savedCity}, ${savedState}, USA` : null);
      if (gatingQuery) {
        const coords = await geocodeViaMapbox(gatingQuery);
        if (!cancelled && coords) {
          const next = { ...coords, source: 'gating' };
          setLoc(next);
          writeSessionLoc(next);
        }
      }

      if (!cancelled) setLoading(false);
    }

    resolve();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, overrideKey]);

  return {
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    source: loc?.source ?? null,
    loading,
  };
}
