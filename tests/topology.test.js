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
  assert.ok(refined.nodes.some(n => n.scale === 'local'));
  assert.ok(refined.edges.some(e => e.crossScale));
  assert.equal(covered(refined).size, points.length);
});
test('isolated records, coincident coordinates, and empty searches remain valid', () => {
  assert.equal(buildGraph([]).recordCount, 0);
  const points = [point('a',40,-80),point('b',40,-80),point('c',-20,100)];
  const graph = buildGraph(points, { radius: 1 });
  assert.equal(covered(graph).size, 3);
  assert.ok(graph.nodes.every(n => Number.isFinite(n.lat) && Number.isFinite(n.lng)));
});
test('the cover wraps the antimeridian without losing nearby records', () => {
  const points = [point('west',10,179.9),point('east',10,-179.9)];
  assert.ok(distanceKm(points[0],points[1]) < 25);
  const graph = buildGraph(points, { radius: 50, refine: false });
  assert.equal(covered(graph).size, 2);
  assert.ok(graph.nodes.every(n => Math.abs(n.lng) > 179));
});
test('sample data and clustering are deterministic', () => {
  assert.deepEqual(sampleData(), sampleData());
  assert.deepEqual(buildGraph(sampleData()), buildGraph(sampleData()));
});
test('invalid import data is rejected before clustering', () => {
  for (const input of [[], null, [null], [{lat:'40',lng:-75}], [{lat:90,lng:0}], [{id:'a',lat:0,lng:0},{id:'a',lat:1,lng:1}], [{lat:0,lng:0,age:-1}], Array.from({length:2001},()=>({lat:0,lng:0}))]) {
    assert.throws(() => validateRecords(input));
  }
  assert.equal(validateRecords([{lat:0,lng:0}])[0].id, 'record-1');
});
test('invalid cover parameters cannot create missing or infinite clusters', () => {
  for (const options of [{bins:1},{bins:2.5},{overlap:.9},{radius:0},{radius:NaN}]) assert.throws(()=>buildGraph(sampleData(),options));
});
