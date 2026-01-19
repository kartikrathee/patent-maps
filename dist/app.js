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
