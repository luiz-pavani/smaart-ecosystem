# Titan — Smoke Test de Lançamento

Checklist acionável para validar o app em produção (`https://titan.smaartpro.com`) antes do anúncio público. Cada item tem **passos exatos + critério de sucesso + onde olhar se falhar**.

Use 3 contas reais (criar/separar antes de começar):
- **Master**: `luizpavani@gmail.com` (role `master_access`)
- **Federação admin**: `brunochalar@hotmail.com` (role `federacao_admin`, LRSJ)
- **Atleta novo**: crie um email descartável (ex.: `+smoketest@gmail.com`)

---

## 1. Cadastro de atleta novo + LGPD

**Passos**
1. Aba anônima → `https://titan.smaartpro.com/acesso`
2. Preencher nome, email descartável, senha, **marcar checkbox de termos**
3. Tentar enviar sem marcar termos → deve bloquear
4. Marcar termos → enviar → confirmar email com código OTP
5. Inserir OTP → cair em `/portal`

**Critério de sucesso**
- Sem termos aceitos: API retorna `400` com mensagem clara
- Com termos aceitos: linha criada em `stakeholders` com `terms_accepted_at` preenchido + `terms_version='2026-05-27'`

**Falhou?**
- Conferir Resend logs (transactional email do código OTP)
- `supabase: select id, email, terms_accepted_at, terms_version from stakeholders where email=...`

---

## 2. Filiação LRSJ + Safe2Pay checkout

**Passos** (logado como atleta novo)
1. Ir em `/portal/filiacao` (ou link do app)
2. Preencher formulário de filiação → submeter
3. Confirmar redirect para Safe2Pay → pagar com **cartão de teste sandbox** ou PIX
4. Voltar pra `/portal/pagamentos/sucesso` (ou similar)

**Critério de sucesso**
- Linha em `filiacao_pedidos` com `status='AGUARDANDO_PAGAMENTO'`
- Linha em `pagamentos` com `safe2pay_id` preenchido + `status='aguardando'`
- Após pagamento confirmado pelo gateway → webhook chega → `filiacao_pedidos.status='APROVADO'` + `user_fed_lrsj.status_membro='Aceito'`

**Falhou?**
- `GET /api/admin/payments/pending` (logado como master) — veja se o webhook chegou
- Logs Vercel: `vercel logs --prod | grep WEBHOOK`

---

## 3. Webhook Safe2Pay — idempotência (B4)

**Passos**
1. Pegar um `webhook_events.id` que **já foi processado** (`processed=true`) do banco
2. Reenviar o mesmo payload manualmente:
   ```bash
   curl -X POST https://titan.smaartpro.com/api/webhooks/safe2pay \
     -H "Content-Type: application/json" \
     -d '<payload original do webhook_events.payload>'
   ```

**Critério de sucesso**
- Resposta `200 {"ok":true,"idempotent":true}`
- Nenhuma duplicata em `pagamentos`/`filiacao_pedidos`
- `webhook_events.attempts` **não** incrementa

**Falhou?**
- Provavelmente algo errado no índice único (`provider, external_id, event_type`)
- `supabase: select indexname, indexdef from pg_indexes where tablename='webhook_events'`

---

## 4. Webhook Safe2Pay — retry automático em erro (B4)

**Passos** (precisa de ambiente de teste; **não fazer em produção** se evitável)
1. Provocar erro injetando um payload com `Reference` inválido (UUID inexistente)
2. Confirmar resposta `500 {"error":"processing_failed"}`
3. Conferir `webhook_events.processing_error` preenchido + `attempts >= 1`
4. Safe2Pay reentrega automaticamente; verificar próxima tentativa

**Critério de sucesso**
- 500 retornado → Safe2Pay reagenda
- `attempts` incrementa a cada reentrega
- Quando o erro for resolvido, próxima entrega processa e `processed=true`

---

## 5. Carteirinha + Graduations Registry

**Passos**
1. Atleta novo (já filiado e pago) → `/portal/carteirinha`
2. Confirmar QR code + nome + foto + faixa + federação
3. Em outra aba (anônima) → escanear o QR → cair na página pública de verificação
4. `/portal/federacao/graduacoes` (com `?federacao=LRSJ`) → confirmar atleta aparece

**Critério de sucesso**
- Carteirinha renderiza sem erro
- Página pública de graduações lista o atleta (com paginação > 1000 funcionando — fix recente)

**Falhou?**
- Se a lista corta em 1000, o fix `fc3f6fb`/`fd7aa8c`/`169baed` regrediu

---

## 6. Backnumbers

**Passos**
1. Como federação admin → `/portal/federacao/backnumbers`
2. Confirmar lista completa de inscritos no evento
3. Atribuir backnumber a 2 atletas
4. Reload → confirmar persistência

**Critério de sucesso**
- Lista paginada sem cap em 1000 (fix `fc3f6fb`)
- Atribuição salva e reflete na lista pública

---

## 7. Reset de senha

**Passos**
1. Aba anônima → `/acesso` → clicar "Esqueci minha senha"
2. Inserir email do atleta novo → submeter
3. Conferir email recebido (Resend) com link `/auth/callback?...`
4. Clicar → cair em `/redefinir-senha`
5. Trocar senha (mín. 6 chars) → confirmar redirect pra `/portal`
6. Logout → login com **senha nova**

**Critério de sucesso**
- Email chega em até 60s
- Página `/redefinir-senha` aceita a sessão temporária
- Login com nova senha funciona; senha antiga falha

**Falhou?**
- Conferir env `NEXT_PUBLIC_APP_URL` no Vercel (pegadinha recente: tinha `\n` literal)
- Conferir redirect URLs no Supabase Auth (deve incluir `https://titan.smaartpro.com/auth/callback`)

---

## 8. Gate por role (RBAC)

**Passos** — para cada combinação testar **acesso permitido + acesso bloqueado**:

| Página | Atleta novo | Fed admin (LRSJ) | Master |
|--------|-------------|------------------|--------|
| `/portal` | ✅ | ✅ | ✅ |
| `/portal/federacao/filiacoes` | ❌ (403/redirect) | ✅ | ✅ |
| `/portal/federacao/backnumbers` | ❌ | ✅ | ✅ |
| `/portal/federacao/graduacoes` (admin tab) | ❌ | ✅ | ✅ |
| `/portal/admin/secretaria` | ❌ | ❌ | ✅ |
| `/api/admin/payments/pending` | 401/403 | 401/403 | ✅ JSON |

**Critério de sucesso**
- Bloqueios retornam 401/403 (não tela em branco nem 500)
- Master vê tudo; fed admin só vê escopo da federação; atleta só vê próprio dado

---

## 9. Importação Smoothcomp CSV (LRSJ)

**Passos** (logado como master ou fed admin LRSJ)
1. `/portal/federacao/filiacoes` → botão **"Importar Smoothcomp"**
2. Upload de `~/Downloads/2026-05-25-14_01_12.csv`
3. Dry-run → conferir contagens (inseridos/atualizados/erros)
4. Confirmar → executar importação real

**Critério de sucesso**
- Dry-run não toca o banco
- Importação real cria `auth.users` (via `admin.createUser`) que dispara trigger criando `stakeholders` automaticamente
- `tamanho_patch` normaliza valores "GRANDE (40x37)" → `'G'` (fix `007856a`)
- Lista de filiados recarrega após sucesso

**Falhou?**
- Conferir trigger `upsert_stakeholder_from_auth_user` ativa
- Conferir constraint `tamanho_patch in ('P','M','G')`

---

## 10. Email transacional — confirmação de pagamento

**Passos**
1. Atleta com pagamento confirmado (item 2)
2. Caixa de entrada do email do atleta

**Critério de sucesso**
- Email chega em até 60s do `webhook_events.processed_at`
- Assunto + corpo HTML renderizados (sem `[object Object]` ou variáveis cruas)
- Link/CTA funciona

**Falhou?**
- Logs Vercel: `[email confirmacao] falhou` → ver mensagem
- Resend dashboard → ver bounce/spam

---

## 11. Dashboard admin de pagamentos pendentes (B4)

**Passos** (master)
1. `GET https://titan.smaartpro.com/api/admin/payments/pending` (com cookie de sessão)
2. Confirmar JSON com `webhooks_pendentes` + `pagamentos_em_limbo`

**Critério de sucesso**
- `summary.webhooks_pendentes` = nº atual de `webhook_events.processed=false`
- `summary.pagamentos_em_limbo` = nº de `pagamentos` em `aguardando`/`pendente` > 24h
- Atleta tentando acessar: 401/403

---

## 12. Performance + 404s

**Passos**
1. Testar 5 rotas críticas no Chrome DevTools (Network tab):
   - `/portal`
   - `/portal/federacao/filiacoes`
   - `/portal/carteirinha`
   - `/acesso`
   - `/termos`
2. Conferir LCP < 3s, sem 404 em assets

**Critério de sucesso**
- Nenhum 404 em `/_next/...`, fontes ou imagens
- Páginas públicas (`/termos`, `/privacidade`) abrem sem login

---

## 13. Cron jobs Vercel

**Passos**
1. Vercel Dashboard → Titan project → Cron Jobs
2. Conferir que jobs configurados estão **ativos** + última execução foi bem-sucedida

**Critério de sucesso**
- Sem execuções vermelhas nas últimas 24h

---

## Pós-smoke

- [ ] Marcar todos os itens acima como ✅
- [ ] Limpar dados de teste (`stakeholders`, `pagamentos`, `auth.users` criados pelo smoke)
- [ ] Conferir logs Vercel sem erros não-tratados nas últimas 2h
- [ ] Backup Supabase confirmado nas últimas 24h
- [ ] Comunicar lançamento

Se qualquer item falhar e o fix não for trivial, **adiar o lançamento** e abrir issue/checklist do que ficou pendente.
