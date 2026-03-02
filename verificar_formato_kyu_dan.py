#!/usr/bin/env python3
"""
Verificar formato real de kyu_dan para ajustar o mapeamento
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

print("=" * 100)
print("ESTRUTURA DA TABELA KYU_DAN")
print("=" * 100)
print()

url = f"{SUPABASE_URL}/rest/v1/kyu_dan?select=*&order=ordem.asc"
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"❌ Erro: {resp.status_code}")
    exit(1)

kyu_dan_list = resp.json()

print(f"{'ID':<40} | {'Cor Faixa':<20} | {'Kyu/Dan':<15} | {'Ordem':<6}")
print("-" * 100)

for item in kyu_dan_list:
    id_str = str(item.get('id', 'N/A'))[:39]
    cor = str(item.get('cor_faixa', ''))[:19]
    kyu = str(item.get('kyu_dan', ''))[:14]
    ordem = str(item.get('ordem', ''))[:5]
    print(f"{id_str:<40} | {cor:<20} | {kyu:<15} | {ordem:<6}")

print()
print("=" * 100)
print("COMPARAÇÃO: Valores no campo 'graduacao' dos atletas vs kyu_dan")
print("=" * 100)
print()

# Buscar exemplos de graduacao dos atletas
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=graduacao&kyu_dan.ordem=eq.999&limit=10"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    atletas = resp.json()
    print("Exemplos de valores no campo 'graduacao' dos atletas:")
    for a in atletas[:10]:
        if a.get('graduacao'):
            print(f"  • '{a['graduacao']}'")

print()
print("💡 ANÁLISE:")
print("-" * 100)
print("Se os valores não batem (ex: 'AZUL | ROKKYŪ' vs 'AZUL' | 'ROKKYŪ'),")
print("precisamos fazer split por ' | ' e comparar separadamente.")
print("=" * 100)
