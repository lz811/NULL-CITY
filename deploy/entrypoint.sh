#!/bin/sh
set -eu
umask 077
mkdir -p /app/data/tls
if [ ! -f /app/data/tls/cert.pem ]; then
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' -keyout /app/data/tls/key.pem -out /app/data/tls/cert.pem >/dev/null 2>&1
fi
exec python3 server/app.py
