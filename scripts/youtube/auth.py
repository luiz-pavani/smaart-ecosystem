"""
auth.py — OAuth authentication for Judo365 YouTube API (Level 3).

First run: opens browser, you login with judo365 Google account, authorize.
Subsequent runs: reuses refresh token silently.

Usage:
    python3 auth.py                    # authenticate (first time)
    python3 auth.py --test             # verify token works and print channel info
    python3 auth.py --revoke           # revoke token locally (keeps Google side)
"""

import os
import sys
import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

HOME = Path.home()
YT_DIR = HOME / ".youtube"
CLIENT_SECRET = YT_DIR / "client_secret.json"
TOKEN_PATH = YT_DIR / "token_writable.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def get_credentials() -> Credentials:
    if not CLIENT_SECRET.exists():
        sys.exit(
            f"ERRO: {CLIENT_SECRET} não encontrado.\n"
            f"Baixa o JSON do Google Cloud Console (OAuth client ID) "
            f"e move para esse caminho."
        )

    creds: Credentials | None = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CLIENT_SECRET), SCOPES
            )
            creds = flow.run_local_server(port=0, prompt="consent")

        TOKEN_PATH.write_text(creds.to_json())
        os.chmod(TOKEN_PATH, 0o600)
        print(f"Token salvo em {TOKEN_PATH}")

    return creds


def test_connection(creds: Credentials) -> None:
    youtube = build("youtube", "v3", credentials=creds)
    response = youtube.channels().list(part="snippet,statistics", mine=True).execute()

    if not response.get("items"):
        sys.exit("ERRO: nenhum canal encontrado para esta conta.")

    channel = response["items"][0]
    snippet = channel["snippet"]
    stats = channel["statistics"]

    print("\n=== CONEXÃO OK ===")
    print(f"Canal: {snippet['title']}")
    print(f"Channel ID: {channel['id']}")
    print(f"Inscritos: {stats.get('subscriberCount', 'N/A')}")
    print(f"Vídeos: {stats.get('videoCount', 'N/A')}")
    print(f"Views totais: {stats.get('viewCount', 'N/A')}")
    print(f"Criado em: {snippet.get('publishedAt', 'N/A')}")
    print(f"\nEscopos autorizados: {len(SCOPES)}")
    for s in SCOPES:
        print(f"  - {s}")


def revoke_local() -> None:
    if TOKEN_PATH.exists():
        TOKEN_PATH.unlink()
        print(f"Token local removido: {TOKEN_PATH}")
    else:
        print("Nenhum token local para remover.")
    print(
        "\nLEMBRE: isso só remove o token DESTA máquina.\n"
        "Para revogar no lado Google, acesse:\n"
        "https://myaccount.google.com/permissions"
    )


def main() -> None:
    args = sys.argv[1:]

    if "--revoke" in args:
        revoke_local()
        return

    creds = get_credentials()
    print("Autenticação OK.")

    if "--test" in args:
        test_connection(creds)


if __name__ == "__main__":
    main()
