#!/usr/bin/env python3
"""
Executar Verificação Cruzada de Graduações: CSV vs Banco Remoto
"""

import requests
import json

SUPABASE_URL = "https://risvafrrbnozyjquxvzi.supabase.co"

with open(".env") as f:
    for line in f:
        if "SUPABASE_SERVICE_ROLE_KEY=" in line:
            SERVICE_ROLE_KEY = line.split("=")[1].strip().strip('"\'')
            break

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("=" * 80)
print("VERIFICAÇÃO CRUZADA: GRADUAÇÕES CSV vs BANCO REMOTO")
print("=" * 80)
print()

# Query 1: Total de registros "NÃO ESPECIFICADA"
print("📊 [1/6] Total de registros com graduação 'NÃO ESPECIFICADA'...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,kyu_dan_id,kyu_dan(ordem)&kyu_dan.ordem=eq.999"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    total_nao_especificada = len(resp.json())
    print(f"   ✅ Total: {total_nao_especificada}")
else:
    print(f"   ❌ Erro: {resp.status_code}")
    total_nao_especificada = 0

print()

# Query 2: Verificar NULLs
print("🔍 [2/6] Verificando campos NULL em graduação e dan...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=graduacao,dan,kyu_dan(ordem)&kyu_dan.ordem=eq.999"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    registros = resp.json()
    total = len(registros)
    graduacao_null = sum(1 for r in registros if r.get('graduacao') is None)
    dan_null = sum(1 for r in registros if r.get('dan') is None)
    ambos_null = sum(1 for r in registros if r.get('graduacao') is None and r.get('dan') is None)
    ambos_vazios = sum(1 for r in registros if str(r.get('graduacao', '')).strip() == '' and str(r.get('dan', '')).strip() == '')
    
    print(f"   Total: {total}")
    print(f"   graduacao NULL: {graduacao_null}")
    print(f"   dan NULL: {dan_null}")
    print(f"   Ambos NULL: {ambos_null}")
    print(f"   Ambos vazios: {ambos_vazios}")
else:
    print(f"   ❌ Erro: {resp.status_code}")

print()

# Query 3: Listar primeiros 20 para comparação manual
print("📋 [3/6] Primeiros 20 registros NÃO ESPECIFICADA...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=numero_membro,nome_completo,graduacao,dan,email,kyu_dan(cor_faixa,ordem)&kyu_dan.ordem=eq.999&order=nome_completo.asc&limit=20"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    registros = resp.json()
    print(f"   {'Nº Membro':<12} | {'Nome Completo':<35} | {'Graduação':<15} | {'Dan':<5}")
    print("   " + "-" * 80)
    for r in registros[:10]:  # Mostrar só 10 para não poluir
        num_membro = str(r.get('numero_membro', 'N/A'))[:11]
        nome = r.get('nome_completo', 'N/A')[:34]
        grad = str(r.get('graduacao', 'NULL'))[:14]
        dan = str(r.get('dan', 'NULL'))[:4]
        print(f"   {num_membro:<12} | {nome:<35} | {grad:<15} | {dan:<5}")
    if len(registros) > 10:
        print(f"   ... e mais {len(registros) - 10} registros")
else:
    print(f"   ❌ Erro: {resp.status_code}")

print()

# Query 4: Verificar nomes específicos (primeiros do CSV)
print("🔎 [4/6] Buscando nomes específicos (primeiros da lista CSV)...")
nomes_primeiro_lote = [
    'GABRIEL JUNQUEIRA VELASQUEZ',
    'Luiz Henrique Maia Deolindo',
    'DAVI DA ROSA DUARTE',
    'Eduarda Rosa',
    'Vicente Reis De Castro',
    'Alice Xavier',
    'Petherson Aires',
    'ALEXSSANDRO ALONSO BENDER',
    'ALICE GONÇALVES SARTURI',
    'ALICE SIMOES SILVEIRA'
]

encontrados_primeiro = []
for nome in nomes_primeiro_lote:
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=nome_completo,graduacao,dan,numero_membro&nome_completo=eq.{nome}"
    resp = requests.get(url, headers=headers)
    if resp.status_code == 200 and resp.json():
        encontrados_primeiro.append(resp.json()[0])

print(f"   Encontrados: {len(encontrados_primeiro)} de {len(nomes_primeiro_lote)}")
for r in encontrados_primeiro[:5]:
    print(f"   ✅ {r['nome_completo'][:40]} | Grad: {r.get('graduacao', 'NULL')} | Dan: {r.get('dan', 'NULL')}")
if len(encontrados_primeiro) > 5:
    print(f"   ... e mais {len(encontrados_primeiro) - 5}")

print()

# Query 5: Verificar últimos nomes do CSV
print("🔎 [5/6] Buscando nomes específicos (últimos da lista CSV)...")
nomes_ultimo_lote = [
    'BARBARA MARTINS PIRES',
    'CRISTIANO CRUZ DA SILVA',
    'DIOZEFER MICAEL DA SILVA MACIEL',
    'GABRIEL GRESLLER',
    'KASSIA LOPES DE OLIVEIRA',
    'LUIS FERNANDO SILVEIRA FREITAS',
    'MIGUEL ANGELO CARVALHO DOS SANTOS',
    'MIRIAN PAIN CORREA',
    'RICARDO DE BORBA WENCESLAU',
    'THIAGO MULLER CRISPIM'
]

encontrados_ultimo = []
for nome in nomes_ultimo_lote:
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=nome_completo,graduacao,dan,numero_membro&nome_completo=eq.{nome}"
    resp = requests.get(url, headers=headers)
    if resp.status_code == 200 and resp.json():
        encontrados_ultimo.append(resp.json()[0])

print(f"   Encontrados: {len(encontrados_ultimo)} de {len(nomes_ultimo_lote)}")
for r in encontrados_ultimo[:5]:
    print(f"   ✅ {r['nome_completo'][:40]} | Grad: {r.get('graduacao', 'NULL')} | Dan: {r.get('dan', 'NULL')}")
if len(encontrados_ultimo) > 5:
    print(f"   ... e mais {len(encontrados_ultimo) - 5}")

print()

# Query 6: Validação Final
print("=" * 80)
print("✅ VALIDAÇÃO FINAL")
print("=" * 80)

print(f"\n📊 Registros com 'NÃO ESPECIFICADA': {total_nao_especificada}")
print(f"📊 Registros com graduacao E dan NULL: {ambos_null if 'ambos_null' in locals() else 'N/A'}")

print("\n🎯 RESULTADO:")
if total_nao_especificada == 98 and ambos_null == 98:
    print("   ✅ CORRETO: CSV e Banco 100% sincronizados")
    print("   ✅ Expectativa: 98 registros | Encontrado: 98 registros")
else:
    print("   ⚠️  ATENÇÃO: Verificar divergências")
    print(f"   Esperado: 98 registros com NÃO ESPECIFICADA")
    print(f"   Encontrado: {total_nao_especificada} registros")
    if 'ambos_null' in locals():
        print(f"   Com NULL em ambos campos: {ambos_null}")

print()
print("=" * 80)
print("Verificação concluída!")
print("=" * 80)
