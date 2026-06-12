"""
retitle_tewaza.py — aplica template na família te-waza (16 vídeos).

Estratégia:
- FREEZE (Ippon-seoi-nage): só merge de tags, não toca descrição/título
- CAUTIOUS/SAFE (15 outros): template completo nível médio, título intocado

Uso:
    python3 retitle_tewaza.py             # dry-run
    python3 retitle_tewaza.py --apply     # aplica
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
    "te-waza", "tewaza",
    "100 kodokan waza", "100 técnicas de judo", "waza",
    "jigoro kano", "jigorō kanō",
    "luiz pavani", "profep", "judo365", "judô brasil", "judo brasil",
]


TEWAZA = {
    # FREEZE — só atualiza tags
    "kkE7YybFVcM": {
        "nome": "Ippon-seoi-nage", "kanji": "一本背負投",
        "freeze": True,
        "specific_tags": [
            "ippon-seoi-nage", "ipponseoinage", "ippon seoi nage",
            "ippon seoi", "seoi", "seoi-nage", "seoinage",
            "one arm shoulder throw", "projeção ombro judo",
            "shinmeisho-no-waza", "shinmeishonowaza",
            "背負投",
        ],
    },
    "qrMYKAPN4_8": {
        "nome": "Seoi-nage", "kanji": "背負投", "serie_pos": 2,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Seoi-nage é uma das projeções mais icônicas do judô Kōdōkan, classificada entre as te-waza "
            "(técnicas de mão/braço). Tori carrega uke sobre o ombro por meio de uma entrada frontal com "
            "giro de 180°, projetando o adversário em parábola sobre suas costas. Daigo (2005) apresenta "
            "Seoi-nage como arquétipo do uso combinado de tsukuri, kuzushi e kake no eixo sagital. "
            "Embora hoje seja técnica-assinatura do judô, sua origem é anterior ao Kōdōkan: Todo et al. "
            "(2017) documentam o yuki-ori 雪折 do Kitōryū-no-kata — arremesso contra ataque pelas costas "
            "— como precursor funcional do Seoi-nage moderno. De Crée (2026) acrescenta que o oe-nage 負投 "
            "do sumō antigo compartilha o mesmo princípio biomecânico, confirmando origem múltipla."
        ),
        "specific_tags": ["seoi-nage", "seoinage", "seoi nage", "seoi", "shoulder throw", "te-waza", "背負投"],
    },
    "VB6TesvsMnk": {
        "nome": "Seoi-otoshi", "kanji": "背負落", "serie_pos": 3,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Seoi-otoshi é uma variação de Seoi-nage em que tori abaixa drasticamente o centro de massa "
            "— geralmente apoiando um joelho no solo — para conduzir uke em queda frontal. Classificada "
            "em te-waza por Daigo (2005). Tem parentesco morfológico e biomecânico direto com Seoi-nage, "
            "diferindo essencialmente na trajetória descendente de queda. De Crée (2026) identifica yuki-ori "
            "雪折 do Kitōryū-no-kata como ancestral funcional compartilhado com Seoi-nage. Integra o grupo "
            "habukareta-waza — técnicas removidas do gokyō em 1920 e reoficializadas em 1982."
        ),
        "specific_tags": ["seoi-otoshi", "seoiotoshi", "seoi otoshi", "habukareta-waza", "te-waza", "背負落"],
    },
    "a3MxdblHCh4": {
        "nome": "Tai-otoshi", "kanji": "体落", "serie_pos": 4,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Tai-otoshi — literalmente \"queda do corpo\" — é uma te-waza clássica em que tori, após "
            "entrada lateral, usa a perna estendida como barreira enquanto puxa uke em trajetória "
            "curvilínea à frente. Daigo (2005) caracteriza Tai-otoshi como técnica de projeção por "
            "alavanca sem uso do quadril como ponto de apoio, distinguindo-a das koshi-waza mesmo "
            "quando o movimento inicial parece similar. O nome literal \"derrubar o corpo\" pertence "
            "ao estrato morfológico de composição verbal (V+V) herdado de escolas pré-Kōdōkan."
        ),
        "specific_tags": ["tai-otoshi", "taiotoshi", "tai otoshi", "body drop", "te-waza", "体落"],
    },
    "jqdLNmOSPYc": {
        "nome": "Kata-guruma", "kanji": "肩車", "serie_pos": 5,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Kata-guruma — \"roda do ombro\" — é uma das te-waza mais dramáticas do catálogo Kōdōkan. "
            "Tori carrega uke transversalmente sobre os ombros antes de projetá-lo ao solo. De Crée "
            "(2026) documenta três origens paralelas: o kinu-katsugi 衣担 do sumō, o hankai-garami 樊噲搦 "
            "da Yōshin-ryū, e uma possível influência do \"fireman's carry\" do wrestling ocidental — "
            "esta última inconclusiva. Daigo (2005) apresenta Kata-guruma na forma clássica com os dois "
            "joelhos flexionados, preservando a biomecânica que chegou ao judô via múltiplas tradições "
            "convergentes."
        ),
        "specific_tags": ["kata-guruma", "kataguruma", "kata guruma", "shoulder wheel", "fireman carry", "te-waza", "肩車"],
    },
    "8WmyBsXmYgI": {
        "nome": "Uki-otoshi", "kanji": "浮落", "serie_pos": 6,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Uki-otoshi — \"queda flutuante\" — abre a primeira série do Nage-no-Kata e representa o "
            "princípio puro de jū: tori desequilibra uke apenas com o ritmo da caminhada e mínima "
            "tração das mãos, sem usar força muscular para projetar. Daigo (2005) trata Uki-otoshi "
            "como técnica paradigmática do princípio jū yoku gō o sei suru (a suavidade controla a "
            "força). De Crée (2026) identifica sua raiz em duas técnicas do Kitō-ryū — hiki-otoshi 曳落 "
            "e yūdachi 夕立 — convergidas por Kanō num único nome de estilo próprio. Integra o ikkyō "
            "do primeiro Nage-no-Kata formal (Yamada 1898)."
        ),
        "specific_tags": ["uki-otoshi", "ukiotoshi", "uki otoshi", "floating drop", "nage-no-kata", "te-waza", "浮落"],
    },
    "OPXZbQtuDB0": {
        "nome": "Sumi-otoshi", "kanji": "隅落", "serie_pos": 7,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Sumi-otoshi — \"queda de canto\" — é te-waza de alto refinamento em que tori projeta uke "
            "em direção oblíqua traseira via um empurrão coordenado pela diagonal dos ombros, sem "
            "contato do próprio corpo com o corpo de uke além das mãos. Daigo (2005) descreve "
            "Sumi-otoshi como expressão avançada do kuzushi em quatro tempos. É considerada técnica-teste "
            "em graduações dan superiores pela precisão que exige."
        ),
        "specific_tags": ["sumi-otoshi", "sumiotoshi", "sumi otoshi", "corner drop", "te-waza", "隅落"],
    },
    "dL6XefM3ohI": {
        "nome": "Sukui-nage", "kanji": "掬投", "serie_pos": 8,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Sukui-nage — \"arremesso em concha\" — é te-waza em que tori insere um braço por entre as "
            "pernas de uke e o outro por trás das costas, suspendendo-o horizontalmente antes da "
            "projeção. Daigo (2005) situa Sukui-nage no grupo das técnicas com ukemi de alto risco, "
            "razão pela qual tem aplicação restrita em randori. De Crée (2026) documenta sua origem "
            "no ko-daore 虚倒 do Kitō-ryū, renomeado e preservado no catálogo Kōdōkan."
        ),
        "specific_tags": ["sukui-nage", "sukuinage", "sukui nage", "scooping throw", "te-waza", "掬投"],
    },
    "od_XIVJ7_yg": {
        "nome": "Obi-otoshi", "kanji": "帯落", "serie_pos": 9,
        "grupo_pt": "Te-waza (técnicas de mão/braço)",
        "desc": (
            "Obi-otoshi — \"queda pelo obi\" — é te-waza em que tori agarra o cinturão (obi) de uke "
            "para controlar o eixo central do adversário e projetá-lo à frente. Daigo (2005) enfatiza "
            "o componente de controle axial direto, distinto das técnicas que dependem de desequilíbrio "
            "periférico. De Crée (2026) identifica sua origem no uchi-kudaki 打砕 do Kitō-ryū, renomeado "
            "por Kanō com referência ao pegar característico no obi. Faz parte do grupo "
            "habukareta-waza — técnicas removidas do gokyō em 1920 e reoficializadas em 1982."
        ),
        "specific_tags": ["obi-otoshi", "obiotoshi", "obi otoshi", "belt drop", "habukareta-waza", "te-waza", "帯落"],
    },
    "f3GP3xDI4E4": {
        "nome": "Morote-gari", "kanji": "双手刈", "serie_pos": 10,
        "grupo_pt": "Te-waza · Shinmeishō-no-waza",
        "desc": (
            "Morote-gari — \"ceifa com as duas mãos\" — é a técnica de derrubada bilateral das pernas, "
            "análoga ao double-leg takedown do wrestling. Daigo (2005) a classifica em te-waza. "
            "Shinmeishō-no-waza desde 1982, foi amplamente usada em competição internacional até "
            "2013, quando a IJF proibiu agarrar abaixo da cintura em nage-waza. Hoje preservada como "
            "conteúdo kata-only no catálogo Kōdōkan — exemplo contemporâneo de como o regulamento "
            "desportivo afeta a composição técnica do corpus."
        ),
        "specific_tags": ["morote-gari", "morotegari", "morote gari", "double leg", "double leg takedown", "shinmeisho-no-waza", "te-waza", "双手刈"],
    },
    "LGCj0VJ6RcY": {
        "nome": "Kuchiki-taoshi", "kanji": "朽木倒", "serie_pos": 11,
        "grupo_pt": "Te-waza · Shinmeishō-no-waza",
        "desc": (
            "Kuchiki-taoshi — \"derrubar a árvore podre\" — é a técnica de derrubada unilateral pela "
            "perna, prendendo a coxa de uke enquanto se puxa sua gola. Nome de forte imagética: uke "
            "cai como tronco podre tocado à base. A história do nome é reveladora: o mesmo nome e "
            "mesmo kanji (朽木倒) aparecem na linhagem Tenjin Shinyō-ryū — escola de Kanō — no manual "
            "de Yoshida & Isō Matauemon V de 1893, pelo menos 89 anos antes de o Kōdōkan oficializar "
            "a técnica como shinmeishō-no-waza em 1982. De Crée (2026) documenta aparição paralela "
            "no sumō antigo (kuchiki-daoshi 朽木倒). Caso arquetípico de preservação nominal integral "
            "através do estrato Kōdōkan. Como Morote-gari, teve uso competitivo restrito pelo "
            "regulamento IJF de 2013."
        ),
        "specific_tags": ["kuchiki-taoshi", "kuchikitaoshi", "kuchiki taoshi", "single leg", "tenjin shinyo-ryu", "shinmeisho-no-waza", "te-waza", "朽木倒"],
    },
    "widVhoW4O3Q": {
        "nome": "Kibisu-gaeshi", "kanji": "踵返", "serie_pos": 12,
        "grupo_pt": "Te-waza · Shinmeishō-no-waza",
        "desc": (
            "Kibisu-gaeshi — \"reversão pelo calcanhar\" — é te-waza de contra-ataque em que tori "
            "agarra o calcanhar de uke por trás para projetá-lo em trajetória retrógrada. Daigo (2005) "
            "apresenta Kibisu-gaeshi como técnica de controle baixo, biomecanicamente inversa das "
            "derrubadas frontais. Shinmeishō-no-waza desde 1982."
        ),
        "specific_tags": ["kibisu-gaeshi", "kibisugaeshi", "kibisu gaeshi", "heel reversal", "shinmeisho-no-waza", "te-waza", "踵返"],
    },
    "TPeoTj8T19Y": {
        "nome": "Ko-uchi-gaeshi", "kanji": "小内返", "serie_pos": 13,
        "grupo_pt": "Te-waza · Shinmeishō-no-waza",
        "desc": (
            "Ko-uchi-gaeshi — \"reversão do ko-uchi\" — é te-waza de contra-ataque específica à "
            "entrada de Ko-uchi-gari. Tori absorve o ataque, reverte o eixo e projeta uke usando a "
            "energia da própria tentativa falhada. Daigo (2005) apresenta Ko-uchi-gaeshi como "
            "técnica-espelho do próprio Ko-uchi-gari, com polaridade invertida. Shinmeishō-no-waza "
            "desde 1982."
        ),
        "specific_tags": ["ko-uchi-gaeshi", "kouchigaeshi", "ko uchi gaeshi", "kouchi gaeshi", "shinmeisho-no-waza", "te-waza", "小内返"],
    },
    "lUaGqG_Ayss": {
        "nome": "Uchi-mata-sukashi", "kanji": "内股すかし", "serie_pos": 14,
        "grupo_pt": "Te-waza · Shinmeishō-no-waza",
        "desc": (
            "Uchi-mata-sukashi — \"esquivar do uchi-mata\" — é te-waza de contra-ataque específica "
            "contra a entrada de Uchi-mata. Tori se antecipa à rotação de uke, desviando o eixo e "
            "acompanhando a inércia do adversário para projetá-lo no sentido de sua própria rotação "
            "frustrada. Daigo (2005) destaca Uchi-mata-sukashi como exemplo puro de jū aplicado "
            "defensivamente. Shinmeishō-no-waza desde 1982 — é uma das técnicas que mais exige "
            "leitura de tempo em competição."
        ),
        "specific_tags": ["uchi-mata-sukashi", "uchimatasukashi", "uchi mata sukashi", "shinmeisho-no-waza", "te-waza", "内股すかし", "内股透"],
    },
    "YHfaubKxYz4": {
        "nome": "Yama-arashi", "kanji": "山嵐", "serie_pos": 15,
        "grupo_pt": "Te-waza · Habukareta-waza",
        "desc": (
            "Yama-arashi — \"tempestade da montanha\" — é te-waza associada historicamente a Saigō "
            "Shirō (1866-1922), aluno original de Kanō e figura inspiradora do romance \"Sugata "
            "Sanshirō\" de Tomita Tsuneo. Daigo (2005) descreve Yama-arashi como combinação híbrida "
            "de pegada alta na gola com varredura lateral de perna, mas sua forma exata variou com "
            "o tempo e hoje é matéria de debate filológico. De Crée (2026) nota sua presença no kyū "
            "gokyō de 1895 e sua posterior classificação no grupo habukareta-waza (1982). Um dos "
            "casos em que o nome metafórico sobrevive mais que a forma técnica estabilizada."
        ),
        "specific_tags": ["yama-arashi", "yamaarashi", "yama arashi", "mountain storm", "saigo shiro", "habukareta-waza", "te-waza", "山嵐"],
    },
    "c4HiK5-pdIE": {
        "nome": "Obi-tori-gaeshi", "kanji": "帯取返", "serie_pos": 16,
        "grupo_pt": "Te-waza · Shinmeishō-no-waza",
        "desc": (
            "Obi-tori-gaeshi — \"reversão agarrando o obi\" — é te-waza de contra-ataque em que tori "
            "agarra o obi de uke e o projeta revertendo seu movimento ofensivo. Daigo (2005) "
            "classifica Obi-tori-gaeshi entre as técnicas recentemente incorporadas. Shinmeishō-no-waza "
            "desde 1997 — uma das últimas adições ao grupo dos \"novos nomes\" oficiais."
        ),
        "specific_tags": ["obi-tori-gaeshi", "obitorigaeshi", "obi tori gaeshi", "shinmeisho-no-waza", "te-waza", "帯取返"],
    },
}


def build_description(vid: str) -> str:
    d = TEWAZA[vid]
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
        f"#judo #judo365 #kodokan #kodokanwaza #nagewaza #tewaza #{d['nome'].lower().replace('-','')} #luizpavani #profep",
    ]
    return "\n".join(lines)


def build_tags(vid: str) -> list[str]:
    d = TEWAZA[vid]
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
    print(f"== retitle_tewaza.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    current = fetch_current(yt, list(TEWAZA.keys()))

    diffs = []
    for vid in TEWAZA.keys():
        v = current.get(vid)
        if not v:
            print(f"⚠️  {vid} não encontrado")
            continue
        s = v["snippet"]
        d = TEWAZA[vid]
        before = {
            "title": s["title"],
            "description": s.get("description", ""),
            "tags": s.get("tags", []),
            "categoryId": s.get("categoryId"),
            "defaultLanguage": s.get("defaultLanguage"),
            "defaultAudioLanguage": s.get("defaultAudioLanguage"),
        }

        if d.get("freeze"):
            # Só mescla tags novas com as atuais
            merged = list(before["tags"]) + d["specific_tags"] + BASE_TAGS_COMMON
            seen = set()
            dedup = []
            for t in merged:
                if t.lower() not in seen:
                    seen.add(t.lower())
                    dedup.append(t)
            # Respeita limite 490ch
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
                "description": before["description"],  # intocado
                "tags": final,
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mode_label = "FREEZE (tags only)"
        else:
            after = {
                "title": before["title"],  # mantém
                "description": build_description(vid),
                "tags": build_tags(vid),
                "categoryId": "17",
                "defaultLanguage": "pt-BR",
                "defaultAudioLanguage": "pt-BR",
            }
            mode_label = "TEMPLATE"

        diffs.append((vid, before, after, mode_label))

    # Print diff
    for vid, before, after, mlabel in diffs:
        print(f"=== [{mlabel}] {vid} — {after['title']} ===")
        print(f"  description: {len(before['description'])} → {len(after['description'])} chars")
        print(f"  tags:        {len(before['tags'])} ({sum(len(t)+2 for t in before['tags'])}ch) → {len(after['tags'])} ({sum(len(t)+2 for t in after['tags'])}ch)")
        print(f"  categoryId:  {before['categoryId']} → {after['categoryId']}")
        print(f"  defaultLang: {before['defaultLanguage']} → {after['defaultLanguage']}")
        print(f"  audioLang:   {before['defaultAudioLanguage']} → {after['defaultAudioLanguage']}")
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
                    "op": "retitle_tewaza",
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
                    "op": "retitle_tewaza",
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
