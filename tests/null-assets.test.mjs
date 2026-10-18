import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
let calls=[];const ctx={fillStyle:'',fillRect(x,y,w,h){calls.push([x,y,w,h,this.fillStyle]);}};
const scope=vm.createContext({document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}});
for(const file of ['null-assets','characters'])vm.runInContext(readFileSync(new URL('../src/'+file+'.js',import.meta.url),'utf8'),scope);
vm.runInContext('globalThis.api={data:NULL_ASSETS,frame:characterFrame,preset:nullPreset};',scope);
const {data,frame,preset}=scope.api;
test('source SVG portraits are self-contained and all ten have sprite pixels',()=>{
 assert.equal(data.characters.length,10);
 for(const v of data.characters){const svg=readFileSync(new URL('../'+v.portrait,import.meta.url),'utf8');assert.match(svg,/viewBox="0 0 42 46"/);assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:/);assert.ok(v.pixels.length>500);}
});
test('Null sprites keep the small frame size across all origins, directions and actions',()=>{
 for(let i=0;i<10;i++)for(const dir of ['down','up','side'])for(const action of ['idle','walk','sprint','interact','hack']){calls=[];const c=frame(preset(i),'default',dir,2,action);assert.equal(c.width,32);assert.equal(c.height,48);assert.ok(calls.length>200);for(const [x,y,w,h]of calls){assert.ok(x>=0&&y>=0&&x+w<=32&&y+h<=48,JSON.stringify({i,dir,action,x,y,w,h}));}}
});
test('custom colors, hair, clothes and facing affect the rendered sprite',()=>{
 const a=preset(1);const capture=(look,outfit='default',dir='down')=>{calls=[];frame(look,outfit,dir,1,'walk');return JSON.stringify(calls);};const base=capture(a);
 for(const look of [{...a,skin:'#ff3311'},{...a,hair:'long'},{...a,hair:'bald'},{...a,eyeColor:'#11ff22'}])assert.notEqual(capture(look),base);
 assert.notEqual(capture(a,'rose'),base);assert.notEqual(capture(a,'default','up'),base);assert.notEqual(capture(a,'default','side'),base);
});
