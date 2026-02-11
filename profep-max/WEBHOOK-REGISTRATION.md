# Step 2: Register Webhook in Safe2Pay Dashboard

You need to register your webhook URL so Safe2Pay can send subscription events to your application.

## Quick Steps

### 1. Go to Safe2Pay Dashboard
https://safe2pay.com.br/dashboard

### 2. Navigate to Webhooks Settings
- Click **Settings** (gear icon at bottom left)
- Click **Webhooks** or **Integrações**

### 3. Register New Webhook
Click **+ Add Webhook** or **+ Nova Integração**

Fill in:
```
URL: https://www.profepmax.com.br/api/webhooks/safe2pay

Events to select (check all 5):
☑ SubscriptionCreated
☑ SubscriptionRenewed  
☑ SubscriptionFailed
☑ SubscriptionCanceled
☑ SubscriptionExpired
```

### 4. Save
Click **Save** or **Registrar**

### 5. Verify
You should receive a test webhook event. Check your server logs:
```bash
tail -f ~/.vercel/logs/profep-max.log
```

Or check the webhook delivery status in Safe2Pay Dashboard (should show "✅ Delivered")

---

## Understanding the Webhook

When Safe2Pay sends a webhook to `https://www.profepmax.com.br/api/webhooks/safe2pay`, your application:

1. **Receives the event** at `/api/webhooks/safe2pay`
2. **Processes it** based on event type:
   - `SubscriptionCreated` → Activates user account
   - `SubscriptionRenewed` → Updates expiry date
   - `SubscriptionFailed` → Notifies user of payment failure
   - `SubscriptionCanceled` → Deactivates account
   - `SubscriptionExpired` → Sends renewal offer email
3. **Sends email notification** automatically (via Resend)
4. **Records event** in database for audit trail
5. **Returns 200 OK** to Safe2Pay (prevents retries)

---

## Troubleshooting

**Webhook not being called?**
- ✅ Check URL is exactly: `https://www.profepmax.com.br/api/webhooks/safe2pay`
- ✅ Make sure your app is deployed and running
- ✅ Check firewall/DNS settings
- ✅ Verify all 5 events are selected

**Getting 404 error?**
- ✅ Verify your `/api/webhooks/safe2pay/route.ts` exists
- ✅ Confirm deployment is up to date
- ✅ Check Vercel logs for errors

**Email not sending?**
- ✅ Verify `RESEND_API_KEY` is valid
- ✅ Check Resend dashboard for delivery status
- ✅ Confirm email address is correct

---

✅ **Once done, move to Step 3: Test & Deploy**
