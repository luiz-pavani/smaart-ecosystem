"""
publish.py — muda privacidade de vídeos de unlisted/private → public.

USO SEGURO:
    python3 publish.py --ids ID1,ID2,...          # dry-run (default)
    python3 publish.py --ids ID1,ID2,... --apply  # aplica de verdade

Protocolo:
- Sempre imprime diff antes (--dry-run default)
- Em --apply: processa em batches de 10 com pausa de 5s entre batches
- Log append-only em logs/YYYY-MM-DD_operations.log
- Pré-flight: verifica que cada vídeo existe e NÃO está público já
"""

import sys
import json
import time
from datetime import datetime
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from auth import get_credentials

SCRIPT_DIR = Path(__file__).parent
LOG_DIR = SCRIPT_DIR / "logs"
BATCH_SIZE = 10
BATCH_PAUSE_SEC = 5


def parse_args() -> tuple[list[str], bool]:
    args = sys.argv[1:]
    apply = "--apply" in args
    ids: list[str] = []
    if "--ids" in args:
        i = args.index("--ids")
        if i + 1 < len(args):
            ids = [x.strip() for x in args[i + 1].split(",") if x.strip()]
    if "--from-file" in args:
        i = args.index("--from-file")
        if i + 1 < len(args):
            data = json.loads(Path(args[i + 1]).read_text())
            ids = data.get("video_ids", [])
    if not ids:
        sys.exit("ERRO: forneça --ids ID1,ID2,... ou --from-file path.json")
    return ids, apply


def fetch_current(youtube, ids: list[str]) -> dict[str, dict]:
    """Busca estado atual de cada vídeo (status + snippet)."""
    out: dict[str, dict] = {}
    for i in range(0, len(ids), 50):
        batch = ids[i : i + 50]
        resp = (
            youtube.videos()
            .list(part="snippet,status", id=",".join(batch))
            .execute()
        )
        for v in resp["items"]:
            out[v["id"]] = v
    return out


def log_operation(log_file: Path, entry: dict) -> None:
    log_file.parent.mkdir(exist_ok=True, parents=True)
    with log_file.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def main() -> None:
    ids, apply = parse_args()
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"== publish.py [{mode}] ==")
    print(f"Total de vídeos alvo: {len(ids)}\n")

    creds = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    current = fetch_current(youtube, ids)

    # Pré-flight
    missing = [i for i in ids if i not in current]
    if missing:
        print(f"⚠️  IDs não encontrados: {missing}")
    already_public = [i for i in ids if i in current and current[i]["status"]["privacyStatus"] == "public"]
    if already_public:
        print(f"⚠️  Já estão públicos (pulando): {already_public}")

    work = [i for i in ids if i in current and current[i]["status"]["privacyStatus"] != "public"]

    print(f"\n=== DIFF ({len(work)} vídeos serão alterados) ===\n")
    for vid in work:
        v = current[vid]
        title = v["snippet"]["title"]
        before = v["status"]["privacyStatus"]
        print(f"  [{vid}] {title[:70]}")
        print(f"    privacyStatus: {before} → public\n")

    if not apply:
        print("DRY-RUN — nada foi alterado.")
        print("Para aplicar: adicione --apply ao comando.")
        return

    if not work:
        print("Nada a fazer.")
        return

    # Apply
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOG_DIR / f"{today}_operations.log"

    print(f"\n=== APLICANDO (batch={BATCH_SIZE}, pausa={BATCH_PAUSE_SEC}s) ===\n")

    success, failed = [], []
    for i in range(0, len(work), BATCH_SIZE):
        batch = work[i : i + BATCH_SIZE]
        print(f"Batch {i // BATCH_SIZE + 1} — {len(batch)} vídeos")
        for vid in batch:
            v = current[vid]
            before_status = v["status"]["privacyStatus"]
            body = {
                "id": vid,
                "status": {
                    **{k: v["status"][k] for k in v["status"] if k in (
                        "privacyStatus", "license", "embeddable",
                        "publicStatsViewable", "madeForKids", "selfDeclaredMadeForKids"
                    )},
                    "privacyStatus": "public",
                },
            }
            try:
                resp = youtube.videos().update(part="status", body=body).execute()
                after_status = resp["status"]["privacyStatus"]
                success.append(vid)
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "publish",
                    "video_id": vid,
                    "title": v["snippet"]["title"],
                    "privacyStatus_before": before_status,
                    "privacyStatus_after": after_status,
                    "status": "ok",
                })
                print(f"  ✅ {vid}  {v['snippet']['title'][:60]}")
            except HttpError as e:
                failed.append((vid, str(e)))
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "publish",
                    "video_id": vid,
                    "title": v["snippet"]["title"],
                    "privacyStatus_before": before_status,
                    "error": str(e),
                    "status": "error",
                })
                print(f"  ❌ {vid}  ERRO: {e}")

        if i + BATCH_SIZE < len(work):
            print(f"  (pausa {BATCH_PAUSE_SEC}s)\n")
            time.sleep(BATCH_PAUSE_SEC)

    print(f"\n=== RESUMO ===")
    print(f"Sucesso: {len(success)}")
    print(f"Falha:   {len(failed)}")
    print(f"Log:     {log_file}")


if __name__ == "__main__":
    main()
