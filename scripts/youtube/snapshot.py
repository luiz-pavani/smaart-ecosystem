"""
snapshot.py — dump completo do estado atual do canal.

Sempre rodar ANTES de qualquer operação de escrita em massa.
Gera um JSON versionado por timestamp em backups/ — fonte de verdade
para restore posterior.

Usage:
    python3 snapshot.py                        # snapshot completo
    python3 snapshot.py --label pre_retitle    # snapshot com label customizado
"""

import sys
import json
from datetime import datetime
from pathlib import Path

from googleapiclient.discovery import build

from auth import get_credentials

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"


def get_all_video_ids(youtube, channel_id: str) -> list[str]:
    """Paginação completa de todos os vídeos do canal via playlist 'uploads'."""
    ch = youtube.channels().list(part="contentDetails", id=channel_id).execute()
    uploads_playlist = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    video_ids: list[str] = []
    page_token = None

    while True:
        req = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_playlist,
            maxResults=50,
            pageToken=page_token,
        )
        resp = req.execute()
        for item in resp["items"]:
            video_ids.append(item["contentDetails"]["videoId"])
        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return video_ids


def get_videos_details(youtube, video_ids: list[str]) -> list[dict]:
    """Busca metadata completo em batches de 50 (limite da API)."""
    details: list[dict] = []
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        resp = (
            youtube.videos()
            .list(
                part="snippet,status,contentDetails,statistics,topicDetails,localizations",
                id=",".join(batch),
            )
            .execute()
        )
        details.extend(resp["items"])
        print(f"  buscados {min(i + 50, len(video_ids))}/{len(video_ids)}")
    return details


def get_playlists(youtube, channel_id: str) -> list[dict]:
    playlists: list[dict] = []
    page_token = None
    while True:
        resp = (
            youtube.playlists()
            .list(
                part="snippet,status,contentDetails",
                channelId=channel_id,
                maxResults=50,
                pageToken=page_token,
            )
            .execute()
        )
        playlists.extend(resp["items"])
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return playlists


def get_channel(youtube) -> dict:
    resp = (
        youtube.channels()
        .list(
            part="snippet,status,brandingSettings,contentDetails,statistics,topicDetails,localizations",
            mine=True,
        )
        .execute()
    )
    return resp["items"][0]


def main() -> None:
    args = sys.argv[1:]
    label = "full"
    if "--label" in args:
        i = args.index("--label")
        if i + 1 < len(args):
            label = args[i + 1]

    BACKUP_DIR.mkdir(exist_ok=True, parents=True)

    creds = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    print("== SNAPSHOT Judo365 ==\n")

    print("[1/4] Dados do canal...")
    channel = get_channel(youtube)
    channel_id = channel["id"]

    print("[2/4] Listando todos os vídeos...")
    video_ids = get_all_video_ids(youtube, channel_id)
    print(f"  total: {len(video_ids)} vídeos")

    print("[3/4] Buscando metadata completo...")
    videos = get_videos_details(youtube, video_ids)

    print("[4/4] Playlists...")
    playlists = get_playlists(youtube, channel_id)
    print(f"  total: {len(playlists)} playlists")

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    filename = f"{timestamp}_{label}.json"
    filepath = BACKUP_DIR / filename

    snapshot = {
        "snapshot_timestamp": timestamp,
        "label": label,
        "channel": channel,
        "video_count": len(videos),
        "videos": videos,
        "playlist_count": len(playlists),
        "playlists": playlists,
    }

    filepath.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False))
    size_mb = filepath.stat().st_size / (1024 * 1024)

    print(f"\nSnapshot salvo:")
    print(f"  arquivo: {filepath}")
    print(f"  tamanho: {size_mb:.2f} MB")
    print(f"  vídeos:  {len(videos)}")
    print(f"  playlists: {len(playlists)}")


if __name__ == "__main__":
    main()
