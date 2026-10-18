import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const c2d=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const c=vm.createContext({console,Image:class{set src(v){this.onload();}},ImageData:class{},document:{createElement:()=>({getContext:()=>c2d})}});
for(const f of ['campaign.js','engine.js','art.js','noir-art.js','places.js','object-assets.js'])vm.runInContext(readFileSync(new URL('../src/'+f,import.meta.url),'utf8'),c);
vm.runInContext('buildTiles();buildBuildings();buildProps();buildChars();buildVehicles();globalThis.api={makeWorld,loadObjectAssets,attachObjectAssets,objectDrawables,canStand,attachVenueDoors,objectContains};',c);
test('the retired isometric ramen object leaves a normal building with a reachable door',async()=>{
 const a=c.api,W=a.makeWorld('streets'),before=W.solid.slice();
 await a.loadObjectAssets();a.attachObjectAssets(W);
 assert.equal(W.buildings.some(b=>b.objectAsset),false,'object assets are retired in favour of the city building sprites');
 assert.deepEqual(W.solid,before,'collision untouched');
 W.staticCanvas={getContext:()=>c2d};a.attachVenueDoors(W);
 const door=W.interactables.find(v=>v.id==='diner');assert.ok(door);assert.ok(a.canStand(W,door.x,door.y),'doorway must be walkable');
});
