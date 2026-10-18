'use strict';
// Buildings: sprites cut from the NULL//CITY building sheets (tools/build_city_assets.py), real alpha.
// Each lot keeps its collision footprint, door and tenant logic; only the picture changes.
let CITY_BUILDING_IMG=null;
async function loadBuildingAssets(){
 await new Promise(resolve=>{const im=new Image();im.onload=()=>{CITY_BUILDING_IMG=im;resolve();};
  im.onerror=()=>{console.warn('Building atlas unavailable; using procedural façades');resolve();};im.src=CITY_BUILDING_SRC;});
}
// Pick the sprite whose proportions best fit the lot, rotating through the closest few so a street never repeats one house.
function assignBuildingSprites(world){
 if(!CITY_BUILDING_IMG||world.interior||world.minipixel)return;
 const used=new Map(),usedLong=new Map();
 for(const b of world.buildings){
  if(b.objectAsset)continue;
  if(typeof P2!=='undefined'&&P2.long&&b.h/b.w>=1.25){   // long lots get the vertical roof set, never rotated
   const t=b.w/b.h,r=LONG_BUILDINGS.map((s,i)=>({i,err:Math.abs(Math.log((s[2]/s[3])/t)),u:usedLong.get(i)||0})).sort((p,q)=>p.u-q.u||p.err-q.err);
   const pool=r.filter(x=>x.u===r[0].u).sort((p,q)=>p.err-q.err).slice(0,4),pk=pool[Math.floor(hash2(b.x,b.y,3301)*pool.length)];
   b.cityLong=pk.i;usedLong.set(pk.i,pk.u+1);continue;
  }
  const target=b.w/b.h;
  const ranked=CITY_BUILDINGS.map((s,i)=>({i,err:Math.abs(Math.log((s[2]/s[3])/target))})).sort((p,q)=>p.err-q.err).slice(0,7);
  ranked.sort((p,q)=>(used.get(p.i)||0)-(used.get(q.i)||0)||p.err-q.err);
  const least=used.get(ranked[0].i)||0,pool=ranked.filter(r=>(used.get(r.i)||0)===least).slice(0,3);
  const pick=pool[Math.floor(hash2(b.x,b.y,2207)*pool.length)];
  b.citySprite=pick.i;used.set(pick.i,(used.get(pick.i)||0)+1);
 }
 // The sprites paint their own lit windows; the old per-window glow would float in the wrong places.
 world.lights=world.lights.filter(l=>l.kind!=='window');
}
function drawCitySprite(c,b){
 const long=b.cityLong!==undefined,s=long?LONG_BUILDINGS[b.cityLong]:CITY_BUILDINGS[b.citySprite];if(!s)return;
 c.save();c.imageSmoothingEnabled=false;
 c.drawImage(long?P2.long:CITY_BUILDING_IMG,s[0],s[1],s[2],s[3],b.x*16,b.y*16,b.w*16,b.h*16);
 c.restore();
}
