# Setup Google Cloud + YouTube Data API v3 — Titan

Guia passo-a-passo pra você criar e configurar o que o Titan precisa para gerar broadcasts no YouTube automaticamente.

**Tempo total**: ~30 minutos.
**Requer**: conta Google (qualquer Gmail). Recomenda-se usar uma conta dedicada (não pessoal) para a Liga.

---

## Passo 1 — Criar projeto no Google Cloud

1. Acesse https://console.cloud.google.com/
2. Topo da página: clique no seletor de projeto → **NEW PROJECT**
3. Preencha:
   - **Project name**: `titan-lrsj` (ou qualquer nome)
   - **Organization**: deixe em branco se não tiver workspace
4. Clique **CREATE**
5. Aguarde ~10s, selecione o novo projeto no seletor do topo

---

## Passo 2 — Ativar YouTube Data API v3

1. No menu lateral esquerdo: **APIs & Services** → **Library**
2. Busque: `YouTube Data API v3`
3. Clique no card → **ENABLE**
4. Aguarde ~5s

---

## Passo 3 — Configurar OAuth consent screen

1. Menu lateral: **APIs & Services** → **OAuth consent screen**
2. **User Type**: marque **External** → **CREATE**
3. Preencha página 1 (App information):
   - **App name**: `Titan LRSJ`
   - **User support email**: seu email
   - **App logo**: opcional, mas ajuda na verificação
   - **Application home page**: `https://titan.smaartpro.com`
   - **Application privacy policy link**: `https://titan.smaartpro.com/privacidade`
   - **Application terms of service link**: `https://titan.smaartpro.com/termos`
   - **Authorized domains**: adicione `smaartpro.com`
   - **Developer contact information**: seu email
4. **SAVE AND CONTINUE**
5. Página 2 (Scopes): clique **ADD OR REMOVE SCOPES**, busque e marque:
   - `.../auth/youtube` — Manage YouTube account
   - `.../auth/youtube.force-ssl` — Manage YouTube account (force SSL)
   - `.../auth/youtube.readonly` — View YouTube account
6. **UPDATE** → **SAVE AND CONTINUE**
7. Página 3 (Test users): clique **+ ADD USERS**, adicione:
   - Seu email principal
   - Email do Bruno (`brunochalar@hotmail.com`) ou outro admin que vá testar
   - Adicione até 100 emails dos organizadores que vão usar enquanto o app está em "Testing"
8. **SAVE AND CONTINUE** → **BACK TO DASHBOARD**

**⚠️ Importante**: enquanto o status estiver "Testing", apenas emails listados como test users conseguem autenticar. Para liberar pra todos, precisa **publicar o app** (passo 5 abaixo).

---

## Passo 4 — Criar OAuth 2.0 Client ID

1. Menu lateral: **APIs & Services** → **Credentials**
2. **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: `Web application`
4. **Name**: `Titan Web Client`
5. **Authorized JavaScript origins**:
   - `https://titan.smaartpro.com`
   - `http://localhost:3000` (pra dev)
6. **Authorized redirect URIs**:
   - `https://titan.smaartpro.com/api/youtube/oauth/callback`
   - `http://localhost:3000/api/youtube/oauth/callback`
7. **CREATE**
8. Modal aparece com **Client ID** e **Client Secret** — **copie ambos**

---

## Passo 5 — Adicionar credenciais no Vercel

```bash
cd apps/titan

# Adicionar nas envs de produção
npx vercel env add GOOGLE_OAUTH_CLIENT_ID production
# cola o Client ID quando perguntar

npx vercel env add GOOGLE_OAUTH_CLIENT_SECRET production
# cola o Client Secret

# Também pra local dev
npx vercel env add GOOGLE_OAUTH_CLIENT_ID development
npx vercel env add GOOGLE_OAUTH_CLIENT_SECRET development

# Pull pra .env.local
npx vercel env pull .env.local
```

---

## Passo 6 — Testar (modo Dev / Testing)

Com Bruno ou seu próprio email como test user:

1. Acesse https://titan.smaartpro.com/portal/eventos/[ID]/transmissao (admin)
2. Clique **"Conectar canal do YouTube"**
3. Aprove os scopes
4. Crie evento de teste → "Criar transmissão automaticamente"
5. Confira se broadcast apareceu no YouTube Studio: https://studio.youtube.com/

**Esperado**: warning "Google não verificou este app" — clique **Advanced → Continue (não seguro)**. Isso é normal no modo Testing. Pra remover esse warning permanentemente, leia [`YOUTUBE_VERIFICATION.md`](./YOUTUBE_VERIFICATION.md).

---

## Quota inicial e expansão

YouTube Data API v3 começa com **10.000 units/dia**. Cada operação consome:

| Operação | Units |
|---|---|
| `liveBroadcasts.insert` | 50 |
| `liveStreams.insert` | 50 |
| `liveBroadcasts.bind` | 50 |
| `liveBroadcasts.transition` | 50 |

Por evento de 5 tatames: ~200 units pra criar tudo. Os 10k/dia atendem ~50 eventos/dia, mais que suficiente.

**Pra expandir**: APIs & Services → Quotas → busca "youtube data" → **Edit Quotas** → submit justification. Resposta em 1-3 dias úteis.

---

## Troubleshooting

**Erro `redirect_uri_mismatch`** ao autenticar:
→ Verifique se o redirect URI no Cloud Console bate **exatamente** com `https://titan.smaartpro.com/api/youtube/oauth/callback`. Sem trailing slash, com `https`.

**Erro `access_denied`**:
→ Seu email não está na lista de test users. Adicione em OAuth consent screen → Test users.

**Erro `quotaExceeded`**:
→ 10k units/dia esgotados. Resetam à meia-noite Pacific Time (~5h AM Brasília). Pra escala maior, solicite expansion.

**Broadcast criado mas não aparece no YouTube Studio**:
→ Pode levar 30-60s pra propagar. Refresh do Studio.
