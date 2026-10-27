import test from 'node:test';
import assert from 'node:assert/strict';
import { googleMapAdapter, loadGoogleMaps } from '../dist/google-maps.js';

test('Google Maps requires a key before attempting network access', async () => {
  await assert.rejects(loadGoogleMaps(''), /API key/);
});

test('map adapter sends nodes, shared-record edges and geographic records to the SDK', async t => {
  const priorGoogle = globalThis.google, priorDocument = globalThis.document;
  t.after(() => { globalThis.google = priorGoogle; globalThis.document = priorDocument; });
  const markers = [], lines = [], maps = [], imports = [];
  class MapMock {
    constructor(element, options) {
      this.element = element; this.options = options; this.features = []; maps.push(this);
      this.data = {
        forEach: fn => [...this.features].forEach(fn), remove: feature => { this.features = this.features.filter(f => f !== feature); },
        addGeoJson: json => { this.features.push(...json.features); }, setStyle: style => { this.dataStyle = style; },
      };
    }
    fitBounds(bounds, padding) { this.bounds = bounds; this.padding = padding; }
    setZoom(value) { this.zoom = value; } getZoom() { return this.zoom; }
    panTo(position) { this.position = position; }
  }
  class MarkerMock { constructor(options) { Object.assign(this, options); markers.push(this); } }
  class LineMock { constructor(options) { Object.assign(this, options); lines.push(this); } setMap(map) { this.map = map; } }
  class BoundsMock { constructor() { this.points = []; } extend(p) { this.points.push(p); } }
  globalThis.google = { maps: {
    importLibrary: async name => { imports.push(name); return name === 'maps' ? { Map: MapMock, Polyline: LineMock } : { AdvancedMarkerElement: MarkerMock }; },
    event: { clearInstanceListeners() {} }, SymbolPath: { CIRCLE: 'circle' }, LatLngBounds: BoundsMock,
  } };
  globalThis.document = { createElement: () => ({ attributes: {}, listeners: {}, setAttribute(k,v) { this.attributes[k] = v; }, addEventListener(k,v) { this.listeners[k] = v; } }) };
  let selected;
  const element = { replaceChildren() { this.cleared = true; } };
  const adapter = await googleMapAdapter(element, '', id => { selected = id; });
  const graph = {
    nodes: [{ id:'a',lat:40,lng:-75,city:'A',count:2,scale:'global' },{ id:'b',lat:41,lng:-74,city:'B',count:1,scale:'local' }],
    edges: [{ source:'a',target:'b',weight:1,crossScale:true }],
  };
  const points = [{lat:40,lng:-75}];
  adapter.draw(graph, points, 'b', true);
  assert.deepEqual(imports, ['maps','marker']);
  assert.equal(markers.length, 2); assert.equal(lines.length, 1);
  assert.deepEqual(lines[0].path, [{lat:40,lng:-75},{lat:41,lng:-74}]);
  assert.equal(lines[0].strokeColor, '#ef8b38');
  assert.deepEqual(maps[0].features[0].geometry.coordinates, [-75,40]);
  assert.match(markers[1].content.className, /selected/);
  markers[1].content.listeners.click(); assert.equal(selected, 'b');
  adapter.fit(points); assert.equal(maps[0].zoom, 12);
  adapter.focus(graph.nodes[1]); assert.deepEqual(maps[0].position, {lat:41,lng:-74});
  adapter.draw({nodes:[],edges:[]}, [], null, false);
  assert.ok(markers.every(m => m.map === null)); assert.ok(lines.every(l => l.map === null));
  assert.equal(maps[0].features.length, 0);
  adapter.destroy(); assert.ok(element.cleared);
});
