"""
retry_failed_b2.py — refazer os 3 vídeos que falharam com invalidTags:
- 5LHJ2mPNcOY (FREEZE) — tinha "Kogi & Mondo" no current
- sCu2oSvTOXE (FREEZE) — idem
- gJBBkMLLnzY (TEMPLATE) — soma de chars no limite

Estratégia:
1. Sanitiza tags: remove qualquer tag que contenha caracteres reservados (& < > " ' `)
2. Limite total mais conservador: 440ch (margem para multi-byte UTF-8)
3. Tag individual com espaço limitada a 30ch (regra YT)
"""

import sys
import json
import time
from datetime import datetime
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from auth import get_credentials
from retitle_b2_b37 import (
    B2, BASE_TAGS_COMMON, build_description_b2_template, merge_tags_freeze,
)

SCRIPT_DIR = Path(__file__).parent
LOG_DIR = SCRIPT_DIR / "logs"

FAILED_IDS = ["5LHJ2mPNcOY", "sCu2oSvTOXE", "gJBBkMLLnzY"]

RESERVED = set('&<>"\'`')


def sanitize_tag(t: str) -> str | None:
    """Remove tags inválidas; retorna None se a tag deve ser dropada."""
    # Drop se contém caractere reservado
    if any(c in t for c in RESERVED):
        return None
    # Drop se tag com espaço >30ch
    if " " in t and len(t) > 30:
        return None
    # Trim espaços
    t = t.strip()
    if not t:
        return None
    return t


def safe_build_tags(specific: list[str], current: list[str] | None = None) -> list[str]:
    """Combina specific+base (e current se fornecido), sanitiza, dedupe, limita 440ch."""
    pool = []
    if current:
        pool.extend(current)
    pool.extend(specific)
    pool.extend(BASE_TAGS_COMMON)
    seen = set()
    final: list[str] = []
    total = 0
    for t in pool:
        clean = sanitize_tag(t)
        if not clean:
            continue
        key = clean.lower()
        if key in seen:
            continue
        seen.add(key)
        cost = len(clean) + 2
        if total + cost > 440:
            continue
        final.append(clean)
        total += cost
    return final


def main() -> None:
    apply = "--apply" in sys.argv
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"== retry_failed_b2.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)

    resp = yt.videos().list(part="snippet,status", id=",".join(FAILED_IDS)).execute()
    current_map = {v["id"]: v for v in resp["items"]}

    diffs = []
    for vid in FAILED_IDS:
        v = current_map.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado")
            continue
        s = v["snippet"]
        d = B2[vid]
        before = {
            "title": s["title"],
            "description": s.get("description", ""),
            "tags": s.get("tags", []),
            "categoryId": s.get("categoryId"),
            "defaultLanguage": s.get("defaultLanguage"),
            "defaultAudioLanguage": s.get("defaultAudioLanguage"),
        }
        if d.get("freeze"):
            new_tags = safe_build_tags(d["specific_tags"], current=before["tags"])
            after = {
                "title": before["title"],
                "description": before["description"],
                "tags": new_tags,
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mlabel = "FREEZE-RETRY"
        else:
            new_tags = safe_build_tags(d["specific_tags"])
            after = {
                "title": before["title"],
                "description": build_description_b2_template(vid),
                "tags": new_tags,
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mlabel = "TEMPLATE-RETRY"
        diffs.append((vid, before, after, mlabel))

    for vid, before, after, mlabel in diffs:
        print(f"=== [{mlabel}] {vid} — {after['title'][:60]} ===")
        print(f"  description: {len(before['description'])} → {len(after['description'])} chars")
        before_total = sum(len(t)+2 for t in before["tags"])
        after_total = sum(len(t)+2 for t in after["tags"])
        print(f"  tags:        {len(before['tags'])} ({before_total}ch) → {len(after['tags'])} ({after_total}ch)")
        # listagem detalhada das novas tags
        for t in after["tags"]:
            print(f"    - {t}")
        print()

    if not apply:
        print("DRY-RUN — nada alterado. Adicione --apply para efetivar.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOG_DIR / f"{today}_operations.log"

    print(f"=== APLICANDO ===\n")
    success, failed = [], []
    for vid, before, after, mlabel in diffs:
        body = {
            "id": vid,
            "snippet": {
                "title": after["title"],
                "description": after["description"],
                "tags": after["tags"],
                "categoryId": after["categoryId"],
                "defaultLanguage": after["defaultLanguage"],
                "defaultAudioLanguage": after["defaultAudioLanguage"],
            },
        }
        try:
            yt.videos().update(part="snippet", body=body).execute()
            success.append(vid)
            log_file.parent.mkdir(exist_ok=True, parents=True)
            with log_file.open("a") as f:
                f.write(json.dumps({
                    "ts": datetime.now().isoformat(),
                    "op": "retry_b2",
                    "mode": mlabel,
                    "video_id": vid,
                    "title": after["title"],
                    "after_tags_count": len(after["tags"]),
                    "after_desc_len": len(after["description"]),
                    "status": "ok",
                }, ensure_ascii=False) + "\n")
            print(f"  ✅ [{mlabel}] {vid}  {after['title'][:55]}")
        except HttpError as e:
            failed.append((vid, str(e)))
            print(f"  ❌ {vid}  ERRO: {e}")

    print(f"\nSucesso: {len(success)} / Falha: {len(failed)}")


if __name__ == "__main__":
    main()
