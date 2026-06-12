"""
audit_unlisted.py — classifica os 37 unlisted em:
- GO PUBLIC (candidatos a publicar)
- KEEP UNLISTED (conteúdo interno/curso pago/etc)
- INVESTIGATE (precisa decisão humana)

Critério de GO PUBLIC:
- Título segue padrão "Nome-waza | Judo | Kodokan-waza" (série técnica canônica)
- Ou é vídeo educacional público por natureza (curso Kodokan, etc)
Critério de KEEP UNLISTED:
- Conteúdo de curso pago (PÓS-GRADUAÇÃO, MASTER CLASS, AULA X)
- Material interno/live-de-lançamento
- Contestação/instrução de plataforma
"""

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BACKUP_DIR = SCRIPT_DIR / "backups"


def latest_baseline() -> Path:
    return sorted(BACKUP_DIR.glob("*_baseline.json"))[-1]


def classify(video: dict) -> tuple[str, str]:
    title = video["snippet"]["title"]
    desc = video["snippet"].get("description", "")

    # Curso pago / conteúdo interno
    paid_patterns = [
        r"PÓS[- ]?GRAD",
        r"MASTER ?CLASS",
        r"AULA \d",
        r"LIVE DE LANÇAMENTO",
        r"CONTESTAÇÃO",
        r"Instruções para usar",
        r"Phoenix EC",
        r"POS JUDO",
    ]
    for p in paid_patterns:
        if re.search(p, title, re.IGNORECASE):
            return ("KEEP UNLISTED", f"conteúdo pago/interno: {p}")

    # Série Kodokan-waza canônica
    if re.search(r"\| Judo \| Kodokan-waza", title, re.IGNORECASE):
        return ("GO PUBLIC", "série técnica Kodokan-waza canônica")

    # Cursos oficiais Kodokan (são conteúdo de divulgação)
    if re.search(r"Curso Oficial.*Kodokan", title, re.IGNORECASE):
        return ("GO PUBLIC", "curso oficial Kodokan (educacional público)")

    if "YUKO AULA SAMPLE" in title:
        return ("KEEP UNLISTED", "sample promocional de produto")

    return ("INVESTIGATE", "classificação ambígua")


def main() -> None:
    data = json.loads(latest_baseline().read_text())
    unlisted = [v for v in data["videos"] if v["status"]["privacyStatus"] == "unlisted"]

    print(f"Total unlisted: {len(unlisted)}\n")

    go_public, keep, investigate = [], [], []
    for v in unlisted:
        decision, reason = classify(v)
        if decision == "GO PUBLIC":
            go_public.append((v, reason))
        elif decision == "KEEP UNLISTED":
            keep.append((v, reason))
        else:
            investigate.append((v, reason))

    print(f"=== 🟢 GO PUBLIC ({len(go_public)}) ===\n")
    for v, r in go_public:
        t = v["snippet"]["title"]
        d = v["snippet"]["publishedAt"][:10]
        vid = v["id"]
        stats = v.get("statistics", {})
        views = int(stats.get("viewCount", 0))
        likes = int(stats.get("likeCount", 0))
        print(f"  [{d}] {t}")
        print(f"    id={vid}  views={views}  likes={likes}  motivo: {r}\n")

    print(f"\n=== 🔒 KEEP UNLISTED ({len(keep)}) ===\n")
    for v, r in keep:
        t = v["snippet"]["title"]
        d = v["snippet"]["publishedAt"][:10]
        print(f"  [{d}] {t[:70]} | {r}")

    print(f"\n=== 🟡 INVESTIGATE ({len(investigate)}) ===\n")
    for v, r in investigate:
        t = v["snippet"]["title"]
        d = v["snippet"]["publishedAt"][:10]
        print(f"  [{d}] {t[:70]} | {r}")

    # Salva lista pronta para publish
    go_ids = [v["id"] for v, _ in go_public]
    outfile = SCRIPT_DIR / "output" / "go_public_list.json"
    outfile.write_text(json.dumps({"video_ids": go_ids, "titles": {v["id"]: v["snippet"]["title"] for v, _ in go_public}}, indent=2, ensure_ascii=False))
    print(f"\nLista GO PUBLIC salva em: {outfile}")


if __name__ == "__main__":
    main()
