# 🛠️ SPRINT 1 (Semana 1) - Esquema de Pagamentos v2

**Objetivo:** Estrutura de pagamentos totalmente automática com webhooks e status em tempo real

---

## 📋 ESTRUTURA DE DADOS

### Nova Tabela: `pedidos` (Payments/Orders)

```sql
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id),
  atleta_id UUID NOT NULL REFERENCES atletas(id),
  
  -- Informações do Pedido
  valor DECIMAL(10,2) NOT NULL,
  moeda VARCHAR(3) DEFAULT 'BRL',
  descricao TEXT,
  
  -- Status do Pagamento
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, processando, aprovado, recusado, cancelado
  metodo_pagamento VARCHAR(30), -- boleto, pix, credito, debito
  
  -- Safe2Pay IDs
  safe2pay_reference VARCHAR(100) UNIQUE,
  safe2pay_transaction_id VARCHAR(100),
  
  -- Datas
  data_vencimento DATE,
  data_pagamento TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  
  -- Relacionamento com Anuidade
  plano_id UUID REFERENCES academias(id), -- qual plano/anuidade relacionado
  mes_ref VARCHAR(7), -- "2026-02" para fevereiro de 2026
  
  -- Dados para recuperação
  tentativas_cobranca INT DEFAULT 0,
  proxima_tentativa_cobranca TIMESTAMP,
  motivo_recusa TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pedidos_academia ON pedidos(academia_id);
CREATE INDEX idx_pedidos_atleta ON pedidos(atleta_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_safe2pay_ref ON pedidos(safe2pay_reference);

-- RLS Policy: Usuário vê seus próprios pedidos
CREATE POLICY "Atletas veem seus pedidos"
  ON pedidos FOR SELECT
  USING (atleta_id = auth.uid());

CREATE POLICY "Gestores veem pedidos da academia"
  ON pedidos FOR SELECT
  USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('academia_admin', 'academia_gestor')
    )
  );
```

### Tabela: `webhooks_log` (Auditoria)

```sql
CREATE TABLE webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50), -- safe2pay, firebase, etc
  tipo_evento VARCHAR(100),
  payload JSONB,
  status_processamento VARCHAR(20), -- sucesso, erro, pendente
  mensagem_erro TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_provider ON webhooks_log(provider);
CREATE INDEX idx_webhooks_status ON webhooks_log(status_processamento);
```

### Tabela: `inadimplencia_eventos` (Histórico de Cobrança)

```sql
CREATE TABLE inadimplencia_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  evento VARCHAR(50), -- primeira_notificacao, segunda_notificacao, suspensao, reativacao
  data TIMESTAMP DEFAULT NOW(),
  motivo TEXT,
  enviado_para_aluno BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_inadimplencia_pedido ON inadimplencia_eventos(pedido_id);
```

---

## 🔌 ENDPOINTS API

### POST `/api/pagamentos/criar`
Cria um novo pedido no Safe2Pay

```typescript
// REQUEST
{
  academia_id: UUID,
  atleta_id: UUID,
  valor: number,
  descricao: string,
  metodo_pagamento: 'boleto' | 'pix' | 'credito',
  data_vencimento: string // "2026-03-15"
}

// RESPONSE
{
  pedido_id: UUID,
  safe2pay_reference: string,
  status: 'pendente',
  link_pagamento?: string,
  qr_code_pix?: string
}
```

### POST `/api/webhooks/safe2pay`
Recebe notificações de Safe2Pay (webhook)

```typescript
// SAFE2PAY SENDS:
{
  reference: string, // Correspondente a safe2pay_reference
  status: 'approved' | 'declined' | 'cancelled',
  transaction_id: string,
  paid_at?: string,
  amount: number
}

// ACTIONS:
// 1. Valida autenticação (token segredo Safe2Pay)
// 2. Atualiza pedido.status
// 3. Se aprovado:
//    - Atualiza academias.plan_status = 'active'
//    - Atualiza academias.plan_expire_date = data_vencimento + 1 mes
//    - Registra log em pedidos/atualiza
// 4. Se declined:
//    - Atualiza pedido.motivo_recusa
//    - Schedule notificação para aluno
//    - Calcula próxima tentativa (5 dias depois)
// 5. Log tudo em webhooks_log
```

### GET `/api/pagamentos/listar`
Lista pagamentos do aluno/academia

```typescript
// RESPONSE
{
  pedidos: [
    {
      id: UUID,
      valor: number,
      status: string,
      data_criacao: timestamp,
      data_pagamento?: timestamp,
      metodo_pagamento: string
    }
  ],
  total_pendente: number,
  ultimo_pagamento?: timestamp
}
```

### POST `/api/pagamentos/recobranca`
Tenta cobrar novamente um pedido recusado

```typescript
// REQUEST
{
  pedido_id: UUID
}

// LOGIC:
// 1. Valida que pedido.status === 'recusado'
// 2. Incrementa tentativas_cobranca
// 3. Se tentativas < 3:
//    - Resubmete para Safe2Pay
//    - Schedule próxima tentativa
// 4. Se tentativas >= 3:
//    - Marca como 'cancelado'
//    - Suspende acesso (plan_status = 'suspended')
//    - Notifica gestor
```

---

## 🔐 SEGURANÇA & WEBHOOKS

### Validação de Webhook

```typescript
// Validar assinatura Safe2Pay
function validateSafe2PayWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}
```

### Configurar Webhooks em Safe2Pay

1. Login em dashboard Safe2Pay
2. Settings → Webhooks
3. Adicionar URL: `https://titan-qlb9iwv3l-luiz-pavanis-projects.vercel.app/api/webhooks/safe2pay`
4. Eventos: `payment.approved`, `payment.declined`, `payment.cancelled`
5. Copiar Secret para environment variable: `SAFE2PAY_WEBHOOK_SECRET`

---

## 🔄 FLUXO AUTOMÁTICO DE COBRANÇA

### Cronograma (Implementado via Edge Functions + Vercel Crons)

```typescript
// Diariamente 00:00 UTC
// → Busca pedidos com status 'pendente' e data_vencimento <= hoje
// → Incrementa tentativas
// → Resubmete para Safe2Pay
// → Se falha 3x, suspende

// Semanalmente Segunda 09:00 UTC
// → Identifica alunos com 3+ dias de atraso
// → Envia notificação automática via Firebase

// Semanalmente Quinta 09:00 UTC
// → Se 15+ dias atraso, notifica gestor
// → Se 30+ dias, suspende acesso
```

### Arquivo: `app/api/cron/processar-inadimplencia.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Validar token de cron (Vercel)
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Buscar pedidos vencidos e não pagos
    const { data: pedidosVencidos } = await supabase
      .from('pedidos')
      .select('*')
      .eq('status', 'pendente')
      .lte('data_vencimento', new Date().toISOString().split('T')[0])
      .lt('tentativas_cobranca', 3);

    // 2. Para cada pedido, reprocessar
    for (const pedido of pedidosVencidos || []) {
      // Chamar Safe2Pay API para retry
      // Incrementar tentativas
      // Se falhar 3x, suspender
    }

    // 3. Notificar gestores sobre inadimplência crítica
    // ...

    return new Response('Processed', { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }
}
```

---

## 📲 INTEGRAÇÕES NECESSÁRIAS

### 1. Safe2Pay - Checkout Link Generation

```typescript
// lib/safe2pay.ts
export async function gerarCheckoutSafePay(pedido: {
  valor: number;
  descricao: string;
  metodo: string;
  reference: string;
}) {
  const response = await fetch('https://api.safe2pay.com.br/checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SAFE2PAY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(pedido.valor * 100), // em centavos
      description: pedido.descricao,
      reference: pedido.reference,
      method: pedido.metodo, // BOLETO, PIX, CREDIT_CARD
      redirect_url: `${process.env.NEXT_PUBLIC_URL}/pagamento/confirmacao`
    })
  });

  return response.json();
}
```

### 2. Firebase Cloud Messaging - Notificações

```typescript
// lib/firebase.ts (adicionar ao existente)
import * as admin from 'firebase-admin';

export async function enviarNotificacao(
  usuarioId: string,
  titulo: string,
  corpo: string,
  dados?: Record<string, string>
) {
  const fcmToken = await obterFCMToken(usuarioId); // De user_devices table
  
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: titulo,
      body: corpo
    },
    data: dados,
    android: {
      priority: 'high'
    },
    webpush: {
      urgency: 'high'
    }
  });
}
```

---

## ✅ CHECKLIST DA SPRINT

- [ ] Criar migrations SQL (pedidos, webhooks_log, inadimplencia_eventos)
- [ ] Implementar `/api/pagamentos/criar`
- [ ] Implementar `/api/webhooks/safe2pay`
- [ ] Implementar `/api/pagamentos/listar`
- [ ] Implementar `/api/pagamentos/recobranca`
- [ ] Configurar webhooks em Safe2Pay dashboard
- [ ] Criar `/api/cron/processar-inadimplencia`
- [ ] Adicionar testes automatizados (jest)
- [ ] Documentar segredos em `.env.local`
- [ ] Deploy em staging (dev branch) para testes

---

**Sprint Owner:** [Your Name]  
**Sprint Duration:** 1 semana (Feb 17-23)  
**Status:** 🟡 Planejamento  
**Próximo Standup:** Amanhã 09:00 UTC
