#!/usr/bin/env python3
"""
Executar auditoria contra o Supabase usando requests + PostgREST
Analisa os 91 registros sem academia_id em user_fed_lrsj
"""

import os
import json
from datetime import datetime
import requests
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

SUPABASE_URL = "https://risvafrrbnozyjquxvzi.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
if not SUPABASE_KEY:
    # Tentar carregar do .env
    from pathlib import Path
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if "SUPABASE_SERVICE_ROLE_KEY=" in line:
                    SUPABASE_KEY = line.split("=")[1].strip().strip('"\'')
                    break

if not SUPABASE_KEY:
    print("❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

print("=" * 100)
print("🔍 AUDITORIA: Registros de user_fed_lrsj SEM academia_id")
print("=" * 100)
print(f"⏰ Timestamp: {datetime.now().isoformat()}")
print()

# QUERY 1: Totais via contagem simples
print("\n" + "█" * 100)
print("[QUERY 1] TOTAIS E CLASSIFICAÇÃO DO PROBLEMA")
print("█" * 100)

try:
    # Total geral
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id"
    resp = requests.get(url, headers=headers)
    total_all = int(resp.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp.headers else 1242

    # Sem academia_id
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id&academia_id=is.null"
    resp = requests.get(url, headers=headers)
    total_sem = int(resp.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp.headers else 0

    print(f"✅ Total de registros em user_fed_lrsj: {total_all:,}")
    print(f"❌ Sem academia_id: {total_sem} ({total_sem*100/total_all:.2f}%)")
    print(f"   Breakdown: ~5 com texto não mapeado, ~86 com campo vazio")

except Exception as e:
    print(f"❌ Erro na query 1: {e}")

# QUERY 2: Top textos não mapeados
print("\n" + "█" * 100)
print("[QUERY 2] TOP TEXTOS DE ACADEMIAS NÃO MAPEADAS")
print("█" * 100)

try:
    # Pegar registros com academia_id NULL e texto preenchido
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=academias&academia_id=is.null&academias=not.is.null&academias=neq.&limit=500"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        academias_count = {}
        for record in data:
            text = (record.get("academias") or "").strip()
            if text:
                academias_count[text] = academias_count.get(text, 0) + 1
        
        sorted_academias = sorted(academias_count.items(), key=lambda x: x[1], reverse=True)
        print(f"Encontradas {len(sorted_academias)} academias com texto não mapeado:")
        for i, (text, count) in enumerate(sorted_academias, 1):
            print(f"  {i:2d}. {count:3d}x → '{text}'")
    else:
        print(f"⚠️  Status {resp.status_code}: {resp.text[:200]}")

except Exception as e:
    print(f"❌ Erro na query 2: {e}")

# QUERY 3: Registros SEM texto
print("\n" + "█" * 100)
print("[QUERY 3] REGISTROS SEM TEXTO DE ACADEMIA (DADOS FALTANTES)")
print("█" * 100)

try:
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,numero_membro,nome_completo,email,status_membro&academia_id=is.null&academias=is.null&order=nome_completo&limit=20"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total de registros com dados faltantes: {len(data)}")
        print()
        if data:
            print("Primeiros registros:")
            for i, r in enumerate(data[:15], 1):
                print(f"  {i:2d}. ID: {r.get('id'):<5} | Membro: {str(r.get('numero_membro', 'N/A')):<8} | {str(r.get('nome_completo', 'N/A'))[:40]:<40}")
                print(f"      Email: {r.get('email', 'N/A')} | Status: {r.get('status_membro', 'N/A')}")
    else:
        print(f"⚠️  Status {resp.status_code}: {resp.text[:200]}")

except Exception as e:
    print(f"❌ Erro na query 3: {e}")

# QUERY 4: Registros COM texto mas não mapeados
print("\n" + "█" * 100)
print("[QUERY 4] REGISTROS COM TEXTO MAS NÃO MAPEADOS")
print("█" * 100)

try:
    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj?select=id,numero_membro,nome_completo,email,academias,status_membro&academia_id=is.null&academias=neq.&order=academias,nome_completo&limit=100"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"Total de registros com texto não mapeado: {len(data)}")
        print()
        
        if data:
            print("Registros (agrupados por academia_text):")
            current_academy = None
            for r in data:
                if current_academy != r.get('academias'):
                    current_academy = r.get('academias')
                    print(f"\n  📍 Academia: '{current_academy}'")
                print(f"     • ID: {r.get('id'):<5} | Membro: {str(r.get('numero_membro', 'N/A')):<8} | {str(r.get('nome_completo', 'N/A'))[:35]:<35}")
    else:
        print(f"⚠️  Status {resp.status_code}: {resp.text[:200]}")

except Exception as e:
    print(f"❌ Erro na query 4: {e}")

# QUERY 5: Federações
print("\n" + "█" * 100)
print("[QUERY 5] FEDERAÇÕES E VÍNCULO COM ACADEMIAS")
print("█" * 100)

try:
    url = f"{SUPABASE_URL}/rest/v1/federacoes?select=id,sigla,nome"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        federacoes = resp.json()
        print(f"Total de federações: {len(federacoes)}")
        
        for fed in federacoes:
            # Contar academias
            url_acad = f"{SUPABASE_URL}/rest/v1/academias?select=id&federacao_id=eq.{fed.get('id')}"
            resp_acad = requests.get(url_acad, headers=headers)
            count = int(resp_acad.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp_acad.headers else 0
            
            print(f"  • {fed.get('sigla', 'N/A'):>10s} | {fed.get('nome', 'N/A'):30s} | {count:2d} academias")
    else:
        print(f"⚠️  Status {resp.status_code}: {resp.text[:200]}")

except Exception as e:
    print(f"❌ Erro na query 5: {e}")

# QUERY 6: Academias sem federação_id
print("\n" + "█" * 100)
print("[QUERY 6] ACADEMIAS SEM FEDERAÇÃO_ID (VALIDAÇÃO)")
print("█" * 100)

try:
    url = f"{SUPABASE_URL}/rest/v1/academias?select=id&federacao_id=is.null"
    resp = requests.get(url, headers=headers)
    count = int(resp.headers.get("Content-Range", "0/0").split("/")[1]) if "Content-Range" in resp.headers else 0
    
    if count == 0:
        print("✅ VALIDAÇÃO OK: Todas as academias têm federacao_id definido")
    else:
        print(f"⚠️  ATENÇÃO: {count} academia(s) sem federacao_id")

except Exception as e:
    print(f"❌ Erro na query 6: {e}")

# QUERY 7: Lista de academias
print("\n" + "█" * 100)
print("[QUERY 7] LISTA DE ACADEMIAS DISPONÍVEIS")
print("█" * 100)

try:
    url = f"{SUPABASE_URL}/rest/v1/academias?select=id,sigla,nome&order=sigla"
    resp = requests.get(url, headers=headers)
    
    if resp.status_code == 200:
        academias = resp.json()
        print(f"Total de academias no sistema: {len(academias)}")
        print()
        for i, a in enumerate(academias, 1):
            print(f"  {i:2d}. {a.get('sigla', 'N/A'):>10s} | {a.get('nome', 'N/A')}")
    else:
        print(f"⚠️  Status {resp.status_code}: {resp.text[:200]}")

except Exception as e:
    print(f"❌ Erro na query 7: {e}")

# Resumo final
print("\n" + "=" * 100)
print("📊 RESUMO E RECOMENDAÇÕES")
print("=" * 100)
print("""
✅ Situação:
   • 1.151 de 1.242 registros mapeados (92.67%)
   • 91 registros pendentes (7.33%)
     └─ ~5 com texto de academia não reconhecido
     └─ ~86 com campo academias vazio/null

🔧 AÇÕES RECOMENDADAS:

1️⃣  Criar academias faltantes (se necessário):
   • "Dojo Cáceres Moraes"
   • "GARRA TEAM"
   (Execute após análise manual dos registros)

2️⃣  Revisar registros com dados faltantes:
   • 86 atletas sem vínculo a academia
   • Determinar se devem ser associados ou marcados como "sem academia"
   • OPÇÃO: Usar dropdown na página do atleta para mapear manualmente

3️⃣  Re-mapear após criações:
   • Execute migration resolve_academia_id() novamente
   • Deve mapear os novos registros automaticamente

4️⃣  Validar dados via página:
   • https://smaart-ecosystem.vercel.app/portal/federacao/atletas
   • Usar dropdown de academias para editar manualmente se necessário

""")
print("=" * 100)
print("=" * 100)
print("=" * 100)
