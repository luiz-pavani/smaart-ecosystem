"""
check_playlist_membership.py — verifica se os 11 Makikomi já estão
nas playlists alvo (100 Técnicas, Waza, Judo 365) + lista 'Jiu-Jitsu'.
"""

import json
from pathlib import Path

from googleapiclient.discovery import build

from auth import get_credentials

MAKIKOMI_IDS = [
    "RAstabPzWdY",  # Ko-uchi-makikomi
    "s-9Efo4Savk",  # Ō-soto-makikomi
    "Tr1mN8dpEc4",  # Kani-basami
    "n8sPVbCbqOU",  # Kawazu-gake
    "yfmWUi5C4nk",  # Uchi-mata-makikomi
    "hd1oSaS0Vn4",  # Harai-makikomi
    "uGSb_eIH_f8",  # Hane-makikomi
    "8KX5XNpM3Nw",  # Uchi-makikomi
    "czhyn2iiRr0",  # Soto-makikomi
    "KV0lII3EnPM",  # Yoko-wakare
    "kJmqlsLba5c",  # Daki-wakare
]

PLAYLISTS = {
    "100 Técnicas de Judo da Kodokan": "PL_W-L4uibyZ1GS4Oc3ls5D9e2ZHMs_Rip",
    "Waza": "PL_W-L4uibyZ3xCW-PBi1VQJxwSFh0n3dz",
    "Judo 365": "PL_W-L4uibyZ13pgECNeXGXczkzzUKdKmi",
    "Jiu-Jitsu": "PL_W-L4uibyZ30n4QPi4tm_T4SjbIJILvu",
}


def get_playlist_items(youtube, playlist_id: str) -> list[dict]:
    items: list[dict] = []
    page_token = None
    while True:
        resp = (
            youtube.playlistItems()
            .list(
                part="snippet,contentDetails",
                playlistId=playlist_id,
                maxResults=50,
                pageToken=page_token,
            )
            .execute()
        )
        items.extend(resp["items"])
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def main() -> None:
    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)

    for name, pid in PLAYLISTS.items():
        items = get_playlist_items(yt, pid)
        vids_in = {i["contentDetails"]["videoId"] for i in items}
        print(f"=== {name} ({len(items)} itens) ===")
        if name == "Jiu-Jitsu":
            for i in items:
                title = i["snippet"]["title"]
                vid = i["contentDetails"]["videoId"]
                print(f"  {vid}  {title}")
            print()
            continue
        present = [v for v in MAKIKOMI_IDS if v in vids_in]
        missing = [v for v in MAKIKOMI_IDS if v not in vids_in]
        print(f"  Makikomi já presentes: {len(present)}/11")
        for v in present:
            print(f"    ✓ {v}")
        print(f"  Makikomi AUSENTES: {len(missing)}/11")
        for v in missing:
            print(f"    ✗ {v}")
        print()


if __name__ == "__main__":
    main()
