'use strict';
const WALK_SOURCES=['assets/characters/main_characters_walkcycles.png','assets/characters/npc_8_roles_walkcycles.png'];
const WALK_IMAGES=[],WALK_CACHE=new Map();
const WALK_MAIN_X=[[104,151,195,240],[306,353,399,444],[510,558,605,650],[723,770,815,861],[936,988,1036,1081],[1150,1197,1242,1289],[1367,1414,1461,1507]];
const WALK_MAIN_Y=[278,370,474,565,667,752,842,928];
const WALK_ROLES={shopkeeper:0,security:1,hacker:2,locksmith:3,bartender:4,courier:5,corporate:6,worker:7,technician:7,mechanic:7,punk:6};
async function loadWalkcycleAssets(){await Promise.all(WALK_SOURCES.map(async(src,i)=>{WALK_IMAGES[i]=await p2img(src);}));}
// Decode the dark sheet matte from the boundary only, retaining enclosed dark clothing.
function walkCut(image,x,y,w,h){
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;
 const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(image,x,y,w,h,0,0,w,h);
 const data=c.getImageData(0,0,w,h),a=data.data,seen=new Uint8Array(w*h),queue=[];
 const bg=[a[0],a[1],a[2]];
 function visit(p){if(seen[p])return;seen[p]=1;const i=p*4;
  if(Math.abs(a[i]-bg[0])+Math.abs(a[i+1]-bg[1])+Math.abs(a[i+2]-bg[2])<24||Math.max(a[i],a[i+1],a[i+2])<12){a[i+3]=0;queue.push(p);}}
 for(let xx=0;xx<w;xx++){visit(xx);visit((h-1)*w+xx);}for(let yy=0;yy<h;yy++){visit(yy*w);visit(yy*w+w-1);}
 for(let i=0;i<queue.length;i++){const p=queue[i],xx=p%w,yy=Math.floor(p/w);if(xx)visit(p-1);if(xx<w-1)visit(p+1);if(yy)visit(p-w);if(yy<h-1)visit(p+w);}
 c.putImageData(data,0,0);return cv;
}
function walkStrip(npc,role,dir,moving){
 const key=[npc,role,dir,moving].join(':');if(WALK_CACHE.has(key))return WALK_CACHE.get(key);
 const image=WALK_IMAGES[npc?1:0];if(!image)return null;
 const d=['down','left','right','up'].indexOf(dir),frames=moving?(npc?5:4):1;
 const cv=document.createElement('canvas');cv.width=32*frames;cv.height=48;const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
 for(let f=0;f<frames;f++){
  let x,y,w,h;
  if(npc){x=(role%4)*384+94+f*50;y=(role<4?210:722)+d*74;w=46;h=70;}
  else{x=WALK_MAIN_X[role][f]-21;y=WALK_MAIN_Y[d*2+(moving?1:0)];w=42;h=78;}
  const cut=walkCut(image,x,y,w,h),scale=44/h,dw=w*scale;
  c.drawImage(cut,f*32+(32-dw)/2,3,dw,44);
 }
 const result={canvas:cv,w:cv.width,h:48,fw:32,fh:48,ox:16,oy:47,frames,tag:'character',directional:true,worldHeight:22};
 WALK_CACHE.set(key,result);return result;
}
function applyWalkCharacter(prefix,appearance={}){
 const npc=prefix!=='player',role=npc?(WALK_ROLES[prefix.replace('npc_','')]??6):Math.max(0,Math.min(6,Number(appearance.actor)||0));
 if(!WALK_IMAGES[npc?1:0])return false;
 for(const dir of ['down','left','right','up'])for(const action of ['idle','walk','sprint','hack','interact']){
  const s=walkStrip(npc,role,dir,action==='walk'||action==='sprint');BANK[prefix+'_'+action+'_'+dir]=s;
  if(dir==='right')BANK[prefix+'_'+action+'_side']=s;
 }
 return true;
}
function paintWalkPreview(canvas,appearance,dir,frame){
 if(appearance.actor==='custom')return false;
 const s=walkStrip(false,Math.max(0,Math.min(6,Number(appearance.actor)||0)),dir==='side'?'right':dir,true);if(!s)return false;
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
 const scale=Math.max(1,Math.floor(Math.min(canvas.width/32,canvas.height/48)));
 c.drawImage(s.canvas,(frame%s.frames)*32,0,32,48,(canvas.width-32*scale)/2,canvas.height-48*scale,32*scale,48*scale);return true;
}
