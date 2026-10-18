import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const fake2d=new Proxy({}, {get:(o,k)=>o[k]??(()=>{})});
const context=vm.createContext({console,ImageData:class{},document:{createElement:()=>({getContext:()=>fake2d})}});
for(const f of ['campaign.js','engine.js','art.js']) vm.runInContext(readFileSync(new URL('../src/'+f,import.meta.url),'utf8'),context);
vm.runInContext('buildTiles();buildBuildings();buildProps();buildChars();buildVehicles();globalThis.city=makeWorld("streets");',context);
test('building art is rendered in Canvas code without facade images',()=>{
 const renderer=readFileSync(new URL('../src/noir-art.js',import.meta.url),'utf8');
 assert.match(renderer,/function drawProceduralStorefront/);
 assert.match(renderer,/drawProceduralStorefront\(c,b,i,W\)/);
 assert.doesNotMatch(renderer,/referenceFacades|paintReferenceBuilding|assets\/facades/);
 assert.ok(!existsSync(new URL('../assets/facades',import.meta.url)));
});
test('denser streets use all 50 facades, no tall distorted footprints or neighboring repeats',()=>{
 const buildings=context.city.buildings;
 assert.equal(new Set(buildings.map(b=>b.facadeId)).size,50);
 assert.ok(buildings.length>=65);
 for(const b of buildings){
  assert.ok(b.h<=12,'oversized roof: '+b.x+','+b.y);
  assert.ok(b.facadeId>=1&&b.facadeId<=50);
 }
 for(let i=0;i<buildings.length;i++)for(let j=0;j<i;j++){
  const a=buildings[i],b=buildings[j];
  if(a.facadeId===b.facadeId)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>30,'two repeated facades are too close');
 }
});
