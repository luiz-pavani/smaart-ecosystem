# 🚀 Getting Started - Recurring Payments with Safe2Pay

## Status: Ready for Activation
**Date**: February 11, 2026  
**Components**: ✅ All integrated and configured

---

## ⚡ Quick Start (5 Minutes)

### 1. Verify System is Ready
```bash
node scripts/validate-recurring.js
```

This checks:
- ✅ Environment variables
- ✅ Source files exist
- ✅ Functions exported
- ✅ Imports correct

### 2. Create Plans in Safe2Pay Dashboard

Go to: https://safe2pay.com.br (login with your account)

#### Plan 1: Monthly
```
Name: Plano Mensal
Amount: 49.90
Frequency: Monthly (1)
Charge Day: 10
IsImmediateCharge: true
IsRetryCharge: true
```
→ Copy Plan ID (e.g., `12345`)

#### Plan 2: Annual
```
Name: Plano Anual
Amount: 359.00
Frequency: Annual (4)
Charge Day: 10
IsImmediateCharge: true
IsRetryCharge: true
```
→ Copy Plan ID (e.g., `12346`)

#### Plan 3: Lifetime
```
Name: Plano Vitalício
Amount: 997.00
Frequency: Monthly (1)
Charge Day: 10
IsImmediateCharge: true
BillingCycle: 1
```
→ Copy Plan ID (e.g., `12347`)

### 3. Update Environment Variables

Edit `.env.local`:

```bash
# Replace with actual Plan IDs from Safe2Pay Dashboard
SAFE2PAY_PLAN_ID_MENSAL=12345
SAFE2PAY_PLAN_ID_ANUAL=12346
SAFE2PAY_PLAN_ID_VITALICIO=12347

# Verify these are set (they should already be)
SAFE2PAY_API_TOKEN=your_safe2pay_api_token_here
SAFE2PAY_WEBHOOK_URL=https://www.profepmax.com.br/api/webhooks/safe2pay
RESEND_API_KEY=re_your_api_key_here
```

### 4. Register Webhook URL

In Safe2Pay Dashboard:
1. Go to **Settings → Webhooks**
2. Add URL: `https://www.profepmax.com.br/api/webhooks/safe2pay`
3. Select event types:
   - ✅ SubscriptionCreated
   - ✅ SubscriptionRenewed
   - ✅ SubscriptionFailed
   - ✅ SubscriptionCanceled
   - ✅ SubscriptionExpired
4. Save

### 5. Apply Database Migrations

```bash
# Using Supabase CLI
npx supabase migration up

# OR manually in Supabase Dashboard:
# Copy contents of: supabase/migrations/recorrencia-safe2pay.sql
# Run in SQL Editor
```

### 6. Test Payment Flow

#### Test Credit Card (Auto-Recurring Monthly)
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "mensal",
    "email": "teste@example.com",
    "name": "João Silva",
    "paymentMethod": "2",
    "card": {
      "cardNumber": "4111111111111111",
      "cardHolder": "JOAO SILVA",
      "cardExpiryMonth": "12",
      "cardExpiryYear": "2026",
      "cardCVV": "123"
    }
  }'
```

**Expected Response:**
```json
{
  "subscriptionId": "123456",
  "paymentUrl": "https://payment.safe2pay.com.br/...",
  "message": "Assinatura criada com sucesso!"
}
```

#### Test PIX (Auto-Recurring Annual)
```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "anual",
    "email": "teste@example.com",
    "name": "João Silva",
    "paymentMethod": "6"
  }'
```

### 7. Verify Everything Works

**Check logs:**
```bash
# In terminal where Next.js is running, look for:
# [RECURRENCE] ✅ Detectado evento: SubscriptionCreated
# [SubscriptionCreated] ✅ Assinatura criada
# [EMAIL] ✅ Email de confirmação enviado
```

**Check database:**
```sql
-- Verify profile updated
SELECT email, id_subscription, subscription_status, plan_expires_at 
FROM profiles 
WHERE email = 'teste@example.com';

-- Verify venda recorded
SELECT * FROM vendas 
WHERE email = 'teste@example.com' 
ORDER BY created_at DESC LIMIT 1;
```

**Check email:**
- Look in inbox for confirmation email from `judo@profepmax.com.br`
- Subject: `✅ Assinatura Confirmada - Plano Mensal`

---

## 📊 Payment Methods Reference

### 💳 Credit Card (Method 2)
- **Token Required**: Yes (auto-tokenized in checkout)
- **Immediate Charge**: Yes (within 1 hour)
- **Recurring**: Yes (auto-charges on day 10)
- **Test Card**: `4111111111111111`

### 💰 PIX (Method 6)
- **Token Required**: No
- **Immediate Charge**: No (user pays via QR code)
- **Recurring**: Yes (auto-charges from next billing cycle)
- **Payment Link**: Safe2Pay generates QR code

### 📋 Boleto (Method 1)
- **Token Required**: No
- **Immediate Charge**: No (user pays boleto)
- **Recurring**: Yes
- **Payment Link**: Safe2Pay generates boleto PDF

---

## 📧 Automatic Emails

The system sends 5 types of emails automatically:

### 1. Subscription Created (✅ Welcome)
- **Trigger**: First payment confirmed
- **To**: User email
- **Contains**: Access details, plan info, next charge date

### 2. Subscription Renewed (🔄 Renewal Confirmed)
- **Trigger**: Auto-renewal successful
- **To**: User email
- **Contains**: Amount charged, next charge date

### 3. Payment Failed (⚠️ Action Required)
- **Trigger**: Payment declined (after retries)
- **To**: User email
- **Contains**: Failure reason, action needed

### 4. Subscription Canceled (👋 Goodbye)
- **Trigger**: User or system-initiated cancellation
- **To**: User email
- **Contains**: Cancellation info, reactivation link

### 5. Subscription Expired (⏰ Renewal Offer)
- **Trigger**: Billing cycle limit reached
- **To**: User email
- **Contains**: Expiration notice, special renewal offer

---

## 🧪 Testing Scenarios

### Scenario 1: Successful Credit Card Subscription
```
1. Create subscription with valid credit card
2. Check: Profile activated, email sent, cycle 1 recorded
3. After 30 days: Auto-renewal triggered, cycle 2 recorded
```

### Scenario 2: Failed Payment
```
1. Create subscription with declined test card
2. Check: WEBHOOK SubscriptionFailed received
3. Check: Email sent with action required
4. User: Updates payment method
5. Check: Renewal can be retried
```

### Scenario 3: PIX Payment
```
1. Create subscription with PIX
2. Scan QR code from email/payment page
3. Pay via PIX app
4. Check: WEBHOOK SubscriptionCreated received
5. Check: Profile activated, email sent
```

---

## 🔍 Troubleshooting

### "Plan ID not found"
**Problem**: SAFE2PAY_PLAN_ID_* not set or wrong value
**Solution**:
1. Create plans in Safe2Pay dashboard
2. Copy Plan IDs 
3. Update .env.local
4. Restart app

### "Failed to tokenize card"
**Problem**: Invalid card or wrong API token
**Solution**:
1. Verify card number is valid (test card: 4111111111111111)
2. Check SAFE2PAY_API_TOKEN in .env.local
3. Ensure not using old token

### "Webhook not received"
**Problem**: Safe2Pay not calling webhook URL
**Solution**:
1. Register URL in Safe2Pay Dashboard
2. Verify URL is publicly accessible
3. Check webhook logs in Safe2Pay Dashboard

### "Email not sent"
**Problem**: RESEND_API_KEY invalid or Resend down
**Solution**:
1. Verify RESEND_API_KEY in .env.local
2. Check Resend.com dashboard for API key
3. Test with: `scripts/test-email.js`

### "Database migration failed"
**Problem**: SQL syntax error or permission issue
**Solution**:
1. Check Supabase is connected
2. Verify user has permission to alter tables
3. Run individual ALTER TABLE statements in SQL editor
4. Check for conflicts with existing columns

---

## 📈 Monitoring

### Key Queries

**Active Subscriptions:**
```sql
SELECT plan, COUNT(*) as count, SUM(amount) as revenue
FROM profiles p
JOIN vendas v ON p.email = v.email
WHERE p.subscription_status = 'active'
GROUP BY plan;
```

**Failed Subscriptions:**
```sql
SELECT subscription_id, email, failure_reason, created_at
FROM subscription_events
WHERE event_type = 'SubscriptionFailed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Renewal Success Rate:**
```sql
SELECT 
  COUNT(CASE WHEN event_type = 'SubscriptionRenewed' THEN 1 END) as renewals,
  COUNT(CASE WHEN event_type = 'SubscriptionFailed' THEN 1 END) as failures,
  ROUND(COUNT(CASE WHEN event_type = 'SubscriptionRenewed' THEN 1 END) * 100.0 / 
    (COUNT(CASE WHEN event_type = 'SubscriptionRenewed' THEN 1 END) + 
     COUNT(CASE WHEN event_type = 'SubscriptionFailed' THEN 1 END)), 2) as success_rate_pct
FROM subscription_events
WHERE event_type IN ('SubscriptionRenewed', 'SubscriptionFailed')
  AND created_at > NOW() - INTERVAL '30 days';
```

---

## 📚 Documentation

- **Complete Setup Guide**: [PRODUCTION-RECURRING-SETUP.md](./PRODUCTION-RECURRING-SETUP.md)
- **Implementation Summary**: [RECURRING-PAYMENTS-SUMMARY.md](./RECURRING-PAYMENTS-SUMMARY.md)
- **Safe2Pay API Reference**: [RECORRENCIA-SAFE2PAY.md](./RECORRENCIA-SAFE2PAY.md)
- **Environment Template**: [.env.production.example](./.env.production.example)

---

## ✅ Pre-Launch Checklist

- [ ] Plan IDs created and stored in .env.local
- [ ] Webhook URL registered in Safe2Pay Dashboard
- [ ] Database migrations applied
- [ ] Environment variables verified
- [ ] Validation script passes: `node scripts/validate-recurring.js`
- [ ] Credit card test successful
- [ ] PIX test successful
- [ ] Email notifications verified
- [ ] Database records checked
- [ ] Logs reviewed for errors
- [ ] Failed payment scenario tested
- [ ] 24-hour monitoring completed
- [ ] Team trained on monitoring queries

---

## 🎉 Ready to Go Live!

Once all checklist items are complete:

1. Deploy to production
2. Enable in Vercel
3. Monitor for 7 days
4. Document any issues
5. Celebrate! 🚀

---

## 🆘 Need Help?

**Documentation**:
- Safe2Pay Docs: https://developers.safe2pay.com.br/docs
- Resend Docs: https://resend.com/docs
- Supabase Docs: https://supabase.com/docs

**Contact**:
- Safe2Pay Support: support@safe2pay.com.br
- Resend Support: support@resend.com
- Internal Team: [Your team contact]

---

**Last Updated**: February 11, 2026  
**Version**: 1.0 Production Ready
