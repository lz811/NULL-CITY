import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={drawImage(){},putImageData(){},clearRect(){},getImageData(x,y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){data[i*4]=15;data[i*4+1]=22;data[i*4+2]=25;data[i*4+3]=255;}for(let yy=8;yy<h-5;yy++)for(let xx=10;xx<w-10;xx++)data[(yy*w+xx)*4]=180;return {data};}};
const c=vm.createContext({console,BANK:{},p2img:async src=>({src}),document:{createElement:()=>({getContext:()=>context})}});
vm.runInContext(readFileSync(new URL('../src/walkcycle-assets.js',import.meta.url),'utf8')+';globalThis.api={loadWalkcycleAssets,applyWalkCharacter,walkStrip,paintWalkPreview};',c);
test('all seven heroes and eight NPC roles have directional strips and consistent scale',async()=>{
 await c.api.loadWalkcycleAssets();
 for(let actor=0;actor<7;actor++){
  c.api.applyWalkCharacter('player',{actor:String(actor)});
  for(const dir of ['down','left','right','up'])for(const action of ['idle','walk','sprint','hack','interact']){
   const s=c.BANK['player_'+action+'_'+dir];assert.ok(s);assert.equal(s.worldHeight,22);assert.equal(s.frames,['walk','sprint'].includes(action)?4:1);assert.equal(s.canvas.width,s.fw*s.frames);
  }
 }
 for(const role of ['shopkeeper','security','hacker','locksmith','bartender','courier','corporate','worker']){
  assert.ok(c.api.applyWalkCharacter('npc_'+role));assert.equal(c.BANK['npc_'+role+'_walk_up'].frames,5);
 }
 assert.notEqual(c.BANK.player_walk_left.canvas,c.BANK.player_walk_right.canvas);
});
test('character selection survives normalization',async()=>{
 const {normalizeAppearance}=await import('../src/simulator.mjs');
 assert.equal(normalizeAppearance({actor:'6'}).actor,'6');assert.equal(normalizeAppearance({actor:'999'}).actor,'0');
});
