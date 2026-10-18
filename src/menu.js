'use strict';
// Menu actions share the existing account API and campaign model.
function initGameMenu(api,controls){
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn)=>{const b=make('button',text,'secondary');b.type='button';b.onclick=fn;return b;};
 let account=null;
 async function request(path,body){const r=await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','X-NullCity':'1'},...(body?{body:JSON.stringify(body)}:{})});let value;try{value=await r.json();}catch{throw Error('Сервер недоступен. Открой HTTPS-версию игры.');}if(!r.ok)throw Error(value.error||'Не удалось подключиться.');return value;}
 function panel(title){const d=make('dialog',undefined,'menu-dialog');d.setAttribute('aria-label',title);const head=make('div',undefined,'menu-dialog-head');head.append(make('h2',title),button('Закрыть',()=>d.close()));d.append(head);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;}
 const multiplayer=button('Мультиплеер · 2–4 игрока',()=>{
  const d=panel('Ночная смена / онлайн');d.append(make('p','Пять раундов. Общие вопросы, один ответ на раунд. Побеждает точность.','menu-lead'));
  for(const [title,description,url] of [['Быстрый матч','Подбор открытого лобби. Перед стартом все подтверждают готовность.','hub.html?play=quick'],['Играть с друзьями','Создай комнату, выбери тему и таймер, передай ссылку друзьям.','hub.html'],['Смотреть матч','Живые комнаты, счёт и разбор решений после финала.','hub.html?play=watch']]){
   const card=make('article',undefined,'menu-mode');card.append(make('h3',title),make('p',description));const a=make('a','Открыть →','menu-link');a.href=url;card.append(a);d.append(card);
  }
  if(!account)d.append(make('p','Для сетевой игры войди или создай аккаунт. Одиночная история доступна без регистрации.','menu-note'));
 });
 window.addEventListener('null-city-open-account',()=>showAccount());
 const login=button('Войти / Регистрация',()=>showAccount());
 function showAccount(register=false){
  const d=panel(account?'Пропуск оператора':register?'Регистрация':'Вход в аккаунт');
  if(account){d.append(make('p',account.name,'menu-lead'));const a=make('a','Профиль, друзья и результаты →','menu-link');a.href='hub.html';d.append(a,button('Выйти из аккаунта',async()=>{try{await request('logout',{});account=null;login.textContent='Войти / Регистрация';d.close();}catch(e){d.append(make('p',e.message));}}));return;}
  if(location.protocol!=='https:'){
   d.append(make('p','Этот адрес открывает только файлы игры. Регистрация и вход работают на защищённом сервере.','menu-note'));
   if(['localhost','127.0.0.1'].includes(location.hostname)){
    const online=make('a','Перейти к регистрации / входу →','primary menu-link');online.href='https://localhost:8443/';d.append(online);
    d.append(make('p','Если браузер сообщает о недоверенном сертификате, сначала настрой доверие к локальному сертификату или используй сервер с доверенным HTTPS-сертификатом.','menu-note'));
   }else d.append(make('p','Открой игру по HTTPS-адресу сервера авторизации.','menu-note'));
   return;
  }
  const form=make('form');for(const [name,label,type,min,max]of [['email','Email','email',3,254],['password','Пароль · 12–128 символов','password',12,128],...(register?[['name','Имя оператора','text',2,32]]:[])]){const l=make('label',label),i=make('input');i.name=name;i.type=type;i.minLength=min;i.maxLength=max;i.required=true;i.autocomplete=name==='password'?(register?'new-password':'current-password'):name==='name'?'nickname':'email';l.append(i);form.append(l);}
  const status=make('p','','menu-note');status.setAttribute('role','status');const submit=make('button',register?'Создать аккаунт':'Войти','primary');submit.type='submit';form.append(submit,status);d.append(form,button(register?'Уже есть аккаунт':'Создать аккаунт',()=>{d.close();showAccount(!register);}));
  const policy=make('a','Конфиденциальность','menu-link');policy.href='privacy.html';d.append(policy);

  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;status.textContent='Подключение…';try{account=await request(register?'register':'login',Object.fromEntries(new FormData(form)));login.textContent='Оператор: '+account.name;d.close();}catch(error){status.textContent=error.message;}finally{submit.disabled=false;}};
 }
 const dossier=button('Досье / достижения',()=>{
  const d=panel('Досье оператора'),m=api.getModel(),n=m.done.length+(m.capital?.completed.length||0),total=api.caseList.length+3;
  d.append(make('p',n+' / '+total+' операций завершено · '+m.xp+' XP','menu-lead'));const progress=make('progress');progress.max=total;progress.value=n;progress.setAttribute('aria-label','Прогресс сюжетной кампании');d.append(progress);
  const next=api.caseList.find(q=>!m.done.includes(q.id));d.append(make('p',next?'Следующая цель: '+next.title:m.capital?.completed.includes('corporation')?'REGENT остановлен. Вернись к историям жителей или попробуй сетевую смену.':'Следующая цель: открой Столицу и продвигайся к NEXUS.'));
  const badges=[['Первый след',m.done.includes('first'),'Заверши первую смену'],['Голос квартала',m.done.includes('broadcast'),'Верни жителям эфир'],['Связь восстановлена',m.capital?.completed.includes('mind'),'Заверши Сады связи'],['Город помнит',m.capital?.completed.includes('corporation'),'Останови REGENT'],['Свой стиль',(m.ownedOutfits?.length||0)>1,'Купи образ в NEON THREAD'],['Письмо домой',!!m.story?.letterReturned,'Верни посылку Юне']];
  for(const [title,done,desc]of badges){const row=make('article',undefined,'menu-badge'+(done?' earned':''));row.append(make('strong',(done?'✓ ':'◇ ')+title),make('p',desc));d.append(row);}
  d.append(make('p','Каждое дело открывает следующее. В арене есть отдельные уровни и ежедневная цель: три верных ответа в завершённых матчах. Пропуски дней не отнимают прогресс.','menu-note'));
 });
 multiplayer.classList.add('main-mode');controls.insertBefore(multiplayer,controls.children[1]);controls.append(login,dossier);controls.classList.add('expanded-menu');
 if(location.protocol==='https:')request('me').then(u=>{account=u;login.textContent='Оператор: '+u.name;}).catch(()=>{});
}
