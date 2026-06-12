"""Inspeciona status de privacidade de cada playlist."""

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"


def main() -> None:
    latest = sorted(BACKUP_DIR.glob("*.json"))[-1]
    data = json.loads(latest.read_text())
    playlists = data["playlists"]

    by_status: dict[str, list] = {}
    for p in playlists:
        status = p["status"]["privacyStatus"]
        by_status.setdefault(status, []).append(p)

    print(f"Total: {len(playlists)}\n")
    for status in sorted(by_status.keys()):
        items = by_status[status]
        print(f"=== {status.upper()} ({len(items)}) ===")
        for p in sorted(items, key=lambda x: -x["contentDetails"]["itemCount"]):
            title = p["snippet"]["title"]
            count = p["contentDetails"]["itemCount"]
            print(f"  [{count:>3}] {title}")
        print()


if __name__ == "__main__":
    main()
