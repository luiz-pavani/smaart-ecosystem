"""
retitle_makikomi.py — aplica template nível médio de metadata
(tags + descrição + categoria + idioma) nos 11 Makikomi recém-publicados.

TÍTULO NÃO É ALTERADO.

Uso:
    python3 retitle_makikomi.py                # dry-run
    python3 retitle_makikomi.py --apply        # aplica

Protocolo:
- --dry-run por default
- Batches de 10 com pausa de 5s
- Log append-only em logs/YYYY-MM-DD_operations.log
"""

import sys
import json
import time
from datetime import datetime
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from auth import get_credentials

SCRIPT_DIR = Path(__file__).parent
LOG_DIR = SCRIPT_DIR / "logs"
BATCH_SIZE = 10
BATCH_PAUSE_SEC = 5

PLAYLIST_KODOKAN_100 = "PL_W-L4uibyZ1GS4Oc3ls5D9e2ZHMs_Rip"
PLAYLIST_URL = f"https://www.youtube.com/playlist?list={PLAYLIST_KODOKAN_100}"

# Dados canônicos por vídeo:
# (serie_num, kanji, romaji_alt, categoria_waza, grupo_japones, is_kinshi, hashtag_tecnica)
MAKIKOMI = {
    "RAstabPzWdY": {
        "nome": "Ko-uchi-makikomi",
        "kanji": "小内巻込",
        "serie_pos": 66,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "kouchimakikomi",
        "descricao_extra": "Variação de sacrifício da família ko-uchi, na qual tori projeta uki envolvendo a perna de ataque sobre o alvo em queda lateral.",
    },
    "s-9Efo4Savk": {
        "nome": "Ō-soto-makikomi",
        "kanji": "大外巻込",
        "serie_pos": 67,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "osotomakikomi",
        "descricao_extra": "Versão em makikomi do ō-soto-gari: tori desequilibra uki para trás e entra em queda controlada para encaixar o sacrifício.",
    },
    "Tr1mN8dpEc4": {
        "nome": "Kani-basami",
        "kanji": "蟹挟",
        "serie_pos": 95,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais) · Kinshi-waza",
        "grupo_tag": "kinshi-waza",
        "is_kinshi": True,
        "hashtag": "kanibasami",
        "descricao_extra": "Técnica registrada no Kōdōkan e hoje PROIBIDA em competição (kinshi-waza) pelo risco de lesão ao joelho do uke. Apresentada aqui em contexto histórico-pedagógico.",
    },
    "n8sPVbCbqOU": {
        "nome": "Kawazu-gake",
        "kanji": "河津掛",
        "serie_pos": 96,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais) · Kinshi-waza",
        "grupo_tag": "kinshi-waza",
        "is_kinshi": True,
        "hashtag": "kawazugake",
        "descricao_extra": "Técnica registrada no Kōdōkan e hoje PROIBIDA em competição (kinshi-waza) por risco de lesão. Apresentada em contexto histórico-pedagógico.",
    },
    "yfmWUi5C4nk": {
        "nome": "Uchi-mata-makikomi",
        "kanji": "内股巻込",
        "serie_pos": 68,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "uchimatamakikomi",
        "descricao_extra": "Versão em makikomi do uchi-mata: tori envolve o braço de uke e se projeta lateralmente, levando ambos ao solo.",
    },
    "hd1oSaS0Vn4": {
        "nome": "Harai-makikomi",
        "kanji": "払巻込",
        "serie_pos": 69,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "haraimakikomi",
        "descricao_extra": "Versão em makikomi do harai-goshi: varredura quadril envolta em sacrifício lateral.",
    },
    "uGSb_eIH_f8": {
        "nome": "Hane-makikomi",
        "kanji": "跳巻込",
        "serie_pos": 70,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "hanemakikomi",
        "descricao_extra": "Versão em makikomi do hane-goshi: salto quadril combinado com sacrifício lateral.",
    },
    "8KX5XNpM3Nw": {
        "nome": "Uchi-makikomi",
        "kanji": "内巻込",
        "serie_pos": 71,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "uchimakikomi",
        "descricao_extra": "Sacrifício lateral com envolvimento interno do braço de uke — variação \"interna\" da família makikomi.",
    },
    "czhyn2iiRr0": {
        "nome": "Soto-makikomi",
        "kanji": "外巻込",
        "serie_pos": 72,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "sotomakikomi",
        "descricao_extra": "Sacrifício lateral com envolvimento externo do braço de uke — variação \"externa\" da família makikomi.",
    },
    "KV0lII3EnPM": {
        "nome": "Yoko-wakare",
        "kanji": "横分",
        "serie_pos": 73,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "yokowakare",
        "descricao_extra": "Sacrifício lateral clássico: tori cai de lado abrindo o corpo de uke em direção perpendicular ao eixo de combate.",
    },
    "kJmqlsLba5c": {
        "nome": "Daki-wakare",
        "kanji": "抱分",
        "serie_pos": 74,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "grupo_tag": "yoko-sutemi-waza",
        "is_kinshi": False,
        "hashtag": "dakiwakare",
        "descricao_extra": "Sacrifício lateral em que tori abraça uki pelo tronco antes da projeção em queda lateral.",
    },
}


BASE_TAGS_COMMON = [
    "judo", "judô", "jūdō",
    "kodokan", "kōdōkan", "kodokan judo", "kōdōkan jūdō",
    "kodokan waza", "kōdōkan waza", "kodokan-waza",
    "nage-waza", "nagewaza", "técnicas de judô",
    "makikomi", "sutemi-waza", "sutemi", "yoko-sutemi-waza", "yokosutemi",
    "100 kodokan waza", "100 técnicas de judo", "waza",
    "jigoro kano", "jigorō kanō",
    "luiz pavani", "profep", "judo365", "judô brasil", "judo brasil",
]


def build_description(vid: str) -> str:
    d = MAKIKOMI[vid]
    nome = d["nome"]
    kanji = d["kanji"]
    pos = d["serie_pos"]
    grupo = d["grupo_pt"]
    extra = d["descricao_extra"]

    lines = [
        f"{nome} — {kanji} — Vídeo {pos}/100 da série Kōdōkan-waza com Luiz Pavani (6º dan).",
        "",
        f"▶ O que é {nome}?",
        extra,
        f"Grupo: {grupo}.",
        "",
        "⏱ Capítulos",
        "00:00 Introdução",
        "00:07 Primeira parte (demonstração)",
        "00:42 Segunda parte (análise)",
        "",
        "📚 Sobre a série Kōdōkan-waza",
        "Este vídeo integra o curso de waza do PROFEP — Programa de Formação e Especialização de Professores de Judô da Master Esportes — construído com base nos cursos oficiais de nage-waza e katame-waza do Kōdōkan Jūdō Institute (Tóquio).",
        "",
        "🎥 Vídeos originais: Kōdōkan e IJF Academy",
        "📖 Referência bibliográfica: Toshirō Daigo, Kodokan Judo Throwing Techniques (Kodansha, 2005)",
        "🎙 Tradução, dublagem e comentários: Prof. Luiz Pavani",
        "",
        f"▶ Playlist completa da série: {PLAYLIST_URL}",
        "▶ Curso completo: https://www.profepmax.com.br/",
        "",
        "🥋 JUDO 365 — ciência e história do judô",
        "Canal do Prof. Luiz Pavani dedicado ao estudo sério do judô: kata, técnica, arbitragem, história, terminologia e filosofia — sempre com fonte e evidência.",
        "",
        "📺 Inscreva-se: https://www.youtube.com/@Judo365",
        "📷 Instagram: https://www.instagram.com/judo365plus",
        "🌐 Site: https://masteresportes.com",
        "",
        f"#judo #judo365 #kodokan #kodokanwaza #nagewaza #makikomi #{d['hashtag']} #yokosutemi #luizpavani #profep",
    ]
    return "\n".join(lines)


def build_tags(vid: str) -> list[str]:
    d = MAKIKOMI[vid]
    tech = d["nome"].lower()
    tech_nospace = tech.replace("-", "")
    tech_spaced = tech.replace("-", " ")
    grupo_tag = d["grupo_tag"]

    specific = [
        tech,
        tech_nospace,
        tech_spaced,
        d["hashtag"],
        grupo_tag,
    ]
    if d["is_kinshi"]:
        specific.extend(["kinshi-waza", "técnica proibida judo", "kani basami", "kawazu gake"])

    all_tags = specific + BASE_TAGS_COMMON
    # Dedupe preservando ordem
    seen = set()
    result = []
    for t in all_tags:
        if t.lower() not in seen:
            seen.add(t.lower())
            result.append(t)
    # Respeitar o limite de 500 chars total (YT exige)
    # Build até 490 chars safely
    final: list[str] = []
    total = 0
    for t in result:
        cost = len(t) + 2  # vírgula e espaço entre tags
        if total + cost > 490:
            break
        final.append(t)
        total += cost
    return final


def fetch_current(youtube, ids: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for i in range(0, len(ids), 50):
        batch = ids[i : i + 50]
        resp = (
            youtube.videos()
            .list(part="snippet,status,contentDetails", id=",".join(batch))
            .execute()
        )
        for v in resp["items"]:
            out[v["id"]] = v
    return out


def log_operation(log_file: Path, entry: dict) -> None:
    log_file.parent.mkdir(exist_ok=True, parents=True)
    with log_file.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def main() -> None:
    apply = "--apply" in sys.argv
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"== retitle_makikomi.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    current = fetch_current(yt, list(MAKIKOMI.keys()))

    diffs = []
    for vid in MAKIKOMI.keys():
        v = current.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado — pulo")
            continue
        s = v["snippet"]
        before = {
            "title": s["title"],
            "description": s.get("description", ""),
            "tags": s.get("tags", []),
            "categoryId": s.get("categoryId"),
            "defaultLanguage": s.get("defaultLanguage"),
            "defaultAudioLanguage": s.get("defaultAudioLanguage"),
        }
        new_desc = build_description(vid)
        new_tags = build_tags(vid)
        after = {
            "title": s["title"],  # mantém
            "description": new_desc,
            "tags": new_tags,
            "categoryId": "17",
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR",
        }
        diffs.append((vid, before, after, v))

    # Print diff
    for vid, before, after, _ in diffs:
        print(f"=== {vid} — {after['title']} ===")
        print(f"  description: {len(before['description'])} → {len(after['description'])} chars")
        print(f"  tags:        {len(before['tags'])} ({sum(len(t)+2 for t in before['tags'])}ch) → {len(after['tags'])} ({sum(len(t)+2 for t in after['tags'])}ch)")
        print(f"  categoryId:  {before['categoryId']} → {after['categoryId']}")
        print(f"  defaultLang: {before['defaultLanguage']} → {after['defaultLanguage']}")
        print(f"  audioLang:   {before['defaultAudioLanguage']} → {after['defaultAudioLanguage']}")
        print(f"  [primeiros 150ch da nova desc:]")
        print(f"    {after['description'][:150]}")
        print()

    if not apply:
        print("DRY-RUN — nada alterado. Rode com --apply para efetivar.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOG_DIR / f"{today}_operations.log"

    print(f"=== APLICANDO (batch={BATCH_SIZE}, pausa={BATCH_PAUSE_SEC}s) ===\n")
    success, failed = [], []

    for i in range(0, len(diffs), BATCH_SIZE):
        batch = diffs[i : i + BATCH_SIZE]
        print(f"Batch {i // BATCH_SIZE + 1} — {len(batch)} vídeos")
        for vid, before, after, v_full in batch:
            body = {
                "id": vid,
                "snippet": {
                    "title": after["title"],
                    "description": after["description"],
                    "tags": after["tags"],
                    "categoryId": after["categoryId"],
                    "defaultLanguage": after["defaultLanguage"],
                    "defaultAudioLanguage": after["defaultAudioLanguage"],
                },
            }
            try:
                resp = yt.videos().update(part="snippet", body=body).execute()
                success.append(vid)
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_makikomi",
                    "video_id": vid,
                    "title": after["title"],
                    "before": before,
                    "after_tags_count": len(after["tags"]),
                    "after_desc_len": len(after["description"]),
                    "status": "ok",
                })
                print(f"  ✅ {vid}  {after['title'][:60]}")
            except HttpError as e:
                failed.append((vid, str(e)))
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_makikomi",
                    "video_id": vid,
                    "title": after["title"],
                    "error": str(e),
                    "status": "error",
                })
                print(f"  ❌ {vid}  ERRO: {e}")

        if i + BATCH_SIZE < len(diffs):
            print(f"  (pausa {BATCH_PAUSE_SEC}s)\n")
            time.sleep(BATCH_PAUSE_SEC)

    print(f"\n=== RESUMO ===")
    print(f"Sucesso: {len(success)}")
    print(f"Falha:   {len(failed)}")
    print(f"Log:     {log_file}")


if __name__ == "__main__":
    main()
