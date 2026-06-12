# Judo365 YouTube Tools (Nível 3)

Scripts de leitura + escrita no canal YouTube `@Judo365` via YouTube Data API v3.

## Arquivos

- `auth.py` — OAuth flow, gera/renova token
- `snapshot.py` — dump completo do estado atual (backup)
- `backups/` — snapshots JSON versionados (GITIGNORED)
- `logs/` — log append-only de operações de escrita (GITIGNORED)
- `output/` — relatórios e análises (GITIGNORED)

## Credenciais

Moram em `~/.youtube/`:

- `client_secret.json` — baixado do Google Cloud Console (OAuth client)
- `token_writable.json` — gerado no primeiro login, renovado automaticamente

Pasta tem permissão `700`, arquivos `600`. Nunca vão pro git.

## Escopos autorizados

- `youtube.readonly` — leitura de dados do canal
- `youtube.force-ssl` — escrita (edit títulos/descrições/tags/playlists/thumbnails)
- `yt-analytics.readonly` — métricas privadas (retenção, CTR, tráfego)

## Protocolo de segurança

1. **Todo script de escrita tem `--dry-run` por default.** Só aplica com `--apply` explícito.
2. **Sempre rodar `snapshot.py` antes de qualquer operação de escrita em massa.**
3. **Batches de 10 vídeos máximo, 50 updates/dia máximo.**
4. **Operações proibidas sem confirmação explícita na sessão:**
   - delete vídeo
   - mudar privacidade pública → não listada/privada
   - deletar playlist
   - upload de vídeo novo
   - editar "Sobre" do canal
5. **Tudo logado em `logs/YYYY-MM-DD_operations.log`.**

## Revogação

- Local: `python3 auth.py --revoke` (remove token_writable.json)
- Google: <https://myaccount.google.com/permissions> → remover "Judo365 Analytics"

## Primeiros passos

```bash
cd scripts/youtube

# 1. Autenticar (abre navegador — só primeira vez)
python3 auth.py --test

# 2. Backup completo do canal
python3 snapshot.py --label baseline
```
