#!/usr/bin/env python3
"""
Remover academias duplicadas criadas na última execução
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

# IDs das duplicatas (as que NÃO estão sendo usadas pelos atletas)
duplicatas = [
    "487bd753-4c9f-4f1c-9ad7-937d886f733d",  # DCM duplicata
    "8a2bd3c3-38d9-4fb6-b111-e20e652dd9eb"   # GAR duplicata
]

print("🧹 Removendo academias duplicadas...\n")

for academia_id in duplicatas:
    url = f"{SUPABASE_URL}/rest/v1/academias?id=eq.{academia_id}"
    resp = requests.delete(url, headers=headers)
    
    if resp.status_code in [200, 204]:
        print(f"✅ Academia {academia_id[:8]}... removida")
    else:
        print(f"❌ Erro ao remover {academia_id[:8]}...: {resp.status_code}")

print("\n✅ Limpeza concluída!")
