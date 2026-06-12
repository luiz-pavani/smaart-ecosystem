"""
retitle_b2_b37.py — onda final 2026-05-03:
- B2: top 10 vídeos fora da série Kodokan-waza (9 FREEZE-tags + 1 TEMPLATE)
- B3.7: série "Técnicas Semelhantes" (6 vídeos, todos TEMPLATE)

FREEZE = só merge tags (descrição + título intocados)
TEMPLATE = template completo nível médio (título intocado, descrição + tags + idioma + categoria)

Uso:
    python3 retitle_b2_b37.py             # dry-run
    python3 retitle_b2_b37.py --apply     # aplica
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
PLAYLIST_KODOKAN_URL = f"https://www.youtube.com/playlist?list={PLAYLIST_KODOKAN_100}"
PLAYLIST_TS = "PL_W-L4uibyZ0NM4EXZoceAxBIoyrRHJFK"
PLAYLIST_TS_URL = f"https://www.youtube.com/playlist?list={PLAYLIST_TS}"


BASE_TAGS_COMMON = [
    "judo", "judô", "jūdō",
    "kodokan", "kōdōkan", "kodokan judo", "kōdōkan jūdō",
    "técnicas de judô", "100 técnicas de judo",
    "jigoro kano", "jigorō kanō",
    "luiz pavani", "profep", "judo365", "judô brasil", "judo brasil",
]


# ============================================================
# B2 — TOP 10 FORA DA SÉRIE
# ============================================================

B2 = {
    # === FREEZE-TAGS — 9 vídeos que já performam, só engordar tags ===
    "0FLrF_tPziI": {
        "nome": "Nage-no-Kata", "freeze": True,
        "specific_tags": [
            "nage-no-kata", "nagenokata", "nage no kata", "nage no kata judo",
            "nage no kata judo kodokan", "nage no kata kodokan", "kodokan nage no kata",
            "kata", "kata judo", "judo kata", "kata jūdō",
            "投の形", "投の形 講道館",
            "nage no kata em portugues", "nage no kata dublado",
            "kata de arremesso", "primeiro kata judo",
            "te-waza no kata", "koshi-waza no kata", "ashi-waza no kata",
            "ma-sutemi-waza no kata", "yoko-sutemi-waza no kata",
            "uki-otoshi", "seoi-nage", "kata-guruma", "uki-goshi", "harai-goshi",
            "tsurikomi-goshi", "okuri-ashi-harai", "sasae-tsurikomi-ashi",
            "uchi-mata", "tomoe-nage", "ura-nage", "sumi-gaeshi",
            "yoko-gake", "yoko-guruma", "uki-waza",
        ],
    },
    "dJHpEaK1L3A": {
        "nome": "Kodokan Goshin-Jutsu", "freeze": True,
        "specific_tags": [
            "kodokan goshin jutsu", "kodokan goshin-jutsu", "goshin jutsu", "goshin-jutsu",
            "goshin jutsu kodokan", "kodokan goshin jutsu portugues", "kodokan goshin jutsu dublado",
            "kata goshin jutsu", "講道館護身術", "護身術",
            "defesa pessoal judo", "kata de defesa pessoal",
            "kata moderno judo", "self defense judo",
            "shomen tsuki", "shomen uchi", "yoko uchi", "ushiro dori",
            "tsuki age", "kata tanto", "kata jo", "kata pistola",
            "12 ataques goshin jutsu", "9 ataques sem armas", "12 com armas",
        ],
    },
    "5LHJ2mPNcOY": {
        "nome": "A História das Graduações no Judô e nas Artes Marciais", "freeze": True,
        "specific_tags": [
            "historia das graduacoes", "história das graduações", "graduacoes judo",
            "graduações judô", "kyu dan", "kyu e dan", "faixas judo", "faixa preta judo",
            "primeiro dan judo", "shodan", "primeira faixa preta",
            "graduacoes artes marciais", "graduações artes marciais",
            "yamashita yoshitsugu", "tomita tsunejiro", "saigo shiro",
            "10o dan judo", "decimo dan judo", "judan",
            "história do judo", "história do judô", "judo history", "kodokan dan system",
            "faixa branca preta", "obi judo", "graduação kodokan",
        ],
    },
    "Yv4O1jxjHDc": {
        "nome": "Curso de História do Judô - Aula 1", "freeze": True,
        "specific_tags": [
            "curso historia do judo", "curso história do judô",
            "aula de historia do judo", "história do judô completa",
            "historia do judo do começo", "judo history portuguese", "judo history class",
            "jigoro kano biografia", "kano biografia", "fundador judo",
            "kodokan fundacao", "fundação kodokan", "1882 kodokan",
            "kito-ryu", "kitō-ryū", "tenjin shinyo-ryu", "iikubo kunichi",
            "fukuda hachinosuke", "iso masatomo",
            "aula historia judo", "judo brasil história",
        ],
    },
    "rVOGGAVkIEg": {
        "nome": "Curso de Terminologia do Judô", "freeze": True,
        "specific_tags": [
            "terminologia do judo", "terminologia do judô", "terminologia judo",
            "vocabulário judo", "vocabulário judô", "glossário judo",
            "termos do judo", "termos do judô", "japones do judo", "japonês do judô",
            "ippon", "wazari", "yuko", "shido", "hansoku make",
            "tori uke", "kuzushi tsukuri kake", "rei", "obi", "judogi",
            "tatame", "dojo", "dōjō", "shomen", "joseki",
            "rōmaji judo", "kanji judo", "pronuncia japones judo",
            "como pronunciar judo", "judo nomenclatura",
        ],
    },
    "Qz34PAAfT-A": {
        "nome": "Kodokan Nage-no-Kata [dublado em português]", "freeze": True,
        "specific_tags": [
            "kodokan nage no kata", "nage no kata dublado", "nage no kata portugues",
            "nage no kata judo kodokan", "kata de arremesso kodokan",
            "investidura nage no kata", "nage-no-kata oficial kodokan",
            "kata 1 judo", "primeiro kata judo", "投の形",
            "tsukikomi", "uchikomi", "kake", "tsukuri", "kuzushi",
            "kata judo kodokan oficial", "luiz pavani nage no kata",
            "judo kata em portugues", "kata judo brasileiro",
        ],
    },
    "mnwn0nZW9I4": {
        "nome": "Kihon-dosa | Fundamentos do Judô", "freeze": True,
        "specific_tags": [
            "kihon-dosa", "kihondosa", "kihon dosa", "fundamentos do judo",
            "fundamentos do judô", "basico do judo", "básico do judô",
            "shisei", "shintai", "kumi-kata", "kumikata",
            "tsugi-ashi", "ayumi-ashi", "tai-sabaki", "taisabaki",
            "ukemi", "ushiro ukemi", "yoko ukemi", "mae ukemi",
            "movimentação judo", "deslocamento judo", "postura judo",
            "primeiros passos judo", "iniciante judo", "judo para iniciantes",
            "基本動作", "judo aula 1",
        ],
    },
    "XjfiR-jurMA": {
        "nome": "Dicionário do Judô: o que é o Nihonden Kōdōkan Jūdō", "freeze": True,
        "specific_tags": [
            "nihonden kodokan judo", "nihonden kōdōkan jūdō", "日本伝講道館柔道",
            "kodokan judo definicao", "o que e judo", "o que é judô",
            "definicao de judo kano", "kano definicao judo",
            "iikubo menkyo", "kitō-ryū jūdō", "kitoryu judo",
            "1724 jikishin-ryu jūdō", "origem palavra judo",
            "etimologia judo", "etimologia jūdō", "jū dō significado",
            "dicionário judo", "verbete judo",
        ],
    },
    "sCu2oSvTOXE": {
        "nome": "A História das Graduações do Judô Feminino", "freeze": True,
        "specific_tags": [
            "graduacoes judo feminino", "graduações judô feminino",
            "judo feminino", "judô feminino", "joshi judo", "joshi-bu",
            "fukuda keiko", "keiko fukuda", "noritomi masako",
            "judô feminino kodokan", "obi vermelho feminino",
            "primeira mulher 10 dan judo", "mulher judo história",
            "history women judo", "feminismo judo",
            "10o dan feminino", "joshi-bu kodokan", "1923 joshi bu",
        ],
    },
    # === TEMPLATE COMPLETO — 1 vídeo (0 tags hoje, descrição pobre) ===
    "gJBBkMLLnzY": {
        "nome": "A Data de Nascimento de Jigoro Kano",
        "freeze": False,
        "kanji": "嘉納治五郎",
        "desc": (
            "A data de nascimento de Jigorō Kanō (嘉納治五郎), fundador do jūdō Kōdōkan, é "
            "tradicionalmente comemorada em 28 de outubro de 1860 — mas a história tem uma "
            "camada filológica curiosa. Neste vídeo, o Prof. Luiz Pavani (6º dan) examina o "
            "calendário lunar tradicional japonês usado até a Restauração Meiji, mostra como "
            "a data \"original\" segundo o calendário antigo seria 10º mês dia 28 do ano "
            "Manen 1, e explica por que a conversão para o calendário gregoriano fixou 28 de "
            "outubro como data oficial. Tópico clássico de divulgação histórica do judô, com "
            "implicações até hoje quando se celebra o Dia do Judô e o aniversário do fundador."
        ),
        "specific_tags": [
            "jigoro kano", "jigorō kanō", "kano jigoro", "嘉納治五郎",
            "data de nascimento jigoro kano", "aniversario jigoro kano",
            "28 de outubro 1860", "28 outubro kano",
            "fundador do judo", "fundador judô", "fundador kodokan",
            "manen 1", "calendario lunar japones", "calendário lunar japonês",
            "restauracao meiji", "restauração meiji",
            "biografia kano", "história kano", "kano historia",
            "dia do judo", "dia do judô", "judo day",
            "kanō shihan", "shihan kano",
            "1860 japao", "mikage kobe",
        ],
    },
}


# ============================================================
# B3.7 — TÉCNICAS SEMELHANTES (6)
# ============================================================

TECNICAS_SEMELHANTES = {
    "PTCag3dH7f4": {
        "nome": "Uki-goshi e Ō-goshi",
        "subtitulo": "Técnicas Semelhantes #1",
        "kanji_pair": "浮腰 × 大腰",
        "desc": (
            "Uki-goshi 浮腰 e Ō-goshi 大腰 são duas koshi-waza que se confundem no início do "
            "estudo: ambas projetam uke por cima do quadril em rotação frontal. Mas há "
            "diferenças biomecânicas precisas entre as duas, e Daigo (2005) trata cada uma "
            "como técnica autônoma com função pedagógica distinta. Neste vídeo o Prof. Luiz "
            "Pavani (6º dan) demonstra lado a lado a diferença de altura do quadril, "
            "amplitude de contato, função dos braços e trajetória de queda — desfazendo a "
            "confusão mais comum entre essas duas técnicas-pilar do judô. Uki-goshi tem "
            "valor histórico extra: foi uma das três wazas pessoais usadas pelo próprio "
            "Kanō Jigorō em randori, segundo testemunho de Isogai Hajime (Jūdō Zasshi, 1941)."
        ),
        "specific_tags": [
            "uki-goshi", "ukigoshi", "uki goshi",
            "o-goshi", "ogoshi", "o goshi", "ō-goshi",
            "uki-goshi e o-goshi", "uki-goshi vs o-goshi",
            "diferenca uki-goshi o-goshi", "diferença uki-goshi ō-goshi",
            "tecnicas semelhantes judo", "técnicas semelhantes judô",
            "koshi-waza", "koshiwaza", "tecnica de quadril",
            "kano jigoro waza", "isogai 1941",
            "浮腰", "大腰",
        ],
    },
    "YWunOEFWsOk": {
        "nome": "De-ashi-harai e Ko-soto-gari",
        "subtitulo": "Técnicas Semelhantes #2",
        "kanji_pair": "出足払 × 小外刈",
        "desc": (
            "De-ashi-harai 出足払 e Ko-soto-gari 小外刈 são duas ashi-waza frequentemente "
            "confundidas: ambas atuam sobre o pé/perna externa de uke. A diferença está no "
            "mecanismo (varredura vs ceifa), no momento do passo e no ponto exato de "
            "contato. Daigo (2005) classifica as duas separadamente. Neste vídeo o Prof. "
            "Luiz Pavani (6º dan) demonstra lado a lado as duas técnicas, mostrando o "
            "instante exato em que cada uma deve ser aplicada e por que o mesmo gesto, "
            "com timing diferente, gera técnicas diferentes. De-ashi-harai abre o ikkyō "
            "do kyū gokyō de 1895 — é uma das técnicas-fundação do gokyō moderno."
        ),
        "specific_tags": [
            "de-ashi-harai", "deashiharai", "de ashi harai", "de-ashi-barai", "deashibarai",
            "ko-soto-gari", "kosotogari", "ko soto gari",
            "de-ashi-harai e ko-soto-gari", "de-ashi-harai vs ko-soto-gari",
            "diferenca de-ashi-harai ko-soto-gari",
            "tecnicas semelhantes judo", "técnicas semelhantes judô",
            "ashi-waza", "ashiwaza", "tecnica de perna",
            "出足払", "小外刈", "gokyo",
        ],
    },
    "NsY-qXgc4bs": {
        "nome": "Sumi-gaeshi e Hikikomi-gaeshi",
        "subtitulo": "Técnicas Semelhantes #3",
        "kanji_pair": "隅返 × 引込返",
        "desc": (
            "Sumi-gaeshi 隅返 e Hikikomi-gaeshi 引込返 são duas ma-sutemi-waza que partem da "
            "mesma família funcional — sacrifícios frontais com puxada — mas se distinguem "
            "no mecanismo de queda e no uso do pé. Daigo (2005) trata cada uma como técnica "
            "autônoma; Hikikomi-gaeshi inclusive integra o grupo habukareta-waza (técnicas "
            "removidas do gokyō em 1920 e reoficializadas em 1982). Neste vídeo o Prof. "
            "Luiz Pavani (6º dan) demonstra lado a lado as duas técnicas, esclarecendo a "
            "confusão mais comum em ne-waza moderno. Sumi-gaeshi tem origem documentada no "
            "ryō-mune-dori 両胸捕 do Tenjin Shinyō-ryū, escola de Kanō (De Crée 2026)."
        ),
        "specific_tags": [
            "sumi-gaeshi", "sumigaeshi", "sumi gaeshi",
            "hikikomi-gaeshi", "hikikomigaeshi", "hikikomi gaeshi",
            "sumi-gaeshi e hikikomi-gaeshi",
            "diferenca sumi-gaeshi hikikomi-gaeshi",
            "tecnicas semelhantes judo", "técnicas semelhantes judô",
            "ma-sutemi-waza", "masutemi", "sutemi-waza", "sutemi",
            "habukareta-waza", "tenjin shinyo-ryu",
            "隅返", "引込返",
        ],
    },
    "qhIKofHkLRs": {
        "nome": "Ō-goshi e Tsuri-goshi",
        "subtitulo": "Técnicas Semelhantes #4",
        "kanji_pair": "大腰 × 釣腰",
        "desc": (
            "Ō-goshi 大腰 e Tsuri-goshi 釣腰 são duas koshi-waza que se confundem pela posição "
            "frontal de quadril — a diferença está no ponto de pegada (lapela vs obi por trás) "
            "e no tipo de elevação produzida. Daigo (2005) descreve Tsuri-goshi em duas "
            "subformas (ko-tsuri-goshi e ō-tsuri-goshi) conforme o nível da pegada no obi. "
            "Neste vídeo o Prof. Luiz Pavani (6º dan) demonstra lado a lado as duas técnicas, "
            "esclarecendo a confusão pedagógica mais comum sobre a função do quadril em "
            "técnica de elevação (tsuri = pescar/elevar)."
        ),
        "specific_tags": [
            "o-goshi", "ogoshi", "o goshi", "ō-goshi",
            "tsuri-goshi", "tsurigoshi", "tsuri goshi",
            "o-goshi e tsuri-goshi", "diferenca o-goshi tsuri-goshi",
            "tecnicas semelhantes judo", "técnicas semelhantes judô",
            "koshi-waza", "koshiwaza", "tecnica de quadril",
            "ko-tsuri-goshi", "o-tsuri-goshi",
            "大腰", "釣腰",
        ],
    },
    "Sf_i72QcUAQ": {
        "nome": "De-ashi-harai e Okuri-ashi-harai",
        "subtitulo": "Técnicas Semelhantes #5",
        "kanji_pair": "出足払 × 送足払",
        "desc": (
            "De-ashi-harai 出足払 e Okuri-ashi-harai 送足払 são duas ashi-waza de varredura que "
            "se distinguem pelo timing e pelo número de pés varridos. De-ashi-harai varre "
            "um pé no momento exato do avanço; Okuri-ashi-harai varre ambos os pés durante "
            "movimento lateral em passos-arrasto. Daigo (2005) classifica as duas como "
            "técnicas paradigmáticas de timing. Neste vídeo o Prof. Luiz Pavani (6º dan) "
            "demonstra lado a lado as duas, mostrando o instante crítico em que cada uma "
            "deve ser aplicada. Ambas estão no kyū gokyō de 1895."
        ),
        "specific_tags": [
            "de-ashi-harai", "deashiharai", "de ashi harai", "de-ashi-barai",
            "okuri-ashi-harai", "okuriashiharai", "okuri ashi harai", "okuri-ashi-barai",
            "de-ashi-harai e okuri-ashi-harai",
            "diferenca de-ashi-harai okuri-ashi-harai",
            "tecnicas semelhantes judo", "técnicas semelhantes judô",
            "ashi-waza", "ashiwaza", "tecnica de perna",
            "出足払", "送足払", "gokyo",
        ],
    },
    "4wbgXAPxw7Y": {
        "nome": "Ko-soto-gari e Ko-soto-gake",
        "subtitulo": "Técnicas Semelhantes #6",
        "kanji_pair": "小外刈 × 小外掛",
        "desc": (
            "Ko-soto-gari 小外刈 e Ko-soto-gake 小外掛 são par biomecânico clássico que se "
            "distingue exatamente pela ação da perna: gari (ceifar) vs gake (fisgar). "
            "Daigo (2005) trata explicitamente a distinção como ponto crítico de ensino — "
            "muitos praticantes confundem o gesto sem perceber que o mecanismo é diferente. "
            "De Crée (2026) registra origem do Ko-soto-gake no nobori-gake 登掛 do sumō "
            "antigo. Neste vídeo o Prof. Luiz Pavani (6º dan) demonstra lado a lado as "
            "duas técnicas, esclarecendo a confusão mais comum entre os dois mecanismos."
        ),
        "specific_tags": [
            "ko-soto-gari", "kosotogari", "ko soto gari",
            "ko-soto-gake", "kosotogake", "ko soto gake",
            "ko-soto-gari e ko-soto-gake",
            "diferenca ko-soto-gari ko-soto-gake",
            "tecnicas semelhantes judo", "técnicas semelhantes judô",
            "ashi-waza", "ashiwaza", "tecnica de perna",
            "gake vs gari", "ceifar vs fisgar",
            "小外刈", "小外掛", "sumo origem",
        ],
    },
}


def build_description_b2_template(vid: str) -> str:
    """Para o vídeo gJBBkMLLnzY (Data Nascimento Kano) — único TEMPLATE em B2."""
    d = B2[vid]
    nome = d["nome"]
    kanji = d["kanji"]
    desc_tech = d["desc"]

    lines = [
        f"{nome} — {kanji}",
        "",
        "▶ Sobre este vídeo",
        desc_tech,
        "",
        "📚 Sobre o canal",
        "Vídeo do Prof. Luiz Pavani (6º dan, Árbitro Internacional A, Treinador Avançado "
        "EJU/IJF Nível 3) dedicado ao estudo sério da história e filosofia do jūdō Kōdōkan, "
        "sempre com fonte e evidência.",
        "",
        "📖 Referências bibliográficas e fontes históricas",
        "Para fontes primárias e secundárias específicas sobre Jigorō Kanō, recomendamos: "
        "Motohashi (2019, Kōdōkan Bulletin) — transcrição do manuscrito *Jūdō Zakki* 1888; "
        "De Crée (2026, RAMA) — síntese histórica do gokyō-no-waza; Daigo (2005, Kodansha) "
        "— Kodokan Judo Throwing Techniques.",
        "",
        "🥋 JUDO 365 — ciência e história do judô",
        "Canal do Prof. Luiz Pavani dedicado ao estudo sério do judô: kata, técnica, "
        "arbitragem, história, terminologia e filosofia — sempre com fonte e evidência.",
        "",
        "📺 Inscreva-se: https://www.youtube.com/@Judo365",
        "📷 Instagram: https://www.instagram.com/judo365plus",
        "🌐 Site: https://masteresportes.com",
        "",
        "#judo #judo365 #kodokan #jigorokano #historiajudo #luizpavani #profep",
    ]
    return "\n".join(lines)


def build_description_b37(vid: str) -> str:
    """Template para a série Técnicas Semelhantes."""
    d = TECNICAS_SEMELHANTES[vid]
    nome = d["nome"]
    sub = d["subtitulo"]
    kanji = d["kanji_pair"]
    desc_tech = d["desc"]

    lines = [
        f"{nome} — {kanji} — {sub} | Série Técnicas Semelhantes com Luiz Pavani (6º dan).",
        "",
        f"▶ Sobre este vídeo",
        desc_tech,
        "",
        "⏱ Capítulos",
        "00:00 Introdução",
        "00:05 Primeira técnica",
        "01:00 Segunda técnica",
        "01:30 Comparação lado a lado",
        "",
        "📚 Sobre a série Técnicas Semelhantes",
        "Esta série confronta tecnicamente pares de waza Kōdōkan que se confundem no "
        "estudo cotidiano do judô. Cada vídeo demonstra lado a lado duas técnicas similares "
        "e esclarece o que as distingue biomecanicamente, conforme classificação canônica "
        "de Toshirō Daigo, Kodokan Judo Throwing Techniques (Kodansha, 2005) — referência "
        "máxima do catálogo técnico Kōdōkan.",
        "",
        "🎙 Demonstração e comentários: Prof. Luiz Pavani (6º dan)",
        "",
        f"▶ Playlist completa da série Técnicas Semelhantes: {PLAYLIST_TS_URL}",
        f"▶ Veja também a série Kōdōkan-waza completa: {PLAYLIST_KODOKAN_URL}",
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
        "#judo #judo365 #kodokan #tecnicassemelhantes #técnicassemelhantes #luizpavani #profep",
    ]
    return "\n".join(lines)


def merge_tags_freeze(current_tags: list[str], specific: list[str]) -> list[str]:
    """Para FREEZE-tags: preserva tags atuais, adiciona específicas + base, dedupe, respeita 490ch."""
    merged = list(current_tags) + specific + BASE_TAGS_COMMON
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
    return final


def build_tags_template(specific: list[str]) -> list[str]:
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
    print(f"== retitle_b2_b37.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    all_ids = list(B2.keys()) + list(TECNICAS_SEMELHANTES.keys())
    current = fetch_current(yt, all_ids)

    diffs = []

    # B2
    for vid in B2.keys():
        v = current.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado")
            continue
        s = v["snippet"]
        d = B2[vid]
        before = {
            "title": s["title"],
            "description": s.get("description", ""),
            "tags": s.get("tags", []),
            "categoryId": s.get("categoryId"),
            "defaultLanguage": s.get("defaultLanguage"),
            "defaultAudioLanguage": s.get("defaultAudioLanguage"),
        }
        if d.get("freeze"):
            after = {
                "title": before["title"],
                "description": before["description"],
                "tags": merge_tags_freeze(before["tags"], d["specific_tags"]),
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mode_label = "B2-FREEZE"
        else:
            after = {
                "title": before["title"],
                "description": build_description_b2_template(vid),
                "tags": build_tags_template(d["specific_tags"]),
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mode_label = "B2-TEMPLATE"
        diffs.append((vid, before, after, mode_label))

    # B3.7
    for vid in TECNICAS_SEMELHANTES.keys():
        v = current.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado")
            continue
        s = v["snippet"]
        d = TECNICAS_SEMELHANTES[vid]
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
            "description": build_description_b37(vid),
            "tags": build_tags_template(d["specific_tags"]),
            "categoryId": "17",
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR",
        }
        diffs.append((vid, before, after, "B3.7-TEMPLATE"))

    # Print diff
    for vid, before, after, mlabel in diffs:
        print(f"=== [{mlabel}] {vid} — {after['title'][:60]} ===")
        print(f"  description: {len(before['description'])} → {len(after['description'])} chars")
        print(f"  tags:        {len(before['tags'])} ({sum(len(t)+2 for t in before['tags'])}ch) → {len(after['tags'])} ({sum(len(t)+2 for t in after['tags'])}ch)")
        print(f"  categoryId:  {before['categoryId']} → {after['categoryId']}")
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
                    "op": "retitle_b2_b37",
                    "mode": mlabel,
                    "video_id": vid,
                    "title": after["title"],
                    "before_desc_len": len(before["description"]),
                    "after_desc_len": len(after["description"]),
                    "before_tags_count": len(before["tags"]),
                    "after_tags_count": len(after["tags"]),
                    "status": "ok",
                })
                print(f"  ✅ [{mlabel}] {vid}  {after['title'][:55]}")
            except HttpError as e:
                failed.append((vid, str(e)))
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_b2_b37",
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
