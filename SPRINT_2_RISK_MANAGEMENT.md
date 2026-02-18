# Risk Management & Contingency Planning - SMAART PRO Sprint 2

## 🎯 Risk Assessment Matrix

```
IMPACT (HIGH/MEDIUM/LOW) vs PROBABILITY (HIGH/MEDIUM/LOW)

           LOW PROB    MEDIUM PROB    HIGH PROB
─────────────────────────────────────────────────
HIGH       [4]         [2] 🔴          [1] 🔴
IMPACT     Meteor      Scope Creep     API Delays

MEDIUM     [7]         [5] 🟡          [3] 🟡
IMPACT     Auth issue  DB schema       Integration bugs

LOW        [8]         [6] 🟢          [9] 🟢
IMPACT     Typos       Minor polish    CSS issues
─────────────────────────────────────────────────
```

---

## 🔴 Critical Risks (HIGH IMPACT + ANY PROBABILITY)

### Risk #1: Safe2Pay API Unavailable/Delays
**Probability**: HIGH (60% chance of 1-2h delay)  
**Impact**: CRITICAL (blocks Dev 1 for 1-2 days, delays MVP)  
**Detection**: Can't reach api.safe2pay.com.br or no response  

**Mitigation Plan**:
```
PREVENTION:
  ✓ Get credentials 48h before Sprint 2 starts (21/02)
  ✓ Test API access Monday morning (25/02)
  ✓ Document all API endpoints + auth flow
  ✓ Setup monitoring for API status

CONTINGENCY (if API unavailable):
  STEP 1: Create mock Safe2Pay adapter
    └─ File: lib/safe2pay/mock-adapter.ts
       Returns: real-looking responses
       Stores: in-memory DB
       
  STEP 2: Dev 1 continues with mock
    └─ Build form, checkout page, webhook handler
    └─ All logic works with mock data
    
  STEP 3: Swap real API when available
    └─ Just change import statement
    └─ No code changes needed
    
  STEP 4: Continue without major delay
    └─ Loss of only 2-3 hours
    └─ Not blocking

CODE STRUCTURE:
```typescript
// lib/safe2pay/client.ts or lib/safe2pay/mock-adapter.ts
export interface Safe2PayClient {
  createOrder(params: OrderParams): Promise<OrderResponse>
  validateWebhook(signature, payload): boolean
  getOrderStatus(transaction_id): Promise<OrderStatus>
}

// Switch at runtime
const client = process.env.USE_SAFE2PAY_MOCK
  ? new MockSafe2PayClient()
  : new RealSafe2PayClient()
```

**Owner**: Luiz  
**Activation**: Immediately after API unavailability detected  
**Rollback**: Change env var to USE_SAFE2PAY_MOCK=false

---

### Risk #2: Database Schema Incompatible with Frequencia Table
**Probability**: MEDIUM (40% chance of minor issues)  
**Impact**: CRITICAL (blocks Dev 2 check-in persistence)  
**Detection**: INSERT frequencia fails during testing  

**Mitigation Plan**:
```
PREVENTION:
  ✓ Pre-create frequencia table schema (ahead of Sprint 2)
  ✓ Test RLS policies with safe.sql
  ✓ Create migration script prior to development
  
  Schema design:
  ```sql
  CREATE TABLE IF NOT EXISTS frequencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id UUID NOT NULL REFERENCES atletas(id),
    academia_id UUID NOT NULL REFERENCES academias(id),
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT now(),
    data_saida TIMESTAMP WITH TIME ZONE,
    tipo VARCHAR(20) DEFAULT 'entrada', -- entrada/saida
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  
  CREATE INDEX idx_frequencia_atleta ON frequencia(atleta_id);
  CREATE INDEX idx_frequencia_academia ON frequencia(academia_id);
  CREATE INDEX idx_frequencia_data ON frequencia(data_entrada);
  
  ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Users can view their academy frequencia"
    ON frequencia FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM academias
        WHERE academias.id = frequencia.academia_id
        AND academias.user_id = auth.uid()
      )
    );
  ```

CONTINGENCY (if schema incompatible):
  STEP 1: Identify exact error
    ├─ Foreign key constraint? → Add missing reference
    ├─ RLS policy blocking? → Adjust policy
    └─ Column type mismatch? → Add migration
    
  STEP 2: Write migration script
    └─ File: supabase/migrations/002_frequencia_fix.sql
    
  STEP 3: Apply migration
    └─ Run locally first: supabase db push
    └─ Test INSERT again
    
  STEP 4: Deploy and verify
    └─ Apply to production database
    └─ Verify all tests pass
```

**Owner**: Dev 2 (with Luiz support)  
**Detection Time**: Tuesday 26/02 (after first insert test)  
**Fix Time**: <2 hours max  
**Rollback**: Previous migration still valid

---

### Risk #3: JWT Token Validation / Expiry Issues
**Probability**: MEDIUM (40% chance of edge case bugs)  
**Impact**: CRITICAL (QR checkin broken, no athletes can enter)  
**Detection**: POST /api/acesso/checkin fails with valid token  

**Mitigation Plan**:
```
PREVENTION:
  ✓ Pre-write comprehensive JWT validator tests
  ✓ Test with various token states (valid, expired, malformed)
  ✓ Use well-tested library (jsonwebtoken @latest)
  
  Test suite structure:
  ```typescript
  describe('QR Validator', () => {
    test('generateQRToken creates valid JWT', () => {
      const token = generateQRToken('atleta-123', 'acad-456')
      expect(token).toMatch(/^eyJ.*\.eyJ.*\..*$/) // JWT format
      expect(token.split('.').length).toBe(3)
    })
    
    test('validateQRToken accepts valid token', () => {
      const token = generateQRToken('atleta-123', 'acad-456')
      const payload = validateQRToken(token)
      expect(payload).toBeTruthy()
      expect(payload.atleta_id).toBe('atleta-123')
    })
    
    test('validateQRToken rejects expired token', async () => {
      const oldToken = generateQRToken('atleta-123', 'acad-456')
      // Fake expiration by 25 hours
      await new Promise(r => setTimeout(r, 100))
      // Manually expire by manipulating time (jest.useFakeTimers)
      const payload = validateQRToken(oldToken)
      expect(payload).toBeNull()
    })
    
    test('validateQRToken rejects malformed token', () => {
      const payload = validateQRToken('not-a-jwt')
      expect(payload).toBeNull()
    })
    
    test('validateQRToken rejects token from different secret', () => {
      const token = createTokenWithDifferentSecret()
      const payload = validateQRToken(token)
      expect(payload).toBeNull()
    })
  })
  ```

CONTINGENCY (if token validation broken):
  STEP 1: Enable debug logging
    └─ Log token payload before validation
    └─ Log validation errors
    
  STEP 2: Check JWT secret consistency
    └─ Verify process.env.JWT_SECRET same everywhere
    └─ Verify .env.local has value
    
  STEP 3: Test with known good token
    └─ Create test token with hardcoded values
    └─ Validate manually
    
  STEP 4: Review jsonwebtoken docs
    └─ Check if expiresIn format correct ('24h' vs 86400)
    └─ Check if options are correct
    
  STEP 5: Swap implementation if needed
    └─ Use crypto-jwt or jose lib as backup
    └─ Estimated fix time: 2-3 hours

MONITORING:
  ├─ Error rate: <0.1% of checkins
  ├─ Response time: <200ms for validation
  └─ Token generation success: 100%
```

**Owner**: Dev 2 (with Luiz support)  
**Detection Time**: Wednesday 27/02 (first QR scan test)  
**Fix Time**: <3 hours max  
**Backup Library**: jose library (auth0 maintained)

---

## 🟡 Medium Severity Risks

### Risk #4: Webhook Signature Validation Fails
**Probability**: MEDIUM (50%)  
**Impact**: MEDIUM (payments not updating, but manual fix possible)  
**Detection**: Webhook received but signature validation fails  

**Mitigation**:
```
PREVENTION:
  ✓ Use Safe2Pay webhook test suite
  ✓ Log all webhook attempts + signatures
  ✓ Compare signatures with Safe2Pay docs
  
CONTINGENCY:
  STEP 1: Temporarily disable signature check
    └─ Add env var: WEBHOOK_VERIFY_SIGNATURE=false
    └─ Allows manual testing without valid sig
    
  STEP 2: Log webhook payload
    └─ Write to database for inspection
    └─ Compare with expected format
    
  STEP 3: Fix signature generation
    └─ Verify HMAC algorithm correct
    └─ Verify secret key usage
    
  STEP 4: Re-enable verification
    └─ Set WEBHOOK_VERIFY_SIGNATURE=true
```

**Owner**: Dev 1 (with Luiz support)  
**Fix Time**: 1-2 hours  

---

### Risk #5: Database Performance Issues (Slow Queries)
**Probability**: LOW (20%)  
**Impact**: MEDIUM (dashboard slow, but functional)  
**Detection**: Queries >1s timeout, UI freezes  

**Mitigation**:
```
PREVENTION:
  ✓ Add indexes before Sprint 2:
    - CREATE INDEX idx_frequencia_data ON frequencia(data_entrada)
    - CREATE INDEX idx_pedidos_status ON pedidos(status)
    - CREATE INDEX idx_pedidos_academia ON pedidos(academia_id)
    
  ✓ Limit queries: LIMIT 100 always
  
  ✓ Use connection pooling: PgBouncer (included in Supabase)

CONTINGENCY:
  STEP 1: Enable query logging
    └─ SELECT enable_pg_stat_statements()
    └─ Identify slow queries
    
  STEP 2: Add missing indexes
    └─ CREATE INDEX CONCURRENTLY idx_...
    
  STEP 3: Paginate results
    └─ Instead of SELECT * (1000 rows)
    └─ Use OFFSET/LIMIT (20 rows per page)
    
  STEP 4: Cache results
    └─ Cache dashboard stats for 5 minutes
    └─ Use Redis or memory cache
```

**Owner**: Luiz  
**Detection Time**: Friday 01/03 (first load testing)  
**Fix Time**: 1-2 hours

---

### Risk #6: Form Validation / State Management Bugs
**Probability**: MEDIUM (40%)  
**Impact**: MEDIUM (form doesn't work, users frustrated)  
**Detection**: Form submits invalid data OR form stuck loading  

**Mitigation**:
```
PREVENTION:
  ✓ Use controlled components (React state)
  ✓ Client-side validation before submit
  ✓ Disable submit during loading
  ✓ Show clear error messages
  
CONTINGENCY:
  STEP 1: Clear browser cache
    └─ localStorage might have stale data
    
  STEP 2: Check console logs
    └─ Network error? Server error?
    └─ JS error in form code?
    
  STEP 3: Simplify form
    └─ Remove optional fields
    └─ Test with minimal data
    
  STEP 4: Use form library
    └─ React Hook Form + Zod validation
    └─ More robust than manual state
```

**Owner**: Dev 1  
**Fix Time**: 1-2 hours

---

## 🟢 Low Severity Risks

### Risk #7: Mobile CSS Responsiveness Issues
**Probability**: MEDIUM (50% of layouts fail mobile)  
**Impact**: LOW (desktop works, mobile broken)  
**Detection**: Layout broken on phone (400px width)  

**Mitigation**:
```
PREVENTION:
  ✓ Use Tailwind CSS responsive classes
    - grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  ✓ Test on actual phone or browser dev tools
  ✓ Use mobile-first approach

CONTINGENCY:
  STEP 1: Use Tailwind responsive prefixes
    └─ sm: (640px), md: (768px), lg: (1024px)
    
  STEP 2: Test on real devices
    └─ iPhone 12, Pixel 6, iPad
    └─ Use BrowserStack if needed
    
  STEP 3: Fix breakpoints
    └─ Grid: mobile 1 col, tablet 2, desktop 4
    └─ Font: mobile 12px, desktop 14px
```

**Owner**: Both devs (during work)  
**Fix Time**: <1 hour per issue

---

### Risk #8: Dependency Conflicts / Version Mismatches
**Probability**: LOW (15%)  
**Impact**: MEDIUM (build fails, need to downgrade)  
**Detection**: npm install fails OR build error "peer dependency conflict"  

**Mitigation**:
```
PREVENTION:
  ✓ Install exact versions at Sprint 2 start
    npm install jsonwebtoken@9.0.0 qrcode@1.5.3
  ✓ Document all versions in README
  ✓ Use package-lock.json (git committed)
  
CONTINGENCY:
  STEP 1: Check npm audit
    └─ npm audit fix (auto fix)
    
  STEP 2: Remove problematic package
    └─ Try with different version
    └─ npm install [package]@[version] --save
    
  STEP 3: Check compatibility matrix
    └─ jsonwebtoken + qrcode + next compatibility
    └─ Look at GitHub issues
    
  STEP 4: Use alternative package
    └─ Instead of qrcode → use jsQR or QRious
    └─ Instead of jsonwebtoken → use jose
```

**Owner**: Dev 2 (with Luiz support)  
**Fix Time**: <1 hour

---

## 🔧 Contingency Activation Procedures

### When to Activate Contingency

**TIER 1 - Activate Immediately** (within 1 hour):
- [ ] Can't deploy to production
- [ ] Critical feature broken
- [ ] Data loss or data corruption
- [ ] Security breach detected
- [ ] API completely unavailable

**TIER 2 - Activate ASAP** (within 4 hours):
- [ ] Major feature has bugs
- [ ] Performance severely degraded
- [ ] Integration failing
- [ ] Database queries timing out

**TIER 3 - Activate if Over 2h Lost** (within 8 hours):
- [ ] Minor feature bug
- [ ] Some users affected
- [ ] Workaround exists
- [ ] Not blocking MVP

### Escalation Path

```
Developer discovers issue
        ↓
Try quick fix (15 min)
        ↓
     Success? → Continue
        ↓ No
   Ping Luiz (Slack)
        ↓
  Luiz reviews (5 min)
        ↓
  Activate contingency? → Yes
        ↓
   Pair programming (30 min)
        ↓
     Resolved? → Continue
        ↓ No
   Emergency meeting (15 min)
        ↓
  Replan sprint (1 hour)
        ↓
  Execute backup plan (remaining time)
```

---

## 📋 Contingency Checklist (Prepare Before Sprint 2)

### Pre-Sprint Setup (21/02 Friday)

- [ ] Safe2Pay credentials obtained + tested
- [ ] frequencia table schema created
- [ ] JWT validator tests written
- [ ] Mock Safe2Pay adapter code ready
- [ ] Backup libraries identified (jose, jsQR)
- [ ] Database backup created
- [ ] Monitoring alerts configured
- [ ] Rollback procedure documented
- [ ] Slack #emergencies channel created
- [ ] Phone numbers of team members shared

### During Sprint 2 (daily)

- [ ] Check API status pages (Safe2Pay, Supabase)
- [ ] Monitor error logs (Sentry)
- [ ] Review database performance (Supabase metrics)
- [ ] Check build/deploy logs
- [ ] Ask daily: "Any blockers or risks emerged?"

### End of Week (Friday EOD)

- [ ] Review risks that materialized
- [ ] Update risk matrix
- [ ] Document lessons learned
- [ ] Plan preventive measures for Sprint 3

---

## 📊 Risk Dashboard (Real-time)

```
CURRENT STATUS: ✅ GREEN (No active issues)

Risk #1 - Safe2Pay API Delays
├─ Status: 🟢 Ready
├─ Prep:   Mock adapter ready (lib/safe2pay/mock-adapter.ts)
├─ Impact: -2h if activated
└─ Owner:  Luiz

Risk #2 - Database Schema Issues
├─ Status: 🟢 Ready
├─ Prep:   frequencia table schema pre-created
├─ Impact: -1h if activated
└─ Owner:  Dev 2 + Luiz

Risk #3 - JWT Token Validation
├─ Status: 🟢 Ready
├─ Prep:   Comprehensive tests written
├─ Impact: -2h if activated
└─ Owner:  Dev 2

Risk #4 - Webhook Signature Validation
├─ Status: 🟢 Ready
├─ Prep:   Disabled validation mode + logging
├─ Impact: -1h if activated
└─ Owner:  Dev 1

Risk #5 - Database Performance
├─ Status: 🟢 Ready
├─ Prep:   Indexes created, query optimization ready
├─ Impact: -2h if activated
└─ Owner:  Luiz

Risk #6 - Form Validation Bugs
├─ Status: 🟢 Ready
├─ Prep:   React Hook Form integration ready
├─ Impact: -1h if activated
└─ Owner:  Dev 1

Risk #7 - Mobile CSS Issues
├─ Status: 🟢 Ready
├─ Prep:   Responsive template ready
├─ Impact: <1h if minor
└─ Owner:  Both devs

Risk #8 - Dependency Conflicts
├─ Status: 🟢 Ready
├─ Prep:   Alternative packages identified
├─ Impact: <1h if activated
└─ Owner:  Dev 2

────────────────────────────────────
TOTAL RISK BUFFER: ~12 hours of contingency capacity
DEADLINE CUSHION: 3+ days before 12/03
CONFIDENCE LEVEL: VERY HIGH ✅
────────────────────────────────────
```

---

## 🎯 Post-Launch Risks (Sprint 3+)

While not for Sprint 2, consider for future:

- **Risk 9**: Users can't login (Auth/SSO issues)
- **Risk 10**: Payment confirmation emails not sent
- **Risk 11**: Mobile app dev delays (new platform)
- **Risk 12**: Competitor launches similar product
- **Risk 13**: Server scaling issues (high load)
- **Risk 14**: Data export/compliance requirements

---

**Document Version**: 1.0  
**Created**: 18/02/2026  
**Last Updated**: 18/02/2026  
**Review Frequency**: Every Friday EOD  
**Owner**: Luiz (Tech Lead)  
**Next Review**: 25/02/2026 (Sprint 2 kickoff)

