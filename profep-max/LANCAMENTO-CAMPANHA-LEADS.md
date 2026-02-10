# 🚀 CAMPANHA DE LANÇAMENTO - DOCUMENTAÇÃO COMPLETA

## ✅ STATUS: TUDO PRONTO PARA DEPLOY

### 📦 O que foi preparado:

#### 1. Estrutura de Dados ✅
- **Arquivo:** `launch-campaign-setup.sql`
- **Tabela:** `launch_campaign_leads`
- **Campos de rastreamento:**
  - `email_sent_at` - quando foi enviado
  - `email_opened_at` - quando foi aberto (pixel tracking)
  - `email_clicked_at` - quando clicou no link
  - `conversion_at` - quando converteu (após pagamento)
  - `tracking_id` - ID único para rastreamento
  - `status` - pending, sent, opened, clicked, converted, bounced
- **View:** `launch_campaign_stats` para métricas em tempo real

#### 2. Edge Function ✅
- **Nome:** `send-launch-campaign`
- **Arquivo:** `supabase/functions/send-launch-campaign/index.ts`
- **Funcionalidade:**
  - Busca leads com `email_sent_at IS NULL` (não enviados)
  - Envia email com desconto de 35% (R$ 39,90 no cartão)
  - Marca `email_sent_at` após sucesso
  - Inclui URL com `tracking_id` para rastreamento
  - Delay de 300ms entre emails (rate limit Resend)
  - Logs detalhados de sucesso/erro

#### 3. Rastreamento com Resend ✅
- **Abertura de Email:** Pixel tracking invisível (1x1 GIF)
  - Endpoint: `/api/tracking/open?id={tracking_id}`
  - Marca: `email_opened_at` + status `opened`
  
- **Clique no Link:** Endpoint de clique
  - Endpoint: `/api/tracking/click?id={tracking_id}`
  - Marca: `email_clicked_at` + status `clicked`
  - Pode ser acionado automaticamente no checkout

- **Conversão:** Manual via SQL (após pagamento)
  - Marca: `conversion_at` + status `converted`

#### 4. Template de Email ✅
- **Assunto:** 🥋 PROFEP MAX 2026 - 35% OFF por 48h (R$ 39,90/mês)
- **Oferta:** 35% OFF por 48 horas (R$ 61,38 → R$ 39,90) no cartão
- **Limite:** Primeiros 30 clientes
- **Tone:** Mesmo da campanha de migração (profissional, judô-focused)
- **CTAs:** Link "COMECE AGORA" com tracking automático
- **Design:** Responsivo, gradientes vermelho/dourado, visual moderno

---

## 🎯 PASSO A PASSO PARA LANÇAR

### PASSO 1: Criar a Estrutura no Supabase

1. Acesse: https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/editor
2. Clique em **"SQL Editor"**
3. Cole o conteúdo de: `launch-campaign-setup.sql`
4. Clique em **"RUN"**

**Checklist:**
- ✅ Tabela `launch_campaign_leads` criada
- ✅ Índices criados
- ✅ Trigger de `updated_at` funcionando
- ✅ View `launch_campaign_stats` disponível
- ✅ RLS ativo

**Validar:**
```sql
SELECT * FROM launch_campaign_stats;
-- Deve retornar: total_leads=0, sent_count=0, etc
```

---

### PASSO 2: Importar Base de Emails (Quando tiver o CSV)

Você mencionou que vai fornecer o CSV com todos os contatos. Quando tiver, faça:

```sql
-- Opção A: Via psql (recomendado para grandes volumes)
psql "postgresql://..." -c "\COPY launch_campaign_leads(email, full_name, source) FROM 'leads.csv' WITH (FORMAT csv, HEADER)"

-- Opção B: Inserir manualmente no Dashboard
-- Dashboard → SQL Editor → INSERT INTO launch_campaign_leads...
```

**Estrutura esperada do CSV:**
```csv
email,full_name,source
joao@example.com,João Silva,google_ads
maria@example.com,Maria Santos,facebook
pedro@example.com,Pedro Costa,tiktok
```

**Validar:**
```sql
SELECT COUNT(*) FROM launch_campaign_leads;
-- Deve retornar o número total de leads importados
```

---

### PASSO 3: Deploy da Edge Function

```bash
cd "/Users/judo365/Documents/MASTER ESPORTES/SMAART PRO/PROFEP/profep-max-2026"

npx supabase functions deploy send-launch-campaign
```

**Esperado:**
```
Deployed Functions on project sxmrqiohfrktwlkwmfyr: send-launch-campaign
```

**Dashboard:**
https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/functions

---

### PASSO 4: Testar com UM Email Primeiro

Insira um lead de teste:
```sql
INSERT INTO launch_campaign_leads (email, full_name, source)
VALUES ('seu-email@example.com', 'Seu Nome', 'test')
RETURNING *;
```

Invoque a função:
```bash
curl -X POST \
  'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-launch-campaign' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bXJxaW9oZnJrdHdsa3dtZnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTQzNzgsImV4cCI6MjA4MzM5MDM3OH0.LAMsBdZTpfXIuICluFb7MBii2DTbH-LCgq269l6RF6Q' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Esperado:**
```json
{
  "message": "Campanha de lançamento enviada",
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

**Checklist do Email:**
- ✅ Email recebido em sua caixa de entrada
- ✅ Assunto: "🥋 PROFEP MAX 2026 - 35% OFF por 48h..."
- ✅ Saudação: "HAI, Seu Nome!"
- ✅ Preço: R$ 39,90/mês (35% OFF)
- ✅ Urgência: 48 horas + limite de 30 clientes
- ✅ CTA: "COMECE AGORA" link funcional
- ✅ Design responsivo em mobile
- ✅ Despedida: "ARIAGATŌ! Equipe PROFEP MAX"

**Validar Rastreamento:**
```sql
SELECT * FROM launch_campaign_leads 
WHERE email = 'seu-email@example.com';
```

Deve mostrar:
- `email_sent_at`: preenchido (timestamp de agora)
- `status`: 'sent'
- `tracking_id`: UUID único
- `email_opened_at`: NULL (ainda não abriu)

---

### PASSO 5: Disparar Campanha em Massa

⚠️ **ATENÇÃO:** Isso enviará para TODOS os leads ainda não marcados como `sent`!

```bash
curl -X POST \
  'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-launch-campaign' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bXJxaW9oZnJrdHdsa3dtZnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTQzNzgsImV4cCI6MjA4MzM5MDM3OH0.LAMsBdZTpfXIuICluFb7MBii2DTbH-LCgq269l6RF6Q' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Ou via Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/functions/send-launch-campaign
2. Clique em **"Invoke Function"**
3. Clique em **"Send Request"**

**Monitorar em Tempo Real:**
```bash
npx supabase functions logs send-launch-campaign --remote
```

---

## 📊 MONITORAR RESULTADOS

### 1. Dashboard Resend
https://resend.com/emails
- Taxa de entrega
- Taxa de abertura
- Taxa de clique
- Bounces

### 2. Estatísticas no Banco

```sql
-- Ver estatísticas completas
SELECT * FROM launch_campaign_stats;

-- Ver por fonte
SELECT source, COUNT(*) as total, 
       COUNT(email_sent_at) as enviados,
       COUNT(email_opened_at) as abertos,
       COUNT(email_clicked_at) as cliques,
       COUNT(conversion_at) as conversoes
FROM launch_campaign_leads
GROUP BY source;

-- Ver leads que clicaram mas não converteram
SELECT email, full_name, email_clicked_at, conversion_at
FROM launch_campaign_leads
WHERE email_clicked_at IS NOT NULL AND conversion_at IS NULL
ORDER BY email_clicked_at DESC;

-- Ver taxa de conversão por fonte
SELECT source,
       COUNT(*) as leads,
       COUNT(conversion_at) as conversoes,
       ROUND(100.0 * COUNT(conversion_at) / COUNT(*), 2) as conversion_rate
FROM launch_campaign_leads
GROUP BY source
ORDER BY conversion_rate DESC;
```

### 3. Integrar Conversão

Quando um lead do email converter (completar pagamento), marque:
```sql
UPDATE launch_campaign_leads
SET conversion_at = NOW(),
    status = 'converted'
WHERE tracking_id = 'seu-tracking-id-aqui'
  AND conversion_at IS NULL;
```

Ou, no checkout do Next.js, adicione:
```typescript
// Após pagamento bem-sucedido
await fetch(`/api/tracking/conversion?id=${trackingId}`);
```

---

## 🔄 FLUXO RESUMIDO

```
1. Leads Importados (email, full_name, source)
2. Campanha Dispara (send-launch-campaign)
3. Email Enviado → email_sent_at = NOW(), status = 'sent'
4. Lead abre email → Pixel rastreado → email_opened_at = NOW(), status = 'opened'
5. Lead clica link → /api/tracking/click?id={id} → email_clicked_at = NOW(), status = 'clicked'
6. Lead chega no checkout → Pode disparar clique automaticamente se não foi
7. Lead paga → conversion_at = NOW(), status = 'converted'
8. Analytics em tempo real via launch_campaign_stats
```

---

## ⚙️ ENDPOINTS DE RASTREAMENTO

### Abertura de Email (Pixel)
```
GET /api/tracking/open?id={tracking_id}
Retorna: GIF transparente 1x1
Marca: email_opened_at + status 'opened'
```

### Clique no Link
```
GET /api/tracking/click?id={tracking_id}
Retorna: { success: true, message: 'Clique registrado' }
Marca: email_clicked_at + status 'clicked'
```

### Conversão (Manual/Checkout)
```
SQL: UPDATE launch_campaign_leads
     SET conversion_at = NOW(), status = 'converted'
     WHERE tracking_id = ?
```

---

## 📋 CHECKLIST FINAL

Antes de disparar a campanha:

- [ ] SQL de setup executado no Supabase
- [ ] Tabela `launch_campaign_leads` criada com sucesso
- [ ] CSV com emails de leads preparado
- [ ] Leads importados (validar COUNT)
- [ ] Edge function `send-launch-campaign` deployed
- [ ] Teste com 1 email funcionando
- [ ] Email template visualizado (design OK)
- [ ] Rastreamento testado (abrir email + clicar link)
- [ ] Resend API Key configurada
- [ ] Endpoints de tracking `/api/tracking/open` e `/api/tracking/click` rodando
- [ ] Dashboard Resend acessível
- [ ] Suporte preparado para perguntas dos leads

---

## 📞 SUPORTE

Se encontrar erros:

**Erro: "Tabela launch_campaign_leads não existe"**
- Solução: Executar o SQL de setup completo

**Erro: "501 Unauthorized" no curl**
- Solução: Verificar ANON_KEY, copiar de `.env.local`

**Email não chegando**
- Verificar: Logs do Resend Dashboard
- Verificar: Logs da Edge Function
- Verificar: Spam/promocional do Gmail/Outlook

**Rastreamento não funcionando**
- Verificar: Se o lead tem `tracking_id` preenchido
- Verificar: Se endpoints `/api/tracking/` estão respondendo
- Verificar: Logs do Supabase (update não está rodando?)

---

**HAI! Tudo pronto para a campanha de lançamento! 🥋**

Quando confirmar que os leads estão importados, avise que disparo!
