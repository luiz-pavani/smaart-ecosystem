# ✅ Safe2Pay Webhooks - Profep MAX - Status Final

**Data**: 18/02/2026  
**Status**: PRONTO PARA REGISTRAR  
**URL Webhook**: `https://www.profepmax.com.br/api/webhooks/safe2pay`

---

## 🎯 Próxima Ação: Registrar Webhook

O webhook handler já está implementado e em produção. Agora é só registrar na Safe2Pay!

### Como Registrar (3 min):

1. **Acessar**: https://safe2pay.com.br/dashboard
2. **Settings** → **Webhooks**
3. **Add Webhook**
   - URL: `https://www.profepmax.com.br/api/webhooks/safe2pay`
   - Método: `POST`

4. **Marcar TODOS os 5 eventos**:
   - ✅ SubscriptionCreated
   - ✅ SubscriptionRenewed
   - ✅ SubscriptionFailed
   - ✅ SubscriptionCanceled
   - ✅ SubscriptionExpired

5. **Save**

---

## 📋 O que Acontece Depois

Quando Safe2Pay envia um webhook:

```
safe2pay.com.br
    ↓
POST /api/webhooks/safe2pay
    ↓
Identifica evento
    ↓
├─ SubscriptionCreated → Ativa perfil + registra venda + envia email
├─ SubscriptionRenewed → Atualiza ciclo + registra novo pagamento
├─ SubscriptionFailed → Marca suspenso + alerta via email
├─ SubscriptionCanceled → Desativa + registra cancelamento
└─ SubscriptionExpired → Marca expirado + oferece renovação
    ↓
Registra log em subscription_events (auditoria)
    ↓
Retorna 200 OK
```

---

## 🧪 Testar Webhooks

```bash
# Script bash para testar
curl -X POST https://www.profepmax.com.br/api/webhooks/safe2pay \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionCreated",
    "IdSubscription": "TEST-123",
    "Status": 3,
    "Amount": 129.90,
    "Customer": {
      "Email": "teste@profepmax.com.br",
      "Name": "Teste"
    }
  }'
```

Verificar resposta: `{ "message": "Assinatura criada com sucesso" }`

---

## 📊 Monitorar

### Verificar Assinaturas Ativas
```sql
SELECT count(*), subscription_status, plan 
FROM profiles 
WHERE subscription_status IS NOT NULL
GROUP BY subscription_status, plan;
```

### Próximas Renovações (próximos 7 dias)
```sql
SELECT full_name, email, plan_expires_at
FROM profiles
WHERE subscription_status = 'active'
  AND plan_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY plan_expires_at ASC;
```

---

## ✅ Checklist Conclusão

- [x] Webhook handler (src/app/api/webhooks/safe2pay/route.ts)
- [x] Email confirmations (5 tipos)
- [x] Auditoria (subscription_events)
- [x] Deploy em produção
- [ ] Registrar webhook no painel Safe2Pay ← **VOCÊ ESTÁ AQUI (2 min)**
- [ ] Testar com dados reais

---

## 🔗 Links

- **Documentação Completa**: `SAFE2PAY-WEBHOOKS-FINAL.md`
- **API Reference**: https://developers.safe2pay.com.br/reference/recorrencia-criar-plano
- **Painel S2P**: https://safe2pay.com.br/dashboard

---

**Pronto!** Já está tudo em produção. Só falta registrar o webhook no painel Safe2Pay e começarão a ser recebidos automaticamente.

Qualquer dúvida, ver `SAFE2PAY-WEBHOOKS-FINAL.md` para mais detalhes.
