# Safe2Pay Integration - Next Steps (Feb 18, 2026)

## ✅ Completed
- [x] Titan deployed with Safe2Pay library (`lib/safe2pay.ts`)
- [x] Titan admin endpoint created (`/api/admin/plans/create`)
- [x] ProfepMAX setup script refactored to use library function
- [x] Webhook URL support added to plan creation (auto-registers at plan creation time)
- [x] Both systems deployed to Vercel
  - Titan: https://titan.smaartpro.com
  - ProfepMAX: https://profep-max-luiz-pavanis-projects.vercel.app

---

## 🚀 Immediate Next Steps

### Step 1: Configure Federation Safe2Pay Credentials in Supabase

1. **Access Supabase Dashboard**: https://app.supabase.com → Select "Titan Academy" project
2. **Navigate to**: SQL Editor → New Query
3. **Insert federation's Safe2Pay API token**:
   ```sql
   UPDATE federacoes 
   SET safe2pay_api_token = 'seu_token_safe2pay_real' 
   WHERE slug = 'sua-federacao-slug';
   ```
   
   OR use Admin Dashboard once implemented:
   ```sql
   -- Check current federations and their tokens
   SELECT id, nome, slug, safe2pay_api_token 
   FROM federacoes 
   ORDER BY nome;
   ```

### Step 2: Create Standard Plans Using Admin Endpoint

**Endpoint**: `POST https://titan.smaartpro.com/api/admin/plans/create`

**Headers**:
```
Authorization: Bearer <academy_admin_token>
Content-Type: application/json
```

**Request Body** (create 3 plans):

#### Plan 1: Monthly (Mensal)
```json
{
  "name": "Plano Mensal",
  "amount": 49.90,
  "frequency": 1,
  "chargeDay": 1,
  "billingCycle": null,
  "isImmediateCharge": true,
  "description": "Acesso mensal à plataforma",
  "federacao_id": "uuid-of-federation"
}
```

#### Plan 2: Annual (Anual)
```json
{
  "name": "Plano Anual",
  "amount": 359.00,
  "frequency": 4,
  "chargeDay": 1,
  "billingCycle": null,
  "isImmediateCharge": true,
  "description": "Acesso anual à plataforma com 25% desconto",
  "federacao_id": "uuid-of-federation"
}
```

#### Plan 3: Lifetime (Vitalício)
```json
{
  "name": "Plano Vitalício",
  "amount": 997.00,
  "frequency": 1,
  "chargeDay": 1,
  "billingCycle": 1,
  "isImmediateCharge": true,
  "description": "Pagamento único com acesso vitalício",
  "federacao_id": "uuid-of-federation"
}
```

**Expected Response**:
```json
{
  "sucesso": true,
  "planId": "12345",
  "nome": "Plano Mensal",
  "valor": 49.90,
  "frequencia": 1,
  "webhookUrl": "https://titan.smaartpro.com/api/webhooks/safe2pay",
  "mensagem": "Plano criado com sucesso! Webhook registrado!"
}
```

### Step 3: Store Plan IDs in Environment

Once plans are created, store their IDs:

**For Titan** (in Vercel Settings):
```
SAFE2PAY_PLAN_ID_MENSAL=12345
SAFE2PAY_PLAN_ID_ANUAL=12346
SAFE2PAY_PLAN_ID_VITALICIO=12347
```

**For ProfepMAX** (in Vercel Settings):
```
SAFE2PAY_PLAN_ID_MENSAL=12345
SAFE2PAY_PLAN_ID_ANUAL=12346
SAFE2PAY_PLAN_ID_VITALICIO=12347
```

### Step 4: Verify Webhook Registration

1. **Access Safe2Pay Dashboard**: https://dashboard.safe2pay.com.br
2. **Navigate to**: Recurrence → Plans
3. **Check each plan**: Should show webhook URL registered
   - Expected URL: `https://titan.smaartpro.com/api/webhooks/safe2pay`
   - Safe2Pay will POST purchase events to this URL

### Step 5: Test End-to-End Flow

1. **Create test subscription** using checkout endpoint:
   ```javascript
   POST /api/checkout
   {
     "plano": "mensal",
     "federacao_id": "uuid",
     "email": "test@example.com"
   }
   ```

2. **Monitor webhook logs** in ProfepMAX:
   - Safe2Pay will send webhook POST when subscription created
   - Webhook handler at: `profep-max/src/app/api/webhooks/safe2pay/route.ts`
   - Check logs: `console.log()` will appear in Vercel function logs

3. **Verify subscription status**:
   ```sql
   SELECT id, usuario_id, plano, status, created_at 
   FROM subscricoes 
   WHERE usuario_id = 'test-user-id'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## 📋 Alternative: Local Testing (Optional)

If you want to test locally with real credentials:

**1. Create `.env.local` in ProfepMAX**:
```bash
cp profep-max/.env.local.example profep-max/.env.local
```

**2. Edit `profep-max/.env.local`**:
```
SAFE2PAY_API_TOKEN=sua_token_real_safe2pay
NEXT_PUBLIC_SITE_URL=https://profepmax.com.br
```

**3. Run setup script**:
```bash
cd profep-max
npx ts-node scripts/setup-safe2pay-plans.ts
```

**Output**: Will print plan IDs created. Copy these to `.env`.

---

## 🔍 Architecture Review

### Safe2Pay Integration Points

**Titan System** (`apps/titan`):
- Library: `lib/safe2pay.ts` (5 functions, native fetch API)
- Admin Endpoint: `api/admin/plans/create.ts` (creates plans with webhook registration)
- Webhook Handler: `api/webhooks/safe2pay/route.ts` (receives callbacks)

**ProfepMAX System** (`profep-max`):
- Library: `src/lib/safe2pay-recurrence.ts` (updated with webhookUrl support)
- Setup Script: `scripts/setup-safe2pay-plans.ts` (creates 3 standard plans)
- Checkout: `api/checkout` (uses plan IDs for subscriptions)
- Webhook Handler: `src/app/api/webhooks/safe2pay/route.ts` (processes events)

### Webhook Flow

1. User subscribes to plan via checkout
2. Safe2Pay processes payment
3. Safe2Pay POSTs to: `https://domain/api/webhooks/safe2pay`
4. Webhook handler:
   - Validates Safe2Pay signature
   - Updates subscription status
   - Sends confirmation email
   - Logs transaction

---

## 🚨 Important Notes

1. **Webhook Registration Timing**: Safe2Pay only accepts webhook URLs during plan creation. Cannot be modified after. ✅ This is now handled automatically when creating plans.

2. **Frequency Values** (Safe2Pay API):
   - `1` = Mensal (Monthly)
   - `2` = Trimestral (Quarterly)
   - `3` = Semestral (Semi-annual)
   - `4` = Anual (Annual)

3. **Billing Cycle**: Leave null for infinite/continuous subscriptions

4. **Immediate Charge**: Set `true` to charge immediately upon subscription creation

---

## 📊 Status Summary

| Component | Status | URL |
|-----------|--------|-----|
| Titan | ✅ Live | https://titan.smaartpro.com |
| ProfepMAX | ✅ Live | https://profep-max-luiz-pavanis-projects.vercel.app |
| Admin Endpoint | ✅ Ready | `/api/admin/plans/create` |
| Webhook URL Support | ✅ Done | Auto-registers in createPlan() |
| Safe2Pay Credentials | ⏳ Pending | Need federation token in Supabase |
| Plan Creation | ⏳ Ready | Use admin endpoint with credentials |
| Webhook Testing | ⏳ Pending | After plans created |

---

## 💡 Quick Commands Reference

```bash
# Check deployment logs
cd apps/titan && vercel logs --tail

# Check ProfepMAX deployment
cd profep-max && vercel logs --tail

# View Safe2Pay library (Titan)
cat apps/titan/lib/safe2pay.ts

# View admin endpoint (Titan)
cat apps/titan/app/api/admin/plans/create.ts

# View setup script (ProfepMAX)
cat profep-max/scripts/setup-safe2pay-plans.ts
```

---

**Ready to proceed? Provide Safe2Pay API token and federation ID to create plans! 🎯**
