"""
audit_kodokan_series.py — audita a playlist "100 Técnicas de Judo da Kodokan".

Imprime:
- Lista completa dos vídeos em ordem da playlist
- Estado de metadata (título, tags, descrição length, idioma)
- Views + retenção + data
- Classificação proposta: SAFE | CAUTIOUS | FREEZE

Critérios:
- FREEZE = views > 2000 OU likes > 150 (já performa — não mexer título)
- CAUTIOUS = 500 < views <= 2000 (mexer só tags/descrição)
- SAFE = views <= 500 (template completo, título intocado mesmo assim)
"""

import json
from pathlib import Path

from googleapiclient.discovery import build

from auth import get_credentials

PLAYLIST_ID = "PL_W-L4uibyZ1GS4Oc3ls5D9e2ZHMs_Rip"

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"
OUTPUT_DIR = SCRIPT_DIR / "output"

MAKIKOMI_IDS = {
    "RAstabPzWdY", "s-9Efo4Savk", "Tr1mN8dpEc4", "n8sPVbCbqOU",
    "yfmWUi5C4nk", "hd1oSaS0Vn4", "uGSb_eIH_f8", "8KX5XNpM3Nw",
    "czhyn2iiRr0", "KV0lII3EnPM", "kJmqlsLba5c",
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


def get_videos(youtube, ids: list[str]) -> dict[str, dict]:
    out = {}
    for i in range(0, len(ids), 50):
        batch = ids[i : i + 50]
        resp = (
            youtube.videos()
            .list(
                part="snippet,status,statistics,contentDetails",
                id=",".join(batch),
            )
            .execute()
        )
        for v in resp["items"]:
            out[v["id"]] = v
    return out


def classify(v: dict) -> str:
    stats = v.get("statistics", {})
    views = int(stats.get("viewCount", 0))
    likes = int(stats.get("likeCount", 0))
    if views > 2000 or likes > 150:
        return "FREEZE"
    if views > 500:
        return "CAUTIOUS"
    return "SAFE"


def main() -> None:
    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)

    print("Lendo playlist '100 Técnicas de Judo da Kodokan'...")
    items = get_playlist_items(yt, PLAYLIST_ID)
    print(f"  total de itens: {len(items)}")
    video_ids = [i["contentDetails"]["videoId"] for i in items]
    videos = get_videos(yt, video_ids)

    # Ordena pela posição na playlist
    ordered = []
    for item in items:
        vid = item["contentDetails"]["videoId"]
        if vid in videos:
            ordered.append(videos[vid])

    counts = {"FREEZE": [], "CAUTIOUS": [], "SAFE": [], "ALREADY_DONE": []}
    summary_rows = []

    for v in ordered:
        vid = v["id"]
        s = v["snippet"]
        stats = v.get("statistics", {})
        title = s["title"]
        views = int(stats.get("viewCount", 0))
        likes = int(stats.get("likeCount", 0))
        tags = s.get("tags", [])
        desc_len = len(s.get("description", ""))
        lang = s.get("defaultLanguage")
        pub = s["publishedAt"][:10]

        if vid in MAKIKOMI_IDS:
            bucket = "ALREADY_DONE"
        else:
            bucket = classify(v)

        counts[bucket].append(vid)
        summary_rows.append({
            "vid": vid,
            "title": title,
            "views": views,
            "likes": likes,
            "tags_count": len(tags),
            "desc_len": desc_len,
            "lang": lang,
            "published": pub,
            "bucket": bucket,
        })

    print(f"\n{'BUCKET':<14} | count")
    print(f"{'-'*14}-+------")
    for b in ("FREEZE", "CAUTIOUS", "SAFE", "ALREADY_DONE"):
        print(f"{b:<14} | {len(counts[b]):>5}")

    print(f"\n{'='*100}")
    print("Lista completa (ordenada por posição na playlist):")
    print(f"{'='*100}")
    for r in summary_rows:
        marker = {
            "FREEZE": "🔴",
            "CAUTIOUS": "🟡",
            "SAFE": "🟢",
            "ALREADY_DONE": "✅",
        }[r["bucket"]]
        print(f"{marker} [{r['vid']}] v={r['views']:>5} L={r['likes']:>4} t={r['tags_count']:>2} d={r['desc_len']:>4}ch {r['lang'] or '-- '} | {r['title'][:65]}")

    OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
    outfile = OUTPUT_DIR / "kodokan_series_audit.json"
    outfile.write_text(json.dumps({
        "total": len(summary_rows),
        "rows": summary_rows,
        "buckets": {k: v for k, v in counts.items()},
    }, indent=2, ensure_ascii=False))
    print(f"\nSalvo em: {outfile}")


if __name__ == "__main__":
    main()
