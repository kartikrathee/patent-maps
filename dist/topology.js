const RAD = Math.PI / 180;
export const wrapLongitude = lng => ((lng + 180) % 360 + 360) % 360 - 180;
export function project(lat, lng) {
  const sine = Math.sin(Math.max(-85, Math.min(85, lat)) * RAD);
  return { x: (lng + 180) / 360, y: .5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI) };
}
export function unproject(x, y) {
  return { lng: wrapLongitude(x * 360 - 180), lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / RAD };
}
export function distanceKm(a, b) {
  const dlat = (b.lat - a.lat) * RAD, dlng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dlng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function longitudeStart(points) {
  if (!points.length) return -180;
  const values = [...new Set(points.map(p => wrapLongitude(p.lng)))].sort((a, b) => a - b);
  let gap = -1, start = values[0];
  values.forEach((lng, i) => {
    const next = values[(i + 1) % values.length] + (i === values.length - 1 ? 360 : 0);
    if (next - lng > gap) { gap = next - lng; start = wrapLongitude(next); }
  });
  return start;
}
function geometry(points) {
  const start = longitudeStart(points);
  const projected = points.map(p => ({ ...p, ...project(p.lat, p.lng < start ? p.lng + 360 : p.lng) }));
  const bounds = {
    x0: Math.min(...projected.map(p => p.x)), x1: Math.max(...projected.map(p => p.x)),
    y0: Math.min(...projected.map(p => p.y)), y1: Math.max(...projected.map(p => p.y)),
  };
  if (bounds.x1 - bounds.x0 < .0001) { bounds.x0 -= .00005; bounds.x1 += .00005; }
  if (bounds.y1 - bounds.y0 < .0001) { bounds.y0 -= .00005; bounds.y1 += .00005; }
  return { projected, bounds };
}
function components(points, radius) {
  const parents = points.map((_, i) => i);
  const root = i => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (distanceKm(points[i], points[j]) <= radius) parents[root(j)] = root(i);
    }
  }
  const groups = new Map();
  points.forEach((point, i) => { const key = root(i); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(point); });
  return [...groups.values()];
}
function cover(points, bins, overlap, radius, scale) {
  const { projected, bounds } = geometry(points);
