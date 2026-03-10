# ✅ End-to-End Stakeholder System Validation Checklist

**Date**: March 2026  
**Scope**: Universal Stakeholder Registry (Migrations 019-023) + UI Integration  
**Expected Outcome**: Seamless automatic stakeholder linking across federação → academia → atleta flow

---

## 📋 Pre-Test Setup

- [ ] **Verify migrations applied**: 
  ```bash
  supabase migration list --linked
  # Expected: 019, 020, 021, 022, 023 all marked "| applied"
  ```

- [ ] **Check database gaps** (should show 0 for all tables if fully backfilled):
  ```sql
  SELECT * FROM vw_stakeholder_link_gaps;
  # Expected: federacoes_gap=0, academias_gap=0, atletas_gap=0
  ```

- [ ] **Verify RLS policies active**:
  ```sql
  SELECT policy_name, action FROM pg_policies WHERE tablename = 'stakeholders';
  # Expected: SELECT, INSERT, UPDATE policies for auth.uid() = id
  ```

- [ ] **Log in as test user** → Note your user email (e.g., `admin@smaartpro.com`)

---

## 🔄 Test Flow Phase 1: Create Federação

### Step 1.1: Open "Nova Federação" Form
- [ ] Navigate to federação creation page
- [ ] Verify form fields load without errors

### Step 1.2: Fill & Submit Form
| Field | Test Value | Notes |
|-------|-----------|-------|
| Nome | `Federação Teste ${Date}` | Use timestamp to ensure uniqueness |
| Email | `fed-test-${timestamp}@smaartpro.com` | Can be different from login email |
| Sigla | `FTT` | — |
| Logo | (Optional) | Leave blank for this test |

- [ ] Submit form
- [ ] Verify success notification appears
- [ ] Note the created **Federação ID** from success response

### Step 1.3: Validate Database State
**Execute in Supabase Dashboard** (SQL Editor):
```sql
SELECT 
  id,
  nome,
  email,
  stakeholder_id,
  created_at
FROM federacoes
WHERE nome LIKE 'Federação Teste%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results**:
- [ ] `id` → UUID (note this)
- [ ] `nome` → Matches submitted value
- [ ] `email` → Matches submitted value
- [ ] `stakeholder_id` → **NOT NULL** ✅ (auto-linked on create)
- [ ] `stakeholder_id` → Matches your stakeholder (`stakeholders.id`) or fallback esperado

**Ownership check (optional):**
```sql
SELECT s.id, s.email, s.funcao
FROM stakeholders s
JOIN federacoes f ON f.stakeholder_id = s.id
WHERE f.nome LIKE 'Federação Teste%'
ORDER BY f.created_at DESC
LIMIT 1;
```

**Troubleshooting**: If `stakeholder_id` is NULL:
```sql
-- Check if stakeholder exists for your user
SELECT id, email, funcao FROM stakeholders WHERE id = auth.uid();

-- Check if email was found
SELECT id, email FROM stakeholders WHERE email ILIKE '${fed_email}%' LIMIT 5;
```

---

## 🏢 Test Flow Phase 2: Create Academia

### Step 2.1: Open "Nova Academia" Form (under Federação)
- [ ] Navigate to the Federação created in Phase 1
- [ ] Click "Nova Academia" (or equivalent button)
- [ ] Verify form pre-populates Federação ID

### Step 2.2: Fill & Submit Form
| Field | Test Value | Notes |
|-------|-----------|-------|
| Nome | `Academia Teste ${Date}` | — |
| Email | `acad-test-${timestamp}@smaartpro.com` | Different email to test email resolution |
| Responsável | `João Responsável` | — |
| Responsável Email | Use your **test user email** (or fixed email) | Critical: this triggers stakeholder resolution |
| Endereço | `Rua Teste, 123` | — |

- [ ] Submit form
- [ ] Verify success notification
- [ ] Note the created **Academia ID**

### Step 2.3: Validate Database State
```sql
SELECT 
  id,
  nome,
  stakeholder_id,
  responsavel_email,
  created_at
FROM academias
WHERE nome LIKE 'Academia Teste%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results**:
- [ ] `stakeholder_id` → **NOT NULL** ✅ (auto-resolved from `responsavel_email`)
- [ ] `stakeholder_id` → Should match your **test user's stakeholder_id** (from Phase 1, query stakeholders table with your email)

**Email Resolution Logic Validation**:
```sql
-- Verify the stakeholder lookup worked
SELECT 
  s.id, 
  s.email, 
  a.responsavel_email,
  (s.id = a.stakeholder_id) AS "Correctly Linked?"
FROM stakeholders s
JOIN academias a ON s.id = a.stakeholder_id
WHERE a.nome LIKE 'Academia Teste%'
LIMIT 1;
```

**Troubleshooting**: If `stakeholder_id` is NULL:
```sql
-- Check if stakeholder exists for the responsavel_email used
SELECT id, email, funcao FROM stakeholders 
WHERE email ILIKE '${responsavel_email}%' LIMIT 5;

-- If empty, the email resolution failed (stakeholder must exist first)
```

---

## 👤 Test Flow Phase 3: Create Atleta

### Step 3.1: Open "Novo Atleta" Form (under Academia)
- [ ] Navigate to the Academia created in Phase 2
- [ ] Click "Novo Atleta" button
- [ ] Verify form pre-populates Academia ID

### Step 3.2: Fill & Submit Form
| Field | Test Value | Notes |
|-------|-----------|-------|
| Nome | `Atleta Teste ${Date}` | — |
| Email | `athlete-test-${timestamp}@smaartpro.com` | — |
| Data Nascimento | `2005-01-15` | — |
| CPF | `12345678901` | Test CPF (fake is OK) |
| Responsável Fone | `(11) 99999-9999` | — |

- [ ] Submit form
- [ ] Verify success notification
- [ ] Note the created **Atleta ID**

### Step 3.3: Validate Database State
```sql
SELECT 
  id,
  nome,
  stakeholder_id,
  email,
  created_at
FROM atletas
WHERE nome LIKE 'Atleta Teste%'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results**:
- [ ] `stakeholder_id` → **NOT NULL** ✅ (auto-resolved OR defaults to current user)
- [ ] If you didn't enter a `responsavel_email` lookup, stakeholder should be your user ID

**Stakeholder Chain Validation**:
```sql
-- Verify the complete chain: atleta → academia → federação → all linked to same stakeholder
SELECT 
  s.id as stakeholder_id,
  s.email as stakeholder_email,
  f.nome as federation,
  a.nome as academy,
  ath.nome as athlete
FROM stakeholders s
LEFT JOIN federacoes f ON f.stakeholder_id = s.id
LEFT JOIN academias ac ON ac.stakeholder_id = s.id
LEFT JOIN atletas ath ON ath.stakeholder_id = s.id
WHERE s.email ILIKE '${your_test_email}%'  -- Your current user email
ORDER BY f.created_at DESC, ac.created_at DESC, ath.created_at DESC;
```

**Expected**: All three records (federação, academia, atleta) should show stakeholder_id matching your user OR the email resolution paths.

---

## 📖 Test Flow Phase 4: Edit & View (Admin Visibility)

### Step 4.1: Open "Editar Academia" Page
- [ ] Navigate back to the Academia created in Phase 2
- [ ] Click "Editar" button
- [ ] Scroll to top of form → Locate **"Stakeholder ID"** field

### Step 4.2: Validate Admin Visibility Field
- [ ] Field displays a **read-only** input
- [ ] Value shows a **UUID** (not empty)
- [ ] Cannot click/edit the field (should be disabled)
- [ ] Value matches the `stakeholder_id` from database query in Step 2.3

### Step 4.3: Open "Editar Atleta" Page
- [ ] Navigate back to the Atleta created in Phase 3
- [ ] Click "Editar" button
- [ ] Scroll to top/form area → Locate **"Stakeholder ID"** field
- [ ] Validate same as Step 4.2

---

## 🔒 Test Flow Phase 5: Constraint Hardening (Optional Advanced)

### Step 5.1: Verify Migration 022 Constraints Active
```sql
SELECT constraint_name, constraint_type, is_deferrable
FROM information_schema.constraint_column_usage ccu
JOIN information_schema.table_constraints tc ON tc.table_name = ccu.table_name
WHERE ccu.table_name IN ('federacoes', 'academias', 'atletas')
  AND constraint_name LIKE '%stakeholder%'
ORDER BY ccu.table_name;
```

**Expected Results**:
- [ ] `ck_federacoes_stakeholder_required` (CHECK constraint)
- [ ] `ck_academias_stakeholder_required` (CHECK constraint)
- [ ] `ck_atletas_stakeholder_required` (CHECK constraint)
- [ ] All should be marked `NOT VALID` (constraints exist but not enforced on old rows yet)

### Step 5.2: Validate Constraint Blocks Null Insert (Optional - do NOT run if you don't have test data to spare)
⚠️ **CAUTION**: This test will fail intentionally. Only run in development.

```sql
-- This INSERT should fail with CHECK violation
INSERT INTO academias (nome, email, stakeholder_id)
VALUES ('Test Academy Without Stakeholder', 'test@invalid.com', NULL);
-- Expected: ERROR: new row for relation "academias" violates check constraint
```

---

## ✅ Final Validation Checklist

### Data Integrity
- [ ] All 3 records (federação, academia, atleta) have non-NULL `stakeholder_id`
- [ ] All stakeholder_ids match your test user or correct email resolution
- [ ] No stakeholder_id collisions or orphaned links
- [ ] RLS policies prevent viewing records from other stakeholders

### UI/UX
- [ ] No console errors in browser DevTools (F12)
- [ ] No TypeScript compilation errors
- [ ] Forms submit without hanging
- [ ] Success notifications appear
- [ ] Edit pages load with correct stakeholder_id displayed (read-only)

### Database Consistency
```sql
-- Run final integrity audit
SELECT 
  'federacoes' as table_name,
  COUNT(*) as total_records,
  COUNT(stakeholder_id) as with_stakeholder_id,
  COUNT(*) - COUNT(stakeholder_id) as missing_stakeholder_id
FROM federacoes
UNION ALL
SELECT 'academias', COUNT(*), COUNT(stakeholder_id), COUNT(*) - COUNT(stakeholder_id)
FROM academias
UNION ALL
SELECT 'atletas', COUNT(*), COUNT(stakeholder_id), COUNT(*) - COUNT(stakeholder_id)
FROM atletas;
```

**Expected**: `missing_stakeholder_id` should be **0** for new records.

---

## 📌 Rollback / Troubleshooting

### Issue: Stakeholder_id is NULL after insert
**Root Cause**: Email resolution failed OR `resolveStakeholderId()` wasn't called

**Fix**:
1. Check stakeholders table has entry for the email used:
   ```sql
   SELECT id, email FROM stakeholders WHERE email ILIKE '${email}%';
   ```
2. If empty: User must be created in `auth.users` first (trigger will auto-create stakeholder)
3. Manually backfill:
   ```sql
   UPDATE federacoes SET stakeholder_id = '${your_stakeholder_id}' WHERE id = '${fed_id}';
   ```

### Issue: Form submits but data doesn't appear
1. Check API logs (Next.js terminal)
2. Verify Supabase service-role key loaded in API handler
3. Check RLS policies aren't blocking INSERT with service role

### Issue: Constraint violation on insert
**If Migration 022 is enforced**: Either:
- Always populate stakeholder_id before insert (current code does this), or
- Backfill legacy records first, then migrate 022 will only apply to new rows

---

## 📊 Expected Outcome Summary

**After All Phases Complete**:
```
✅ Federação created with stakeholder_id auto-linked
✅ Academia created with stakeholder_id auto-linked (from responsavel_email)
✅ Atleta created with stakeholder_id auto-linked
✅ Edit pages display stakeholder_id (read-only) for admin visibility
✅ Database shows 0 missing stakeholder_id for new records
✅ No console errors, no TypeScript errors
✅ System ready for production deployment
```

---

## 🚀 Sign-Off

| Item | Status |
|------|--------|
| Migrations 019-023 Applied | ☐ |
| Phase 1: Federação Created & Linked | ☐ |
| Phase 2: Academia Created & Linked | ☐ |
| Phase 3: Atleta Created & Linked | ☐ |
| Phase 4: Admin Visibility Fields Validated | ☐ |
| Phase 5: Constraint Hardening Verified (Optional) | ☐ |
| Data Integrity Audit Passed | ☐ |
| No Console/TypeScript Errors | ☐ |
| **READY FOR PRODUCTION** | ☐ |

---

**Next Steps** (if all pass):
- [ ] Document any deviations in deployment notes
- [ ] Run full regression test suite
- [ ] deploy to staging, then production

