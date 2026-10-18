"""Native HTTPS launcher for environments where Docker execution is unavailable."""
import os
from pathlib import Path
import runpy
import subprocess
ROOT=Path(__file__).resolve().parents[1]
settings=ROOT/'.env'
allowed={'PUBLIC_ORIGIN','PORT','BIND','DATABASE_PATH','TLS_CERT','TLS_KEY'}
if settings.exists():
    for line in settings.read_text().splitlines():
        if line.strip().startswith('#') or '=' not in line: continue
        key,value=line.split('=',1)
        if key.strip() in allowed: os.environ.setdefault(key.strip(),value.strip().strip('"\''))
tls=ROOT/'data/tls';tls.mkdir(parents=True,exist_ok=True);tls.chmod(0o700)
cert=Path(os.environ.get('TLS_CERT',tls/'cert.pem'));key=Path(os.environ.get('TLS_KEY',tls/'key.pem'))
if not cert.exists() and not key.exists():
    old=os.umask(0o077)
    try:
        subprocess.run(['openssl','req','-x509','-newkey','rsa:3072','-sha256','-nodes','-days','365','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',str(key),'-out',str(cert)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    finally: os.umask(old)
os.environ.setdefault('TLS_CERT',str(cert));os.environ.setdefault('TLS_KEY',str(key))
print('Открой игру: '+os.environ.get('PUBLIC_ORIGIN','https://localhost:8443/'),flush=True)
print('Оставь этот терминал открытым. Остановка сервера: Ctrl+C.',flush=True)
runpy.run_path(str(ROOT/'server/app.py'),run_name='__main__')
