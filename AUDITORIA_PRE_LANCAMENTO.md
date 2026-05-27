# Auditoria pré-lançamento — Titan (titan.smaartpro.com)

Auditoria executada em 2026-05-27 sobre o app **apps/titan**. Cobre segurança,
fluxos críticos, performance e qualidade. Itens marcados foram **verificados
manualmente** pelo Claude, não só pelo agente — itens não verificados estão
marcados como `[a confirmar]`.

---

## 🔴 BLOQUEANTES (fix antes de lançar)

### B1. Endpoint `/api/admin/set-master-access` sem autenticação
**Arquivo**: [apps/titan/app/api/admin/set-master-access/route.ts](apps/titan/app/api/admin/set-master-access/route.ts)
**Risco**: Qualquer pessoa com a URL faz `POST { email, password }` e cria/promove um usuário com `master_access`. Isso é **takeover do sistema inteiro**.
**Fix**: Exigir `await supabase.auth.getUser()` e verificar `stakeholders.role === 'master_access'` antes de qualquer ação. Em produção, considerar remover este endpoint completamente (uso só por seed).

### B2. Endpoint `/api/academias/listar` público com PII
**Arquivo**: [apps/titan/app/api/academias/listar/route.ts](apps/titan/app/api/academias/listar/route.ts)
**Verificado**: `curl https://titan.smaartpro.com/api/academias/listar` (sem auth) retorna 32 academias com CNPJ, IE, IM, CPF do responsável, RG, telefone, email, endereço completo.
**Risco**: Vazamento de dados pessoais (LGPD) e empresariais.
**Fix**: Adicionar `await supabase.auth.getUser()`. Filtrar campos sensíveis (CPF/RG/CNPJ) da resposta a não-admins. Master_access vê tudo; outros veem só nome/sigla/cidade.

### B3. Endpoint `/api/academias/[id]` GET/PUT sem ownership check
**Arquivo**: [apps/titan/app/api/academias/[id]/route.ts](apps/titan/app/api/academias/[id]/route.ts)
**Risco**: GET retorna todos os campos; PUT permite alterar `safe2pay_api_key`, `safe2pay_api_secret`, `pagamento_habilitado`. Qualquer user autenticado pode trocar credenciais de pagamento de qualquer academia.
**Fix**: GET autenticado + filtragem por federacao. PUT exigir admin daquela academia/federação.

### B4. Webhook Safe2Pay sem retry / notificação ao usuário
**Arquivo**: [apps/titan/app/api/webhooks/safe2pay/route.ts](apps/titan/app/api/webhooks/safe2pay/route.ts)
**Risco**: Se webhook chega com 5xx do Supabase ou erro de DB, atleta paga mas fica "pendente" para sempre — sem fila/retry, sem notificação.
**Fix**: (a) Idempotência via `payment_reference` UNIQUE. (b) Webhook respond 200 só após commit. (c) Email/WhatsApp automático no sucesso. (d) Página admin "pagamentos pendentes" mostra divergências.

### B5. RLS habilitada sem policies — 18 tabelas
**Tabelas**: `academias`, `academy_logos`, `assinaturas`, `candidato_documentos`, `candidato_inscricoes`, `enrollment_requests`, `federacao_lote_config`, `federacoes`, `filiacao_pedidos`, `leads`, `lote_sequence_control`, `otp_verifications`, `promotion_rules`, `stakeholder_healthcheck_log`, `stakeholder_integrity_alerts`, `subscription_events`, `user_fed_lrsj_dedup_log`, `user_fed_lrsj_stakeholder_override_log`
**Risco**: Hoje só funciona porque endpoints usam `supabaseAdmin`. Mas: (a) qualquer página server-component que use `createClient()` lendo essas tabelas **redireciona em loop** (já vi com `/academias/[id]/editar`); (b) qualquer endpoint novo que esqueça `supabaseAdmin` vaza ou trava.
**Fix**: Para cada tabela: (a) confirmar que ninguém lê via client → manter sem policy (defesa em profundidade); (b) se houver leitura legítima → criar policy explícita. **Pelo menos** criar policy de SELECT para `academias` (necessária pra UI), `federacoes`, `filiacao_pedidos`.

---

## 🟠 ALTOS (não-bloqueante, mas resolver na semana)

### A1. `/api/auth/resolve-identifier` sem rate-limit
**Verificado**: endpoint público que aceita email/telefone/username e retorna email auth + telefone do stakeholder. Necessário para fluxo de login, mas atual permite enumeração da base inteira.
**Fix**: rate-limit por IP (~10/min) + por identifier (3/10min). Não retornar `telefone` na resposta (atualmente retorna).

### A2. Upload de documentos sem validação de MIME/tamanho
**Arquivo**: [apps/titan/app/api/atletas/self/upload-doc/route.ts](apps/titan/app/api/atletas/self/upload-doc/route.ts)
**Risco**: User autenticado faz upload de `.exe`, `.php`, etc. para bucket público.
**Fix**: whitelist extensão (`jpg|jpeg|png|pdf`), validar MIME real, `max_size = 5MB`.

### A3. 46+ endpoints `.select('*')` sem `.range()` ou `.limit()`
Já corrigi 3 que estouravam o cap de 1000 do PostgREST (graduacoes, backnumbers, filiados-lrsj). Restam ~46 endpoints que podem ter o mesmo problema quando os dados crescerem.
**Fix incremental**: adicionar paginação default (50 por página) + parâmetros `?page=&pageSize=`. Auditoria por endpoint conforme uso.

### A4. Console.logs em produção (207 ocorrências)
**Risco**: vazamento de tokens, IDs internos, dados de pagamento no Vercel logs (público se conta vazar).
**Fix**: criar `lib/logger.ts` com nível controlado por env. Substituir `console.log` críticos (webhooks safe2pay, set-master-access, send-otp).

### A5. `/api/auth/send-otp` rate-limit só por telefone
**Atual**: 3 OTPs por phone em 10 min. Falta limite por IP.
**Risco**: ataque distribuído (1000 números diferentes) — manda 1000 WhatsApps reais, custo + dano de imagem.
**Fix**: rate-limit por IP (~10/min) ou CAPTCHA antes do envio.

### A6. Buckets de storage com SELECT público que permite LIST
**Buckets**: `atletas`, `academias-logos`, `event-posters`
**Risco**: terceiros podem listar nomes de arquivo dentro dos buckets, expondo padrões de naming (CPF.jpg, etc.).
**Fix**: trocar policy "Public can view" por uma que só permite SELECT em path específico via signed URL.

### A7. Página `/federation/[slug]/admin` carrega dados sem role-check no client
**Arquivo**: [apps/titan/app/federation/[slug]/admin/page.tsx](apps/titan/app/federation/[slug]/admin/page.tsx)
**Risco**: client-side fetch de federacoes/academias/stakeholders sem validar role.
**Fix**: mover para server component + validar role antes de retornar JSX.

### A8. 40 funções SQL com search_path mutable
**Advisor**: `function_search_path_mutable`
**Risco**: pode permitir injeção via shadowing de schema em funções `SECURITY DEFINER`.
**Fix**: `ALTER FUNCTION ... SET search_path = public, pg_temp` em todas. Migration de uma vez só.

---

## 🟡 MÉDIOS / QUALIDADE

### Q1. `as any` (63 ocorrências) e `@ts-ignore` (773)
Distribuído entre `api/academia/anuidades`, `eventos/[id]/resultados`, `checkout`. Bloqueia refactor seguro. Não urgente, mas vai ferrar quando alguém mexer.

### Q2. Rotas duplicadas
| Pública | Federação | Decisão sugerida |
|---|---|---|
| `/academias/[id]` | `/portal/federacao/academias/[id]` | Manter apenas a do portal; a pública vira redirect |
| `/eventos/[id]/resultados` | `/portal/eventos/[id]/resultados` | Idem |

### Q3. `jspdf` em bundle inicial da calculadora
[apps/titan/app/(dashboard)/portal/candidato/calculadora/page.tsx](apps/titan/app/(dashboard)/portal/candidato/calculadora/page.tsx) faz import direto. Outras páginas usam `dynamic(() => import('jspdf'))`. +300KB no bundle inicial pra função pouco usada.

### Q4. Falta `.env.example`
Devs novos não sabem quais vars setar. Confusão entre `SUPABASE_SERVICE_KEY` (não existe) e `SUPABASE_SERVICE_ROLE_KEY` (correto) em alguns arquivos.

### Q5. Auth leaked password protection desabilitada
Advisor Supabase. Requer Pro plan. Já discutimos — você decidiu deixar.

---

## ✅ Itens em ordem (não-problemas confirmados)

- **0 ERRORs nos advisors do Supabase** (todos os críticos de RLS já foram resolvidos em sessão anterior).
- **Secrets não vazados em client code**: `SUPABASE_SERVICE_ROLE_KEY`, `SAFE2PAY_*`, `META_WHATSAPP_*`, `RESEND_API_KEY` não aparecem em arquivos `'use client'` nem como `NEXT_PUBLIC_*`.
- **Middleware de auth funcional**: redireciona não-autenticados para `/acesso`, autenticados para `/portal`.
- **Fluxo de inscrição em evento**: validações robustas em `/api/eventos/self/inscricao` (status, datas, limite, dedup).
- **Página `/portal/candidato` gate corretamente**: layout valida `stakeholder.candidato === true` ou admin roles antes de mostrar.
- **/lrsj/graduacoes & /portal/federacao/backnumbers**: paginação implementada, contagens batem com CSV.
- **Importação Smoothcomp**: funcional após os fixes de `tamanho_patch`, `auth.admin.createUser`.
- **Carteira pública `/(public)/carteira/[id]`**: usa cliente público com policy de SELECT em `kyu_dan` adequada.

---

## Roadmap recomendado até o lançamento

**Semana 1 — Bloqueantes**
- B1 (set-master-access): 30min
- B2 (academias/listar): 1h
- B3 (academias/[id]): 1h
- B5 (RLS academias + federacoes + filiacao_pedidos): 2h

**Semana 2 — Altos**
- A1, A2, A5 (rate-limit + upload validation): 4h
- A4 (logger): 2h
- A8 (search_path em funções): 30min via migration única
- A3 (paginação em 5 endpoints mais críticos): 4h

**Semana 3 — Polimento + lançamento**
- Q3, Q4 (quick wins): 1h
- Teste end-to-end com Safe2Pay real
- Validar email de confirmação de pagamento chega
- Configurar domínio definitivo + cert + DNS

---

**Conclusão**: o app está funcionalmente sólido (já roda em produção com dados reais) mas tem **2 vulnerabilidades sérias** (B1 e B2) que precisam ir embora antes de você divulgar a URL. O resto é gestão de risco normal para um app crescendo.
