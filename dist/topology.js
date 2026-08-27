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
  const stepX = (bounds.x1 - bounds.x0) / bins, stepY = (bounds.y1 - bounds.y0) / bins;
  const halfX = stepX / (2 * (1 - overlap)), halfY = stepY / (2 * (1 - overlap));
  const cells = [], nodes = [];
  for (let row = 0; row < bins; row++) for (let col = 0; col < bins; col++) {
    const cx = bounds.x0 + (col + .5) * stepX, cy = bounds.y0 + (row + .5) * stepY;
    const members = projected.filter(p => Math.abs(p.x - cx) <= halfX + 1e-12 && Math.abs(p.y - cy) <= halfY + 1e-12);
    if (!members.length) continue;
    const center = unproject(cx, cy), side = 40075 * Math.cos(center.lat * RAD);
    const cell = { id: `${scale}-${row}-${col}`, x0: cx - halfX, x1: cx + halfX, y0: cy - halfY, y1: cy + halfY,
      members: members.map(p => p.id), density: members.length / Math.max(.01, 4 * halfX * halfY * side * side) };
    cells.push(cell);
    components(members, radius).forEach((group, index) => {
      const position = unproject(group.reduce((sum, p) => sum + p.x, 0) / group.length, group.reduce((sum, p) => sum + p.y, 0) / group.length);
      const applications = [...new Set(group.map(p => p.application))];
      nodes.push({ id: `${cell.id}-${index}`, cell: cell.id, scale, ...position, members: group.map(p => p.id),
        count: group.length, city: [...new Set(group.map(p => p.city))].join(' · '),
        application: applications.length === 1 ? applications[0] : 'Mixed', meanAge: group.reduce((s, p) => s + p.age, 0) / group.length });
    });
  }
  return { nodes, cells };
}
export function nerve(nodes) {
  const memberships = new Map(), weights = new Map();
  nodes.forEach((node, index) => node.members.forEach(id => {
    if (!memberships.has(id)) memberships.set(id, []);
    memberships.get(id).push(index);
  }));
  for (const owners of memberships.values()) for (let i = 0; i < owners.length; i++) for (let j = i + 1; j < owners.length; j++) {
    const key = `${owners[i]}:${owners[j]}`;
    weights.set(key, (weights.get(key) ?? 0) + 1);
  }
  return [...weights].map(([key, weight]) => {
    const [a, b] = key.split(':').map(Number);
    return { source: nodes[a].id, target: nodes[b].id, weight, crossScale: nodes[a].scale !== nodes[b].scale };
  });
}
export function buildGraph(points, { bins = 5, overlap = .35, radius = 110, refine = true } = {}) {
  if (!points.length) return { nodes: [], edges: [], cells: [], region: null, recordCount: 0 };
  if (!Number.isInteger(bins) || bins < 2 || bins > 12 || !Number.isFinite(overlap) || overlap < 0 || overlap > .75 || !Number.isFinite(radius) || radius <= 0) throw new Error('Invalid clustering parameters.');
  const initial = cover(points, bins, overlap, radius, 'global');
  let nodes = initial.nodes, region = null;
  if (refine) {
    region = [...initial.cells].sort((a, b) => b.density - a.density || a.id.localeCompare(b.id))[0];
    const ids = new Set(region.members);
    const local = cover(points.filter(p => ids.has(p.id)), 5, overlap, radius / 5, 'local');
    nodes = [...nodes.filter(node => node.members.some(id => !ids.has(id))), ...local.nodes];
  }
  return { nodes, edges: nerve(nodes), cells: initial.cells, region, recordCount: points.length };
}
