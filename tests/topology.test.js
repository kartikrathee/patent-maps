import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, nerve, distanceKm } from '../dist/topology.js';
import { sampleData, validateRecords } from '../dist/data.js';

const point = (id, lat, lng) => ({ id, lat, lng, age: 30, city: 'Test', application: 'Acrobat' });
function covered(graph) { return new Set(graph.nodes.flatMap(n => n.members)); }
test('every source record survives both global clustering and local refinement', () => {
  const records = sampleData();
  for (const refine of [false, true]) {
    const graph = buildGraph(records, { refine });
    assert.equal(covered(graph).size, records.length);
    graph.edges.forEach(edge => {
      const a = graph.nodes.find(n => n.id === edge.source), b = graph.nodes.find(n => n.id === edge.target);
      assert.equal(edge.weight, a.members.filter(id => b.members.includes(id)).length);
      assert.ok(edge.weight > 0);
    });
  }
});
test('the nerve connects only clusters with shared records, with exact weights', () => {
  const nodes = [{ id: 'a', scale: 'global', members: ['1','2','3'] }, { id: 'b', scale: 'local', members: ['2','3','4'] }, { id: 'c', scale: 'local', members: ['5'] }];
  assert.deepEqual(nerve(nodes), [{ source: 'a', target: 'b', weight: 2, crossScale: true }]);
});
test('refinement preserves outside nodes and introduces cross-scale bridges', () => {
  const points = Array.from({ length: 100 }, (_, i) => point(String(i), 30 + Math.floor(i / 10) * .3, -95 + (i % 10) * .3));
  const coarse = buildGraph(points, { bins: 4, refine: false });
  const refined = buildGraph(points, { bins: 4 });
  const inside = new Set(refined.region.members);
  const outsideNodes = coarse.nodes.filter(n => n.members.some(id => !inside.has(id)));
  outsideNodes.forEach(node => assert.deepEqual(refined.nodes.find(n => n.id === node.id), node));
