# 🔧 Safe2Pay Webhooks - Profep MAX

**Status**: ✅ Webhook Handler Implementado & Pronto  
**Data**: 18/02/2026  
**Versão**: 1.1 (Refatorado)

---

## ✅ O que está Implementado

### Webhook Handler
**Arquivo**: `src/app/api/webhooks/safe2pay/route.ts` (768 linhas)

**Eventos Suportados":
- ✅ `SubscriptionCreated` - Nova assinatura (primeira cobrança)
- ✅ `SubscriptionRenewed` - Renovação automática 
- ✅ `SubscriptionFailed` - Falha na cobrança
- ✅ `SubscriptionCanceled` - Assinatura cancelada
- ✅ `SubscriptionExpired` - Ciclos limite atingido

**Funcionalidades**:
```
1. Recebe webhook de Safe2Pay
   ↓
2. Identifica tipo de evento
   ↓
3. Roteia para handler específico
   ├─ handleSubscriptionCreated() → Ativa perfil + registra venda + envia emails
   ├─ handleSubscriptionRenewed() → Atualiza ciclo + registra novo pedido
   ├─ handleSubscriptionFailed() → Marca como falha + envia email de alerta
   ├─ handleSubscriptionCanceled() → Desativa + registra cancelamento
   └─ handleSubscriptionExpired() → Marca como expirado
   ↓
4. Registra evento em subscription_events
   ↓
5. Retorna 200 OK (evita retry infinito)
```

### Dados Processados

➤ **Por Evento**:

```typescript
SubscriptionCreated:
  - Ativa perfil (profiles.status = 'active')
  - Define plano (mensal/anual/vitalicio)
  - Registra venda inicial
  - Envia email de confirmação
  - Armazena IdSubscription

SubscriptionRenewed:
  - Atualiza plan_expires_at (próximo ciclo)
  - Incrementa cycle_number
  - Registra nova venda (ciclo 2, 3, ...)
  - Envia email de renovação

SubscriptionFailed:
  - Marca subscription_status = 'suspended'
  - Registra motivo do erro
  - Envia email de falha de pagamento
  
SubscriptionCanceled:
  - Marca subscription_status = 'canceled'
  - Desativa acesso (status = 'inactive')
  - Registra data de cancelamento
  
SubscriptionExpired:
  - Marca subscription_status = 'expired'
  - Desativa perfil
  - Envia email de expiração + opção renovação
```

---

## 🚀 Registrar Webhook na Safe2Pay

### Step 1: Acessar Painel Safe2Pay

```
1. Ir para: https://safe2pay.com.br/dashboard
2. Login com suas credenciais
```

### Step 2: Navegar para Webhooks

```
Settings (⚙️) → Webhooks / Integrações / Notificações
```

### Step 3: Registrar Nova URL

**Preencher com**:
```
URL: https://www.profepmax.com.br/api/webhooks/safe2pay
Método: POST
Content-Type: application/json
```

### Step 4: Habilitar os 5 Eventos

Marcar TODOS:
```
✅ SubscriptionCreated
✅ SubscriptionRenewed
✅ SubscriptionFailed
✅ SubscriptionCanceled
✅ SubscriptionExpired
```

### Step 5: Testar

**Teste Manual (curl)**:
```bash
curl -X POST https://www.profepmax.com.br/api/webhooks/safe2pay \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionCreated",
    "IdSubscription": "TEST-001",
    "IdTransaction": "TRANS-001",
    "Status": 3,
    "Amount": 129.90,
    "Customer": {
      "Email": "teste@profepmax.com.br",
      "Name": "Teste"
    }
  }'
```

**Verificar resposta**:
```
HTTP 200 OK
{ "message": "Assinatura criada com sucesso" }
```

---

## 📊 Monitoramento

### Verificar Webhooks Recebidos

```sql
SELECT 
  event_type,
  email,
  subscription_id,
  created_at
FROM subscription_events
WHERE event_type IN ('SubscriptionCreated', 'SubscriptionRenewed', 'SubscriptionFailed', 'SubscriptionCanceled', 'SubscriptionExpired')
ORDER BY created_at DESC
LIMIT 20;
```

### Verificar Assinaturas Ativas

```sql
SELECT 
  p.full_name,
  p.email,
  p.id_subscription,
  p.subscription_status,
  p.plan,
  p.plan_expires_at
FROM profiles p
WHERE p.subscription_status = 'active'
ORDER BY plan_expires_at ASC;
```

### Verificar Próximas Renovações

```sql
SELECT 
  p.full_name,
  p.plan_expires_at,
  (p.plan_expires_at - NOW()) as dias_restantes
FROM profiles p
WHERE p.subscription_status = 'active'
  AND p.plan_expires_at IS NOT NULL
ORDER BY p.plan_expires_at ASC
LIMIT 10;
```

### Dashboard de Saúde

```sql
SELECT 
  subscription_status,
  COUNT(*) as total,
  SUM(CASE WHEN plan = 'mensal' THEN 1 ELSE 0 END) as mensal,
  SUM(CASE WHEN plan = 'anual' THEN 1 ELSE 0 END) as anual,
  SUM(CASE WHEN plan = 'vitalicio' THEN 1 ELSE 0 END) as vitalicio
FROM profiles
WHERE subscription_status IS NOT NULL
GROUP BY subscription_status;
```

---

## 🔐 Melhorias Recomendadas

### 1. Validação de Assinatura (HMAC)
```typescript
import crypto from 'crypto'

function validateWebhookSignature(payload: string, signature: string) {
  const secret = process.env.SAFE2PAY_WEBHOOK_SECRET
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return computed === signature
}
```

### 2. Rate Limiting
```typescript
import Ratelimit from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
})

const { success } = await ratelimit.limit("safe2pay-webhook")
if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
```

### 3. Idempotência (não processar webhook 2x)
```typescript
// Verificar se já foi processado
const { data: alreadyProcessed } = await supabase
  .from('webhook_logs')
  .select('id')
  .eq('event_id', `${payload.IdSubscription}-${payload.IdTransaction}`)
  .single()

if (alreadyProcessed) {
  return NextResponse.json({ message: "Já processado" }, { status: 200 })
}
```

---

## 📋 Payload Esperado (Exemplo Completo)

```json
{
  "EventType": "SubscriptionCreated",
  "IdSubscription": "SUB-2026-001",
  "IdTransaction": "TRANS-2026-001", 
  "Status": 3,
  "TransactionStatus": { "Id": 3 },
  "Amount": 129.90,
  "AmountDetails": { "TotalAmount": 129.90 },
  "Reference": "SUBSCRIPTION:email@example.com",
  "Customer": {
    "Email": "email@example.com",
    "Name": "Nome Completo",
    "Identity": "12345678901",
    "Phone": "11999999999"
  },
  "PaymentMethod": 1
}
```

---

## 🎯 Checklist Pré-Produção

- [x] Webhook handler implementado e testado
- [x] Email confirmations configuradas
- [x] subscription_events auditoria funcionando
- [x] Plano detection (mensal/anual/vitalicio) funcionando
- [x] Renovação automática com ciclos registrados
- [x] Deploy em produção
- [ ] **Webhook registrado no painel Safe2Pay** ← PRÓXIMO
- [ ] Teste com dados reais
- [ ] Implementar validação HMAC
- [ ] Implementar rate limiting
- [ ] Monitoramento em tempo real (Sentry/LogRocket)

---

## 📞 Suporte

**Documentação S2P**: https://developers.safe2pay.com.br/reference/recorrencia-criar-plano  
**Email S2P**: suporte@safe2pay.com.br  
**Histórico**: `RECORRENCIA-SAFE2PAY.md`

---

## ✅ Status Atual

```
✅ Handler: Implementado (768 linhas, bem testado)
✅ Emails: Configurados (5 tipos)
✅ Banco: Migration aplicada
✅ Deploy: Produção
⏳ Safe2Pay: Aguardando registrar webhook
```

**Próxima ação**: Acessar painel Safe2Pay e registrar a URL conforme Steps acima.

---

**Atualizado**: 18/02/2026  
**Por**: Dev Team  
**Status**: 🟢 PRONTO PARA REGISTRAR
