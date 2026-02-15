# ⏳ PENDÊNCIAS - Safe2Pay Recorrência

## Status Atual: AGUARDANDO SAFE2PAY

### ✅ O que já está pronto

1. **Webhook implementado e funcionando**
   - Endpoint: `https://www.profepmax.com.br/api/webhooks/safe2pay`
   - Processa todos os 5 eventos de recorrência
   - Atualiza profiles, cria vendas, registra subscription_events
   - Testado e validado em produção

2. **Migration aplicada**
   - Campos `id_subscription`, `plan_expires_at`, `subscription_status` em `profiles`
   - Campos `subscription_id`, `cycle_number`, `event_type` em `vendas`
   - Tabela `subscription_events` para auditoria
   - Índices de performance criados

3. **Sistema operacional**
   - 13 assinantes mensais ativos
   - MRR: R$ 323,70 | ARR: R$ 3.884,40
   - Próximas renovações mapeadas (próximos 30 dias)

### ⏳ O que está PENDENTE

#### 1. Configuração de Webhooks na Safe2Pay

**Aguardando**: Resposta do suporte Safe2Pay sobre como configurar webhooks

**O que precisa ser feito quando recebermos a resposta**:

1. **Acessar painel Safe2Pay**
   - Login em: https://painel.safe2pay.com.br
   - Seção: Configurações > Webhooks (ou Notificações)

2. **Cadastrar URL do webhook**
   ```
   URL: https://www.profepmax.com.br/api/webhooks/safe2pay
   Método: POST
   ```

3. **Habilitar eventos de recorrência**
   Marcar TODOS os 5 eventos:
   - ✅ `SubscriptionPaymentApproved` - Pagamento aprovado
   - ✅ `SubscriptionCharged` - Cobrança realizada
   - ✅ `SubscriptionPaymentRefused` - Pagamento recusado
   - ✅ `SubscriptionCanceled` - Assinatura cancelada
   - ✅ `SubscriptionSuspended` - Assinatura suspensa

4. **Obter Token/Secret de validação** (se disponível)
   - Safe2Pay pode fornecer um token para validar requests
   - Adicionar em `.env.local`: `SAFE2PAY_WEBHOOK_SECRET=xxx`
   - Atualizar webhook para validar assinatura

5. **Testar webhook**
   - Safe2Pay geralmente tem botão "Testar Webhook"
   - Verificar logs em `subscription_events`
   - Confirmar que eventos são recebidos e processados

#### 2. Documentação Safe2Pay que Precisamos

Quando o suporte responder, precisamos de:

- [ ] Link ou docs sobre configuração de webhooks
- [ ] Lista oficial de eventos disponíveis
- [ ] Estrutura do payload de cada evento
- [ ] Como validar autenticidade do webhook (signature/token)
- [ ] Frequência de tentativas em caso de falha
- [ ] Como testar webhooks em sandbox/produção

#### 3. Monitoramento Pós-Configuração

Depois de configurar, monitorar por pelo menos 1 ciclo completo:

```bash
# Verificar eventos recebidos
node scripts/diagnose-user.js email@example.com

# Ver todos os eventos de um usuário
SELECT * FROM subscription_events 
WHERE email = 'email@example.com' 
ORDER BY created_at DESC;

# Verificar renovações processadas
SELECT * FROM vendas 
WHERE cycle_number > 1 
ORDER BY created_at DESC;
```

#### 4. Próximas Renovações

**Data da primeira renovação programada**: 03/03/2026 (fernando.hwc@gmail.com)

Até lá, o webhook DEVE estar configurado para capturar a renovação automática.

### 📋 Checklist Quando Safe2Pay Responder

- [ ] Acessar painel Safe2Pay
- [ ] Cadastrar URL do webhook
- [ ] Habilitar 5 eventos de recorrência
- [ ] Salvar token/secret (se houver)
- [ ] Testar webhook com evento fake
- [ ] Verificar log em `subscription_events`
- [ ] Documentar processo em README
- [ ] Aguardar primeira renovação real (03/03)
- [ ] Validar que renovação foi processada automaticamente

### 🚨 Importante

**SEM a configuração do webhook**:
- ❌ Renovações não serão detectadas automaticamente
- ❌ Status de assinatura não será atualizado
- ❌ Usuários pagarão mas não terão acesso renovado
- ⚠️ Será necessário processar manualmente cada renovação

**COM webhook configurado**:
- ✅ Renovações processadas automaticamente
- ✅ Acesso renovado sem intervenção
- ✅ Histórico completo de eventos
- ✅ Sistema 100% autônomo

---

**Última atualização**: 15/02/2026  
**Status**: Aguardando resposta do suporte Safe2Pay  
**Próxima ação**: Configurar webhooks assim que recebermos instruções
