#!/usr/bin/env python3
"""
Análise Detalhada: Por que temos 1000 "NÃO ESPECIFICADA" em vez de 98?
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
print("ANÁLISE DETALHADA: GRADUAÇÕES MAPEADAS COMO 'NÃO ESPECIFICADA'")
print("=" * 80)
print()

# Buscar todos os 1000 registros com ordem=999
print("🔍 Buscando todos os registros com kyu_dan ordem=999...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,nome_completo,graduacao,dan,kyu_dan_id,kyu_dan(cor_faixa,ordem)&kyu_dan.ordem=eq.999&limit=1000"
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"❌ Erro: {resp.status_code}")
    exit(1)

registros = resp.json()
print(f"✅ {len(registros)} registros encontrados\n")

# Analisar padrões
print("📊 ANÁLISE DE PADRÕES:")
print("-" * 80)

# 1. Quantos têm graduacao preenchida?
com_graduacao = [r for r in registros if r.get('graduacao')]
sem_graduacao = [r for r in registros if not r.get('graduacao')]

print(f"1. Com campo 'graduacao' preenchido: {len(com_graduacao)}")
print(f"2. Sem campo 'graduacao' (NULL ou vazio): {len(sem_graduacao)}")
print()

# 2. Top 10 valores no campo graduacao
if com_graduacao:
    from collections import Counter
    graduacoes_count = Counter([r['graduacao'] for r in com_graduacao])
    print("Top 10 valores no campo 'graduacao':")
    for grad, count in graduacoes_count.most_common(10):
        print(f"   • {grad}: {count} registros")
    print()

# 3. Verificar se há padrão de mapeamento incorreto
print("🔎 AMOSTRAS DE REGISTROS COM GRADUACAO PREENCHIDA:")
print("-" * 80)
print(f"{'Nome':<35} | {'Graduacao':<20} | {'Dan':<10} | {'Mapeado':<15}")
print("-" * 80)

for r in com_graduacao[:15]:
    nome = r['nome_completo'][:34]
    grad = (r.get('graduacao') or 'NULL')[:19]
    dan = (r.get('dan') or 'NULL')[:9]
    mapeado = r['kyu_dan']['cor_faixa'][:14] if r.get('kyu_dan') else 'N/A'
    print(f"{nome:<35} | {grad:<20} | {dan:<10} | {mapeado:<15}")

print()

# 4. Verificar exemplos sem graduacao
print("🔎 AMOSTRAS DE REGISTROS SEM GRADUACAO (NULL/vazio):")
print("-" * 80)
print(f"{'Nome':<35} | {'Graduacao':<20} | {'Dan':<10} | {'Mapeado':<15}")
print("-" * 80)

for r in sem_graduacao[:15]:
    nome = r['nome_completo'][:34]
    grad = str(r.get('graduacao') or 'NULL')[:19]
    dan = str(r.get('dan') or 'NULL')[:9]
    mapeado = r['kyu_dan']['cor_faixa'][:14] if r.get('kyu_dan') else 'N/A'
    print(f"{nome:<35} | {grad:<20} | {dan:<10} | {mapeado:<15}")

print()
print("=" * 80)
print("💡 HIPÓTESES:")
print("=" * 80)
print("""
1. Se muitos registros têm 'graduacao' preenchida (ex: AMARELA, BRANCA),
   mas foram mapeados para 'NÃO ESPECIFICADA', isso indica que:
   
   ➜ A função resolve_graduacao_id() pode não estar funcionando corretamente
   ➜ OU os valores no campo 'graduacao' não batem com kyu_dan.cor_faixa
   ➜ OU houve algum problema no trigger/update em massa

2. Os 98 do CSV original provavelmente eram os que realmente NÃO tinham
   informação de graduação no momento da importação.

3. Os outros ~900 podem ter sido mapeados incorretamente para ordem=999
   quando deveriam ter ido para suas respectivas faixas.

PRÓXIMO PASSO: 
- Investigar a função resolve_graduacao_id()
- Verificar se há discrepância entre valores esperados e reais
- Criar script de remapeamento
""")

print("=" * 80)
print(f"📄 Total analisado: {len(registros)} registros")
print("=" * 80)
