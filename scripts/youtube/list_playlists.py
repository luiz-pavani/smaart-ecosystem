"""Lista as playlists do canal a partir do último snapshot."""

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"


def main() -> None:
    latest = sorted(BACKUP_DIR.glob("*.json"))[-1]
    data = json.loads(latest.read_text())
    playlists = data["playlists"]

    print(f"Total: {len(playlists)}\n")
    for p in sorted(playlists, key=lambda x: x["snippet"]["title"]):
        title = p["snippet"]["title"]
        count = p["contentDetails"]["itemCount"]
        pid = p["id"]
        print(f"  [{count:>3} vids] {title}")
        print(f"              id={pid}")


if __name__ == "__main__":
    main()
