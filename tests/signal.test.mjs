import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshState,restoreState} from '../src/simulator.mjs';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('legacy saves retain campaign, appearance, interiors and choices while receiving safe visual defaults',()=>{const raw={...freshState(),done:['first','route','dns','logs','firewall','transfer','report','signal','access','restore'],xp:1610,interiorId:'archive',story:{letterReturned:true},settings:{sound:false,calm:true}};const s=restoreState(raw);assert.deepEqual(s.done,raw.done);assert.equal(s.settings.quality,'balanced');assert.equal(s.settings.rain,true);assert.equal(s.settings.calm,true);assert.equal(s.xp,1610);assert.equal(s.interiorId,'archive');assert.equal(s.story.letterReturned,true);});
test('visual settings survive reload and reject invalid values',()=>{const s=restoreState({...freshState(),settings:{quality:'low',rain:false,scanlines:true,grain:true,ambientVolume:500,effectsVolume:-1}});assert.equal(s.settings.quality,'low');assert.equal(s.settings.rain,false);assert.equal(s.settings.ambientVolume,100);assert.equal(s.settings.effectsVolume,0);assert.equal(restoreState({...s,settings:{quality:'invalid'}}).settings.quality,'balanced');});
const c2d=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const ctx=vm.createContext({console,ImageData:class{},document:{createElement:()=>({width:0,height:0,getContext:()=>c2d})}});
for(const f of ['campaign.js','engine.js','art.js','characters.js','noir-art.js','places.js'])vm.runInContext(readFileSync(new URL('../src/'+f,import.meta.url),'utf8'),ctx);
test('new modular art preserves navigation and keeps source sprites at exact two-to-one world scale',()=>{
 vm.runInContext('buildTiles();buildBuildings();buildProps();buildChars();buildVehicles();globalThis.w=makeWorld("streets");globalThis.before=Array.from(w.solid);bakeStatic(w);attachVenueDoors(w);refreshDetailedCharacters("default",{});globalThis.after=Array.from(w.solid);globalThis.sprite=S("player_walk_down");globalThis.idle=S("player_idle_down");',ctx);
 assert.deepEqual(ctx.before,ctx.after);assert.equal(ctx.sprite.fw,32);assert.equal(ctx.sprite.fh,48);assert.equal(ctx.sprite.frames,6);assert.equal(ctx.idle.frames,4);
});
test('weather choices migrate, transition continuously and converge without overshoot',()=>{
 assert.equal(restoreState({...freshState(),settings:{weather:'storm'}}).settings.weather,'storm');
 assert.equal(restoreState({...freshState(),settings:{weather:'invalid'}}).settings.weather,'rain');
 vm.runInContext(`globalThis.renderer={weather:'day'};globalThis.clock={time:0};updateCityWeather(renderer,clock);renderer.weather='storm';clock.time=100;globalThis.transition=updateCityWeather(renderer,clock).dark;for(let i=0;i<200;i++){clock.time+=50;updateCityWeather(renderer,clock);}globalThis.finalWeather=renderer.weatherFrame;`,ctx);
 const stormDark=vm.runInContext('CITY_WEATHER.storm.dark',ctx);assert.ok(ctx.transition>.01&&ctx.transition<stormDark);assert.ok(Math.abs(ctx.finalWeather.dark-stormDark)<.001);assert.ok(ctx.finalWeather.rain>.99);
});
test('hack and interaction animation strips are available in every direction',()=>{
 vm.runInContext('refreshDetailedCharacters("default",{});globalThis.actions=["down","up","side"].flatMap(d=>[S("player_hack_"+d),S("player_interact_"+d)]);',ctx);
 for(const s of ctx.actions){assert.equal(s.frames,4);assert.equal(s.fw,32);assert.equal(s.fh,48);}
});
