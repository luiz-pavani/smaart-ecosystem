# YouTube/Google verification checklist — Titan

Pra remover o warning "Google não verificou este app" e permitir que **qualquer usuário externo** (academias, outras federações) conecte canal sem ser test user, é preciso submeter o app pra Google verification.

**Tempo de processo**: 2-6 semanas (Google audita scopes sensíveis manualmente).
**Custo**: gratuito.

---

## Pré-requisitos antes de submeter

### 1. Privacy Policy + Terms of Service publicados
URLs públicas (já existem):
- ✅ `https://titan.smaartpro.com/privacidade`
- ✅ `https://titan.smaartpro.com/termos`

**Mas** precisam mencionar **explicitamente**:
- Quais scopes do YouTube são solicitados
- Como o token é armazenado (criptografado, prazo de retenção)
- Como o usuário pode revogar acesso (link pra https://myaccount.google.com/permissions)
- Que tipo de dados do canal o app acessa (apenas Live Broadcasts/Streams, não vídeos do usuário)

Eu adiciono isso quando você der OK no resto da verificação.

### 2. Domain verification
Antes da audit:
1. Acesse https://search.google.com/search-console
2. Adicione propriedade `smaartpro.com`
3. Verifique via DNS (TXT record) ou meta tag
4. No Cloud Console → OAuth consent screen → **Authorized domains** → garanta que `smaartpro.com` está listado

### 3. Demo video (obrigatório pra scopes sensíveis YouTube)
Google exige vídeo de 1-3 minutos mostrando:
- Tela de login do Titan
- Clique em "Conectar YouTube"
- Tela de consent do Google aparecendo
- Após aprovação, o app criando broadcasts no canal
- Como o usuário pode desconectar

Grave com OBS Studio ou QuickTime. Upload em canal não-listed (próprio canal LRSJ).

---

## Processo de submission

1. Google Cloud Console → APIs & Services → OAuth consent screen
2. Clique **PUBLISH APP** (move o status de "Testing" → "In production")
3. Imediatamente aparecerá banner: "Sensitive scopes detected. Submit for verification."
4. Clique **PREPARE FOR VERIFICATION**
5. Preencha:
   - **App functionality**: descreva (ex: "Titan é plataforma de gestão de competições de judô. Cria transmissões YouTube Live para os tatames durante eventos federativos.")
   - **Why your app needs each scope**:
     - `youtube`: "Listar canal e categorias do usuário pra confirmação visual"
     - `youtube.force-ssl`: "Criar liveBroadcasts e liveStreams pros tatames do evento, fazer bind entre eles, e iniciar a transmissão (transition para 'testing' / 'live')"
     - `youtube.readonly`: "Listar canal ativo para mostrar ao admin antes da criação"
   - **Demo video URL**: link do YouTube (unlisted) do vídeo do passo 3 acima
6. Submit

---

## O que esperar

- **Email 1**: ack automático em 24h
- **Email 2**: Google pode pedir clarification — responda em até 7 dias
- **Aprovação ou rejeição**: 2-6 semanas

**Rejeições comuns** (e como evitar):

- "Demo video não mostra todos os scopes" → grave tudo em sequência, mostrando a tela de consent
- "Privacy policy não menciona scopes" → adicione seção específica
- "Domain não verificado" → faça Search Console primeiro
- "App home page genérica" → home `/` precisa explicar o que o Titan é (já tem)

---

## Enquanto não aprovado

Modo Testing serve perfeitamente pra:
- Você + Bruno + 1-2 admins testarem (adicionar como test users)
- Eventos pilotos da LRSJ
- Validar workflow antes de abrir pra academias externas

Quando aprovado, basta **PUBLISH** no Cloud Console — o código não muda.

---

## Quota expansion (depois da verificação)

Padrão 10k units/dia comporta ~50 eventos de 5 tatames por dia. Pra escala maior (CBJ nacional, por exemplo):

1. Cloud Console → IAM & Admin → Quotas
2. Busque "YouTube Data API v3"
3. Filtre por "Queries per day"
4. Selecione a quota → **Edit Quotas**
5. Solicite expansão (1M, 10M units/dia)
6. Submeta com justificativa de uso

Resposta em 1-3 dias úteis.
