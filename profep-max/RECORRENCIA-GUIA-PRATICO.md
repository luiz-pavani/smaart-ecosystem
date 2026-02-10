# 🚀 GUIA PRÁTICO - COMO USAR A RECORRÊNCIA SAFE2PAY

## 1. Para o Desenvolvedor (Backend)

### Aplicar a Migration no Supabase

```bash
# Via Supabase CLI
supabase migration up

# OU manualmente no Supabase Studio:
# 1. Dashboard → SQL Editor
# 2. Copiar conteúdo de: supabase/migrations/recorrencia-safe2pay.sql
# 3. Colar e executar
```

### Validar que tudo foi criado

```sql
-- Verificar campos em profiles
SELECT column_name FROM information_schema.columns 
WHERE table_name='profiles' AND column_name IN ('id_subscription', 'plan_expires_at', 'subscription_status');

-- Verificar campos em vendas
SELECT column_name FROM information_schema.columns 
WHERE table_name='vendas' AND column_name IN ('subscription_id', 'cycle_number', 'event_type');

-- Verificar tabela de auditoria
SELECT table_name FROM information_schema.tables WHERE table_name='subscription_events';
```

### Testar o Ciclo Completo

```bash
# 1. Instalar dependências (se necessário)
npm install axios

# 2. Executar testes (localmente)
WEBHOOK_URL=http://localhost:3000/api/webhooks/safe2pay \
node scripts/test-recorrencia.js

# 3. Executar testes (em produção)
WEBHOOK_URL=https://seu-dominio.com/api/webhooks/safe2pay \
node scripts/test-recorrencia.js
```

---

## 2. Para o Usuário (Comprador)

### Assinar um Plano Recorrente

#### Opção 1: Plano Mensal (R$ 49,90/mês)
```
1. Clique em "Assinar Mensal"
2. Preencha dados pessoais
3. Escolha método de pagamento (Pix/Cartão/Boleto)
4. Realize o pagamento
5. ✅ Acesso liberado imediatamente
6. 💰 Será cobrado automaticamente no mesmo dia do mês seguinte
```

#### Opção 2: Plano Anual (R$ 359,00/ano)
```
1. Clique em "Assinar Anual"
2. Preencha dados pessoais
3. Escolha método de pagamento
4. Realize o pagamento
5. ✅ Acesso liberado imediatamente
6. 💰 Será cobrado automaticamente no mesmo dia do ano seguinte
```

#### Opção 3: Plano Vitalício (R$ 997,00 - uma única vez)
```
1. Clique em "Assinar Vitalício"
2. Preencha dados pessoais
3. Escolha método de pagamento
4. Realize o pagamento
5. ✅ Acesso liberado para sempre
6. 💰 Sem cobranças futuras
```

### Renovação Automática

```
DIA 1 (Primeira Cobrança):
  → Você paga R$ 49,90
  → Acesso liberado
  → Recebe email de confirmação

DIA 30-31 (Próximo Ciclo):
  → Safe2Pay cobra automaticamente no MESMO método de pagamento
  → Você recebe email de renovação
  → Acesso continua ativo
  → SEM interrupção

MANUTENÇÃO:
  → Cartão precisa estar ativo
  → Pix/Boleto: Safe2Pay tenta 3 vezes em caso de falha
```

### O que acontece se o pagamento falhar?

```
CENÁRIO 1: Cartão Recusado
  → Safe2Pay tenta automaticamente por 3 dias
  → Você recebe email: "Pagamento recusado"
  → Acesso é SUSPENSO temporariamente
  → Como resolver:
     • Atualizar cartão (link no email)
     • Contatar seu banco
     • Tentar novamente em 24h

CENÁRIO 2: Falha Persistente
  → Após 3 tentativas falhadas (3 dias)
  → Assinatura é CANCELADA
  → Acesso é REVOGADO
  → Como resolver:
     • Contatar suporte@profepmax.com.br
     • Fazer nova assinatura com método diferente
```

### Como Cancelar uma Assinatura

```
OPÇÃO 1: Via Email
  → Envie email para: suporte@profepmax.com.br
  → Assunto: "Cancelar assinatura"
  → Sua assinatura será cancelada em até 24h

OPÇÃO 2: Via Painel (quando disponível)
  → Dashboard → Minha Assinatura → Cancelar
  → Confirmação imediata

IMPORTANTE: Cancelamento encerra acesso imediatamente
            Reembolsos: sujeito a política da empresa
```

### Dúvidas Frequentes

**P: Quanto tempo demora para a cobrança automática?**
R: Safe2Pay processa entre 24-48h após a data de vencimento. Você receberá notificação por email.

**P: E se eu quiser mudar o método de pagamento?**
R: Não é possível atualmente. Cancele e assine novamente com novo método, ou contate suporte.

**P: Há como pausar a assinatura?**
R: Não há pausa. Opções: cancelar e reativar depois, ou contatar suporte para casos especiais.

**P: Recebo recibo/nota fiscal?**
R: Sim! Você recebe email com todos os detalhes da transação.

---

## 3. Para o Administrador (Vendas)

### Dashboard de Assinaturas (Quando Implementado)

```bash
# Ver todas as assinaturas ativas
SELECT COUNT(*) as total_assinaturas, plan, subscription_status 
FROM profiles 
WHERE subscription_status IN ('active', 'suspended')
GROUP BY plan, subscription_status;

# Ver receita recorrente mensal (MRR)
SELECT 
  SUM(CASE WHEN plan = 'mensal' THEN 49.90 
           WHEN plan = 'anual' THEN 359.00 / 12 
           ELSE 0 END) as mrr
FROM profiles 
WHERE subscription_status = 'active';

# Ver últimas renovações
SELECT email, plan, event_type, created_at 
FROM vendas 
WHERE event_type = 'SubscriptionRenewed'
ORDER BY created_at DESC
LIMIT 10;

# Ver assinaturas em risco (vencendo em 7 dias)
SELECT email, full_name, plan_expires_at 
FROM profiles 
WHERE subscription_status = 'active'
AND plan_expires_at <= NOW() + INTERVAL '7 days'
ORDER BY plan_expires_at ASC;
```

### Gerenciar Uma Assinatura Específica

```bash
# Encontrar assinatura de um cliente
SELECT id_subscription, email, plan, subscription_status, plan_expires_at 
FROM profiles 
WHERE email = 'cliente@example.com';

# Ver histórico de ciclos
SELECT cycle_number, event_type, valor, created_at 
FROM vendas 
WHERE subscription_id = 'SUB_12345'
ORDER BY created_at DESC;

# Ver eventos de auditoria (para debug)
SELECT event_type, status_code, failure_reason 
FROM subscription_events 
WHERE subscription_id = 'SUB_12345'
ORDER BY created_at DESC;
```

### Cancelar uma Assinatura (Força)

```sql
-- Cancelar assinatura de um cliente (último recurso)
UPDATE profiles 
SET 
  subscription_status = 'canceled',
  status = 'inactive',
  plan_expires_at = NOW()
WHERE id_subscription = 'SUB_12345';

-- Registrar no log
INSERT INTO subscription_events (subscription_id, email, event_type, status_code, created_at)
SELECT id_subscription, email, 'canceled_by_admin', 5, NOW()
FROM profiles 
WHERE id_subscription = 'SUB_12345';
```

### Reativar uma Assinatura (Cenários Especiais)

```sql
-- Reativar assinatura suspensa (ex: pagamento recuperado manualmente)
UPDATE profiles 
SET 
  subscription_status = 'active',
  status = 'active',
  plan_expires_at = NOW() + INTERVAL '30 days'  -- Estender 30 dias
WHERE id_subscription = 'SUB_12345';

-- Registrar ação
INSERT INTO subscription_events (subscription_id, email, event_type, status_code, created_at)
SELECT id_subscription, email, 'reactivated_by_admin', 3, NOW()
FROM profiles 
WHERE id_subscription = 'SUB_12345';
```

---

## 4. Troubleshooting

### Webhook não está sendo chamado

**Verificar:**
1. Webhook URL está configurado no painel Safe2Pay?
   ```
   Dashboard Safe2Pay → Webhooks → 
   https://seu-dominio.com/api/webhooks/safe2pay
   ```

2. Seu servidor está recebendo a requisição?
   ```bash
   # Verificar logs
   tail -f /var/log/nginx/access.log | grep webhooks/safe2pay
   ```

3. O endpoint está retornando HTTP 200?
   ```bash
   # Testar manualmente
   curl -X POST https://seu-dominio.com/api/webhooks/safe2pay \
     -H "Content-Type: application/json" \
     -d '{"EventType":"SubscriptionCreated","IdSubscription":"TEST"}'
   ```

### IdSubscription não foi armazenado

**Verificar:**
1. O campo existe no banco?
   ```sql
   SELECT id_subscription FROM profiles LIMIT 1;
   ```

2. O checkout está fazendo o update?
   ```
   Logs do /api/checkout:
   "✅ IdSubscription ... armazenado para ..."
   ```

3. RLS está bloqueando?
   ```sql
   -- Desabilitar temporariamente para debug
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```

### Renovação não está acontecendo

**Verificar:**
1. A assinatura tem IdSubscription?
   ```sql
   SELECT id_subscription FROM profiles WHERE email = 'user@example.com';
   ```

2. A data de expiração está correta?
   ```sql
   SELECT plan_expires_at FROM profiles WHERE email = 'user@example.com';
   ```

3. Safe2Pay está enviando o webhook?
   ```
   Painel Safe2Pay → Logs de Webhooks → filtrar por IdSubscription
   ```

---

## 5. Monitoramento Contínuo

### Configurar Alertas

```bash
# Alerta: Muitas falhas de renovação
# Executar diariamente (cron job)

SELECT COUNT(*) as falhas_renewal 
FROM subscription_events 
WHERE event_type = 'failed' 
AND created_at >= NOW() - INTERVAL '24 hours';

# Se falhas > 5, enviar email para admin
```

### Verificação Semanal

```bash
# Executar toda segunda-feira

-- Total de assinantes
SELECT COUNT(*) FROM profiles WHERE subscription_status = 'active';

-- Taxa de renovação (última semana)
SELECT 
  COUNT(*) as renovacoes,
  COUNT(*) FILTER (WHERE event_type = 'SubscriptionRenewed') as bem_sucedidas,
  COUNT(*) FILTER (WHERE event_type = 'SubscriptionFailed') as falhadas
FROM vendas 
WHERE created_at >= NOW() - INTERVAL '7 days'
AND event_type IN ('SubscriptionRenewed', 'SubscriptionFailed');

-- Receita da semana
SELECT SUM(valor) as receita_semana 
FROM vendas 
WHERE created_at >= NOW() - INTERVAL '7 days';
```

---

## 6. Documentação Relacionada

- [RECORRENCIA-SAFE2PAY.md](./RECORRENCIA-SAFE2PAY.md) - Conceitos técnicos
- [RECORRENCIA-IMPLEMENTACAO-COMPLETA.md](./RECORRENCIA-IMPLEMENTACAO-COMPLETA.md) - Resumo da implementação
- [Safe2Pay Docs](https://developers.safe2pay.com.br/docs/recorrencia-overview) - Documentação oficial

---

**Última atualização**: 2026-02-01
**Versão**: 1.0.0
