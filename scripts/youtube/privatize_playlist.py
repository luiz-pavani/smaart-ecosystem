"""
privatize_playlist.py — muda a privacidade de uma playlist.

Uso:
    python3 privatize_playlist.py --id PLAYLIST_ID --to private         # dry-run
    python3 privatize_playlist.py --id PLAYLIST_ID --to private --apply

Valores válidos de --to: private, unlisted, public
"""

import sys
import json
from datetime import datetime
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from auth import get_credentials

SCRIPT_DIR = Path(__file__).parent
LOG_DIR = SCRIPT_DIR / "logs"


def main() -> None:
    args = sys.argv[1:]
    if "--id" not in args:
        sys.exit("forneça --id PLAYLIST_ID")
    pid = args[args.index("--id") + 1]
    if "--to" not in args:
        sys.exit("forneça --to private|unlisted|public")
    target = args[args.index("--to") + 1]
    if target not in ("private", "unlisted", "public"):
        sys.exit("--to deve ser private, unlisted ou public")
    apply = "--apply" in args

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)

    resp = yt.playlists().list(part="snippet,status", id=pid).execute()
    if not resp.get("items"):
        sys.exit(f"Playlist {pid} não encontrada")
    p = resp["items"][0]
    before_status = p["status"]["privacyStatus"]
    title = p["snippet"]["title"]

    print(f"=== Playlist: {title} ===")
    print(f"  id: {pid}")
    print(f"  privacyStatus: {before_status} → {target}")

    if before_status == target:
        print(f"\nJá está em {target}. Nada a fazer.")
        return

    if not apply:
        print("\nDRY-RUN — nada alterado. Adicione --apply para efetivar.")
        return

    body = {
        "id": pid,
        "snippet": {
            "title": p["snippet"]["title"],
            "description": p["snippet"].get("description", ""),
        },
        "status": {"privacyStatus": target},
    }
    try:
        yt.playlists().update(part="snippet,status", body=body).execute()
        today = datetime.now().strftime("%Y-%m-%d")
        log_file = LOG_DIR / f"{today}_operations.log"
        log_file.parent.mkdir(exist_ok=True, parents=True)
        with log_file.open("a") as f:
            f.write(json.dumps({
                "ts": datetime.now().isoformat(),
                "op": "playlist_privacy_change",
                "playlist_id": pid,
                "title": title,
                "before": before_status,
                "after": target,
                "status": "ok",
            }, ensure_ascii=False) + "\n")
        print(f"\n✅ Playlist '{title}' agora está em '{target}'")
    except HttpError as e:
        print(f"\n❌ ERRO: {e}")


if __name__ == "__main__":
    main()
