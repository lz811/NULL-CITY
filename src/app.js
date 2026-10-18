import {freshState,restoreState,execute,caseReady,OUTFITS,wallet,buyOutfit,storyReward,normalizeAppearance} from './simulator.mjs?v=123';
const $=s=>document.querySelector(s);
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const SAVE_KEY='nullcity_nightshift_v1';
let model;try{model=restoreState(JSON.parse(localStorage.getItem(SAVE_KEY)));}catch{model=freshState();}
window.State={done:new Set(model.done),accepted:new Set(CASES.map(c=>c.id))};
window.activeQuest=()=>CASES.find(c=>!State.done.has(c.id));
window.questProgress=()=>0;
window.questSitesFor=()=>game?.district?.id!=='streets'?capitalSites():CASES.filter(c=>!c.venue&&(c.id===activeQuest()?.id||State.done.has(c.id)&&c.id!=='report')).map(c=>{const p=game.world.minipixel?Minipixel.get().site(c.id,Number(c.number)-1):findOpen(game.world,c.x,c.y);return {...c,x:p.x,y:p.y+(game.world.minipixel?0:5),action:c.place,label:c.title,index:Number(c.number)-1};});
let lastFocus=null,transcript={},history=[],historyIndex=0,previousTask=null,miniBase=null,audioContext=null,audioGain=null,scale=3,saveTimer=0;
let cityScene=null,activeVenue=null,cityZoom=1;
const reach=()=>game.world.minipixel?6:30;
const view=$('#view'),stage=$('#stage');
function save(){
 model.done=[...State.done];if(window.game?.player)model.position=game.district.id!=='streets'?model.position:cityScene?{...cityScene.player}:{x:game.player.x,y:game.player.y};if(model.position)model.position.world='classic-oblique-v1';model.interiorId=activeVenue?.id||null;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(model));$('#save-status').textContent='● Прогресс сохранён на этом устройстве';}
 catch{$('#save-status').textContent='! Хранилище недоступно. Экспортируй сохранение в настройках.';}
}
function toast(text){game.say(text);game.toastT=5500;}
function layout(){
 const r=stage.getBoundingClientRect();$('#city-zoom').hidden=!!game.world?.interior;scale=(r.width>1450?3:2)*(game.world?.interior?1:cityZoom);game.renderer.cityDensity=scale;
 const w=Math.max(24,Math.floor(r.width/scale)),h=Math.max(24,Math.floor(r.height/scale));game.renderer.configureView(w,h,false);
 view.style.width=w*scale+'px';view.style.height=h*scale+'px';$('#frame').style.width=w*scale+'px';$('#frame').style.height=h*scale+'px';
}
function modal(title,label){
 lastFocus=document.activeElement;game.paused=true;game.keys={};game.path=[];
 const root=$('#modal');root.replaceChildren();root.classList.add('open');
 const card=node('section','modal-card'),head=node('div','modal-head'),titles=node('div');
 titles.append(node('div','micro mint',label));const h=node('h2','',title);h.id='modal-title';titles.append(h);
 const close=node('button','close','×');close.setAttribute('aria-label','Закрыть');close.onclick=closeModal;head.append(titles,close);card.append(head);root.append(card);close.focus();return card;
}
function closeModal(){
 game.player.hacking=false;
 $('#modal').classList.remove('open');$('#modal').replaceChildren();game.paused=!$('#intro').classList.contains('hidden');game.keys={};save();
 if(lastFocus?.isConnected)lastFocus.focus();else view.focus({preventScroll:true});
}
function button(text,action,cls='primary'){const b=node('button',cls,text);b.onclick=action;return b;}
function dialogue(title,text,action,label='Продолжить →'){
 const card=modal(title,'NULL CITY / НОЧНАЯ СМЕНА'),body=node('div','dialogue-body');body.append(node('div','micro mint',title==='Твоя первая смена'?'МАРА / МАСТЕРСКАЯ 04':title.toUpperCase()),node('p','quote',text));
 body.append(button(label,()=>{closeModal();action?.();}));card.append(body);
}
function updateUI(){
 const q=activeQuest(),count=State.done.size;$('#progress').style.width=count/CASES.length*100+'%';$('.version').textContent=(q?.number||String(CASES.length))+' / '+CASES.length;$('#done-count').textContent=count+' / '+CASES.length;
 $('#xp').replaceChildren(document.createTextNode(wallet(model)+' '),node('small','','XP'));$('#rank').textContent=count>=11?'Хранитель памяти':count>=7?'Оператор квартала':count>=4?'Исследователь':count>=2?'Младший техник':'Стажёр';
 const current=$('#current-case');current.replaceChildren(node('div','case-label',q?`ДЕЛО ${q.number} / ${q.tag}`:'ГЛАВА ЗАВЕРШЕНА'),node('h3','',q?.title||'Город помнит'),node('p','',q?.goal||'Двенадцать домов восстановлены. Радио снова в эфире. Вернись к Эхо и Иво: город помнит твой выбор.'));
 $('#navigate').replaceChildren(document.createTextNode(q?(q.venue&&q.venue===activeVenue?.id?'▤ Открыть дело':'↗ Проложить маршрут'):'◎ Карта столицы'),node('kbd','','G'));
 $('#case-list').replaceChildren();CASES.forEach(c=>{const done=State.done.has(c.id),active=q?.id===c.id;const b=button('',()=>{if(done)openCaseReview(c);else if(active)navigateTask();else toast('Сначала заверши предыдущие дела: здесь нужны полученные навыки.');},'case-row'+(done?' done':active?' active':''));b.append(node('span','step',done?'✓':c.number),node('span','',c.title),node('span','status',active?'↗':done?'':'·'));b.setAttribute('aria-label',`${c.title}: ${done?'завершено':active?'активно':'позже'}`);$('#case-list').append(b);});
 $('#mentor-line').textContent=count>=7?'«Ты вернул городу человека. Теперь умеешь искать ответы».':count>=3?'«Не торопись с выводами. Сначала сохрани то, что можешь доказать».':'«Не нужно знать всё. Начни с правильного вопроса». ';
 $('.aside-head .micro').textContent=count>=7?'ГЛАВА 02 / ЧАСТОТА ЖИВЫХ':'ТВОЯ ПЕРВАЯ СМЕНА';$('.campaign-title').textContent=count>=7?'Частота живых_':'Потерянный адрес_';$('.chapter-stamp span').textContent=count>=7?'02 — LIVING FREQUENCY':'01 — LOST ADDRESS';
 if(window.game?.world){if(!activeVenue)game.questSites=questSitesFor();if(game.district.id==='streets')paintChapterCity(cityScene?.world||game.world,State.done,model.story.broadcastChoice);else updateCapitalHUD();}
}
function openCaseReview(q){const card=modal(q.title,'ЗАВЕРШЁННОЕ ДЕЛО / '+q.skill),body=node('div','modal-body');body.append(node('p','',q.result),node('div','micro mint','ЧТО ТЫ ОСВОИЛ'),node('p','',q.concept),node('p','',`Подсказок использовано: ${model.hints[q.id]||0}.`));body.append(button('Повторить практику в отдельной песочнице',()=>openPractice(q),'secondary'));card.append(body);}
function openPractice(q){
 if(q.id==='report'){openReport(true);return;}
 const practice=restoreState({...model,flags:{}});if(q.id==='dns')practice.dns='10.24.4.99';if(q.id==='firewall')practice.blocked=[];if(q.id==='logs')practice.files={};if(q.id==='transfer'){practice.backupDns='10.24.4.53';practice.backupGateway='10.24.4.1';}
 openTerminal(q,practice);
}
function openTerminal(q,practice=null){
 if(q.id==='report'){openReport();return;}
 const state=practice||model,card=modal(q.title,`${practice?'ПОВТОРЕНИЕ / ':''}ДЕЛО ${q.number} / ${q.place}`),workspace=node('div','workspace'),brief=node('section','brief'),term=node('section','terminal');
 brief.append(node('div','micro mint',q.skill.toUpperCase()),node('p','',q.intro),node('p','goal',q.goal));
 const detail=node('details'),summary=node('summary','','Как это работает');detail.append(summary,node('p','',q.lesson));if(q.id==='first')detail.open=true;brief.append(detail);
 const checks=node('div');brief.append(checks);
 const mentor=q.id==='first'?node('p','terminal-mentor'):null;if(mentor){mentor.setAttribute('role','status');brief.append(mentor);}
 let hintIndex=practice?0:state.hints[q.id]||0;const hint=button('Нужна подсказка · '+hintIndex+'/3',()=>{hintIndex=Math.min(3,hintIndex+1);hintText.textContent=q.hints[hintIndex-1];hint.textContent='Подсказка · '+hintIndex+'/3';if(!practice){state.hints[q.id]=hintIndex;save();}},'hint-button');const hintText=node('p','hint-text',hintIndex?q.hints[hintIndex-1]:'');brief.append(hint,hintText);
 term.append(node('div','terminal-top','● ● ●   '+(q.id==='transfer'?'backup@archive':'operator@district-04')+' : ~'));
 const output=node('div');output.id='terminal-output';output.setAttribute('role','log');output.setAttribute('aria-label','Результат команд');output.setAttribute('aria-live','polite');
 const key=q.id+(practice?':practice':'');if(practice)transcript[key]=[];
 if(!transcript[key])transcript[key]=[{text:'NULL OS [учебная модель] / сессия открыта\nВведи help для справки. Команда + Enter.\n'}];
 const paintOutput=()=>{output.replaceChildren();transcript[key].forEach(row=>output.append(node('div','terminal-line'+(row.command?' command':row.error?' error':''),row.text)));output.scrollTop=output.scrollHeight;};
 const topology=node('div','topology');topology.setAttribute('aria-label','Компоненты учебной сети — не последовательность маршрута');
 if(['route','dns','firewall'].includes(q.id))term.append(topology);
 term.append(output);
 const form=node('form','terminal-form'),label=node('label','','~ $'),input=node('input');input.id='command';label.htmlFor=input.id;input.autocomplete='off';input.spellcheck=false;input.autocapitalize='off';input.setAttribute('aria-label','Команда терминала');input.placeholder='введи команду…';const send=node('button','','↵');send.type='submit';send.setAttribute('aria-label','Выполнить команду');form.append(label,input,send);term.append(form);
 const suggestions=node('div','suggestions');q.commands.forEach(c=>suggestions.append(button(c,()=>{input.value=c;input.focus();},'')));term.append(suggestions,node('div','terminal-foot','OFFLINE SANDBOX / команды меняют только модель этой миссии'));
 workspace.append(brief,term);card.append(workspace);game.player.hacking=true;
 const bottom=node('div','complete-row'),status=node('small','',''),finish=button(practice?'Завершить повторение':'Зафиксировать результат →',()=>{if(!caseReady(state,q))return;if(practice){closeModal();toast('Практика завершена. Основное сохранение не изменено.');}else completeCase(q);});bottom.append(status,finish);card.append(bottom);
 const renderChecks=()=>{
 if(mentor)mentor.textContent=!state.flags.pwd?'МАРА → Введи pwd и нажми Enter. Сначала выясним, в какой папке ты находишься.':!state.flags.ls?'МАРА → Теперь ls: посмотрим, какие файлы здесь лежат.':!state.flags.brief?'МАРА → Видишь brief.txt? Прочитай его: cat brief.txt. Эти команды ничего не удаляют.':'МАРА → Ты прочитал заявку. Нажми «Зафиксировать результат»: теперь у нас есть первая зацепка.';
 if(topology.isConnected){
  const backup=q.id==='transfer',gwOK=!backup||state.backupGateway==='10.61.7.1',dnsOK=backup?state.backupDns==='10.61.7.53':state.dns==='10.24.4.53',webOK=gwOK&&dnsOK&&!state.blocked.includes('all')&&!state.blocked.includes(backup?'10.61.9.40':'10.24.8.20');
  topology.replaceChildren();
  [[backup?'10.61.7.22':'10.24.4.18','ТЕРМИНАЛ',true],[backup?state.backupGateway:'10.24.4.1','ШЛЮЗ',gwOK],[backup?state.backupDns:state.dns,'DNS',dnsOK],[backup?'archive.city':'portal.city','СЕРВИС',webOK]].forEach(([address,label,ok],i)=>{if(i)topology.append(node('span','topology-link','·'));const n=node('div','topology-node'+(ok?' online':' offline'));n.append(node('span','',label),node('strong','',address),node('small','',ok?'● ONLINE':'● CHECK'));topology.append(n);});
 }
 checks.replaceChildren(...q.checks.map(([flag,text])=>node('div','check'+(state.flags[flag]?' yes':''),(state.flags[flag]?'✓ ':'○ ')+text)));const ready=caseReady(state,q);finish.disabled=!ready;status.textContent=ready?'✓ Результат подтверждён':'Проверяется состояние учебной системы';};
 form.onsubmit=e=>{e.preventDefault();const cmd=input.value.trim();if(!cmd)return;history.push(cmd);historyIndex=history.length;transcript[key].push({text:'~ $ '+cmd,command:true});const result=execute(state,q.id,cmd);if(result.clear)transcript[key]=[];else transcript[key].push(result);if(transcript[key].length>160)transcript[key].splice(0,20);input.value='';paintOutput();renderChecks();if(!practice)save();};
 input.onkeydown=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.max(0,Math.min(history.length,historyIndex+(e.key==='ArrowUp'?-1:1)));input.value=history[historyIndex]||'';}};
 paintOutput();renderChecks();input.focus();
}
function completeCase(q){
 if(State.done.has(q.id)||!caseReady(model,q))return;
 State.done.add(q.id);model.xp+=q.xp;save();updateUI();soundChime();
 const card=modal(q.title,'ДЕЛО ЗАВЕРШЕНО'),body=node('div','dialogue-body');body.append(node('div','reward','+'+q.xp+' XP'),node('p','quote',q.result),node('div','micro mint','НАВЫК: '+q.skill.toUpperCase()),node('p','',q.concept));body.append(button(activeQuest()?'Следующее дело →':'Итоги смены →',()=>{closeModal();const next=()=>{if(activeQuest())navigateTask();else openEnding();};if(STORY_CALLS[q.id])openStoryCall(q.id,next);else next();}));card.append(body);
}
function openReport(review=false){
 const q=CASES[6],card=modal('Человек за записью','ДЕЛО 07 / ОТЧЁТ ПО ИНЦИДЕНТУ'),body=node('div','modal-body');body.append(node('p','',q.intro),node('p','',q.lesson));
 const fields=[['Причина недоступности портала',[['','Выбери подтверждённый вывод'],['cable','Физически оборван кабель'],['dns','Изменён адрес DNS; сервер по IP был доступен'],['server','Городской сервер полностью выключен']]],['Что подтверждает сохранённый журнал',[['','Выбери доказательство'],['person','Мара — владелец учётной записи ghost-17'],['record','ghost-17 изменил DNS и запустил экспорт реестра'],['none','Юны никогда не существовало']]],['Принятые меры',[['','Выбери действия'],['all','Полностью отключить квартал и удалить журналы'],['fixed','Вернуть DNS, сохранить журнал, ограничить экспорт, проверить портал'],['wait','Скрыть предупреждение и ждать']]]];
 const selects=[];fields.forEach(([label,opts])=>{const wrap=node('label','report-field',label),select=node('select');opts.forEach(([value,text])=>{const op=node('option','',text);op.value=value;select.append(op);});selects.push(select);wrap.append(select);body.append(wrap);});
 const delivery=node('label','report-field','Кому передать копию отчёта?'),dest=node('select');[['community','Представителям жителей — они узнают, что случилось'],['engineers','Городским инженерам — они начнут проверку других узлов']].forEach(([value,text])=>{const o=node('option','',text);o.value=value;dest.append(o);});delivery.append(dest);body.append(delivery);
 const feedback=node('div','feedback');feedback.setAttribute('role','status');body.append(feedback);
 body.append(button('Подписать отчёт →',()=>{if(selects.map(s=>s.value).join(',')!=='dns,record,fixed'){feedback.textContent='Проверь выводы по журналу: IP работал, DNS был изменён. Имя учётной записи не доказывает личность владельца. Меры должны сохранять работу города.';return;}if(review){feedback.textContent='✓ Отчёт составлен верно. Основное сохранение не изменено.';return;}model.ending=dest.value;completeCase(q);}));card.append(body);
}
function reportText(){return `NULL//CITY — ОТЧЁТ / ГЛАВА 01\n\nИнцидент: потерянный адрес\nПричина: изменён DNS. Сервер был доступен по IP.\nУлика E-01: /evidence/access.log, 03:17–03:18.\nУчётная запись ghost-17: dns.change, registry.export.\nЛичность владельца не установлена.\nМеры: штатный DNS восстановлен; журнал сохранён;\n203.0.113.66 заблокирован; портал проверен; резервный архив доступен.\nЗапись YUNA: восстановлена.\nКопия передана: ${model.ending==='community'?'представителям жителей':'городским инженерам'}.\n\nОсвоенные навыки: терминал, IP, шлюз, DNS, журналы, firewall, отчёт.\nЭто результаты учебной главы, не профессиональная сертификация.\n\nЗаметки оператора:\n${model.notes}`;}
function download(name,text,type='text/plain'){const url=URL.createObjectURL(new Blob([text],{type}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openEnding(){
 if(State.done.has('broadcast')){openChapterEnding();return;}
 const card=modal('Город помнит.','ГЛАВА 01 / ЗАВЕРШЕНА'),body=node('div','modal-body');body.append(node('div','reward','07 / 07'),node('p','quote','«Он позвонил. Сказал, что с орбиты дождя не видно». — Юна'),node('p','',model.ending==='community'?'Жители получили копию отчёта. Утром у мастерской появится очередь: у каждого есть история, которую город предпочёл забыть.':'Инженеры получили копию отчёта. Ночью приходит ответ: тот же идентификатор найден ещё на двенадцати узлах.'),node('p','', 'На обороте служебного пропуска — знак NEXUS. На частоте 03.17 кто-то говорит голосом Мары. Радиостанция ждёт тебя: глава «Частота живых» уже доступна.'));
 const badges=node('div');['ТЕРМИНАЛ','ДИАГНОСТИКА СЕТИ','DNS','РАССЛЕДОВАНИЕ','ЗАЩИТА'].forEach(s=>badges.append(node('span','badge',s)));body.append(badges);
 const actions=node('div','modal-actions');actions.append(button('Скачать отчёт ↓',()=>download('NULL-CITY-report.txt',reportText())),button('Вернуться в город',closeModal,'secondary'));body.append(actions);card.append(body);
}
function openJournal(){const card=modal('Полевой журнал','ТВОИ ДЕЛА / ДОКАЗАТЕЛЬСТВА / ЗАМЕТКИ'),body=node('div','modal-body'),grid=node('div','journal-grid'),left=node('div'),right=node('div');CASES.forEach(q=>{const row=node('div','journal-item');row.append(node('h3','',(State.done.has(q.id)?'✓ ':'○ ')+q.number+' / '+q.title),node('p','',State.done.has(q.id)?q.concept:q.id===activeQuest()?.id?q.goal:'Ещё не открыто'));left.append(row);});right.append(node('div','micro mint','УЛИКА E-01'),node('p','',model.flags.evidence?'03:17 → ghost-17 изменил DNS. 03:18 → запустил registry.export. Источник: сохранённая копия /evidence/access.log. Личность владельца неизвестна.':'Здесь появятся сохранённые доказательства.'),node('label','micro mint','ЗАМЕТКИ ОПЕРАТОРА'));const notes=node('textarea','notes');notes.value=model.notes;notes.placeholder='Гипотезы, адреса, важные наблюдения…';notes.setAttribute('aria-label','Заметки оператора');notes.oninput=()=>{model.notes=notes.value;clearTimeout(saveTimer);saveTimer=setTimeout(save,300);};right.append(notes,button('Полевой справочник →',openGuide,'text-button'));if(State.done.has('report'))right.append(button('Скачать отчёт ↓',()=>download('NULL-CITY-report.txt',reportText()),'secondary'));if(State.done.has('report')){right.append(node('h3','','Частота живых'),node('p','',model.story.broadcastChoice==='community'?'Эхо передала проверенные доказательства в эфир. Радио стало местом взаимопомощи.':model.story.broadcastChoice==='engineers'?'Доказательства переданы инженерам. Иво организовал проверку остальных узлов.':'Эхо ждёт на Радио 03.17. Иво хранит резервные копии в Архиве памяти.'));}appendStoryJournal(right);appendRadioJournal(right);grid.append(left,right);body.append(grid);const tabs=node('nav','journal-tabs');tabs.setAttribute('aria-label','Разделы журнала');[['MAIN','Текущие'],['SIDE','Истории и улики'],['COMPLETED','Завершённые']].forEach(([key,label])=>{const b=button(label,()=>{left.hidden=key==='SIDE';right.hidden=key==='COMPLETED';[...left.children].forEach((row,i)=>row.hidden=key==='MAIN'?State.done.has(CASES[i].id):key==='COMPLETED'?!State.done.has(CASES[i].id):false);tabs.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));},'');b.setAttribute('aria-pressed','false');tabs.append(b);});card.append(tabs,body);tabs.firstChild.click();}
function openGuide(){const card=modal('Полевой справочник','ОСНОВЫ / ВСЕГДА ПОД РУКОЙ'),body=node('div','modal-body');GLOSSARY.forEach(([name,text])=>{const item=node('div','journal-item');item.append(node('h3','',name),node('p','',text));body.append(item);});const item=node('div','journal-item');item.append(node('h3','','Управление'),node('p','','WASD / стрелки — ходить. Shift — бежать. Клик по улице — идти по маршруту. E — взаимодействовать. G — маршрут к делу. V — сетевое зрение. J — журнал. Esc — закрыть окно. На телефоне используй джойстик и кнопку E.'));body.append(item);body.append(button('Снова включить подсказки Мары',()=>{model.story.tutorialSkip=false;save();closeModal();},'secondary'),button('Прослушать вступление',()=>openPrologue(),'secondary'));card.append(body);}
function openSettings(){
 const card=modal('Настройки','СОХРАНЕНИЕ / ДОСТУПНОСТЬ'),body=node('div','modal-body');
 [['sound','Атмосферный звук'],['calm','Уменьшить движение и мигание']].forEach(([key,label])=>{const wrap=node('label','settings-row',label),input=node('input');input.type='checkbox';input.checked=model.settings[key];input.onchange=()=>{model.settings[key]=input.checked;if(key==='sound')setAudio(input.checked);if(key==='calm')applyVisualSettings();save();};wrap.append(input);body.append(wrap);});
 const qualityLabel=node('label','settings-row','Качество графики'),quality=node('select');[['cinematic','Кинематографично'],['balanced','Сбалансированно'],['low','Экономно']].forEach(([v,t])=>{const o=node('option','',t);o.value=v;quality.append(o);});quality.value=model.settings.quality;quality.onchange=()=>{model.settings.quality=quality.value;applyVisualSettings();save();};qualityLabel.append(quality);body.append(qualityLabel);
 const weatherLabel=node('label','settings-row','Погода и время суток'),weather=node('select');weather.setAttribute('aria-label','Погода и время суток');[['auto','Плавный цикл'],['day','Ясный день'],['sunset','Закат'],['night','Ночь'],['rain','Дождь'],['heavy','Ливень'],['fog','Туман'],['storm','Гроза']].forEach(([v,t])=>{const o=node('option','',t);o.value=v;weather.append(o);});weather.value=model.settings.weather;weather.onchange=()=>{model.settings.weather=weather.value;applyVisualSettings();save();};weatherLabel.append(weather);body.append(weatherLabel);
 for(const [key,label] of [['rain','Дождь'],['scanlines','Слабая маска экрана'],['grain','Текстура экрана']]){const wrap=node('label','settings-row',label),input=node('input');input.type='checkbox';input.checked=model.settings[key];input.onchange=()=>{model.settings[key]=input.checked;applyVisualSettings();save();};wrap.append(input);body.append(wrap);}
 for(const [key,label]of [['ambientVolume','Громкость атмосферы'],['effectsVolume','Громкость эффектов']]){const wrap=node('label','settings-row',label),input=node('input');input.type='range';input.min='0';input.max='100';input.value=model.settings[key];input.oninput=()=>{model.settings[key]=Number(input.value);if(audioGain)audioGain.gain.value=.045*model.settings.ambientVolume/100;save();};wrap.append(input);body.append(wrap);}
 const acts=node('div','modal-actions');acts.append(button('Экспорт сохранения ↓',()=>{save();download('null-city-save.json',JSON.stringify(model,null,2),'application/json');},'secondary'));
 const file=node('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.onchange=async()=>{try{const selected=file.files[0];if(!selected)return;if(selected.size>200000)throw Error('Файл слишком большой.');const raw=JSON.parse(await selected.text());if(raw.version!==1||!Array.isArray(raw.done)||raw.done.some((id,i)=>id!==CASES[i]?.id))throw Error('Неизвестный формат сохранения.');model=restoreState(raw);State.done=new Set(model.done);save();location.reload();}catch(e){feedback.textContent='Не удалось загрузить: '+e.message;}};
 acts.append(button('Импорт сохранения ↑',()=>file.click(),'secondary'));body.append(acts,file);const feedback=node('p','feedback');body.append(feedback,node('p','','Симуляция работает без интернета. Команды терминала исполняются только в учебной модели. Исходный прототип сохранён отдельно.'));
 body.append(button('Начать главу заново',()=>{const c=modal('Начать заново?','СБРОС ПРОГРЕССА'),b=node('div','modal-body');b.append(node('p','','Это удалит прогресс новой главы на этом устройстве. Сначала можно экспортировать сохранение в настройках.'),button('Сбросить и начать',()=>{model=freshState();localStorage.setItem(SAVE_KEY,JSON.stringify(model));location.reload();},'secondary'),button('Отмена',openSettings));c.append(b);},'text-button'));card.append(body);
}
function findPath(target){
 if(game.world.minipixel)return Minipixel.get().path(game.player,target);
 const W=game.world,p=game.player,sx=Math.floor(p.x/16),sy=Math.floor(p.y/16),tx=Math.floor(target.x/16),ty=Math.floor(target.y/16),start=sy*MW+sx,end=ty*MW+tx;
 if(!canStand(W,tx*16+8,ty*16+13))return null;
 const prev=new Int32Array(MW*MH).fill(-1),queue=[start];prev[start]=start;
 for(let j=0;j<queue.length;j++){const n=queue[j];if(n===end)break;const x=n%MW,y=Math.floor(n/MW);for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const k=ny*MW+nx;if(prev[k]!==-1||!canStand(W,nx*16+8,ny*16+13))continue;prev[k]=n;queue.push(k);}}
 if(prev[end]===-1)return null;const path=[];let n=end;while(n!==start){path.push({x:n%MW*16+8,y:Math.floor(n/MW)*16+13});n=prev[n];}return path.reverse();
}
function navigateTask(){
 if(game.district.id!=='streets'){navigateCapital();return;}
 if(activeVenue&&activeQuest()?.venue===activeVenue.id){openTerminal(activeQuest());return;}
 if(activeVenue)leavePlace();
 if(!model.started){startGame();return;}const q=activeQuest();if(!q){openCapitalMap();return;}if(q.venue){navigateVenue(q.venue);return;}const target=game.questSites.find(s=>s.id===q.id);if(!target)return;
 if(Math.hypot(game.player.x-target.x,game.player.y-target.y)<reach()){openTerminal(q);return;}
 const approach=game.world.minipixel?target:[{x:target.x,y:target.y+16},{x:target.x+16,y:target.y},{x:target.x-16,y:target.y},{x:target.x,y:target.y-16}].find(p=>canStand(game.world,p.x,p.y));
 const path=approach?findPath(approach):findPath(target);if(path){game.path=path;toast('Маршрут: '+q.place+'. У терминала нажми E.');view.focus({preventScroll:true});}else toast('Прямой путь закрыт. Найди проход по улицам.');
}
function interact(){
 if(game.paused)return;game.prompt=game.findInteractable();const target=game.interact();if(!target){toast('Подойди к терминалу или персонажу. G покажет маршрут к делу.');return;}
 if(target.kind==='building'){enterPlace(target.obj.id);return;}
 if(target.kind==='room'){roomAction(target.obj.action);return;}
 if(target.kind==='questSite'&&target.obj.gate){enterCapitalGate(target.obj.gate);return;}
 if(target.kind==='questSite'&&target.obj.capital){openCapitalTerminal();return;}
 if(target.kind==='questSite'){const q=CASES.find(c=>c.id===target.obj.id);if(q.id!==activeQuest()?.id){toast('Этот узел понадобится в следующем деле.');return;}openTerminal(q);}
 else if(target.kind==='mentor'&&game.district.id!=='streets'){const d=game.district.id==='capital'?CAPITAL_HUB:CAPITAL_DISTRICTS.find(d=>d.id===game.district.id);dialogue(d.mentor,d.desc,navigateCapital,'К узлу округа →');}
 else if(target.kind==='mentor')dialogue('Мара',activeQuest()?activeQuest().intro:'«Ты сделал всё, что мог доказать. Это и есть хорошая работа».',()=>{if(activeQuest())navigateTask();},activeQuest()?'К текущему делу →':'Вернуться в город');
 else if(target.kind==='npc'&&activeVenue)openResidentStory();
 else if(target.kind==='npc')dialogue(target.obj.name,State.done.has('restore')?'«Окна снова горят. Теперь у нас есть адрес, а у тех, кто его стёр, — вопросы, на которые придётся ответить».':target.obj.line,null,'Вернуться на улицу');
 else toast('Подземный район откроется в следующей кампании.');
}
function buildMini(){if(game.world.minipixel){miniBase=null;return;}const c=document.createElement('canvas');c.width=MW;c.height=MH;const ctx=c.getContext('2d');const W=game.world;for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const v=W.ground[y*MW+x];ctx.fillStyle=W.interior&&W.solid[y*MW+x]?'#182332':v===G.BUILDING?'#2d394c':v===G.WATER?'#15343f':v===G.ROAD?'#4a505b':v===G.PLAZA?'#485965':'#1c2b38';ctx.fillRect(x,y,1,1);}miniBase=c;}
function drawMini(){if(game.world.minipixel){if(Math.floor(game.time/160)!==game.miniFrame){game.miniFrame=Math.floor(game.time/160);Minipixel.get().overview($('#mini'),game);}return;}if(!miniBase)return;const ctx=$('#mini').getContext('2d');ctx.imageSmoothingEnabled=false;if(activeVenue){const r=game.world.room;ctx.drawImage(miniBase,r.x/16,r.y/16,r.w/16,r.h/16,0,0,180,126);ctx.fillStyle='#fff';ctx.fillRect((game.player.x-r.x)/r.w*180-2,(game.player.y-r.y)/r.h*126-2,4,4);return;}ctx.drawImage(miniBase,0,0,180,126);const s=1.5;game.questSites.forEach(q=>{ctx.fillStyle=State.done.has(q.id)?'#75f5d1':q.id===activeQuest()?.id?'#ffce88':'#66778d';ctx.fillRect(Math.floor(q.x/16*s)-2,Math.floor(q.y/16*s)-2,4,4);});for(const door of game.world.interactables||[]){ctx.fillStyle=door.id===activeQuest()?.venue?'#ffce88':'#ef9abf';ctx.fillRect(Math.floor(door.x/16*s)-2,Math.floor(door.y/16*s)-2,4,4);}ctx.fillStyle='#ffffff';ctx.fillRect(Math.floor(game.player.x/16*s)-1,Math.floor(game.player.y/16*s)-1,3,3);ctx.strokeStyle='#b0bcc344';ctx.strokeRect(game.cam.x/16*s,game.cam.y/16*s,game.renderer.vw/16*s,game.renderer.vh/16*s);}
function startGame(){
 $('#intro').classList.add('hidden');game.paused=false;const first=!model.started;model.started=true;save();
 if(model.settings.sound)setAudio(true);if(first||(!model.story.introSeen&&!State.done.has('first')))openPrologue();else{const latest=[...model.done].reverse().find(id=>STORY_CALLS[id]);if(latest&&!model.storyCalls[latest])openStoryCall(latest);else view.focus({preventScroll:true});}
}
function setAudio(on){
 model.settings.sound=on;$('#audio').classList.toggle('on',on);$('#audio').setAttribute('aria-label',on?'Выключить звук':'Включить звук');
 if(on){try{if(!audioContext){audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=.045*model.settings.ambientVolume/100;audioGain.connect(audioContext.destination);const size=audioContext.sampleRate*3,buffer=audioContext.createBuffer(1,size,audioContext.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<size;i++)data[i]=Math.random()*2-1;const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=800;source.connect(filter);filter.connect(audioGain);source.start();[55,82.41,110].forEach(freq=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.frequency.value=freq;oscillator.type='sine';gain.gain.value=.22;oscillator.connect(gain);gain.connect(audioGain);oscillator.start();});}audioContext.resume().catch(()=>{});}catch{toast('Этот браузер не поддерживает аудио.');}}else audioContext?.suspend();save();
}
function soundChime(){if(!audioContext||!model.settings.sound)return;[440,554,659].forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.1;o.frequency.value=f;g.gain.setValueAtTime(Math.max(.0001,.025*model.settings.effectsVolume/100),t);g.gain.exponentialRampToValueAtTime(.001,t+.7);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.8);});}
function zoomCity(value){if(game.world.interior)return;cityZoom=Math.max(.35,Math.min(1.8,value));$('#city-zoom-reset').textContent=Math.round(cityZoom*100)+'%';layout();game.cam.x=game.player.x-game.renderer.vw/2;game.cam.y=game.player.y-game.renderer.vh*.6;}
function touchControls(){const pad=$('#pad'),knob=$('#knob');let pointer=null;const move=e=>{if(pointer!==e.pointerId)return;const r=pad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/30,dy=(e.clientY-r.top-r.height/2)/30;knob.style.transform=`translate(${Math.max(-26,Math.min(26,dx*25))}px,${Math.max(-26,Math.min(26,dy*25))}px)`;game.keys={KeyA:dx<-.3,KeyD:dx>.3,KeyW:dy<-.3,KeyS:dy>.3};};pad.onpointerdown=e=>{pointer=e.pointerId;pad.setPointerCapture(pointer);move(e);};pad.onpointermove=move;const end=()=>{pointer=null;game.keys={};knob.style.transform='';};pad.onpointerup=end;pad.onpointercancel=end;$('#touch-action').onclick=interact;}
async function boot(){
 await Promise.all([loadObjectAssets(),loadTerrainAssets(),loadBuildingAssets(),loadPack2Assets(),loadParksAssets(),loadWalkcycleAssets()]);
 // All buildings are drawn natively on Canvas; no image preload required.
 buildTiles();buildBuildings();buildProps();buildChars();buildVehicles();applyPack2Assets();applyPack2Props();window.game=new Game(view,{onZone:z=>{$('#zone').textContent='';}});layout();game.loadDistrict(DISTRICTS[0],new Set());game.questSites=questSitesFor();attachVenueDoors(game.world);applyPlayerOutfit(model.outfit,model.appearance);
 if(model.position?.world!=='minipixel-v1'&&model.position&&canStand(game.world,model.position.x,model.position.y)){game.player.x=model.position.x;game.player.y=model.position.y;}
 applyVisualSettings();game.cam.x=game.player.x-game.renderer.vw/2;game.cam.y=game.player.y-game.renderer.vh*.60;game.paused=true;
 const savedCapital=model.capital.district;if(savedCapital!=='streets'){travelCapital(savedCapital);game.paused=true;}
 const savedInterior=model.interiorId;if(savedInterior){enterPlace(savedInterior);game.paused=true;}
 buildMini();updateUI();initMentorTrail();const portrait=$('#portrait').getContext('2d'),sp=S('npc_locksmith_idle_down');portrait.imageSmoothingEnabled=false;if(sp)portrait.drawImage(sp.canvas,0,0,sp.fw,sp.fh,0,0,16,23);
 if(model.started)$('#start').replaceChildren(document.createTextNode('Продолжить смену'),node('span','','↗'));
 $('#city-zoom-in').onclick=()=>zoomCity(cityZoom*1.25);$('#city-zoom-out').onclick=()=>zoomCity(cityZoom/1.25);$('#city-zoom-reset').onclick=()=>zoomCity(1);view.addEventListener('wheel',e=>{if(!game.world.interior&&!game.paused){e.preventDefault();zoomCity(cityZoom*Math.exp(-e.deltaY*.0012));}},{passive:false});$('#capital-map').onclick=openCapitalMap;$('.club-link').onclick=save;$('#character').onclick=openCharacterEditor;$('#courses').onclick=openCourses;$('#places').onclick=openPlaces;$('#doors-menu').onclick=openPlaces;$('#room-exit').onclick=()=>{leavePlace();view.focus({preventScroll:true});};
 $('#inventory').onclick=openInventory;$('#map-toggle').onclick=()=>{const open=document.documentElement.classList.toggle('map-open');$('#map-toggle').setAttribute('aria-expanded',String(open));};$('#start').onclick=startGame;$('#home').onclick=e=>{e.preventDefault();if($('#modal').classList.contains('open'))closeModal();$('#intro').classList.remove('hidden');game.paused=true;};$('#navigate').onclick=navigateTask;$('#journal').onclick=openJournal;$('#guide').onclick=openGuide;$('#settings').onclick=openSettings;$('#audio').onclick=()=>setAudio(!model.settings.sound);$('#vision').onclick=()=>{game.vision=!game.vision;$('#vision').classList.toggle('on',game.vision);};
 view.onpointerdown=e=>{if(game.paused)return;const r=view.getBoundingClientRect(),target={...game.renderer.screenToWorld((e.clientX-r.left)/scale,(e.clientY-r.top)/scale,game.cam)};const hotspot=(game.world.interactables||[]).find(p=>Math.hypot(p.x-target.x,p.y-target.y)<(game.world.minipixel?5:18));if(hotspot&&Math.hypot(hotspot.x-game.player.x,hotspot.y-game.player.y)<reach()){if(hotspot.kind==='building')enterPlace(hotspot.id);else roomAction(hotspot.action);return;}const site=game.questSites.find(s=>Math.hypot(s.x-target.x,s.y-target.y)<(game.world.minipixel?5:18));if(site?.gate&&Math.hypot(site.x-game.player.x,site.y-game.player.y)<reach()){enterCapitalGate(site.gate);return;}if(site?.capital&&Math.hypot(site.x-game.player.x,site.y-game.player.y)<reach()){openCapitalTerminal();return;}if(site&&Math.hypot(site.x-game.player.x,site.y-game.player.y)<reach()){game.prompt={kind:'questSite',obj:site};if(activeQuest()?.id===site.id)openTerminal(activeQuest());return;}const destination=site?{x:site.x,y:site.y+(game.world.minipixel?0:16)}:hotspot||target;const p=findPath(destination);if(p)game.path=p;view.focus({preventScroll:true});};
 addEventListener('keydown',e=>{
  if($('#modal').classList.contains('open')){if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const elements=[...$('#modal').querySelectorAll('button:not(:disabled),input:not([hidden]),textarea,select,summary')].filter(x=>x.getClientRects().length);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
  if(!$('#intro').classList.contains('hidden'))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyG','KeyJ','KeyI','KeyM','KeyV'].includes(e.code))e.preventDefault();game.key(e.code,true);if(e.repeat)return;
  if(e.code==='KeyM')$('#map-toggle').click();if(e.code==='KeyI')openInventory();if(e.code==='KeyE')interact();if(e.code==='KeyG')navigateTask();if(e.code==='KeyJ')openJournal();if(e.code==='KeyV')$('#vision').click();
 });addEventListener('keyup',e=>game.key(e.code,false));addEventListener('blur',()=>{game.keys={};});addEventListener('resize',layout);addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){game.keys={};save();audioContext?.suspend();}else if(model.settings.sound&&audioContext)audioContext.resume().catch(()=>{});});touchControls();
 initSignalRoom({getModel:()=>model,caseList:CASES,start:startGame,save,pause:()=>{game.paused=true;game.keys={};},close:closeModal,settings:openSettings,profile:openCharacterEditor,journal:openJournal,navigate:navigateTask,course:id=>openCourse(COURSES.find(c=>c.id===id)),clickSound:soundChime});
 game.player.name=model.playerName||'OPERATOR';
 window.addEventListener('null-city-cover-entered',()=>{if(!model.playerName)openArrival();},{once:true});
 window.dispatchEvent(new Event('null-city-menu-ready'));
 let last=performance.now(),lastSave=last,meterStart=last,meterFrames=0,meterDraw=0;function frame(t){const dt=Math.min(50,t-last);last=t;game.update(dt);updateMentorTrail(t);if(game.paused&&game.player.hacking)game.player.anim+=dt;if($('#intro').classList.contains('hidden')){const drawStart=performance.now();game.draw();drawMini();meterDraw+=performance.now()-drawStart;meterFrames++;if(t-meterStart>2000){view.dataset.fps=String(Math.round(meterFrames*1000/(t-meterStart)));view.dataset.drawMs=(meterDraw/meterFrames).toFixed(2);meterStart=t;meterFrames=0;meterDraw=0;}}else{meterStart=t;meterFrames=0;meterDraw=0;}if(game.world.minipixel){const zone=Minipixel.get().zone(game.player);if($('#zone').textContent!==zone)$('#zone').textContent=zone;}const prompt=game.prompt;$('#prompt').classList.toggle('show',!!prompt&&!game.paused);if(prompt)$('#prompt').textContent=prompt.label+' [E]';$('#toast').classList.toggle('show',game.toastT>0&&!game.paused);$('#toast').textContent=game.toast||'';if(t-lastSave>6000&&model.started){save();lastSave=t;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
function openCourses(){
 const card=modal('Твой путь в кибербезопасности','NULL ACADEMY / МЕНЮ КУРСОВ'),body=node('div','modal-body');
 body.append(node('p','courses-lead','Одна история, разные направления. Начни с основ или посмотри, что потребуется для следующего шага. Прогресс первой главы сохраняется при переходах.'));
 const grid=node('div','course-grid');COURSES.forEach(c=>{const item=node('article','course-card');item.style.setProperty('--course-color',c.color);item.append(node('div','course-number',c.number),node('div','micro',c.tag),node('h3','',c.name),node('p','',c.desc));
 const status=c.id==='zero'?`${State.done.size} / ${CASES.length} дел двух глав`:model.courseLessons.includes(c.id)?'Вводное занятие пройдено':'Доступно вводное занятие';item.append(node('span','course-status',status));
 item.append(button(c.id==='zero'?'Продолжить курс →':'Открыть направление →',()=>{if(c.id==='zero'){closeModal();if(!model.started)startGame();else navigateTask();}else openCourse(c);},'secondary'));grid.append(item);});body.append(grid);card.append(body);
}
function openCourse(c){const card=modal(c.name,'NULL ACADEMY / '+c.tag),body=node('div','modal-body');body.append(node('p','',c.desc),node('p','course-note','Сейчас доступно вводное занятие. Остальные модули и полноценная экзаменационная подготовка находятся в разработке. Это авторский игровой маршрут, не официальный курс и не сертификат.'));const list=node('ol','module-list');c.modules.forEach((m,i)=>{const li=node('li');li.append(node('span','',m),node('small','',i===0?'ВВЕДЕНИЕ ДОСТУПНО':'В РАЗРАБОТКЕ'));list.append(li);});body.append(list);const a=node('a','text-button','Официальная информация о сертификации ↗');a.href=c.source;a.target='_blank';a.rel='noopener noreferrer';body.append(a);const actions=node('div','modal-actions');actions.append(button(model.courseLessons.includes(c.id)?'Повторить вводное занятие':'Начать вводное занятие →',()=>openCourseLesson(c)),button('Все курсы',openCourses,'secondary'));body.append(actions);card.append(body);}
function openCourseLesson(c){const card=modal(c.lesson.title,c.name.toUpperCase()+' / ВВЕДЕНИЕ'),body=node('div','modal-body');body.append(node('p','quote',c.lesson.text),node('h3','',c.lesson.question));const feedback=node('p','feedback');feedback.setAttribute('role','status');c.lesson.answers.forEach((answer,i)=>{body.append(button(answer,()=>{if(i!==c.lesson.correct){feedback.textContent='Проверь границы полномочий и необходимый объём доступа. Попробуй ещё раз.';return;}if(!model.courseLessons.includes(c.id))model.courseLessons.push(c.id);save();feedback.textContent='✓ '+c.lesson.why;finish.hidden=false;},'lesson-answer'));});body.append(feedback);const finish=button('Вернуться к программе →',()=>openCourse(c));finish.hidden=true;body.append(finish);card.append(body);}
function openPlaces(){if(game.district.id!=='streets'){openCapitalMap();return;}const card=modal('За открытыми дверями','ДОЖДЕВОЙ КВАРТАЛ / МЕСТА И ЛЮДИ'),body=node('div','modal-body');body.append(node('p','','В отмеченные здания можно войти с улицы. Внутри — жители, предметы, история и магазин образов. Подойди к двери и нажми E.'));const grid=node('div','place-grid');VENUES.forEach(v=>{const box=node('article','place-card');box.style.borderColor=v.color;box.append(node('div','micro',v.id==='shop'?'МАГАЗИН / КАСТОМИЗАЦИЯ':'СЮЖЕТ / ИНТЕРЬЕР'),node('h3','',v.name),node('p','',v.desc),button(activeVenue?.id===v.id?'Ты уже внутри':'Маршрут к двери →',()=>{closeModal();navigateVenue(v.id);},'secondary'));grid.append(box);});body.append(grid,node('p','course-note',model.story.letterReturned?'✓ Посылка доставлена. Загляни к Маре: у неё появилась новая зацепка.':model.story.letterFound?'В журнале: посылка найдена. Верни её Юне в MIDNIGHT RAMEN.':'Побочная история: Юна ждёт посылку. Спроси о ней в закусочной.'));card.append(body);}
function navigateVenue(id){
 if(game.district.id!=='streets')travelCapital('streets');
 if(!model.started){model.started=true;$('#intro').classList.add('hidden');game.paused=false;}
 if(activeVenue?.id===id){if(activeQuest()?.venue===id)openTerminal(activeQuest());else toast('Ты уже здесь. Поговори с жителем у стойки.');return;}
 if(activeVenue)leavePlace();const target=game.world.interactables.find(p=>p.id===id);if(!target)return;
 if(Math.hypot(game.player.x-target.x,game.player.y-target.y)<reach()){enterPlace(id);return;}
 game.path=findPath(target)||[];toast('Дверь отмечена IN. '+VENUES.find(v=>v.id===id).name+' — нажми E у входа.');view.focus({preventScroll:true});
}
function enterPlace(id){
 if(activeVenue)return;const v=VENUES.find(v=>v.id===id);if(!v)return;
 cityScene={world:game.world,npcs:game.npcs,cars:game.cars,nodes:game.nodes,questSites:game.questSites,mentor:game.mentor,player:{x:game.player.x,y:game.player.y}};activeVenue=v;
 game.world=buildRoom(v);game.renderer.vw=0;layout();game.player.x=game.world.spawn.x;game.player.y=game.world.spawn.y;game.cars=[];game.nodes=[];game.questSites=[];game.path=[];game.keys={};game.zone=null;game.prompt=null;
 const resident=new Actor(v.cast,58*16+8,42*16+13,v.person,'');resident.anchored=true;game.npcs=[resident];
 game.cam.x=game.player.x-game.renderer.vw/2;game.cam.y=game.player.y-game.renderer.vh*.60;game.paused=false;setPlaceUI(v);buildMini();updateUI();save();toast(v.name+'. '+(activeQuest()?.venue===v.id?'G — открыть дело. ':'')+'Выход — внизу комнаты.');
}
function leavePlace(){
 if(!cityScene)return;const saved=cityScene;activeVenue=null;cityScene=null;
 for(const key of ['world','npcs','cars','nodes','questSites','mentor'])game[key]=saved[key];game.renderer.vw=0;layout();
 game.player.x=saved.player.x;game.player.y=saved.player.y;game.path=[];game.keys={};game.zone=null;game.prompt=null;game.cam.x=game.player.x-game.renderer.vw/2;game.cam.y=game.player.y-game.renderer.vh*.60;setPlaceUI(null);buildMini();updateUI();save();
}
function setPlaceUI(v){$('.location h1').replaceChildren(document.createTextNode(v?.name||'Дождевой квартал'),node('span','live-dot'));$('.location>.micro').textContent=v?'ИНТЕРЬЕР / ДВЕРИ ОТКРЫТЫ':'СЕКТОР 04 / ЖИЛАЯ ЗОНА';$('.location p').textContent=v?'Тепло внутри · E — взаимодействие · выход внизу':'14°C / Сильный дождь / Ночная смена';$('.map-title>span').textContent=v?'ПЛАН ПОМЕЩЕНИЯ':'КВАРТАЛ / 04';$('#room-exit').hidden=!v;}
function roomAction(action){
 if(action==='exit'){leavePlace();return;}
 if(action==='mission'){if(activeQuest()?.venue===activeVenue?.id)openTerminal(activeQuest());else dialogue('Терминал расследования',State.done.has('broadcast')?'Передача завершена. Город хранит твой выбор. Открой журнал, чтобы повторить практику.':'Сначала заверши текущее дело. Эхо и Иво ждут подтверждённых улик.');return;}
 if(action==='shop'){openShop();return;}
 if(action==='courses'){openCourses();return;}
 if(action==='parcel'){const card=modal('Посылка 404','NEON THREAD / ЗАБЫТАЯ ДОСТАВКА'),body=node('div','dialogue-body');body.append(node('p','quote',model.story.letterReturned?'На пустой полке осталось светлое пятно. Эта посылка уже нашла адресата.':'На коробке: «Юне. От Лео. Орбитальная станция 6». Сканер доставки поверх имени напечатал NULL. Никс сохранила посылку вместо того, чтобы отправить её в утилизацию.'));if(!model.story.letterReturned)body.append(button(model.story.letterFound?'Вернуться к Юне →':'Забрать для Юны →',()=>{model.story.letterFound=true;save();closeModal();toast('Посылка добавлена в журнал. Юна ждёт в MIDNIGHT RAMEN.');}));else body.append(button('Закрыть',closeModal));card.append(body);return;}
 if(action==='letter'){model.story.letterAsked=true;save();dialogue('Объявление Юны','«Если найдёте посылку для квартиры 404 — принесите в закусочную. Там ничего ценного. Просто голос, который я давно не слышала». На квитанции последняя точка доставки: NEON THREAD.',null,'Записано в журнал →');return;}
 openResidentStory();
}
function storyScene(title,text,choices){const card=modal(title,'ИСТОРИИ КВАРТАЛА'),body=node('div','dialogue-body');body.append(node('p','quote',text));const actions=node('div','story-choices');choices.forEach(([label,fn])=>actions.append(button(label,fn,'secondary')));body.append(actions);card.append(body);}
function openResidentStory(){
 if(['radio','archive'].includes(activeVenue.id)){openChapterResident();return;}
 if(activeVenue.id==='shop'){storyScene('Никс / NEON THREAD','«В реестре ты набор полей. Здесь ты выбираешь, как выглядеть. За одежду беру опыт: за каждое решённое дело город тебе что-то должен. А ту коробку у входа я придержала. Имя стёрлось, адрес — нет».',[
 ['Посмотреть образы',openShop],['Что за посылка?',()=>roomAction('parcel')],['Вернуться в ателье',closeModal]]);return;}
 if(activeVenue.id==='diner'){
  if(model.story.letterFound&&!model.story.letterReturned){storyScene('Юна / голос с орбиты','Юна узнаёт почерк раньше, чем ты успеваешь поставить коробку на стол. «Это Лео. Он записывает мне шум двигателей. Говорит, так мы будто едем куда-то вместе». На пломбе сохранился номер сбойного маршрута.',[
   ['Отдать закрытую посылку',()=>returnLetter('sealed')],['Спросить разрешение сохранить номер маршрута',()=>returnLetter('trace')]]);return;}
  if(model.story.letterReturned){storyScene('Юна / дом снова существует','Из старого динамика доносится низкий гул. «Сын говорит, что отсюда до него тысячи километров. А сейчас будто совсем рядом». '+(model.story.letterChoice==='trace'?'Юна разрешила записать номер маршрута: NX-0317. Мара может узнать этот формат.':'Юна сама переписала для Мары номер маршрута: NX-0317. «Только имя сына не включай в публичный отчёт». '),[['Зайду к Маре',()=>{closeModal();navigateVenue('workshop');}],['Остаться в закусочной',closeModal]]);return;}
  storyScene('Юна / потерянная доставка',State.done.has('transfer')?'«Ты вернул моё имя в реестр. Но посылка сына всё ещё потеряна. В ней запись его голоса. Последний курьер оставил её в NEON THREAD».':'«Портал решил, что меня нет. Я всё ещё здесь: чай горячий, лапша готова. Только посылку сына отдали в NEON THREAD — мой адрес перестал существовать».',[
   ['Я поищу посылку',()=>{model.story.letterAsked=true;save();closeModal();toast('Новая история: «Голос с орбиты». Найди коробку в NEON THREAD.');}],['Почему сын далеко?',()=>storyScene('Юна / расстояние','«Он механик на станции. Говорит, научится чинить всё. Я отвечаю: начни с видеосвязи, я забыла, как выглядит твоя новая стрижка». Юна улыбается, но не убирает со стола пустую чашку.',[['Я найду его посылку',()=>{model.story.letterAsked=true;save();closeModal();}],['Вернуться',openResidentStory]])],['До встречи',closeModal]]);return;
 }
 const options=[['Почему ты ушла из NEXUS?',()=>{model.story.maraPast=true;const gained=storyReward(model,'maraPast',40);save();updateUI();storyScene('Мара / до ночной смены','«Я проектировала восстановление записей. Потом слово „восстановление“ заменили на „нормализацию“. Если человек не подходил под схему, исправляли человека. Я ушла. Старый пропуск оставила: однажды он пригодится». В журнале появляется её история.'+(gained?' +40 XP за первое знакомство.':''),[['Спасибо, что рассказала',closeModal]]);}],['Открыть учебные направления',openCourses]];
 if(model.story.letterReturned)options.unshift(['Показать номер NX-0317',()=>{model.story.decoded=true;const gained=storyReward(model,'decoded',60);save();updateUI();storyScene('Мара / не случайный сбой','Мара переворачивает записку. «NX — внутренний маршрут NEXUS. 0317 — время пакетного обновления, а не номер квартиры. Таких маршрутов было двенадцать. Твой ghost-17 мог быть служебным псевдонимом». Она отмечает на карте северную башню. Это зацепка, не доказательство личности.'+(gained?' +60 XP.':''),[['Сохранить зацепку',closeModal]]);}]);options.push(['Вернуться в мастерскую',closeModal]);storyScene('Мара / за закрытой дверью','Здесь дождь слышен только в вентиляции. На стене висит старый пропуск NEXUS, лицевой стороной к стене. Мара замечает твой взгляд: «Все мы когда-то работали не на ту систему».',options);
}
function returnLetter(choice){model.story.letterReturned=true;model.story.letterChoice=choice;const gained=storyReward(model,'letterReturned',120);save();updateUI();soundChime();storyScene('Голос с орбиты / история завершена','Юна принимает посылку обеими руками. «Спасибо, что не решил за меня, что это просто данные». '+(choice==='trace'?'Она разрешает сохранить номер маршрута, но просит не копировать личную запись.':'Ты передаёшь коробку запечатанной. Позже Юна сама записывает для Мары номер доставки.')+(gained?' Награда: +120 XP. Этого хватит на первый образ в NEON THREAD.':''),[['Заглянуть в магазин',()=>{closeModal();navigateVenue('shop');}],['Спросить о маршруте',openResidentStory],['Остаться здесь',closeModal]]);}
function openShop(){
 if(activeVenue?.id!=='shop'){closeModal();navigateVenue('shop');return;}
 const card=modal('NEON THREAD','АТЕЛЬЕ / ВНЕШНОСТЬ ЗА XP'),body=node('div','modal-body');body.append(node('div','shop-wallet',`Доступно ${wallet(model)} XP`),node('p','course-note',`Заработано за всё время: ${model.xp} XP. Покупки расходуют кошелёк, но не снижают учебный прогресс и звание. Купленные образы можно менять бесплатно.`));
 const grid=node('div','outfit-grid');OUTFITS.forEach(item=>{const box=node('article','outfit-card');box.style.setProperty('--outfit-color',item.color);const cv=node('canvas','outfit-preview');cv.width=96;cv.height=112;cv.setAttribute('aria-label','Предпросмотр: '+item.name);drawOutfitPreview(cv,item.id);const owned=model.ownedOutfits.includes(item.id),wearing=model.outfit===item.id;box.append(cv,node('h3','',item.name),node('p','',item.desc),node('div','outfit-price',wearing?'НАДЕТО':owned?'В ГАРДЕРОБЕ':item.price+' XP'));
 const buy=button(wearing?'Надето':owned?'Надеть':'Купить и надеть',()=>{const result=buyOutfit(model,item.id);if(!result.ok){toast(result.reason);return;}applyPlayerOutfit(model.outfit,model.appearance);save();updateUI();openShop();},'secondary');buy.disabled=wearing||(!owned&&wallet(model)<item.price);box.append(buy);if(!owned&&wallet(model)<item.price)box.append(node('small','',`Не хватает ${item.price-wallet(model)} XP`));grid.append(box);});body.append(grid,button('Вернуться в ателье',closeModal,'text-button'));card.append(body);
}
function appendStoryJournal(container){const box=node('section','story-journal');box.append(node('h3','','Истории квартала'));[['История Мары',model.story.maraPast?'Мара проектировала восстановление реестра в NEXUS. Позже её работу превратили в удаление неудобных записей.':'Зайди в мастерскую и поговори с Марой.'],['Голос с орбиты',model.story.letterReturned?'Посылка доставлена Юне. '+(model.story.letterChoice==='trace'?'Номер маршрута сохранён с её разрешения.':'Личная запись передана запечатанной.'):model.story.letterFound?'Коробка найдена в NEON THREAD. Верни её Юне в закусочной.':model.story.letterAsked?'Юна ждёт посылку сына. Последняя точка доставки — NEON THREAD.':'В MIDNIGHT RAMEN кто-то ждёт твоей помощи.'],['Северная башня',model.story.decoded?'NX-0317 — маршрут NEXUS, связанный с пакетным обновлением реестра. Мара отметила северную башню. Личность ghost-17 пока не установлена.':'Продолжай разговоры с жителями.']].forEach(([title,text])=>{const row=node('div','journal-item');row.append(node('h3','',title),node('p','',text));box.append(row);});container.append(box);}

function openCharacterEditor(){
 const draft={...model.appearance};let direction='down',frame=0;
 const card=modal('Твоя внешность','IDENTITY LAB / ХАРАКТЕР В КАЖДОМ ПИКСЕЛЕ'),body=node('div','character-editor'),preview=node('div','character-preview-pane'),form=node('form','character-form');
 const cv=node('canvas','character-large');cv.width=192;cv.height=252;cv.setAttribute('aria-label','Предпросмотр персонажа');
 const small=node('canvas','character-world-size');small.width=72;small.height=84;small.setAttribute('aria-label','Персонаж в игровом масштабе');
 const paint=()=>{paintCharacterPreview(cv,draft,model.outfit,direction,frame);paintCharacterPreview(small,draft,model.outfit,direction,frame);};
 const rotations=node('div','modal-actions');[['↓','down'],['→','side'],['↑','up']].forEach(([label,dir])=>{const b=button(label,()=>{direction=dir;paint();},'secondary');b.type='button';b.setAttribute('aria-label','Повернуть: '+({down:'спереди',side:'сбоку',up:'сзади'}[dir]));rotations.append(b);});
 preview.append(node('span','micro mint','ПРЕДПРОСМОТР'),cv,rotations,small,node('p','course-note','Семь готовых образов с анимациями. Выбери образ и посмотри его с разных сторон.'));
 function select(label,key,options){const wrap=node('label','editor-field',label),input=node('select');options.forEach(([value,text])=>{const o=node('option','',text);o.value=value;input.append(o);});input.value=draft[key];input.onchange=()=>{draft[key]=input.value;paint();};wrap.append(input);form.append(wrap);}
 
 select('Персонаж из набора','actor',[...Array.from({length:7},(_,i)=>[String(i),'Персонаж '+(i+1)]),['custom','Свой персонаж / настройка цветов']]);

 select('Пол своего персонажа','gender',[['female','Женский'],['male','Мужской'],['nonbinary','Небинарный']]);select('Причёска своего персонажа','hair',HAIR_STYLES);
 function colors(label,key,values){const field=node('fieldset','editor-colors'),legend=node('legend','',label),row=node('div','swatch-row');field.append(legend,row);values.forEach((color,i)=>{const b=button('',()=>{draft[key]=color;input.value=color;paint();},'swatch');b.type='button';b.style.backgroundColor=color;b.setAttribute('aria-label',label+' — оттенок '+(i+1));row.append(b);});const wrap=node('label','color-custom','Свой цвет'),input=node('input');input.type='color';input.dataset.color=key;input.value=draft[key];input.oninput=()=>{draft[key]=input.value;paint();};wrap.append(input);field.append(wrap);form.append(field);}

 colors('Цвет кожи','skin',SKIN_TONES);colors('Цвет волос','hairColor',HAIR_COLORS);
 form.append(node('p','course-note','Настройки цветов и причёски работают в режиме «Свой персонаж». Готовые рисунки сохраняют авторские цвета волос, кожи и одежды.'));
 const actions=node('div','modal-actions'),commit=button('Сохранить внешность',()=>{},'primary');commit.type='submit';actions.append(commit,button('Отмена',closeModal,'secondary'));actions.lastChild.type='button';form.append(actions);
 form.onsubmit=e=>{e.preventDefault();model.appearance=normalizeAppearance(draft);applyPlayerOutfit(model.outfit,model.appearance);save();closeModal();toast('Новая внешность сохранена.');};body.append(preview,form);card.append(body);paint();
 const timer=setInterval(()=>{if(!cv.isConnected){clearInterval(timer);return;}frame=(frame+1)%4;paint();},220);
}

function openChapterResident(){
 const radio=activeVenue.id==='radio',ready=activeQuest()?.venue===activeVenue.id;
 const text=State.done.has('broadcast')?(model.story.broadcastChoice==='community'?(radio?'«После эфира пришло сорок сообщений. Завтра здесь будут учить соседей проверять письма. Голос можно украсть. Соседей — сложнее».':'«Эхо не скрыла мою подпись. И правильно. Я остался помогать людям читать собственные дела».'):(radio?'«Я хотела кричать сразу. Но инженеры уже нашли ещё три узла. Следующий эфир мы сделаем вместе».':'«Мы проверяем каждый узел. В этой комнате больше никто не подписывает то, чего не прочёл».')):radio?'Эхо снимает один наушник. «Я вела ночные передачи, пока люди возвращались со смены. Теперь мне звонят и спрашивают, существуют ли они ещё. Если я включу непроверенную запись, кем я буду отличаться от NEXUS?»':'Иво ровно складывает пропуск на столе. «Я думал, что порядок — это когда все поля заполнены. Потом в идеально заполненном реестре исчез мой сосед. Его чашка всё ещё стоит на лестнице». '; 
 const choices=[[ready?'Открыть дело: '+activeQuest().title:'Осмотреть терминал',()=>roomAction('mission')],['Что здесь было раньше?',()=>storyScene(radio?'Эхо / первая передача':'Иво / чашка на лестнице',radio?'«Мою первую программу услышали три человека. Один попросил поставить дождь. Сказал, на орбите по нему скучают. Я до сих пор записываю город для тех, кто далеко».':'«Сосед оставлял чай дежурным. Когда его запись исчезла, я подумал, что он переехал. Теперь знаю: иногда равнодушие выглядит как аккуратная подпись».',[['Вернуться к разговору',openChapterResident]])],['Остаться здесь',closeModal]];
 storyScene(radio?'Эхо / голос района':'Иво / архив памяти',text,choices);
}
function openChapterEnding(){
 const publicRoute=model.story.broadcastChoice==='community',card=modal('Мы всё ещё здесь.','ГЛАВА 02 / ЧАСТОТА ЖИВЫХ'),body=node('div','modal-body');
 body.append(node('div','reward','12 ДОМОВ / ACTIVE'),node('p','quote','«Станция 6 слышит вас. Мама, я скоро домой». — Лео'),node('p','',publicRoute?'Ты выбрал открытый эфир. У радио собираются жители: проверяют сообщения и помогают соседям вернуть доступ. Подпись Иво опубликована вместе с доказательствами. Он остаётся в архиве, чтобы отвечать на вопросы.':'Ты передал материалы инженерам. Иво начинает проверку остальных узлов; Эхо готовит эфир с подтверждёнными результатами. Люди знают, что дома восстановлены, но подробности расследования пока остаются у команды.'),node('h3','','Город изменился'),node('p','','В окнах Архива памяти снова тёплый свет. Радио 03.17 вышло в эфир. Новые диалоги жителей сохраняют последствия твоего решения.'),node('p','course-note','След REGENT ведёт в центр столицы. Через Сады связи и Округ наблюдения можно добраться до NEXUS.'),button('Отправиться к NEXUS',openCapitalMap),button('Пройтись по изменившемуся городу',closeModal),button('Открыть полевой журнал',openJournal,'secondary'));card.append(body);
}

function applyVisualSettings(){
 const settings=model.settings;game.renderer.calm=settings.calm||matchMedia('(prefers-reduced-motion: reduce)').matches;game.renderer.quality=settings.quality;game.renderer.weather=settings.weather;game.renderer.rainEnabled=settings.rain;document.documentElement.dataset.calm=String(game.renderer.calm);document.documentElement.dataset.scanlines=String(settings.scanlines);document.documentElement.dataset.grain=String(settings.grain);
}
function openInventory(){
 const card=modal('Вещи, которые помнят','ПРЕДМЕТЫ / УЛИКИ'),body=node('div','modal-body'),items=[];
 if(model.flags.evidence)items.push(['E-01 / Копия журнала','03:17 → ghost-17 изменил DNS. 03:18 → начат экспорт. Личность владельца не установлена.']);
 if(model.story.letterFound)items.push(['Посылка Лео',model.story.letterReturned?'Передана Юне. Личная запись осталась у адресата.':'Коробка запечатана. Юна ждёт в MIDNIGHT RAMEN.']);
 if(model.story.decoded)items.push(['Записка NX-0317','Внутренний маршрут NEXUS. Зацепка к следующей главе, не доказательство личности.']);
 if(model.flags.mailQuarantined)items.push(['E-02 / Письмо с голосом','Просьба о ключе опровергнута независимым звонком. Исходное сообщение сохранено.']);
 if(model.flags.backupVerified)items.push(['E-04 / Накопитель Иво','night-02 прошла проверку целостности.'+(model.flags.restoreCommitted?' Двенадцать домов восстановлены.':' Восстановление ещё требует проверки.')]);
 if(!items.length)body.append(node('p','','В деле пока нет предметов. Исследуй город и сохраняй доказательства — они появятся здесь.'));
 items.forEach(([title,text])=>{const item=node('details','journal-item');item.append(node('summary','',title),node('p','',text));body.append(item);});card.append(body);
}

boot();

function capitalSites(){if(game.world.minipixel){if(game.district.id==='capital')return Minipixel.get().gates.map((p,i)=>({...p,id:'gate-'+p.id,gate:p.id,number:String(i+1),label:CAPITAL_DISTRICTS[i].name,action:CAPITAL_DISTRICTS[i].name,index:i}));const d=CAPITAL_DISTRICTS.find(d=>d.id===game.district.id);return d?.steps?[{...Minipixel.get().site('operation',d.id),id:'capital-'+d.id,capital:true,completed:model.capital.completed.includes(d.id),number:'NX',label:d.title,action:d.title}]:[];}if(game.district.id==='capital')return (game.world.capitalGates||[]).map((p,i)=>({id:'gate-'+p.id,gate:p.id,number:String(i+1),x:p.x*16+8,y:p.y*16+13,label:CAPITAL_DISTRICTS[i].name,action:CAPITAL_DISTRICTS[i].name,index:i}));const d=CAPITAL_DISTRICTS.find(d=>d.id===game.district.id);if(!d?.steps)return [];const p=findOpen(game.world,60,47);return [{id:'capital-'+d.id,capital:true,completed:model.capital.completed.includes(d.id),number:'NX',x:p.x,y:p.y+5,index:0,label:d.title,place:d.name,title:d.title,action:d.title}];}
function updateCapitalHUD(){game.questSites=capitalSites();if(game.district.id==='capital'){$('.location h1').textContent=CAPITAL_HUB.name;$('.location>.micro').textContent='ВНЕШНИЙ ПОЯС → NEXUS';$('#current-case').replaceChildren(node('h3','','Путь к центру'),node('p','','Иди по кольцам или южному проспекту. E у терминала — войти в округ.'));$('#navigate').textContent='К следующему округу · G';$('.chapter-stamp span').textContent='ТРИ КОЛЬЦА / ОДНА СТОЛИЦА';return;}const d=CAPITAL_DISTRICTS.find(d=>d.id===game.district.id);if(!d?.steps)return;$('#current-case').replaceChildren(node('div','micro',d.ring),node('h3','',d.title));$('.aside-head .micro').textContent='ПУТЬ К NEXUS';$('.version').textContent=(model.capital.steps[d.id]||0)+' / '+d.steps.length;$('#navigate').textContent=model.capital.completed.includes(d.id)?'✓ Узел восстановлен · G':'Открыть узел · G';$('.location h1').textContent=d.name;$('.location>.micro').textContent=d.ring;$('.chapter-stamp span').textContent='СТОЛИЦА / '+d.ring;}
function openCapitalMap(){const card=modal('Путь к сердцу столицы','ОКРУГА / ДОСТУП / ПРОГРЕСС'),body=node('div','modal-body');body.append(node('p','quote','REGENT стирает жителей по всей столице. Верни доверие внешним округам, собери доказательства и доберись до узла, отдающего приказы.'));
const map=node('canvas','capital-overview');map.width=960;map.height=672;map.setAttribute('aria-label','План столицы: три кольцевых бульвара и NEXUS в центре');drawCapitalOverview(map);body.append(map,button('Выйти на кольцевой проспект →',()=>{closeModal();travelCapital('capital');}),node('p','course-note','Это общий город, по которому можно ходить. Подробные кварталы открываются у терминалов на южном проспекте.'));const grid=node('div','capital-grid');for(const d of CAPITAL_DISTRICTS){const unlocked=capitalUnlocked(model,d.id),done=d.id==='streets'?model.done.includes('broadcast'):model.capital.completed.includes(d.id),box=node('article','capital-card');box.style.setProperty('--district-color',d.color);box.append(node('div','micro',d.ring),node('h3','',d.name),node('p','',d.desc),node('p','',done?'✓ Округ завершён':unlocked?'Открыт для посещения':'Закрыт: '+d.requires));const b=button(game.district.id===d.id?'Ты здесь':unlocked?'Поехать в округ →':'Пропуск пока недоступен',()=>{closeModal();travelCapital(d.id);},'secondary');b.disabled=!unlocked||game.district.id===d.id;box.append(b);grid.append(box);}body.append(grid);if(model.capital.completed.includes('corporation'))body.append(node('p','quote','Город помнит своих жителей. REGENT остановлен. Округа остаются открыты: можно вернуться к людям и завершить их истории.'));card.append(body);}
function travelCapital(id){if(!capitalUnlocked(model,id))return;if(activeVenue)leavePlace();save();const d=id==='capital'?CAPITAL_HUB:CAPITAL_DISTRICTS.find(d=>d.id===id);model.capital.district=id;if(id==='capital'){document.documentElement.classList.add('map-open');$('#map-toggle').setAttribute('aria-expanded','true');}game.loadDistrict({...d,mentor:d.mentor||'МАРА',mentorCast:d.mentorCast||'locksmith'},State.done);game.renderer.vw=0;layout();game.path=[];game.keys={};game.prompt=null;game.paused=false;if(id==='streets'){attachVenueDoors(game.world);if(model.position?.world!=='minipixel-v1'&&model.position&&canStand(game.world,model.position.x,model.position.y)){game.player.x=model.position.x;game.player.y=model.position.y;}setPlaceUI(null);}else{game.world.interactables=[];game.questSites=capitalSites();const p=game.world.spawn;game.player.x=p.x;game.player.y=p.y;game.cars=[];}applyPlayerOutfit(model.outfit,model.appearance);game.cam.x=game.player.x-game.renderer.vw/2;game.cam.y=game.player.y-game.renderer.vh*.6;buildMini();updateUI();save();toast(d.name+'. G — маршрут к узлу; «Столица» — вернуться в другой округ.');}
function navigateCapital(){const s=game.district.id==='capital'?(game.questSites.find(s=>capitalUnlocked(model,s.gate)&&!(s.gate==='streets'?model.done.includes('broadcast'):model.capital.completed.includes(s.gate)))||game.questSites[3]):game.questSites[0];if(!s)return;if(Math.hypot(game.player.x-s.x,game.player.y-s.y)<reach()){if(s.gate)enterCapitalGate(s.gate);else openCapitalTerminal();return;}game.path=findPath({x:s.x,y:s.y+(game.world.minipixel?0:16)})||findPath(s)||[];view.focus({preventScroll:true});toast('Узел округа отмечен на улице. Подойди и нажми E.');}
function openCapitalTerminal(){const d=CAPITAL_DISTRICTS.find(d=>d.id===game.district.id);if(!d?.steps)return;const card=modal(d.title,d.name+' / УЧЕБНАЯ ОПЕРАЦИЯ'),workspace=node('div','workspace'),brief=node('section','brief'),term=node('section','terminal');brief.append(node('p','quote',d.desc),node('p','','Порядок действий важен: собирай доказательства до вмешательства и проверяй восстановление. Команды работают только в этой модели.'));const checks=node('div');brief.append(checks);const output=node('pre','terminal-output','Сессия округа открыта. help — справка.\n');output.setAttribute('role','log');output.setAttribute('aria-label','Результат операции');const input=node('input');input.setAttribute('aria-label','Команда узла');input.autocomplete='off';input.spellcheck=false;const refresh=()=>{checks.replaceChildren(...d.steps.map((s,i)=>node('p','',((model.capital.steps[d.id]||0)>i?'✓ ':'○ ')+s[1])));};const run=()=>{const command=input.value;if(!command.trim())return;const r=executeCapital(model,d.id,command);output.textContent+='\n> '+command+'\n'+r.text+'\n';input.value='';refresh();save();updateUI();output.scrollTop=output.scrollHeight;if(r.complete){next.hidden=false;soundChime();}};const form=node('form','command-line');form.append(input,button('Выполнить',()=>{},'secondary'));form.onsubmit=e=>{e.preventDefault();run();};const next=button('Карта столицы →',openCapitalMap,'secondary');next.hidden=!model.capital.completed.includes(d.id);const help=button('Справка',()=>{input.value='help';run();},'text-button');term.append(output,form,help,next);workspace.append(brief,term);card.append(workspace);refresh();input.focus();game.player.hacking=true;}

function enterCapitalGate(id){if(!capitalUnlocked(model,id)){toast('Проход закрыт: '+CAPITAL_DISTRICTS.find(d=>d.id===id).requires);return;}travelCapital(id);}
function drawCapitalOverview(canvas){
 if(game.world.minipixel){Minipixel.get().overview(canvas,game);return;}
 const W=game.district.id==='capital'?game.world:makeWorld('capital'),c=canvas.getContext('2d'),scale=8;
 c.imageSmoothingEnabled=false;
 for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const g=W.ground[y*MW+x];c.fillStyle=g===G.BUILDING?'#6b7697':g===G.ROAD||g===G.CROSS?'#81c3c9':g===G.SIDEWALK?'#354e65':g===G.PLAZA?'#b39162':'#123d37';c.fillRect(x*scale,y*scale,scale,scale);}
 c.textAlign='center';c.font='bold 17px monospace';
 const labels=[['ВНЕШНИЙ ПОЯС',60,6],['САДЫ СВЯЗИ',30,54],['ОКРУГ НАБЛЮДЕНИЯ',60,27],['NEXUS',60,39]];
 for(const [label,x,y]of labels){const width=c.measureText(label).width+22;c.fillStyle='#0a1225ee';c.fillRect(x*scale-width/2,y*scale-19,width,28);c.fillStyle='#f1dbab';c.fillText(label,x*scale,y*scale);}
 for(const [i,p]of W.capitalGates.entries()){c.fillStyle=capitalUnlocked(model,p.id)?'#ffce75':'#985c79';c.fillRect(p.x*scale-8,p.y*scale-8,16,16);c.textAlign='left';c.font='13px monospace';c.fillText((i+1)+' '+(capitalUnlocked(model,p.id)?'ОТКРЫТ':'ЗАКРЫТ'),p.x*scale+17,p.y*scale+5);}
}


function openArrival(){
 const d=node('dialog','arrival-dialog');d.setAttribute('aria-labelledby','arrival-title');
 const layout=node('div','arrival-layout'),visual=node('div','arrival-visual'),content=node('div','arrival-content');
 const title=node('h1','','Кто войдёт в NULL CITY?');title.id='arrival-title';
 const canvas=node('canvas');canvas.width=192;canvas.height=288;canvas.setAttribute('aria-label','Выбранный персонаж');
 let actor=Number(model.appearance.actor)||0,frame=0;const draft={...model.appearance,actor:String(actor)};
 visual.append(node('p','micro','IDENTITY / 01'),canvas,node('p','arrival-scale','Твой первый шаг в город'));
 const form=node('form'),grid=node('div','arrival-presets');grid.setAttribute('role','group');grid.setAttribute('aria-label','Выбор персонажа');
 const choices=[];
 function paint(){paintWalkPreview(canvas,draft,'down',frame);choices.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===actor)));}
 for(let i=0;i<7;i++){
  const b=button('',()=>{actor=i;draft.actor=String(i);paint();},'arrival-preset');b.type='button';b.setAttribute('aria-label','Персонаж '+(i+1));
  const mini=node('canvas');mini.width=64;mini.height=96;mini.setAttribute('aria-hidden','true');paintWalkPreview(mini,{actor:String(i)},'down',0);
  b.append(mini,node('span','',String(i+1).padStart(2,'0')));grid.append(b);choices.push(b);
 }
 const label=node('label','arrival-name','Как тебя называть?'),name=node('input');name.name='playerName';name.required=true;name.minLength=2;name.maxLength=20;name.autocomplete='nickname';name.placeholder='Имя или позывной';name.value=model.playerName;label.append(name);
 const note=node('p','arrival-note','Это имя твоего персонажа. Локальный прогресс сохраняется на этом устройстве.');
 const error=node('p','arrival-error');error.setAttribute('role','status');
 const enter=button('Продолжить →',()=>{},'primary');enter.type='submit';
 form.append(grid,label,note,error,enter);
 form.onsubmit=e=>{e.preventDefault();const value=name.value.trim();if(value.length<2){error.textContent='Введи имя от 2 до 20 символов.';name.focus();return;}
  model.playerName=value.slice(0,20);model.appearance=normalizeAppearance(draft);applyPlayerOutfit(model.outfit,model.appearance);game.player.name=model.playerName;save();d.close();};
 content.append(node('p','micro mint','НОВЫЙ ОПЕРАТОР'),title,node('p','arrival-lead','Выбери образ и оставь первое имя в системе.'),form);layout.append(visual,content);d.append(layout);document.body.append(d);d.showModal();paint();
 const timer=setInterval(()=>{frame++;paint();},220);
 d.addEventListener('cancel',e=>e.preventDefault());d.addEventListener('close',()=>{clearInterval(timer);d.remove();document.getElementById('start')?.focus();},{once:true});
 name.focus();
}

// The mentor follows real movement and mission flags, rather than a timed slideshow.
let mentorPanel,mentorText,mentorTitle,mentorAction,mentorLast=0,mentorOrigin=null,mentorStep='';
function openPrologue(page=0){
 const scenes=[
  ['03:17 / Город не узнаёт своих','Поезд ушёл. На остановке мигает объявление: «Все системы работают штатно». Рядом женщина снова прикладывает пропуск к двери. На экране — NULL. «Я живу здесь двенадцать лет», — говорит она. Дверь не отвечает.','Ответить на вызов →'],
  ['Мара / Открытый канал','«Слышишь меня, '+(model.playerName||'оператор')+'? Я Мара, из мастерской. Это Юна. Ещё вчера её адрес был в реестре. Сегодня система утверждает, что такого человека нет. Мы пока не знаем, ошибка это или чья-то работа. Поэтому сначала собираем факты».','Я никогда этим не занимался →'],
  ['Первое правило / Сначала понять','«Тогда начнём вместе. Тебе не нужен набор секретных команд. Нужны внимание и привычка проверять выводы. Я разрешаю тебе работать на учебном терминале мастерской. Сначала осмотрись и сделай несколько шагов. Потом прочитаем заявку Юны».','Выйти на улицу →']
 ];
 const [title,text,label]=scenes[page];dialogue(title,text,()=>{if(page<scenes.length-1)openPrologue(page+1);else{model.story.introSeen=true;save();mentorOrigin={x:game.player.x,y:game.player.y};view.focus({preventScroll:true});}},label);
 const body=$('.dialogue-body');body.prepend(node('div','micro mint','ПРОЛОГ / '+(page+1)+' ИЗ 3'));
 body.append(button('Пропустить вступление',()=>{model.story.introSeen=true;save();closeModal();},'text-button'));
}
function initMentorTrail(){
 mentorPanel=node('section','mentor-trail');mentorPanel.setAttribute('aria-label','Навигация Мары');mentorPanel.hidden=true;
 mentorTitle=node('strong');mentorText=node('p');mentorText.setAttribute('role','status');
 mentorAction=button('Показать путь →',()=>{if(State.done.has('first')){model.story.tutorialDone=true;save();}navigateTask();},'secondary');
 const dismiss=button('Скрыть подсказки',()=>{model.story.tutorialSkip=true;save();mentorPanel.hidden=true;},'text-button');
 mentorPanel.append(node('span','micro mint','МАРА / НА СВЯЗИ'),mentorTitle,mentorText,mentorAction,dismiss);$('#stage').append(mentorPanel);
}
function updateMentorTrail(t){
 if(!mentorPanel||t-mentorLast<200)return;mentorLast=t;
 const visible=model.started&&!model.story.tutorialSkip&&!model.story.tutorialDone&&!State.done.has('route')&&!game.paused&&$('#intro').classList.contains('hidden');
 mentorPanel.hidden=!visible;if(!visible)return;
 if(!mentorOrigin)mentorOrigin={x:game.player.x,y:game.player.y};
 if(!model.story.tutorialMoved&&Math.hypot(game.player.x-mentorOrigin.x,game.player.y-mentorOrigin.y)>24){model.story.tutorialMoved=true;save();}
 const target=game.questSites.find(q=>q.id==='first');const near=target&&Math.hypot(game.player.x-target.x,game.player.y-target.y)<reach();
 const step=State.done.has('first')?'done':!model.story.tutorialMoved?'move':near?'interact':'route';
 if(step===mentorStep)return;mentorStep=step;
 const messages={
  move:['01 / Осмотрись','Сделай несколько шагов: WASD, стрелки или клик по свободной улице. На телефоне — джойстик. Я подожду.','Провести к терминалу →'],
  route:['02 / Найди первое поручение','Хорошо. Теперь к терминалу мастерской. Нажми G или кнопку ниже: персонаж пойдёт по маршруту. Движением можно остановить автопуть.','Показать путь →'],
  interact:['03 / Открой терминал','Ты на месте. Нажми E, кнопку действия на телефоне или кнопку ниже. Прочитаем заявку, ничего не меняя в системе.','Открыть терминал →'],
  done:['04 / Первый след','NULL — не имя Юны, а отсутствие записи. Мы нашли симптом, но ещё не причину. Следующий шаг — проверить связь на распределительном узле.','К следующей зацепке →']
 };const [title,text,action]=messages[step];mentorTitle.textContent=title;mentorText.textContent=text;mentorAction.textContent=action;
}

function openStoryCall(id,after=null){
 const call=STORY_CALLS[id];if(!call||!State.done.has(id))return;
 const card=modal(call.speaker+' / '+call.title,'ВХОДЯЩИЙ ВЫЗОВ / НОЧНАЯ СМЕНА'),body=node('div','dialogue-body');
 body.append(node('p','quote',call.text),node('h3','',call.question));
 const choices=node('div','story-choices');
 for(const [key,label,response] of call.choices)choices.append(button(label,()=>{
  model.storyCalls[id]=key;save();
  dialogue(call.speaker+' / '+call.title,response,after,after?'К следующему делу →':'Вернуться на улицу');
 },'secondary'));
 body.append(choices);card.append(body);
}
function appendRadioJournal(parent){
 const calls=Object.entries(STORY_CALLS).filter(([id])=>State.done.has(id));if(!calls.length)return;
 parent.append(node('h3','','Ночные разговоры'));
 for(const [id,call]of calls){const entry=node('article','journal-item'),reply=call.choices.find(c=>c[0]===model.storyCalls[id]);
  entry.append(node('h4','',call.speaker+' / '+call.title),node('p','',call.recap));
  if(reply)entry.append(node('p','', 'Твой ответ: «'+reply[1]+'»'));
  entry.append(button(reply?'Вернуться к разговору':'Ответить на вызов',()=>openStoryCall(id),'text-button'));parent.append(entry);
 }
}
