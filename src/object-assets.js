'use strict';
// User artwork stays separate from game logic. Placement and interaction are data.
const OBJECT_ASSETS={};   // the isometric ramen shop was replaced by the city building set (assets/objects kept for reference)
const OBJECT_IMAGES=new Map();
async function loadObjectAssets(){
 await Promise.all(Object.entries(OBJECT_ASSETS).map(([id,asset])=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{OBJECT_IMAGES.set(id,image);resolve();};
  image.onerror=()=>{console.warn('Object artwork unavailable; using original building:',id);resolve();};image.src=asset.src;
 })));
}
function attachObjectAssets(world){
 for(const [id,asset]of Object.entries(OBJECT_ASSETS)){
  if(asset.district!==world.id||!OBJECT_IMAGES.has(id))continue;
  const b=world.buildings.find(b=>b.x===asset.tile.x&&b.y===asset.tile.y);
  if(!b||b.objectAsset===id)continue;
  b.objectAsset=id;
  // Release only this building's old lot, never neighbouring streets or buildings.
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
   const i=y*MW+x;world.solid[i]=0;world.ground[i]=G.PLAZA;
  }
  const frame=objectFrame(b,asset);
  b.objectFootprint=asset.footprint.map(([x,y])=>[frame.left+x*frame.width,frame.top+y*frame.height]);
  b.objectEntrance={x:frame.left+asset.entrance.x*frame.width,y:frame.top+asset.entrance.y*frame.height};
  world.objectColliders=world.buildings.filter(v=>v.objectFootprint).map(v=>v.objectFootprint);
 }
}
function objectFrame(b,a){
 const width=a.widthTiles*16,height=width*a.crop[3]/a.crop[2];
 return {width,height,left:(b.x+b.w/2)*16-width*a.anchor.x,top:(b.y+b.h)*16-height*a.anchor.y};
}
function objectContains(polygon,x,y){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [ax,ay]=polygon[i],[bx,by]=polygon[j];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function objectDrawables(world){
 return world.buildings.filter(b=>b.objectAsset&&OBJECT_IMAGES.has(b.objectAsset)).map(b=>{
  const a=OBJECT_ASSETS[b.objectAsset],image=OBJECT_IMAGES.get(b.objectAsset),width=a.widthTiles*16,height=width*a.crop[3]/a.crop[2];
  return {x:(b.x+b.w/2)*16,y:(b.y+b.h)*16,sy:objectFrame(b,a).top+height*a.depth,
   draw(ctx,x,y){ctx.drawImage(image,...a.crop,Math.round(x-width*a.anchor.x),Math.round(y-height*a.anchor.y),width,height);}};
 });
}
