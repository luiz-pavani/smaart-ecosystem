#!/usr/bin/env python3
"""
Correção com Mapeamento Manual de Formatos
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
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Mapeamento manual: valor em atletas.graduacao → ID em kyu_dan
MAPEAMENTO_GRADUACOES = {
    "BRANCA | MŪKYŪ": 1,
    "BRANCA/CINZA | MŪKYŪ": 2,
    "CINZA | NANAKYŪ": 3,
    "CINZA/AZUL": 4,
    "AZUL | ROKKYŪ": 5,
    "AZUL/AMARELA": 6,
    "AMARELA | GOKYŪ": 7,
    "AMARELA/LARANJA": 8,
    "LARANJA | YONKYŪ": 9,
    "VERDE | SANKYŪ": 10,
    "ROXA | NIKYŪ": 11,
    "MARROM | IKKYŪ": 12,
    "FAIXA PRETA": 13,  # 1º dan por padrão
    # Variações
    "BRANCA": 1,
    "CINZA": 3,
    "AZUL": 5,
    "AMARELA": 7,
    "LARANJA": 9,
    "VERDE": 10,
    "ROXA": 11,
    "MARROM": 12,
}

# Mapeamento específico para dan (baseado no campo dan)
DAN_MAPPING = {
    "SHODAN": 13,
    "NIDAN": 14,
    "SANDAN": 15,
    "YONDAN": 16,
    "GODAN": 17,
    "ROKUDAN": 18,
    "SHICHIDAN": 19,
    "HACHIDAN": 20,
    "KUDAN": 21,
    "JUDAN": 22,
}

print("=" * 80)
print("CORREÇÃO: REMAPEAMENTO COM MAPEAMENTO MANUAL")
print("=" * 80)
print()

# Buscar atletas com ordem=999 e graduacao preenchida
print("🔍 [1/4] Buscando atletas para remapear...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,nome_completo,graduacao,dan,kyu_dan_id&limit=2000"
resp = requests.get(url, headers=headers)

if resp.status_code != 200:
    print(f"❌ Erro: {resp.status_code}")
    exit(1)

# Filtrar apenas os que têm kyu_dan_id = 24 (NÃO ESPECIFICADA)
atletas = [a for a in resp.json() if a.get('kyu_dan_id') == 24]
atletas_com_grad = [a for a in atletas if a.get('graduacao')]

print(f"✅ {len(atletas_com_grad)} atletas com graduação para remapear")
print()

# Analisar mapeamentos
print("🗺️  [2/4] Analisando mapeamentos...")
mapeados = []
nao_mapeados = []

for atleta in atletas_com_grad:
    grad = atleta['graduacao']
    dan = atleta.get('dan')
    novo_id = None
    
    # Tentar mapear por dan primeiro (se for faixa preta)
    if dan and dan in DAN_MAPPING:
        novo_id = DAN_MAPPING[dan]
    # Senão, tentar por graduação
    elif grad in MAPEAMENTO_GRADUACOES:
        novo_id = MAPEAMENTO_GRADUACOES[grad]
    
    if novo_id:
        atleta['novo_kyu_dan_id'] = novo_id
        mapeados.append(atleta)
    else:
        nao_mapeados.append(atleta)

print(f"✅ {len(mapeados)} podem ser mapeados")
print(f"⚠️  {len(nao_mapeados)} não encontraram correspondência")
print()

if nao_mapeados:
    print("Graduações sem correspondência:")
    from collections import Counter
    grad_counts = Counter([a['graduacao'] for a in nao_mapeados])
    for grad, count in grad_counts.most_common(10):
        print(f"   • '{grad}': {count} atletas")
    print()

# Executar remapeamento
print("🔧 [3/4] Executando remapeamento...")
print()

total_sucesso = 0
total_erro = 0
erros_detalhes = []

for i, atleta in enumerate(mapeados):
    if (i + 1) % 100 == 0:
        print(f"   Processando... {i + 1}/{len(mapeados)}")
    
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?id=eq.{atleta['id']}"
    payload = {"kyu_dan_id": atleta['novo_kyu_dan_id']}
    
    resp = requests.patch(url, json=payload, headers=headers)
    
    if resp.status_code in [200, 204]:
        total_sucesso += 1
    else:
        total_erro += 1
        if len(erros_detalhes) < 5:
            erros_detalhes.append(f"Atleta {atleta['id']} ({atleta['nome_completo'][:30]}): {resp.status_code}")

print()
print(f"✅ Sucesso: {total_sucesso} registros atualizados")
if total_erro > 0:
    print(f"❌ Erros: {total_erro}")
    for erro in erros_detalhes:
        print(f"   {erro}")
print()

# Validação final
print("🔍 [4/4] Validando correção...")
url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id&kyu_dan_id=eq.24"
resp = requests.get(url, headers=headers)

if resp.status_code == 200:
    restantes = len(resp.json())
    print(f"✅ Atletas ainda com 'NÃO ESPECIFICADA' (kyu_dan_id=24): {restantes}")
    print(f"   Meta: ~83 (os que realmente não têm graduação)")
    
    if restantes <= 100:
        print(f"   🎉 CORREÇÃO BEM-SUCEDIDA!")
    else:
        print(f"   ⚠️  Ainda há mais do que o esperado")

print()
print("=" * 80)
print("RESUMO FINAL")
print("=" * 80)
print(f"Total de atletas processados: {len(mapeados)}")
print(f"Atualizados com sucesso: {total_sucesso}")
print(f"Erros na atualização: {total_erro}")
print(f"Não puderam ser mapeados: {len(nao_mapeados)}")
print(f"Restantes com NÃO ESPECIFICADA: {restantes if resp.status_code == 200 else 'N/A'}")
print("=" * 80)
