'use strict';
// Pack 2: long residential roofs, vehicles, characters. Atlases are cut by tools/build_city_assets2.py.
const P2={long:null,veh:null,chr:null};
function p2img(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>{console.warn('Missing asset',src);r(null);};i.src=src;});}
async function loadPack2Assets(){[P2.long,P2.veh,P2.chr]=await Promise.all([p2img(CITY_LONG_SRC),p2img(CITY_VEH_SRC),p2img(CITY_CHAR_SRC)]);}

/* ---- vehicles: 2x-resolution cells registered under the names the engine already uses ---- */
function applyPack2Vehicles(){
 if(!P2.veh)return;
 for(const kind in VEHICLE_KINDS)for(const dir of ['down','right']){
  const [x,y,w,h]=VEHICLE_CELLS[VEHICLE_KINDS[kind][dir]];
  const strip=document.createElement('canvas');strip.width=w*2;strip.height=h;const c=strip.getContext('2d');
  c.drawImage(P2.veh,x,y,w,h,0,0,w,h);c.drawImage(P2.veh,x,y,w,h,w,0,w,h);   // frame 0 parked, frame 1 moving
  const fw=w/2,fh=h/2;
  BANK['vehicle_'+kind+'_'+dir]={canvas:strip,w:w*2,h,sw:w,sh:h,fw,fh,frames:2,tag:'vehicle',
   ox:dir==='right'?2:Math.round(fw/2),oy:dir==='right'?Math.round(fh/2):2};
 }
}

/* ---- characters: front/back cells animated by bob + sway (the sheet has no side or walk frames) ---- */
const P2_ROLE={player:['main',0],worker:['worker',0],hacker:['tech',0],technician:['worker',1],shopkeeper:['civilian',2],corporate:['business',0],
 punk:['gang',2],courier:['student',1],bartender:['civilian',5],mechanic:['worker',3],security:['security',0],locksmith:['tech',2]};
const P2_CELL_CACHE={};
function p2cell(i){
 if(P2_CELL_CACHE[i])return P2_CELL_CACHE[i];
 const k=CHARACTER_CELLS,c=document.createElement('canvas');c.width=k.cw;c.height=k.ch;
 c.getContext('2d').drawImage(P2.chr,(i%k.cols)*k.cw,Math.floor(i/k.cols)*k.ch,k.cw,k.ch,0,0,k.cw,k.ch);
 return P2_CELL_CACHE[i]=c;
}
function p2pair(prefix){
 const key=prefix==='player'?'player':prefix.replace(/^npc_/,'');
 const [group,n]=P2_ROLE[key]||['civilian',0];
 const list=CHARACTER_PAIRS.filter(p=>p[0]===group);
 const p=list[n%list.length];return [p2cell(p[1]),p2cell(p[2])];
}
function applyPack2Character(prefix,appearance){
 if(prefix==='player'&&appearance?.actor==='custom')return;
 if(typeof applyWalkCharacter==='function'&&applyWalkCharacter(prefix,appearance))return;
 if(!P2.chr)return;
 const [front,back]=p2pair(prefix);
 for(const dir of ['down','up','side'])for(const action of ['idle','walk','sprint','interact','hack']){
  const frames=action==='walk'||action==='sprint'?6:4,base=dir==='up'?back:front;
  const strip=document.createElement('canvas');strip.width=32*frames;strip.height=48;const c=strip.getContext('2d');c.imageSmoothingEnabled=false;
  for(let f=0;f<frames;f++){
   let dy=0,sk=0;
   if(action==='idle')dy=f>=2?-1:0;
   else if(action==='walk'||action==='sprint'){const k=action==='sprint'?1.6:1;dy=(f%3===1)?-2*k|0:0;sk=[0,.06,0,0,-.06,0][f]*k;}
   else dy=[0,-1,-2,-1][f];
   c.save();c.translate(f*32+16,47);c.transform(1,0,sk,1,0,0);c.drawImage(base,-16,-47+dy);c.restore();
  }
  BANK[prefix+'_'+action+'_'+dir]={canvas:strip,w:strip.width,h:48,fw:32,fh:48,ox:16,oy:47,frames,tag:'character'};
 }
}
function applyPack2Assets(){
 applyPack2Vehicles();
 if(P2.chr||(typeof WALK_IMAGES!=='undefined'&&WALK_IMAGES[0])){
  Object.keys(P2_ROLE).forEach(k=>applyPack2Character(k==='player'?'player':'npc_'+k));
  const bake=bakeCharacter;                       // the identity editor re-bakes the player: keep the new art on top
  bakeCharacter=function(prefix,a,o){bake(prefix,a,o);applyPack2Character(prefix,a);};
 }
}

/* ---- parks: whole-lot scenes on the 3 park rectangles + hand-picked props everywhere else ---- */
P2.parks=null;
async function loadParksAssets(){P2.parks=await p2img(CITY_PARKS_SRC);}
function p2scaled(r,fwGame){   // downscale once, at 2x game resolution, so the pixels stay crisp in the world
 const fw=fwGame,fh=Math.max(1,Math.round(r[3]*fw/r[2])),c=document.createElement('canvas');c.width=fw*2;c.height=fh*2;
 const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(P2.parks,r[0],r[1],r[2],r[3],0,0,c.width,c.height);
 return {canvas:c,w:c.width,h:c.height,sw:c.width,sh:c.height,fw,fh,frames:1,ox:Math.round(fw/2),oy:fh-1,tag:'prop'};
}
function applyPack2Props(){
 if(!P2.parks)return;
 const pr=CITY_PARKS.props;
 BANK.prop_bench=p2scaled(pr.bench_a,16);BANK.prop_bush=p2scaled(pr.hedge,16);
 BANK.prop_fence=p2scaled(pr.fence,16);BANK.prop_trash=p2scaled(pr.bin,9);
 P2.trees=[['tree_a',30],['tree_b',24],['tree_c',18]].map(([k,h])=>{const r=pr[k];return p2scaled(r,Math.round(r[2]*h/r[3]));});
}
function drawParkTree(ctx,sx,sy,seed){
 if(!P2.trees)return false;
 const t=P2.trees[(seed%7<4)?0:(seed%7<6?1:2)];
 ctx.drawImage(t.canvas,0,0,t.sw,t.sh,Math.round(sx-t.ox),Math.round(sy-t.oy),t.fw,t.fh);return true;
}
function assignParkScenes(world){
 if(!P2.parks||world.interior||world.minipixel||!world.parks)return;
 const S=CITY_PARKS.scenes,used=new Set();world.parkScenes=[];
 for(const p of world.parks){
  const t=p.w/p.h,r=S.map((s,i)=>({i,err:Math.abs(Math.log((s[2]/s[3])/t))+(used.has(i)?9:0)})).sort((a,b)=>a.err-b.err)[0];
  used.add(r.i);world.parkScenes.push({x:p.x,y:p.y,w:p.w,h:p.h,i:r.i});
  world.props=world.props.filter(q=>{const tx=Math.floor(q.x/16),ty=Math.floor(q.y/16);
   const inside=tx>=p.x&&tx<p.x+p.w&&ty>=p.y&&ty<p.y+p.h&&/^prop_(tree|tree_slim|bush|bench)$/.test(q.kind);
   if(inside&&q.solid)world.solid[ty*MW+tx]=0;return !inside;});   // the scene is walkable; its trees are drawn into the picture
 }
}
function drawParkScenes(c,W){
 if(!P2.parks||!W.parkScenes)return;
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 for(const p of W.parkScenes){const s=CITY_PARKS.scenes[p.i];c.drawImage(P2.parks,s[0],s[1],s[2],s[3],p.x*16,p.y*16,p.w*16,p.h*16);}
 c.restore();
}
