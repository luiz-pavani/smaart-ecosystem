# API de Recorrência Safe2Pay - Implementação Correta

## 🎯 Visão Geral

Este documento descreve a implementação CORRETA da API de Recorrência Safe2Pay no Profep Max. O sistema foi reformulado para usar a arquitetura **2-step** (Plans → Subscriptions), abandonando a API antiga de pagamentos únicos com campo "Recurrent".

---

## 🔧 Arquitetura

### **Antes (ERRADO)**
```
POST https://payment.safe2pay.com.br/v2/payment
{
  "Recurrent": {
    "Interval": "Monthly",
    "Value": 49.90
  }
}
```

❌ **Problema:** Esta API **NÃO** implementa recorrência real. Não há renovação automática, webhooks de ciclo de vida, retry automático ou gestão centralizada de planos.

---

### **Agora (CORRETO)**
```
1. Criar Plans (uma vez)
   POST https://services.safe2pay.com.br/recurrence/v1/plans/

2. Criar Subscriptions (cada checkout)
   POST https://services.safe2pay.com.br/recurrence/v1/plans/{planId}/subscriptions
```

✅ **Vantagens:**
- ✅ Renovação automática real
- ✅ Webhooks de ciclo de vida (Created, Renewed, Failed, Canceled)
- ✅ Retry automático de cobranças
- ✅ Gestão centralizada de planos (alterar valor em um lugar)
- ✅ Maior controle sobre assinaturas

---

## 📋 Passo a Passo de Implementação

### **1. Criar Plans no Safe2Pay**

Execute o script de setup **uma vez** para criar os 3 planos:

```bash
cd profep-max
npx ts-node scripts/setup-safe2pay-plans.ts
```

Você verá a saída:
```
✅ Plano criado: Profep Max - Plano Mensal (ID: <id_mensal>)
✅ Plano criado: Profep Max - Plano Anual (ID: <id_anual>)
✅ Plano criado: Profep Max - Plano Vitalício (ID: <id_vitalicio>)

📌 Adicione os IDs ao .env.local:
SAFE2PAY_PLAN_ID_MENSAL=<id_mensal>
SAFE2PAY_PLAN_ID_ANUAL=<id_anual>
SAFE2PAY_PLAN_ID_VITALICIO=<id_vitalicio>
```

---

### **2. Configurar Variáveis de Ambiente**

Adicione ao `.env.local`:

```env
# Safe2Pay API Token
SAFE2PAY_API_TOKEN=seu_token_aqui
SAFE2PAY_TOKEN=seu_token_aqui

# Plan IDs (obtidos no passo 1)
SAFE2PAY_PLAN_ID_MENSAL=abc123
SAFE2PAY_PLAN_ID_ANUAL=def456
SAFE2PAY_PLAN_ID_VITALICIO=ghi789
```

---

### **3. Fluxo de Checkout**

Quando o usuário finalizar o checkout:

1. **API busca Plan ID** baseado no plano escolhido (mensal/anual/vitalicio)
2. **Se for cartão:**
   - Tokeniza o cartão: `POST /payment/v2/card/token`
   - Cria assinatura com token: `POST /recurrence/v1/plans/{planId}/subscriptions` + `Token`
3. **Se for boleto ou Pix:**
   - Cria assinatura diretamente: `POST /recurrence/v1/plans/{planId}/subscriptions` (PaymentMethod 1=Boleto, 6=Pix)
4. **Armazena `subscription_id`** no perfil do usuário (profiles.id_subscription)

---

### **4. Webhooks de Ciclo de Vida**

Configure o **Callback URL** no painel Safe2Pay:

```
https://<seu-projeto>.supabase.co/functions/v1/safe2pay-webhook
```

A API enviará webhooks para os seguintes eventos:

#### **SubscriptionCreated**
- **Quando:** Primeira cobrança confirmada
- **Ação:** Ativa perfil, define `plan_expires_at`, registra venda, envia email de confirmação

#### **SubscriptionRenewed**
- **Quando:** Renovação automática bem-sucedida
- **Ação:** Estende `plan_expires_at`, incrementa `cycle_number`, registra nova venda

#### **SubscriptionFailed**
- **Quando:** Falha na cobrança recorrente
- **Ação:** Suspende perfil (`subscription_status: 'suspended'`), envia email de falha

#### **SubscriptionCanceled**
- **Quando:** Assinatura cancelada (pelo usuário ou admin)
- **Ação:** Desativa perfil (`status: 'inactive'`), expira plano imediatamente

#### **SubscriptionExpired**
- **Quando:** Assinatura expirou por falta de pagamento
- **Ação:** Similar ao cancelamento

---

## 📂 Arquivos Criados/Modificados

### **Novos Arquivos**
1. **`src/lib/safe2pay-recurrence.ts`**
   - Utilitários para tokenização de cartão
   - Criar assinaturas
   - Buscar/desabilitar assinaturas
   - Obter Plan IDs

2. **`scripts/setup-safe2pay-plans.ts`**
   - Script one-time para criar plans no Safe2Pay
   - Configurações dos 3 planos (Mensal R$49.90, Anual R$359.00, Vitalício R$997.00)

3. **`RECORRENCIA-API-CORRETA.md`**
   - Este documento

---

### **Arquivos Modificados**
1. **`src/app/api/checkout/route.ts`**
   - **Antes:** Chamava `/v2/payment` com campo `Recurrent`
   - **Agora:** Tokeniza cartão → busca Plan ID → cria subscription

2. **`src/app/api/webhooks/safe2pay/route.ts`**
   - **Já estava correto!** Handlers para SubscriptionCreated, SubscriptionRenewed, etc.
   - Sem mudanças necessárias (já usa `IdSubscription` e trata eventos corretamente)

---

## 🧪 Testes

### **Testar Checkout com Cartão**
```bash
# 1. Frontend: Preencher checkout com dados de cartão
# 2. Backend: Verificar logs
[CHECKOUT] Tokenizando cartão...
[CHECKOUT] Cartão tokenizado: tok_abc123 | Bandeira: Visa
[CHECKOUT] Criando assinatura...
[CHECKOUT] ✅ Assinatura criada: sub_xyz789
```

### **Testar Webhooks (Sandbox)**
Use a ferramenta de testes do Safe2Pay para simular eventos:
```json
{
  "EventType": "SubscriptionCreated",
  "IdSubscription": "12345",
  "Customer": { "Email": "teste@example.com" },
  "Amount": 49.90
}
```

---

## 📊 Estrutura de Dados

### **Planos (Plans)**
```typescript
{
  "PlanOption": 1,               // 1=Pré-pago, 3=Pós-pago
  "Name": "Profep Max - Plano Mensal",
  "Amount": 49.90,
  "PlanFrequence": 1,            // 1=Mensal, 2=Anual, 3=Semanal
  "ChargeDay": 1,                // Dia do mês para cobrança
  "IsImmediateCharge": true,     // Cobrar imediatamente na criação
  "BillingCycle": null           // null=Infinito, 1=Uma vez (vitalício)
}
```

### **Assinaturas (Subscriptions)**
```typescript
{
  "PaymentMethod": "2",          // 1=Boleto, 2=Cartão
  "Customer": {
    "Emails": ["usuario@example.com"],
    "Token": "tok_abc123"        // Se for cartão tokenizado
  },
  "Vendor": "PROFEPMAX EDUCAÇÃO"
}
```

---

## 🚀 Próximos Passos

1. ✅ Executar `setup-safe2pay-plans.ts` para criar plans
2. ✅ Adicionar Plan IDs ao `.env.local`
3. ✅ Testar checkout com cartão de teste
4. ✅ Testar checkout com boleto
5. ⏳ Configurar Callback URL no painel Safe2Pay
6. ⏳ Testar webhooks em sandbox
7. ⏳ Validar renovações automáticas

---

## 📝 Notas Importantes

- **Plans são criados UMA VEZ** e reutilizados para todas as assinaturas do mesmo tipo
- **Cada checkout cria uma nova Subscription** vinculada ao Plan ID
- **Webhooks são enviados para o Callback URL** configurado no painel Safe2Pay
- **subscription_id** é armazenado em `profiles.id_subscription` para rastreamento
- **Vitalício usa BillingCycle=1** (uma cobrança única, mas na API de recorrência)

---

## 🔗 Referências

- [Safe2Pay - Recurrence API](https://developers.safe2pay.com.br/docs/Recurrence/introduction/)
- [Safe2Pay - Tokenização de Cartão](https://developers.safe2pay.com.br/docs/Tokenization/)
- [Safe2Pay - Webhooks](https://developers.safe2pay.com.br/docs/Webhooks/)

---

> **Última atualização:** Janeiro 2025  
> **Status:** ✅ Implementação completa  
> **API Version:** Recurrence v1
