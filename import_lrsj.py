#!/usr/bin/env python3
"""
IMPORT LRSJ — Script de importação Smoothcomp → user_fed_lrsj
Uso:
    python3 import_lrsj.py <caminho_csv> [--dry-run]
    python3 import_lrsj.py /Users/judo365/Downloads/smoothcomp.csv
    python3 import_lrsj.py /Users/judo365/Downloads/smoothcomp.csv --dry-run
"""

import sys
import csv
import os
import json
import requests
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

SUPABASE_URL = "https://risvafrrbnozyjquxvzi.supabase.co"
LRSJ_FED_ID_UUID = "6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d"  # UUID para filtrar academias
LRSJ_FED_ID_INT = 1  # ID inteiro em user_fed_lrsj

# Carregar service role key do .env
SERVICE_ROLE_KEY = None
env_paths = [".env", os.path.join(os.path.dirname(__file__), ".env")]
for ep in env_paths:
    if os.path.exists(ep):
        with open(ep) as f:
            for line in f:
                if "SUPABASE_SERVICE_ROLE_KEY=" in line:
                    SERVICE_ROLE_KEY = line.split("=", 1)[1].strip().strip('"\'')
                    break
    if SERVICE_ROLE_KEY:
        break

if not SERVICE_ROLE_KEY:
    print("ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ---------------------------------------------------------------------------
# Lookup tables (mesma lógica do smoothcomp.ts)
# ---------------------------------------------------------------------------

GRADUACAO_MAP = {
    "BRANCA | MU-KYU": 1,
    "BRANCA/CINZA | MU-KYU": 2,
    "CINZA | NANA-KYU": 3,
    "CINZA/AZUL | NANA-KYU": 4,
    "AZUL | ROKU-KYU": 5,
    "AZUL | ROKKYŪ": 5,   # variante contraída Smoothcomp
    "AZUL/AMARELA | ROKU-KYU": 6,
    "AZUL/AMARELA | ROKKYŪ": 6,  # variante contraída Smoothcomp
    "AMARELA | GO-KYU": 7,
    "AMARELA/LARANJA | GO-KYU": 8,
    "LARANJA | YON-KYU": 9,
    "VERDE | SAN-KYU": 10,
    "ROXA | NI-KYU": 11,
    "MARROM | IK-KYU": 12,
}

# Overrides manuais para casos onde o Smoothcomp tem dado incorreto/incompleto
# Chave: nome_completo (exato, case-insensitive) → kyu_dan_id
KYU_DAN_OVERRIDES = {
    "sarah da silva caieron": 13,   # FAIXA PRETA | SHODAN
    "bruno chalar": 17,              # FAIXA PRETA | GODAN
    "sandra mendes dos santos": 13,  # FAIXA PRETA | SHODAN
}

DAN_MAP = {
    "SHO-DAN": 13, "SHODAN": 13, "1º DAN": 13, "1° DAN": 13, "1 DAN": 13,
    "NI-DAN": 14, "NIDAN": 14, "2º DAN": 14, "2° DAN": 14, "2 DAN": 14,
    "SAN-DAN": 15, "SANDAN": 15, "3º DAN": 15, "3° DAN": 15, "3 DAN": 15,
    "YON-DAN": 16, "YONDAN": 16, "4º DAN": 16, "4° DAN": 16, "4 DAN": 16,
    "GO-DAN": 17, "GODAN": 17, "5º DAN": 17, "5° DAN": 17, "5 DAN": 17,
    "ROKUDAN": 18, "ROKU-DAN": 18, "6º DAN": 18, "6° DAN": 18, "6 DAN": 18,
    "NANADAN": 19, "NANA-DAN": 19, "7º DAN": 19, "7° DAN": 19, "7 DAN": 19,
    "HACHI-DAN": 20, "HACHIDAN": 20, "8º DAN": 20, "8° DAN": 20, "8 DAN": 20,
    "KU-DAN": 21, "KUDAN": 21, "9º DAN": 21, "9° DAN": 21, "9 DAN": 21,
    "JU-DAN": 22, "JUDAN": 22, "10º DAN": 22, "10° DAN": 22, "10 DAN": 22,
}

# ---------------------------------------------------------------------------
# Funções de normalização
# ---------------------------------------------------------------------------

def normalize_gender(gender):
    g = gender.strip().lower()
    if g in ("male", "masculino"):
        return "Masculino"
    if g in ("female", "feminino"):
        return "Feminino"
    return None

def normalize_status(member_status, plan_status):
    ms_map = {"approved": "Aceito", "aceito": "Aceito", "active": "Aceito"}
    ps_map = {"active": "Válido", "válido": "Válido", "expired": "Vencido", "vencido": "Vencido"}
    return (
        ms_map.get(member_status.strip().lower()),
        ps_map.get(plan_status.strip().lower()),
    )

def normalize_lote(lote):
    v = lote.strip()
    if not v:
        return None
    if v.startswith("2026"):
        return v
    return None

def build_normalized_map(original_map):
    """Cria versão normalizada (sem macrons, sem hífens, upper) de um mapa de lookup."""
    normalized = {}
    for key, val in original_map.items():
        norm_key = normalize_text(key).upper().replace("-", "").replace(" ", "")
        normalized[norm_key] = val
    return normalized

# Mapas normalizados (construídos no carregamento)
_GRAD_NORM = None
_DAN_NORM = None

def _get_norm_maps():
    global _GRAD_NORM, _DAN_NORM
    if _GRAD_NORM is None:
        _GRAD_NORM = build_normalized_map(GRADUACAO_MAP)
        _DAN_NORM = build_normalized_map(DAN_MAP)
    return _GRAD_NORM, _DAN_NORM

def normalize_for_lookup(text):
    """Normaliza um texto para comparação: sem macrons, sem hífens, upper."""
    return normalize_text(text).upper().replace("-", "").replace(" ", "")

def resolve_kyu_dan_id(graduacao, qual_seu_dan):
    g = graduacao.strip().upper()
    d = qual_seu_dan.strip().upper()
    if not g:
        return None

    grad_norm, dan_norm = _get_norm_maps()

    if "FAIXA PRETA" in g:
        # Caso especial: "FAIXA PRETA 1º GRAU" sem dan especificado → SHO-DAN
        import re
        grau_match = re.search(r'(\d+)[°º]\s*GRAU', g)
        if grau_match:
            grau_num = int(grau_match.group(1))
            # 1º GRAU = id 13 (sho-dan), 2º GRAU = id 14, etc.
            dan_id = 12 + grau_num
            if 13 <= dan_id <= 22:
                return dan_id

        if not d:
            return None

        # Lookup direto
        if d in DAN_MAP:
            return DAN_MAP[d]
        # Lookup normalizado (sem macrons/hífens)
        d_norm = normalize_for_lookup(d)
        if d_norm in dan_norm:
            return dan_norm[d_norm]
        # Match parcial
        for key, val in DAN_MAP.items():
            key_u = key.upper()
            if key_u in d or d in key_u:
                return val
        return None

    # Não é faixa preta: lookup direto
    if g in GRADUACAO_MAP:
        return GRADUACAO_MAP[g]
    # Lookup normalizado (resolve macrons como IKKYŪ → IKKYU == IKKYU)
    g_norm = normalize_for_lookup(g)
    if g_norm in grad_norm:
        return grad_norm[g_norm]
    # Match parcial
    for key, val in GRADUACAO_MAP.items():
        key_u = key.upper()
        if key_u in g or g in key_u:
            return val
    return None

def normalize_text(text):
    """Remove macrons japoneses e normaliza unicode para facilitar matching."""
    import unicodedata
    # Substitui macrons: ū→u, ō→o, ā→a, ē→e, ī→i (maiúsculas e minúsculas)
    macron_map = str.maketrans("ūŪōŌāĀēĒīĪ", "uUoOaAeEiI")
    text = text.translate(macron_map)
    # Normalização NFD para decompor acentos e recompor em NFC
    return unicodedata.normalize("NFC", text)

def normalize_tamanho_patch(val):
    if not val:
        return None
    v = val.upper().strip()
    if "GRANDE" in v or v == "G":
        return "G"
    if "MÉDIO" in v or "MEDIO" in v or v == "M":
        return "M"
    if "PEQUENO" in v or v == "P":
        return "P"
    # Already P/M/G
    if v in ("P", "M", "G"):
        return v
    return None  # invalid → null (skip)

def extract_first_academia(academies_field):
    if not academies_field.strip():
        return None
    parts = academies_field.split("|")
    # Remove bullet points e caracteres especiais no início
    nome = parts[0].strip().lstrip("•·▪▸→ \t")
    return nome or None

# ---------------------------------------------------------------------------
# Carga de dados do Supabase
# ---------------------------------------------------------------------------

def load_academias():
    """Carrega todas as academias da LRSJ e retorna um dict {nome_normalizado: id}"""
    print("Carregando academias da LRSJ...")
    url = f"{SUPABASE_URL}/rest/v1/academias?select=id,nome&federacao_id=eq.{LRSJ_FED_ID_UUID}&limit=1000"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code != 200:
        print(f"AVISO: Não foi possível carregar academias ({resp.status_code}): {resp.text[:200]}")
        return {}
    rows = resp.json()
    academia_map = {}
    for row in rows:
        nome = row.get("nome", "")
        if nome:
            # Chave principal: nome em lower
            academia_map[nome.lower()] = row["id"]
            # Chave normalizada: sem macrons e sem acentos, para match fuzzy
            norm = normalize_text(nome).lower()
            academia_map[norm] = row["id"]
    print(f"  {len(rows)} academias carregadas.")
    return academia_map

def resolve_stakeholder_id(email, stakeholder_cache, nome_completo="", federacao_id=LRSJ_FED_ID_UUID):
    """
    Busca o stakeholder_id por email.
    Se não existir, cria auth.user + stakeholder (sem enviar email).
    """
    if not email:
        return None
    email = email.strip().lower()
    if email in stakeholder_cache:
        return stakeholder_cache[email]

    # 1. Buscar stakeholder existente
    url = f"{SUPABASE_URL}/rest/v1/stakeholders?select=id&email=eq.{requests.utils.quote(email)}&limit=1"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200 and resp.json():
        sid = resp.json()[0]["id"]
        stakeholder_cache[email] = sid
        return sid

    # 2. Criar auth.user via Admin API (email_confirm=True = sem email enviado)
    # O trigger do Supabase cria automaticamente um stakeholder com o mesmo UUID.
    auth_payload = {
        "email": email,
        "email_confirm": True,
        "user_metadata": {"nome_completo": nome_completo},
        "app_metadata": {"provider": "import_lrsj"},
    }
    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={**HEADERS, "Prefer": ""},
        json=auth_payload,
    )
    if auth_resp.status_code != 200:
        # Se email já existe (422), buscar o usuário existente por email
        if auth_resp.status_code == 422:
            search_r = requests.get(
                f"{SUPABASE_URL}/auth/v1/admin/users?filter={requests.utils.quote(email)}",
                headers={**HEADERS, "Prefer": ""},
            )
            if search_r.status_code == 200:
                users = search_r.json().get("users", [])
                for u in users:
                    if u.get("email", "").lower() == email:
                        user_id = u["id"]
                        stakeholder_cache[email] = user_id
                        return user_id
        stakeholder_cache[email] = None
        return None

    user_id = auth_resp.json().get("id")
    if not user_id:
        stakeholder_cache[email] = None
        return None

    # 3. Atualizar o stakeholder auto-criado pelo trigger com role e federacao
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/stakeholders?id=eq.{user_id}",
        headers={**HEADERS, "Prefer": "return=minimal"},
        json={
            "nome_completo": nome_completo,
            "role": "atleta",
            "funcao": "ATLETA",
            "federacao_id": federacao_id,
        },
    )

    stakeholder_cache[email] = user_id
    return user_id

# ---------------------------------------------------------------------------
# Transformação de linha
# ---------------------------------------------------------------------------

def transform_row(row, academia_map, stakeholder_cache):
    """Transforma uma linha do CSV Smoothcomp em um dict para user_fed_lrsj."""
    warnings = []

    nome = row.get("Name", "").strip()
    email = row.get("Email", "").strip().lower() or None

    graduacao = row.get("GRADUAÇÃO", "").strip()
    qual_seu_dan = row.get("QUAL SEU DAN?", "").strip()
    kyu_dan_id = resolve_kyu_dan_id(graduacao, qual_seu_dan)
    # Aplicar override manual se existir
    nome_lower = nome.lower()
    if nome_lower in KYU_DAN_OVERRIDES:
        kyu_dan_id = KYU_DAN_OVERRIDES[nome_lower]
    elif graduacao and kyu_dan_id is None:
        warnings.append(f'kyu_dan não identificado: GRADUAÇÃO="{graduacao}" / DAN="{qual_seu_dan}"')

    academies_raw = row.get("Academies", "").strip()
    primeira_academia = extract_first_academia(academies_raw)
    academia_id = None
    if primeira_academia:
        # Lookup: tenta nome exato, depois normalizado (sem macrons)
        academia_id = academia_map.get(primeira_academia.lower())
        if not academia_id:
            academia_id = academia_map.get(normalize_text(primeira_academia).lower())
        if not academia_id:
            warnings.append(f'Academia não encontrada: "{primeira_academia}"')

    status_membro, status_plano = normalize_status(
        row.get("Member status", ""), row.get("Plan status", "")
    )

    stakeholder_id = resolve_stakeholder_id(email, stakeholder_cache, nome_completo=nome)

    age_raw = row.get("Age", "").strip()
    idade = int(age_raw) if age_raw.isdigit() else None

    record = {
        "nome_completo": nome,
        "nome_patch": row.get("NOME NO PATCH", "").strip() or None,
        "genero": normalize_gender(row.get("Gender", "")),
        "data_nascimento": row.get("Birthdate", "").strip() or None,
        "idade": idade,
        "nacionalidade": row.get("Nationality", "").strip() or None,
        "email": email,
        "telefone": row.get("Phone", "").strip() or None,
        "cidade": row.get("City", "").strip() or None,
        "estado": row.get("Province", "").strip() or None,
        "pais": row.get("Residence", "").strip() or None,
        "nivel_arbitragem": row.get("Nível de Arbitragem", "").strip() or None,
        "status_membro": status_membro,
        "data_adesao": row.get("Member since", "").strip() or None,
        "plano_tipo": row.get("Plan", "").strip() or None,
        "status_plano": status_plano,
        "data_expiracao": row.get("Expire date", "").strip() or None,
        "url_foto": row.get("Foto", "").strip() or None,
        "url_documento_id": row.get("Imagem da Carteira de Identidade ou Certidão de Nascimento ", "").strip() or None,
        "url_certificado_dan": row.get("Certificado de dan", "").strip() or None,
        "tamanho_patch": normalize_tamanho_patch(row.get("TAMANHO DO PATCH (BACKNUMBER)", "").strip()),
        "lote_id": normalize_lote(row.get("LOTE", "")),
        "observacoes": row.get("OBSERVAÇÕES", "").strip() or None,
        "federacao_id": LRSJ_FED_ID_INT,
        "academias": primeira_academia,
        "dados_validados": False,
        "kyu_dan_id": kyu_dan_id,
        "academia_id": academia_id,
        "stakeholder_id": stakeholder_id,
    }

    return record, warnings

# ---------------------------------------------------------------------------
# Upsert em lotes
# ---------------------------------------------------------------------------

BATCH_SIZE = 50

def upsert_batch(records, dry_run=False):
    """Faz upsert de um lote de registros em user_fed_lrsj."""
    # Filtrar registros sem stakeholder_id (não podem ser inseridos — PK NOT NULL)
    valid = [r for r in records if r.get("stakeholder_id")]
    skipped_no_sk = len(records) - len(valid)

    # Desduplicar por stakeholder_id dentro do lote (mesmo email = mesmo PK)
    seen = {}
    for r in valid:
        seen[r["stakeholder_id"]] = r
    valid = list(seen.values())

    if not valid:
        return {"inserted": 0, "skipped_no_sk": skipped_no_sk, "errors": []}

    if dry_run:
        return {"inserted": len(valid), "skipped_no_sk": skipped_no_sk, "errors": []}

    url = f"{SUPABASE_URL}/rest/v1/user_fed_lrsj"
    h = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"}

    resp = requests.post(url, headers=h, json=valid)
    if resp.status_code in (200, 201):
        return {"inserted": len(valid), "skipped_no_sk": skipped_no_sk, "errors": []}
    else:
        return {
            "inserted": 0,
            "skipped_no_sk": skipped_no_sk,
            "errors": [f"HTTP {resp.status_code}: {resp.text[:300]}"],
        }

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    csv_path = args[0]
    dry_run = "--dry-run" in args

    if not os.path.exists(csv_path):
        print(f"ERRO: Arquivo não encontrado: {csv_path}")
        sys.exit(1)

    print("=" * 72)
    print("IMPORT LRSJ — Smoothcomp → user_fed_lrsj")
    print("=" * 72)
    print(f"Arquivo : {csv_path}")
    print(f"Modo    : {'DRY-RUN (nenhum dado será inserido)' if dry_run else 'PRODUÇÃO'}")
    print(f"Início  : {datetime.now().isoformat()}")
    print()

    # Carregar cache de academias
    academia_map = load_academias()
    stakeholder_cache = {}

    # Ler CSV
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)

    print(f"Linhas no CSV: {len(all_rows)}")
    print()

    total = 0
    total_warnings = 0
    errors = []
    batch = []
    academia_nao_encontrada = set()
    kyu_nao_identificado = []

    for i, row in enumerate(all_rows, 1):
        nome = row.get("Name", "").strip()
        if not nome:
            continue  # pula linhas vazias / fragmentadas

        record, warnings = transform_row(row, academia_map, stakeholder_cache)
        total += 1

        for w in warnings:
            total_warnings += 1
            if "Academia não encontrada" in w:
                academia_nao_encontrada.add(w.split('"')[1])
            elif "kyu_dan não identificado" in w:
                kyu_nao_identificado.append(f"  [{nome}] {w}")

        batch.append(record)

        if len(batch) >= BATCH_SIZE:
            result = upsert_batch(batch, dry_run=dry_run)
            errors.extend(result["errors"])
            batch = []
            sys.stdout.write(f"\r  Processados: {total}/{len(all_rows)}  ")
            sys.stdout.flush()

    # Último lote
    if batch:
        result = upsert_batch(batch, dry_run=dry_run)
        errors.extend(result["errors"])

    # Relatório
    print(f"\n\n{'=' * 72}")
    print("RELATÓRIO FINAL")
    print("=" * 72)
    print(f"Total processados : {total}")
    print(f"Avisos            : {total_warnings}")
    print(f"Erros de upsert   : {len(errors)}")
    print()

    if academia_nao_encontrada:
        print(f"Academias não encontradas ({len(academia_nao_encontrada)}):")
        for nome in sorted(academia_nao_encontrada):
            print(f"  - {nome}")
        print()

    if kyu_nao_identificado:
        print(f"Graduações não identificadas ({len(kyu_nao_identificado)}):")
        for msg in kyu_nao_identificado[:20]:
            print(msg)
        if len(kyu_nao_identificado) > 20:
            print(f"  ... e mais {len(kyu_nao_identificado) - 20}")
        print()

    if errors:
        print("Erros de upsert:")
        for e in errors[:10]:
            print(f"  {e}")
        print()

    if dry_run:
        print("DRY-RUN concluído. Nenhum dado foi alterado no banco.")
    else:
        print("Importação concluída.")

    print(f"Fim: {datetime.now().isoformat()}")
    print("=" * 72)


if __name__ == "__main__":
    main()
