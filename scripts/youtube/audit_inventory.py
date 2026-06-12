"""
audit_inventory.py — análise rápida do snapshot baseline.

Imprime:
- Distribuição por privacidade (public/unlisted/private)
- Distribuição por duração (Shorts <60s vs long-form)
- Distribuição por ano de publicação
- Top 20 por views
- Vídeos sem tags
- Vídeos sem descrição substantiva (<100 chars)
"""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"


def latest_baseline() -> Path:
    candidates = sorted(BACKUP_DIR.glob("*_baseline.json"))
    if not candidates:
        raise SystemExit("Nenhum snapshot baseline encontrado.")
    return candidates[-1]


def parse_duration_iso(iso: str) -> int:
    """Converte ISO 8601 duration (PT1M30S) em segundos."""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return 0
    h, mi, s = m.groups()
    return int(h or 0) * 3600 + int(mi or 0) * 60 + int(s or 0)


def main() -> None:
    path = latest_baseline()
    print(f"Analisando: {path.name}\n")
    data = json.loads(path.read_text())
    videos = data["videos"]
    playlists = data["playlists"]

    print(f"Total de vídeos no dump: {len(videos)}")
    print(f"Total de playlists: {len(playlists)}\n")

    privacy_counts = Counter(v["status"]["privacyStatus"] for v in videos)
    print("== PRIVACIDADE ==")
    for status, count in privacy_counts.most_common():
        print(f"  {status:<12} {count}")

    duration_buckets = Counter()
    shorts = []
    for v in videos:
        secs = parse_duration_iso(v["contentDetails"]["duration"])
        if secs == 0:
            duration_buckets["live/indefinido"] += 1
        elif secs < 60:
            duration_buckets["Short (<60s)"] += 1
            shorts.append(v)
        elif secs < 300:
            duration_buckets["curto (1-5min)"] += 1
        elif secs < 900:
            duration_buckets["médio (5-15min)"] += 1
        elif secs < 1800:
            duration_buckets["longo (15-30min)"] += 1
        else:
            duration_buckets["muito longo (30min+)"] += 1

    print("\n== DURAÇÃO ==")
    for bucket, count in duration_buckets.most_common():
        print(f"  {bucket:<24} {count}")

    year_counts = Counter()
    for v in videos:
        pub = v["snippet"]["publishedAt"][:4]
        year_counts[pub] += 1

    print("\n== PUBLICAÇÃO POR ANO ==")
    for year in sorted(year_counts.keys()):
        print(f"  {year}  {year_counts[year]}")

    public = [v for v in videos if v["status"]["privacyStatus"] == "public"]
    with_stats = [v for v in public if "statistics" in v and "viewCount" in v["statistics"]]
    top_viewed = sorted(
        with_stats,
        key=lambda v: int(v["statistics"].get("viewCount", 0)),
        reverse=True,
    )[:20]

    print("\n== TOP 20 VÍDEOS POR VIEWS (públicos) ==")
    for i, v in enumerate(top_viewed, 1):
        views = int(v["statistics"].get("viewCount", 0))
        likes = int(v["statistics"].get("likeCount", 0))
        comments = int(v["statistics"].get("commentCount", 0))
        title = v["snippet"]["title"][:70]
        pub = v["snippet"]["publishedAt"][:10]
        vid = v["id"]
        print(f"  {i:>2}. [{views:>7,}] {pub} {title}")
        print(f"      id={vid}  likes={likes}  comments={comments}")

    no_tags = [v for v in public if not v["snippet"].get("tags")]
    print(f"\n== VÍDEOS PÚBLICOS SEM TAGS ==")
    print(f"  total: {len(no_tags)}/{len(public)}")

    short_desc = [
        v for v in public if len(v["snippet"].get("description", "")) < 100
    ]
    print(f"\n== VÍDEOS PÚBLICOS COM DESCRIÇÃO <100 CHARS ==")
    print(f"  total: {len(short_desc)}/{len(public)}")

    print(f"\n== SHORTS DETECTADOS (duração <60s) ==")
    print(f"  total: {len(shorts)}")
    for v in shorts[:10]:
        title = v["snippet"]["title"][:70]
        pub = v["snippet"]["publishedAt"][:10]
        print(f"  {pub}  {title}")

    nonpublic = [v for v in videos if v["status"]["privacyStatus"] != "public"]
    print(f"\n== NÃO-PÚBLICOS (unlisted/private) ==")
    for v in nonpublic[:30]:
        status = v["status"]["privacyStatus"]
        title = v["snippet"]["title"][:60]
        pub = v["snippet"]["publishedAt"][:10]
        print(f"  [{status:<8}] {pub}  {title}")


if __name__ == "__main__":
    main()
