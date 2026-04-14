let pending;
export function loadGoogleMaps(key, onAuthFailure = () => {}) {
  if (!key?.trim()) return Promise.reject(new Error('Enter a Google Maps browser API key.'));
  if (globalThis.google?.maps?.importLibrary) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const cleanup = () => { clearTimeout(timeout); delete globalThis.scaleAtlasMapsReady; };
    const fail = message => { cleanup(); script.remove(); pending = null; reject(new Error(message)); };
    const timeout = setTimeout(() => fail('Google Maps took too long to respond. Try again.'), 20000);
    globalThis.scaleAtlasMapsReady = () => { cleanup(); resolve(); };
    globalThis.gm_authFailure = () => { fail('Google Maps could not authenticate this key. Check the key and its website restrictions.'); onAuthFailure(); };
    const params = new URLSearchParams({ key: key.trim(), v: 'weekly', loading: 'async', callback: 'scaleAtlasMapsReady', auth_referrer_policy: 'origin' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => fail('Google Maps could not load. Check your connection and try again.');
    document.head.append(script);
  });
  return pending;
}

export async function googleMapAdapter(element, mapId, onSelect) {
  const { Map, Polyline } = await google.maps.importLibrary('maps');
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
  const map = new Map(element, { center: { lat: 39.5, lng: -98 }, zoom: 4, mapId: mapId || 'DEMO_MAP_ID',
    disableDefaultUI: true, zoomControl: false, mapTypeControl: false, streetViewControl: false, gestureHandling: 'greedy' });
  let markers = [], lines = [];
  function clear() {
    markers.forEach(marker => { google.maps.event.clearInstanceListeners(marker); marker.map = null; });
    lines.forEach(line => line.setMap(null));
    markers = []; lines = [];
    map.data.forEach(feature => map.data.remove(feature));
  }
  return {
