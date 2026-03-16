#!/usr/bin/env python3
"""
Run SQL against Supabase via Management API.
Usage:
  python3 run_sql.py "SELECT * FROM academias LIMIT 5"
  python3 run_sql.py --file migration.sql
  echo "SELECT 1" | python3 run_sql.py -
"""
import sys
import os
import json
import requests
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / '.env'
env = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()

TOKEN = env.get('SUPABASE_MANAGEMENT_TOKEN', os.environ.get('SUPABASE_MANAGEMENT_TOKEN', ''))
REF   = env.get('SUPABASE_PROJECT_REF',      os.environ.get('SUPABASE_PROJECT_REF', 'risvafrrbnozyjquxvzi'))

if not TOKEN:
    print('ERROR: SUPABASE_MANAGEMENT_TOKEN not set in .env', file=sys.stderr)
    sys.exit(1)

def run_sql(sql: str) -> list:
    url = f'https://api.supabase.com/v1/projects/{REF}/database/query'
    r = requests.post(url,
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        json={'query': sql},
        timeout=30
    )
    if not r.ok:
        print(f'ERROR {r.status_code}: {r.text}', file=sys.stderr)
        sys.exit(1)
    return r.json()

if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    if args[0] == '--file' and len(args) > 1:
        sql = Path(args[1]).read_text()
    elif args[0] == '-':
        sql = sys.stdin.read()
    else:
        sql = ' '.join(args)

    result = run_sql(sql)
    print(json.dumps(result, indent=2, ensure_ascii=False))
