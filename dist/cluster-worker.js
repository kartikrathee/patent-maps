import { buildGraph } from './topology.js';
self.onmessage = ({ data: { id, points, options } }) => {
  try { self.postMessage({ id, graph: buildGraph(points, options) }); }
  catch (error) { self.postMessage({ id, error: error.message }); }
};
