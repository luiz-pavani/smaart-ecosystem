"""
retitle_ashiwaza.py — aplica template na família ashi-waza (19 vídeos).
Ko-uchi-gari é FREEZE (só tags novas, descrição/título intocados).

Uso:
    python3 retitle_ashiwaza.py             # dry-run
    python3 retitle_ashiwaza.py --apply     # aplica
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
    "ashi-waza", "ashiwaza", "técnica de perna",
    "100 kodokan waza", "100 técnicas de judo", "waza",
    "jigoro kano", "jigorō kanō",
    "luiz pavani", "profep", "judo365", "judô brasil", "judo brasil",
]


ASHIWAZA = {
    "k9e_X73o7-g": {
        "nome": "De-ashi-harai", "kanji": "出足払", "serie_pos": 27,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "De-ashi-harai — \"varrer o pé que avança\" — é a ashi-waza arquetípica: tori varre o "
            "pé de uke no exato momento em que este avança, interrompendo sua caminhada. Daigo "
            "(2005) a apresenta como técnica fundamental de timing (kake no instante do passo). "
            "De Crée (2026) documenta sua origem em duas fontes paralelas: o sukui-ashi スクイ足 "
            "do Tenjin Shinyō-ryū (escola de Kanō) e o ashi-harai 足払 do Totsuka-ha Yōshin-ryū. "
            "Abre o ikkyō do kyū gokyō de 1895."
        ),
        "specific_tags": ["de-ashi-harai", "deashiharai", "de ashi harai", "de-ashi-barai", "deashibarai", "advancing foot sweep", "tenjin shinyo-ryu", "gokyo", "出足払"],
    },
    "CBPsDDvd9PM": {
        "nome": "Tsubame-gaeshi", "kanji": "燕返", "serie_pos": 28,
        "grupo_pt": "Ashi-waza · Shinmeishō-no-waza",
        "desc": (
            "Tsubame-gaeshi — \"reversão da andorinha\" — é ashi-waza de contra-ataque contra a "
            "entrada de De-ashi-harai. Tori se antecipa, levanta o pé atacado e usa o mesmo gesto "
            "para varrer o pé de apoio de uke. O nome vem do movimento rápido da andorinha "
            "(tsubame) mudando de direção no voo. Daigo (2005) a destaca pela precisão temporal. "
            "Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["tsubame-gaeshi", "tsubamegaeshi", "tsubame gaeshi", "swallow reversal", "shinmeisho-no-waza", "燕返"],
    },
    "WkOLENKqxFY": {
        "nome": "Okuri-ashi-harai", "kanji": "送足払", "serie_pos": 29,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Okuri-ashi-harai — \"varrer o pé que persegue\" — é ashi-waza em que tori varre "
            "ambos os pés de uke durante movimento lateral em passos-arrasto (tsugi-ashi). Daigo "
            "(2005) classifica Okuri-ashi-harai como técnica de alta especialização no trabalho "
            "de ritmo e controle do centro de massa. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["okuri-ashi-harai", "okuriashiharai", "okuri ashi harai", "okuri-ashi-barai", "gokyo", "送足払"],
    },
    "iD3fPjYCDVQ": {
        "nome": "Ko-soto-gari", "kanji": "小外刈", "serie_pos": 30,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ko-soto-gari — \"pequena ceifa externa\" — é ashi-waza em que tori ceifa o calcanhar "
            "ou pé de uke pela parte externa da perna, enquanto empurra o torso em diagonal "
            "traseira. Daigo (2005) distingue Ko-soto-gari (ceifa) de Ko-soto-gake (fisga), "
            "pares biomecânicos frequentemente confundidos. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["ko-soto-gari", "kosotogari", "ko soto gari", "minor outer reap", "gokyo", "小外刈"],
    },
    "E7o5JUd2xPM": {
        "nome": "Ko-soto-gake", "kanji": "小外掛", "serie_pos": 31,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ko-soto-gake — \"pequena fisga externa\" — é ashi-waza em que tori prende "
            "(gake = fisgar) a perna de uke pela parte externa, projetando-o para trás. Daigo "
            "(2005) distingue Ko-soto-gake de Ko-soto-gari pelo mecanismo de prender vs ceifar. "
            "De Crée (2026) registra nobori-gake 登掛 do sumō como precursor. Foi acrescentada "
            "ao shin gokyō em 1920."
        ),
        "specific_tags": ["ko-soto-gake", "kosotogake", "ko soto gake", "minor outer hook", "gokyo", "小外掛"],
    },
    # FREEZE
    "s56NlwH4LFc": {
        "nome": "Ko-uchi-gari", "kanji": "小内刈", "serie_pos": 32,
        "freeze": True,
        "specific_tags": [
            "ko-uchi-gari", "kouchigari", "ko uchi gari", "kouchi gari",
            "minor inner reap", "shin gokyo", "ashi-waza", "小内刈",
        ],
    },
    "1bDOegrdPm0": {
        "nome": "Sasae-tsurikomi-ashi", "kanji": "支釣込足", "serie_pos": 33,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Sasae-tsurikomi-ashi — \"bloquear o pé em pesca-puxada\" — é ashi-waza em que tori "
            "bloqueia (sasae) o tornozelo de uke com a planta do próprio pé enquanto puxa e "
            "eleva (tsurikomi) para criar o arco de projeção. Daigo (2005) apresenta a técnica "
            "como exemplo fino de coordenação mãos-pé. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["sasae-tsurikomi-ashi", "sasaetsurikomiashi", "sasae tsurikomi ashi", "supporting foot lift", "gokyo", "支釣込足"],
    },
    "hV32waI-BLo": {
        "nome": "Harai-tsurikomi-ashi", "kanji": "払釣込足", "serie_pos": 34,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Harai-tsurikomi-ashi — \"varrer o pé em pesca-puxada\" — é ashi-waza que combina a "
            "varredura (harai) do pé com o movimento de pesca-puxada (tsurikomi) das mãos. Daigo "
            "(2005) classifica a técnica entre as ashi-waza de alta combinação braço-perna. Está "
            "no kyū gokyō de 1895."
        ),
        "specific_tags": ["harai-tsurikomi-ashi", "haraitsurikomiashi", "harai tsurikomi ashi", "sweeping drawing ankle throw", "gokyo", "払釣込足"],
    },
    "jFoNXRsmFaY": {
        "nome": "Hiza-guruma", "kanji": "膝車", "serie_pos": 35,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Hiza-guruma — \"roda do joelho\" — é ashi-waza em que tori bloqueia o joelho de uke "
            "com a planta do próprio pé, usando-o como eixo para girá-lo em trajetória circular. "
            "Daigo (2005) apresenta Hiza-guruma como uma das técnicas mais antigas e "
            "pedagogicamente fundamentais. Abre o ikkyō do kyū gokyō de 1895."
        ),
        "specific_tags": ["hiza-guruma", "hizaguruma", "hiza guruma", "knee wheel", "gokyo", "膝車"],
    },
    "yiDpC6wGiOc": {
        "nome": "Ashi-guruma", "kanji": "足車", "serie_pos": 36,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ashi-guruma — \"roda do pé\" — é ashi-waza em que tori usa a perna estendida como "
            "eixo radial enquanto gira o tronco de uke em torno dela. Daigo (2005) distingue "
            "Ashi-guruma de Harai-goshi pelo ponto de contato e pela ausência do quadril como "
            "pivô. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["ashi-guruma", "ashiguruma", "ashi guruma", "leg wheel", "gokyo", "足車"],
    },
    "Gl4tp29eLP4": {
        "nome": "Ō-guruma", "kanji": "大車", "serie_pos": 37,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ō-guruma — \"grande roda\" — é ashi-waza em que tori posiciona a perna estendida "
            "por trás e acima do joelho de uke, usando-a como eixo para um giro amplo. Daigo "
            "(2005) a diferencia de Ashi-guruma pela altura do ponto de contato. Foi acrescentada "
            "ao shin gokyō em 1920."
        ),
        "specific_tags": ["o-guruma", "oguruma", "o guruma", "ō-guruma", "ōguruma", "large wheel", "大車"],
    },
    "v25_YqBfLrg": {
        "nome": "Ō-soto-gari", "kanji": "大外刈", "serie_pos": 38,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ō-soto-gari — \"grande ceifa externa\" — é ashi-waza icônica em que tori ceifa a "
            "perna de apoio de uke pela parte externa, empurrando simultaneamente o torso em "
            "diagonal traseira. Daigo (2005) a coloca entre as técnicas mais fundamentais do "
            "judô competitivo. De Crée (2026) documenta sua origem no kama-koshi 鎌腰 do "
            "Totsuka-ha Yōshin-ryū. Citada por Isogai Hajime (1941) como uma das wazas "
            "pessoais de Kanō Jigorō nos primeiros anos do Kōdōkan. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["o-soto-gari", "osotogari", "o soto gari", "ō-soto-gari", "ōsotogari", "major outer reap", "totsuka-ha yoshin-ryu", "gokyo", "大外刈"],
    },
    "vbp2iUMH3gc": {
        "nome": "Ō-soto-otoshi", "kanji": "大外落", "serie_pos": 39,
        "grupo_pt": "Ashi-waza · Habukareta-waza",
        "desc": (
            "Ō-soto-otoshi — \"grande queda externa\" — é ashi-waza similar a Ō-soto-gari mas "
            "sem a ceifa: tori posiciona a perna por trás da perna de apoio de uke e projeta "
            "por queda. Daigo (2005) a distingue de Ō-soto-gari pela ausência do movimento "
            "ceifante. Integra o grupo habukareta-waza — técnicas removidas do gokyō em 1920 "
            "e reoficializadas em 1982."
        ),
        "specific_tags": ["o-soto-otoshi", "osotootoshi", "o soto otoshi", "ō-soto-otoshi", "major outer drop", "habukareta-waza", "大外落"],
    },
    "HXSMz7vbwMQ": {
        "nome": "Ō-soto-guruma", "kanji": "大外車", "serie_pos": 40,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ō-soto-guruma — \"grande roda externa\" — é ashi-waza em que tori varre ambas as "
            "pernas de uke simultaneamente pela parte externa, usando a perna estendida como "
            "eixo. Daigo (2005) destaca sua amplitude biomecânica. De Crée (2026) documenta "
            "origem no mata-futsu 股払 do Tenjin Shinyō-ryū (escola de Kanō). Foi acrescentada "
            "ao shin gokyō em 1920."
        ),
        "specific_tags": ["o-soto-guruma", "osotoguruma", "o soto guruma", "ō-soto-guruma", "major outer wheel", "tenjin shinyo-ryu", "大外車"],
    },
    "dbZs6qgcJNU": {
        "nome": "Ō-soto-gaeshi", "kanji": "大外返", "serie_pos": 41,
        "grupo_pt": "Ashi-waza · Shinmeishō-no-waza",
        "desc": (
            "Ō-soto-gaeshi — \"reversão do Ō-soto\" — é ashi-waza de contra-ataque específica "
            "contra a entrada de Ō-soto-gari. Tori absorve o ataque, reverte o eixo e projeta "
            "uke no sentido oposto. Daigo (2005) apresenta a técnica como espelho inverso do "
            "próprio Ō-soto-gari. Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["o-soto-gaeshi", "osotogaeshi", "o soto gaeshi", "ō-soto-gaeshi", "major outer counter", "shinmeisho-no-waza", "大外返"],
    },
    "zZZjXrddQsg": {
        "nome": "Ō-uchi-gari", "kanji": "大内刈", "serie_pos": 42,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Ō-uchi-gari — \"grande ceifa interna\" — é ashi-waza em que tori ceifa a parte "
            "interna da perna de uke, empurrando o torso em direção traseira oblíqua. Daigo "
            "(2005) a coloca entre as técnicas mais usadas em competição. De Crée (2026) "
            "documenta origem no uchi-gake 大内掛 do sumō antigo. Foi acrescentada ao shin "
            "gokyō em 1920 — não estava no kyū gokyō de 1895."
        ),
        "specific_tags": ["o-uchi-gari", "ouchigari", "o uchi gari", "ō-uchi-gari", "major inner reap", "shin gokyo", "大内刈"],
    },
    "JMQzmOrNgOs": {
        "nome": "Ō-uchi-gaeshi", "kanji": "大内返", "serie_pos": 43,
        "grupo_pt": "Ashi-waza · Shinmeishō-no-waza",
        "desc": (
            "Ō-uchi-gaeshi — \"reversão do Ō-uchi\" — é ashi-waza de contra-ataque específica "
            "contra a entrada de Ō-uchi-gari. Daigo (2005) apresenta a técnica como espelho "
            "inverso do próprio Ō-uchi-gari. Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["o-uchi-gaeshi", "ouchigaeshi", "o uchi gaeshi", "ō-uchi-gaeshi", "shinmeisho-no-waza", "大内返"],
    },
    "YNT8k6ddeSA": {
        "nome": "Uchi-mata", "kanji": "内股", "serie_pos": 44,
        "grupo_pt": "Ashi-waza (técnicas de perna)",
        "desc": (
            "Uchi-mata — \"entre as coxas\" — é ashi-waza em que tori varre a parte interna da "
            "coxa de uke com a face posterior da própria perna, em movimento ascendente. Daigo "
            "(2005) trata Uchi-mata como técnica-assinatura do judô moderno, com três variações "
            "clássicas (ko-uchi-mata, ō-uchi-mata, taka-uchi-mata) já documentadas no Zakki "
            "manuscrito de Kanō de 1888. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["uchi-mata", "uchimata", "uchi mata", "inner thigh throw", "zakki 1888", "gokyo", "内股"],
    },
    "DWHxD5s-CVM": {
        "nome": "Uchi-mata-gaeshi", "kanji": "内股返", "serie_pos": 45,
        "grupo_pt": "Ashi-waza · Shinmeishō-no-waza",
        "desc": (
            "Uchi-mata-gaeshi — \"reversão do Uchi-mata\" — é ashi-waza de contra-ataque "
            "específica contra a entrada de Uchi-mata. Difere de Uchi-mata-sukashi (te-waza) "
            "pelo mecanismo: enquanto o sukashi evita o ataque por esquiva, o gaeshi absorve "
            "o ataque e o reverte. Daigo (2005) apresenta a distinção como ponto crítico de "
            "classificação técnica. Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["uchi-mata-gaeshi", "uchimatagaeshi", "uchi mata gaeshi", "inner thigh counter", "shinmeisho-no-waza", "内股返"],
    },
    "QE5WTLiYy2Y": {
        "nome": "Hane-goshi-gaeshi", "kanji": "跳腰返", "serie_pos": 46,
        "grupo_pt": "Ashi-waza · Shinmeishō-no-waza",
        "desc": (
            "Hane-goshi-gaeshi — \"reversão do Hane-goshi\" — é ashi-waza de contra-ataque "
            "específica contra a entrada de Hane-goshi. Daigo (2005) a classifica entre as "
            "técnicas de contra-ataque tardias incorporadas ao corpus oficial. "
            "Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["hane-goshi-gaeshi", "hanegoshigaeshi", "hane goshi gaeshi", "shinmeisho-no-waza", "跳腰返"],
    },
    "CgkVT_MmWSw": {
        "nome": "Harai-goshi-gaeshi", "kanji": "払腰返", "serie_pos": 47,
        "grupo_pt": "Ashi-waza · Shinmeishō-no-waza",
        "desc": (
            "Harai-goshi-gaeshi — \"reversão do Harai-goshi\" — é ashi-waza de contra-ataque "
            "específica contra a entrada de Harai-goshi. Daigo (2005) apresenta a técnica como "
            "uma das reversões mais complexas por exigir leitura precisa da rotação inicial "
            "de tori. Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["harai-goshi-gaeshi", "haraigoshigaeshi", "harai goshi gaeshi", "shinmeisho-no-waza", "払腰返"],
    },
}


def build_description(vid: str) -> str:
    d = ASHIWAZA[vid]
    nome = d["nome"]
    kanji = d["kanji"]
    pos = d.get("serie_pos", "—")
    grupo = d["grupo_pt"]
    desc_tech = d["desc"]

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
        f"#judo #judo365 #kodokan #kodokanwaza #nagewaza #ashiwaza #{d['nome'].lower().replace('-','').replace('ō','o')} #luizpavani #profep",
    ]
    return "\n".join(lines)


def build_tags(vid: str) -> list[str]:
    d = ASHIWAZA[vid]
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
    print(f"== retitle_ashiwaza.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    current = fetch_current(yt, list(ASHIWAZA.keys()))

    diffs = []
    for vid in ASHIWAZA.keys():
        v = current.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado")
            continue
        s = v["snippet"]
        d = ASHIWAZA[vid]
        before = {
            "title": s["title"],
            "description": s.get("description", ""),
            "tags": s.get("tags", []),
            "categoryId": s.get("categoryId"),
            "defaultLanguage": s.get("defaultLanguage"),
            "defaultAudioLanguage": s.get("defaultAudioLanguage"),
        }

        if d.get("freeze"):
            merged = list(before["tags"]) + d["specific_tags"] + BASE_TAGS_COMMON
            seen = set()
            dedup = []
            for t in merged:
                if t.lower() not in seen:
                    seen.add(t.lower())
                    dedup.append(t)
            final: list[str] = []
            total = 0
            for t in dedup:
                cost = len(t) + 2
                if total + cost > 490:
                    break
                final.append(t)
                total += cost
            after = {
                "title": before["title"],
                "description": before["description"],
                "tags": final,
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mode_label = "FREEZE (tags only)"
        else:
            after = {
                "title": before["title"],
                "description": build_description(vid),
                "tags": build_tags(vid),
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mode_label = "TEMPLATE"

        diffs.append((vid, before, after, mode_label))

    for vid, before, after, mlabel in diffs:
        print(f"=== [{mlabel}] {vid} — {after['title']} ===")
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
        for vid, before, after, mlabel in batch:
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
                    "op": "retitle_ashiwaza",
                    "mode": mlabel,
                    "video_id": vid,
                    "title": after["title"],
                    "status": "ok",
                })
                print(f"  ✅ [{mlabel}] {vid}  {after['title'][:55]}")
            except HttpError as e:
                failed.append((vid, str(e)))
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_ashiwaza",
                    "mode": mlabel,
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
