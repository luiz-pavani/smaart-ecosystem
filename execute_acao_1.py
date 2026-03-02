#!/usr/bin/env python3
"""
Executar AÇÃO 1: Criar academias faltantes e mapear 5 atletas
"""

import os
import requests
from datetime import datetime

SUPABASE_URL = "https://risvafrrbnozyjquxvzi.supabase.co"
LRSJ_FED_ID = "6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d"

# Carregar service role key do .env
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
print("🚀 AÇÃO 1: Criar Academias Faltantes")
print("=" * 80)
print(f"⏰ {datetime.now().isoformat()}")
print()

# PASSO 1: Criar academia "Dojo Cáceres Moraes"
print("\n[1/4] Criando academia 'Dojo Cáceres Moraes' (DCM)...")
try:
    url = f"{SUPABASE_URL}/rest/v1/academias"
    data = {
        "sigla": "DCM",
        "nome": "Dojo Cáceres Moraes",
        "federacao_id": LRSJ_FED_ID,
        "ativo": True,
        "endereco_cidade": "Porto Alegre",
        "endereco_estado": "RS",
        "endereco_pais": "Brasil",
        "responsavel_nome": "A definir",
        "responsavel_cpf": "00000000000",
        "responsavel_email": "contato@dojocaceresmoraes.com.br",
        "data_filiacao": "2026-03-02",
        "quantidade_alunos": 4,
        "anualidade_status": "pendente",
        "plan_status": "pendente",
        "plan_expire_date": "2026-12-31",
        "order_date": "2026-03-02",
        "payment_method": "pendente",
        "payment_reference": "auditoria-2026-03-02",
        "pais": "Brasil"
    }
    
    resp = requests.post(url, headers=headers, json=data)
    
    if resp.status_code in [200, 201]:
        academia_dcm = resp.json()[0] if isinstance(resp.json(), list) else resp.json()
        dcm_id = academia_dcm.get('id')
        print(f"✅ Academia DCM criada com ID: {dcm_id}")
    elif resp.status_code == 409:
        # Já existe, pegar ID
        get_url = f"{SUPABASE_URL}/rest/v1/academias?select=id&sigla=eq.DCM"
        get_resp = requests.get(get_url, headers=headers)
        if get_resp.status_code == 200 and get_resp.json():
            dcm_id = get_resp.json()[0]['id']
            print(f"⚠️  Academia DCM já existe (ID: {dcm_id})")
        else:
            print(f"❌ Erro ao buscar DCM existente")
            dcm_id = None
    else:
        print(f"❌ Erro {resp.status_code}: {resp.text[:200]}")
        dcm_id = None
        
except Exception as e:
    print(f"❌ Erro ao criar DCM: {e}")
    dcm_id = None

# PASSO 2: Criar academia "Garra Team"
print("\n[2/4] Criando academia 'Garra Team' (GAR)...")
try:
    url = f"{SUPABASE_URL}/rest/v1/academias"
    data = {
        "sigla": "GAR",
        "nome": "Garra Team",
        "federacao_id": LRSJ_FED_ID,
        "ativo": True,
        "endereco_cidade": "Porto Alegre",
        "endereco_estado": "RS",
        "endereco_pais": "Brasil",
        "responsavel_nome": "A definir",
        "responsavel_cpf": "00000000000",
        "responsavel_email": "contato@garrateam.com.br",
        "data_filiacao": "2026-03-02",
        "quantidade_alunos": 1,
        "anualidade_status": "pendente",
        "plan_status": "pendente",
        "plan_expire_date": "2026-12-31",
        "order_date": "2026-03-02",
        "payment_method": "pendente",
        "payment_reference": "auditoria-2026-03-02",
        "pais": "Brasil"
    }
    
    resp = requests.post(url, headers=headers, json=data)
    
    if resp.status_code in [200, 201]:
        academia_gar = resp.json()[0] if isinstance(resp.json(), list) else resp.json()
        gar_id = academia_gar.get('id')
        print(f"✅ Academia GAR criada com ID: {gar_id}")
    elif resp.status_code == 409:
        # Já existe
        get_url = f"{SUPABASE_URL}/rest/v1/academias?select=id&sigla=eq.GAR"
        get_resp = requests.get(get_url, headers=headers)
        if get_resp.status_code == 200 and get_resp.json():
            gar_id = get_resp.json()[0]['id']
            print(f"⚠️  Academia GAR já existe (ID: {gar_id})")
        else:
            print(f"❌ Erro ao buscar GAR existente")
            gar_id = None
    else:
        print(f"❌ Erro {resp.status_code}: {resp.text[:200]}")
        gar_id = None
        
except Exception as e:
    print(f"❌ Erro ao criar GAR: {e}")
    gar_id = None

# PASSO 3: Mapear atletas para DCM
if dcm_id:
    print("\n[3/4] Mapeando atletas para DCM...")
    try:
        # Buscar atletas com texto "Dojo Cáceres Moraes"
        url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,nome_completo,academias&academias=ilike.*Dojo Cáceres Moraes*&academia_id=is.null"
        resp = requests.get(url, headers=headers)
        
        if resp.status_code == 200:
            atletas = resp.json()
            print(f"   Encontrados {len(atletas)} atletas para mapear:")
            
            for atleta in atletas:
                # Update academia_id
                update_url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?id=eq.{atleta['id']}"
                update_data = {"academia_id": dcm_id}
                update_resp = requests.patch(update_url, headers=headers, json=update_data)
                
                if update_resp.status_code in [200, 204]:
                    print(f"   ✅ {atleta['nome_completo']} → DCM")
                else:
                    print(f"   ❌ Erro ao mapear {atleta['nome_completo']}: {update_resp.status_code} - {update_resp.text[:100]}")
        else:
            print(f"   ⚠️  Nenhum atleta encontrado ou erro: {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Erro ao mapear DCM: {e}")
else:
    print("\n[3/4] ⏭️  Pulando mapeamento DCM (academia não criada)")

# PASSO 4: Mapear atletas para GAR
if gar_id:
    print("\n[4/4] Mapeando atletas para GAR...")
    try:
        # Buscar atletas com texto "GARRA TEAM"
        url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,nome_completo,academias&academias=ilike.*GARRA TEAM*&academia_id=is.null"
        resp = requests.get(url, headers=headers)
        
        if resp.status_code == 200:
            atletas = resp.json()
            print(f"   Encontrados {len(atletas)} atletas para mapear:")
            
            for atleta in atletas:
                # Update academia_id
                update_url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?id=eq.{atleta['id']}"
                update_data = {"academia_id": gar_id}
                update_resp = requests.patch(update_url, headers=headers, json=update_data)
                
                if update_resp.status_code in [200, 204]:
                    print(f"   ✅ {atleta['nome_completo']} → GAR")
                else:
                    print(f"   ❌ Erro ao mapear {atleta['nome_completo']}: {update_resp.status_code} - {update_resp.text[:100]}")
        else:
            print(f"   ⚠️  Nenhum atleta encontrado ou erro: {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Erro ao mapear GAR: {e}")
else:
    print("\n[4/4] ⏭️  Pulando mapeamento GAR (academia não criada)")

# VERIFICAÇÃO FINAL
print("\n" + "=" * 80)
print("📊 VERIFICAÇÃO FINAL")
print("=" * 80)

try:
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id&academia_id=is.null"
    resp = requests.get(url, headers=headers)
    
    if "Content-Range" in resp.headers:
        total_sem = int(resp.headers["Content-Range"].split("/")[1])
    else:
        total_sem = len(resp.json()) if resp.status_code == 200 else 91
    
    total_com = 1242 - total_sem
    perc = (total_com / 1242) * 100
    
    print(f"✅ Total COM academia_id: {total_com} ({perc:.2f}%)")
    print(f"⏳ Total SEM academia_id: {total_sem} ({100-perc:.2f}%)")
    
    if total_sem <= 86:
        print(f"\n🎉 SUCESSO! Reduzimos de 91 para {total_sem} registros pendentes!")
        print(f"   → {91 - total_sem} atletas mapeados para as novas academias")
    else:
        print(f"\n⚠️  Ainda temos {total_sem} registros sem academia_id")
        
except Exception as e:
    print(f"❌ Erro na verificação: {e}")

print("\n" + "=" * 80)
print("✅ AÇÃO 1 CONCLUÍDA")
print("=" * 80)
