"""
audit_top30_untouched.py — identifica os top 30 vídeos públicos por views
que NÃO estão na série Kodokan-waza (já tratada).
"""

import json
from pathlib import Path

from googleapiclient.discovery import build

from auth import get_credentials

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"

KODOKAN_PLAYLIST = "PL_W-L4uibyZ1GS4Oc3ls5D9e2ZHMs_Rip"


def main() -> None:
    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)

    # Pega IDs da playlist Kodokan (já tratados)
    kodokan_ids = set()
    page_token = None
    while True:
        r = yt.playlistItems().list(part="contentDetails", playlistId=KODOKAN_PLAYLIST, maxResults=50, pageToken=page_token).execute()
        kodokan_ids.update(i["contentDetails"]["videoId"] for i in r["items"])
        page_token = r.get("nextPageToken")
        if not page_token:
            break
    print(f"Vídeos na playlist Kodokan (tratados): {len(kodokan_ids)}\n")

    # Lê último baseline pra pegar todos vídeos ordenados por views
    baselines = sorted((SCRIPT_DIR / "backups").glob("*_baseline.json"))
    if not baselines:
        # usa qualquer snapshot
        baselines = sorted((SCRIPT_DIR / "backups").glob("*.json"))
    data = json.loads(baselines[-1].read_text())
    videos = data["videos"]

    public_videos = [v for v in videos if v["status"]["privacyStatus"] == "public"]

    untouched = []
    for v in public_videos:
        if v["id"] in kodokan_ids:
            continue
        stats = v.get("statistics", {})
        views = int(stats.get("viewCount", 0))
        untouched.append((views, v))
    untouched.sort(key=lambda x: -x[0])

    print(f"Top 30 vídeos públicos FORA da série Kodokan-waza:\n")
    for views, v in untouched[:30]:
        s = v["snippet"]
        title = s["title"]
        pub = s["publishedAt"][:10]
        vid = v["id"]
        tags = s.get("tags", [])
        desc_len = len(s.get("description", ""))
        likes = int(v.get("statistics", {}).get("likeCount", 0))
        lang = s.get("defaultLanguage", "--")
        print(f"  [{views:>6}v {likes:>4}L] [{vid}] lang={lang} t={len(tags)} d={desc_len}ch")
        print(f"     {pub} | {title[:80]}")
        print()

    top30 = [(views, v["id"], v["snippet"]["title"]) for views, v in untouched[:30]]
    OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
    (OUTPUT_DIR / "top30_untouched.json").write_text(json.dumps(top30, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
