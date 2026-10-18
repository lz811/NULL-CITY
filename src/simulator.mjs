// Deliberately offline. Commands only read and mutate this model, never the host.
export const SAVE_VERSION = 1;
export const OUTFITS=[
 {id:'default',name:'Ночная смена',price:0,color:'#75f5d1',desc:'Твой первый рабочий комплект. Всегда доступен.'},
 {id:'rose',name:'Розовый шум',price:80,color:'#ef9abf',desc:'Малиновая куртка, яркие волосы и светящиеся детали.'},
 {id:'amber',name:'Солнечный след',price:140,color:'#ffce88',desc:'Тёплый янтарь для самых дождливых ночей.'},
 {id:'violet',name:'Фантом сети',price:220,color:'#b8a2ff',desc:'Фиолетовая куртка и контрастный неоновый визор.'},
 {id:'ghost',name:'Белый протокол',price:300,color:'#d7f0ff',desc:'Светлая одежда с холодными голубыми акцентами.'}
];
export function wallet(s){return Math.max(0,s.xp-(s.spentXp||0));}
export function buyOutfit(s,id){const item=OUTFITS.find(o=>o.id===id);if(!item)return {ok:false,reason:'Образ не найден.'};if(!s.ownedOutfits.includes(id)){if(wallet(s)<item.price)return {ok:false,reason:'Не хватает XP. Заверши дело или помоги жителям.'};s.spentXp+=item.price;s.ownedOutfits.push(id);}s.outfit=id;return {ok:true};}
export function storyReward(s,id,amount){if(s.storyRewards.includes(id))return false;s.storyRewards.push(id);s.xp+=amount;return true;}

export function normalizeAppearance(raw={}) {
 const s={actor:'0',origin:'char-01-desert',gender:'female',hair:'swept',skin:'#c9a15c',hairColor:'#7a5238',eyeColor:'#19c8e0'};
 if(!raw||typeof raw!=='object')return s;
 if(raw.actor==='custom'||/^[0-6]$/.test(String(raw.actor)))s.actor=String(raw.actor);
 if(['char-01-desert','char-02-ocean','char-03-ice','char-04-lava','char-05-cyber','char-06-gas','char-07-crystal','char-08-jungle','char-09-void','char-10-hive'].includes(raw.origin))s.origin=raw.origin;
 if(['female','male','nonbinary'].includes(raw.gender))s.gender=raw.gender;
 if(['swept','crop','bob','long','mohawk','bun','bald'].includes(raw.hair))s.hair=raw.hair;
 for(const key of ['skin','hairColor','eyeColor'])if(/^#[0-9a-f]{6}$/i.test(raw[key]))s[key]=raw[key];
 return s;
}
export function freshState() {
 return {version:SAVE_VERSION,playerName:'',done:[],flags:{},hints:{},notes:'',started:false,dns:'10.24.4.99',blocked:[],files:{},backupGateway:'10.24.4.1',backupDns:'10.24.4.53',ending:null,xp:0,spentXp:0,ownedOutfits:['default'],outfit:'default',appearance:normalizeAppearance(),interiorId:null,capital:{district:'streets',completed:[],steps:{}},story:{},storyCalls:{},storyRewards:[],courseLessons:[],position:null,settings:{sound:false,calm:false,quality:'balanced',weather:'rain',rain:true,scanlines:false,grain:false,ambientVolume:70,effectsVolume:70}};
}
export function restoreState(raw) {
 const s=freshState();
 if (!raw || raw.version!==SAVE_VERSION) return s;
 for(const k of ['started']) if(typeof raw[k]==='boolean') s[k]=raw[k];
 for(const k of ['dns','backupGateway','backupDns','notes']) if(typeof raw[k]==='string') s[k]=raw[k].slice(0,10000);
 for(const k of ['done','blocked']) if(Array.isArray(raw[k])) s[k]=[...new Set(raw[k].filter(v=>typeof v==='string'))];
 for(const k of ['flags','hints','files']) if(raw[k] && typeof raw[k]==='object' && !Array.isArray(raw[k])) s[k]=Object.fromEntries(Object.entries(raw[k]).filter(([key,v])=>!['__proto__','constructor','prototype'].includes(key) && (typeof v==='string'||typeof v==='boolean'||typeof v==='number')));
 if(raw.capital&&typeof raw.capital==='object'){
  const ids=['mind','soc','corporation'],limits={mind:4,soc:4,corporation:6};
  for(const id of ids){const allowed=id==='mind'?s.done.includes('report'):id==='soc'?s.done.includes('broadcast')&&s.capital.completed.includes('mind'):s.capital.completed.includes('soc');if(!allowed)break;const n=Math.max(0,Math.min(limits[id],Math.floor(Number(raw.capital.steps?.[id])||0)));s.capital.steps[id]=n;if(n===limits[id]&&Array.isArray(raw.capital.completed)&&raw.capital.completed.includes(id))s.capital.completed.push(id);}
  const id=raw.capital.district;if(id==='capital'||id==='mind'&&s.done.includes('report')||id==='soc'&&s.done.includes('broadcast')&&s.capital.completed.includes('mind')||id==='corporation'&&s.capital.completed.includes('soc'))s.capital.district=id;
 }
 s.playerName=typeof raw.playerName==='string'?raw.playerName.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20):'';
 const callOptions={route:['facts','promise'],dns:['memory','support'],logs:['verify','ask'],firewall:['check','people'],transfer:['report','why']};
 for(const [id,options]of Object.entries(callOptions))if(s.done.includes(id)&&options.includes(raw.storyCalls?.[id]))s.storyCalls[id]=raw.storyCalls[id];
 s.appearance=normalizeAppearance(raw.appearance);
 s.xp=Math.max(0,Math.min(100000,Math.floor(Number(raw.xp)||0)));
 s.spentXp=Math.max(0,Math.min(s.xp,Math.floor(Number(raw.spentXp)||0)));
 if(Array.isArray(raw.ownedOutfits))s.ownedOutfits=[...new Set(['default',...raw.ownedOutfits.filter(id=>OUTFITS.some(o=>o.id===id))])];
 if(s.ownedOutfits.includes(raw.outfit))s.outfit=raw.outfit;
 if(raw.story&&typeof raw.story==='object')for(const key of ['introSeen','tutorialMoved','tutorialSkip','tutorialDone','maraPast','letterAsked','letterFound','letterReturned','letterChoice','decoded','broadcastChoice'])if(typeof raw.story[key]==='boolean'||typeof raw.story[key]==='string')s.story[key]=raw.story[key];
 if(Array.isArray(raw.storyRewards))s.storyRewards=[...new Set(raw.storyRewards.filter(id=>['maraPast','letterReturned','decoded'].includes(id)))];
 if(Array.isArray(raw.courseLessons))s.courseLessons=[...new Set(raw.courseLessons.filter(id=>['oscp','security'].includes(id)))];
 if(s.capital.district==='streets'&&['workshop','diner','shop','radio','archive'].includes(raw.interiorId))s.interiorId=raw.interiorId;
 s.ending=['community','engineers'].includes(raw.ending)?raw.ending:null;
 if(raw.position && Number.isFinite(raw.position.x)&&Number.isFinite(raw.position.y)) s.position=raw.position;
 if(raw.settings){if(['auto','day','sunset','night','rain','heavy','fog','storm'].includes(raw.settings.weather))s.settings.weather=raw.settings.weather;for(const k of ['sound','calm','rain','scanlines','grain'])if(typeof raw.settings[k]==='boolean')s.settings[k]=raw.settings[k];if(['cinematic','balanced','low'].includes(raw.settings.quality))s.settings.quality=raw.settings.quality;for(const k of ['ambientVolume','effectsVolume'])if(Number.isFinite(raw.settings[k]))s.settings[k]=Math.max(0,Math.min(100,raw.settings[k]));}
 return s;
}
const LOG='03:12 service=dns actor=maint-02 action=healthcheck result=OK\n03:17 actor=ghost-17 action=dns.change old=10.24.4.53 new=10.24.4.99\n03:18 actor=ghost-17 action=registry.export dst=203.0.113.66:443\n03:19 resident=YUNA record=NULL source=registry-sync\n03:20 monitor alert=unexpected-export';
function files(s,backup){return {
 '/home/operator/brief.txt':'ЗАЯВКА 004 / МАРА\nДом 04: портал недоступен. Житель: NULL.\nПроверь сеть. Сначала выясни, что работает.\nСервер портала: 10.24.8.20; шлюз: 10.24.4.1.',
 '/etc/network.conf':backup?`interface=eth0\naddress=10.61.7.22/24\ngateway=${s.backupGateway}\ndns=${s.backupDns}\n# Штатные значения резервной сети:\n# gateway=10.61.7.1\n# dns=10.61.7.53\n# archive.city=10.61.9.40`:`interface=eth0\naddress=10.24.4.18/24\ngateway=10.24.4.1\ndns=${s.dns}\n# Штатный DNS квартала: 10.24.4.53\n# Последнее изменение: ghost-17 / 03:17`,
 '/var/log/access.log':LOG,...s.files};}
const normalize=p=>p?.startsWith('/')?p:'/home/operator/'+p;
const ipValid=p=>/^\d{1,3}(\.\d{1,3}){3}$/.test(p||'')&&p.split('.').every(x=>+x<=255);
export function execute(s,caseId,input){
 if(['signal','access','restore','broadcast'].includes(caseId))return executeChapterTwo(s,caseId,input);
 const words=input.trim().split(/\s+/),[cmd,a,b]=words, f=s.flags, backup=caseId==='transfer';
 const fs=files(s,backup);
 const err=text=>({text,error:true});
 const ok=text=>({text,error:false});
 const on=(id,flag)=>{if(caseId===id)f[flag]=true;};
 const routeOK=!backup||s.backupGateway==='10.61.7.1';
 const configuredDns=backup?s.backupDns:s.dns;
 const dnsConfigured=backup?s.backupDns==='10.61.7.53':s.dns==='10.24.4.53';
 const resolve=name=>name==='portal.city'?'10.24.8.20':name==='archive.city'?'10.61.9.40':null;
 const reachable=ip=>(ip.startsWith(backup?'10.61.7.':'10.24.4.')||routeOK)&&!s.blocked.includes(ip)&&!s.blocked.includes('all');
 const dnsOK=dnsConfigured&&reachable(configuredDns);
 if(!input.trim())return ok('');
 if(cmd==='help')return ok('НАВИГАЦИЯ\npwd · ls [папка] · cat <файл>\nСЕТЬ\nip addr · ip route · ping <адрес>\nnslookup <имя> · curl <имя или URL>\nРАССЛЕДОВАНИЕ\ncp <источник> <копия> · grep <текст> <файл>\nУЧЕБНЫЕ КОМАНДЫ\nset dns <IP> · set gateway <IP>\nconnections · firewall list\nfirewall block <IP> · firewall unblock <IP>\nevidence add <идентификатор>\nclear — очистить экран\nВсё выполняется внутри модели, без внешней сети.');
 if(cmd==='pwd'){on('first','pwd');return ok('/home/operator');}
 if(cmd==='ls'){
  const path=a||'/home/operator';
  if(['.','/home/operator','/home/operator/'].includes(path)){on('first','ls');return ok('brief.txt');}
  if(path==='/')return ok('home/  etc/  var/  evidence/');
  const entries=Object.keys(fs).filter(k=>k.startsWith(path.replace(/\/$/,'')+'/')).map(k=>k.slice(path.replace(/\/$/,'').length+1));
  if(path==='/evidence'&&!entries.length)return ok('(папка пуста)');
  return entries.length?ok(entries.join('\n')):err('Папка не найдена. Попробуй ls / или ls /evidence.');
 }
 if(cmd==='cat'){
  const path=normalize(a);if(!Object.hasOwn(fs,path))return err('Файл не найден. ls покажет содержимое папки.');
  if(path.endsWith('brief.txt'))on('first','brief');
  if(path==='/etc/network.conf')on(backup?'transfer':'dns',backup?'backupConfig':'dnsConfig');
  if(path==='/var/log/access.log')on('logs','logsRead');
  return ok(fs[path]);
 }
 if(cmd==='ip'&&a==='addr'){on('route','address');return ok(`eth0 UP\n  inet ${backup?'10.61.7.22/24':'10.24.4.18/24'}\n  link/ether 02:00:04:17:0a:01`);}
 if(cmd==='ip'&&a==='route'){on('route','route');return ok(`default via ${backup?s.backupGateway:'10.24.4.1'} dev eth0\n${backup?'10.61.7.0':'10.24.4.0'}/24 dev eth0 scope link`);}
 if(cmd==='ping'){
  let ip=a;if(!ipValid(ip)) {if(!dnsOK)return err('Не удалось разрешить имя. Проверь DNS и маршрут.');ip=resolve(a);}
  if(!ip||!['10.24.4.1','10.24.8.20','10.24.4.53','10.61.7.1','10.61.7.53','10.61.9.40'].includes(ip))return err('Ответа нет. В модели доступны только устройства учебной сети.');
  if(!reachable(ip))return err('Ответа нет. Проверь маршрут и правила firewall.');
  if(ip==='10.24.4.1')on('route','gateway');if(ip==='10.24.8.20')on('route','server');
  return ok(`PING ${ip}\n64 bytes from ${ip}: seq=1 ttl=63 time=2.1 ms\n64 bytes from ${ip}: seq=2 ttl=63 time=1.8 ms\n2 transmitted, 2 received, 0% packet loss`);
 }
 if(cmd==='nslookup'){
  if(!a)return err('Формат: nslookup portal.city');
  if(!dnsOK)return err(`DNS ${backup?s.backupDns:s.dns}: timeout\nНет ответа от настроенного DNS. Проверь /etc/network.conf.`);
  const ip=resolve(a);if(!ip)return err('NXDOMAIN: такого имени нет в учебной зоне.');
  if(a==='portal.city')on('dns','resolved');
  return ok(`Server: ${backup?s.backupDns:s.dns}\nName: ${a}\nAddress: ${ip}`);
 }
 if(cmd==='curl'){
  const host=(a||'').replace(/^https?:\/\//,'').split('/')[0];
  if(!routeOK)return err('Network unreachable. Проверь ip route.');
  if(!ipValid(host)&&!dnsOK)return err('Could not resolve host: '+host);
  const ip=ipValid(host)?host:resolve(host);
  if(!ip||!['10.24.8.20','10.61.9.40'].includes(ip))return err('Учебный сервис не найден.');
  if(!reachable(ip))return err('Connection blocked by firewall. Проверь firewall list.');
  if(ip==='10.24.8.20') {on('dns','portal');if(s.blocked.includes('203.0.113.66'))on('firewall','healthy');return ok('HTTP/1.1 200 OK\nNULL CITY / Городской портал\nСвязь: восстановлена\nЖитель YUNA: '+(s.done.includes('transfer')?'ACTIVE':'NULL / запись требует восстановления'));}
  if(backup&&dnsOK&&host==='archive.city')on('transfer','archive');
  return ok('HTTP/1.1 200 OK\nРезервный архив / запись YUNA-004 найдена\nКонтрольная запись: ACTIVE\nКопия готова к восстановлению.');
 }
 if(cmd==='set'){
  if(!['dns','gateway'].includes(a)||!ipValid(b)||words.length!==3)return err('Формат учебной команды: set dns <IPv4> или set gateway <IPv4>.');
  if(!['dns','transfer'].includes(caseId))return err('Конфигурация доступна на терминале дома и резервном узле.');
  if(a==='gateway'&&!backup)return err('Шлюз основного узла исправен. В этом деле исследуй DNS.');
  if(backup){if(a==='dns'){s.backupDns=b;f.backupDns=b==='10.61.7.53';}else{s.backupGateway=b;f.backupGateway=b==='10.61.7.1';}f.archive=false;}
  else{s.dns=b;f.dnsFixed=b==='10.24.4.53';f.resolved=false;f.portal=false;}
  return ok(`Настройка ${a} = ${b} сохранена. Проверь результат диагностическими командами.`);
 }
 if(cmd==='cp'){
  if(caseId!=='logs')return err('Копирование улик доступно в архиве.');
  const src=normalize(a);if(!Object.hasOwn(fs,src))return err('Источник не найден.');
  if(b!=='/evidence/access.log')return err('Сохрани журнал в папку дела: /evidence/access.log.');
  if(src!=='/var/log/access.log')return err('Для дела нужен оригинальный журнал /var/log/access.log.');
  s.files[b]=fs[src];f.preserved=true;return ok('Копия сохранена: /evidence/access.log\nОригинал не изменён.');
 }
 if(cmd==='grep'){
  const path=normalize(b);if(!a||!Object.hasOwn(fs,path))return err('Формат: grep ghost-17 /evidence/access.log');
  const lines=fs[path].split('\n').filter(x=>x.toLowerCase().includes(a.toLowerCase()));
  if(a.toLowerCase()==='ghost-17'&&path==='/evidence/access.log')on('logs','ghostFound');
  return ok(lines.join('\n')||'Совпадений нет.');
 }
 if(cmd==='evidence'&&a==='add'){
  if(caseId!=='logs'||b!=='ghost-17')return err('Укажи найденный идентификатор: evidence add <имя>.');
  if(!f.preserved||!f.ghostFound)return err('Сначала сохрани журнал и найди событие в сохранённой копии.');
  f.evidence=true;return ok('УЛИКА E-01: ghost-17 → dns.change → registry.export\nИсточник: /evidence/access.log, 03:17–03:18\nЛичность владельца учётной записи не установлена.');
 }
 if(cmd==='connections'){
  on('firewall','flows');const blocked=s.blocked.includes('203.0.113.66')||s.blocked.includes('all');
  if(blocked)on('firewall','verifiedFlows');
  return ok(`SOURCE        DESTINATION         STATE\n10.24.4.18 → 10.24.8.20:443      ${reachable('10.24.8.20')?'ESTABLISHED':'BLOCKED'} / портал\n10.24.4.18 → 203.0.113.66:443    ${blocked?'BLOCKED':'ESTABLISHED'} / registry.export\nВнешний экспорт не предусмотрен штатной конфигурацией.`);
 }
 if(cmd==='firewall'){
  if(a==='list')return ok('Default: allow\n'+(s.blocked.map(x=>'DENY → '+x).join('\n')||'Нет блокировок'));
  if(caseId!=='firewall')return err('Правила изменяются на шлюзе квартала.');
  if(!['block','unblock'].includes(a)||!(ipValid(b)||b==='all'))return err('firewall block <IP> / firewall unblock <IP> / firewall list');
  s.blocked=s.blocked.filter(x=>x!==b);if(a==='block')s.blocked.push(b);
  f.contained=s.blocked.includes('203.0.113.66')&&!s.blocked.includes('all');f.healthy=false;f.verifiedFlows=false;
  return ok(`Правило ${a==='block'?'DENY добавлено':'удалено'}: ${b}\nПроверь connections и работу портала.`);
 }
 if(cmd==='clear')return {text:'',clear:true};
 return err(`Неизвестная команда: ${cmd}. Введи help для списка. Команды учебной модели не запускаются на твоём компьютере.`);
}
export function caseReady(s,task){
 if(task.id==='report')return !!s.ending;
 const checks=task.checks.every(([k])=>s.flags[k]);
 if(task.id==='dns')return checks&&s.dns==='10.24.4.53';
 if(task.id==='firewall')return checks&&s.blocked.includes('203.0.113.66')&&!s.blocked.includes('10.24.8.20')&&!s.blocked.includes('all');
 if(task.id==='transfer')return checks&&s.backupDns==='10.61.7.53'&&s.backupGateway==='10.61.7.1';
 return checks;
}


// A bounded fictional incident simulator. No host commands or network requests.
function executeChapterTwo(s,id,input){
 const cmd=input.trim().toLowerCase().replace(/\s+/g,' '),f=s.flags;
 const ok=text=>({text,error:false}),err=text=>({text,error:true});
 const commands={signal:'mail read · contacts list · call mara · mail quarantine',access:'access show · access role courier · sessions revoke · access test',restore:'backup list · backup verify night-03 · backup verify night-02 · restore stage night-02 · restore test · restore commit',broadcast:'dossier read · dossier redact · dossier verify · publish community · publish engineers'};
 if(!cmd)return ok('');if(cmd==='clear')return {text:'',clear:true};
 if(cmd==='help')return ok('УЧЕБНАЯ МОДЕЛЬ / '+commands[id]+'\nКоманды работают только внутри этой миссии.');
 if(id==='signal'){
  if(cmd==='mail read'){f.signalRead=true;return ok('FROM: Мара <mara@nexus-support.example>\nREPLY: keys@nexus-support.example\n«Пришли ключ реестра. Немедленно. Это Мара».\nПриложение: голосовая запись. Билет: relay-17.');}
  if(cmd==='contacts list'){f.contactsRead=true;return ok('Доверенная локальная запись: MARA / mara@repair.city\nСохранённый канал: call mara\nКонтакт добавлен до инцидента.');}
  if(cmd==='call mara'){if(!f.contactsRead)return err('Сначала найди контакт в доверенном справочнике: contacts list.');f.maraVerified=true;return ok('МАРА / сохранённый канал: «Я не просила ключ. Сохрани письмо, изолируй его. Голос можно подделать».');}
  if(cmd==='mail quarantine'){if(!f.signalRead||!f.maraVerified)return err('Нужно изучить сообщение и проверить просьбу независимо.');f.mailQuarantined=true;return ok('Письмо изолировано, исходник сохранён. Ключ не раскрыт. Улика E-02: relay-17.');}
 }
 if(id==='access'){
  if(cmd==='access show'){f.accessRead=true;return ok('relay-17 / роль: '+(f.leastPrivilege?'courier':'administrator')+'\nАктивные старые сессии: '+(f.sessionsRevoked?'0':'3')+'\nЗадача: доставка. courier: delivery.read; administrator: delivery.read + registry.delete');}
  if(cmd==='access role courier'){if(!f.accessRead)return err('Сначала исследуй текущие права: access show.');f.leastPrivilege=true;f.accessTested=false;return ok('Роль courier назначена. Старые сессии ещё нужно отозвать.');}
  if(cmd==='sessions revoke'){if(!f.leastPrivilege)return err('Сначала ограничь роль, иначе новый вход снова даст полный доступ.');f.sessionsRevoked=true;f.accessTested=false;return ok('3 старые сессии отозваны. Выполни access test.');}
  if(cmd==='access test'){if(!f.leastPrivilege||!f.sessionsRevoked)return err('FAIL: избыточные права или старые сессии ещё действуют.');f.accessTested=true;return ok('PASS delivery.read: ALLOW\nPASS registry.delete: DENY\nPASS old session: REJECTED');}
 }
 if(id==='restore'){
  if(cmd==='backup list'){f.backupsRead=true;return ok('night-03 / 03:20 / после инцидента / 12 записей заявлено\nnight-02 / 02:00 / до инцидента / 12 записей заявлено\nОжидаемые SHA-256 хранятся в отдельном доверенном манифесте.');}
  if(cmd==='backup verify night-03')return err('FAIL: SHA-256 не совпадает с доверенным манифестом. Новизна не означает исправность.');
  if(cmd==='backup verify night-02'){if(!f.backupsRead)return err('Сначала изучи список копий.');f.backupVerified=true;return ok('PASS: SHA-256 совпадает с доверенным манифестом. Данные ещё нужно проверить после восстановления.');}
  if(cmd==='restore stage night-02'){if(!f.backupVerified)return err('Сначала проверь копию: backup verify night-02.');f.restoreStaged=true;f.restoreTested=false;return ok('Копия развёрнута в тестовом реестре. Рабочая база не изменена.');}
  if(cmd==='restore test'){if(!f.restoreStaged)return err('Сначала восстанови копию в тестовом окружении.');f.restoreTested=true;return ok('PASS: 12/12 записей читаются; адреса связаны с жителями; дубликатов нет.');}
  if(cmd==='restore commit'){if(!f.restoreTested)return err('Нельзя вводить непроверенное восстановление в работу.');f.restoreCommitted=true;return ok('Реестр переключён. 12 домов ACTIVE. Предыдущая версия сохранена для отката.');}
 }
 if(id==='broadcast'){
  if(cmd==='dossier read'){f.dossierRead=true;return ok('E-02: поддельная просьба о ключе; E-03: избыточные права relay-17.\nE-04: приказ NEXUS и подпись Иво. Восстановлено 12 домов.\nКопия также содержит личные адреса жителей — перед передачей убрать.\nЛичность оператора ghost-17 по этим данным не установлена.');}
  if(cmd==='dossier redact'){if(!f.dossierRead)return err('Сначала прочитай состав пакета.');f.dossierRedacted=true;f.dossierVerified=false;return ok('Из распространяемой копии удалены личные адреса. Исходники остались в архиве.');}
  if(cmd==='dossier verify'){if(!f.dossierRedacted)return err('FAIL: в пакете ещё есть личные адреса.');f.dossierVerified=true;return ok('PASS: доказательства сохранены, личные адреса исключены.\nВыбор: publish community — публичный эфир; publish engineers — адресная передача инженерам.');}
  if(['publish community','publish engineers'].includes(cmd)){if(!f.dossierVerified)return err('Сначала подготовь и проверь копию пакета.');if(f.broadcastSent)return err('Пакет уже отправлен. Решение этой смены принято.');s.story.broadcastChoice=cmd.split(' ')[1];f.broadcastSent=true;return ok(s.story.broadcastChoice==='community'?'ЭФИР: жители получают доказательства. Радио становится точкой взаимопомощи.':'ЗАЩИЩЁННЫЙ КАНАЛ: инженеры получают доказательства. Архив становится центром проверки других узлов.');}
 }
 return err('Команда не найдена. help покажет команды этой миссии.');
}
