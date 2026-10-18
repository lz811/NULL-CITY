import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const draws=[];
const canvasContext=new Proxy({drawImage(...args){draws.push(args);}}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const c=vm.createContext({console,Image:class{set src(v){this.srcPath=v;this.onload();}},ImageData:class{},document:{createElement:()=>({getContext:()=>canvasContext})}});
for(const file of ['campaign','engine','art','terrain-assets'])vm.runInContext(readFileSync(new URL('../src/'+file+'.js',import.meta.url),'utf8'),c);
vm.runInContext('buildTiles();buildBuildings();buildProps();buildChars();buildVehicles();globalThis.api={loadTerrainAssets,drawAtlasTerrain,makeWorld,G,meta:CITY_TERRAIN_META}',c);
test('city terrain atlas is a real RGBA file with every tile the engine asks for',()=>{
 const png=readFileSync(new URL('../assets/city/terrain.png',import.meta.url));
 assert.ok(png.length>5000);assert.equal(png.readUInt8(25),6,'colour type 6 = RGBA: transparency is real, not a baked checkerboard');
 for(const n of ['asph0','asph3','wet0','wet1','walk0','walk3','kerb_n','kerb_e','kerb_s','kerb_w','kerb_ne','kerb_nw','kerb_se','kerb_sw','cross_v','cross_h','dash_v','dash_h','manhole','drain','plaza0','plaza2','alley0','alley1','path0'])assert.ok(c.api.meta[n],'missing tile '+n);
});
test('ground renders from the atlas without modifying collision or world topology',async()=>{
 const a=c.api,W=a.makeWorld('streets');const ground=W.ground.slice(),solid=W.solid.slice();
 assert.equal(a.drawAtlasTerrain(canvasContext,60,44,a.G.ROAD,W),false,'procedural fallback before load');
 await a.loadTerrainAssets();draws.length=0;
 const handled=[a.G.SIDEWALK,a.G.UNDER,a.G.ROAD,a.G.ROADWET,a.G.CROSS,a.G.PLAZA,a.G.ALLEY,a.G.PATH,a.G.TRACKS,a.G.RAMP,a.G.QUAY,a.G.STAIRS];
 for(let y=0;y<84;y++)for(let x=0;x<120;x++){const g=W.ground[y*120+x];assert.equal(a.drawAtlasTerrain(canvasContext,x,y,g,W),handled.includes(g));}
 assert.deepEqual(W.ground,ground);assert.deepEqual(W.solid,solid);
 assert.ok(draws.length>1000);assert.ok(draws.some(d=>d[0].srcPath.endsWith('asphalt_paving_additional_tiles.png')));
});
test('kerbs follow road boundaries: straight edges and rounded corners',async()=>{
 await c.api.loadTerrainAssets();const {G,meta}=c.api,W={ground:new Uint8Array(120*84).fill(G.SIDEWALK),vary:new Uint8Array(120*84),decal:new Uint8Array(120*84)};
 const src=(x,y)=>{draws.length=0;c.api.drawAtlasTerrain(canvasContext,x,y,G.SIDEWALK,W);return draws.at(-1).slice(1,3).join(',');};
 for(const [x,y]of [[60,41],[61,40]])W.ground[y*120+x]=G.ROAD;
 assert.equal(src(60,40),meta.kerb_se.join(','),'road south+east -> rounded corner');
 W.ground[40*120+61]=G.SIDEWALK;assert.equal(src(60,40),meta.kerb_s.join(','),'road south only -> straight kerb');
});
test('six-tile avenue crossing reaches both pavements',()=>{
 const W=c.api.makeWorld('streets'),{G}=c.api;
 for(const y of [14,15])for(let x=56;x<=61;x++)assert.equal(W.ground[y*120+x],G.CROSS,`missing stripe at ${x},${y}`);
});

test('all carriageway materials use the new pack without old opaque road overlays',async()=>{
 await c.api.loadTerrainAssets();const W=c.api.makeWorld('streets'),{G}=c.api;
 for(const g of [G.ROAD,G.ROADWET,G.CROSS,G.TRACKS,G.RAMP]){
  draws.length=0;c.api.drawAtlasTerrain(canvasContext,60,44,g,W);
  assert.ok(draws.length);assert.ok(draws.every(d=>!d[0].srcPath.endsWith('assets/city/terrain.png')));
  const base=draws.find(d=>d[1]===246&&d[2]===38);assert.ok(base);assert.equal(base[7],32);assert.equal(base[8],32);
 }
});

test('selected grey blocks are used on pedestrian surfaces only',async()=>{
 await c.api.loadTerrainAssets();const W=c.api.makeWorld('streets'),{G}=c.api;
 for(const g of [G.SIDEWALK,G.PLAZA,G.ALLEY,G.PATH,G.QUAY,G.UNDER,G.STAIRS]){
  draws.length=0;c.api.drawAtlasTerrain(canvasContext,60,44,g,W);
  assert.ok(draws.some(d=>d[1]===674&&d[2]===712));
  assert.ok(!draws.some(d=>d[1]===246&&d[2]===38));
 }
});
