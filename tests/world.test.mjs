import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
// Canvas is stubbed only for geometry tests. Real rendering is checked in the browser.
const c2d=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,ImageData:class{},document:{createElement:()=>({width:0,height:0,getContext:()=>c2d})}});
for(const f of ['campaign.js','engine.js','art.js'])vm.runInContext(readFileSync(new URL('../src/'+f,import.meta.url),'utf8'),ctx);
vm.runInContext('buildTiles();buildBuildings();buildProps();buildChars();buildVehicles();globalThis.world=makeWorld("streets");globalThis.tasks=CASES;globalThis.open=findOpen;globalThis.stand=canStand;',ctx);
test('all mission stations and mentor are reachable with player collision dimensions',()=>{
 const W=ctx.world,start=ctx.open(W,58,50),visited=new Set(),queue=[[Math.floor(start.x/16),Math.floor(start.y/16)]];
 for(let k=0;k<queue.length;k++){const [x,y]=queue[k],key=x+','+y;if(visited.has(key))continue;visited.add(key);for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(nx>=0&&ny>=0&&nx<120&&ny<84&&!visited.has(nx+','+ny)&&ctx.stand(W,nx*16+8,ny*16+13))queue.push([nx,ny]);}
 for(const q of [...ctx.tasks,{id:'mentor',x:62,y:45}]){const p=ctx.open(W,q.x,q.y);assert.equal(visited.has(Math.floor(p.x/16)+','+Math.floor(p.y/16)),true,q.id+' unreachable');}
});
test('new architecture does not overlap mission coordinates',()=>{for(const q of ctx.tasks){assert.equal(ctx.world.solid[q.y*120+q.x],0,q.id+' buried under a building');}});
test('oblique camera maps screen clicks back to world coordinates and covers viewport corners',()=>{
 vm.runInContext('globalThis.renderer=new Renderer(document.createElement("canvas"));renderer.configureView(640,360,true);',ctx);
 const r=ctx.renderer,cam={x:123,y:456};
 for(const [x,y]of [[0,0],[640,0],[0,360],[640,360],[320,180]]){const p=r.screenToWorld(x,y,cam),lx=p.x-cam.x,ly=p.y-cam.y;assert.ok(lx>=-1e-6&&lx<=r.vw+1e-6);assert.ok(ly>=-1e-6&&ly<=r.vh+1e-6);assert.ok(Math.abs(lx+r.skew*ly+r.offsetX-x)<1e-6);assert.ok(Math.abs(ly*r.pitch+r.offsetY-y)<1e-6);}
 r.configureView(640,360,false);const p=r.screenToWorld(10,20,cam);assert.equal(p.x,133);assert.equal(p.y,476);
});
