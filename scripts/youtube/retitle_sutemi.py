"""
retitle_sutemi.py — aplica template em ma-sutemi-waza (5) + yoko-sutemi-waza não-makikomi (5) = 10 vídeos.

Uso:
    python3 retitle_sutemi.py             # dry-run
    python3 retitle_sutemi.py --apply     # aplica
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


BASE_TAGS_COMMON = [
    "judo", "judô", "jūdō",
    "kodokan", "kōdōkan", "kodokan judo", "kōdōkan jūdō",
    "kodokan waza", "kōdōkan waza", "kodokan-waza",
    "nage-waza", "nagewaza", "técnicas de judô",
    "sutemi-waza", "sutemi", "sutemiwaza", "técnica de sacrifício",
    "100 kodokan waza", "100 técnicas de judo", "waza",
    "jigoro kano", "jigorō kanō",
    "luiz pavani", "profep", "judo365", "judô brasil", "judo brasil",
]


SUTEMI = {
    # === MA-SUTEMI-WAZA (sacrifícios frontais) ===
    "-lB58AsxAOQ": {
        "nome": "Tomoe-nage", "kanji": "巴投", "serie_pos": 75,
        "grupo_pt": "Ma-sutemi-waza (sacrifícios frontais)",
        "extra_group_tag": "ma-sutemi-waza",
        "desc": (
            "Tomoe-nage — \"arremesso em círculo\" (tomoe = espiral) — é a ma-sutemi-waza "
            "arquetípica: tori cai de costas enquanto apoia o pé no abdômen de uke para "
            "projetá-lo em parábola por cima da própria cabeça. Daigo (2005) a apresenta como "
            "a técnica paradigma da família sutemi frontal. De Crée (2026) documenta que "
            "Tomoe-nage é herança direta do Tenjin Shinyō-ryū — escola de Kanō — com o mesmo "
            "nome e mesmo kanji (巴投). Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["tomoe-nage", "tomoenage", "tomoe nage", "circle throw", "stomach throw", "ma-sutemi-waza", "tenjin shinyo-ryu", "巴投"],
    },
    "6sti1V9zDXk": {
        "nome": "Sumi-gaeshi", "kanji": "隅返", "serie_pos": 76,
        "grupo_pt": "Ma-sutemi-waza (sacrifícios frontais)",
        "extra_group_tag": "ma-sutemi-waza",
        "desc": (
            "Sumi-gaeshi — \"reversão de canto\" — é ma-sutemi-waza em que tori, após controlar "
            "uke com pegada cerrada, cai para trás usando o próprio pé na virilha/coxa interna "
            "do adversário para projetá-lo em diagonal. Daigo (2005) a classifica entre as "
            "técnicas de sacrifício clinch. De Crée (2026) documenta origem no ryō-mune-dori "
            "両胸捕 do Tenjin Shinyō-ryū. De Crée também registra que o kanji do nome mudou: "
            "1888 (Zakki de Kanō) usava 隅翻, hoje padronizou-se 隅返. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["sumi-gaeshi", "sumigaeshi", "sumi gaeshi", "corner reversal", "ma-sutemi-waza", "tenjin shinyo-ryu", "隅返"],
    },
    "7JS-Mg1tyQo": {
        "nome": "Hikikomi-gaeshi", "kanji": "引込返", "serie_pos": 77,
        "grupo_pt": "Ma-sutemi-waza · Habukareta-waza",
        "extra_group_tag": "ma-sutemi-waza",
        "desc": (
            "Hikikomi-gaeshi — \"reversão por puxar para dentro\" — é ma-sutemi-waza em que "
            "tori puxa uke em sua direção (hikikomi) enquanto cai para trás, usando a energia "
            "da puxada para projetá-lo. Daigo (2005) enfatiza o timing da puxada coordenada "
            "com a queda. Integra o grupo habukareta-waza — técnicas removidas do gokyō em "
            "1920 e reoficializadas em 1982."
        ),
        "specific_tags": ["hikikomi-gaeshi", "hikikomigaeshi", "hikikomi gaeshi", "pulling down reversal", "ma-sutemi-waza", "habukareta-waza", "引込返"],
    },
    "PUL3zvLqvP4": {
        "nome": "Tawara-gaeshi", "kanji": "俵返", "serie_pos": 78,
        "grupo_pt": "Ma-sutemi-waza · Habukareta-waza",
        "extra_group_tag": "ma-sutemi-waza",
        "desc": (
            "Tawara-gaeshi — \"reversão do saco de arroz\" (tawara = saco tradicional de arroz) "
            "— é ma-sutemi-waza em que tori agarra uke como se fosse um saco pesado, caindo "
            "para trás para projetá-lo em semi-círculo. Daigo (2005) destaca a imagem metafórica "
            "como chave biomecânica: o saco de arroz carregado é levantado e virado. Integra o "
            "grupo habukareta-waza — técnicas removidas do gokyō em 1920 e reoficializadas em 1982."
        ),
        "specific_tags": ["tawara-gaeshi", "tawaragaeshi", "tawara gaeshi", "rice bag reversal", "ma-sutemi-waza", "habukareta-waza", "俵返"],
    },
    "rISBA2-6Z2c": {
        "nome": "Ura-nage", "kanji": "裏投", "serie_pos": 79,
        "grupo_pt": "Ma-sutemi-waza (sacrifícios frontais)",
        "extra_group_tag": "ma-sutemi-waza",
        "desc": (
            "Ura-nage — \"arremesso pelas costas/inverso\" — é ma-sutemi-waza em que tori, ao "
            "absorver o ataque de uke, abraça-o pelas costas e cai para trás, projetando-o por "
            "cima do próprio corpo. Daigo (2005) a classifica entre as técnicas de contra-ataque "
            "mais dramáticas. De Crée (2026) documenta origem direta no Takenouchi Santō-ryū. "
            "Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["ura-nage", "uranage", "ura nage", "rear throw", "suplex", "ma-sutemi-waza", "takenouchi-ryu", "裏投"],
    },
    # === YOKO-SUTEMI-WAZA NÃO-MAKIKOMI (5) ===
    "MYw-7miCwgs": {
        "nome": "Yoko-guruma", "kanji": "横車", "serie_pos": 80,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "extra_group_tag": "yoko-sutemi-waza",
        "desc": (
            "Yoko-guruma — \"roda lateral\" — é yoko-sutemi-waza em que tori cai de lado, "
            "apoiando o pé na coxa interna de uke como eixo radial, para projetá-lo em rotação "
            "por cima de si. Daigo (2005) enfatiza o paralelo biomecânico com Tomoe-nage, mas "
            "em eixo lateral em vez de frontal. **A história do nome é reveladora:** o mesmo "
            "nome e mesmo kanji (横車) aparecem na linhagem Tenjin Shinyō-ryū — escola de Kanō — "
            "no manual de Yoshida & Isō Matauemon V de 1893, pelo menos 89 anos antes de o "
            "Kōdōkan oficializar a técnica. Caso arquetípico de preservação nominal integral."
        ),
        "specific_tags": ["yoko-guruma", "yokoguruma", "yoko guruma", "side wheel", "yoko-sutemi-waza", "tenjin shinyo-ryu", "横車"],
    },
    "Jz6nuq5RBUA": {
        "nome": "Yoko-gake", "kanji": "横掛", "serie_pos": 81,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "extra_group_tag": "yoko-sutemi-waza",
        "desc": (
            "Yoko-gake — \"fisga lateral\" — é yoko-sutemi-waza em que tori varre o pé de uke "
            "pela lateral enquanto cai de lado, usando o peso do próprio corpo em queda para "
            "derrubar o adversário. Daigo (2005) a coloca entre as ashi-sutemi mais sutis por "
            "depender de timing preciso do toque com o pé. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["yoko-gake", "yokogake", "yoko gake", "side hook", "yoko-sutemi-waza", "横掛"],
    },
    "zqHlmZqKFnE": {
        "nome": "Yoko-otoshi", "kanji": "横落", "serie_pos": 82,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "extra_group_tag": "yoko-sutemi-waza",
        "desc": (
            "Yoko-otoshi — \"queda lateral\" — é yoko-sutemi-waza em que tori cai de lado, "
            "usando o próprio corpo em queda como alavanca para derrubar uke na mesma direção. "
            "Daigo (2005) a classifica como técnica de sacrifício lateral puro, sem varredura "
            "de perna. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["yoko-otoshi", "yokootoshi", "yoko otoshi", "side drop", "yoko-sutemi-waza", "横落"],
    },
    "HHEVAowJDKM": {
        "nome": "Uki-waza", "kanji": "浮技", "serie_pos": 83,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "extra_group_tag": "yoko-sutemi-waza",
        "desc": (
            "Uki-waza — \"técnica flutuante\" — é yoko-sutemi-waza em que tori cai lateralmente "
            "sem contato substancial de perna, usando apenas a direção do kuzushi e o peso do "
            "próprio corpo como alavanca. Daigo (2005) a trata como expressão pura do princípio "
            "de jū em sacrifício. De Crée (2026) documenta origem no mizu-iri 水入 do Kitō-ryū "
            "— preservada no Itsutsu-no-Kata de Kanō. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["uki-waza", "ukiwaza", "uki waza", "floating technique", "yoko-sutemi-waza", "kito-ryu", "itsutsu-no-kata", "浮技"],
    },
    "WdpNX6hzZUc": {
        "nome": "Tani-otoshi", "kanji": "谷落", "serie_pos": 84,
        "grupo_pt": "Yoko-sutemi-waza (sacrifícios laterais)",
        "extra_group_tag": "yoko-sutemi-waza",
        "desc": (
            "Tani-otoshi — \"queda no vale\" — é yoko-sutemi-waza em que tori desliza por trás "
            "e lateralmente a uke, caindo de lado para arrastá-lo em queda semelhante a cair "
            "num vale. Daigo (2005) a classifica entre as técnicas de sacrifício lateral "
            "clássicas. **Herança direta do Kitō-ryū:** Todo et al. (2017) documentam Tani-otoshi "
            "谷落 como uma das 14 técnicas omote do Kitōryū-no-kata, com o mesmo nome e mesmo "
            "kanji — preservação integral através do estrato Kōdōkan. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["tani-otoshi", "taniotoshi", "tani otoshi", "valley drop", "yoko-sutemi-waza", "kito-ryu", "todo 2017", "谷落"],
    },
}


def build_description(vid: str) -> str:
    d = SUTEMI[vid]
    nome = d["nome"]
    kanji = d["kanji"]
    pos = d.get("serie_pos", "—")
    grupo = d["grupo_pt"]
    desc_tech = d["desc"]
    group_hashtag = d["extra_group_tag"].replace("-", "")

    lines = [
        f"{nome} — {kanji} — Vídeo {pos}/100 da série Kōdōkan-waza com Luiz Pavani (6º dan).",
        "",
        f"▶ O que é {nome}?",
        desc_tech,
        f"Grupo: {grupo}.",
        "",
        "⏱ Capítulos",
        "00:00 Introdução",
        "00:07 Primeira parte (demonstração)",
        "00:31 Segunda parte (análise)",
        "",
        "📚 Sobre a série Kōdōkan-waza",
        "Este vídeo integra o curso de waza do PROFEP — Programa de Formação e Especialização "
        "de Professores de Judô da Master Esportes — construído com base nos cursos oficiais "
        "de nage-waza e katame-waza do Kōdōkan Jūdō Institute (Tóquio).",
        "",
        "🎥 Vídeos originais: Kōdōkan e IJF Academy",
        "📖 Referência bibliográfica: Toshirō Daigo, Kodokan Judo Throwing Techniques "
        "(Kodansha, 2005) — referência máxima. Complementos: De Crée (2026, RAMA) e Todo "
        "et al. (2017, Kōdōkan Bulletin).",
        "🎙 Tradução, dublagem e comentários: Prof. Luiz Pavani",
        "",
        f"▶ Playlist completa da série: {PLAYLIST_URL}",
        "▶ Curso completo: https://www.profepmax.com.br/",
        "",
        "🥋 JUDO 365 — ciência e história do judô",
        "Canal do Prof. Luiz Pavani dedicado ao estudo sério do judô: kata, técnica, "
        "arbitragem, história, terminologia e filosofia — sempre com fonte e evidência.",
        "",
        "📺 Inscreva-se: https://www.youtube.com/@Judo365",
        "📷 Instagram: https://www.instagram.com/judo365plus",
        "🌐 Site: https://masteresportes.com",
        "",
        f"#judo #judo365 #kodokan #kodokanwaza #nagewaza #sutemiwaza #{group_hashtag} #{d['nome'].lower().replace('-','').replace('ō','o')} #luizpavani #profep",
    ]
    return "\n".join(lines)


def build_tags(vid: str) -> list[str]:
    d = SUTEMI[vid]
    specific = d.get("specific_tags", [])
    all_tags = specific + BASE_TAGS_COMMON
    seen = set()
    result = []
    for t in all_tags:
        if t.lower() not in seen:
            seen.add(t.lower())
            result.append(t)
    final: list[str] = []
    total = 0
    for t in result:
        cost = len(t) + 2
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
    print(f"== retitle_sutemi.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    current = fetch_current(yt, list(SUTEMI.keys()))

    diffs = []
    for vid in SUTEMI.keys():
        v = current.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado")
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
        after = {
            "title": before["title"],
            "description": build_description(vid),
            "tags": build_tags(vid),
            "categoryId": "17",
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR",
        }
        diffs.append((vid, before, after))

    for vid, before, after in diffs:
        print(f"=== {vid} — {after['title']} ===")
        print(f"  description: {len(before['description'])} → {len(after['description'])} chars")
        print(f"  tags:        {len(before['tags'])} → {len(after['tags'])} ({sum(len(t)+2 for t in after['tags'])}ch)")
        print(f"  lang:        {before['defaultLanguage']} → {after['defaultLanguage']}")
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
        for vid, before, after in batch:
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
                yt.videos().update(part="snippet", body=body).execute()
                success.append(vid)
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_sutemi",
                    "video_id": vid,
                    "title": after["title"],
                    "status": "ok",
                })
                print(f"  ✅ {vid}  {after['title'][:55]}")
            except HttpError as e:
                failed.append((vid, str(e)))
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_sutemi",
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
