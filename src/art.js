'use strict';
// Hand-authored pixel typography and architecture. No scaled bitmap backgrounds.
const GLYPHS={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110','/':'001001010100100','-':'000000111000000','.':'000000000000010'};
function pixelText(ctx,text,x,y,color='#a9ffeb',scale=1){ctx.fillStyle=color;for(const c of text.toUpperCase()){const g=GLYPHS[c];if(g)for(let i=0;i<15;i++)if(g[i]==='1')ctx.fillRect(Math.round(x+(i%3)*scale),Math.round(y+Math.floor(i/3)*scale),scale,scale);x+=4*scale;}}
function stampRows(ctx,rows,x,y,palette,s=1){
 rows.forEach((row,ry)=>[...row].forEach((ch,rx)=>{if(ch===' '||ch==='.')return;ctx.fillStyle=palette[ch]||ch;ctx.fillRect(x+rx*s,y+ry*s,s,s);}));
}
function polishCity(ctx,W){
 const colors=['#3ef8d4','#ff3aad','#ffc45a','#c888ff'];
 for(let yy=34;yy<52;yy++)for(let xx=38;xx<82;xx++){
  if(W.ground[yy*MW+xx]!==G.PLAZA)continue;
  const px=xx*16,py=yy*16,h=hash2(xx,yy,941);
  ctx.fillStyle=h>.62?'#2a2440':h>.35?'#241e38':'#1c1830';ctx.fillRect(px,py,16,16);
  ctx.fillStyle='#3a3250';ctx.fillRect(px,py,16,1);ctx.fillRect(px,py,1,16);
  ctx.fillStyle='#120e1c';ctx.fillRect(px,py+15,16,1);
  if(h>.68){ctx.fillStyle='#564a70';ctx.fillRect(px+3,py+3,1,1);ctx.fillRect(px+12,py+12,1,1);}
  if(h>.88){ctx.fillStyle='#7a3aa0';ctx.fillRect(px+8,py+8,2,2);}
 }
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
  const i=y*MW+x;if(![G.ROAD,G.ALLEY,G.PLAZA].includes(W.ground[i]))continue;
  const n=hash2(x,y,701);if(n>.28)continue;
  const light=nearestLight(W,x*16,y*16,80);if(!light)continue;
  ctx.fillStyle=PAL[light.c]||colors[0];
  for(let k=0;k<5;k++){ctx.globalAlpha=.05+k*.018;ctx.fillRect(x*16+Math.floor(n*17)+k,y*16+k*3,Math.max(2,13-k*2),1);}
 }
 ctx.globalAlpha=1;
 W.buildings.forEach((b,i)=>{
  const x=b.x*16,y=b.y*16,w=b.w*16,h=b.h*16,r=mulberry(b.seed+904),color=colors[i%4];
  ctx.fillStyle='#05040c';ctx.fillRect(x+w,y+6,5,h-4);ctx.fillRect(x+4,y+h,w,5);
  ctx.fillStyle=['#3a3258','#4a1e62','#145a66'][i%3];ctx.fillRect(x,y,w,2);ctx.fillRect(x,y,2,h-31);
  ctx.fillStyle='#8c8298';ctx.globalAlpha=.4;ctx.fillRect(x+3,y+2,w-6,1);ctx.globalAlpha=1;
  for(let xx=8;xx<w-8;xx+=22){ctx.fillStyle='#15101f';ctx.fillRect(x+xx,y+7,1,Math.max(2,h-46));ctx.fillStyle='#322a3c';ctx.fillRect(x+xx+1,y+7,1,Math.max(2,h-46));}
  if(w>55&&h>62){
   const ax=x+w-30,ay=y+8;
   ctx.fillStyle='#0d0816';ctx.fillRect(ax+2,ay+3,22,20);
   ctx.fillStyle='#564a60';ctx.fillRect(ax,ay,22,16);
   ctx.fillStyle='#1c162c';ctx.fillRect(ax+2,ay+2,18,12);
   for(let q=0;q<5;q++){ctx.fillStyle=q%2?'#6e6278':'#3ef8d4';ctx.fillRect(ax+3,ay+3+q*2,15,1);}
   ctx.fillStyle='#ff3aad';ctx.fillRect(ax+19,ay,2,2);
   ctx.fillStyle='#ffc45a';ctx.fillRect(ax+16,ay,2,2);
  }
  if(w>72){pixelText(ctx,String(i+1).padStart(2,'0'),x+7,y+8,'#8c8298',2);}
  const fy=y+h-29;
  ctx.fillStyle='#15101f';ctx.fillRect(x+2,fy-1,w-4,28);
  for(let xx=5;xx<w-12;xx+=15){
   if(Math.abs(x+xx-b.door.x*16)<17)continue;
   ctx.fillStyle='#06040c';ctx.fillRect(x+xx,fy+3,12,20);
   const lit=r()>.22;ctx.fillStyle=lit?['#7a3aa0','#145a66','#b0166a'][i%3]:'#1c162c';ctx.fillRect(x+xx+1,fy+4,10,15);
   ctx.fillStyle=lit?color:'#3a3258';ctx.fillRect(x+xx+1,fy+4,10,1);
   ctx.fillStyle='#0d0816';ctx.fillRect(x+xx+5,fy+4,1,16);ctx.fillRect(x+xx,fy+12,12,1);
   if(lit){ctx.globalAlpha=.45;ctx.fillStyle=color;ctx.fillRect(x+xx+2,fy+14,2,3);ctx.fillRect(x+xx+7,fy+15,3,2);ctx.globalAlpha=1;
    ctx.fillStyle='#ffe8b0';ctx.fillRect(x+xx+8,fy+6,1,1);}
  }
  const labels={apartment:'RESIDENT',shop:'BYTE MART',konbini:'24/7',cafe:'RAMEN',tech:'REPAIR',bar:'AFTERLIFE',workshop:'FIX / LAB',office:'NEXUS',warehouse:'STORAGE',industrial:'SECTOR'};
  const text=labels[b.type]||'NULL';const sw=Math.min(w-8,text.length*4+10),sx=x+Math.floor((w-sw)/2),sy=fy-8;
  ctx.fillStyle='#05040c';ctx.fillRect(sx-3,sy-3,sw+6,13);ctx.fillStyle=color;ctx.fillRect(sx,sy,sw,1);ctx.fillRect(sx,sy+8,sw,1);
  ctx.fillStyle='#1c162c';ctx.fillRect(sx,sy+1,sw,7);
  pixelText(ctx,text.slice(0,Math.floor((sw-4)/4)),sx+4,sy+2,color);
  ctx.globalAlpha=.16;ctx.fillStyle=color;ctx.fillRect(sx,sy+9,sw,8);ctx.globalAlpha=1;
  if(i%3===0){ctx.fillStyle='#0d0816';for(let q=0;q<w;q++){const cy=fy-16+Math.floor(Math.sin(q/w*Math.PI)*6);ctx.fillRect(x+q,cy,1,1);}ctx.fillStyle=color;ctx.globalAlpha=.35;ctx.fillRect(x+Math.floor(w/2),fy-22,1,8);ctx.globalAlpha=1;}
  if(i%4===1&&h>80){const bx=x+w-9,by=y+17;ctx.fillStyle='#0d0816';ctx.fillRect(bx,by,8,31);ctx.fillStyle=color;ctx.fillRect(bx,by,1,31);pixelText(ctx,'N',bx+3,by+3,color);pixelText(ctx,'E',bx+3,by+11,color);pixelText(ctx,'T',bx+3,by+19,color);}
  if(i%5===2&&w>64){
   stampRows(ctx,[
    '  . X .  ',
    ' .XXX.X. ',
    '.XXXXXXX.',
    ' XXXOXXX ',
    '.XXXXXXX.',
    ' .X.X.X. '
   ],x+10,y+12,{X:'#4a1e62',O:'#ffc45a','.':'#7a3aa0'},2);
  }
  if(b.x===52&&b.y===40){
   ctx.fillStyle='#0b1627';ctx.fillRect(x+7,y+9,w-14,37);
   ctx.fillStyle='#3ef8d4';ctx.fillRect(x+7,y+9,w-14,2);
   ctx.fillStyle='#ff3aad';ctx.fillRect(x+7,y+11,w-14,1);
   pixelText(ctx,'MARA',x+15,y+16,'#89ffe0',3);
   pixelText(ctx,'REPAIR / 04',x+15,y+36,'#ffd49c');
   ctx.fillStyle='#77f2d4';ctx.fillRect(x+6,y+10,1,35);ctx.fillRect(x+w-7,y+10,1,35);
   for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#407789':'#ffc45a';ctx.fillRect(x+10+k*17,y+h-4,10,2);}
   stampRows(ctx,['XXX','X.X','XXX'],x+w-28,y+14,{X:'#3ef8d4','.':'#0d0816'},2);
  }
  if(b.x===64&&b.y===37){
   const bx=x+9,by=y+8;ctx.fillStyle='#0b1026';ctx.fillRect(bx,by,w-18,39);ctx.fillStyle='#ff3aad';ctx.fillRect(bx,by,w-18,1);
   const rows=['       XX          ','    XXXXXXX        ','  XXXOOOOOXX    X  ',' XXOOOOOOOOXX  XX  ','XXOOOOOOOOOOXXXXX  ',' XXOOOOOOOOXXXXX   ','  XXXOOOOXXX  XXX  ','     XXXXX     XX  ','       XX          '];
   rows.forEach((row,ry)=>[...row].forEach((ch,rx)=>{if(ch===' ')return;ctx.fillStyle=ch==='X'?'#ff79b0':'#ffd4af';ctx.fillRect(bx+8+rx*3,by+5+ry*3,3,3);}));
   ctx.fillStyle='#192037';ctx.fillRect(bx+19,by+14,3,3);pixelText(ctx,'MIDNIGHT RAMEN',bx+11,by+33,'#ff9fc8');
  }
  if(b.x===65&&b.y===47){
   stampRows(ctx,[
    '  XXXXX  ',
    ' XX...XX ',
    'XX.O.O.XX',
    'XX.....XX',
    ' XX...XX ',
    '  XXXXX  ',
    '   X X   '
   ],x+12,y+14,{X:'#ff8ad8',O:'#3ef8d4','.':'#2a1238'},2);
  }
  W.lights.push({x:sx+sw/2,y:fy+21,r:42,c:i%4===0?'k':i%4===1?'s':i%4===2?'y':'q',a:.7,kind:'neon',phase:i});
 });
 const cx=59*16,cy=43*16;
 ctx.fillStyle='#3a3258';for(let i=-5;i<=5;i++){ctx.fillRect(cx+i*16,cy-39,8,1);ctx.fillRect(cx+i*16,cy+60,8,1);}
 pixelText(ctx,'DISTRICT 04',cx-21,cy+56,'#c4b8d0');
 ctx.fillStyle='#120e22';ctx.fillRect(cx-40,cy-62,82,22);
 ctx.fillStyle='#3ef8d4';ctx.fillRect(cx-40,cy-62,82,2);
 ctx.fillStyle='#ff3aad';ctx.fillRect(cx-40,cy-60,82,1);
 pixelText(ctx,'NULL CITY / 04',cx-30,cy-52,'#a8fff0');
 stampRows(ctx,[
  '  .X.  ',
  ' .XXX. ',
  '.XXOXX.',
  ' XXXXX ',
  '.X.X.X.'
 ],cx-54,cy-58,{X:'#c888ff',O:'#ffe8b0','.':'#7a3aa0'},2);
}
function drawStation(ctx,x,y,site,g){
 const done=site.capital?site.completed:State.done.has(site.id),active=site.capital?!done:activeQuest()?.id===site.id, color=done?'#3ef8d4':active?'#ffc45a':'#7a6a90';
 x=Math.round(x);y=Math.round(y);
 ctx.fillStyle='#05040c';ctx.fillRect(x-12,y-2,25,6);
 ctx.fillStyle='#1c162c';ctx.fillRect(x-10,y-22,20,22);ctx.fillStyle='#564a60';ctx.fillRect(x-10,y-22,20,2);ctx.fillRect(x+8,y-21,2,20);
 ctx.fillStyle='#06040c';ctx.fillRect(x-8,y-18,14,11);ctx.fillStyle=color;ctx.fillRect(x-7,y-17,12,1);
 pixelText(ctx,site.number,x-4,y-14,color);
 ctx.fillStyle='#6e6278';ctx.fillRect(x-7,y-5,12,2);ctx.fillStyle=color;ctx.fillRect(x+6,y-4,1,1);
 if(active){
  const dy=g.renderer.calm?0:Math.floor(Math.sin(g.time/280)*3);
  ctx.fillStyle='#ffc45a';ctx.fillRect(x-2,y-36+dy,5,3);ctx.fillRect(x-1,y-33+dy,3,2);ctx.fillRect(x,y-31+dy,1,1);
  ctx.fillStyle='#ff3aad';ctx.globalAlpha=.55;ctx.fillRect(x-1,y-38+dy,3,1);ctx.globalAlpha=1;
 }
}
function drawAtmosphere(ctx,g,ox,oy){
 const t=g.renderer.calm?0:g.time;
 if(g.world.interior){
  const pulse=.35+.25*Math.sin(t/420);
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle='#ff3aad';ctx.globalAlpha=.04+pulse*.04;ctx.fillRect(0,18,g.renderer.vw,1);
  ctx.fillStyle='#3ef8d4';ctx.globalAlpha=.04+pulse*.03;ctx.fillRect(0,22,g.renderer.vw,1);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(!g.renderer.calm){
   const steamX=58*16-ox,steamY=42*16-oy;
   for(let i=0;i<6;i++){
    const sy=steamY-8-((t/80+i*11)%40),sx=steamX-6+Math.floor(Math.sin(t/200+i)*4)+i*3;
    ctx.fillStyle='#c4b8d0';ctx.globalAlpha=.12;ctx.fillRect(sx|0,sy|0,2,2);
   }
   ctx.globalAlpha=1;
  }
  return;
 }
 const dx=((t/70+450)%(PW+140))-70-ox,dy=510-oy+Math.floor(Math.sin(t/900)*6);
 if(dx>-40&&dx<g.renderer.vw+40&&dy>-50&&dy<g.renderer.vh){
  ctx.fillStyle='#1c162c';ctx.fillRect(dx|0,dy|0,16,4);ctx.fillRect((dx+5)|0,(dy-4)|0,6,4);
  ctx.fillStyle='#ff3aad';ctx.fillRect((dx+1)|0,dy|0,2,1);
  ctx.fillStyle='#3ef8d4';ctx.fillRect((dx+12)|0,dy|0,2,1);
  ctx.fillStyle='#c888ff';ctx.fillRect((dx+7)|0,(dy-3)|0,2,1);
  ctx.fillStyle='#83dce9';for(let k=0;k<10;k++){ctx.globalAlpha=.014;ctx.fillRect((dx+6-k)|0,(dy+5+k*3)|0,4+k*2,3);}ctx.globalAlpha=1;
 }
 const dx2=((t/110+120)%(PW+160))-80-ox,dy2=420-oy+Math.floor(Math.cos(t/700)*8);
 if(dx2>-30&&dx2<g.renderer.vw+30){
  ctx.fillStyle='#241e38';ctx.fillRect(dx2|0,dy2|0,10,3);
  ctx.fillStyle='#ffc45a';ctx.fillRect((dx2+8)|0,dy2|0,2,1);
 }
 if(!g.renderer.calm){
  for(let i=0;i<18;i++){
   const seed=i*97.13;
   const px=((seed*130+t/40)%(g.renderer.vw+40))-20;
   const py=30+((i*53)%(g.renderer.vh-80))+Math.sin(t/600+i)*10;
   const col=i%3===0?'#c888ff':i%3===1?'#3ef8d4':'#ff8ad8';
   ctx.fillStyle=col;ctx.globalAlpha=.18+.16*Math.sin(t/400+i);
   ctx.fillRect(px|0,py|0,2,2);
   if(i%4===0){ctx.fillRect((px+1)|0,(py-3)|0,1,2);ctx.fillRect((px-1)|0,(py+2)|0,1,1);}
  }
  ctx.globalAlpha=1;
  const starX=((t/18)%(g.renderer.vw+80))-40,starY=40+((t/55)%(g.renderer.vh*0.4));
  ctx.fillStyle='#ffe8b0';ctx.fillRect(starX|0,starY|0,3,1);ctx.fillRect((starX+3)|0,(starY+1)|0,2,1);
 }
 if(State.done.has('dns')){
  const home=g.world.buildings.find(b=>b.x===73&&b.y===37);
  if(home){const wx=home.x*16-ox,wy=(home.y+home.h)*16-oy-29;
   for(let k=5;k<home.w*16-12;k+=15){if(Math.abs(home.x*16+k-home.door.x*16)<17)continue;ctx.fillStyle='#c79a79';ctx.fillRect(wx+k+1,wy+4,10,15);ctx.fillStyle='#ffdfa0';ctx.fillRect(wx+k+1,wy+4,10,2);ctx.fillStyle='#272b37';ctx.fillRect(wx+k+5,wy+4,1,16);ctx.fillRect(wx+k,wy+12,12,1);}
  }
 }
 const x=59*16-ox,y=43*16-oy;
 const flicker=g.renderer.calm?1:(Math.sin(t/180)>0.82?0.35:1);
 ctx.globalAlpha=flicker;
 ctx.fillStyle=State.done.has('dns')?'#3ef8d4':'#ff3aad';pixelText(ctx,State.done.has('dns')?'LINK ONLINE':'NO SIGNAL',x-18,y-46,ctx.fillStyle);
 ctx.globalAlpha=1;
 if(State.done.has('transfer'))pixelText(ctx,'YUNA / ACTIVE',x-23,y+64,'#ffc45a');
 const ramen=g.world.buildings.find(b=>b.x===64&&b.y===37);
 if(ramen&&!g.renderer.calm){
  const bx=ramen.x*16+17-ox,by=ramen.y*16+13-oy;
  const swim=Math.floor(Math.sin(t/400)*3);
  ctx.fillStyle='#ffd4af';ctx.fillRect(bx+28+swim,by+18,3,3);
  ctx.fillStyle='#ff79b0';ctx.fillRect(bx+22+swim,by+16,4,2);
  for(let s=0;s<5;s++){
   const sy=by+42-((t/90+s*13)%28);
   ctx.fillStyle='#c4b8d0';ctx.globalAlpha=.2;ctx.fillRect(bx+40+(s%3)*3,sy,2,2);
  }
  ctx.globalAlpha=1;
 }
 ctx.globalCompositeOperation='lighter';
 g.visibleLights(ox,oy,g.renderer.vw,g.renderer.vh).filter(l=>l.kind==='neon').forEach((l,i)=>{
  const sx=Math.round(l.x-ox),sy=Math.round(l.y-oy);ctx.fillStyle=PAL[l.c]||'#63e9d1';
  const blink=(l.blink&&(((t/340+l.phase)|0)%5===0))?0.4:1;
  for(let k=0;k<8;k++){ctx.globalAlpha=.04*(1-k/9)*blink;const ww=Math.max(2,18-k*2);ctx.fillRect(sx-ww/2+Math.floor(Math.sin(k*3+t/500+i)*3),sy+10+k*3,ww,1);}
 });
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
