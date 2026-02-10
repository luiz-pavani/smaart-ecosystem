# 📋 Integração de Recorrência Safe2Pay - Guia Completo

## 1. Eventos do Ciclo de Vida

A Safe2Pay envia webhooks para os seguintes eventos de assinatura recorrente:

| Evento | Descrição | Ação Necessária |
|--------|-----------|-----------------|
| **SUBSCRIPTION_CREATED** | Assinatura criada com sucesso | Armazenar `IdSubscription` no perfil/vendas |
| **SUBSCRIPTION_RENEWED** | Renovação automática processada | Registrar novo ciclo em vendas, atualizar status |
| **SUBSCRIPTION_FAILED** | Falha na cobrança recorrente | Suspender acesso, enviar email de ação |
| **SUBSCRIPTION_CANCELED** | Assinatura cancelada | Desativar acesso, registrar cancelamento |
| **SUBSCRIPTION_EXPIRED** | Ciclos limite atingido | Desativar acesso, oferecer renovação manual |

---

## 2. Campos Importantes no Payload

```typescript
// Quando a assinatura é criada
{
  "IdSubscription": "12345",        // ID ÚNICO da assinatura - GUARDAR ISTO!
  "IdTransaction": "67890",         // ID da transação
  "EventType": "SubscriptionCreated" | "SubscriptionRenewed" | "SubscriptionFailed" | "SubscriptionCanceled"
  "Reference": "SUBSCRIPTION:email@example.com", // Referência customizada
  "Customer": {
    "Email": "user@example.com",
    "Name": "Nome Completo"
  },
  "Amount": 49.90,                  // Valor da transação
  "TransactionStatus": {
    "Id": 3                         // Status: 3 = Pago, 2 = Processando, 1 = Falha
  }
}
```

---

## 3. Fluxo Esperado

### ✅ Assinatura Mensal - Fluxo Feliz

```
1. Usuário clica em "Comprar Plano Mensal"
   ↓
2. Frontend chama POST /api/checkout (com plan: "mensal", isRecurrent: true)
   ↓
3. Backend chama Safe2Pay com Recurrent: { Interval: "Monthly", Value: 49.90 }
   ↓
4. Safe2Pay retorna { IdSubscription: "12345" } + URL de pagamento
   ↓
5. Usuário realiza pagamento (Pix, Cartão, Boleto)
   ↓
6. Safe2Pay envia WEBHOOK com status 3 (Pago) + IdSubscription
   ↓
7. Backend atualiza:
   - profiles.id_subscription = "12345"
   - profiles.status = "active"
   - profiles.plan = "mensal"
   - vendas: insere novo registro com subscription_id = "12345"
   ↓
8. Usuário recebe confirmação por email e tem acesso liberado
   ↓
9. ✅ Mês 1: Acesso ativo
   ↓
10. [Dia 30+] Safe2Pay processa renovação automática
    ↓
11. Safe2Pay envia WEBHOOK SubscriptionRenewed com IdSubscription: "12345"
    ↓
12. Backend:
    - Valida se subscription_id existe e está ativa
    - Atualiza profiles.plan_expires_at (próximas 30 dias)
    - Insere novo registro em vendas com subscription_id: "12345" (ciclo 2)
    - Envia email de confirmação de renovação
    ↓
13. ✅ Mês 2: Acesso continua ativo
    ↓
14. Repetir até cancelamento ou limite de ciclos
```

### ❌ Assinatura Mensal - Fluxo de Falha

```
1. [Dia 30] Safe2Pay tenta renovação, cartão recusado
   ↓
2. Safe2Pay tenta novamente em 1 dia (total 3 tentativas com 1 dia de intervalo)
   ↓
3. Após 3 falhas: Safe2Pay envia WEBHOOK SubscriptionFailed
   ↓
4. Backend:
    - Marca profiles.status = "suspended" ou "payment_failed"
    - Define profiles.plan_expires_at = data de hoje
    - Envia email: "Pagamento recusado. Tente novamente em XXX"
    ↓
5. Usuário recebe email e trata o problema (atualiza cartão, etc.)
   ↓
6. Se usuário não resolver: Assinatura é cancelada automaticamente
   ↓
7. Safe2Pay envia WEBHOOK SubscriptionCanceled
   ↓
8. Backend marca profiles.status = "canceled", acesso revogado
```

---

## 4. Schema do Banco de Dados - Mudanças Necessárias

### profiles
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_subscription VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50); -- "active", "suspended", "canceled"
```

### vendas
```sql
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1; -- Qual ciclo (1º, 2º, 3º mês)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS event_type VARCHAR(50); -- "SubscriptionCreated", "SubscriptionRenewed", etc.
```

---

## 5. Implementação no Webhook

### Tratamento por EventType

```typescript
export async function handleSafe2PayWebhook(payload) {
  const eventType = payload.EventType || inferEventType(payload);
  const subscriptionId = payload.IdSubscription;
  const email = payload.Customer?.Email;
  const amount = payload.Amount;
  
  switch(eventType) {
    case "SubscriptionCreated":
      // Primeira cobrança confirmada
      // - Atualizar profiles.id_subscription
      // - Atualizar profiles.plan_expires_at (+ 30/365 dias)
      // - Inserir em vendas com cycle_number = 1
      break;
      
    case "SubscriptionRenewed":
      // Renovação automática confirmada
      // - Validar se id_subscription existe
      // - Atualizar profiles.plan_expires_at (+ 30/365 dias)
      // - Inserir novo registro em vendas com cycle_number incrementado
      break;
      
    case "SubscriptionFailed":
      // Falha na cobrança
      // - Marcar profiles.subscription_status = "suspended"
      // - Enviar email com instruções
      break;
      
    case "SubscriptionCanceled":
      // Cancelamento
      // - Marcar profiles.subscription_status = "canceled"
      // - Marcar profiles.status = "inactive"
      // - Revogar acesso
      break;
  }
}
```

---

## 6. Referência - Endpoints Safe2Pay para Controle

- **Criar Plano**: `POST /recurrence/v1/plans/`
- **Criar Assinatura**: `POST /recurrence/v1/plans/{id}/subscriptions`
- **Cancelar Assinatura**: `DELETE /recurrence/v1/subscriptions/{idSubscription}`
- **Listar Assinaturas**: `GET /recurrence/v1/subscriptions`

---

## 7. Checklist de Implementação

- [ ] Adicionar campos em `profiles` (id_subscription, plan_expires_at, subscription_status)
- [ ] Adicionar campos em `vendas` (subscription_id, cycle_number, event_type)
- [ ] Atualizar `/api/checkout` para capturar e armazenar IdSubscription
- [ ] Expandir webhook para tratar SubscriptionCreated, SubscriptionRenewed, SubscriptionFailed, SubscriptionCanceled
- [ ] Adicionar lógica de suspensão de acesso em caso de falha
- [ ] Testar ciclo completo: criação → renovação → falha → cancelamento
- [ ] Implementar endpoint de cancelamento manual (PUT/DELETE)

---

## 8. Dicas Importantes

1. **IdSubscription é IMUTÁVEL**: Use sempre como identificador único da assinatura
2. **Idempotência**: Sempre verificar se o registro já existe antes de inserir
3. **Retorno HTTP 200**: Webhooks SEMPRE devem retornar 200, mesmo em erro (para não retentativa infinita)
4. **Logs Detalhados**: Registre todos os eventos para debug
5. **Timezone**: Use ISO 8601 para todas as datas
