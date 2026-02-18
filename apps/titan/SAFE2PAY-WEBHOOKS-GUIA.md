# 🔧 Safe2Pay Webhooks - Guia de Implementação

**Status**: Pronto para registrar na Safe2Pay  
**Data**: 18/02/2026  
**Versão**: 1.0

---

## ✅ O que foi implementado

### 1. Webhook Handler Completo
**Arquivo**: `apps/titan/app/api/webhooks/safe2pay.ts`

Processa os **5 eventos de recorrência** indicados pelo suporte:

| Evento | Ação | Status |
|--------|------|--------|
| **SubscriptionCreated** | Nova assinatura criada | ✅ Implementado |
| **SubscriptionRenewed** | Renovação automática | ✅ Implementado |
| **SubscriptionFailed** | Falha na cobrança | ✅ Implementado |
| **SubscriptionCanceled** | Assinatura cancelada | ✅ Implementado |
| **SubscriptionExpired** | Ciclos limite atingido | ✅ Implementado |

### 2. Schema Supabase
**Arquivo**: `apps/titan/supabase/migrations/002_assinaturas_safe2pay.sql`

Tabelas criadas:
- `assinaturas` - Registra cada assinatura ativa
- `webhook_logs` - Auditoria de todos os webhooks recebidos
- Coluna `subscription_id` em `pedidos`

### 3. Fluxo de Dados

```
Safe2Pay
  ↓
POST https://titan.smaartpro.com/api/webhooks/safe2pay
  ↓
Identifica EventType
  ↓
├─ SubscriptionCreated → Cria assinatura + marca pedido como "aprovado"
├─ SubscriptionRenewed → Atualiza próxima cobrança + registra evento
├─ SubscriptionFailed → Marca como "suspenso" para alertar
├─ SubscriptionCanceled → Marca como "cancelado"
└─ SubscriptionExpired → Marca como "expirado"
  ↓
Registra log em webhook_logs
  ↓
Retorna { success: true }
```

---

## 🚀 Próximos Passos - Registrar Webhook na Safe2Pay

### Step 1: Acessar Painel Safe2Pay

1. Ir para: https://safe2pay.com.br/dashboard
2. Login com credenciais (token + merchant ID já devem estar em `.env.production`)

### Step 2: Navegar para Webhooks

1. Clique em **Settings** (⚙️ gear icon no canto superior direito)
2. Procure por **"Webhooks"** ou **"Integrações"** ou **"Notificações"**
3. (Se não encontrar, a resposta do suporte indicará o caminho exato)

### Step 3: Cadastrar Nova URL de Webhook

**Preencher com**:
```
URL: https://titan.smaartpro.com/api/webhooks/safe2pay
Método: POST
Content-Type: application/json
```

### Step 4: Habilitar os 5 Eventos

Marque TODOS os eventos:
- ✅ `SubscriptionCreated`
- ✅ `SubscriptionRenewed`
- ✅ `SubscriptionFailed`
- ✅ `SubscriptionCanceled`
- ✅ `SubscriptionExpired`

(Ou ajustar nomes conforme retorno do suporte)

### Step 5: Obter Token/Secret (se disponível)

Se Safe2Pay fornecer um secret para validar webhooks:
```bash
# Adicionar a .env.production:
SAFE2PAY_WEBHOOK_SECRET=seu_secret_aqui
```

Depois atualizar validação em `safe2pay.ts`:
```typescript
import crypto from 'crypto'

function validateWebhookSignature(payload: string, signature: string, secret: string) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return computed === signature
}
```

### Step 6: Testar Webhook

**Teste Manual (via curl)**:
```bash
curl -X POST https://titan.smaartpro.com/api/webhooks/safe2pay \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionCreated",
    "IdSubscription": "TEST-12345",
    "IdTransaction": "TRANS-67890",
    "Status": 3,
    "Amount": 129.90,
    "Customer": {
      "Email": "atleta@example.com",
      "Name": "Atleta Teste"
    },
    "Reference": "SUBSCRIPTION:teste"
  }'
```

**Verificar logs**:
```sql
-- Acessar Supabase console
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 Monitoramento

### Verificar Assinaturas Ativas

```sql
SELECT 
  a.id,
  ath.nome as atleta,
  ac.sigla as academia,
  a.valor,
  a.status,
  a.data_proxima_cobranca
FROM assinaturas a
JOIN atletas ath ON a.atleta_id = ath.id
JOIN academias ac ON a.academia_id = ac.id
WHERE a.status = 'ativo'
ORDER BY a.data_proxima_cobranca ASC;
```

### Verificar Eventos de Webhook

```sql
SELECT 
  event_type,
  subscription_id,
  action_taken,
  created_at
FROM webhook_logs
WHERE provider = 'safe2pay'
ORDER BY created_at DESC
LIMIT 20;
```

### Alertas para Suspensos

```sql
SELECT 
  ath.nome,
  a.id_subscription,
  a.status,
  (a.eventos->-1->>'dados')::json->>'motivo' as ultimo_motivo
FROM assinaturas a
JOIN atletas ath ON a.atleta_id = ath.id
WHERE a.status = 'suspenso'
ORDER BY a.updated_at DESC;
```

---

## 🔐 Segurança

### O que vairificar

1. **PII (Personally Identifiable Information)**
   - ✅ Emails salvos com hash
   - ✅ CPF não salvo no webhook (apenas na assinatura)
   - ✅ Telefone opcional

2. **Validação de Origem**
   - ⏳ Implementar verificação de IP do Safe2Pay (quando informar)
   - ⏳ Implementar HMAC signature validation (se oferecido)

3. **Rate Limiting**
   - ⏳ Adicionar rate limit no endpoint (máx 100 req/min por IP)
   - ⏳ Implementar idempotência (não processar mesmo webhook 2x)

---

## 📝 Payload Esperado (Exemplo Completo)

```json
{
  "EventType": "SubscriptionCreated",
  "IdSubscription": "SUB-2026-001",
  "IdTransaction": "TRANS-2026-001",
  "Status": 3,
  "TransactionStatus": {
    "Id": 3
  },
  "Amount": 129.90,
  "AmountDetails": {
    "TotalAmount": 129.90
  },
  "Reference": "SUBSCRIPTION:joao@example.com",
  "Customer": {
    "Email": "joao@example.com",
    "Name": "João Silva",
    "Identity": "12345678901",
    "Phone": "11999999999"
  },
  "PaymentMethod": 1
}
```

---

## 🎯 Checklist Pré-Produção

- [ ] Migration aplicada via Supabase console
- [ ] Webhook handler deployado em produção
- [ ] URL registrada no painel Safe2Pay
- [ ] 5 eventos habilitados no webhook
- [ ] Teste manual com curl realizado
- [ ] Log criado em webhook_logs
- [ ] Assinatura de teste criada com sucesso
- [ ] Email de confirmação recebido (quando implementar)
- [ ] Rate limiting implementado
- [ ] Validação de assinatura implementada
- [ ] Documentação no Notion/Slack atualizada

---

## 🐛 Troubleshooting

### "Webhook não está sendo chamado"
→ Verificar se URL está correta no painel S2P  
→ Verificar deployment em Vercel (`vercel logs`)  
→ Testar endpoint com curl manualmente

### "IdSubscription não encontrado"
→ Implementar busca por email como fallback  
→ Verificar se assinatura foi criada antes do webhook

### "Status 422: Unprocessable Entity"
→ Verificar formato do JSON enviado  
→ Comparar estrutura recebida vs esperada

### "Rate limit excedido"
→ Implementar fila de processamento (Redis/Bull)  
→ Aumentar timeout de processamento

---

## 📞 Suporte Safe2Pay

**Documentação**: https://developers.safe2pay.com.br/reference/recorrencia-criar-plano  
**Email**: suporte@safe2pay.com.br  
**Slack**: #integracao-safe2pay

**Perguntas pendentes**:
1. Como registrar webhook no painel? (aguardando Step 2)
2. Qual formato de assinatura HMAC? (se disponível)
3. IPs para whitelist?
4. Qual é o webhook secret?

---

**Criado por**: Dev Team  
**Última atualização**: 18/02/2026  
**Status**: ✅ Pronto para Registrar
