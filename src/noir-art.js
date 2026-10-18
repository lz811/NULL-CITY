'use strict';
// SIGNAL LOST: deterministic modular art on the existing collision grid.
// Pure Canvas architecture. No external facade files, no bitmap stretching.
// All decoration is fitted inside the existing 16px collision-tile footprint.
const NOIR={void:'#05040d',night:'#0a0a16',blue:'#1a1840',wet:'#2a3a6a',warm:'#58ffb4',paper:'#d6e8e0',pink:'#ff3d8a',cyan:'#19e6ec'};
// ALIEN THEME: toxic glow colours, light-colour remap, shared helpers.
const GLOW=['#39ff9a','#b44bff','#19e6ec','#ff3d8a','#c8ff4a','#ff7a2a'];
const ALIEN_LIGHT={y:'#58ffb4',z:'#c9ffe8',x:'#ff4d9a',w:'#a02a6a',o:'#8a7bff',k:'#19e6ec',l:'#9efff0',s:'#ff3d8a',v:'#b6ff4a',j:'#2bffb0',q:'#9a8aff',t:'#d06aff',n:'#6a5cff',h:'#b44bff'};
function alienLight(k){return ALIEN_LIGHT[k]||PAL[k];}
// Warm, chipped paving shared by roads, courtyards and the imported ramen shop.
function drawCityPaving(c,x,y,g,W){
 if(typeof drawAtlasTerrain==='function'&&drawAtlasTerrain(c,x,y,g,W))return;
 const px=x*16,py=y*16,n=hash2(x,y,981);
 const road=g===G.ROAD||g===G.ROADWET||g===G.CROSS;
 const colors=road?['#94765f','#a48769','#91725c','#ad8c6c']:['#b89a75','#c4a47d','#ab8c6c','#c9ac83'];
 c.fillStyle='#473b3d';c.fillRect(px,py,16,16);
 // Offset joints, chipped corners and a shaded lower lip avoid a square tile grid.
 for(let row=0;row<2;row++){
  const yy=py+row*8,split=4+Math.floor(hash2(x,y*2+row,982)*8);
  for(const [left,right]of [[0,split],[split,16]]){
   c.fillStyle=colors[Math.floor(hash2(x*3+left,y*2+row,983)*colors.length)];
   c.beginPath();c.moveTo(px+left+1,yy+1);c.lineTo(px+right-2,yy+1);
   c.lineTo(px+right-1,yy+3);c.lineTo(px+right-1,yy+6);
   c.lineTo(px+right-3,yy+7);c.lineTo(px+left+1,yy+6);c.closePath();c.fill();
   c.fillStyle=road?'#c2a17a':'#e1c397';c.fillRect(px+left+2,yy+1,Math.max(1,right-left-5),.5);
   c.fillStyle='#705642';c.fillRect(px+left+2,yy+6,Math.max(1,right-left-4),1);
  }
 }
 if(n>.63){c.strokeStyle='#5a4540';c.lineWidth=.7;c.beginPath();c.moveTo(px+3,py+1);c.lineTo(px+5,py+4);c.lineTo(px+4,py+6);c.stroke();}
 if(g===G.CROSS){c.fillStyle='#e3cfaa';c.globalAlpha=.55;for(let k=2;k<16;k+=6)W.vary[y*MW+x]?c.fillRect(px+k,py+2,2,12):c.fillRect(px+2,py+k,12,2);c.globalAlpha=1;}
 const decal=W.decal[y*MW+x];c.fillStyle='#d8b878';
 if(decal===D_DASH_H)c.fillRect(px+3,py+7,9,1);
 if(decal===D_DASH_V)c.fillRect(px+7,py+3,1,9);
}
function polishCity(c,W){
 const R=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x|0,y|0,w|0,h|0);};
 W.reflectionSurfaces=[];W.noirWindows=[];
 // Four materials: asphalt, laid stone, service concrete and water.
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
  const n=hash2(x,y,901),g=W.ground[y*MW+x],px=x*16,py=y*16;
  if(g===G.BUILDING)continue;
  if([G.SIDEWALK,G.ROAD,G.ROADWET,G.CROSS,G.PLAZA,G.ALLEY,G.PATH,G.QUAY,G.TRACKS,G.UNDER,G.STAIRS,G.RAMP].includes(g)){
   drawCityPaving(c,x,y,g,W);continue;
  }
  const stone=g===G.PLAZA,road=g===G.ROAD,water=g===G.WATER;
  R(px,py,16,16,water?'#071a22':stone?'#262e48':road?'#0a0f1b':g===G.GRASS?'#08221f':g===G.PATH?'#322e42':'#222a42');
  if(g===G.GRASS){
   for(let i=0;i<22;i++){const xx=px+(i*7+x)%16,yy=py+(i*3+y)%16;c.fillStyle=['#0d4a3c','#116652','#17977a','#5a2a9a','#093a34'][i%5];c.fillRect(xx+.5*(i%2),yy,1,.5+(i%4===0?.5:0));}
   // bioluminescent spores in the moss
   for(let i=0;i<3;i++)if(hash2(x*3+i,y,917)>.62){const sx=px+hash2(x,y*3+i,918)*14,sy=py+hash2(x*5+i,y,919)*14,gc=GLOW[(x+y+i)%3];c.globalAlpha=.16;c.fillStyle=gc;c.fillRect(sx-1,sy-1,3,3);c.globalAlpha=.85;c.fillRect(sx,sy,1,1);c.globalAlpha=1;}
  }
  if(stone){for(let yy=0;yy<16;yy+=4)for(let xx=0;xx<16;xx+=8){const off=(yy%8?4:0);R(px+((xx+off)%16),py+yy,7,3,['#262f4a','#1e263c','#2e3858'][Math.floor(hash2(x+xx,y+yy,64)*3)]);}
   // faint glowing seams between basalt slabs
   if(hash2(x,y,931)>.7){c.globalAlpha=.3;c.fillStyle=GLOW[(x*7+y)%3];c.fillRect(px+(hash2(x,y,932)*10|0),py+3,6,.5);c.globalAlpha=1;}}
  else for(let i=0;i<9;i++)R(px+(i*7+x)%16,py+(i*3+y)%16,1,1,n>.5?'#1d2740':'#060912');
  if(g===G.CROSS){for(let k=1;k<16;k+=5)W.vary[y*MW+x]?R(px+k,py+1,3,14,'#45557f'):R(px+1,py+k,14,3,'#45557f');}
  const d=W.decal[y*MW+x];if(d===D_DASH_H)R(px+2,py+7,11,1,'#6a4cff');if(d===D_DASH_V)R(px+7,py+2,1,11,'#6a4cff');
  if(road){for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const g2=W.ground[(y+dy)*MW+x+dx];if(g2!==G.ROAD&&g2!==G.CROSS&&g2!==undefined){R(px+(dx>0?14:0),py+(dy>0?14:0),dx?2:16,dy?2:16,'#2c3652');}}}
  if(!road&&!water&&!stone&&g!==G.GRASS&&g!==G.PATH){R(px,py,16,1,'#2a3350');R(px,py,1,16,'#1a2138');}
  // glowing fissures in the street: thin, jagged, mostly dormant
  if(road&&n>.9){let fx=px+3+(n*97%6|0),fy=py;const fc=GLOW[(x+y)%3];for(let k=0;k<16;k+=2){c.globalAlpha=.09;c.fillStyle=fc;c.fillRect(fx-1,fy+k,3,2);c.globalAlpha=.5;c.fillRect(fx,fy+k,1,2);fx+=(hash2(x,y+k,933)>.5?1:-1)*(hash2(x+k,y,934)>.6?1:0);c.globalAlpha=1;}}
  if(n>.78&&!water&&g!==G.CROSS&&g!==G.GRASS&&g!==G.PATH)W.reflectionSurfaces.push({x:px+8,y:py+9,seed:n,width:10+Math.floor(n*12)});
  for(let k=0;k<12;k++){c.fillStyle=['#4a5c8a','#2a3a5c','#101a30','#6a7ca8'][k%4];c.globalAlpha=.35;c.fillRect(px+((k*19+x*7)%32)/2,py+((k*11+y*3)%32)/2,.5,.5);}c.globalAlpha=1;
  if(n<.1){R(px+3,py+6,4,1,'#04060d');R(px+7,py+7,3,1,'#04060d');}
 }
 W.buildings.forEach((b,i)=>{
  // Residential quarters stay unbranded: apartment houses are not neon stores.
  b.residential = b.type==='apartment' || (!['workshop','tech','konbini','cafe'].includes(b.type) && (Math.floor(b.x/13)+Math.floor(b.y/11))%3===0 && hash2(b.x,b.y,736)>.24);
 });
 // Pass 1: cast shadows and ambient occlusion on walkable ground. Buildings are
 // painted afterwards, so a shadow can never smear over a neighbouring facade.
 if(typeof drawParkScenes==='function')drawParkScenes(c,W);
 W.buildings.forEach(b=>drawBuildingShadow(c,b,W));
 // Pass 2: volumetric buildings (roof + parapet, cornice, facade, ground floor).
 W.buildings.forEach((b,i)=>drawBuilding(c,b,i,W));
 // Pass 3: crowns (spires, beacons) painted last so no neighbour can overdraw them.
 W.buildings.forEach((b,i)=>drawCrown(c,b,i));
}

/* ======================================================================
   VOLUMETRIC BUILDING RENDERER
   Light comes from the upper left. Every surface is built from a lit face,
   a mid tone and a shaded face; every protruding element throws a shadow.
   The static canvas is baked at 2x, so details are placed on a half-pixel grid.
   ====================================================================== */
const _hexCache=new Map();
function hexRGB(h){let v=_hexCache.get(h);if(!v){v=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];_hexCache.set(h,v);}return v;}
const _h2=n=>(n<16?'0':'')+n.toString(16);
function mixc(a,b,t){const A=hexRGB(a),B=hexRGB(b);t=Math.max(0,Math.min(1,t));return '#'+_h2(Math.round(A[0]+(B[0]-A[0])*t))+_h2(Math.round(A[1]+(B[1]-A[1])*t))+_h2(Math.round(A[2]+(B[2]-A[2])*t));}
const lite=(c,t)=>mixc(c,'#ffffff',t),dk=(c,t)=>mixc(c,'#04060e',t);
const q2=v=>Math.round(v*2)/2;
function BR(c,x,y,w,h,col,a){const x0=q2(x),y0=q2(y),x1=q2(x+w),y1=q2(y+h);if(x1<=x0||y1<=y0)return;if(a!==undefined)c.globalAlpha=a;c.fillStyle=col;c.fillRect(x0,y0,x1-x0,y1-y0);if(a!==undefined)c.globalAlpha=1;}
// Stepped vertical gradient: n flat bands, so it still reads as pixel art.
function BG(c,x,y,w,h,top,bot,n){n=Math.max(2,Math.min(n|0,Math.ceil(h*2)));for(let k=0;k<n;k++)BR(c,x,y+h*k/n,w,h/n,mixc(top,bot,k/(n-1)));}
function BD(c,cx,cy,rx,ry,col){for(let dy=-ry;dy<ry;dy+=.5){const t=(dy+.25)/ry,half=rx*Math.sqrt(Math.max(0,1-t*t));BR(c,cx-half,cy+dy,half*2,.5,col);}}
// Paint only on walkable ground (never over another building).
function groundPaint(c,W,x,y,w,h,col,a){
 const tx0=Math.floor(x/16),tx1=Math.floor((x+w-.01)/16),ty0=Math.floor(y/16),ty1=Math.floor((y+h-.01)/16);
 c.fillStyle=col;c.globalAlpha=a;
 for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
  if(tileSolid(W,tx,ty))continue;
  const ax=Math.max(x,tx*16),ay=Math.max(y,ty*16),bx=Math.min(x+w,tx*16+16),by=Math.min(y+h,ty*16+16);
  if(bx>ax&&by>ay)c.fillRect(q2(ax),q2(ay),q2(bx)-q2(ax),q2(by)-q2(ay));
 }
 c.globalAlpha=1;
}
// Sixteen painted facades: wall, trim, accent, awning pair, roof tile.
const BPAL=[
 {wall:'#271c3e',trim:'#6a58a0',acc:'#7dff6a',awn:['#3a1f5c','#150b26'],tile:'#2c2048'},
 {wall:'#12332f',trim:'#3f8078',acc:'#ff3d8a',awn:['#0f3a3a','#07181c'],tile:'#14403c'},
 {wall:'#3d1822',trim:'#8a4456',acc:'#38ffd0',awn:['#5a1c30','#220a14'],tile:'#4a1c2a'},
 {wall:'#26332c',trim:'#5f8068',acc:'#c36bff',awn:['#2a4a38','#0e1a14'],tile:'#2a3a30'},
 {wall:'#4a4458',trim:'#9a92aa',acc:'#ff5a3c',awn:['#5a4a6a','#1e1a28'],tile:'#403a50'},
 {wall:'#1a2250',trim:'#4a5cb0',acc:'#42ffd6',awn:['#233070','#0c1030'],tile:'#1c2858'},
 {wall:'#36360f',trim:'#80802a',acc:'#b44bff',awn:['#4a4a14','#181806'],tile:'#3a3a14'},
 {wall:'#10121e',trim:'#3a4466',acc:'#00e5ff',awn:['#1c2036','#07080e'],tile:'#161a2c'},
 {wall:'#4a2614',trim:'#905634',acc:'#6bffb0',awn:['#5e2e16','#200e06'],tile:'#4a2616'},
 {wall:'#3a1238',trim:'#8c3c84',acc:'#9cff4a',awn:['#521a50','#1a0818'],tile:'#46163e'},
 {wall:'#1c3a4a',trim:'#4e8ca4',acc:'#ff6a3a',awn:['#1c4a5e','#0a1a22'],tile:'#1e4252'},
 {wall:'#1c3a26',trim:'#4a8c5a',acc:'#ff4aa0',awn:['#1e4a30','#08180e'],tile:'#1e4430'},
 {wall:'#3a3454',trim:'#7c749c',acc:'#a6ff3a',awn:['#4a4270','#16122a'],tile:'#38325a'},
 {wall:'#40281a',trim:'#8c5a38',acc:'#58a0ff',awn:['#52321e','#1a0e08'],tile:'#44281a'},
 {wall:'#0e2a38',trim:'#3a7a94',acc:'#ff8a3a',awn:['#10384a','#061018'],tile:'#103040'},
 {wall:'#341840',trim:'#80489a',acc:'#3dffa0',awn:['#46205a','#140a1c'],tile:'#3a1a4a'}
];
const LIT_COLORS=['#58ffb4','#39ff9a','#b86bff','#8a7bff','#19e6ec','#ff4d9a','#c8ff4a','#e6fff4'];
const bpal=(b,i)=>BPAL[(((b.facadeId||i+1)*7)+i)%BPAL.length];
function bgeo(b){
 const x=b.x*16,y=b.y*16,w=b.w*16,h=b.h*16;
 const face=Math.max(44,Math.min(92,Math.min(h-20,Math.round(h*.6))));
 let gf=34;const upper=face-gf;
 const floors=upper>=16?Math.max(1,Math.round(upper/22)):0;
 if(!floors)gf=face;
 return {x,y,w,h,face,fy:y+h-face,gf,gy:y+h-gf,floors,fh:floors?(face-gf)/floors:0,bottom:y+h};
}
function drawBuildingShadow(c,b,W){
 if(b.objectAsset)return;
 const x=b.x*16,y=b.y*16,w=b.w*16,h=b.h*16;
 for(let k=0;k<10;k++)groundPaint(c,W,x+1,y+h+k,w+Math.max(0,5-k*.5),1,'#02040a',.46*Math.pow(1-k/10,1.4));
 for(let k=0;k<7;k++)groundPaint(c,W,x+w+k,y+7+k*.6,1,h-7,'#02040a',.3*(1-k/7));
 for(let k=0;k<3;k++){groundPaint(c,W,x-1-k,y+h-2,1,3,'#02040a',.14*(1-k/3));}
}
function drawBuilding(c,b,i,W){
 if(b.objectAsset)return;
 if(b.citySprite!==undefined||b.cityLong!==undefined){drawCitySprite(c,b);return;}
 const g=bgeo(b),P=bpal(b,i);
 drawRoof(c,b,i,g,P);
 drawFacadeWall(c,b,i,g,P);
 drawUpperFloors(c,b,i,g,P,W);
 if(b.residential)drawResidentialFront(c,b,i,W);else drawProceduralStorefront(c,b,i,W);
 // Final volume pass: lit left corner, shaded right corner, contact line at the foot.
 BR(c,g.x,g.fy,1.5,g.face,lite(P.wall,.35),.5);
 BR(c,g.x+g.w-4,g.fy,4,g.face,'#02040c',.2);BR(c,g.x+g.w-1.5,g.fy,1.5,g.face,'#02040c',.28);
 BR(c,g.x,g.bottom-.5,g.w,.5,'#02040c',.7);
 // Cold neon rim on the lit edges, and a faint bioluminescent bleed onto the pavement.
 BR(c,g.x,g.y,g.w,.5,P.acc,.6);BR(c,g.x,g.y,.5,g.h,P.acc,.35);BR(c,g.x+g.w-.5,g.y,.5,g.h,P.acc,.18);
 groundPaint(c,W,g.x,g.bottom+1,g.w,2,P.acc,.09);groundPaint(c,W,g.x,g.bottom+3,g.w,3,P.acc,.04);
}
// ---------------------------------------------------------------- ROOF
function drawRoof(c,b,i,g,P){
 const {x,y,w,fy}=g,rh=fy-y,seed=b.seed,industrial=['industrial','warehouse','workshop'].includes(b.type);
 const kinds=industrial?['metal','metal','tar']:b.type==='office'||b.type==='tech'?['tar','gravel','garden']:b.residential?['tile','tar','garden','tile']:['tile','tar','gravel','garden'];
 const kind=kinds[Math.floor(hash2(b.x,b.y,555)*kinds.length)];
 const base=kind==='tile'?P.tile:kind==='metal'?['#1c2434','#1a2636','#20202e','#161c2a'][i%4]:kind==='garden'?'#0e231f':kind==='gravel'?mixc('#2a2836',P.wall,.2):mixc(['#10141e','#14141f','#10181f','#0e1620'][i%4],P.wall,.22);
 BG(c,x,y,w,rh,dk(base,.14),lite(base,.07),Math.min(14,rh|0));
 if(kind==='tile'){
  for(let yy=y+4,row=0;yy<fy-5;yy+=4,row++)for(let xx=x+3+(row%2?2.5:0);xx<x+w-4;xx+=5){
   const n=hash2(xx|0,yy|0,seed),col=mixc(base,n>.5?'#7a6ab0':'#05030c',.06+n*.2);
   BR(c,xx,yy,4.5,3.5,col);BR(c,xx,yy,4.5,.5,lite(col,.35),.6);BR(c,xx,yy+3,4.5,.5,dk(col,.6),.55);BR(c,xx+4,yy,.5,3.5,dk(col,.45),.4);
  }
 }else if(kind==='metal'){
  for(let xx=x+3;xx<x+w-4;xx+=5){BR(c,xx,y+4,.5,rh-9,lite(base,.35),.45);BR(c,xx+1,y+4,1.5,rh-9,lite(base,.1),.4);BR(c,xx+3,y+4,1,rh-9,dk(base,.55),.45);if(((xx-x)/5|0)%4===1)BR(c,xx+2,y+4,.5,rh-9,P.acc,.35);}
  for(let yy=y+16;yy<fy-8;yy+=26){BR(c,x+3,yy,w-6,.5,dk(base,.6),.7);BR(c,x+3,yy+.5,w-6,.5,lite(base,.3),.4);for(let xx=x+6;xx<x+w-6;xx+=8)BR(c,xx,yy+1.5,1,1,lite(base,.45),.5);}
  for(let k=0;k<Math.floor(w/28);k++){const rx=x+8+hash2(k,i,33)*(w-16);BR(c,rx,y+6,1,rh-14,P.acc,.14);}
 }else if(kind==='garden'){
  for(let k=0;k<w*rh/70;k++){const bx=x+6+hash2(k,i,61)*(w-12),by=y+9+hash2(i,k,62)*(rh-20),r=1.5+hash2(k,k,63)*2.5,gc=['#0f3a35','#15584a','#1e8a6a','#4a2a8a'][k%4];BD(c,bx+1,by+1,r,r*.8,'#02080a');BD(c,bx,by,r,r*.8,gc);BD(c,bx-.5,by-.5,r*.55,r*.45,lite(gc,.2));if(k%3===0){const gl=GLOW[k%GLOW.length];c.globalAlpha=.18;BD(c,bx,by-r*.3,r*.9+1,r*.9+1,gl);c.globalAlpha=1;BR(c,bx-.5,by-r*.5,1.5,1.5,gl);}}
 }else{
  for(let k=0;k<w*rh/36;k++){const n=hash2(k,i,71),px=x+4+hash2(k,i,72)*(w-8),py=y+5+hash2(i,k,73)*(rh-11);BR(c,px,py,.5+n,.5,n>.5?lite(base,.25):dk(base,.35),.5);}
  for(let yy=y+10;yy<fy-8;yy+=14){BR(c,x+3,yy,w-6,.5,dk(base,.5),.45);BR(c,x+3,yy+.5,w-6,.5,lite(base,.18),.25);}
  for(let k=0;k<Math.floor(w/34)+1;k++){let cx=x+8+hash2(k,i,85)*(w-18),cy=y+8;const len=Math.min(rh-18,10+hash2(i,k,86)*18);for(let d=0;d<len;d+=1.5){BR(c,cx-.5,cy+d,2,1.5,P.acc,.08);BR(c,cx,cy+d,.5,1.5,P.acc,.5);cx+=hash2(k+d,i,87)>.5?.5:-.5;}}
  for(let k=0;k<3;k++){const px=x+6+hash2(k,i,81)*(w-30),py=y+10+hash2(i,k,82)*(rh-24);BR(c,px,py,10+k*3,5,hash2(k,i,83)>.5?lite(base,.1):dk(base,.15),.5);}
 }
 if((kind==='tar'||kind==='gravel')&&rh>=34&&w>=56){const px=x+8,py=y+11,pw=w-16,ph=rh-22;BR(c,px,py,pw,ph,lite(base,.06),.35);BR(c,px,py,pw,1,lite(base,.35),.5);BR(c,px,py,1,ph,lite(base,.3),.4);BR(c,px,py+ph-1,pw,1,'#02060c',.4);BR(c,px+pw-1,py,1,ph,'#02060c',.3);}
 // Parapet: lit north/west rim, shaded east rim, long soft shadows cast onto the roof.
 BR(c,x,y,w,4,P.trim);BR(c,x,y,w,.5,lite(P.trim,.55));BR(c,x,y+1,w,.5,lite(P.trim,.2));BR(c,x,y+3,w,1,dk(P.trim,.4));
 BR(c,x,y,3,rh,mixc(P.trim,'#000',.08));BR(c,x,y,.5,rh,lite(P.trim,.5));BR(c,x+2.5,y+3,.5,rh-3,dk(P.trim,.35));
 BR(c,x+w-3,y,3,rh,dk(P.trim,.18));BR(c,x+w-3,y+3,.5,rh-3,lite(P.trim,.18));
 BR(c,x+3,y+4,w-6,3,'#02060c',.38);BR(c,x+3,y+7,w-6,2,'#02060c',.18);BR(c,x+3,y+9,w-6,2,'#02060c',.07);
 BR(c,x+3,y+4,2.5,rh-9,'#02060c',.24);BR(c,x+5.5,y+4,1.5,rh-9,'#02060c',.1);
 BR(c,x+3,fy-5,w-6,1,lite(P.trim,.25),.18);
 // Rooftop equipment on a loose grid, each element a real box with a cast shadow.
 const ix=x+7,iy=y+11,iw=w-14,ih=fy-y-19;
 let feat=null;
 if(iw>=60&&ih>=30&&hash2(b.x,b.y,577)>.28){
  const fw=Math.min(42,iw-34),fh=Math.min(ih-4,42),fx=ix+iw/2-fw/2+(hash2(b.x,b.y,578)-.5)*(iw-fw-26),fy2=iy+(ih-fh)/2;
  feat={x:fx,y:fy2,w:fw,h:fh};roofFeature(c,feat,Math.floor(hash2(b.x,b.y,579)*4),P,seed);
 }
 if(iw>=18&&ih>=14){
  const cols=Math.max(1,Math.floor(iw/25)),rows=Math.max(1,Math.floor(ih/21)),cw=iw/cols,ch=ih/rows;
  for(let r=0;r<rows;r++){const cy=iy+r*ch+ch*.82;BR(c,ix-5,cy,iw+10,1,'#02040a',.5);BR(c,ix-5,cy-.5,iw+10,.5,'#3a4470',.35);}
  for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
   const n=hash2(k,r,seed+9);if(n<.1)continue;
   if(feat&&ix+k*cw<feat.x+feat.w&&ix+(k+1)*cw>feat.x&&iy+r*ch<feat.y+feat.h&&iy+(r+1)*ch>feat.y)continue;
   roofProp(c,Math.floor(n*997)%9,ix+k*cw,iy+r*ch,cw,ch,seed+k*13+r*7,P,industrial);
  }
 }
}
function roofProp(c,kind,x,y,cw,ch,s,P,industrial){
 const R=(a,b,w,h,col,al)=>BR(c,a,b,w,h,col,al),sh=(w,h,d)=>{R(x+d,y+d,w,h,'#02040a',.42);R(x+d+1,y+d+1.5,w,h,'#02040a',.16);};
 const jx=Math.floor(hash2(s,1,2)*Math.max(0,cw-26)),jy=Math.floor(hash2(s,3,4)*Math.max(0,ch-20));x+=jx;y+=jy;
 const metals=['#3a4258','#2e3448','#3a3a50','#2a3a44','#40384e'],mc=metals[s%metals.length],gl=GLOW[s%GLOW.length],halo=(cx,cy,r,col,a)=>{c.globalAlpha=a;BD(c,cx,cy,r,r,col);c.globalAlpha=1;};
 switch(kind){
  case 0:case 5:{ // turbine: dark housing, spinning-blade silhouette, glowing core
   const w=15,h=10,d=4;sh(w,h+d,2.5);
   R(x,y+h,w,d,dk(mc,.5));R(x,y+h,w,.5,lite(mc,.25));for(let k=0;k<3;k++)R(x+1.5,y+h+.8+k*1.1,w-3,.5,dk(mc,.7),.8);
   BG(c,x,y,w,h,lite(mc,.2),mc,4);R(x,y,w,.5,lite(mc,.55));R(x,y,.5,h,lite(mc,.35));R(x+w-.5,y,.5,h,dk(mc,.4));
   BD(c,x+w/2,y+h/2,4,4,'#05060c');BD(c,x+w/2,y+h/2,3.3,3.3,'#10142a');
   R(x+w/2-3,y+h/2-.25,6,.5,gl,.6);R(x+w/2-.25,y+h/2-3,.5,6,gl,.6);halo(x+w/2,y+h/2,4.5,gl,.2);BD(c,x+w/2,y+h/2,1.2,1.2,gl);R(x+w/2-.5,y+h/2-.5,1,1,'#fff',.9);
   R(x+w-3,y+1.5,1,1,gl);break;}
  case 1:{ // bio-pod: bulbous organic tank with glowing veins
   const w=12,h=13;sh(w+1,h-2,3.5);
   R(x+1,y+h,1,5,'#0c0a16');R(x+w-2,y+h,1,5,'#0c0a16');R(x+3,y+h+1,1,3,'#0c0a16');R(x,y+h+4,w,1,'#2a2440');
   const body=['#2a1a4a','#1a3a3a','#3a1a3a'][s%3];
   BD(c,x+w/2,y+h/2+1,w/2,h/2-1,dk(body,.4));BD(c,x+w/2-.3,y+h/2+.7,w/2-.8,h/2-1.6,body);BD(c,x+w/2-1.6,y+h/2-1.5,2,2.5,lite(body,.3));
   for(let k=0;k<3;k++)R(x+2.5+k*3,y+3,.5,h-5,gl,.55);R(x+1.5,y+h/2+1,w-3,.5,gl,.5);halo(x+w/2,y+h/2+1,8,gl,.1);
   R(x+w/2-.5,y-3,1,4,'#2a2440');BD(c,x+w/2,y-3,1.4,1,gl);break;}
  case 2:{ // antenna spike with rings and a pulsing tip
   sh(5,12,2.5);
   for(let k=0;k<10;k++)R(x+1.5+k*.1,y+3+k*.9,.5,.9,mixc('#8a98c8','#1a2038',k/10));
   R(x-.5,y+11,6,1.5,'#14182a');R(x,y+9,5,1,'#2a3050');R(x+1,y+6,3,.5,'#4a5488');R(x+1.5,y+3,2,.5,'#4a5488');
   R(x+2,y-4,.5,8,lite(mc,.4));R(x+1.7,y-5,1.2,1.2,gl);halo(x+2.3,y-4.4,3.5,gl,.28);break;}
  case 3:{ // reactor core: glowing slit under a vaulted lid
   const w=15,h=10;sh(w,h+2,2.5);
   R(x,y+h,w,2,'#161a2c');R(x,y+h,w,.5,'#6a74a0');
   R(x-.5,y-.5,w+1,h+1,'#3a4260');R(x,y,w,h,'#05060e');
   BG(c,x+1,y+1,w-2,h-2,gl,'#2a0a5a',5);
   for(let k=0;k<3;k++)R(x+1+k*4.5,y+1,.5,h-2,'#05060e',.8);R(x+1,y+h/2,w-2,.5,'#05060e',.7);
   halo(x+w/2,y+h/2,9,gl,.1);break;}
  case 4:{ // sensor array: slanted black panels with cold edge-light
   sh(22,12,3);
   for(let r=0;r<2;r++)for(let k=0;k<3;k++){const px=x+k*7.5,py=y+r*6.2;R(px,py,7,5.5,'#05060e');BG(c,px+.5,py+.5,6,4.5,'#1a2a58','#080c1e',3);R(px+.5,py+.5,6,.5,'#19e6ec',.7);R(px+3.2,py+.5,.5,4.5,'#4a6ac8',.4);R(px,py+5,7,.5,'#3a4670');}
   break;}
  case 6:{ // fungal bloom: glowing caps on a dark mound
   const w=17,h=8;sh(w,h,2);
   R(x,y+3,w,h-1,'#161224');R(x,y+3,w,.5,'#3a3258');R(x,y+h+1,w,.5,'#02040a');
   for(let k=0;k<6;k++){const gx=x+2+k*2.6,gc=GLOW[(s+k)%GLOW.length],hh=2+(k*5+s)%4;R(gx-.25,y+3-hh,.5,hh,'#0f3a35');BD(c,gx,y+3-hh,1.4+(k%2)*.6,1.1,gc);halo(gx,y+3-hh,3.2,gc,.14);R(gx-.5,y+2-hh,.5,.5,'#fff',.7);}
   break;}
  case 7:{ // monolith bulkhead with a glowing rune door
   const w=21,h=9,d=8;sh(w,h+d,3.5);
   const wall=mixc(P.wall,'#4a4a68',.3);
   BG(c,x,y+h,w,d,wall,dk(wall,.35),3);R(x,y+h,w,.5,'#02040a',.5);
   R(x+w/2-3,y+h+2,6,d-2,'#05060e');R(x+w/2-2.5,y+h+2.5,5,d-2.5,dk(P.acc,.55));R(x+w/2-.25,y+h+3,.5,d-3.5,P.acc);R(x+w/2-1.5,y+h+4,3,.5,P.acc,.8);
   BG(c,x,y,w,h,lite(P.trim,.05),dk(P.trim,.25),3);R(x,y,w,.5,'#fff',.3);R(x+w-.5,y,.5,h+d,'#02040a',.35);
   for(let k=0;k<3;k++){const ry=y+2+k*2;R(x+4,ry,1,1,P.acc,.8);R(x+6,ry,2+(k%2),.5,P.acc,.55);R(x+13,ry,1,1,P.acc,.7);}
   break;}
  default:{ // plasma conduit with glowing junction nodes
   sh(22,3,2);
   for(let k=0;k<6;k++)R(x,y+k*.5,22,.5,mixc('#6a74a0','#14182a',k/5));
   R(x+6,y-1.5,2,6,dk(gl,.4));R(x+5,y-2,4,1,gl);R(x+15,y-1.5,2,6,'#1a1448');R(x+14,y-2,4,1,'#8a6aff');
   R(x-.5,y-.5,1.5,4,'#1a2038');R(x+21,y-.5,1.5,4,'#1a2038');halo(x+7,y-1.5,4,gl,.18);
   R(x,y+3.5,22,1,'#02040a',.3);}
 }
}
// ---------------------------------------------------------------- WALL
function drawFacadeWall(c,b,i,g,P){
 const {x,w,fy,face,bottom}=g,st=hash2(b.x,b.y,810),industrial=['industrial','warehouse','workshop'].includes(b.type);
 const wall=industrial?mixc(P.wall,'#6a7480',.4):P.wall;
 BG(c,x,fy,w,face,dk(wall,.2),lite(wall,.02),12);
 if(!industrial&&st<.4){ // brick: courses with per-brick variation
  for(let yy=fy+6,row=0;yy<bottom-3;yy+=3,row++){
   BR(c,x+2,yy+2.5,w-4,.5,dk(wall,.5),.45);
   for(let xx=x+2+(row%2?3:0);xx<x+w-3;xx+=6){const n=hash2(xx|0,yy|0,b.seed);BR(c,xx,yy,5.5,2.5,n>.5?lite(wall,.1):dk(wall,.25),.3+n*.2);BR(c,xx+5.5,yy,.5,3,dk(wall,.5),.3);}
  }
 }else if(!industrial&&st<.72){ // stucco with rusticated bands
  for(let k=0;k<(w*face)/18;k++){const n=hash2(k,i,92);BR(c,x+2+hash2(k,i,93)*(w-4),fy+6+hash2(i,k,94)*(face-8),.5+n,.5,n>.5?lite(wall,.3):dk(wall,.5),.35);}
  for(let yy=fy+13;yy<bottom-6;yy+=11){BR(c,x+2,yy,w-4,.5,dk(wall,.5),.45);BR(c,x+2,yy+.5,w-4,.5,lite(wall,.35),.3);}
 }else{ // panelled cladding
  for(let xx=x+2;xx<x+w-3;xx+=12){BR(c,xx,fy+6,.5,face-8,dk(wall,.55),.5);BR(c,xx+.5,fy+6,.5,face-8,lite(wall,.3),.3);}
  for(let yy=fy+12;yy<bottom-5;yy+=14){BR(c,x+2,yy,w-4,.5,dk(wall,.5),.45);for(let xx=x+4;xx<x+w-4;xx+=12)BR(c,xx,yy+1,.5,.5,lite(wall,.4),.5);}
  for(let k=0;k<Math.floor(w/16);k++){const sx=x+4+hash2(k,i,95)*(w-10);BR(c,sx,fy+10,1,10+hash2(i,k,96)*22,'#02040a',.3);}
 }
 // Corner quoins: alternating stone blocks give the building its corners.
 for(let yy=fy+6,k=0;yy<bottom-3;yy+=6,k++){const lw=k%2?4.5:6.5,rw=k%2?6.5:4.5;
  BR(c,x+1.5,yy,lw,5.5,lite(P.trim,.04));BR(c,x+1.5,yy,lw,.5,lite(P.trim,.5),.6);BR(c,x+1.5,yy+5,lw,.5,dk(P.trim,.5),.55);
  BR(c,x+w-1.5-rw,yy,rw,5.5,dk(P.trim,.2));BR(c,x+w-1.5-rw,yy,rw,.5,lite(P.trim,.25),.5);BR(c,x+w-1.5-rw,yy+5,rw,.5,dk(P.trim,.6),.55);}
 // Projecting cornice with dentils, then its shadow sliding down the wall.
 BR(c,x,fy,w,1,lite(P.trim,.5));BR(c,x,fy+1,w,2.5,P.trim);BR(c,x,fy+3.5,w,1.5,dk(P.trim,.45));
 for(let xx=x+3;xx<x+w-5;xx+=4){BR(c,xx,fy+5,2,1,dk(P.trim,.3));BR(c,xx+.5,fy+6,1,1,dk(P.trim,.5));BR(c,xx+.75,fy+7,.5,.5,P.acc,.8);}
 alienVeins(c,b,i,g,P);
 BR(c,x,fy+5,w,3,'#02060c',.42);BR(c,x,fy+8,w,2.5,'#02060c',.22);BR(c,x,fy+10.5,w,2.5,'#02060c',.1);
}
function drawWindow(c,wx,wy,ww,wh,P,s,W,o){
 const R=(a,b,w,h,col,al)=>BR(c,a,b,w,h,col,al),h=k=>hash2(s,k,17);
 const lit=o.lit!==undefined?o.lit:h(1)>.38,lc=LIT_COLORS[Math.floor(h(2)*h(2)*LIT_COLORS.length)];
 const shape=(ww>=8&&wh>=8)?Math.floor(h(6)*3):0,frame=lite(P.trim,.05),cx=wx+ww/2,cy=wy+wh/2;
 // armoured bezel with brow spikes
 R(wx-2,wy-2.5,ww+4,wh+5,'#04050b');
 R(wx-2,wy-2.5,ww+4,.5,lite(P.trim,.5),.8);R(wx-2,wy-2.5,.5,wh+5,lite(P.trim,.3),.6);R(wx+ww+1.5,wy-2.5,.5,wh+5,dk(P.trim,.5),.8);
 R(wx-2.5,wy-3.5,2,1,P.trim);R(wx+ww+.5,wy-3.5,2,1,P.trim);R(wx-2,wy-4.5,1,1,lite(P.trim,.25));R(wx+ww+1,wy-4.5,1,1,lite(P.trim,.25));
 R(wx,wy,ww,wh,'#02030a');
 if(shape===2){ // eye
  if(lit){BD(c,cx,cy,ww/2,wh/2,dk(lc,.6));BD(c,cx,cy,ww/2-.7,wh/2-.7,lc);BD(c,cx-.6,cy-.8,ww/2-2,wh/2-2,lite(lc,.45));R(cx-.75,wy+.8,1.5,wh-1.6,'#02030a');R(cx-.25,cy-.5,.5,1,lc);c.globalAlpha=.16;BD(c,cx,cy,ww/2+2.5,wh/2+2.5,lc);c.globalAlpha=1;}
  else{BD(c,cx,cy,ww/2-.4,wh/2-.4,'#0a1222');BD(c,cx-.7,cy-1,ww/2-2.2,wh/2-2.4,'#12203a');R(cx-.5,wy+1.2,1,wh-2.4,'#02030a');R(cx-.25,cy-.5,.5,1,'#1f4a6a');}
 }else if(shape===1){ // twin slits
  const sw=Math.max(1.5,ww/4),gap=(ww-sw*2)/3;
  for(let k=0;k<2;k++){const sx=wx+gap+k*(sw+gap);
   if(lit){BG(c,sx,wy+1,sw,wh-2,lite(lc,.35),dk(lc,.35),5);R(sx-.5,wy+1,.5,wh-2,lc,.35);R(sx+sw,wy+1,.5,wh-2,lc,.35);}
   else BG(c,sx,wy+1,sw,wh-2,'#14243e','#060a14',4);}
  if(lit){c.globalAlpha=.1;R(wx,wy,ww,wh,lc);c.globalAlpha=1;}
 }else{ // slab with scan-lines and a standing silhouette
  if(lit){BG(c,wx,wy,ww,wh,lite(lc,.22),dk(lc,.5),6);for(let yy=wy+1;yy<wy+wh;yy+=2)R(wx,yy,ww,.5,'#02030a',.2);
   const kind=Math.floor(h(3)*3);
   if(kind===0){BD(c,cx,wy+wh*.42,1.3,1.5,'#04050c');R(cx-1,wy+wh*.42+1,2,wh*.5,'#04050c');}
   else if(kind===1){BD(c,wx+ww*.3,wy+wh-4,2.2,3,'#04050c');R(wx+ww*.3-.25,wy+wh-8,.5,4,'#04050c');}
   else R(wx+ww-5,wy+3,3,2,GLOW[s%GLOW.length]);}
  else BG(c,wx,wy,ww,wh,'#0f1f3a','#04060e',6);
 }
 if(lit)W.noirWindows.push({x:wx,y:wy,w:ww,h:wh,col:lc});
 c.strokeStyle='#ffffff';c.lineWidth=.8;c.globalAlpha=lit?.1:.14;c.beginPath();c.moveTo(wx+1.5,wy+wh-1);c.lineTo(wx+wh*.55,wy+1);c.moveTo(wx+4,wy+wh-1);c.lineTo(wx+wh*.55+3,wy+1);c.stroke();c.globalAlpha=1;
 R(wx,wy,ww,2,'#02060c',.5);R(wx,wy+2,ww,1,'#02060c',.22);R(wx,wy,1.5,wh,'#02060c',.35);
 if(shape===0){R(wx+ww/2-.5,wy,1,wh,frame,.85);R(wx+ww/2-.5,wy,.5,wh,lite(frame,.4),.7);R(wx,wy+wh*.56,ww,1,frame,.85);}
 // sill with a ridge of fangs, plus a cold shadow below
 R(wx-2.5,wy+wh,ww+5,2,lite(P.trim,.18));R(wx-2.5,wy+wh,ww+5,.5,'#fff',.35);R(wx-2.5,wy+wh+2,ww+5,1,dk(P.trim,.5));
 for(let xx=wx-1.5;xx<wx+ww+1;xx+=3)R(xx,wy+wh+3,1,1,dk(P.trim,.4));
 R(wx-2,wy+wh+3,ww+4,2.5,'#02060c',.4);R(wx-1.5,wy+wh+5.5,ww+3,1.5,'#02060c',.16);
 if(lit)R(wx,wy+wh+3.5,ww,2,lc,.1);
 if(o.shutters){const pw=ww+2,ph=Math.round(wh*.45);R(wx-1,wy-1,pw,ph,'#161a2a');R(wx-1,wy-1,pw,.5,lite('#161a2a',.5));for(let yy=wy+.5;yy<wy+ph-1;yy+=1.5)R(wx-1,yy,pw,.5,'#02030a',.6);R(wx-1,wy+ph-1.5,pw,.5,P.acc,.5);}
 if(o.flower){for(let k=0;k<ww;k+=2.5){const gc=GLOW[(k*2+s)%GLOW.length];R(wx+k,wy+wh-1,.5,1.5,'#0f3a35');BD(c,wx+k+.25,wy+wh-1.5,1,1,gc);c.globalAlpha=.16;BD(c,wx+k+.25,wy+wh-1.5,2.4,2.4,gc);c.globalAlpha=1;}}
 if(o.ac){const ax=wx+ww+3.5,ay=wy+wh-2;R(ax+1.5,ay+1.5,6,5,'#02060c',.4);R(ax,ay,6,5,'#1c2236');R(ax,ay,6,.5,lite('#1c2236',.5));for(let k=0;k<3;k++)R(ax+.5,ay+1.2+k*1,5,.5,P.acc,.55);R(ax+1,ay+5,.5,3,P.acc,.35);}
}
function drawBalcony(c,wx,wy,ww,wh,P,s){
 const R=(a,b,w,h,col,al)=>BR(c,a,b,w,h,col,al),bx=wx-4,bw=ww+8,by=wy+wh+1.5,rc=['#1c2234','#251c34','#1a2a30'][s%3],gl=GLOW[s%GLOW.length];
 R(bx+1,by+3,bw,3,'#02060c',.45);R(bx+1.5,by+6,bw-1,2,'#02060c',.16);
 R(bx,by,bw,2.5,lite(P.trim,.1));R(bx,by,bw,.5,'#fff',.35);R(bx,by+2,bw,.5,dk(P.trim,.5));
 R(bx,by-1,bw,1,rc);
 for(let xx=bx;xx<bx+bw;xx+=2.5){R(xx,by-5,.5,4.5,rc);R(xx-.25,by-6,1,1,lite(rc,.6));}
 R(bx,by-5.5,.5,5.5,lite(rc,.4));R(bx+bw-1,by-5.5,1,5.5,dk(rc,.4));
 for(let k=0;k<3;k++){const px=bx+3+k*(bw-6)/2.2;R(px-.25,by-3,.5,2,'#0f3a35');BD(c,px,by-3.4,1.5,1.5,gl);c.globalAlpha=.2;BD(c,px,by-3.4,3.6,3.6,gl);c.globalAlpha=1;}
}
function drawUpperFloors(c,b,i,g,P,W){
 const {x,w,fy,floors,fh}=g,res=b.residential,glass=b.type==='office'||b.type==='tech';
 for(let f=0;f<floors;f++){
  const top=fy+f*fh+(f===0?9:2),avail=fh-(f===0?9:2)-1,wh=Math.max(8,Math.min(17,avail-8)),wy=top+Math.max(3,(avail-wh-7)/2+3);
  const yb=fy+(f+1)*fh-1.5;
  if(f<floors-1){BR(c,x+2,yb,w-4,1,lite(P.trim,.32),.8);BR(c,x+2,yb+1,w-4,1.5,dk(P.trim,.4),.6);BR(c,x+2,yb+2.5,w-4,2,'#02060c',.22);}
  if(glass){
   const bx=x+5,bw=w-10,spand=dk(P.wall,.35);
   BR(c,bx-1,wy-2,bw+2,wh+4,'#0b121b');
   const pw=Math.max(8,Math.floor(bw/Math.max(2,Math.floor(bw/11))));
   for(let px=bx,k=0;px<bx+bw-2;px+=pw,k++){const ww=Math.min(pw-1,bx+bw-px);const s=b.seed+f*31+k*7,lit=hash2(s,2,3)>.4,lc=['#58ffb4','#b86bff','#19e6ec','#8a7bff'][Math.floor(hash2(s,5,6)*4)];
    if(lit){BG(c,px,wy,ww,wh,lite(lc,.28),dk(lc,.55),6);W.noirWindows.push({x:px,y:wy,w:ww,h:wh,col:lc});}else BG(c,px,wy,ww,wh,'#1a2a4a','#05070f',6);
    c.strokeStyle='#fff';c.globalAlpha=.14;c.lineWidth=.8;c.beginPath();c.moveTo(px+1,wy+wh-1);c.lineTo(px+wh*.5,wy+1);c.stroke();c.globalAlpha=1;
    BR(c,px+ww,wy,1,wh,lite(P.trim,.1));BR(c,px,wy,ww,1.5,'#02060c',.4);if(lit){BR(c,px+1,wy+wh-3,ww-2,2.5,dk(lc,.65),.7);}
   }
   BR(c,bx-1,wy+wh+2,bw+2,3,spand);BR(c,bx-1,wy+wh+2,bw+2,.5,lite(spand,.4));BR(c,bx,wy+wh+3.5,bw,.5,P.acc,.9);BR(c,bx-1,wy+wh+5,bw+2,2.5,'#02060c',.3);
   BR(c,bx-1,wy-3,bw+2,1,lite(P.trim,.4));
  }else{
   const n=Math.max(1,Math.floor((w-10)/22)),span=(w-10)/n,ww=Math.min(15,Math.floor(span-8));
   for(let k=0;k<n;k++){
    const s=b.seed+f*31+k*7,wx=x+5+span*(k+.5)-ww/2;
    const balc=res&&hash2(s,9,9)>.4&&f===floors-1&&floors>0||(res&&f===0&&hash2(s,9,8)>.55);
    drawWindow(c,wx,wy,ww,wh,P,s,W,{shutters:!balc&&hash2(s,11,1)>.62,flower:!balc&&hash2(s,12,1)>.72,ac:!balc&&hash2(s,13,1)>.8&&ww>=12&&k<n-1,awning:!balc&&!res&&hash2(s,14,1)>.82});
    if(balc)drawBalcony(c,wx,wy,ww,wh,P,s);
   }
  }
 }
}
// A mix of pipes, drains and fire escapes breaks up the big wall areas.
function drawWallDetails(c,b,i,g,P){
 const {x,w,fy,gy,bottom}=g,R=(a,d,ww,hh,col,al)=>BR(c,a,d,ww,hh,col,al);
 const gutter=hash2(b.x,b.y,311)>.4?'right':'left',gx=gutter==='right'?x+w-9:x+7;
 R(gx,fy+8,2.5,bottom-fy-10,'#232a40');R(gx,fy+8,.5,bottom-fy-10,'#6a78a8');R(gx+2,fy+8,.5,bottom-fy-10,'#06080f');R(gx+1,fy+8,.5,bottom-fy-10,P.acc,.3);
 for(let yy=fy+14;yy<bottom-6;yy+=14){R(gx-.5,yy,3.5,1.5,'#3a4468');R(gx-.5,yy+1.5,3.5,.5,'#06080f',.6);}
 R(gx+3,fy+8,1.5,bottom-fy-10,'#02060c',.22);
 if(hash2(b.x,b.y,312)>.55&&g.floors>=2){ // fire escape landing
  const fx=gutter==='right'?x+5:x+w-24,ey=fy+g.fh+3;
  R(fx+1,ey+2,19,2,'#02060c',.3);R(fx,ey-5,19,.5,'#4a5478');R(fx,ey,19,1,'#14182a');R(fx,ey,19,.5,'#5a6690');for(let xx=fx+1;xx<fx+19;xx+=2)R(xx,ey-5,.5,5,'#14182a',.9);
  for(let k=0;k<5;k++)R(fx+k*2.5,ey+1+k*2,2.5,.5,'#14182a');R(fx,ey+.5,19,.5,P.acc,.25);
 }
}
// One-to-one naming based on immutable world coordinates, so no repeated shops.
// Place-specific quest signage is painted later by places.js and is unchanged.
function uniqueShopLabel(b,index){
 const prefixes=['XENO','VORR','KETH','ZUUL','OMNI','NYX','THRAX','ULM','ORYX','VANTA','SKRY','HYDRA','KRELL','ASH','MORR','ZETH','QOR','LUMEN','ABYSS','SYN'];
 const suffixes=['HIVE','MARKET','CAFE','CLUB','CLINIC','BAZAAR','DEPOT','FORGE','NEST','ARCADE','BAR','CULT'];
 const serial=b.x*128+b.y;
 return prefixes[serial%prefixes.length]+' '+suffixes[Math.floor(serial/prefixes.length)%suffixes.length]+' '+(serial%97+1);
}
function awningStripe(c,x,y,w,hh,c1,c2){
 const R=(a,b,ww,h,col,al)=>BR(c,a,b,ww,h,col,al);
 for(let xx=0;xx<w;xx+=4){const col=(xx/4|0)%2?c2:c1,ww=Math.min(4,w-xx);R(x+xx,y,ww,hh,col);R(x+xx,y+hh,ww,2.5,col);R(x+xx+.5,y+hh+2.5,Math.max(.5,ww-1),1,col);R(x+xx,y+hh+2.5,.5,.5,'#02060c',.4);}
 R(x,y,w,.5,lite(c1,.6),.7);R(x,y+hh*.5,w,hh*.5,'#02060c',.2);R(x,y+hh,w,.5,'#02060c',.5);
 R(x,y+hh+3.5,w,3,'#02060c',.45);R(x,y+hh+6.5,w,2,'#02060c',.17);R(x,y+hh+8.5,w,2,'#02060c',.06);
}
function shopWindow(c,x,y,w,h,glow,s,P){
 const R=(a,b,ww,hh,col,al)=>BR(c,a,b,ww,hh,col,al);
 R(x-1,y-1,w+2,h+2,'#05060c');R(x-1,y-1,w+2,.5,lite('#3a4668',.5));
 BG(c,x,y,w,h,mixc(glow,'#ffffff',.18),dk(glow,.78),6);
 // specimen jars, capsules and glowing tanks behind the glass
 for(let sy=y+4;sy<y+h-2;sy+=5){R(x+1,sy+3,w-2,.5,'#02030a',.8);for(let xx=x+2;xx<x+w-3;xx+=3+hash2(xx|0,sy|0,s)*2.5){const hh=1.5+hash2(sy|0,xx|0,s)*2.5,gc=GLOW[Math.floor(hash2(xx|0,sy|0,s+1)*GLOW.length)],tall=hash2(xx|0,sy|0,s+2)>.6;
  R(xx,sy+3-hh-(tall?1.5:0),2,hh+(tall?1.5:0),dk(gc,.55));R(xx+.5,sy+3-hh-(tall?1.5:0),.5,hh+(tall?1.5:0),gc);R(xx,sy+2.5-hh-(tall?1.5:0),2,.5,'#8a94b8');}}
 R(x,y,w,2,'#02060c',.5);R(x,y+2,w,1.5,'#02060c',.22);R(x,y,1.5,h,'#02060c',.3);
 c.strokeStyle='#fff';c.globalAlpha=.12;c.lineWidth=1;c.beginPath();c.moveTo(x+3,y+h);c.lineTo(x+h*.9,y);c.moveTo(x+8,y+h);c.lineTo(x+h*.9+5,y);c.stroke();c.globalAlpha=1;
 R(x,y+h,w,.5,glow,.5);
}
// ----------------------------------------------------------- GROUND FLOOR
function drawProceduralStorefront(c,b,index,W){
 const g=bgeo(b),P=bpal(b,index),{x,y,w,h,gy,fy,bottom}=g,R=(a,d,ww,hh,col,al)=>BR(c,a,d,ww,hh,col,al);
 const themes=[['#39ff9a','#c2ffe0'],['#b44bff','#e6c0ff'],['#ff3d8a','#ffb8d4'],['#19e6ec','#b0f8fa'],['#ff7a2a','#ffd0a8']];
 const [neon,shine]=themes[((b.facadeId||index)%themes.length)];
 const style=hash2(b.x,b.y,810),industrial=['industrial','warehouse','workshop'].includes(b.type);
 const glow=['#58ffb4','#39ff9a','#b86bff','#19e6ec','#ff4d9a'][Math.floor(hash2(b.x,b.y,66)*5)];
 const dxc=Math.max(x+11,Math.min(x+w-11,b.door.x*16+8));
 const label=uniqueShopLabel(b,index);
 drawWallDetails(c,b,index,g,P);
 // Ground floor: darker, richer base so the shop reads as a recess below the wall.
 R(x+1.5,gy,w-3,g.gf,dk(P.wall,.28));BG(c,x+1.5,gy,w-3,g.gf,dk(P.wall,.5),dk(P.wall,.22),8);
 // Pilasters at both ends frame the shop front.
 for(const px of [x+1.5,x+w-8]){R(px,gy+1,6.5,g.gf-1,lite(P.trim,.02));R(px,gy+1,.5,g.gf-1,lite(P.trim,.5));R(px+5.5,gy+1,1,g.gf-1,dk(P.trim,.45));R(px,gy+1,6.5,1,lite(P.trim,.4));R(px,bottom-5,6.5,5,dk(P.trim,.18));R(px,bottom-5,6.5,.5,lite(P.trim,.3));}
 const wy0=gy+13,wh=Math.max(14,g.gf-13-6),regions=[[x+9,dxc-9],[dxc+9,x+w-9.5]];
 regions.forEach(([a,z],ri)=>{
  const rw=z-a;if(rw<10)return;
  const n=Math.max(1,Math.round(rw/30)),pw=(rw-(n-1)*2)/n;
  for(let k=0;k<n;k++){
   const px=a+k*(pw+2),shuttered=!industrial&&(ri*3+k)>0&&hash2(b.x+k,b.y+ri,43)>.82||industrial&&hash2(b.x,b.y+k,44)>.5;
   // stall riser
   R(px-1,wy0+wh,pw+2,5.5,dk(P.wall,.35));R(px-1,wy0+wh,pw+2,.5,lite(P.trim,.4));for(let tx=px;tx<px+pw;tx+=3)R(tx,wy0+wh+1.5,2.5,3,mixc(P.wall,P.acc,.3+hash2(tx|0,k,5)*.25),.9);
   if(shuttered){R(px-1,wy0-1,pw+2,wh+2,'#2a323a');for(let yy=wy0;yy<wy0+wh;yy+=1.5){R(px,yy,pw,.5,lite('#8d98a0',.1));R(px,yy+.5,pw,1,'#59636b');}R(px,wy0+wh-3,pw,3,'#59636b');R(px+pw/2-2,wy0+wh-2,4,1,'#c3cdd2');R(px,wy0,pw,3,'#02060c',.35);}
   else shopWindow(c,px,wy0,pw,wh,glow,b.seed+k*5+ri*11,P);
   if(!shuttered&&pw>16){R(px+pw/2-.5,wy0,1,wh,'#10161e');}
   // warm light pool on the pavement in front of each lit window
   if(!shuttered)groundPaint(c,W,px,bottom+1,pw,7,glow,.075);
  }
 });
 // Door: deep recess, framed leaf with glass, handle, transom light and a stone step.
 R(dxc-8,gy+13,16,g.gf-13,'#0a1018');R(dxc-8,gy+13,16,1,lite(P.trim,.3));R(dxc-8.5,gy+11,17,2.5,lite(P.trim,.25));R(dxc-8.5,gy+11,17,.5,'#fff',.5);
 const dc=[P.acc,'#4a2a8a','#7a1f4a','#1f6a5a'][Math.floor(hash2(b.x,b.y,67)*4)];
 R(dxc-6,bottom-21,12,21,dk(dc,.5));R(dxc-5.5,bottom-20.5,11,20.5,dc);
 BG(c,dxc-4,bottom-19,8,11,lite(glow,.2),dk(glow,.35),5);R(dxc-.25,bottom-19,.5,11,dc);R(dxc-4,bottom-12,8,.5,dc);
 R(dxc-4,bottom-19,8,2,'#02060c',.35);R(dxc-5.5,bottom-6,11,.5,dk(dc,.4));R(dxc-4,bottom-5,8,3.5,dk(dc,.2));R(dxc-4,bottom-5,8,.5,lite(dc,.3));
 R(dxc+3,bottom-11,1,3,'#ffe6a6');R(dxc-6,bottom-21,.5,21,lite(dc,.5),.7);R(dxc+5.5,bottom-21,.5,21,'#02060c',.35);
 R(dxc-10,bottom-3,20,3,lite(P.trim,.2));R(dxc-10,bottom-3,20,.5,'#fff',.45);R(dxc-10,bottom-.5,20,.5,'#02060c',.4);
 groundPaint(c,W,dxc-9,bottom+1,18,8,glow,.1);
 drawSignBoard(c,b,index,label,neon,shine,false);
 // Awnings (cafes, bars, shops): stripes + scalloped valance + hard shadow onto the glass.
 const wantAwn=!industrial&&(['cafe','bar','konbini','shop'].includes(b.type)||style>.4);
 if(wantAwn)regions.forEach(([a,z])=>{if(z-a>=10){awningStripe(c,a-1,gy+11,z-a+2,5,P.awn[0],P.awn[1]);R(a-1,gy+19,z-a+2,.5,neon,.9);c.globalAlpha=.1;R(a-1,gy+19.5,z-a+2,2,neon);c.globalAlpha=1;}});
 // String lights strung between sign and pilasters.
 if(['bar','cafe','konbini'].includes(b.type)||style>.7){
  for(let xx=x+10,k=0;xx<x+w-10;xx+=5.5,k++){const sag=Math.sin((xx-x-10)/(w-20)*Math.PI)*2.5-3,col=['#39ff9a','#b44bff','#19e6ec','#ff3d8a','#c8ff4a'][k%5];R(xx,gy-.5+sag,1,1,col);BD(c,xx+.5,gy+.2+sag,2,2,col);c.globalAlpha=.12;BD(c,xx+.5,gy+.2+sag,2,2,col);c.globalAlpha=1;}
 }
 // Side furniture: vertical blade sign, planters, vending machine, bench.
 if(hash2(b.x,b.y,70)>.52&&w>=80){const bx=x+w-14;R(bx+1,fy+9,8,28,'#02060c',.35);R(bx,fy+8,8,28,'#10161e');R(bx+.5,fy+8.5,7,27,mixc(neon,'#10161e',.7));R(bx+.5,fy+8.5,7,.5,neon);R(bx+3.5,fy+9,1,25,neon,.9);for(let k=0;k<4;k++){R(bx+1.5,fy+11+k*6,5,2.5,neon,.85);R(bx+2.5,fy+11.5+k*6,1,1.5,'#fff',.6);}R(bx-1,fy+7,10,30,neon,.1);}
 const plant=(px,py,pc)=>{R(px,py,6,5,'#141824');R(px,py,6,.5,lite('#141824',.5));R(px,py+4.5,6,.5,'#02040a');R(px+5,py,1,5,'#02040a',.45);for(let k=0;k<4;k++){const sx=px+1+k*1.4,sh2=3+((b.seed+k*3)%4),gc=GLOW[(b.seed+k)%GLOW.length];R(sx,py-sh2,.5,sh2,mixc('#0f4a3c','#19e6ec',k/4));BD(c,sx+.25,py-sh2,1,1,gc);c.globalAlpha=.18;BD(c,sx+.25,py-sh2,2.6,2.6,gc);c.globalAlpha=1;}};
 if(w>=64){plant(dxc+10,bottom-8,'#9a5a3a');plant(dxc-16,bottom-8,'#4a6a8a');}
 if(w>=96&&hash2(b.x,b.y,71)>.5){const vx=x+w-24;R(vx+1,bottom-21,12,20,'#02060c',.4);R(vx,bottom-22,12,21,'#241838');R(vx,bottom-22,12,.5,lite('#241838',.5));R(vx+1,bottom-20,7,13,'#10161e');BG(c,vx+1.5,bottom-19.5,6,12,'#c9a0ff','#2a0a5a',4);for(let r=0;r<3;r++)for(let k=0;k<3;k++)R(vx+2+k*2,bottom-18+r*3.5,1.5,2,GLOW[(r+k)%GLOW.length]);R(vx+9,bottom-19,2,6,'#6a74a0');R(vx+1,bottom-6,7,2,'#05060c');groundPaint(c,W,vx,bottom+1,12,6,'#b44bff',.12);}
 else if(w>=64&&hash2(b.x,b.y,72)>.5){const bx=x+10;R(bx,bottom-4,13,.5,'#1a2038');R(bx,bottom-7,13,1.5,'#2a3250');R(bx,bottom-7,13,.5,lite('#2a3250',.5));R(bx+1,bottom-4,1,4,'#06080f');R(bx+11,bottom-4,1,4,'#06080f');R(bx+1,bottom-6.5,11,.5,neon,.5);}
 // Base course (plinth) of stone, then a thin neon reflection on the wet pavement.
 R(x,bottom-2,w,2,'#1e2438');R(x,bottom-2,w,.5,lite('#1e2438',.5));R(x,bottom-.5,w,.5,'#02060c');R(x+3,bottom-1.5,w-6,.5,neon,.35);
 for(let k=0;k<10;k++){
  const xx=x+5+Math.floor(hash2(k,b.seed,991)*Math.max(1,w-10)),yy=bottom+2+k*1.6;
  groundPaint(c,W,xx,yy,2+(k%6),1,neon,.13*(1-k/12));
 }
}
// Boxed sign with depth, neon edge and two goose-neck lamps. Also used by
// places.js to re-label the authored NEON THREAD shop (repaint=true).
function drawSignBoard(c,b,index,label,neon,shine,repaint){
 const g=bgeo(b),P=bpal(b,index),{x,w,gy}=g,R=(a,d,ww,hh,col,al)=>BR(c,a,d,ww,hh,col,al);
 const dxc=Math.max(x+11,Math.min(x+w-11,b.door.x*16+8)),fit=Math.floor((w-22-13)/4);
 if(label.length>fit)label=label.replace(/ \d+$/,'');if(label.length>fit)label=label.slice(0,Math.max(3,fit)).trim();
 if(repaint)BG(c,x+9,gy-.5,w-18,12.5,dk(P.wall,.5),dk(P.wall,.4),4);
 const signW=Math.max(24,Math.min(w-22,label.length*4+13)),sx=Math.max(x+9,Math.min(x+w-9-signW,dxc-signW/2));
 R(sx+1.5,gy+1.5,signW,10,'#02060c',.5);R(sx,gy,signW,10.5,'#07080f');R(sx,gy,signW,.5,lite('#2a3050',.5));
 R(sx+1,gy+1,signW-2,8.5,mixc('#0a0e1c','#020308',.5));
 R(sx+1,gy+1,signW-2,.5,neon);R(sx+1,gy+9,signW-2,.5,neon);R(sx+1,gy+1,.5,8.5,neon,.7);R(sx+signW-1.5,gy+1,.5,8.5,neon,.7);
 R(sx-1,gy-1,signW+2,13.5,neon,.12);R(sx-2.5,gy+3,1.5,1,neon,.8);R(sx-2.5,gy+6,1.5,1,neon,.5);R(sx+signW+1,gy+3,1.5,1,neon,.8);R(sx+signW+1,gy+6,1.5,1,neon,.5);
 c.save();c.beginPath();c.rect(sx+2,gy+2,signW-4,7);c.clip();pixelText(c,label,sx+(signW-label.length*4)/2+.5,gy+3.5,shine);c.restore();
 for(const lx of [sx+4,sx+signW-5]){R(lx,gy-2.5,.5,2.5,'#1a2038');R(lx-1,gy-3,3,1,'#1a2038');R(lx-1,gy-2,3,1,neon);}
}
// Apartment houses: no neon store sign; stoop, portico, balconies and a numbered door.
function drawResidentialFront(c,b,index,W){
 const g=bgeo(b),P=bpal(b,index),{x,y,w,h,gy,fy,bottom}=g,R=(a,d,ww,hh,col,al)=>BR(c,a,d,ww,hh,col,al);
 const v=Math.floor(hash2(b.x,b.y,302)*4),dxc=Math.max(x+12,Math.min(x+w-12,b.door.x*16+8));
 drawWallDetails(c,b,index,g,P);
 const base=mixc(P.wall,P.trim,.12);
 BG(c,x+1.5,gy,w-3,g.gf,dk(base,.32),dk(base,.1),8);
 // rusticated ground storey
 for(let yy=gy+4;yy<bottom-3;yy+=5){R(x+2,yy,w-4,.5,dk(base,.55),.55);R(x+2,yy+.5,w-4,.5,lite(base,.3),.25);for(let xx=x+3+((yy/5|0)%2?4:0);xx<x+w-3;xx+=9)R(xx,yy+.5,.5,4.5,dk(base,.5),.4);}
 R(x+1.5,gy,w-3,1.5,lite(P.trim,.35));R(x+1.5,gy+1.5,w-3,1,dk(P.trim,.4));R(x+1.5,gy+2.5,w-3,3,'#02060c',.26);
 // ground-floor windows with iron grilles
 const n=Math.max(1,Math.floor((w-10)/24)),span=(w-10)/n,ww=Math.min(14,Math.floor(span-9)),wh=13,wy=gy+9;
 for(let k=0;k<n;k++){
  const wx=x+5+span*(k+.5)-ww/2;if(Math.abs(wx+ww/2-dxc)<ww/2+10)continue;
  drawWindow(c,wx,wy,ww,wh,P,b.seed+k*13+4,W,{flower:v===1,shutters:v===2&&k%2===0});
  R(wx,wy,ww,wh,'#000',0);for(let gx=wx+1;gx<wx+ww;gx+=2.5)R(gx,wy,.5,wh,'#10161e',.85);R(wx,wy+wh*.5,ww,.5,'#10161e',.8);
  groundPaint(c,W,wx,bottom+1,ww,5,'#58ffb4',.06);
 }
 // Portico: columns, pediment, recessed door painted in a house colour.
 const dc=[P.acc,'#4a2a8a','#7a1f4a','#1f6a5a','#6a2a9a'][Math.floor(hash2(b.x,b.y,68)*5)];
 R(dxc-9,gy+8,18,2.5,lite(P.trim,.3));R(dxc-9,gy+8,18,.5,'#fff',.55);R(dxc-9,gy+10,18,1,dk(P.trim,.5));R(dxc-7,gy+6,14,2,P.trim);R(dxc-7,gy+6,14,.5,'#fff',.5);R(dxc-5,gy+4.5,10,1.5,lite(P.trim,.15));
 R(dxc-9,gy+11,18,2.5,'#02060c',.32);R(dxc-9,gy+13.5,18,2,'#02060c',.12);
 for(const px of [dxc-9,dxc+7]){R(px,gy+10.5,2.5,bottom-gy-14,lite(P.trim,.1));R(px,gy+10.5,.5,bottom-gy-14,'#fff',.5);R(px+2,gy+10.5,.5,bottom-gy-14,dk(P.trim,.5));R(px-.5,bottom-6,3.5,3,lite(P.trim,.25));}
 R(dxc-6.5,bottom-20,13,17,'#0a1018');R(dxc-6,bottom-19.5,12,16.5,dk(dc,.45));R(dxc-5,bottom-19,10,16,dc);
 R(dxc-4,bottom-17,8,6,dk(dc,.5));BG(c,dxc-3.5,bottom-16.5,7,5,'#58ffb4','#0a3a5a',3);R(dxc-.25,bottom-16.5,.5,5,dc);
 for(let k=0;k<3;k++)R(dxc-3.5+k*2.5,bottom-9.5,2,5,dk(dc,.25)),R(dxc-3.5+k*2.5,bottom-9.5,2,.5,lite(dc,.3));
 R(dxc+3,bottom-10,1,2.5,'#ffe6a6');R(dxc-6,bottom-19.5,.5,16.5,lite(dc,.5),.6);R(dxc+5.5,bottom-19.5,.5,16.5,'#02060c',.35);
 // wall lamp + number plate
 R(dxc+10.5,gy+14,2,1,'#2a323a');BD(c,dxc+11.5,gy+16.5,1.5,1.5,'#b6ffe6');c.globalAlpha=.12;BD(c,dxc+11.5,gy+16.5,6,6,'#58ffb4');c.globalAlpha=1;
 R(dxc-14,gy+9,4.5,3,'#10161e');R(dxc-14,gy+9,4.5,.5,lite(P.trim,.5));pixelText(c,String((index%89)+11),dxc-13.5,gy+9.7,'#9efff0');
 // steps
 R(dxc-11,bottom-3,22,3,lite(P.trim,.2));R(dxc-11,bottom-3,22,.5,'#fff',.45);R(dxc-11,bottom-.5,22,.5,'#02060c',.4);R(dxc-9,bottom-5.5,18,2.5,lite(P.trim,.08));R(dxc-9,bottom-5.5,18,.5,'#fff',.35);
 groundPaint(c,W,dxc-9,bottom+1,18,8,'#58ffb4',.1);
 // mailboxes, bins and planters
 if(w>=64){R(x+8,bottom-15,9,10,'#1c2236');R(x+8,bottom-15,9,.5,lite('#1c2236',.5));for(let k=0;k<3;k++){R(x+9,bottom-13+k*3,7,2,mixc('#4a5478','#1c2236',k*.2));R(x+13,bottom-12.5+k*3,2,.5,P.acc,.8);}}
 const bin=(bx,col)=>{R(bx+.5,bottom-9,7,.5,'#02060c',.25);R(bx,bottom-8.5,7,7,col);R(bx,bottom-8.5,7,1.5,lite(col,.3));R(bx,bottom-8.5,7,.5,lite(col,.5));R(bx+5.5,bottom-7,1.5,5,dk(col,.4));R(bx+2,bottom-6,3,.5,dk(col,.4));};
 if(w>=80){bin(x+w-26,'#1c3a38');bin(x+w-17.5,'#2a2450');}
 for(let k=0;k<2;k++){const px=x+w-11-k*0;if(k)continue;R(px,bottom-5,6,4,'#1a1c2c');R(px,bottom-5,6,.5,lite('#1a1c2c',.5));for(let j=0;j<3;j++){const gc=GLOW[(b.seed+j)%GLOW.length];R(px+1.5+j*1.5,bottom-9+(j%2),.5,4,'#0f4a3c');BD(c,px+1.75+j*1.5,bottom-9+(j%2),1,1,gc);c.globalAlpha=.18;BD(c,px+1.75+j*1.5,bottom-9+(j%2),2.6,2.6,gc);c.globalAlpha=1;}}
 // washing line on a few facades
 if(hash2(b.x,b.y,69)>.5&&g.floors>=1){const ly=fy+g.fh*.5+7,lx=x+8;R(lx,ly,w-24,.5,'#14182a',.9);for(let k=0;k<5;k++){const cc=['#2a2040','#143a3a','#3a1a3a','#1a2a44','#2a3a2a'][k];R(lx+3+k*7,ly+.5,3.5,4+(k%2)*2,cc);R(lx+3+k*7,ly+.5,3.5,.5,GLOW[k%GLOW.length],.6);}}
 R(x,bottom-2,w,2,'#1e2438');R(x,bottom-2,w,.5,lite('#1e2438',.5));R(x,bottom-.5,w,.5,'#02060c');R(x+3,bottom-1.5,w-6,.5,P.acc,.3);
}
function drawNoirRoom(c,v,W){
 const X=W.room.x,Y=W.room.y,w=W.room.w,h=W.room.h,R=(x,y,ww,hh,col)=>{c.fillStyle=col;c.fillRect(x,y,ww,hh);};
 R(0,0,PW,PH,'#080d18');R(X,Y,w,h,'#18222b');
 for(let yy=Y;yy<Y+48;yy+=6)for(let xx=X+2;xx<X+w-7;xx+=10){R(xx,yy,9,5,(xx+yy)%3?'#40413c':'#51473c');R(xx+1,yy+1,6,1,'#66604d');}
 const diner=v.id==='diner',shop=v.id==='shop',tech=['workshop','radio','archive'].includes(v.id);
 for(let yy=Y+48;yy<Y+h-16;yy+=8)for(let xx=X+16;xx<X+w-16;xx+=16){const n=hash2(xx,yy,45);R(xx,yy,15,7,diner?(n>.5?'#4a4940':'#303c3d'):shop?(n>.5?'#41403a':'#383931'):(n>.5?'#34404a':'#293540'));R(xx+2,yy+2,8,1,'#46525a');}
 R(X+5,Y+48,7,h-58,'#485655');R(X+w-13,Y+48,7,h-58,'#485655');R(X+8,Y+50,1,h-62,'#b68b61');
 // Broad rainy window behind the counter, cracked plaster and personal posters.
 R(X+110,Y+5,94,37,'#0a1522');for(let xx=0;xx<88;xx+=11){R(X+113+xx,Y+10,9,27,'#253f53');R(X+116+xx,Y+13+(xx%3)*3,2,7,'#8fabb4');}R(X+157,Y+5,3,37,'#97816a');R(X+110,Y+38,94,4,'#97816a');
 for(let i=0;i<4;i++){R(X+20+i*19,Y+10,15,25,['#a19174','#7b9694','#8c7361','#ba9b78'][i]);for(let j=0;j<4;j++)R(X+23+i*19,Y+14+j*4,8-j,1,'#44423b');}
 for(let i=0;i<4;i++){R(X+225+i*25,Y+11,20,25,'#172532');R(X+227+i*25,Y+13,16,18,['#6d7063','#95614d','#4f6b77','#6e6973'][i]);R(X+230+i*25,Y+17,8,11,'#b19a77');}
 // Counter, shelves, chair legs: every large object shares the old solid mask.
 const bx=54*16,by=43*16;R(bx+3,by+3,128,33,'#101923');R(bx,by,128,29,'#4f5049');R(bx,by,128,4,'#b59b76');for(let k=0;k<8;k++)R(bx+k*16+2,by+9,13,14,'#363e40');
 R(bx+12,by-15,29,20,'#817e6d');R(bx+15,by-12,22,13,'#112c31');pixelText(c,'READY',bx+17,by-8,'#99c7ae');R(bx+17,by+4,23,5,'#202a30');for(let k=0;k<9;k++)R(bx+18+k*2,by+5,1,1,'#a5a598');
 R(bx+98,by-3,6,7,'#d8b991');R(bx+99,by-4,4,2,'#372d27');R(bx+104,by-1,3,3,'#b89874');R(bx+76,by+4,14,8,'#d3c6a7');R(bx+79,by+6,8,1,'#605c53');
 const table=(tx)=>{R(tx*16,48*16,48,30,'#6c5742');R(tx*16+1,48*16+1,46,2,'#b49467');R(tx*16+3,49*16+8,3,6,'#19232b');R(tx*16+42,49*16+8,3,6,'#19232b');R(tx*16+13,48*16+8,16,10,'#d2b78d');R(tx*16+15,48*16+8,12,6,'#8d5536');};
 if(diner){table(53);table(66);for(let k=0;k<7;k++){R(X+25+k*44,Y+46,9,13,'#b37943');R(X+27+k*44,Y+48,5,9,'#f5ce8a');}}
 else if(shop){for(const tx of [52,66]){R(tx*16,47*16,48,12,'#5c6060');for(let k=0;k<4;k++){R(tx*16+5+k*10,47*16-12,7,18,['#627c7f','#9b7166','#8a845e','#747889'][k]);R(tx*16+8+k*10,47*16-10,1,16,'#283641');}}R(68*16,41*16,24,38,'#9c9b85');R(68*16+3,41*16+3,18,32,'#446071');R(68*16+5,41*16+5,1,25,'#a9c3c6');}
 else{R(66*16,46*16,48,48,'#27343e');for(let row=0;row<4;row++){R(66*16+2,46*16+3+row*11,44,9,'#4e5757');for(let k=0;k<8;k++)R(66*16+4+k*5,46*16+5+row*11,3,5,k%3?'#727967':'#bf9162');}}
 R(59*16,51*16,64,12,'#4e4e42');for(let i=0;i<13;i++)R(59*16+i*5,51*16+2,2,7,'#736b52');R(60*16,53*16,48,16,'#0b1621');R(60*16,53*16,48,2,'#b69c76');pixelText(c,'EXIT',60*16+16,53*16+7,'#d9be91');
 if(tech){for(let k=0;k<4;k++){R(X+23+k*23,Y+8,19,19,'#122332');R(X+25+k*23,Y+10,15,13,'#1d566f');for(let q=0;q<4;q++)R(X+27+k*23,Y+12+q*2,6+q,1,'#75b7c6');}R(X+16,Y+44,w-32,2,'#759eaa');}
 if(shop){R(X+110,Y+7,95,15,'#622e38');pixelText(c,'NEON THREAD',X+118,Y+11,'#ff8e88');R(X+110,Y+23,95,2,'#c95c5c');}
 pixelText(c,v.sign,X+24,Y+33,tech?'#a5cfde':'#ead0a0');
 if(v.id==='radio'||v.id==='archive')drawChapterRoom(c,v);
 if(shop){R(53*16,50*16,14,10,'#8c7552');R(53*16+6,50*16,3,10,'#d0b681');}
 W.lights.forEach((l,i)=>{l.c=tech?'k':shop&&i%2?'s':'y';l.r=62;l.a=.6;});
}
function drawAtmosphere(c,g,ox,oy){
 if(g.renderer.quality==='low'||g.renderer.calm)return;
 const t=g.time,r=g.renderer;
 // Toxic steam over drains.
 for(let i=0;i<(g.world.interior?1:5);i++){
 const x=(g.world.interior?58*16:43*16+i*117)-ox,y=(g.world.interior?43*16:46*16+(i%2)*90)-oy;
 for(let p=0;p<5;p++){c.globalAlpha=.1;c.fillStyle=g.world.interior?'#b2c2c9':(i%2?'#9a7aff':'#58ffb4');c.fillRect(x+Math.floor(Math.sin(t/900+p)*3)+p*2,y-Math.floor((t/100+p*7)%28),3,2);}
 }c.globalAlpha=1;
 if(g.world.interior)return;
 // Drifting luminous spores: slow, parallaxed, pulsing.
 c.globalCompositeOperation='lighter';
 const n=r.quality==='cinematic'?46:26;
 for(let i=0;i<n;i++){
  const sp=.6+(i%5)*.22,px=(((i*149.7+t*.012*sp+ox*.25*sp)%(r.vw+60))+r.vw+60)%(r.vw+60)-30,py=(((i*83.3-t*.008*sp+oy*.2*sp)%(r.vh+60))+r.vh+60)%(r.vh+60)-30;
  const col=GLOW[i%3],pu=.5+.5*Math.sin(t/700+i*2.1),sz=(i%7===0)?2:1;
  c.globalAlpha=.1+.4*pu;c.fillStyle=col;c.fillRect(px|0,py|0,sz,sz);
  if(sz===2){c.globalAlpha=.05+.08*pu;c.fillRect((px|0)-1,(py|0)-1,4,4);}
 }
 c.globalAlpha=1;c.globalCompositeOperation='source-over';
 // Foreground utility cables remain a separate layer above actors.
 c.strokeStyle='#04050c';c.lineWidth=1;
 for(const y of [36*16,47*16]){c.beginPath();c.moveTo(39*16-ox,y-oy);c.quadraticCurveTo(58*16-ox,y+30-oy,80*16-ox,y-oy);c.stroke();}
}

const CITY_WEATHER={day:{dark:.15,rain:0,fog:.07,wet:.25,sun:.1},sunset:{dark:.22,rain:0,fog:.05,wet:.35,sun:.2},night:{dark:.3,rain:0,fog:.04,wet:.5,sun:0},rain:{dark:.3,rain:.6,fog:.06,wet:1,sun:0},heavy:{dark:.38,rain:1,fog:.14,wet:1,sun:0},fog:{dark:.25,rain:0,fog:.4,wet:.6,sun:0},storm:{dark:.45,rain:1,fog:.16,wet:1,sun:0}};
function updateCityWeather(renderer,game){
 const choice=renderer.weather||'rain',name=choice==='auto'?['day','sunset','night','rain','heavy','fog','storm'][Math.floor(game.time/90000)%7]:choice,target=CITY_WEATHER[name]||CITY_WEATHER.rain;
 const previous=renderer.weatherFrame||{...target};const now=game.time,dt=Math.min(100,Math.max(0,now-(renderer.weatherAt??now)));renderer.weatherAt=now;
 for(const key of Object.keys(target))previous[key]+=(target[key]-previous[key])*(1-Math.exp(-dt/1300));
 previous.name=name;renderer.weatherFrame=previous;return previous;
}
function drawStreetWater(c,g,ox,oy){
 if(g.world.interior)return;const a=g.renderer.weatherFrame||CITY_WEATHER.rain,t=g.renderer.calm?0:g.time;
 c.save();c.globalCompositeOperation='screen';
 for(const l of g.world.lights){if(l.kind!=='neon'&&l.kind!=='window')continue;const x=l.x-ox,y=l.y-oy;if(x<-40||y<-40||x>g.renderer.vw+40||y>g.renderer.vh+40)continue;
 c.fillStyle=alienLight(l.c)||'#58ffb4';for(let k=1;k<14;k++){const yy=l.y+k*3;if(tileSolid(g.world,Math.floor(l.x/16),Math.floor(yy/16)))continue;c.globalAlpha=a.wet*(.22-k*.013);const width=Math.max(2,16-k);c.fillRect(Math.round(x-width/2+Math.sin(t/600+k)*2),Math.round(yy-oy),width,1);}}
 c.restore();
 for(const p of g.world.reflectionSurfaces||[]){const x=p.x-ox,y=p.y-oy;if(x<-25||y<-20||x>g.renderer.vw+25||y>g.renderer.vh+20)continue;
 c.save();c.beginPath();c.moveTo(x-9,y-2);c.lineTo(x-4,y-5);c.lineTo(x+4,y-4);c.lineTo(x+10,y-1);c.lineTo(x+7,y+3);c.lineTo(x+2,y+5);c.lineTo(x-8,y+3);c.closePath();c.clip();c.globalAlpha=a.wet*.55;c.fillStyle='#050a1c';c.fillRect(x-12,y-6,25,12);
 const l=nearestLight(g.world,p.x,p.y-12,90);const color=l?(alienLight(l.c)||'#58ffb4'):'#6a4cff';
 for(let k=0;k<6;k++){c.globalAlpha=a.wet*(k%2?.32:.15);c.fillStyle=color;const drift=Math.round(Math.sin(t/700+p.seed*20+k)*2);c.fillRect(x-8+drift,y-4+k*2,12+(k%3)*3,1);}
 if(a.rain>.1&&!g.renderer.calm){const phase=(t/130+p.seed*30)%8;c.strokeStyle='#7affc8';c.globalAlpha=(1-phase/8)*.3*a.wet;c.beginPath();c.ellipse(x,y,phase+1,(phase+1)*.35,0,0,Math.PI*2);c.stroke();}c.restore();
 }
}
function drawWeatherLight(c,g,ox,oy){
 if(g.world.interior)return;const r=g.renderer,a=r.weatherFrame||CITY_WEATHER.rain,t=r.calm?0:g.time;
 // Window emission follows time of day independently of ambient exposure.
 c.globalCompositeOperation='screen';c.globalAlpha=Math.max(.05,a.dark*.8);
 for(const w of g.world.noirWindows||[])if(w.x>=ox-20&&w.y>=oy-20&&w.x<ox+r.vw&&w.y<oy+r.vh){c.fillStyle=w.col||'#58ffb4';c.fillRect(w.x-ox+1,w.y-oy+1,w.w-2,w.h-2);}
 c.globalCompositeOperation='source-over';
 if(a.sun){c.globalAlpha=a.sun;c.fillStyle=a.name==='sunset'?'#c0306e':'#3a9a8a';c.fillRect(0,0,r.vw,r.vh);}
 if(a.fog>.005){for(let k=0;k<5;k++){const y=((k*83+t/130)%(r.vh+150))-80;const grad=c.createLinearGradient(0,y,0,y+120);grad.addColorStop(0,'#3a8a7a00');grad.addColorStop(.5,'#3a8a7a');grad.addColorStop(1,'#3a8a7a00');c.globalAlpha=a.fog*.6;c.fillStyle=grad;c.fillRect(0,y,r.vw,120);}}
 // Slow single thunder glow; reduced-motion mode disables flashes entirely.
 if(a.name==='storm'&&!r.calm){const phase=t%14000;if(phase<350){c.globalAlpha=Math.sin(phase/350*Math.PI)*.17;c.fillStyle='#b9a0ff';c.fillRect(0,0,r.vw,r.vh);}}
 c.globalAlpha=1;
}

// Native-resolution foliage sprites: 64×80 source, rendered in a 32×40 world footprint.
const GARDEN_TREES=new Map();
function drawGardenTree(c,x,y,seed){
 const variant=seed%3;let sprite=GARDEN_TREES.get(variant);
 if(!sprite){sprite=document.createElement('canvas');sprite.width=64;sprite.height=80;const g=sprite.getContext('2d');
 const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
 r(28,48,8,30,'#080c12');r(30,46,3,30,'#3a4a62');r(25,74,17,3,'#1a2434');
 const pink=['#0b0724','#220f5a','#4a1a9a','#7a30e0','#b868ff','#f0c8ff'],green=['#031a1a','#08403a','#106a58','#1ba884','#3cf0a8','#b0ffe0'],colors=variant===1?pink:green;
 for(let yy=3;yy<64;yy++)for(let xx=2;xx<62;xx++){const dx=(xx-32)/29,dy=(yy-31)/30;const n=hash2(xx,yy,seed%3+441);const lobes=Math.min(((xx-20)/18)**2+((yy-26)/18)**2,((xx-39)/20)**2+((yy-23)/17)**2,((xx-32)/24)**2+((yy-43)/18)**2);if(lobes>1+Math.sin(xx*.6)*.12)continue;const shade=Math.max(0,Math.min(5,Math.floor(n*3+(1-dy)*1.4)));r(xx,yy,1,1,colors[shade]);if(n>.92&&yy<45)r(xx,yy,2,1,colors[5]);}
 r(30,47,3,17,'#624e58');for(let j=0;j<11;j++){r(31-j,49-j,2,2,'#624e58');r(32+j,53-j,2,2,'#624e58');}GARDEN_TREES.set(variant,sprite);}
 c.drawImage(sprite,Math.round(x)-16,Math.round(y)-39,32,40);
}

// ---------------------------------------------------------------- ALIEN MODULES
// Glowing conduits that crawl down the wall in the gaps between windows.
function alienVeins(c,b,i,g,P){
 const {x,w,fy,bottom}=g,n=Math.max(1,Math.floor((w-10)/22)),span=(w-10)/n,xs=[];
 for(let k=1;k<n;k++)xs.push(x+5+span*k);
 if(n===1)xs.push(x+w-10);
 xs.forEach((vx0,k)=>{
  let vx=vx0;const top=fy+9,bot=bottom-12;
  for(let yy=top;yy<bot;yy+=2){
   const j=hash2(k,(yy/2)|0,i+40);if(j>.82)vx+=.5;else if(j<.18)vx-=.5;vx=Math.max(vx0-2,Math.min(vx0+2,vx));
   BR(c,vx-1,yy,3,2,P.acc,.06);BR(c,vx,yy,.5,2,P.acc,.35+.4*hash2(k,yy|0,i+41));
   if(j>.94)BR(c,vx+.5,yy,3,.5,P.acc,.45);if(j<.05)BR(c,vx-3,yy+1,3,.5,P.acc,.45);
  }
  BD(c,vx0,top,1.3,1.3,P.acc);c.globalAlpha=.15;BD(c,vx0,top,3.2,3.2,P.acc);c.globalAlpha=1;
 });
 // Luminous drips hanging under the cornice.
 for(let xx=x+9;xx<x+w-9;xx+=3){const j=hash2(xx|0,i,55);if(j>.8){const len=3+Math.floor(hash2(xx|0,i,56)*9);for(let d=0;d<len;d++)BR(c,xx,fy+8+d,.5,1,P.acc,Math.max(.12,.6-d*.05));BD(c,xx+.25,fy+8+len,.9,.9,P.acc);}}
}
// Large alien structures that dominate a roof: sigil pad, ribbed dome, hive vents, writhing conduits.
function roofFeature(c,f,kind,P,seed){
 const cx=f.x+f.w/2,cy=f.y+f.h/2,r=Math.min(f.w,f.h)/2,gl=P.acc;
 const halo=(x,y,rad,a)=>{c.globalAlpha=a;BD(c,x,y,rad,rad,gl);c.globalAlpha=1;};
 const ring=(rad,col,al,step)=>{for(let a=0;a<360;a+=step){const t=a*Math.PI/180;BR(c,cx+Math.cos(t)*rad-.25,cy+Math.sin(t)*rad-.25,.75,.75,col,al);}};
 if(kind===0&&r<11)kind=1;
 if(kind===0){ // sigil pad
  BD(c,cx+1.5,cy+2,r,r,'#02040a');BD(c,cx,cy,r,r,'#0a0c18');BD(c,cx,cy,r-1,r-1,'#12172e');
  ring(r-.5,lite(P.trim,.15),.85,4);ring(r-3.5,gl,.9,3);ring(r-6,gl,.45,5);
  for(let k=0;k<8;k++){const t=k*Math.PI/4;BR(c,cx+Math.cos(t)*(r-2)-.5,cy+Math.sin(t)*(r-2)-.5,1,1,gl);}
  for(let k=0;k<3;k++){const t=k*Math.PI*2/3-Math.PI/2,t2=(k+1)*Math.PI*2/3-Math.PI/2;for(let u=0;u<=1;u+=.07)BR(c,cx+(Math.cos(t)*(1-u)+Math.cos(t2)*u)*(r-7.5)-.25,cy+(Math.sin(t)*(1-u)+Math.sin(t2)*u)*(r-7.5)-.25,.75,.75,gl,.85);}
  halo(cx,cy,r,.1);BD(c,cx,cy,1.3,1.3,gl);BR(c,cx-.25,cy-.25,.5,.5,'#fff');
 }else if(kind===1){ // ribbed dome
  const rx=f.w/2,ry=Math.min(f.h/2,rx*.85);
  BD(c,cx+2.5,cy+3.5,rx,ry,'#02040a');
  BD(c,cx,cy,rx,ry,'#161a30');BD(c,cx-1,cy-1,rx-1.5,ry-1.5,'#232948');BD(c,cx-2.5,cy-2.5,rx-4.5,ry-4.5,'#323a64');
  for(let k=-3;k<=3;k++){const half=ry*Math.sqrt(Math.max(0,1-(k/4)*(k/4)));BR(c,cx+rx*k/4-.25,cy-half+.5,.5,half*2-1,'#05060e',.75);}
  for(let k=-2;k<=2;k++){const half=rx*Math.sqrt(Math.max(0,1-(k/3)*(k/3)));BR(c,cx-half+.5,cy+ry*k/3-.25,half*2-1,.5,gl,.28);}
  c.globalAlpha=.22;BD(c,cx-rx*.35,cy-ry*.4,rx*.28,ry*.18,'#fff');c.globalAlpha=1;
  BD(c,cx,cy,2.6,2.6,'#05060e');BD(c,cx,cy,1.6,1.6,gl);halo(cx,cy,6,.16);BR(c,cx-.25,cy-.25,.5,.5,'#fff');
 }else if(kind===2){ // hive vents
  const cols=Math.max(2,Math.floor(f.w/9)),rows=Math.max(2,Math.floor(f.h/8)),cw=f.w/cols,rh=f.h/rows;
  BR(c,f.x+2,f.y+3,f.w,f.h,'#02040a',.45);BR(c,f.x,f.y,f.w,f.h,'#141830');BR(c,f.x,f.y,f.w,.5,lite('#141830',.6));BR(c,f.x,f.y,.5,f.h,lite('#141830',.4));BR(c,f.x+f.w-.5,f.y,.5,f.h,'#02040a',.6);
  for(let ry2=0;ry2<rows;ry2++)for(let k=0;k<cols;k++){const sx=f.x+k*cw+(ry2%2?cw*.25:0)+1.5,sy=f.y+ry2*rh+1.5,sw=cw-3,on=hash2(k,ry2,seed+3);
   BR(c,sx,sy,sw,rh-3,'#05060e');if(on>.3){BR(c,sx+.5,sy+.5,sw-1,.5,gl,.55+.4*on);BR(c,sx+.5,sy+1.5,sw-1,.5,gl,.2);}}
 }else{ // writhing conduits
  const amp=Math.max(3,f.h*.28);
  for(let t=0;t<2;t++){const ph=hash2(seed,5+t,5)*6,off=(t?1:-1)*amp*.45;
   for(let px=f.x;px<f.x+f.w;px+=.5){const py=cy+off+Math.sin((px-f.x)*.2+ph)*amp;BR(c,px,py+1.8,.5,2,'#02040a',.35);BR(c,px,py,.5,2,'#1c2238');BR(c,px,py,.5,.5,'#5a6498');}
   for(let k=0;k<4;k++){const px=f.x+3+k*(f.w-6)/3,py=cy+off+Math.sin((px-f.x)*.2+ph)*amp+1;BD(c,px,py,1.6,1.6,gl);halo(px,py,3.8,.15);}}
 }
}
// Spires, antennae and beacons standing above the roofline.
function drawCrown(c,b,i){
 if(b.objectAsset||b.citySprite!==undefined||b.cityLong!==undefined)return;
 const g=bgeo(b),P=bpal(b,i),{x,y,w}=g;
 if(w<40||hash2(b.x,b.y,611)<.42)return;
 const n=w>=96?2:1;
 for(let k=0;k<n;k++){
  const sx=x+Math.round(w*(n===1?.25+hash2(b.x,b.y,612)*.5:.2+k*.55)),hgt=7+Math.floor(hash2(b.x,b.y,613+k)*5),col=GLOW[(i+k)%GLOW.length];
  BR(c,sx+1,y+1,3,2,'#02040a',.4);
  BR(c,sx-1,y-1,3,2.5,'#1a2038');BR(c,sx-1,y-1,3,.5,'#6a74a0');
  for(let h=0;h<hgt;h++){BR(c,sx+.25,y-1-h,h<2?1.5:1,1,mixc('#8a98c8','#1a2038',Math.min(1,h/hgt)));}
  BR(c,sx-.5,y-3,2.5,.5,'#4a5488');if(hgt>9)BR(c,sx-.5,y-6,2.5,.5,'#4a5488');
  c.globalAlpha=.16;BD(c,sx+.5,y-hgt-1,3.4,3.4,col);c.globalAlpha=1;BR(c,sx-.25,y-hgt-1.5,1.5,1.5,col);BR(c,sx+.25,y-hgt-1,.5,.5,'#fff',.9);
 }
}
// Scene-wide colour grade: cold multiply, creeping aurora haze, heavy vignette.
function alienGrade(c,r,game){
 const w=r.vw,h=r.vh,t=r.calm?0:game.time,ph=(Math.sin(t/7000)+1)/2;
 c.save();
 c.globalCompositeOperation='multiply';c.fillStyle='#b2b9dc';c.fillRect(0,0,w,h);
 c.globalCompositeOperation='screen';
 const gr=c.createLinearGradient(0,0,w,h*.7);
 gr.addColorStop(0,'rgba(60,255,170,'+(.03+.035*ph)+')');gr.addColorStop(.55,'rgba(150,60,255,'+(.04+.035*(1-ph))+')');gr.addColorStop(1,'rgba(0,0,0,0)');
 c.fillStyle=gr;c.fillRect(0,0,w,h);
 c.globalCompositeOperation='source-over';
 const v=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.32,w/2,h/2,Math.max(w,h)*.74);
 v.addColorStop(0,'rgba(3,0,12,0)');v.addColorStop(1,'rgba(3,0,12,.6)');
 c.fillStyle=v;c.fillRect(0,0,w,h);
 c.restore();
}
