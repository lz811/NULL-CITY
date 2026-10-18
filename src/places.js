'use strict';
const VENUES=[
 {id:'radio',name:'Радио 03.17',sign:'RADIO 03.17',x:41,y:37,color:'#f5a4d8',ink:'s',cast:'punk',person:'Эхо',desc:'Пиратский эфир, украденный голос и выбор, который услышит весь район.'},
 {id:'archive',name:'Архив памяти',sign:'MEMORY / 12',x:73,y:37,color:'#91caff',ink:'k',cast:'corporate',person:'Иво',desc:'Двенадцать погасших домов. Архивист, который больше не хочет просто подписывать.'},
 {id:'workshop',name:'Мастерская Мары',sign:'MARA / REPAIR',x:52,y:40,color:'#75f5d1',ink:'k',cast:'locksmith',person:'Мара',desc:'Старые платы, новые вопросы. История наставницы и учебный терминал.'},
 {id:'diner',name:'MIDNIGHT RAMEN',sign:'MIDNIGHT RAMEN',x:64,y:37,color:'#ffb58c',ink:'y',cast:'shopkeeper',person:'Юна',desc:'Горячий чай, сообщения с орбиты и посылка без получателя.'},
 {id:'shop',name:'NEON THREAD',sign:'NEON THREAD',x:65,y:47,color:'#ed91d2',ink:'s',cast:'punk',person:'Никс',desc:'Ателье ночного города. Примеряй образы и покупай их за XP.'}
];
const COURSES=[
 {id:'zero',number:'01',name:'Кибербезопасность с нуля',tag:'НАЧНИ ЗДЕСЬ',color:'#75f5d1',desc:'Из первой смены — в самостоятельное расследование. Учись через историю города, команды и последствия своих решений.',modules:['Терминал и файлы','IP-адреса и маршруты','DNS и диагностика','Журналы и доказательства','Firewall и защита','Самостоятельная практика','Отчёт об инциденте','Фишинг и независимая проверка','Роли и отзыв сессий','Целостность резервных копий','Ответственное раскрытие']},
 {id:'oscp',number:'02',name:'Подготовка к OSCP',tag:'ПРАКТИЧЕСКИЙ ПЕНТЕСТ',color:'#ef9abf',desc:'Методичная работа в разрешённой лаборатории: исследовать систему, проверять гипотезы, собирать доказательства и описывать результат.',modules:['Границы задания и методика','Linux, Windows и скрипты','Перечисление сервисов','Веб-приложения','Повышение привилегий','Active Directory и сети','Комплексная лаборатория и отчёт'],source:'https://www.offsec.com/courses/pen-200/',lesson:{title:'Прежде чем открыть сканер',text:'Наставник передаёт разрешение на исследование одного учебного узла — 10.10.8.15. На нём найден веб-сервис со ссылкой на соседний сервер. Ссылка сама по себе не расширяет границы задания. Сначала фиксируют разрешённые цели и ограничения, затем перечисляют сервисы и проверяют гипотезы. Уязвимость ещё нужно подтвердить, а результат — документировать.',question:'Какой следующий шаг соответствует заданию?',answers:['Просканировать весь диапазон: соседние серверы наверняка принадлежат той же компании','Исследовать сервисы 10.10.8.15, сохранить наблюдения; для соседнего узла уточнить разрешение','Сразу запустить все доступные эксплойты'],correct:1,why:'Разрешён только один узел. Перечисление сервисов снижает неопределённость; расширение границ требует отдельного разрешения.'}},
 {id:'security',number:'03',name:'Подготовка к Security+',tag:'ЗАЩИТА И РИСКИ',color:'#9cbbff',desc:'Почему защита работает: идентификация, доступ, архитектура, угрозы, операции и управление рисками.',modules:['Базовые принципы защиты','Угрозы и уязвимости','Безопасная архитектура','Идентификация и доступ','Мониторинг и реагирование','Риски и восстановление','Тематические проверки'],source:'https://www.comptia.org/en-us/certifications/security/',lesson:{title:'Одна роль, одна задача',text:'Юне нужен помощник, который просматривает заказы в закусочной. Ему не нужно менять цены или экспортировать данные клиентов. Аутентификация отвечает на вопрос «кто ты?», авторизация — «что тебе разрешено?». Принцип минимальных привилегий означает доступ, необходимый для конкретной работы. Отдельная учётная запись сохраняет возможность установить, кто выполнил действие.',question:'Как организовать доступ помощника?',answers:['Дать общий пароль администратора, чтобы не задерживать работу','Выдать полный доступ и проверить действия через месяц','Создать отдельную учётную запись с чтением заказов и пересмотреть доступ при смене обязанностей'],correct:2,why:'Отдельная учётная запись обеспечивает атрибуцию, а ограниченные права уменьшают последствия ошибки или компрометации.'}}
];
function attachVenueDoors(W){
 if(W.minipixel){W.interactables=Minipixel.get().doors(VENUES);return;}
 W.interactables=VENUES.map(v=>{const b=W.buildings.find(b=>b.x===v.x&&b.y===v.y);const p=b.objectEntrance||findOpen(W,b.door.x,b.y+b.h);return {id:v.id,kind:'building',label:'Войти: '+v.name,x:p.x,y:p.y+(b.objectEntrance?0:5),color:v.color};});
 // Re-label the authored shop so its exterior matches the accessible interior.
 const b=W.buildings.find(b=>b.x===65&&b.y===47),ctx=W.staticCanvas.getContext('2d');
 if(b&&typeof drawSignBoard==='function')drawSignBoard(ctx,b,W.buildings.indexOf(b),'NEON THREAD','#ed91d2','#ffc4ec',true);
 else if(b){const x=b.x*16+5,y=(b.y+b.h)*16-37;ctx.fillStyle='#090f20';ctx.fillRect(x-2,y-2,b.w*16-6,12);pixelText(ctx,'NEON THREAD',x+6,y+1,'#ed91d2');}
}
function buildRoom(v){
 const W={id:v.id,interior:true,cfg:{rain:0,canal:false},ground:new Uint8Array(MW*MH).fill(G.BUILDING),solid:new Uint8Array(MW*MH).fill(1),vary:new Uint8Array(MW*MH),decal:new Uint8Array(MW*MH),props:[],signs:[],lights:[],pois:[],buildings:[],interactables:[]};
 const x0=50,y0=38,rw=22,rh=16;W.room={x:x0*16,y:y0*16,w:rw*16,h:rh*16};
 for(let y=y0+3;y<y0+rh-1;y++)for(let x=x0+1;x<x0+rw-1;x++){W.ground[y*MW+x]=G.PLAZA;W.solid[y*MW+x]=0;}
 const canvas=document.createElement('canvas');canvas.width=PW*2;canvas.height=PH*2;const c=canvas.getContext('2d');c.scale(2,2);c.imageSmoothingEnabled=false;c.fillStyle='#060b15';c.fillRect(0,0,PW,PH);
 const X=x0*16,Y=y0*16,WW=rw*16,HH=rh*16;
 c.fillStyle='#1a1230';c.fillRect(X,Y,WW,HH);c.fillStyle='#12081c';c.fillRect(X+5,Y+5,WW-10,46);
 for(let x=X+8;x<X+WW-8;x+=12){c.fillStyle=x%24?'#3a2452':'#2a1838';c.fillRect(x,Y+7,10,32);c.fillStyle=v.color;c.globalAlpha=.18;c.fillRect(x+2,Y+10,6,4);c.globalAlpha=1;}
 c.fillStyle=v.color;c.fillRect(X+6,Y+3,WW-12,2);c.fillStyle='#ff3aad';c.fillRect(X+6,Y+5,WW-12,1);c.fillStyle=v.color;c.fillRect(X+6,Y+43,WW-12,2);
 for(let y=y0+3;y<y0+rh-1;y++)for(let x=x0+1;x<x0+rw-1;x++){
  c.fillStyle=(x+y)%2?'#241832':'#2a1c3a';c.fillRect(x*16,y*16,16,16);c.fillStyle='#4a3260';c.fillRect(x*16,y*16,16,1);c.fillStyle='#12081c';c.fillRect(x*16+15,y*16,1,16);
 }
 for(let i=0;i<12;i++){c.fillStyle=i%2?'#c888ff':'#3ef8d4';c.globalAlpha=.35;c.fillRect(X+14+i*26,Y+12,2,2);}c.globalAlpha=1;
 pixelText(c,v.sign,X+20,Y+17,v.color,2);
 // Counter collision is part of the physical room, never just painted furniture.
 function furniture(tx,ty,w,h,type){for(let y=ty;y<ty+h;y++)for(let x=tx;x<tx+w;x++)W.solid[y*MW+x]=1;const px=tx*16,py=ty*16;
  c.fillStyle='#080f1c';c.fillRect(px+3,py+4,w*16,h*16);c.fillStyle=type==='table'?'#805e51':'#354654';c.fillRect(px,py,w*16,h*16);c.fillStyle=type==='table'?'#ac8270':'#668191';c.fillRect(px,py,w*16,3);c.fillStyle='#182532';c.fillRect(px,py+h*16-5,w*16,5);
 }
 furniture(54,43,8,2,'counter');
 if(v.id==='shop'){
  for(const tx of [52,66]){furniture(tx,47,3,1,'rack');for(let k=0;k<4;k++){c.fillStyle=['#75f5d1','#ef9abf','#ffce88','#9cbbff'][k];c.fillRect(tx*16+5+k*10,47*16-12,7,13);c.fillRect(tx*16+3+k*10,47*16-10,11,4);}}
  c.fillStyle='#738caa';c.fillRect(68*16,41*16,24,38);c.fillStyle='#2c435a';c.fillRect(68*16+2,41*16+2,20,34);c.fillStyle='#bdd1dd';c.fillRect(68*16+4,41*16+5,2,25);pixelText(c,'TRY ON',67*16,44*16,v.color);
 }else if(v.id==='diner'){
  furniture(53,48,3,2,'table');furniture(66,48,3,2,'table');
  for(const tx of [54,67]){c.fillStyle='#ddd4c4';c.fillRect(tx*16,48*16+6,10,7);c.fillStyle='#ebad74';c.fillRect(tx*16+2,48*16+6,6,3);}
  for(let i=0;i<7;i++){c.fillStyle=i%2?'#edaa71':'#f3c17e';c.fillRect(X+27+i*44,Y+49,9,13);c.fillStyle='#3d3441';c.fillRect(X+30+i*44,Y+48,3,15);}
 }else{
  furniture(66,46,3,3,'rack');for(let k=0;k<4;k++){c.fillStyle='#0c1723';c.fillRect(66*16+3,46*16+5+k*9,42,6);c.fillStyle=k%2?'#75f5d1':'#e0b479';c.fillRect(66*16+6,46*16+7+k*9,3,2);}
  c.fillStyle='#0b1c22';c.fillRect(55*16,43*16-12,32,16);c.fillStyle='#70f2d1';c.fillRect(55*16+2,43*16-10,28,11);pixelText(c,'READY',55*16+5,43*16-7,'#123f3e');
 }
 const exit={id:'exit',kind:'room',action:'exit',label:'Выйти в квартал',x:61*16+8,y:52*16+13,color:'#75f5d1'};
 c.fillStyle='#070d18';c.fillRect(60*16,53*16,48,16);c.fillStyle='#75f5d1';c.fillRect(60*16,53*16,48,2);pixelText(c,'EXIT',60*16+16,53*16+7,'#75f5d1');
 W.interactables=[exit,{id:'talk',kind:'room',action:'talk',label:'Говорить: '+v.person,x:58*16+8,y:45*16+13,color:v.color},
 {id:'object',kind:'room',action:v.id==='shop'?'shop':v.id==='workshop'?'courses':['radio','archive'].includes(v.id)?'mission':'letter',label:v.id==='shop'?'Примерочная / образы за XP':v.id==='workshop'?'Учебный терминал':['radio','archive'].includes(v.id)?'Терминал расследования':'Объявление: пропала посылка',x:67*16+8,y:45*16+13,color:v.color}];
 if(v.id==='shop')W.interactables.push({id:'parcel',kind:'room',action:'parcel',label:'Осмотреть посылку без получателя',x:53*16+8,y:50*16+13,color:'#ffce88'});
 if(v.id==='shop'){c.fillStyle='#886453';c.fillRect(53*16,50*16,14,10);c.fillStyle='#dbbd85';c.fillRect(53*16+6,50*16,3,10);}
 if(v.id==='diner'){c.fillStyle='#c9b68d';c.fillRect(67*16,45*16-12,18,23);pixelText(c,'404',67*16+3,45*16-8,'#553846');}
 for(const tx of [53,60,68])W.lights.push({x:tx*16,y:43*16,r:70,c:v.ink,a:.8,kind:'neon',phase:0});
 if(typeof detailInterior==='function')detailInterior(c,v,X,Y,WW,HH);
 if(v.id==='radio'||v.id==='archive')drawChapterRoom(c,v);
 if(typeof drawNoirRoom==='function')drawNoirRoom(c,v,W);
 W.staticCanvas=canvas;W.spawn={x:61*16+8,y:51*16+13};return W;
}
function drawDoorMarkers(ctx,g,ox,oy){
 const bob=g.renderer.calm?0:Math.floor(Math.sin(g.time/260)*2);
 for(const p of g.world.interactables||[]){const x=Math.round(p.x-ox),y=Math.round(p.y-oy);ctx.fillStyle=p.color;ctx.globalAlpha=.7;ctx.fillRect(x-8,y+1,16,1);ctx.fillRect(x-8,y-3,1,4);ctx.fillRect(x+7,y-3,1,4);ctx.globalAlpha=.25;ctx.fillRect(x-6,y+2,12,1);ctx.globalAlpha=1;pixelText(ctx,p.kind==='building'?'IN':p.action==='exit'?'OUT':p.action==='shop'?'XP':'E',x-4,y-22+bob,p.color);}
}
const BASE_PLAYER_PALETTE={...CAST.player};
const OUTFIT_RAMPS={default:{},rose:{j:'r',J:'q',k:'t',a:'s',e:'t',h:'s',H:'r'},amber:{j:'x',J:'w',k:'z',a:'y',e:'z',h:'c',H:'9'},ghost:{j:'e',J:'c',k:'e',a:'o',e:'o',p:'8',P:'7',h:'e',H:'b'},violet:{j:'h',J:'g',k:'q',a:'q',e:'t',h:'q',H:'h'}};
function applyPlayerOutfit(id,appearance){if(typeof refreshDetailedCharacters==='function')refreshDetailedCharacters(id,appearance||activeAppearance);else {Object.assign(CAST.player,BASE_PLAYER_PALETTE,OUTFIT_RAMPS[id]||{});buildChars();}}
function drawOutfitPreview(canvas,id){if(typeof paintCharacterPreview==='function')paintCharacterPreview(canvas,activeAppearance,id);}


function drawChapterRoom(c,v){
 const radio=v.id==='radio',x=54*16,y=43*16;
 // Authored console: racks, tapes and waveforms stay on solid furniture.
 c.fillStyle='#101421';c.fillRect(x+3,y+4,120,21);
 for(let i=0;i<10;i++){c.fillStyle=v.color;c.fillRect(x+7+i*11,y+7,5,2);c.fillStyle='#586582';c.fillRect(x+8+i*11,y+13,2,8);c.fillStyle='#ffe5b3';c.fillRect(x+7+i*11,y+16-i%3,4,2);}
 c.fillStyle='#050b17';c.fillRect(54*16,40*16,112,34);
 c.fillStyle=v.color;
 if(radio){for(let i=0;i<45;i++)c.fillRect(54*16+8+i*2,40*16+16-(i*7%12)/2,1,3+i*7%12);pixelText(c,'ON AIR / 03.17',54*16+7,40*16+27,v.color);}
 else {for(let i=0;i<12;i++){c.fillStyle=i%3?'#91caff':'#f5a4d8';c.fillRect(54*16+6+i%6*17,40*16+6+Math.floor(i/6)*12,12,7);}pixelText(c,'RESIDENTS / 12',54*16+6,40*16+28,v.color);}
 for(let row=0;row<3;row++)for(let i=0;i<8;i++){c.fillStyle=['#8b79a5','#518787','#b89370'][i%3];c.fillRect(66*16+5+i*5,46*16+4+row*13,3,9);}
 pixelText(c,radio?'KEEP YOUR VOICE':'EVERY RECORD A LIFE',52*16,41*16,v.color);
}
function paintChapterCity(W,done,choice){
 if(W.interior||W.minipixel)return;
 const c=W.staticCanvas.getContext('2d');
 if(typeof bgeo!=='function'){
 for(const v of VENUES.filter(v=>['radio','archive'].includes(v.id))){
  const b=W.buildings.find(b=>b.x===v.x&&b.y===v.y);if(!b)continue;
  const x=b.x*16,y=b.y*16,w=b.w*16,h=b.h*16;
  c.fillStyle='#080d1d';c.fillRect(x+4,y+6,w-8,31);
  c.fillStyle=v.color;c.fillRect(x+4,y+6,w-8,1);pixelText(c,v.sign,x+8,y+13,v.color);
  const live=v.id==='radio'?done.has('broadcast'):done.has('restore');
  pixelText(c,live?(v.id==='radio'?'LIVE / 03.17':'12 / ACTIVE'):(v.id==='radio'?'SIGNAL LOST':'12 / MISSING'),x+8,y+25,live?'#75f5d1':'#ed91a1');
  if(v.id==='radio'){
   c.fillStyle='#90a3c1';c.fillRect(x+w-15,y-20,2,24);c.fillRect(x+w-25,y-12,22,1);c.fillRect(x+w-22,y-17,16,1);
   c.fillStyle=live?'#75f5d1':'#ed91a1';c.fillRect(x+w-16,y-22,4,3);
  }
  for(let i=0;i<12;i++){c.fillStyle=live?'#ffd99a':'#29334a';c.fillRect(x+8+i%6*13,y+43+Math.floor(i/6)*10,8,6);}
  c.fillStyle='#101628';c.fillRect(x+5,y+h-12,w-10,10);
  pixelText(c,done.has('broadcast')?(choice==='community'?'WE ARE HERE':'REVIEW IN PROGRESS'):'REMEMBER US',x+8,y+h-10,v.color);
 }
 }else{
 for(const v of VENUES.filter(v=>['radio','archive'].includes(v.id))){
  const b=W.buildings.find(b=>b.x===v.x&&b.y===v.y);if(!b)continue;
  const g=bgeo(b),x=g.x,y=g.y,w=g.w,rh=g.fy-g.y,R=(a,d,ww,hh,col,al)=>BR(c,a,d,ww,hh,col,al);
  const live=v.id==='radio'?done.has('broadcast'):done.has('restore');
  // Rooftop billboard: a framed, lit board standing on the roof, with a cast shadow.
  const ph=Math.max(16,Math.min(31,rh-13)),px=x+7,py=y+8,pw=w-14;
  if(!W['_bb'+v.id]){W['_bb'+v.id]=1;R(px+3,py+3,pw,ph,'#02060c',.4);R(px+5,py+5,pw,ph,'#02060c',.14);R(px-3,py-3,pw+6,ph+6,v.color,.07);} // one-time: alpha layers must not accumulate on repaint
  R(px-1,py-1,pw+2,ph+2,'#1a2236');R(px-1,py-1,pw+2,.5,lite('#4a5878',.4));
  R(px,py,pw,ph,'#080d1d');R(px,py,pw,1,v.color);R(px,py+ph-1,pw,.5,v.color,.5);R(px,py,.5,ph,v.color,.5);
  R(px-2,py+ph-.5,2,3,'#2a3040');R(px+pw,py+ph-.5,2,3,'#2a3040');
  pixelText(c,v.sign,px+4,py+4,v.color);
  pixelText(c,live?(v.id==='radio'?'LIVE / 03.17':'12 / ACTIVE'):(v.id==='radio'?'SIGNAL LOST':'12 / MISSING'),px+4,py+12,live?'#75f5d1':'#ed91a1');
  if(ph>=26)pixelText(c,done.has('broadcast')?(choice==='community'?'WE ARE HERE':'REVIEW IN PROGRESS'):(v.id==='radio'?'KEEP YOUR VOICE':'REMEMBER US'),px+4,py+20,v.color);
  for(let k=0;k<6;k++)R(px+pw-6-k*3,py+4,2,2,live?(k%2?'#75f5d1':'#ffd99a'):'#29334a');
  if(v.id==='radio'){
   // Mast with guy-wires and a beacon; a long shadow falls across the roof.
   R(x+w-13,y-20,2,24,'#2a3040');R(x+w-13,y-20,.5,24,'#90a3c1');R(x+w-25,y-12,22,1,'#90a3c1');R(x+w-22,y-17,16,1,'#90a3c1');
   if(!W._mastShadow){W._mastShadow=1;R(x+w-11,y+3,3,12,'#02060c',.28);}
   R(x+w-14,y-22.5,4,3,live?'#75f5d1':'#ed91a1');c.globalAlpha=.22;BD(c,x+w-12,y-21,5,5,live?'#75f5d1':'#ed91a1');c.globalAlpha=1;
  }
 }
 }
 // A lit walking trail links the newly explorable west/east destinations.
 for(let x=41;x<80;x++)if(!W.solid[44*MW+x]){c.fillStyle=x%3===0?'#ed91d2':'#3b526a';c.fillRect(x*16+2,44*16+13,8,1);}
}
