"""
retitle_koshiwaza.py — aplica template na família koshi-waza (10 vídeos).
Todos CAUTIOUS — template completo, título intocado.

Uso:
    python3 retitle_koshiwaza.py             # dry-run
    python3 retitle_koshiwaza.py --apply     # aplica
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
    "koshi-waza", "koshiwaza", "técnica de quadril",
    "100 kodokan waza", "100 técnicas de judo", "waza",
    "jigoro kano", "jigorō kanō",
    "luiz pavani", "profep", "judo365", "judô brasil", "judo brasil",
]


KOSHIWAZA = {
    "JizeMktZcjM": {
        "nome": "Ō-goshi", "kanji": "大腰", "serie_pos": 17,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Ō-goshi — \"grande quadril\" — é a koshi-waza arquetípica do judô. Tori entra de frente, "
            "encaixa o quadril sob o centro de gravidade de uke e o projeta sobre o eixo da bacia. "
            "Daigo (2005) apresenta Ō-goshi como técnica fundamental para introdução da família "
            "koshi-waza, por exemplificar de forma pura o uso do quadril como ponto de apoio. "
            "Está no kyū gokyō de 1895, no shin gokyō de 1920 e permanece como referência "
            "biomecânica para todas as variações de quadril posteriores."
        ),
        "specific_tags": ["o-goshi", "ogoshi", "o goshi", "ō-goshi", "ōgoshi", "major hip throw", "gokyo", "大腰"],
    },
    "r-RzoeUWwwc": {
        "nome": "Uki-goshi", "kanji": "浮腰", "serie_pos": 18,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Uki-goshi — \"quadril flutuante\" — é koshi-waza em que tori usa o quadril como pivô "
            "leve, sem grande inclinação, para projetar uke em arco curto. Daigo (2005) descreve "
            "Uki-goshi como uma das três técnicas de assinatura de Kanō Jigorō no Kōdōkan dos "
            "primeiros anos. De Crée (2026) cita testemunho de Isogai Hajime (Jūdō Zasshi, 1941) "
            "confirmando que Uki-goshi era uma das wazas pessoais de Kanō, ao lado de Harai-goshi "
            "e Tsurikomi-goshi. Foi exatamente para neutralizar as evasões de Uki-goshi feitas "
            "por seu aluno Saigō Shirō que Kanō desenvolveu o Harai-goshi."
        ),
        "specific_tags": ["uki-goshi", "ukigoshi", "uki goshi", "floating hip", "kano jigoro waza", "isogai", "浮腰"],
    },
    "_FHKDdUJPfc": {
        "nome": "Harai-goshi", "kanji": "払腰", "serie_pos": 19,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Harai-goshi — \"quadril que varre\" — é koshi-waza híbrida em que tori encaixa o "
            "quadril e simultaneamente varre a perna de uke com a face posterior da própria perna "
            "estendida. Daigo (2005) classifica Harai-goshi como técnica-síntese entre koshi-waza "
            "e ashi-waza. De Crée (2026) registra que Harai-goshi foi desenvolvida pelo próprio "
            "Kanō Jigorō especificamente para contra-atacar as evasões de Uki-goshi feitas por "
            "Saigō Shirō — episódio documentado por Isogai Hajime (1941). Caso histórico "
            "documentado de criação de waza por necessidade pedagógica direta."
        ),
        "specific_tags": ["harai-goshi", "haraigoshi", "harai goshi", "sweeping hip", "kano jigoro", "saigo shiro", "払腰"],
    },
    "oT9dMcTAYLs": {
        "nome": "Tsurikomi-goshi", "kanji": "釣込腰", "serie_pos": 20,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Tsurikomi-goshi — \"quadril com puxada-pesca\" — é koshi-waza em que tori puxa uke "
            "em direção ascendente (tsuri = pescar/elevar) ao mesmo tempo em que encaixa o quadril "
            "para baixo, criando torque vertical inverso. Daigo (2005) destaca a importância da "
            "ação coordenada das mãos. De Crée (2026) cita Isogai Hajime (1941) confirmando "
            "Tsurikomi-goshi como uma das técnicas pessoais usadas por Kanō Jigorō em randori. "
            "Foi adicionada ao kyū gokyō por volta de 1912, após a publicação original de 1895."
        ),
        "specific_tags": ["tsurikomi-goshi", "tsurikomigoshi", "tsuri komi goshi", "lifting hip", "kano jigoro", "釣込腰"],
    },
    "1YoeGkvkfok": {
        "nome": "Sode-tsurikomi-goshi", "kanji": "袖釣込腰", "serie_pos": 21,
        "grupo_pt": "Koshi-waza · Shinmeishō-no-waza",
        "desc": (
            "Sode-tsurikomi-goshi — \"Tsurikomi-goshi pela manga\" — é variação em que tori controla "
            "ambas as mangas de uke (sode), mantendo os braços do oponente elevados durante a "
            "entrada de quadril. Daigo (2005) a classifica como técnica de pegada bilateral nas "
            "mangas, sem contato com a gola. Shinmeishō-no-waza desde 1997 — uma das duas técnicas "
            "(junto com Ippon-seoi-nage) acrescentadas ao grupo dos novos nomes naquele ano."
        ),
        "specific_tags": ["sode-tsurikomi-goshi", "sodetsurikomigoshi", "sode tsurikomi goshi", "sleeve lifting hip", "shinmeisho-no-waza", "袖釣込腰"],
    },
    "WxBDy4eUPtA": {
        "nome": "Tsuri-goshi", "kanji": "釣腰", "serie_pos": 22,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Tsuri-goshi — \"quadril de pesca\" — é koshi-waza em que tori passa o braço por cima "
            "ou por baixo do braço de uke para agarrar seu obi por trás, suspendendo-o (tsuri) "
            "enquanto realiza a entrada de quadril. Daigo (2005) descreve a técnica em duas "
            "subformas conforme o nível da pegada: ko-tsuri-goshi (pegada baixa) e ō-tsuri-goshi "
            "(pegada alta). Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["tsuri-goshi", "tsurigoshi", "tsuri goshi", "lifting hip throw", "釣腰"],
    },
    "3yKDhcbMMqM": {
        "nome": "Koshi-guruma", "kanji": "腰車", "serie_pos": 23,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Koshi-guruma — \"roda de quadril\" — é koshi-waza em que tori envolve o pescoço de "
            "uke com o braço, controlando a cabeça enquanto realiza a entrada de quadril. Daigo "
            "(2005) destaca o controle da cabeça como diferencial em relação a Ō-goshi. **A "
            "história do nome é reveladora:** o mesmo nome e mesmo kanji (腰車) aparecem na "
            "linhagem Tenjin Shinyō-ryū — escola de Kanō — no manual de Yoshida & Isō Matauemon V "
            "de 1893, anteriormente à fundação do Kōdōkan. Caso de preservação nominal integral "
            "através do estrato Kōdōkan."
        ),
        "specific_tags": ["koshi-guruma", "koshiguruma", "koshi guruma", "hip wheel", "tenjin shinyo-ryu", "腰車"],
    },
    "_aXQ30_sXFk": {
        "nome": "Hane-goshi", "kanji": "跳腰", "serie_pos": 24,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Hane-goshi — \"quadril que salta\" — é koshi-waza em que tori usa o quadril e a coxa "
            "flexionada para projetar uke em movimento ascendente curvilíneo (hane = saltar). "
            "Daigo (2005) classifica Hane-goshi entre as koshi-waza com componente de salto. De "
            "Crée (2026) documenta um achado filológico importante: Hane-goshi NÃO existe em "
            "1888 (o han-goshi 半腰 do Zakki de Kanō é técnica DIFERENTE, não apenas grafia "
            "alternativa). Hane-goshi entra no currículo oficial só em 1895, no kyū gokyō."
        ),
        "specific_tags": ["hane-goshi", "hanegoshi", "hane goshi", "spring hip", "跳腰"],
    },
    "nl5XCcLr2yI": {
        "nome": "Ushiro-goshi", "kanji": "後腰", "serie_pos": 25,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Ushiro-goshi — \"quadril por trás\" — é koshi-waza de contra-ataque em que tori, ao "
            "ser atacado por uma técnica de quadril (Uki-goshi, Ō-goshi etc.), abraça uke pelas "
            "costas e o eleva para projetar em queda controlada. Daigo (2005) apresenta "
            "Ushiro-goshi como técnica essencialmente reativa, que requer leitura precisa do "
            "ataque inicial. Está no kyū gokyō de 1895."
        ),
        "specific_tags": ["ushiro-goshi", "ushirogoshi", "ushiro goshi", "rear hip throw", "後腰"],
    },
    "o3Vvre4Vzjk": {
        "nome": "Utsuri-goshi", "kanji": "移腰", "serie_pos": 26,
        "grupo_pt": "Koshi-waza (técnicas de quadril)",
        "desc": (
            "Utsuri-goshi — \"quadril que muda\" — é koshi-waza de contra-ataque em que tori, ao "
            "absorver um ataque de quadril de uke, eleva-o e gira no ar (utsuri = mudar/transferir) "
            "para reposicionar o quadril próprio e projetar no sentido inverso. Daigo (2005) "
            "destaca Utsuri-goshi como técnica de alta complexidade temporal. Foi adicionada ao "
            "shin gokyō em 1920."
        ),
        "specific_tags": ["utsuri-goshi", "utsurigoshi", "utsuri goshi", "hip shift", "移腰"],
    },
}


def build_description(vid: str) -> str:
    d = KOSHIWAZA[vid]
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
        f"#judo #judo365 #kodokan #kodokanwaza #nagewaza #koshiwaza #{d['nome'].lower().replace('-','').replace('ō','o')} #luizpavani #profep",
    ]
    return "\n".join(lines)


def build_tags(vid: str) -> list[str]:
    d = KOSHIWAZA[vid]
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
    print(f"== retitle_koshiwaza.py [{mode}] ==\n")

    creds = get_credentials()
    yt = build("youtube", "v3", credentials=creds)
    current = fetch_current(yt, list(KOSHIWAZA.keys()))

    diffs = []
    for vid in KOSHIWAZA.keys():
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
                    "op": "retitle_koshiwaza",
                    "video_id": vid,
                    "title": after["title"],
                    "before_desc_len": len(before["description"]),
                    "after_desc_len": len(after["description"]),
                    "before_tags_count": len(before["tags"]),
                    "after_tags_count": len(after["tags"]),
                    "status": "ok",
                })
                print(f"  ✅ {vid}  {after['title'][:55]}")
            except HttpError as e:
                failed.append((vid, str(e)))
                log_operation(log_file, {
                    "ts": datetime.now().isoformat(),
                    "op": "retitle_koshiwaza",
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
