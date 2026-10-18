"""Consistent SQLite backup (safe with WAL); restore only with app stopped."""
import argparse
import sqlite3
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('destination',type=Path);a=p.parse_args()
if not a.source.is_file(): p.error('Source database does not exist')
if a.destination.exists(): p.error('Destination exists; choose a new path')
a.destination.parent.mkdir(parents=True,exist_ok=True)
with sqlite3.connect(f'file:{a.source}?mode=ro',uri=True) as source, sqlite3.connect(a.destination) as target:
    source.backup(target)
    if target.execute('PRAGMA integrity_check').fetchone()[0]!='ok': raise RuntimeError('Backup integrity check failed')
a.destination.chmod(0o600)
print('Backup verified:',a.destination)
