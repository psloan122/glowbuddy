let loadPromise = null;

export function loadGoogleMaps() {
  if (loadPromise) return loadPromise;

  if (window.google?.maps) {
    return Promise.resolve();
  }

  loadPromise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) {
      reject(new Error('Missing VITE_GOOGLE_MAPS_KEY'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadPromise;
}
