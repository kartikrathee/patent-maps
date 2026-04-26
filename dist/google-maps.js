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
    draw(graph, points, selected, showPoints) {
      clear();
      const nodes = new globalThis.Map(graph.nodes.map(node => [node.id, node]));
      if (showPoints) {
        map.data.addGeoJson({ type: 'FeatureCollection', features: points.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: {} })) });
        map.data.setStyle({ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2, fillColor: '#68809b', fillOpacity: .5, strokeWeight: 0 }, clickable: false });
      }
      graph.edges.forEach(edge => {
        const a = nodes.get(edge.source), b = nodes.get(edge.target);
        lines.push(new Polyline({ map, path: [{ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }], strokeColor: edge.crossScale ? '#ef8b38' : '#547fbb', strokeOpacity: .7, strokeWeight: edge.crossScale ? 3 : 1.5, clickable: false }));
      });
      graph.nodes.forEach(node => {
        const button = document.createElement('button');
        button.className = `map-node ${node.scale} ${node.id === selected ? 'selected' : ''}`;
        button.textContent = node.count;
        button.title = `${node.city}: ${node.count} records (${node.scale} scale)`;
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => onSelect(node.id));
        const marker = new AdvancedMarkerElement({ map, position: { lat: node.lat, lng: node.lng }, content: button, title: button.title, zIndex: node.id === selected ? 1000 : node.scale === 'local' ? 20 : 10 });
        markers.push(marker);
      });
    },
    fit(points) {
      if (!points.length) return;
      const bounds = new google.maps.LatLngBounds();
      points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 70);
      if (points.length === 1) map.setZoom(12);
    },
    focus(node) { map.panTo({ lat: node.lat, lng: node.lng }); map.setZoom(node.scale === 'local' ? 8 : 6); },
    zoom(delta) { map.setZoom((map.getZoom() ?? 4) + delta); },
    destroy() { clear(); google.maps.event.clearInstanceListeners(map); element.replaceChildren(); },
  };
}
