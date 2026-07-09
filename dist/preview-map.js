import { project, longitudeStart } from './topology.js';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const mainland = [[-124.7,48.4],[-117,49],[-95,49],[-89.5,48],[-82.5,46],[-76.8,44.8],[-71.7,45],[-67,47.5],[-66.9,44.6],[-70,43.2],[-71.6,41.5],[-74,40.6],[-75.5,38],[-75.5,35.2],[-79,33.4],[-81,29.8],[-80.5,25.1],[-81.5,24.6],[-83.2,29],[-89.5,29],[-96.8,25.8],[-103,29],[-106.6,31.8],[-111,31.3],[-117.2,32.5],[-121,36],[-124.4,40.5],[-124.7,48.4]];
const labels = [[-119,39,'CALIFORNIA'],[-113,38,'NEVADA'],[-110,44,'IDAHO'],[-120,46,'OREGON'],[-99,38.5,'KANSAS'],[-100,32,'TEXAS'],[-107,40,'COLORADO'],[-87,39,'ILLINOIS'],[-80,37,'VIRGINIA'],[-74,44,'NEW YORK'],[-79,29,'ATLANTIC OCEAN']];

export function previewMapAdapter(element, onSelect) {
  let view = { x: .225, y: .379, width: .19 }, longitude = -180;
  let current, drag;
  const coord = (lat, lng) => { const p = project(lat, lng); p.x += Math.round(view.x - p.x); return [(p.x - view.x) / view.width * 1000 + 500, (p.y - view.y) / view.width * 1000 + 320]; };
  const path = positions => positions.map(([lng, lat]) => coord(lat, lng).join(',')).join(' ');
  function render() {
    if (!current) return;
    const { graph, points, selected, showPoints } = current;
    const nodes = new Map(graph.nodes.map(node => [node.id, node]));
    const grid = Array.from({ length: 13 }, (_, i) => {
      const lng = -180 + i * 30, lat = -60 + i * 10;
      return `<line x1="${coord(0,lng)[0]}" y1="0" x2="${coord(0,lng)[0]}" y2="640"/><line x1="0" y1="${coord(lat,0)[1]}" x2="1000" y2="${coord(lat,0)[1]}"/>`;
    }).join('');
    const region = graph.region ? `<rect x="${(graph.region.x0-view.x)/view.width*1000+500}" y="${(graph.region.y0-view.y)/view.width*1000+320}" width="${(graph.region.x1-graph.region.x0)/view.width*1000}" height="${(graph.region.y1-graph.region.y0)/view.width*1000}" rx="8" class="refined-region"/>` : '';
    const links = graph.edges.map(edge => {
      const a = nodes.get(edge.source), b = nodes.get(edge.target), [x1,y1] = coord(a.lat,a.lng), [x2,y2] = coord(b.lat,b.lng);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="connection ${edge.crossScale ? 'cross' : ''}"/>`;
    }).join('');
    const markers = graph.nodes.map(node => {
      const [x,y] = coord(node.lat,node.lng), radius = Math.min(21, 7 + Math.sqrt(node.count));
      return `<g role="button" tabindex="0" aria-label="${escape(`${node.city}, ${node.count} records, ${node.scale} cluster`)}" data-node="${node.id}" class="svg-node ${node.scale} ${node.id===selected?'selected':''}" transform="translate(${x} ${y})"><title>${escape(node.city)} · ${node.count} records</title><circle r="${radius}"/><text dy="4">${node.count}</text></g>`;
    }).join('');
    element.innerHTML = `<svg class="preview-canvas" viewBox="0 0 1000 640" aria-label="Interactive illustrative map of clustered records"><rect width="1000" height="640" fill="#e9eff1"/><g class="graticule">${grid}</g><polygon points="${path(mainland)}" class="land"/><g class="state-labels">${labels.map(([lng,lat,name])=>{const [x,y]=coord(lat,lng);return `<text x="${x}" y="${y}">${name}</text>`;}).join('')}</g>${region}${showPoints?points.map(p=>{const [x,y]=coord(p.lat,p.lng);return `<circle cx="${x}" cy="${y}" r="1.8" class="record-dot"/>`;}).join(''):''}<g>${links}</g>${markers}</svg>`;
  }
  element.addEventListener('click', event => { const node=event.target.closest('[data-node]'); if(node) onSelect(node.dataset.node); });
  element.addEventListener('keydown', event => { const node=event.target.closest('[data-node]'); if(node && ['Enter',' '].includes(event.key)){event.preventDefault();onSelect(node.dataset.node);} });
  element.addEventListener('pointerdown', event => { if(event.target.closest('[data-node]'))return; drag={x:event.clientX,y:event.clientY,view:{...view}}; element.setPointerCapture(event.pointerId); });
  element.addEventListener('pointermove', event => { if(!drag)return; const scale=view.width/element.clientWidth;view.x=drag.view.x-(event.clientX-drag.x)*scale;view.y=drag.view.y-(event.clientY-drag.y)*scale;render(); });
  const finish = () => { drag=null; };
  element.addEventListener('pointerup',finish); element.addEventListener('pointercancel',finish);
  return {
    draw(graph,points,selected,showPoints){current={graph,points,selected,showPoints};render();},
    fit(points){if(!points.length)return;longitude=longitudeStart(points);const ps=points.map(p=>project(p.lat,p.lng<longitude?p.lng+360:p.lng));const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);view.x=(Math.min(...xs)+Math.max(...xs))/2;view.y=(Math.min(...ys)+Math.max(...ys))/2;view.width=Math.max(.004,(Math.max(...xs)-Math.min(...xs))*1.3,(Math.max(...ys)-Math.min(...ys))*2.1);render();},
    focus(node){const p=project(node.lat,node.lng);p.x+=Math.round(view.x-p.x);view={x:p.x,y:p.y,width:node.scale==='local'?.016:.045};render();},
    zoom(delta){view.width=Math.min(1.2,Math.max(.0002,view.width*(delta>0?.72:1.4)));render();},
    destroy(){element.replaceChildren();},
  };
}
