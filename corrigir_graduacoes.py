#!/usr/bin/env python3
"""
Correção Automática: Remapear 917 graduações incorretas
"""

import requests
from collections import defaultdict

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
print("CORREÇÃO: REMAPEAMENTO DE GRADUAÇÕES")
print("=" * 80)
print()

# PASSO 1: Buscar todos os kyu_dan disponíveis
print("📚 [1/5] Carregando tabela kyu_dan...")
url = f"{SUPABASE_URL}/rest/v1/kyu_dan?select=id,cor_faixa,kyu_dan,ordem"
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"❌ Erro ao buscar kyu_dan: {resp.status_code}")
    exit(1)

kyu_dan_list = resp.json()
print(f"✅ {len(kyu_dan_list)} graduações carregadas")

# Criar mapeamento: "COR | KYU" → id
graduacao_map = {}
for item in kyu_dan_list:
    if item['cor_faixa'] and item['kyu_dan']:
        chave = f"{item['cor_faixa']} | {item['kyu_dan']}"
        graduacao_map[chave] = item['id']
    # Também mapear só pela cor para faixas que não têm kyu
    if item['cor_faixa'] and not item['kyu_dan']:
        graduacao_map[item['cor_faixa']] = item['id']

print(f"✅ {len(graduacao_map)} padrões de graduação mapeados")
print()

# PASSO 2: Buscar atletas com ordem=999 e graduacao preenchida
print("🔍 [2/5] Buscando atletas com graduação incorreta...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,nome_completo,graduacao,kyu_dan_id,kyu_dan(ordem)&kyu_dan.ordem=eq.999&limit=1000"
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"❌ Erro: {resp.status_code}")
    exit(1)

atletas = resp.json()
atletas_com_grad = [a for a in atletas if a.get('graduacao')]

print(f"✅ {len(atletas_com_grad)} atletas precisam de remapeamento")
print()

# PASSO 3: Analisar e mapear
print("🗺️  [3/5] Analisando mapeamentos possíveis...")
mapeamentos = defaultdict(list)
nao_mapeados = []

for atleta in atletas_com_grad:
    grad = atleta['graduacao']
    
    # Tentar encontrar correspondência exata
    if grad in graduacao_map:
        novo_id = graduacao_map[grad]
        mapeamentos[novo_id].append(atleta)
    else:
        nao_mapeados.append(atleta)

print(f"✅ {len(atletas_com_grad) - len(nao_mapeados)} podem ser mapeados automaticamente")
print(f"⚠️  {len(nao_mapeados)} não encontraram correspondência exata")
print()

if nao_mapeados:
    print("Exemplos de graduações sem correspondência:")
    for ex in nao_mapeados[:5]:
        print(f"   • '{ex['graduacao']}' ({ex['nome_completo'][:40]})")
    print()

# PASSO 4: Executar remapeamento
print("🔧 [4/5] Executando remapeamento...")
print()

total_sucesso = 0
total_erro = 0

for novo_kyu_dan_id, grupo_atletas in mapeamentos.items():
    print(f"Mapeando {len(grupo_atletas)} atletas para kyu_dan_id: {novo_kyu_dan_id}...")
    
    for atleta in grupo_atletas:
        url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?id=eq.{atleta['id']}"
        payload = {"kyu_dan_id": novo_kyu_dan_id}
        
        resp = requests.patch(url, json=payload, headers=headers)
        
        if resp.status_code in [200, 204]:
            total_sucesso += 1
        else:
            total_erro += 1
            if total_erro <= 3:  # Mostrar só os primeiros 3 erros
                print(f"   ❌ Erro ao atualizar atleta {atleta['id']}: {resp.status_code}")
    
    print(f"   ✅ Grupo processado")

print()
print(f"✅ Sucesso: {total_sucesso} registros atualizados")
if total_erro > 0:
    print(f"❌ Erros: {total_erro} registros falharam")
print()

# PASSO 5: Validação final
print("🔍 [5/5] Validando correção...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,kyu_dan(ordem)&kyu_dan.ordem=eq.999"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    restantes = len(resp.json())
    print(f"✅ Atletas ainda com 'NÃO ESPECIFICADA': {restantes}")
    print(f"   Meta: ~83 (os que realmente não têm graduação)")
    
    if restantes <= 100:
        print(f"   ✅ CORREÇÃO BEM-SUCEDIDA!")
    else:
        print(f"   ⚠️  Ainda há {restantes - 83} a mais do que o esperado")

print()
print("=" * 80)
print("RESUMO DA CORREÇÃO")
print("=" * 80)
print(f"Registros processados: {total_sucesso + total_erro}")
print(f"Atualizados com sucesso: {total_sucesso}")
print(f"Erros: {total_erro}")
print(f"Não puderam ser mapeados: {len(nao_mapeados)}")
print(f"Restantes com 'NÃO ESPECIFICADA': {restantes if resp.status_code == 200 else 'N/A'}")
print("=" * 80)
