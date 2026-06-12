"""
inspect_videos.py — imprime metadata completo de um ou mais vídeos.

Usado pra ver estado atual antes de propor mudança.

Uso:
    python3 inspect_videos.py ID1 ID2 ID3
"""

import sys
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"


def main() -> None:
    ids = sys.argv[1:]
    if not ids:
        sys.exit("forneça IDs")

    latest = sorted(BACKUP_DIR.glob("*.json"))[-1]
    data = json.loads(latest.read_text())
    videos = {v["id"]: v for v in data["videos"]}

    for vid in ids:
        v = videos.get(vid)
        if not v:
            print(f"[{vid}] NÃO ENCONTRADO\n")
            continue
        s = v["snippet"]
        print(f"=== {vid} ===")
        print(f"Título: {s['title']}")
        print(f"Categoria: {s.get('categoryId')}")
        print(f"Idioma default: {s.get('defaultLanguage')} / audio: {s.get('defaultAudioLanguage')}")
        print(f"Tags ({len(s.get('tags', []))}): {s.get('tags', [])}")
        print(f"Descrição ({len(s.get('description', ''))} chars):")
        print("---")
        print(s.get("description", "(vazio)"))
        print("---\n")


if __name__ == "__main__":
    main()
