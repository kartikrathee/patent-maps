import { sampleData, validateRecords } from './data.js';
import { buildGraph } from './topology.js';
import { previewMapAdapter } from './preview-map.js';
import { loadGoogleMaps, googleMapAdapter } from './google-maps.js';
import { config } from './config.js';

const $ = id => document.getElementById(id);
const state = { data: sampleData(), points: [], graph: { nodes: [], edges: [] }, selected: null, showPoints: true };
const preview = previewMapAdapter($('preview-map'), selectNode);
let adapter = preview, live = null, job = 0, debounce, toastTimer;
const worker = typeof Worker !== 'undefined' ? new Worker(new URL('./cluster-worker.js', import.meta.url), { type: 'module' }) : null;
function notify(message) { $('status').textContent = message; $('status').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('status').hidden = true; }, 5500); }
function options() { return { bins: Number($('resolution').value), overlap: Number($('overlap').value) / 100, refine: $('refine').checked }; }
function update() {
  const query = $('search').value.trim().toLowerCase();
  state.points = state.data.filter(p => `${p.city} ${p.application}`.toLowerCase().includes(query));
  $('resolution-value').textContent = `${$('resolution').value} × ${$('resolution').value}`;
  $('overlap-value').textContent = `${$('overlap').value}%`;
  const id = ++job;
  if (worker) worker.postMessage({ id, points: state.points, options: options() });
  else accept({ id, graph: buildGraph(state.points, options()) });
}
function accept({ id, graph, error }) {
  if (id !== job) return;
  if (error) { notify(`Clustering could not complete: ${error}`); return; }
  state.graph = graph;
  if (!graph.nodes.some(n => n.id === state.selected)) {
    state.selected = [...graph.nodes].sort((a, b) => (b.scale === 'local') - (a.scale === 'local') || b.count - a.count)[0]?.id ?? null;
  }
  draw(); renderLocations(); renderInspector();
  $('record-count').textContent = state.points.length.toLocaleString();
  $('cluster-count').textContent = graph.nodes.length;
  $('edge-count').textContent = graph.edges.length;
  $('refinement-count').textContent = graph.region ? `${graph.region.members.length} records` : 'Off';
  const locations = new Set(state.points.map(p => p.city)).size;
  $('map-description').textContent = `${state.points.length.toLocaleString()} records, connected across ${locations} ${locations === 1 ? 'location' : 'locations'}.`;
  $('scale-label').textContent = graph.region ? 'Global + local detail' : 'Global overview';
  $('empty-state').hidden = state.points.length !== 0;
  $('density-description').textContent = graph.region ? `${graph.region.members.length} records receive finer clustering in the densest cover region. Other regions keep the global view.` : 'Global view is active. Turn on refinement to explore the densest region at a finer scale.';
  adapter.fit(state.points);
}
if (worker) {
  worker.onmessage = ({ data }) => accept(data);
  worker.onerror = () => notify('The clustering worker could not start. Reload the page and try again.');
}
function draw() { adapter.draw(state.graph, state.points, state.selected, state.showPoints); }
function selectNode(id) { state.selected = id; draw(); renderInspector(); }
function renderLocations() {
  const counts = new Map();
  state.data.forEach(p => counts.set(p.city, (counts.get(p.city) ?? 0) + 1));
  $('locations').replaceChildren();
  for (const [city, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    const button = document.createElement('button');
    button.className = `location-button ${$('search').value === city ? 'active' : ''}`;
    const dot = document.createElement('span'); dot.className = 'location-dot'; dot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.textContent = city;
    const total = document.createElement('strong'); total.textContent = count;
    button.append(dot, name, total); button.setAttribute('aria-label', `Show ${city}, ${count} records`);
    button.onclick = () => { $('search').value = city; update(); };
    $('locations').append(button);
  }
}
function renderInspector() {
  const node = state.graph.nodes.find(n => n.id === state.selected);
  $('record-list').replaceChildren();
  $('selected-scale').textContent = node ? node.scale === 'local' ? 'LOCAL DETAIL' : 'GLOBAL CLUSTER' : 'NO SELECTION';
  $('selected-city').textContent = node?.city ?? 'No cluster selected';
  $('selected-coordinates').textContent = node ? `${node.lat.toFixed(4)}°, ${node.lng.toFixed(4)}°` : '—';
