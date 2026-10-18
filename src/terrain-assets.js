'use strict';
// Terrain: clean 32px tiles cut from the NULL//CITY road sheet (tools/build_city_assets.py).
// The atlas has real alpha; no checkerboard is ever sampled at render time.
const CITY_TERRAIN_SRC='assets/city/terrain.png';
const CITY_TERRAIN_META={"asph0":[0,0],"asph1":[32,0],"asph2":[64,0],"asph3":[96,0],"wet0":[128,0],"wet1":[160,0],"walk0":[192,0],"walk1":[224,0],"walk2":[0,32],"walk3":[32,32],"kerb_n":[64,32],"kerb_e":[96,32],"kerb_s":[128,32],"kerb_w":[160,32],"kerb_ne":[192,32],"kerb_nw":[224,32],"kerb_se":[0,64],"kerb_sw":[32,64],"cross_v":[64,64],"cross_h":[96,64],"dash_v":[128,64],"dash_h":[160,64],"manhole":[192,64],"drain":[224,64],"plaza0":[0,96],"plaza1":[32,96],"plaza2":[64,96],"alley0":[96,96],"alley1":[128,96],"path0":[160,96]};
let CITY_TERRAIN_IMG=null;
const ROAD_PACK_SOURCES=['assets/terrain/asphalt_paving_additional_tiles.png','assets/terrain/asphalt_cobblestone_full_tileset.png'];
const ROAD_PACK_IMAGES=[];
async function loadTerrainAssets(){
 await Promise.all(ROAD_PACK_SOURCES.map((src,i)=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{ROAD_PACK_IMAGES[i]=image;resolve();};
  image.onerror=()=>{console.warn('Road material unavailable:',src);resolve();};image.src=src;
 })));
 await new Promise(resolve=>{const im=new Image();im.onload=()=>{CITY_TERRAIN_IMG=im;resolve();};im.onerror=()=>{console.warn('City terrain atlas unavailable; using procedural paving');resolve();};im.src=CITY_TERRAIN_SRC;});
}
function terrainRoad(g){return g===G.ROAD||g===G.ROADWET||g===G.CROSS;}
function terrainTile(c,name,x,y){
 const o=CITY_TERRAIN_META[name];if(!o)return;
 c.drawImage(CITY_TERRAIN_IMG,o[0],o[1],32,32,x*16,y*16,16,16);   // baked canvas is 2x: 1 source px = 1 output px
}
function drawPackRoad(c,x,y,g,W){
 const image=ROAD_PACK_IMAGES[0];if(!image)return false;
 const px=x*16,py=y*16,bx=Math.floor(x/2),by=Math.floor(y/2);
 c.save();c.beginPath();c.rect(px,py,16,16);c.clip();
 // Opaque backing also prevents the old base layer bleeding through antialiased edges.
 c.fillStyle='#303137';c.fillRect(px,py,16,16);
 c.imageSmoothingEnabled=false;
 c.save();c.translate(bx*32+(bx%2?32:0),by*32+(by%2?32:0));
 c.scale(bx%2?-1:1,by%2?-1:1);
 // Crop excludes the detached tile border. Alternating reflection makes shared edges identical.
 // Original smooth charcoal asphalt belongs on the carriageway.
 c.drawImage(image,246,38,174,180,0,0,32,32);c.restore();
 c.fillStyle='rgba(14,24,36,.12)';c.fillRect(px,py,16,16);
 const d=W.decal[y*MW+x];
 if(g===G.CROSS){
  for(let k=0;k<16;k+=8){
   if(W.vary[y*MW+x]===1)c.drawImage(image,468,142,54,10,px+k+1,py,5,16);
   else c.drawImage(image,468,142,54,10,px,py+k+1,16,5);
  }
 }else if(d===D_DASH_H||d===D_DASH_V){
  c.save();c.translate(px+8,py+8);if(d===D_DASH_H)c.rotate(Math.PI/2);
  c.drawImage(image,696,45,10,100,-.75,-5,1.5,10);c.restore();
 }else if(d===D_MANHOLE&&ROAD_PACK_IMAGES[1]){
  c.save();c.beginPath();c.arc(px+8,py+8,5,0,Math.PI*2);c.clip();
  c.drawImage(ROAD_PACK_IMAGES[1],669,37,70,69,px+3,py+3,10,10);c.restore();
 }
 if(g===G.TRACKS){c.fillStyle='#74777b';c.fillRect(px,py+3,16,1);c.fillRect(px,py+12,16,1);}
 c.restore();return true;
}
function drawPackPaving(c,x,y,g,W){
 const image=ROAD_PACK_IMAGES[0];if(!image)return false;
 const px=x*16,py=y*16,bx=Math.floor(x/2),by=Math.floor(y/2);
 c.save();c.beginPath();c.rect(px,py,16,16);c.clip();c.imageSmoothingEnabled=false;
 c.fillStyle='#45454a';c.fillRect(px,py,16,16);
 c.save();c.translate(bx*32+(bx%2?32:0),by*32+(by%2?32:0));c.scale(bx%2?-1:1,by%2?-1:1);
 c.drawImage(image,674,712,176,184,0,0,32,32);c.restore();
 // Keep only the narrow kerb edge from the old atlas, never its pavement background.
 const road=(xx,yy)=>xx>=0&&xx<MW&&yy>=0&&yy<MH&&terrainRoad(W.ground[yy*MW+xx]);
 const n=road(x,y-1),e=road(x+1,y),s=road(x,y+1),w=road(x-1,y);
 if(CITY_TERRAIN_IMG&&(n||e||s||w)){
  const name=s&&e?'kerb_se':s&&w?'kerb_sw':n&&e?'kerb_ne':n&&w?'kerb_nw':s?'kerb_s':n?'kerb_n':e?'kerb_e':'kerb_w';
  c.save();c.beginPath();if(n)c.rect(px,py,16,2);if(s)c.rect(px,py+14,16,2);if(w)c.rect(px,py,2,16);if(e)c.rect(px+14,py,2,16);c.clip();terrainTile(c,name,x,y);c.restore();
 }
 if(W.decal[y*MW+x]===D_DRAIN)c.drawImage(image,287,588,91,65,px+3,py+5,10,7);
 if(g===G.STAIRS){c.fillStyle='#727174';for(let k=3;k<16;k+=4)c.fillRect(px,py+k,16,1);}
 c.restore();return true;
}
function drawAtlasTerrain(c,x,y,g,W){
 if([G.SIDEWALK,G.UNDER,G.PLAZA,G.ALLEY,G.PATH,G.QUAY,G.STAIRS].includes(g)&&drawPackPaving(c,x,y,g,W))return true;
 if([G.ROAD,G.ROADWET,G.CROSS,G.TRACKS,G.RAMP].includes(g)&&drawPackRoad(c,x,y,g,W))return true;
 if(!CITY_TERRAIN_IMG)return false;
 const at=(xx,yy)=>xx>=0&&xx<MW&&yy>=0&&yy<MH?W.ground[yy*MW+xx]:G.BUILDING;
 const h=hash2(x,y,1101),v=W.vary[y*MW+x];
 c.save();c.imageSmoothingEnabled=false;
 let handled=true;
 if(g===G.SIDEWALK||g===G.UNDER){
  const cs=terrainRoad(at(x,y+1)),cn=terrainRoad(at(x,y-1)),ce=terrainRoad(at(x+1,y)),cw=terrainRoad(at(x-1,y));
  if(g===G.UNDER)terrainTile(c,'walk'+(h*4|0),x,y);
  else if(cs&&ce)terrainTile(c,'kerb_se',x,y);else if(cs&&cw)terrainTile(c,'kerb_sw',x,y);
  else if(cn&&ce)terrainTile(c,'kerb_ne',x,y);else if(cn&&cw)terrainTile(c,'kerb_nw',x,y);
  else if(cs)terrainTile(c,'kerb_s',x,y);else if(cn)terrainTile(c,'kerb_n',x,y);
  else if(ce)terrainTile(c,'kerb_e',x,y);else if(cw)terrainTile(c,'kerb_w',x,y);
  else terrainTile(c,'walk'+(h*4|0),x,y);
 }else if(g===G.ROAD||g===G.ROADWET){
  terrainTile(c,hash2(x,y,17)<.30?'wet'+(h*2|0):'asph'+(h*4|0),x,y);
 }else if(g===G.CROSS)terrainTile(c,v===1?'cross_v':'cross_h',x,y);
 else if(g===G.PLAZA)terrainTile(c,v===3?'plaza2':v===1?'plaza1':'plaza0',x,y);
 else if(g===G.ALLEY)terrainTile(c,'alley'+(v===1?1:0),x,y);
 else if(g===G.PATH)terrainTile(c,'path0',x,y);
 else handled=false;                      // quay, tracks, stairs, ramp keep the procedural paving
 if(handled){
  const d=W.decal[y*MW+x];
  if(g!==G.CROSS){
   if(d===D_DASH_V)terrainTile(c,'dash_v',x,y);else if(d===D_DASH_H)terrainTile(c,'dash_h',x,y);
   else if(d===D_MANHOLE)terrainTile(c,'manhole',x,y);else if(d===D_DRAIN)terrainTile(c,'drain',x,y);
  }
 }
 c.restore();return handled;
}
