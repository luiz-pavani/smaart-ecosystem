import os
import json
import ssl
import urllib.request
import pandas as pd

csv_path = "/Users/judo365/Documents/MASTER ESPORTES/POS ESPORTES/CONTATO/Contatos_Bons_Judo.csv"

try:
    df = pd.read_csv(csv_path, sep=';', dtype=str)
except Exception:
    df = pd.read_csv(csv_path, sep=',', dtype=str)

if "Email" not in df.columns:
    raise SystemExit("Coluna 'Email' não encontrada no CSV.")

if "Nome" not in df.columns:
    df["Nome"] = ""

emails = df["Email"].astype(str).str.strip().str.lower()
nomes = df["Nome"].astype(str).fillna("")

rows = []
for email, nome in zip(emails, nomes):
    if email and "@" in email:
        rows.append({
            "email": email,
            "full_name": nome.strip(),
            "source": "judo_contacts"
        })

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    raise SystemExit("Credenciais Supabase ausentes no ambiente.")

endpoint = f"{url}/rest/v1/launch_campaign_leads?on_conflict=email"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

ctx = ssl._create_unverified_context()

batch_size = 500
sent = 0
for i in range(0, len(rows), batch_size):
    batch = rows[i:i + batch_size]
    data = json.dumps(batch).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, context=ctx) as resp:
        if resp.status not in (200, 201, 204):
            raise SystemExit(f"HTTP {resp.status}")
    sent += len(batch)

print(f"Importado: {sent} registros (c/ upsert).")
