"""
analytics.py — puxa métricas privadas do YouTube Analytics API.

Métricas críticas:
- Retenção média por vídeo
- CTR de thumbnail
- Fontes de tráfego (search/suggested/external/browse)
- Idade/gênero/país da audiência
- Top search terms
- Métricas 28d vs 365d

Uso:
    python3 analytics.py              # últimos 28 dias
    python3 analytics.py --window 365 # últimos 365 dias
"""

import sys
import json
from datetime import date, timedelta
from pathlib import Path

from googleapiclient.discovery import build

from auth import get_credentials

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"


def run_report(analytics, channel_id: str, **kwargs) -> dict:
    params = {"ids": f"channel=={channel_id}", **kwargs}
    return analytics.reports().query(**params).execute()


def main() -> None:
    args = sys.argv[1:]
    window = 28
    if "--window" in args:
        i = args.index("--window")
        if i + 1 < len(args):
            window = int(args[i + 1])

    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=window)

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    analytics = build("youtubeAnalytics", "v2", credentials=creds)

    ch = yt.channels().list(part="id", mine=True).execute()
    channel_id = ch["items"][0]["id"]

    print(f"== Analytics Judo365 ==")
    print(f"Janela: {start_date} → {end_date} ({window} dias)\n")

    OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
    report = {
        "window_days": window,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "channel_id": channel_id,
    }

    print("[1/7] Totais do canal...")
    totals = run_report(
        analytics,
        channel_id,
        startDate=str(start_date),
        endDate=str(end_date),
        metrics="views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares",
    )
    report["totals"] = totals
    rows = totals.get("rows", [[0] * 9])[0]
    print(f"  Views: {int(rows[0]):,}")
    print(f"  Minutos assistidos: {int(rows[1]):,}")
    print(f"  Duração média: {int(rows[2])}s")
    print(f"  % assistido: {rows[3]:.1f}%")
    print(f"  Inscritos +: {int(rows[4])} / -: {int(rows[5])} / líquido: {int(rows[4]) - int(rows[5])}")
    print(f"  Likes: {int(rows[6]):,} | Comments: {int(rows[7]):,} | Shares: {int(rows[8]):,}")

    print("\n[2/7] Top 15 vídeos por views no período...")
    top_videos = run_report(
        analytics,
        channel_id,
        startDate=str(start_date),
        endDate=str(end_date),
        metrics="views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage",
        dimensions="video",
        sort="-views",
        maxResults=15,
    )
    report["top_videos"] = top_videos
    video_ids = [r[0] for r in top_videos.get("rows", [])]
    titles = {}
    if video_ids:
        v_resp = yt.videos().list(part="snippet", id=",".join(video_ids)).execute()
        for v in v_resp["items"]:
            titles[v["id"]] = v["snippet"]["title"]
    for r in top_videos.get("rows", []):
        vid, views, mins, avg_dur, avg_pct = r[0], int(r[1]), int(r[2]), int(r[3]), r[4]
        title = titles.get(vid, vid)[:60]
        print(f"  [{views:>5}v {avg_pct:>5.1f}%ret] {title}")

    print("\n[3/7] Fontes de tráfego...")
    traffic = run_report(
        analytics,
        channel_id,
        startDate=str(start_date),
        endDate=str(end_date),
        metrics="views,estimatedMinutesWatched",
        dimensions="insightTrafficSourceType",
        sort="-views",
    )
    report["traffic_sources"] = traffic
    total_views = sum(int(r[1]) for r in traffic.get("rows", []))
    for r in traffic.get("rows", []):
        src, views, mins = r[0], int(r[1]), int(r[2])
        pct = (views / total_views * 100) if total_views else 0
        print(f"  {src:<32} {views:>6} ({pct:>5.1f}%)")

    print("\n[4/7] Top 10 search terms que trouxeram views...")
    try:
        search = run_report(
            analytics,
            channel_id,
            startDate=str(start_date),
            endDate=str(end_date),
            metrics="views",
            dimensions="insightTrafficSourceDetail",
            filters="insightTrafficSourceType==YT_SEARCH",
            sort="-views",
            maxResults=10,
        )
        report["search_terms"] = search
        for r in search.get("rows", []):
            term, views = r[0], int(r[1])
            print(f"  [{views:>4}] {term}")
    except Exception as e:
        print(f"  (sem dados suficientes: {e})")

    print("\n[5/7] Demografia — idade × gênero...")
    try:
        demo = run_report(
            analytics,
            channel_id,
            startDate=str(start_date),
            endDate=str(end_date),
            metrics="viewerPercentage",
            dimensions="ageGroup,gender",
            sort="-viewerPercentage",
        )
        report["demographics"] = demo
        for r in demo.get("rows", []):
            age, gender, pct = r[0], r[1], r[2]
            print(f"  {age:<10} {gender:<10} {pct:>5.1f}%")
    except Exception as e:
        print(f"  (sem dados: {e})")

    print("\n[6/7] Top 10 países...")
    try:
        geo = run_report(
            analytics,
            channel_id,
            startDate=str(start_date),
            endDate=str(end_date),
            metrics="views,averageViewPercentage",
            dimensions="country",
            sort="-views",
            maxResults=10,
        )
        report["countries"] = geo
        for r in geo.get("rows", []):
            country, views, ret = r[0], int(r[1]), r[2]
            print(f"  {country:<4} views={views:>5} retenção={ret:>5.1f}%")
    except Exception as e:
        print(f"  (sem dados: {e})")

    print("\n[7/7] Device type...")
    try:
        device = run_report(
            analytics,
            channel_id,
            startDate=str(start_date),
            endDate=str(end_date),
            metrics="views,averageViewDuration",
            dimensions="deviceType",
            sort="-views",
        )
        report["device_types"] = device
        for r in device.get("rows", []):
            dev, views, dur = r[0], int(r[1]), int(r[2])
            print(f"  {dev:<12} views={views:>6} duração_média={dur}s")
    except Exception as e:
        print(f"  (sem dados: {e})")

    outfile = OUTPUT_DIR / f"analytics_{window}d_{end_date}.json"
    outfile.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\n✅ Relatório salvo: {outfile}")


if __name__ == "__main__":
    main()
