#!/usr/bin/env python3
"""
Investigar quantos registros em kyu_dan têm ordem=999
"""

import requests

SUPABASE_URL = "https://risvafrrbnozyjquxvzi.supabase.co"

with open(".env") as f:
    for line in f:
        if "SUPABASE_SERVICE_ROLE_KEY=" in line:
            SERVICE_ROLE_KEY = line.split("=")[1].strip().strip('"\'')
            break

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

print("=" * 80)
print("INVESTIGAÇÃO: REGISTROS COM ORDEM=999")
print("=" * 80)
print()

# Buscar todos os registros com ordem=999
print("🔍 Buscando kyu_dan com ordem=999...")
url = f"{SUPABASE_URL}/rest/v1/kyu_dan?select=*&ordem=eq.999"
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"❌ Erro: {resp.status_code}")
    exit(1)

registros_999 = resp.json()
print(f"✅ {len(registros_999)} registro(s) encontrado(s) com ordem=999")
print()

for reg in registros_999:
    print(f"ID: {reg['id']}")
    print(f"Cor Faixa: {reg.get('cor_faixa')}")
    print(f"Kyu/Dan: {reg.get('kyu_dan')}")
    print(f"Ordem: {reg.get('ordem')}")
    print("-" * 80)

print()

# Para cada ID com ordem=999, contar quantos atletas
print("📊 Contando atletas para cada ID com ordem=999...")
for reg in registros_999:
    kyu_dan_id = reg['id']
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id&kyu_dan_id=eq.{kyu_dan_id}"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        count = len(resp.json())
        print(f"kyu_dan_id={kyu_dan_id}: {count} atletas")

print()
print("=" * 80)
