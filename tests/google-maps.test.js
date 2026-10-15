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
