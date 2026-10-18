"""Single-process HTTPS application. SQLite transactions serialize game decisions.
No host shell or real network targets are exposed to the learning simulator.
"""
import base64
import hashlib
import hmac
import io
import json
import math
import os
from pathlib import Path
import re
import secrets
import sqlite3
import ssl
import threading
import time
from collections import deque, OrderedDict
from contextlib import contextmanager
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
DB = Path(os.environ.get('DATABASE_PATH', ROOT / 'data/nullcity.sqlite3'))
ORIGIN = os.environ.get('PUBLIC_ORIGIN', 'https://localhost:8443').rstrip('/')
QUESTIONS = json.loads((ROOT/'server/questions.json').read_text())
CHANGES = threading.Condition()
REVISION = 0
HASH_SLOTS = threading.BoundedSemaphore(2)
RATE_LOCK = threading.Lock()
RATES = OrderedDict()
SESSION_TTL = 86400

class ApiError(Exception):
    def __init__(self, status, message): self.status, self.message = status, message

def now(): return int(time.time())
@contextmanager
def db():
    c = sqlite3.connect(DB, timeout=10)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    try:
        with c:
            yield c
    finally:
        c.close()

def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript((ROOT/'server/schema.sql').read_text())
        # Additive migration preserves existing accounts, rooms and results.
        if 'ready' not in {r[1] for r in c.execute('PRAGMA table_info(players)')}:
            c.execute('ALTER TABLE players ADD COLUMN ready INTEGER NOT NULL DEFAULT 0')
        if 'rematch_of' not in {r[1] for r in c.execute('PRAGMA table_info(rooms)')}:
            c.execute('ALTER TABLE rooms ADD COLUMN rematch_of INTEGER REFERENCES rooms(id)')
        c.execute('CREATE UNIQUE INDEX IF NOT EXISTS one_rematch ON rooms(rematch_of) WHERE rematch_of IS NOT NULL')

def changed():
    global REVISION
    with CHANGES:
        REVISION += 1
        CHANGES.notify_all()

def rate(key, limit, window):
    t = time.monotonic()
    with RATE_LOCK:
        q = RATES.setdefault(key, deque())
        RATES.move_to_end(key)
        while q and q[0] <= t-window: q.popleft()
        if len(q) >= limit: raise ApiError(429, 'Слишком много запросов. Подожди немного.')
        q.append(t)
        while len(RATES)>10000: RATES.popitem(last=False)

def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    with HASH_SLOTS:
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=131072, r=8, p=1, maxmem=256*1024*1024).hex()
    return salt+':'+digest

def text(data, key, lo, hi):
    value = data.get(key)
    if not isinstance(value,str) or not lo <= len(value.strip()) <= hi or any(ord(ch)<32 and ch!='\n' for ch in value):
        raise ApiError(400, f'Поле {key}: длина от {lo} до {hi} символов.')
    return value.strip()

def number(data,key,lo,hi):
    n=data.get(key)
    if type(n) is not int or not lo<=n<=hi: raise ApiError(400,'Недопустимое числовое значение: '+key)
    return n

def profile(row, private=False):
    p={k:row[k] for k in ['id','name','bio','created']}
    p.update(online=row['seen']>now()-45,avatar=f"/api/avatar/{row['id']}" if row['avatar'] else None)
    if private: p['email']=row['email']
    return p

def valid_save(s):
    if not isinstance(s,dict) or s.get('version')!=1: raise ApiError(400,'Неизвестная версия сохранения.')
    ids=['first','route','dns','logs','firewall','transfer','report','signal','access','restore','broadcast']
    done=s.get('done')
    if not isinstance(done,list) or done!=ids[:len(done)]: raise ApiError(400,'Неверная последовательность дел.')
    for key in ['xp','spentXp']:
        n=s.get(key,0)
        if type(n) is not int or not 0<=n<=100000: raise ApiError(400,'Неверный опыт.')
    if s.get('spentXp',0)>s.get('xp',0): raise ApiError(400,'Неверный кошелёк.')
    if not isinstance(s.get('notes',''),str) or len(s.get('notes',''))>10000: raise ApiError(400,'Слишком длинные заметки.')
    a=s.get('appearance',{})
    if not isinstance(a,dict): raise ApiError(400,'Неверная внешность.')
    for k in ['skin','hairColor','eyeColor']:
        if k in a and (not isinstance(a[k],str) or not re.fullmatch(r'#[a-fA-F0-9]{6}',a[k])): raise ApiError(400,'Неверный цвет.')
    if 'gender' in a and a['gender'] not in ['male','female','nonbinary']: raise ApiError(400,'Неверный пол.')
    if 'hair' in a and a['hair'] not in ['swept','crop','bob','long','mohawk','bun','bald']: raise ApiError(400,'Неверная причёска.')
    if len(json.dumps(s))>180000: raise ApiError(413,'Сохранение слишком большое.')
    return s

def advance(c, room):
    if room['state']!='playing': return room
    # One transaction advances at most one round; reconnects cannot skip unseen questions.
    count=c.execute('SELECT count(*) FROM players WHERE room_id=?',(room['id'],)).fetchone()[0]
    answered=c.execute('SELECT count(*) FROM answers WHERE room_id=? AND round=?',(room['id'],room['round'])).fetchone()[0]
    if now()>=room['deadline'] or answered==count:
        nxt=room['round']+1
        state='finished' if nxt>=len(json.loads(room['deck'])) else 'playing'
        c.execute('UPDATE rooms SET round=?, state=?, deadline=? WHERE id=?',(nxt,state,now() if state=='finished' else now()+room['duration'],room['id']))
        changed()
    return c.execute('SELECT * FROM rooms WHERE id=?',(room['id'],)).fetchone()

def room_view(c,r,uid):
    r=advance(c,r);players=[dict(p) for p in c.execute('SELECT u.id,u.name,u.seen,p.score,p.ready FROM players p JOIN users u ON p.user_id=u.id WHERE room_id=? ORDER BY p.score DESC,u.id',(r['id'],))]
    for p in players: p['online']=p.pop('seen')>now()-45
    deck=json.loads(r['deck']);q=QUESTIONS[deck[r['round']]] if r['round']<len(deck) else None
    own=c.execute('SELECT choice FROM answers WHERE room_id=? AND user_id=? AND round=?',(r['id'],uid,r['round'])).fetchone()
    result={k:r[k] for k in ['id','name','host','capacity','topic','duration','state','round','deadline','created','rematch_of']}
    power=c.execute('SELECT hint_round,hint_option FROM players WHERE room_id=? AND user_id=?',(r['id'],uid)).fetchone()
    result.update(hintUsed=bool(power and power['hint_round'] is not None),eliminated=power['hint_option'] if power and power['hint_round']==r['round'] else None,players=players,total=len(deck),serverTime=now(),choice=own[0] if own else None,question={'q':q['q'],'options':q['options']} if q and r['state']=='playing' else None)
    if r['state']=='finished':
        result['review']=[{'q':QUESTIONS[i]['q'],'answer':QUESTIONS[i]['options'][QUESTIONS[i]['answer']],'why':QUESTIONS[i]['why']} for i in deck]
        best=max((p['score'] for p in players),default=0)
        result['winners']=[p['id'] for p in players if p['score']==best]
    return result

class Handler(BaseHTTPRequestHandler):
    server_version='NullCity'
    def log_message(self,*args): pass # Never log passwords, cookies, bodies, or query data.
    def setup(self):
        super().setup();self.connection.settimeout(30)
    def respond(self,status,data,headers=None,mime='application/json; charset=utf-8'):
        payload=json.dumps(data,ensure_ascii=False).encode() if mime.startswith('application/json') else data
        self.send_response(status)
        for k,v in {'Content-Type':mime,'Content-Length':str(len(payload)),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Strict-Transport-Security':'max-age=31536000','Permissions-Policy':'camera=(), microphone=(), geolocation=()',**(headers or {})}.items(): self.send_header(k,v)
        self.end_headers();self.wfile.write(payload)
    def body(self):
        if self.headers.get('Origin')!=ORIGIN or self.headers.get('X-NullCity')!='1': raise ApiError(403,'Запрос должен исходить из приложения.')
        if self.headers.get('Content-Type','').split(';')[0]!='application/json': raise ApiError(415,'Нужен JSON.')
        try: size=int(self.headers.get('Content-Length','0'))
        except ValueError: raise ApiError(400,'Неверная длина запроса.')
        if not 0<size<=200000: raise ApiError(413,'Размер запроса превышен.')
        try: data=json.loads(self.rfile.read(size),parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Non-finite JSON')))
        except (ValueError,UnicodeError,RecursionError): raise ApiError(400,'Неверный JSON.')
        if not isinstance(data,dict): raise ApiError(400,'Нужен объект JSON.')
        return data
    def user(self,c):
        cookie=SimpleCookie()
        try: cookie.load(self.headers.get('Cookie',''))
        except Exception: raise ApiError(401,'Войди в аккаунт.')
        token=cookie.get('__Host-nullcity')
        token=hashlib.sha256(token.value.encode()).hexdigest() if token else ''
        u=c.execute('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?',(token,now())).fetchone()
        if not u: raise ApiError(401,'Войди в аккаунт.')
        c.execute('UPDATE users SET seen=? WHERE id=?',(now(),u['id']))
        self.session_token=token
        return u
    def do_GET(self): self.dispatch('GET')
    def do_POST(self): self.dispatch('POST')
    def do_PUT(self): self.dispatch('PUT')
    def do_DELETE(self): self.dispatch('DELETE')
    def dispatch(self,method):
        try:
            path=urlsplit(self.path).path
            if not path.startswith('/api/'):
                if method!='GET': raise ApiError(405,'Метод не поддерживается.')
                return self.static(path)
            rate(('all',self.client_address[0]),300,60)
            data=self.body() if method!='GET' else {}
            if path=='/api/health' and method=='GET':
                with db() as c: c.execute('SELECT 1')
                return self.respond(200,{'status':'ok'})
            with db() as c:
                if path in ['/api/register','/api/login'] and method=='POST': return self.auth(c,path,data)
                u=self.user(c);uid=u['id']
                if path=='/api/events' and method=='GET':
                    c.commit();return self.events(uid)
                result=self.api(c,u,method,path,data)
            if method!='GET': changed()
            self.respond(200,result)
        except ApiError as e: self.respond(e.status,{'error':e.message})
        except sqlite3.IntegrityError: self.respond(409,{'error':'Операция конфликтует с существующими данными.'})
        except (BrokenPipeError,ConnectionResetError,TimeoutError,ssl.SSLEOFError,ssl.SSLZeroReturnError): pass
        except Exception as e:
            print('Request failed:',type(e).__name__,flush=True)
            self.respond(500,{'error':'Ошибка сервера. Попробуй позднее.'})
    def auth(self,c,path,data):
        rate(('auth',self.client_address[0]),10,300)
        email=text(data,'email',3,254).lower();password=data.get('password','')
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): raise ApiError(400,'Неверный email.')
        if not isinstance(password,str) or not 12<=len(password)<=128: raise ApiError(400,'Пароль: от 12 до 128 символов.')
        if path=='/api/register':
            name=text(data,'name',2,32);hashed=hash_password(password)
            c.execute('INSERT INTO users(email,password,name,created,seen) VALUES(?,?,?,?,?)',(email,hashed,name,now(),now()))
        else:
            u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
            candidate=hash_password(password,u['password'].split(':')[0] if u else '0'*32)
            if not u or not hmac.compare_digest(candidate,u['password']): raise ApiError(401,'Неверный email или пароль.')
        u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone();token=secrets.token_urlsafe(32)
        c.execute('DELETE FROM sessions WHERE expires<?',(now(),))
        c.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),u['id'],now()+SESSION_TTL));c.commit()
        self.respond(200,profile(u,True),{'Set-Cookie':f'__Host-nullcity={token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={SESSION_TTL}'})
    def api(self,c,u,method,path,data):
        uid=u['id']
        if path=='/api/me':
            if method=='GET': return profile(u,True)
            if method=='PUT':
                name=text(data,'name',2,32);bio=text(data,'bio',0,300)
                c.execute('UPDATE users SET name=?,bio=? WHERE id=?',(name,bio,uid));return {'ok':True}
        if path=='/api/logout' and method=='POST':
            c.execute('DELETE FROM sessions WHERE token=?',(self.session_token,));return {'ok':True}
        if path=='/api/save':
            s=c.execute('SELECT * FROM saves WHERE user_id=?',(uid,)).fetchone()
            if method=='GET': return {'revision':s['revision'] if s else 0,'save':json.loads(s['payload']) if s else None}
            if method=='PUT':
                revision=number(data,'revision',0,2147483647);payload=json.dumps(valid_save(data.get('save')),ensure_ascii=False)
                # Conditional update prevents stale tabs from overwriting newer progress.
                if revision==0:
                    try: c.execute('INSERT INTO saves VALUES(?,?,1,?)',(uid,payload,now()))
                    except sqlite3.IntegrityError: raise ApiError(409,'На сервере уже есть сохранение. Сначала загрузи его.')
                elif c.execute('UPDATE saves SET payload=?,revision=revision+1,updated=? WHERE user_id=? AND revision=?',(payload,now(),uid,revision)).rowcount!=1: raise ApiError(409,'Сохранение изменилось в другой вкладке. Сначала загрузи свежую версию.')
                return {'revision':revision+1}
        if path=='/api/avatar' and method=='PUT':
            raw=data.get('image','')
            if raw is None: c.execute('UPDATE users SET avatar=NULL WHERE id=?',(uid,));return {'ok':True}
            if not isinstance(raw,str) or len(raw)>170000: raise ApiError(400,'Аватар слишком большой.')
            try:
                binary=base64.b64decode(raw,validate=True)
                if len(binary)>120*1024: raise ValueError()
                with Image.open(io.BytesIO(binary)) as im:
                    if im.format not in ['PNG','JPEG'] or im.width*im.height>4000000: raise ValueError()
                    im.load();im=im.convert('RGB');im.thumbnail((128,128));out=io.BytesIO();im.save(out,format='PNG');avatar=out.getvalue()
            except (ValueError,UnidentifiedImageError,OSError,Image.DecompressionBombError): raise ApiError(400,'Загрузи PNG/JPEG до 120 КБ и 4 мегапикселей.')
            c.execute('UPDATE users SET avatar=? WHERE id=?',(avatar,uid));return {'ok':True}
        if path.startswith('/api/avatar/') and method=='GET':
            target=int(path.rsplit('/',1)[-1]) if path.rsplit('/',1)[-1].isdigit() else 0
            row=c.execute('SELECT avatar FROM users WHERE id=?',(target,)).fetchone()
            if not row or not row[0]: raise ApiError(404,'Аватар не найден.')
            # handled as binary by dispatch wrapper
            return {'image':base64.b64encode(row[0]).decode()}
        if path=='/api/users' and method=='GET':
            q=parse_qs(urlsplit(self.path).query);term=q.get('q',[''])[0][:40]
            try: page=min(10000,max(0,int(q.get('page',['0'])[0])))
            except ValueError: raise ApiError(400,'Неверный номер страницы.')
            online=q.get('online',['0'])[0]=='1';sort='u.name COLLATE NOCASE' if q.get('sort',[''])[0]=='name' else 'u.created DESC'
            rows=c.execute(f'SELECT u.* FROM users u WHERE u.name LIKE ? AND (?=0 OR u.seen>?) ORDER BY {sort} LIMIT 20 OFFSET ?',('%'+term+'%',int(online),now()-45,page*20)).fetchall()
            return {'users':[profile(r) for r in rows],'page':page}
        if path=='/api/friends':
            if method=='GET':
                rows=c.execute('SELECT f.*,u.name,u.seen,u.id FROM friends f JOIN users u ON u.id=CASE WHEN f.sender=? THEN f.recipient ELSE f.sender END WHERE sender=? OR recipient=?',(uid,uid,uid)).fetchall()
                return [dict(r) for r in rows]
            target=number(data,'userId',1,2147483647)
            if target==uid: raise ApiError(400,'Это твой профиль.')
            if method=='POST':
                existing=c.execute('SELECT * FROM friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)',(uid,target,target,uid)).fetchone()
                if existing and existing['recipient']==uid: c.execute('UPDATE friends SET accepted=1 WHERE sender=? AND recipient=?',(target,uid))
                elif not existing: c.execute('INSERT INTO friends(sender,recipient) VALUES(?,?)',(uid,target))
                return {'ok':True}
            if method=='DELETE':
                c.execute('DELETE FROM friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)',(uid,target,target,uid));return {'ok':True}
        if path=='/api/messages':
            if method=='GET': return [dict(r) for r in c.execute('SELECT m.id,m.user_id,m.body,m.created,u.name FROM messages m JOIN users u ON u.id=m.user_id ORDER BY m.id DESC LIMIT 60')][::-1]
            if method=='POST':
                rate(('chat',uid),20,60);c.execute('INSERT INTO messages(user_id,body,created) VALUES(?,?,?)',(uid,text(data,'body',1,500),now()));return {'ok':True}
        if path=='/api/matchmaking' and method=='POST':
            c.commit();c.execute('BEGIN IMMEDIATE')
            # Idempotent matchmaking: reconnecting users return to their active room.
            existing=c.execute("SELECT r.id FROM rooms r JOIN players p ON p.room_id=r.id WHERE p.user_id=? AND r.state IN ('waiting','playing') ORDER BY r.id DESC LIMIT 1",(uid,)).fetchone()
            if existing:
                current=advance(c,c.execute('SELECT * FROM rooms WHERE id=?',(existing['id'],)).fetchone())
                if current['state'] in ('waiting','playing'): return {'id':existing['id']}
            r=c.execute("SELECT r.* FROM rooms r WHERE state='waiting' AND topic='mixed' AND duration=30 AND created>? AND (SELECT count(*) FROM players WHERE room_id=r.id)<capacity ORDER BY r.id LIMIT 1",(now()-1800,)).fetchone()
            if r: rid=r['id']
            else:
                rate(('rooms',uid),5,300)
                deck=list(range(len(QUESTIONS)));secrets.SystemRandom().shuffle(deck)
                rid=c.execute('INSERT INTO rooms(host,name,capacity,topic,duration,deck,created) VALUES(?,?,?,?,?,?,?)',(uid,'Ночная смена / быстрый матч',4,'mixed',30,json.dumps(deck[:5]),now())).lastrowid
            c.execute('INSERT INTO players(room_id,user_id) VALUES(?,?)',(rid,uid))
            return {'id':rid}
        if path=='/api/rooms':
            if method=='GET': return [room_view(c,r,uid) for r in c.execute('SELECT * FROM rooms ORDER BY id DESC LIMIT 30').fetchall()]
            if method=='POST':
                rate(('rooms',uid),5,300)
                topic=data.get('topic','mixed')
                if topic not in ['mixed','network','security']: raise ApiError(400,'Неизвестная тема.')
                deck=[i for i,q in enumerate(QUESTIONS) if topic=='mixed' or q['topic']==topic];secrets.SystemRandom().shuffle(deck)
                roomid=c.execute('INSERT INTO rooms(host,name,capacity,topic,duration,deck,created) VALUES(?,?,?,?,?,?,?)',(uid,text(data,'name',2,40),number(data,'capacity',2,4),topic,number(data,'duration',15,60),json.dumps(deck[:5]),now())).lastrowid
                c.execute('INSERT INTO players(room_id,user_id) VALUES(?,?)',(roomid,uid));return {'id':roomid}
        match=re.fullmatch(r'/api/rooms/(\d+)(?:/(join|start|answer|hint|ready|leave|rematch))?',path)
        if match:
            rid=int(match[1]);action=match[2]
            c.commit();c.execute('BEGIN IMMEDIATE')
            r=c.execute('SELECT * FROM rooms WHERE id=?',(rid,)).fetchone()
            if not r: raise ApiError(404,'Комната не найдена.')
            r=advance(c,r)
            if method=='GET' and not action: return room_view(c,r,uid)
            if method=='POST' and action=='join':
                count=c.execute('SELECT count(*) FROM players WHERE room_id=?',(rid,)).fetchone()[0]
                exists=c.execute('SELECT 1 FROM players WHERE room_id=? AND user_id=?',(rid,uid)).fetchone()
                if exists: return room_view(c,r,uid)
                if r['state']!='waiting' or count>=r['capacity']: raise ApiError(409,'Комната уже заполнена или матч начался.')
                c.execute('INSERT INTO players(room_id,user_id) VALUES(?,?)',(rid,uid));return room_view(c,r,uid)
            if method=='POST' and action=='ready':
                if r['state']!='waiting': raise ApiError(409,'Матч уже начался.')
                if type(data.get('ready')) is not bool: raise ApiError(400,'Укажи готовность.')
                if not c.execute('UPDATE players SET ready=? WHERE room_id=? AND user_id=?',(int(data['ready']),rid,uid)).rowcount: raise ApiError(403,'Зрители не занимают место в команде.')
                return {'ok':True}
            if method=='POST' and action=='leave':
                if r['state']!='waiting': raise ApiError(409,'Начатый матч сохраняется для переподключения. Вернись к нему из списка.')
                c.execute('DELETE FROM players WHERE room_id=? AND user_id=?',(rid,uid))
                remaining=c.execute('SELECT user_id FROM players WHERE room_id=? ORDER BY user_id',(rid,)).fetchall()
                if not remaining: c.execute("UPDATE rooms SET state='cancelled' WHERE id=?",(rid,))
                elif r['host']==uid: c.execute('UPDATE rooms SET host=? WHERE id=?',(remaining[0]['user_id'],rid))
                return {'ok':True}
            if method=='POST' and action=='rematch':
                if r['state']!='finished': raise ApiError(409,'Сначала заверши матч.')
                if not c.execute('SELECT 1 FROM players WHERE room_id=? AND user_id=?',(rid,uid)).fetchone(): raise ApiError(403,'Реванш доступен участникам.')
                nxt=c.execute('SELECT * FROM rooms WHERE rematch_of=?',(rid,)).fetchone()
                if nxt:
                    if nxt['state']!='waiting': raise ApiError(409,'Реванш уже начался или закрыт.')
                    count=c.execute('SELECT count(*) FROM players WHERE room_id=?',(nxt['id'],)).fetchone()[0]
                    member=c.execute('SELECT 1 FROM players WHERE room_id=? AND user_id=?',(nxt['id'],uid)).fetchone()
                    if not member and count>=nxt['capacity']: raise ApiError(409,'Реванш заполнен.')
                    c.execute('INSERT OR IGNORE INTO players(room_id,user_id) VALUES(?,?)',(nxt['id'],uid));return {'id':nxt['id']}
                rate(('rooms',uid),5,300)
                deck=[i for i,q in enumerate(QUESTIONS) if r['topic']=='mixed' or q['topic']==r['topic']];secrets.SystemRandom().shuffle(deck)
                nxtid=c.execute('INSERT INTO rooms(host,name,capacity,topic,duration,deck,created,rematch_of) VALUES(?,?,?,?,?,?,?,?)',(uid,'Реванш / '+str(rid),r['capacity'],r['topic'],r['duration'],json.dumps(deck[:5]),now(),rid)).lastrowid
                c.execute('INSERT INTO players(room_id,user_id) VALUES(?,?)',(nxtid,uid));return {'id':nxtid}
            if method=='POST' and action=='start':
                count=c.execute('SELECT count(*) FROM players WHERE room_id=?',(rid,)).fetchone()[0]
                if r['host']!=uid: raise ApiError(403,'Начать матч может создатель.')
                if r['state']!='waiting' or count<2: raise ApiError(409,'Нужно минимум два игрока в ожидающей комнате.')
                if c.execute('SELECT count(*) FROM players WHERE room_id=? AND ready=0',(rid,)).fetchone()[0]: raise ApiError(409,'Все участники должны подтвердить готовность.')
                c.execute("UPDATE rooms SET state='playing',deadline=? WHERE id=?",(now()+r['duration'],rid));return {'ok':True}
            if method=='POST' and action=='hint':
                if r['state']!='playing' or number(data,'round',0,4)!=r['round']: raise ApiError(409,'Раунд уже завершён.')
                player=c.execute('SELECT * FROM players WHERE room_id=? AND user_id=?',(rid,uid)).fetchone()
                if not player: raise ApiError(403,'Зрители не используют способности.')
                if player['hint_round'] is not None: raise ApiError(409,'Импульс уже использован.')
                if c.execute('SELECT 1 FROM answers WHERE room_id=? AND user_id=? AND round=?',(rid,uid,r['round'])).fetchone(): raise ApiError(409,'Ответ уже принят.')
                q=QUESTIONS[json.loads(r['deck'])[r['round']]]
                wrong=next(i for i in range(len(q['options'])) if i!=q['answer'])
                c.execute('UPDATE players SET hint_round=?,hint_option=? WHERE room_id=? AND user_id=?',(r['round'],wrong,rid,uid));return {'ok':True}
            if method=='POST' and action=='answer':
                if r['state']!='playing' or number(data,'round',0,4)!=r['round']: raise ApiError(409,'Этот раунд уже завершён.')
                q=QUESTIONS[json.loads(r['deck'])[r['round']]];choice=number(data,'choice',0,len(q['options'])-1)
                if not c.execute('SELECT 1 FROM players WHERE room_id=? AND user_id=?',(rid,uid)).fetchone(): raise ApiError(403,'Зрители не отправляют ответы.')
                correct=int(choice==q['answer'])
                try: c.execute('INSERT INTO answers VALUES(?,?,?,?,?)',(rid,uid,r['round'],choice,correct))
                except sqlite3.IntegrityError: raise ApiError(409,'Ответ уже принят.')
                c.execute('UPDATE players SET score=score+? WHERE room_id=? AND user_id=?',(correct,rid,uid));return {'accepted':True}
        if path=='/api/stats' and method=='GET':
            history=[]
            for r in c.execute("SELECT r.* FROM rooms r JOIN players p ON p.room_id=r.id WHERE p.user_id=? AND r.state='finished' ORDER BY r.id DESC LIMIT 100",(uid,)).fetchall(): history.append(room_view(c,r,uid))
            board=[dict(r) for r in c.execute("SELECT u.id,u.name,SUM(p.score) score,COUNT(*) matches FROM players p JOIN rooms r ON r.id=p.room_id JOIN users u ON u.id=p.user_id WHERE r.state='finished' GROUP BY u.id ORDER BY score DESC,u.id LIMIT 20")]
            outcomes=c.execute("SELECT p.score, (SELECT MAX(p2.score) FROM players p2 WHERE p2.room_id=p.room_id) best, (SELECT COUNT(*) FROM players p2 WHERE p2.room_id=p.room_id AND p2.score=p.score) ties FROM players p JOIN rooms r ON p.room_id=r.id WHERE p.user_id=? AND r.state='finished'",(uid,)).fetchall()
            wins=sum(o['score']==o['best'] and o['ties']==1 for o in outcomes);draws=sum(o['score']==o['best'] and o['ties']>1 for o in outcomes)
            total=c.execute("SELECT COALESCE(SUM(p.score),0),COUNT(*) FROM players p JOIN rooms r ON r.id=p.room_id WHERE p.user_id=? AND r.state='finished'",(uid,)).fetchone()
            daily=c.execute("SELECT CAST(r.deadline/86400 AS INTEGER) day,SUM(p.score) score FROM players p JOIN rooms r ON p.room_id=r.id WHERE p.user_id=? AND r.state='finished' GROUP BY day",(uid,)).fetchall()
            today=next((d['score'] for d in daily if d['day']==now()//86400),0)
            bonus=sum(d['score']>=3 for d in daily)*40
            xp=total[0]*20+bonus;badges=[]
            if total[1]: badges.append('Первая арена')
            if total[0]>=5: badges.append('Пять верных решений')
            if wins: badges.append('Победитель смены')
            return {'history':history,'leaderboard':board,'wins':wins,'draws':draws,'losses':len(outcomes)-wins-draws,'xp':xp,'level':1+xp//100,'badges':badges,'daily':{'progress':min(today,3),'target':3,'reward':40,'complete':today>=3,'resetsAt':(now()//86400+1)*86400},'nextLevelXp':100-xp%100,'rank':['Стажёр','Оператор','Аналитик','Хранитель сети'][min(3,xp//300)]}
        if path=='/api/export' and method=='GET':
            s=c.execute('SELECT payload FROM saves WHERE user_id=?',(uid,)).fetchone()
            return {'profile':profile(u,True),'save':json.loads(s[0]) if s else None,'messages':[dict(r) for r in c.execute('SELECT body,created FROM messages WHERE user_id=?',(uid,))],'matches':[dict(r) for r in c.execute('SELECT room_id,score FROM players WHERE user_id=?',(uid,))]}
        raise ApiError(404,'Метод или ресурс не найден.')
    def events(self,uid):
        # One event stream per user limits idle worker consumption.
        rate(('events',uid),6,60)
        self.send_response(200);self.send_header('Content-Type','text/event-stream');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers()
        seen=-1;end=time.monotonic()+25
        while time.monotonic()<end:
            with CHANGES:
                if seen==REVISION: CHANGES.wait(timeout=5)
                seen=REVISION
            with db() as c:
                if not c.execute('SELECT 1 FROM sessions WHERE token=? AND expires>?',(self.session_token,now())).fetchone(): return
                c.execute('UPDATE users SET seen=? WHERE id=?',(now(),uid))
            self.wfile.write(f'data: {seen}\n\n'.encode());self.wfile.flush()
    def static(self,path):
        allowed={'/':'index.html','/hub.html':'hub.html','/privacy.html':'privacy.html','/terms.html':'terms.html'}
        if path.startswith('/src/') and re.fullmatch(r'/src/[a-zA-Z0-9_.-]+\.(js|mjs|css)',path): name=path[1:]
        elif re.fullmatch(r'/assets/nulls/(bg-room-svg|char-(?:01-desert|02-ocean|03-ice|04-lava|05-cyber|06-gas|07-crystal|08-jungle|09-void|10-hive))\.svg',path): name=path[1:]
        elif re.fullmatch(r'/assets/city/(terrain|buildings|long_buildings|vehicles_game|characters_game|parks)\.png',path): name=path[1:]
        elif path in ['/assets/signal-lost/opening-cover.png','/assets/characters/main_characters_walkcycles.png','/assets/characters/npc_8_roles_walkcycles.png','/assets/terrain/asphalt_paving_additional_tiles.png','/assets/terrain/asphalt_cobblestone_full_tileset.png','/assets/terrain/stone-atlas.png','/assets/terrain/stone-platform.png','/assets/terrain/road-atlas.png','/assets/objects/midnight-ramen.png','/assets/signal-lost/tape-room.png','/assets/signal-lost/portraits.png']: name=path[1:]
        else: name=allowed.get(path)
        if not name or not (ROOT/name).is_file(): raise ApiError(404,'Страница не найдена.')
        mime='image/svg+xml' if name.endswith('.svg') else 'image/png' if name.endswith('.png') else 'text/css' if name.endswith('.css') else 'text/javascript' if name.endswith(('.js','.mjs')) else 'text/html'
        self.respond(200,(ROOT/name).read_bytes(),mime=mime+'; charset=utf-8')

if __name__=='__main__':
    init_db()
    cert=os.environ.get('TLS_CERT',str(ROOT/'data/tls/cert.pem'));key=os.environ.get('TLS_KEY',str(ROOT/'data/tls/key.pem'))
    server=ThreadingHTTPServer((os.environ.get('BIND','127.0.0.1'),int(os.environ.get('PORT','8443'))),Handler)
    context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.minimum_version=ssl.TLSVersion.TLSv1_2;context.load_cert_chain(cert,key)
    server.socket=context.wrap_socket(server.socket,server_side=True)
    print('NULL CITY HTTPS ready',flush=True);server.serve_forever()
