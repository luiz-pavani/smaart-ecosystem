#!/usr/bin/env python3
import os
import sys
import requests

# Carregar .env.local
env_file = 'apps/titan/.env.local'
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                os.environ[key] = val.strip('"\'')

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

if not url or not key:
    print("ERRO: Variáveis de ambiente não encontradas")
    sys.exit(1)

print(f"Conectando a Supabase via REST API...")
headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Dados das academias
academias = [
    ('LRSJ', 'academias-logos/LRSJ.png'),
    ('Circuito Sul', 'academias-logos/SUL.png'),
    ('Equipe Abreu', 'academias-logos/ABR.png'),
    ('Academia de Judô Judokan', 'academias-logos/AJJ.png'),
    ('Bandeira Social', 'academias-logos/BSO.png'),
    ('Associação Combat de Artes Marciais', 'academias-logos/CBT.png'),
    ('CaJu', 'academias-logos/CJU.png'),
    ('Dojo Cáceres Moraes', 'academias-logos/DCM.png'),
    ('DW Artes Marciais', 'academias-logos/DWA.png'),
    ('Dojô Toriuke', 'academias-logos/DTU.png'),
    ('Atlética Falcons Judô', 'academias-logos/FAL.png'),
    ('Garra Team', 'academias-logos/GAR.png'),
    ('Intendencia Departamental de Rivera', 'academias-logos/IDR.png'),
    ('Judô Castelo Branco', 'academias-logos/JCB.png'),
    ('Judokan Uruguay', 'academias-logos/JDK.png'),
    ('Judô MadMax', 'academias-logos/JMM.png'),
    ('Kodokan Escola de Judô', 'academias-logos/KEJ.png'),
    ('Judô Kenkō', 'academias-logos/KEN.png'),
    ('Koyama Judô', 'academias-logos/KOY.png'),
    ('Nihon Judô', 'academias-logos/NHN.png'),
    ('OSL Judô', 'academias-logos/OSL.png'),
    ('OSS Escola de Artes Marciais', 'academias-logos/OSS.png'),
    ('Plaza de Deportes Rivera', 'academias-logos/PDR.png'),
    ('Projeto Judocas do Futuro', 'academias-logos/PJF.png'),
    ('Judô Progresso', 'academias-logos/PRG.png'),
    ('Equipe de Judô Sensei Adilson Leite', 'academias-logos/SAL.png'),
    ('Samurai Dojô', 'academias-logos/SAM.png'),
    ('Santa Maria Judô', 'academias-logos/SMJ.png'),
    ('Academia Sol Nascente de Judô', 'academias-logos/SOL.png'),
    ('Sapucaia do Sul Judô', 'academias-logos/SSJ.png'),
    ('Tanemaki Judô', 'academias-logos/TAN.png'),
    ('Thork Jiu-Jitsu', 'academias-logos/THO.png'),
    ('Tora Judô Ltda', 'academias-logos/TOR.png'),
]

print(f"Limpando tabela academy_logos...")
# Deletar todos os registros via HTTP
delete_url = f"{url}/rest/v1/academy_logos"
params = {'id': 'gt.0'}  # Deletar onde id > 0 (todos)
resp = requests.delete(delete_url, headers=headers, params=params)
print(f"   Status: {resp.status_code}")

print(f"Inserindo {len(academias)} academias...")
# Inserir em batch via HTTP
rows = []
for nome, logo_url in academias:
    rows.append({
        'academia_nome': nome,
        'logo_url': logo_url,
        'logo_width': 200,
        'logo_height': 200
    })

insert_url = f"{url}/rest/v1/academy_logos"
resp = requests.post(insert_url, headers=headers, json=rows)

if resp.status_code in [200, 201]:
    data = resp.json()
    print(f"✅ Sucesso! {len(data)} academias cadastradas")
else:
    print(f"❌ Erro {resp.status_code}: {resp.text}")
    sys.exit(1)

# Verificar contagem
count_headers = {
    **headers,
    'Prefer': 'count=exact'
}
resp = requests.get(insert_url, headers=count_headers, params={'select': 'id'})
if 'content-range' in resp.headers:
    total = resp.headers['content-range'].split('/')[-1]
    print(f"📊 Total no banco: {total} academias")
else:
    print(f"📊 Verificação: {len(resp.json())} academias encontradas")

print("\n✅ Atualização concluída com sucesso!")
