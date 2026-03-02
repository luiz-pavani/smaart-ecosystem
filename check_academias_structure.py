#!/usr/bin/env python3
"""
Verificar estrutura da tabela academias
"""

import requests

SUPABASE_URL = "https://risvafrrbnozyjquxvzi.supabase.co"

# Carregar service role key
with open(".env") as f:
    for line in f:
        if "SUPABASE_SERVICE_ROLE_KEY=" in line:
            SERVICE_ROLE_KEY = line.split("=")[1].strip().strip('"\'')
            break

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

# Pegar uma academia existente para ver estrutura
url = f"{SUPABASE_URL}/rest/v1/academias?limit=1"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    academia = resp.json()[0] if resp.json() else {}
    print("Estrutura da tabela academias:")
    print("Colunas disponíveis:")
    for key in academia.keys():
        print(f"  • {key}: {type(academia[key]).__name__}")
else:
    print(f"Erro {resp.status_code}: {resp.text}")
