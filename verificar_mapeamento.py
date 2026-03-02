#!/usr/bin/env python3
"""
Verificar se os 5 atletas foram mapeados
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
print("🔍 VERIFICAÇÃO DOS 5 ATLETAS")
print("=" * 80)

# IDs conhecidos da auditoria
atleta_ids = [3756, 3757, 3758, 3759, 2670]

for atleta_id in atleta_ids:
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,nome_completo,academias,academia_id&id=eq.{atleta_id}"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200 and resp.json():
        atleta = resp.json()[0]
        academia_id_status = "✅ MAPEADO" if atleta['academia_id'] else "❌ SEM ACADEMIA_ID"
        print(f"\nID {atleta['id']}: {atleta['nome_completo']}")
        print(f"  Texto: {atleta.get('academias', 'N/A')}")
        print(f"  Academia ID: {atleta.get('academia_id', 'NULL')} {academia_id_status}")

# Buscar academias DCM e GAR
print("\n" + "=" * 80)
print("🏫 ACADEMIAS DCM E GAR")
print("=" * 80)

for sigla in ['DCM', 'GAR']:
    url = f"{SUPABASE_URL}/rest/v1/academias?select=id,sigla,nome&sigla=eq.{sigla}"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        academias = resp.json()
        print(f"\n{sigla}: {len(academias)} encontrada(s)")
        for a in academias:
            print(f"  • ID: {a['id']} | Nome: {a['nome']}")

# Contar total sem academia_id
print("\n" + "=" * 80)
print("📊 TOTAL SEM ACADEMIA_ID")
print("=" * 80)

url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id&academia_id=is.null&limit=1000"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    total_sem = len(resp.json())
    print(f"Total de atletas sem academia_id: {total_sem}")
    print(f"Meta: ≤ 86 (reduzir de 91)")
    
    if total_sem <= 86:
        print(f"🎉 META ATINGIDA! ({91 - total_sem} atletas mapeados)")
    else:
        print(f"⏳ Ainda faltam {total_sem - 86} para atingir a meta")
