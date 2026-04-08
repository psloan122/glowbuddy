let loadPromise = null;

// Google Maps fires `gm_authFailure` (window-global, not on the script
// element) when the API key is invalid, restricted, missing the
// required APIs, or has billing disabled. The script tag's `onerror`
// only fires for network-level failures, so without this hook auth
// problems are silent. Wire it once at module load so we always see
// auth failures in the console regardless of where loadGoogleMaps()
// gets called from.
if (typeof window !== 'undefined' && !window.__glowGmAuthHooked) {
  window.__glowGmAuthHooked = true;
  window.gm_authFailure = function () {
    // eslint-disable-next-line no-console
    console.error(
      '[loadGoogleMaps] Google Maps AUTH FAILURE — API key is invalid, restricted, or Maps JavaScript API is not enabled. Check console.cloud.google.com → APIs & Services → Credentials → your key.',
    );
  };
}

export function loadGoogleMaps() {
  if (loadPromise) return loadPromise;

  if (window.google?.maps) {
    return Promise.resolve();
  }

  loadPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) {
      // eslint-disable-next-line no-console
      console.error('[loadGoogleMaps] VITE_GOOGLE_MAPS_KEY is undefined at runtime. Vercel env var missing or named wrong (must be exactly VITE_GOOGLE_MAPS_KEY) and the build was not redeployed after the env var was added.');
      reject(new Error('Missing VITE_GOOGLE_MAPS_KEY'));
      return;
    }

    // Diagnostics — surface enough to debug missing/wrong keys without
    // ever leaking the full key into the console.
    // eslint-disable-next-line no-console
    console.info(
      '[loadGoogleMaps] injecting Maps JS script. key prefix:',
      key.substring(0, 10) + '…',
      'length:',
      key.length,
    );

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // eslint-disable-next-line no-console
      console.info('[loadGoogleMaps] script onload fired. window.google.maps =', !!window.google?.maps);
      resolve();
    };
    script.onerror = (e) => {
      // eslint-disable-next-line no-console
      console.error('[loadGoogleMaps] script onerror — network or CSP failure', e);
      reject(new Error('Google Maps script failed to load (network/CSP)'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
