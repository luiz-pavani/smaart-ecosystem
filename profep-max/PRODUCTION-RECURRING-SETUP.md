# 🎯 Safe2Pay Recurring Payments - Production Setup Guide

## Status: Production Ready
**Date Updated**: February 11, 2026  
**Target**: PIX & Credit Card Recurring Payments on Production API

---

## 📋 Overview

This guide explains how to set up and test **Pix** and **Credit Card** recurring payment subscriptions using Safe2Pay's production API.

### What's Implemented:
✅ **Credit Card** (PaymentMethod: 2) - Automatic recurring charges  
✅ **PIX** (PaymentMethod: 6) - Automatic recurring charges  
✅ **Email Notifications** - For all lifecycle events  
✅ **Plan Management** - Monthly, Annual, Lifetime plans  
✅ **Webhook Handling** - Full subscription lifecycle events  
✅ **Production API** - Uses real Safe2Pay endpoints

---

## 🔧 Step 1: Configuration (One-Time Setup)

### 1.1 Update Environment Variables

Copy the values to your `.env.local` file:

```bash
cp .env.production.example .env.local
```

Update with your production credentials:

```env
SAFE2PAY_API_TOKEN=A3C941582BEB4846B4AB11226E5755B3
SAFE2PAY_WEBHOOK_URL=https://www.profepmax.com.br/api/webhooks/safe2pay
RESEND_API_KEY=re_your_api_key_here
```

### 1.2 Create Plans in Safe2Pay Dashboard

You need to create THREE plans once in the Safe2Pay dashboard. These plans define the pricing and frequency.

**Plan 1 - Monthly (R$ 49.90)**
```json
{
  "PlanOption": 1,
  "PlanFrequence": 1,
  "Name": "Plano Mensal",
  "Amount": "49.90",
  "Description": "Acesso mensal a todos os cursos",
  "ChargeDay": 10,
  "IsImmediateCharge": true,
  "IsProRata": true,
  "IsRetryCharge": true
}
```

**Plan 2 - Annual (R$ 359.00)**
```json
{
  "PlanOption": 1,
  "PlanFrequence": 4,
  "Name": "Plano Anual",
  "Amount": "359.00",
  "Description": "Acesso anual a todos os cursos",
  "ChargeDay": 10,
  "IsImmediateCharge": true,
  "IsProRata": true,
  "IsRetryCharge": true
}
```

**Plan 3 - Lifetime (R$ 997.00)**
```json
{
  "PlanOption": 1,
  "PlanFrequence": 1,
  "Name": "Plano Vitalício",
  "Amount": "997.00",
  "Description": "Acesso vitalício a todos os cursos",
  "ChargeDay": 10,
  "IsImmediateCharge": true,
  "IsProRata": false,
  "BillingCycle": 1
}
```

### 1.3 Store Plan IDs

After creating plans in Safe2Pay dashboard, you'll receive plan IDs. Add them to `.env.local`:

```env
SAFE2PAY_PLAN_ID_MENSAL=12345
SAFE2PAY_PLAN_ID_ANUAL=12346
SAFE2PAY_PLAN_ID_VITALICIO=12347
```

### 1.4 Configure Webhook URL

In Safe2Pay dashboard:
1. Go to Settings → Webhooks
2. Set Callback URL: `https://www.profepmax.com.br/api/webhooks/safe2pay`
3. Make sure to accept these event types:
   - SubscriptionCreated
   - SubscriptionRenewed
   - SubscriptionFailed
   - SubscriptionCanceled
   - SubscriptionExpired

---

## 💳 Step 2: Credit Card Recurring Payments

### Flow: Credit Card → Subscription → Auto-Recurring

```
1. User selects "Plano Mensal" with credit card
   ↓
2. Frontend sends: POST /api/checkout
   {
     plan: "mensal",
     paymentMethod: "2",
     card: {
       cardNumber: "4111111111111111",
       cardHolder: "JOAO SILVA",
       cardExpiryMonth: "12",
       cardExpiryYear: "2026",
       cardCVV: "123"
     }
   }
   ↓
3. Backend:
   a) Tokenizes card → Safe2Pay returns Card Token
   b) Creates subscription → Safe2Pay returns IdSubscription
   c) Returns payment URL + subscription ID
   ↓
4. User completes payment
   ↓
5. Safe2Pay sends: WEBHOOK SubscriptionCreated
   - Activates profile
   - Sets next charge date
   - Sends confirmation email
   ↓
6. ✅ Monthly: Auto-charges on day 10
   Safe2Pay sends: WEBHOOK SubscriptionRenewed
   - Updates expiration date
   - Records new sales entry
   - Sends renewal email
```

### Testing Credit Card (Production)

**Test Card 1 - Valid Card**
```
Card Number: 4111111111111111
Holder: JOAO SILVA
Expiry: 12/2026
CVV: 123
```

**Test Card 2 - Declined Card** (to test SubscriptionFailed flow)
```
Card Number: 5555555555554444
Holder: JOAO SILVA
Expiry: 12/2026
CVV: 123
```

---

## 💰 Step 3: PIX Recurring Payments

### Flow: PIX → QR Code → Subscription → Auto-Recurring

```
1. User selects "Plano Anual" with PIX
   ↓
2. Frontend sends: POST /api/checkout
   {
     plan: "anual",
     paymentMethod: "6"
   }
   ↓
3. Backend:
   a) Creates subscription → Safe2Pay returns IdSubscription + PaymentUrl
   b) User receives PIX QR Code link
   c) Returns payment URL + subscription ID
   ↓
4. User scans QR Code and pays via PIX
   ↓
5. Safe2Pay sends: WEBHOOK SubscriptionCreated
   - Activates profile
   - Sets next charge date (365 days)
   - Sends confirmation email
   ↓
6. ✅ Recurses: Auto-charges next year
   Safe2Pay sends: WEBHOOK SubscriptionRenewed
   - Updates expiration date
   - Records new sales entry
   - Sends renewal email
```

### Testing PIX (Production)

**Test Process:**
1. Create subscription with method 6 (PIX)
2. Safe2Pay generates QR Code
3. Use your PIX app to scan and pay
4. Within seconds, webhook is triggered
5. Check database for SubscriptionCreated event

---

## 🧪 Step 4: Testing Workflow

### 4.1 Manual Test with cURL

**Create Subscription - Credit Card:**
```bash
curl -X POST https://www.profepmax.com.br/api/checkout \
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
  "url": "https://payment.safe2pay.com.br/...",
  "cupom": null,
  "message": "Assinatura criada com sucesso!"
}
```

**Create Subscription - PIX:**
```bash
curl -X POST https://www.profepmax.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "anual",
    "email": "teste@example.com",
    "name": "João Silva",
    "paymentMethod": "6"
  }'
```

### 4.2 Verify Webhook Reception

Check server logs for webhook events:

```bash
# Watch logs in Vercel/Docker
tail -f logs/webhook.log

# Expected outputs:
# [RECURRENCE] ✅ Detectado evento: SubscriptionCreated para subscription SUB_12345
# [SubscriptionCreated] ✅ Assinatura criada: SUB_12345 | teste@example.com | mensal
# [EMAIL] ✅ Email de confirmação enviado para teste@example.com
```

### 4.3 Verify Database Updates

```sql
-- Check activated profile
SELECT id, email, status, plan, id_subscription, plan_expires_at 
FROM profiles 
WHERE id_subscription = 'SUB_12345';

-- Check sales record
SELECT * FROM vendas 
WHERE subscription_id = 'SUB_12345' 
ORDER BY created_at DESC;

-- Check events log
SELECT * FROM subscription_events 
WHERE subscription_id = 'SUB_12345'
ORDER BY created_at DESC;
```

---

## 📧 Step 5: Email Testing

### Email Events Triggered Automatically:

| Event | Email Sent | Content |
|-------|-----------|---------|
| **SubscriptionCreated** | Confirmation | Welcome + Access Info + Next Charge Date |
| **SubscriptionRenewed** | Renewal | Confirmation + New Charge Date |
| **SubscriptionFailed** | Alert | Payment Failed + Action Required |
| **SubscriptionCanceled** | Notification | Subscription Cancelled + Reactivation Info |
| **SubscriptionExpired** | Offer | Expired + Special Renewal Discount |

### Test Email Delivery:

1. **Use test email** (your email)
2. **Check inbox** for confirmation messages
3. **Check spam folder** if not received
4. **Review logs** for email sending errors:

```bash
grep -i "EMAIL" logs/*.log
# Output: [EMAIL] ✅ Email de confirmação enviado para teste@example.com
```

---

## ⚠️ Step 6: Handle Payment Failures

### Credit Card Declined Flow:

```
Day 1:  Customer subscribes with valid card
        ✅ WEBHOOK SubscriptionCreated → Profile activated

Day 30: Auto-charge triggered
        ❌ Card declined (insufficient funds)
        Safe2Pay retries 2 more times (Days 31, 32)

Day 33: After 3 failed attempts
        ❌ WEBHOOK SubscriptionFailed → profiles.subscription_status = 'suspended'
        → Email sent: "Your payment failed. Update payment method."

Customer Action:
→ Logs in to account → Updates card details
→ Manual retry available in dashboard

Day 35: If no update
        ❌ WEBHOOK SubscriptionCanceled (after retention period)
        → profiles.subscription_status = 'canceled'
        → Access revoked
```

### Testing Failure Flow:

Use declined test card:
```json
{
  "plan": "mensal",
  "paymentMethod": "2",
  "card": {
    "cardNumber": "5555555555554444"
  }
}
```

---

## 🔄 Step 7: Monitoring & Alerts

### Key Metrics to Monitor:

```sql
-- Active subscriptions
SELECT COUNT(*) as active_subs 
FROM profiles 
WHERE subscription_status = 'active' 
  AND plan IS NOT NULL;

-- Failed subscriptions this week
SELECT COUNT(*) as failed_subs
FROM subscription_events
WHERE event_type = 'SubscriptionFailed'
  AND created_at > NOW() - INTERVAL '7 days';

-- Renewal success rate
SELECT 
  event_type,
  COUNT(*) as count,
  ROUND(COUNT(*)*100.0/(SELECT COUNT(*) FROM subscription_events WHERE event_type IN ('SubscriptionRenewed', 'SubscriptionFailed')), 2) as percentage
FROM subscription_events
WHERE event_type IN ('SubscriptionRenewed', 'SubscriptionFailed')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type;

-- Revenue by plan
SELECT 
  plan,
  COUNT(*) as subscriptions,
  SUM(valor) as total_revenue
FROM vendas
WHERE subscription_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY plan;
```

---

## 🚀 Production Checklist

- [ ] Environment variables configured (`.env.local`)
- [ ] Three plans created in Safe2Pay dashboard
- [ ] Plan IDs stored in environment
- [ ] Webhook URL configured in Safe2Pay
- [ ] Database migrations applied (subscription fields exist)
- [ ] RESEND_API_KEY configured
- [ ] Supabase credentials correct
- [ ] Test credit card payment (monthly)
- [ ] Test PIX payment (annual)
- [ ] Check webhook logs
- [ ] Verify database records
- [ ] Confirm confirmation emails received
- [ ] Test failed payment scenario
- [ ] Monitor for 7 days
- [ ] Document any issues

---

## 📱 API Endpoints Summary

### Checkout Endpoint
**POST** `/api/checkout`

Request body:
```json
{
  "plan": "mensal|anual|vitalicio",
  "email": "user@example.com",
  "name": "Full Name",
  "cpf": "12345678901",
  "phone": "11999999999",
  "paymentMethod": "1|2|6",
  "address": {
    "zipCode": "12345678",
    "street": "Rua X",
    "number": "123",
    "district": "Bairro",
    "city": "São Paulo",
    "state": "SP"
  },
  "card": {
    "cardNumber": "4111111111111111",
    "cardHolder": "JOAO SILVA",
    "cardExpiryMonth": "12",
    "cardExpiryYear": "2026",
    "cardCVV": "123"
  },
  "coupon": "VIP50"
}
```

Response:
```json
{
  "subscriptionId": "SUB_12345",
  "paymentUrl": "https://payment.safe2pay.com.br/...",
  "cupom": "VIP50",
  "message": "Assinatura criada com sucesso!"
}
```

### Webhook Endpoint
**POST** `/api/webhooks/safe2pay`

Listens for:
- SubscriptionCreated
- SubscriptionRenewed
- SubscriptionFailed
- SubscriptionCanceled
- SubscriptionExpired

---

## 🆘 Troubleshooting

### Issue: "Plan ID not found"
- **Cause**: Environment variable not set or plan not created
- **Fix**: Create plans in Safe2Pay dashboard, copy IDs to `.env.local`

### Issue: "Failed to tokenize card"
- **Cause**: Invalid card data or SAFE2PAY_API_TOKEN wrong
- **Fix**: Check card number/CVV, verify API token in Safe2Pay dashboard

### Issue: Webhook not received
- **Cause**: Webhook URL not registered in Safe2Pay
- **Fix**: Go to Safe2Pay Dashboard → Webhooks → Register URL

### Issue: Email not sent
- **Cause**: RESEND_API_KEY missing or invalid
- **Fix**: Get API key from Resend.com, add to `.env.local`

### Issue: Subscription status stuck in "pending"
- **Cause**: Webhook not processed or profile not found
- **Fix**: Check webhook logs, verify email exists in profiles table

---

## 📊 Next Steps

1. **Go Live**: Deploy to production
2. **Monitor**: Watch metrics for 7 days
3. **Optimize**: Adjust retry policies if needed
4. **Scale**: Add more plans or features based on demand

**Contact Safe2Pay Support**: support@safe2pay.com.br  
**Documentation**: https://developers.safe2pay.com.br/docs
