"""
dedupe_playlist.py — remove entradas duplicadas de uma playlist.

Uso:
    python3 dedupe_playlist.py --id PLAYLIST_ID            # dry-run (default)
    python3 dedupe_playlist.py --id PLAYLIST_ID --apply    # aplica

Estratégia:
- Mantém a PRIMEIRA ocorrência de cada videoId (position mais baixa).
- Remove as demais via playlistItems().delete().
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
    apply = "--apply" in args

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)

    items: list[dict] = []
    page_token = None
    while True:
        resp = (
            yt.playlistItems()
            .list(part="snippet,contentDetails,id", playlistId=pid, maxResults=50, pageToken=page_token)
            .execute()
        )
        items.extend(resp["items"])
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    seen: dict[str, dict] = {}
    to_remove: list[tuple[str, dict]] = []
    for it in items:
        vid = it["contentDetails"]["videoId"]
        if vid in seen:
            to_remove.append((it["id"], it))
        else:
            seen[vid] = it

    print(f"Total itens na playlist: {len(items)}")
    print(f"Vídeos únicos:           {len(seen)}")
    print(f"Duplicatas a remover:    {len(to_remove)}\n")

    if not to_remove:
        print("Nada a fazer.")
        return

    for item_id, it in to_remove:
        title = it["snippet"]["title"]
        vid = it["contentDetails"]["videoId"]
        pos = it["snippet"].get("position", "?")
        print(f"  Remover entrada pos={pos}: {title[:60]}  (videoId={vid})  itemId={item_id}")

    if not apply:
        print("\nDRY-RUN — nada removido. Adicione --apply para efetivar.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOG_DIR / f"{today}_operations.log"
    log_file.parent.mkdir(exist_ok=True, parents=True)

    removed = 0
    for item_id, it in to_remove:
        try:
            yt.playlistItems().delete(id=item_id).execute()
            removed += 1
            with log_file.open("a") as f:
                f.write(json.dumps({
                    "ts": datetime.now().isoformat(),
                    "op": "playlist_dedupe",
                    "playlist_id": pid,
                    "removed_item_id": item_id,
                    "video_id": it["contentDetails"]["videoId"],
                    "title": it["snippet"]["title"],
                    "status": "ok",
                }, ensure_ascii=False) + "\n")
            print(f"  ✅ removido itemId={item_id}")
        except HttpError as e:
            print(f"  ❌ falhou itemId={item_id}: {e}")

    print(f"\nTotal removido: {removed}/{len(to_remove)}")


if __name__ == "__main__":
    main()
