'use strict';
// Original layered pixel art. Integer coordinates, hand-authored silhouettes;
// no external game sprites. Each appearance is baked only when edited.
const CHARACTER_DEFAULT={origin:'char-01-desert',gender:'female',hair:'swept',skin:'#c9a15c',hairColor:'#7a5238',eyeColor:'#19c8e0'};
const HAIR_STYLES=[['swept','Набок'],['crop','Короткая'],['bob','Каре'],['long','Длинные'],['mohawk','Ирокез'],['bun','Пучок'],['bald','Без волос']];
const SKIN_TONES=['#f4d4b5','#e4b18a','#bd805d','#986044','#714936','#49322c'];
const HAIR_COLORS=['#211e2c','#50362e','#9e603d','#ddbb79','#ded9ee','#e655a2','#6654d6','#43b7af'];
const CLOTHES={default:{base:'#28485b',light:'#45657a',dark:'#182638',accent:'#abc3b2'},rose:{base:'#86335e',light:'#c45b91',dark:'#442442',accent:'#d9a5b6'},amber:{base:'#aa6130',light:'#e7a054',dark:'#593743',accent:'#ffe3a2'},violet:{base:'#564584',light:'#8d70c7',dark:'#29273f',accent:'#a1baff'},ghost:{base:'#a4bac9',light:'#e2eced',dark:'#475c74',accent:'#68daf1'}};
let activeAppearance={...CHARACTER_DEFAULT};
function shadeColor(hex,amount){const v=parseInt(hex.slice(1),16);return '#'+[v>>16,(v>>8)&255,v&255].map(n=>Math.max(0,Math.min(255,n+amount)).toString(16).padStart(2,'0')).join('');}
function characterFrame(appearance,outfit='default',dir='down',frame=0,action='idle'){
 if(typeof NULL_ASSETS!=='undefined')return nullCharacterFrame({...CHARACTER_DEFAULT,...appearance},outfit,dir,frame,action);
 const a={...CHARACTER_DEFAULT,...appearance},p=CLOTHES[outfit]||CLOTHES.default,cv=document.createElement('canvas');cv.width=32;cv.height=48;const c=cv.getContext('2d');
 const R=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);},O='#101722',side=dir==='side',back=dir==='up',walk=action==='walk'||action==='sprint',step=walk?[0,2,3,0,-2,-3][frame%6]:0,bob=walk?(frame%3===1?1:0):(frame===2?1:0),skin=a.skin,shadow=shadeColor(skin,-32),hair=a.hairColor;
 // Compact human silhouette: boots, loose trousers, work coat, shoulder bag.
 for(const [x,k]of side?[[13,step],[17,-step]]:[[10,step],[19,-step]]){R(x,33,5,11+Math.min(0,k),O);R(x+1,34,3,8+Math.min(0,k),'#39434c');R(x+1,36,3,2,'#57616b');R(x-1,43+Math.min(0,k),8,4,O);R(x,44+Math.min(0,k),6,1,'#7c837d');}
 const left=side?11:a.gender==='female'?8:7,width=side?12:a.gender==='male'?19:17;
 R(left,19+bob,width,17,O);R(left+1,20+bob,width-2,14,p.base);R(left+2,20+bob,3,11,p.light);R(left+width-4,21+bob,3,14,p.dark);R(left+1,33+bob,width-2,2,p.dark);
 R(left+5,23+bob,2,10,'#aaa18b');R(left+2,29+bob,5,3,p.dark);R(left+3,29+bob,4,1,p.light);
 if(back){R(left+5,22+bob,8,11,'#453f37');R(left+6,23+bob,6,7,'#7b725c');R(left+6,30+bob,6,1,'#b19d77');}
 else {R(left+2,21+bob,2,2,'#c2b296');R(left+8,22+bob,5,2,p.dark);}
 for(const [x,k]of side?[[11,step],[22,-step]]:[[5,step],[25,-step]]){const y=22+bob+Math.trunc(k/2)-((action==='interact'||action==='hack')&&x>16?5:0);R(x,y,4,13,O);R(x+1,y,3,9,p.base);R(x+1,y+1,1,5,p.light);R(x+1,y+9,3,3,skin);R(x+2,y+11,2,1,shadow);}
 R(13,16+bob,7,5,shadow);R(15,17+bob,3,3,skin);
 R(10,3+bob,12,2,O);R(8,5+bob,16,11,O);R(11,16+bob,10,3,O);R(10,5+bob,12,10,skin);R(12,15+bob,8,3,skin);R(10,7+bob,2,8,shadow);R(20,6+bob,2,7,shadeColor(skin,18));R(side?9:8,10+bob,2,4,shadow);
 if(!back){if(side){R(21,9+bob,2,2,'#d6d2bd');R(22,9+bob,1,2,a.eyeColor);R(23,12+bob,1,2,skin);R(18,15+bob,3,1,shadow);}else{for(const x of [11,18]){R(x,9+bob,3,2,'#d6d2bd');R(x+1,9+bob,2,2,a.eyeColor);R(x,8+bob,3,1,shadeColor(hair,-15));}R(16,12+bob,1,2,shadow);R(14,15+bob,4,1,shadow);}}
 if(a.hair!=='bald'){
  R(10,2+bob,12,3,hair);R(8,4+bob,16,3,hair);R(9,3+bob,5,2,shadeColor(hair,22));R(8,6+bob,3,4,shadeColor(hair,-15));R(22,6+bob,2,5,shadeColor(hair,-15));
  if(back)R(10,7+bob,13,9,hair);
  if(a.hair==='swept'){R(10,6+bob,7,2,hair);R(10,8+bob,4,2,hair);}
  if(a.hair==='bob'||a.hair==='long'){const n=a.hair==='long'?18:10;R(7,6+bob,3,n,hair);R(23,6+bob,3,n,shadeColor(hair,-12));R(8,8+bob,1,n-2,shadeColor(hair,18));}
  if(a.hair==='mohawk'){R(14,bob,5,7,hair);R(14,bob,2,5,shadeColor(hair,24));}
  if(a.hair==='bun'){R(9,bob,9,4,O);R(10,bob,7,3,hair);}
 }
 if(action==='hack'){R(19,24+bob,10,7,O);R(20,25+bob,8,4,'#72afbc');R(21+(frame%3),27+bob,3,1,'#d4e7d5');R(20+(frame%2)*2,30+bob,3,2,skin);}
 if(action==='sprint'){R(left+width-2,23+bob,3,7,p.dark);R(left-1,34+bob,3,3,p.base);}
 // Tiny copper shoulder light; clothes retain saved colour identity.
 R(left+1,21+bob,2,1,p.accent);return cv;
}
function bakeCharacter(prefix,a,outfit){
 for(const dir of ['down','up','side'])for(const action of ['idle','walk','sprint','interact','hack']){
 const frames=action==='idle'?4:action==='interact'||action==='hack'?4:6,strip=document.createElement('canvas');strip.width=32*frames;strip.height=48;const c=strip.getContext('2d');
 for(let f=0;f<frames;f++)c.drawImage(characterFrame(a,outfit,dir,f,action),f*32,0);
 BANK[prefix+'_'+action+'_'+dir]={canvas:strip,w:strip.width,h:48,fw:32,fh:48,ox:16,oy:47,frames,tag:'character'};
 }
}
function refreshDetailedCharacters(outfit,appearance){
 activeAppearance={...CHARACTER_DEFAULT,...appearance};bakeCharacter('player',activeAppearance,outfit);
 const keys=Object.keys(CAST).filter(k=>k!=='player');keys.forEach((key,i)=>bakeCharacter('npc_'+key,typeof NULL_ASSETS!=='undefined'?nullPreset(NULL_CAST[key]??i):{gender:i%2?'male':'female',skin:SKIN_TONES[i%SKIN_TONES.length],hair:HAIR_STYLES[i%HAIR_STYLES.length][0],hairColor:HAIR_COLORS[i%HAIR_COLORS.length],eyeColor:'#c4cddd'},typeof NULL_ASSETS!=='undefined'?'default':Object.keys(CLOTHES)[i%5]));
}
function paintCharacterPreview(canvas,appearance,outfit,dir='down',frame=0){
 if(typeof paintWalkPreview==='function'&&paintWalkPreview(canvas,appearance,dir,frame))return;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);
 const s=Math.floor(Math.min(canvas.width/38,canvas.height/54)),x=Math.floor((canvas.width-32*s)/2),y=canvas.height-48*s-5;
 c.fillStyle='#0c1423';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#213346';c.fillRect(8,canvas.height-8,canvas.width-16,2);c.drawImage(characterFrame(appearance,outfit,dir,frame,'walk'),x,y,32*s,48*s);
}

// Small architectural details share the same pixel grid as the room geometry.
function detailInterior(c,v,X,Y,WW,HH){
 const R=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 // Copper conduits, brackets, wall joints and fluorescent strips.
 R(X+9,Y+46,2,HH-58,'#52616c');R(X+12,Y+48,1,HH-62,'#866752');
 for(let y=Y+55;y<Y+HH-20;y+=24){R(X+7,y,7,2,'#263446');R(X+8,y,1,1,'#8395a0');}
 R(X+WW-12,Y+46,3,HH-58,'#172332');R(X+WW-11,Y+49,1,HH-64,v.color);
 for(let x=X+18;x<X+WW-18;x+=22){R(x,Y+36,12,3,'#0b121e');R(x+2,Y+36,8,1,'#6b6e82');}
 // Layered back-wall shelving and framed city posters.
 for(let k=0;k<3;k++){const x=X+225+k*30;R(x,Y+10,24,27,'#080f1b');R(x+1,Y+11,22,25,'#3d4b62');R(x+3,Y+13,18,16,k%2?'#73455c':'#264d5c');R(x+5,Y+16,3,10,v.color);R(x+10,Y+19,8,2,'#cbbd9e');R(x+4,Y+32,16,1,'#bcc5c8');}
 // Countertop: terminal, receipts, cup, cash tray, rivets and worn edges.
 const bx=54*16,by=43*16;
 R(bx+6,by+6,14,7,'#141c2a');R(bx+8,by+7,10,1,'#829299');R(bx+8,by+10,5,1,v.color);
 R(bx+96,by+5,10,6,'#d0c2a6');R(bx+98,by+7,5,1,'#746b65');R(bx+109,by+4,6,7,'#a9b8bc');R(bx+110,by+3,4,2,'#28313d');R(bx+114,by+5,3,3,'#788b97');
 for(let x=bx+3;x<bx+126;x+=16){R(x,by+29,1,1,'#8493a2');R(x,by+3,3,1,'#92a4a4');}
 if(v.id==='workshop'){
  for(let k=0;k<4;k++){R(X+30+k*18,Y+18,12,16,'#1b3640');R(X+32+k*18,Y+21,2,8,'#b0c392');R(X+36+k*18,Y+20,3,2,'#cca378');R(X+34+k*18,Y+29,5,2,'#588886');}
  for(let k=0;k<5;k++){R(66*16+32,46*16+6+k*7,4,2,k%2?'#77dabf':'#e8a273');}
 }else if(v.id==='diner'){
  for(const tx of [53,66]){const px=tx*16,py=48*16;R(px+4,py+14,9,2,'#3a2630');R(px+28,py+7,9,7,'#c5b494');R(px+29,py+9,7,1,'#806c53');R(px+6,py+6,2,3,'#efab73');R(px+37,py+18,2,8,'#d8b99c');}
  for(let k=0;k<6;k++){R(X+30+k*20,Y+20,12,13,'#291f2c');R(X+32+k*20,Y+21,8,10,k%2?'#c89b66':'#c8786f');R(X+35+k*20,Y+23,1,6,'#493748');}
 }else{
  R(68*16+20,41*16+3,1,28,'#e5d3e6');R(68*16+5,41*16+26,12,1,'#8b7299');
  for(const tx of [52,66])for(let k=0;k<4;k++){R(tx*16+8+k*10,47*16-11,1,11,'#263449');R(tx*16+6+k*10,47*16-9,2,1,'#e3d8c7');R(tx*16+5+k*10,47*16+6,6,1,'#8b8b97');}
  R(X+34,Y+17,70,12,'#282338');R(X+36,Y+19,66,1,v.color);pixelText(c,'NIGHT COLLECTION',X+38,Y+22,'#e1bdd8');
 }
 // Entry mat, floor seams and scattered scuffs (decorative, no new obstacles).
 R(59*16,51*16,64,11,'#17232f');R(59*16+2,51*16+2,60,7,'#293d49');for(let x=59*16+5;x<63*16-4;x+=5)R(x,51*16+3,1,5,'#47616a');
 for(let i=0;i<22;i++){const x=X+28+(i*67)%(WW-55),y=Y+116+(i*37)%100;R(x,y,3+(i%4),1,'#334450');}
}
