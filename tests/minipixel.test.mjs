import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
// Geometry and render-call smoke checks only; this is not a visual browser test.
const gradient={addColorStop(){}};
const drawing=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),measureText:t=>({width:t.length*7})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:0,height:0,getContext:()=>drawing});
const context=vm.createContext({console,document:{createElement:canvas},Path2D:class{lineTo(){}closePath(){}},ImageData:class{}});
for(const f of ['campaign','engine','art','characters','places','minipixel-world'])vm.runInContext(readFileSync(new URL('../src/'+f+'.js',import.meta.url),'utf8'),context);
vm.runInContext('globalThis.api=Minipixel.get();globalThis.cases=CASES;globalThis.venues=VENUES;globalThis.GameClass=Game;globalThis.stand=canStand;',context);
const api=context.api;
test('reference city contains five circular roads, parks and thousands of building pieces',()=>{assert.equal(api.stats.rings,5);assert.ok(api.stats.parks>30);assert.ok(api.stats.buildings>3000);assert.equal(api.stats.npcs,520);});
test('all campaign terminals, venue entrances and district gates are physically reachable',()=>{
 const start=api.world('streets').spawn;
 const targets=[...context.cases.filter(c=>!c.venue).map(c=>({...api.site(c.id,Number(c.number)-1),id:c.id})),...api.doors(context.venues),...api.gates];
 for(const p of targets){assert.ok(api.can(p),p.id+' blocked');const route=api.path(start,p);assert.ok(route?.length,p.id+' unreachable');for(const q of route)assert.ok(api.can(q),p.id+' invalid waypoint');}
});
test('roads can be followed around the city and building/ocean targets are rejected',()=>{
 const a=api.point(0,2975),b=api.point(2975,0);const route=api.path(a,b);assert.ok(route?.length>2);let prev=a;for(const p of route){const n=Math.ceil(Math.hypot(p.x-prev.x,p.y-prev.y)/.5);for(let i=0;i<=n;i++)assert.ok(api.can({x:prev.x+(p.x-prev.x)*i/(n||1),y:prev.y+(p.y-prev.y)*i/(n||1)}));prev=p;}assert.equal(api.can(api.point(0,0)),false);assert.equal(api.path(a,api.point(7000,7000)),null);
});
test('renderer runs at city, port and park views; game uses new collisions and small-character scale',()=>{
 const g=new context.GameClass(canvas(),{});g.renderer.resize(128,72);g.renderer.cityDensity=10;g.loadDistrict({id:'streets',mentor:'Mara',mentorCast:'locksmith'});g.world.interactables=api.doors(context.venues);
 for(const [x,y]of [[0,3380],[0,0],[5900,0],[0,-5250],[-4000,0]]){const p=api.point(x,y);g.cam={x:p.x-64,y:p.y-36};g.draw();}
 assert.equal(g.canvas.width,1280);assert.equal(g.canvas.height,720);assert.equal(context.stand(g.world,960,672),false);
});

test('actual movement follows curved routes without sticking on corners',()=>{
 context.State={done:new Set()};const g=new context.GameClass(canvas(),{});g.renderer.resize(128,72);g.loadDistrict({id:'streets',mentor:'Mara',mentorCast:'locksmith'});
 const start=api.point(0,2975),target=api.point(2975,0);Object.assign(g.player,start);g.path=api.path(start,target);
 for(let i=0;i<20000&&g.path.length;i++)g.update(25);
 assert.equal(g.path.length,0,'route stuck');assert.ok(Math.hypot(g.player.x-target.x,g.player.y-target.y)<.12);
 const doors=api.doors(context.venues);assert.equal(new Set(doors.map(p=>p.x+','+p.y)).size,5);
});
