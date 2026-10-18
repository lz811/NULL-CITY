'use strict';
// UI adapters read the same campaign/save state; there is no parallel quest state.
const SIGNAL_ASSETS={version:2,room:'assets/signal-lost/tape-room.png'};
function initSignalRoom(api){
 const intro=document.querySelector('#intro');intro.replaceChildren();intro.className='intro tape-room';
 const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text)e.textContent=text;return e;};
 const scenery=make('div','room-scenery');scenery.setAttribute('aria-hidden','true');intro.append(scenery,make('div','window-rain'));
 const mast=make('div','room-mast');mast.append(make('span','','NULL//CITY'),make('span','','SIGNAL LOST'));intro.append(mast);
 const tv=make('section','room-tv');tv.setAttribute('aria-label','Телевизор');tv.append(make('div','tv-channel','AV 1 / LOCAL'),make('h1','','NULL//CITY'),make('p','tv-signal','SIGNAL LOST'),make('p','tv-episode'));
 const status=make('p','tv-status');status.setAttribute('role','status');tv.append(status);intro.append(tv);
 const vcr=make('div','vcr-deck');vcr.append(make('span','vcr-clock','03:17'),make('div','vcr-slot'),make('span','vcr-play','STOP ■'));intro.append(vcr);
 const controls=make('section','room-controls');const play=make('button','primary','Продолжить');play.id='start';const tapes=make('button','secondary','Выбрать кассету');const settings=make('button','secondary','Настройки');const profile=make('button','secondary','Персонаж');controls.append(play,tapes,profile,settings);intro.append(controls);initGameMenu(api,controls);
 const shelf=make('section','tape-shelf');shelf.setAttribute('aria-label','Полка кассет');const heading=make('div','shelf-heading');heading.append(make('h2','','Архив кассет'));const eject=make('button','secondary','Закрыть полку');heading.append(eject);shelf.append(heading);const list=make('div','tape-list');shelf.append(list);intro.append(shelf);
 const loading=make('section','vhs-loading');loading.hidden=true;loading.append(make('p','','PLAY ►'),make('h2','','Сигнал найден'),make('div','tracking-line'));const skip=make('button','secondary','Пропустить переход');loading.append(skip);intro.append(loading);
 const foot=make('div','room-foot','Ночной дождь. Чужая запись. Твоя следующая смена.');intro.append(foot);
 let selected='chapter1',timer=null,insertTimer=null;
 const scene=name=>{document.documentElement.dataset.scene=name;const room=!intro.classList.contains('hidden');for(const el of document.querySelectorAll('#app>header,main>aside,#app>footer,#stage>:not(#intro)'))el.inert=room;};
 function refresh(){
  const m=api.getModel(),current=api.caseList.find(q=>!m.done.includes(q.id));
  tv.querySelector('.tv-episode').textContent=current?'Эпизод '+(current.chapter||1)+' / '+current.title:'Путь к NEXUS / округа столицы';
  status.textContent=(m.started?'Сохранение найдено':'Новая запись')+' · '+m.done.length+'/'+api.caseList.length+' дел';play.textContent=m.started?'Продолжить запись':'Начать первую смену';
  list.replaceChildren();
  const entries=[{id:'chapter1',n:'01',name:'Потерянный адрес',sub:'Основы · 7 дел',ids:api.caseList.slice(0,7),ready:true},{id:'chapter2',n:'02',name:'Частота живых',sub:'Расследование · 4 дела',ids:api.caseList.slice(7),ready:m.done.includes('report')},{id:'oscp',n:'03',name:'OSCP / Введение',sub:'Одно занятие. Полный курс в разработке.',ready:true},{id:'security',n:'04',name:'Security+ / Введение',sub:'Одно занятие. Полный курс в разработке.',ready:true},{id:'web',n:'05',name:'Web Security',sub:'Нет доступного эпизода',ready:false},{id:'reverse',n:'06',name:'Reverse',sub:'Нет доступного эпизода',ready:false}];
  entries.forEach(t=>{const b=make('button','cassette'+(!t.ready?' locked':''));b.disabled=!t.ready;b.dataset.tape=t.id;b.append(make('span','tape-number',t.n),make('span','tape-spools','◉ ━━━━━ ◉'));const label=make('span','tape-label');label.append(make('strong','',t.name),make('small','',t.ids?`${t.ids.filter(q=>m.done.includes(q.id)).length}/${t.ids.length} завершено · ${t.ready?t.sub:'после первой главы'}`:t.sub));b.append(label);b.onclick=()=>{selected=t.id;shelf.classList.remove('open');launch(selected);};list.append(b);});
 }
 function finish(){clearTimeout(timer);clearTimeout(insertTimer);timer=null;intro.querySelector('.moving-tape')?.remove();loading.classList.remove('inserting');loading.hidden=true;intro.classList.add('hidden');document.querySelector('#app').inert=false;scene('WORLD');api.start();
  if(['oscp','security'].includes(selected))api.course(selected);else if(selected==='chapter1'&&api.getModel().done.includes('report'))api.journal();else if(selected==='chapter2')api.navigate();
 }
 function launch(id){selected=id;api.save();if(api.getModel().settings.calm||matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}loading.hidden=false;loading.classList.add('inserting');const moving=make('div','moving-tape','◉ ━━━━━ ◉');moving.append(make('span','','NULL//CITY / '+id));intro.append(moving);insertTimer=setTimeout(()=>{moving.remove();loading.classList.remove('inserting');},650);scene('LOADING');intro.classList.add('playing');vcr.querySelector('.vcr-play').textContent='PLAY ►';api.clickSound?.();timer=setTimeout(finish,1600);skip.focus();}
 function show(){api.pause();intro.classList.remove('hidden','playing');shelf.classList.remove('open');loading.hidden=true;refresh();scene('TAPE_ROOM');play.focus();}
 play.onclick=()=>launch(api.getModel().done.includes('report')?'chapter2':'continue');tapes.onclick=()=>{refresh();shelf.classList.add('open');scene('CASSETTE_SELECT');list.querySelector('button:not(:disabled)')?.focus();};eject.onclick=()=>{shelf.classList.remove('open');scene('TAPE_ROOM');tapes.focus();};settings.onclick=api.settings;profile.onclick=api.profile;skip.onclick=finish;
 document.querySelector('#home').onclick=e=>{e.preventDefault();api.close();show();};document.querySelector('#courses').onclick=()=>{show();tapes.click();};
 intro.addEventListener('keydown',e=>{if(e.key==='Escape'){if(timer)finish();else if(shelf.classList.contains('open'))eject.click();}if(e.key==='Tab'){const items=[...intro.querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 const image=new Image();image.onload=()=>intro.classList.add('art-loaded');image.onerror=()=>{status.textContent='Иллюстрация не загрузилась. Игра доступна.';const retry=make('button','secondary','Повторить загрузку иллюстрации');retry.onclick=()=>{image.src=SIGNAL_ASSETS.room+'?retry='+Date.now();};controls.append(retry);};image.src=SIGNAL_ASSETS.room;
 new MutationObserver(()=>{
  const modal=document.querySelector('#modal'),open=modal.classList.contains('open');
  if(!open){scene(intro.classList.contains('hidden')?'WORLD':'TAPE_ROOM');return;}
  scene(modal.querySelector('.workspace')?'TERMINAL':modal.querySelector('.journal-grid')?'JOURNAL':'DIALOGUE');
  const body=modal.querySelector('.dialogue-body');if(body&&!body.querySelector('.story-portrait')){
   const title=modal.querySelector('h2')?.textContent||'',who=/Юна|Юне|орбиты/.test(title)?1:/Эхо|Частота|Голос,/.test(title)?2:/Иво|Архив|Двенадцать|Ключ/.test(title)?3:0;
   const portrait=make('div','story-portrait');portrait.style.setProperty('--face',who);portrait.setAttribute('role','img');portrait.setAttribute('aria-label',['Мара','Юна','Эхо','Иво'][who]);body.prepend(portrait);
  }
 }).observe(document.querySelector('#modal'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 refresh();scene('TAPE_ROOM');
 return {show,refresh};
}
