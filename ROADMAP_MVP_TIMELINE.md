# Roadmap Técnico - SMAART PRO MVP (Fevereiro - Março 2026)

## 📅 Timeline Completa

```
FEVEREIRO 2026
═════════════════════════════════════════════════════════════════════
DATA          SPRINT        STATUS           ENTREGA                 
═════════════════════════════════════════════════════════════════════

12 (QUA)      Sprint 1A     📋 Planejado     Endpoints pagamentos
13-19 (QUA)   Sprint 1A     ✅ CONCLUÍDO     ✓ POST criar
              Sprint 1B     ✅ CONCLUÍDO     ✓ GET listar
                                             ✓ React component
                                             ✓ /dashboard/pagamentos
                                             ✓ Deploy LIVE

18 (TER)      Doc/Planning  ✅ CONCLUÍDO     ✓ DEV_1_COMECE_AQUI.md
                                             ✓ DEV_2_COMECE_AQUI.md
                                             ✓ SPRINT_1_STATUS_FINAL.md
                                             ✓ SPRINT_2_PLANEJAMENTO.md

25-26 (TER)   Kickoff       📋 Agendado      09:00 - Reunião equipe
              Sprint 2A     📋 Planejado     Safe2Pay setup
              Sprint 2B     📋 Planejado     JWT + QR real

════════════════════════════════════════════════════════════════════

MARÇO 2026
═════════════════════════════════════════════════════════════════════

25-01/03      Sprint 2A/2B  🔄 In Progress   Safe2Pay form
(TER-QUA)                                    JWT validator
                                             QR real
                                             Checkin DB

01/03 (SEX)   Code Review   📋 Agendado      17:00 - Review PRs
                                             18:00 - Sprint Review

04-07/03      Sprint 2A/2B  🔄 In Progress   Dashboard receitas
(SEG-QUI)                                    Relatório frequência
                                             Gráficos

08/03 (SEX)   Sprint 2      ✅ Target        • Testes finalizados
              Complete                       • PRs mergeados
                                             • Deploy staging

10-12/03      UAT/Polish    🔄 In Progress   • Bug fixes
(SEG-QUA)                                    • Performance tuning
                                             • User acceptance test
                                             • Final deploy

12/03 (QUA)   🚀 LAUNCH    🎉 MVP LIVE      TITAN em produção!
              DATE          PRODUCTION       Pagamentos + QR + Stats

════════════════════════════════════════════════════════════════════
```

---

## 📊 Estimativas por Feature

### Sprint 1A - Pagamentos (COMPLETO ✅)

| Feature | Dev 1 | Dev 2 | Luiz | Total | Status |
|---------|-------|-------|------|-------|--------|
| Endpoints (criar + listar) | 1.5h | - | - | 1.5h | ✅ |
| React component | 1.5h | - | - | 1.5h | ✅ |
| Page /dashboard/pagamentos | 0.5h | - | - | 0.5h | ✅ |
| Build + Deploy | - | - | 0.5h | 0.5h | ✅ |
| **TOTAL SPRINT 1A** | **3.5h** | - | **0.5h** | **4h** | ✅ |

### Sprint 1B - QR Acesso (COMPLETO ✅)

| Feature | Dev 1 | Dev 2 | Luiz | Total | Status |
|---------|-------|-------|------|-------|--------|
| Endpoints (gerar-qr + checkin) | - | 1.5h | - | 1.5h | ✅ |
| React component (mock) | - | 1.5h | - | 1.5h | ✅ |
| Page /dashboard/acesso/gerar-qr | - | 0.5h | - | 0.5h | ✅ |
| Build + Deploy | - | - | 0.5h | 0.5h | ✅ |
| **TOTAL SPRINT 1B** | - | **3.5h** | **0.5h** | **4h** | ✅ |

### Sprint 2A - Safe2Pay Integration

| Feature | Dev 1 | Dev 2 | Luiz | Total | Timeline | Status |
|---------|-------|-------|------|-------|----------|--------|
| Setup + credentials | 1h | - | 0.5h | 1.5h | 25/02 SEG | 📋 |
| Safe2Pay client lib | 1.5h | - | - | 1.5h | 25/02 SEG | 📋 |
| CriarPedidoForm | 2.5h | - | - | 2.5h | 26/02 TER | 📋 |
| Checkout page | 2h | - | - | 2h | 27/02 QUA | 📋 |
| Webhook handler | 2.5h | - | 0.5h | 3h | 28/02-01/03 THU-FRI | 📋 |
| Dashboard receitas | 3h | - | - | 3h | 04-05/03 SEG-TER | 📋 |
| Stats endpoint | 1.5h | - | - | 1.5h | 05/03 TER | 📋 |
| Email integration | 1.5h | - | 0.5h | 2h | 05/03 TER | 📋 |
| Integration testing | 2h | - | 1h | 3h | 07/03 FRI | 📋 |
| **TOTAL SPRINT 2A** | **17.5h** | - | **2.5h** | **20h** | | |

### Sprint 2B - Real QR Codes

| Feature | Dev 1 | Dev 2 | Luiz | Total | Timeline | Status |
|---------|-------|-------|------|-------|----------|--------|
| Install deps | - | 0.25h | - | 0.25h | 25/02 SEG | 📋 |
| JWT validator lib | - | 1.5h | - | 1.5h | 25/02 SEG | 📋 |
| Real gerar-qr.ts | - | 1.5h | - | 1.5h | 26/02 TER | 📋 |
| Real checkin.ts | - | 1.5h | - | 1.5h | 27/02 QUA | 📋 |
| QRGenerator component | - | 2h | - | 2h | 27-28/02 WED-THU | 📋 |
| atletas/por-academia API | - | 0.75h | - | 0.75h | 28/02 THU | 📋 |
| Frequência relatório page | - | 2h | - | 2h | 04-05/03 MON-TUE | 📋 |
| Relatório API | - | 1.5h | - | 1.5h | 05/03 TUE | 📋 |
| Integration testing | - | 2h | 1h | 3h | 07/03 FRI | 📋 |
| **TOTAL SPRINT 2B** | - | **14.25h** | **1h** | **15.25h** | | |

### Sprint 2C - Dashboard Unified

| Feature | Dev 1 | Dev 2 | Luiz | Total | Timeline | Status |
|---------|-------|-------|------|-------|----------|--------|
| Design planning | 1h | 1h | - | 2h | 25/02 SEG | 📋 |
| Dashboard page | 2h | 1.5h | - | 3.5h | 28/02-01/03 THU-FRI | 📋 |
| Stats cards | 1.5h | - | - | 1.5h | 01/03 FRI | 📋 |
| Gráficos (Recharts) | 2h | - | - | 2h | 04/03 MON | 📋 |
| Quick actions | 1h | 1h | - | 2h | 04/03 MON | 📋 |
| Alertas system | 1h | - | - | 1h | 05/03 TUE | 📋 |
| Mobile responsive | 1.5h | 1.5h | - | 3h | 06/03 WED | 📋 |
| **TOTAL SPRINT 2C** | **10h** | **5h** | - | **15h** | | |

---

## 🎯 Horas Totais por Desenvolvedor

### Dev 1 (Pagamentos + Alguns Comuns)
```
Sprint 1A:  3.5h  ✅
Sprint 2A:  17.5h 📋
Sprint 2C:  10h   📋
──────────────────
Total:      31h   ≈ 3.9 dias (40h/dia)
```

### Dev 2 (QR Code + Alguns Comuns)
```
Sprint 1B:  3.5h  ✅
Sprint 2B:  14.25h 📋
Sprint 2C:  5h    📋
──────────────────
Total:      22.75h ≈ 2.8 dias (40h/dia)
```

### Luiz (Tech Lead / Review)
```
Sprint 1:   1h    ✅
Sprint 2:   3.5h  📋
──────────────────
Total:      4.5h
```

---

## 📈 Peso por Semana

### Semana 1 (25-29/02)
```
Dev 1: 3.5h (Safe2Pay setup + form)
Dev 2: 3.5h (JWT + QR real)
Total: 7h + Pair (dashboard planning)

Capacity: 40h/dev * 1 dia effective (kickoff + planning) = 20h
Status: 🟢 Under capacity on schedule
```

### Semana 2 (04-08/03)
```
Dev 1: 8h (Dashboard + webhook + stats + testing)
Dev 2: 8h (Relatório + testing + gráficos)
Total: 16h + Pair (final integration)

Capacity: 40h/dev * 1 dia = 20h
Status: 🟢 Under capacity, on schedule
```

### Semana 3 (10-12/03)
```
Dev 1: 5h (Polish + UAT)
Dev 2: 3h (Polish + UAT)
Total: 8h

Capacity: 40h/dev * 0.5 dia = 10h
Status: 🟢 Ready for launch!
```

---

## 🔄 Parallelização (Dev 1 vs Dev 2)

```
SEMANA 1 (25-29/02)
═══════════════════════════════════════════════════════════════

MON 25/02
│
├─ DEV 1: Safe2Pay setup + client lib
│         CriarPedidoForm (start)
│
├─ DEV 2: Install deps + JWT validator
│         Real gerar-qr.ts (start)
│
└─ LUIZ:  Standup + planning

──────────────────────────────────────────────────────────────

TUE 26/02
│
├─ DEV 1: CriarPedidoForm (continue)
│         Checkout page (start)
│
├─ DEV 2: Real gerar-qr.ts (continue)
│         Real checkin.ts (start)
│
└─ LUIZ:  Daily standup

──────────────────────────────────────────────────────────────

WED 27/02
│
├─ DEV 1: Checkout page (continue)
│         Webhook handler (start)
│
├─ DEV 2: Real checkin.ts (continue)
│         QRGenerator component (start)
│
└─ LUIZ:  Daily standup

──────────────────────────────────────────────────────────────

THU 28/02
│
├─ DEV 1: Webhook handler (continue)
│         Dashboard design avec Dev 2
│
├─ DEV 2: QRGenerator component (continue)
│         atletas/por-academia API
│         Dashboard design avec Dev 1
│
└─ LUIZ:  Daily standup + prep code review

──────────────────────────────────────────────────────────────

FRI 01/03
│
├─ DEV 1: Testing + Dashboard setup
│         Stats cards
│
├─ DEV 2: Testing + Database validation
│
└─ LUIZ:  Code review 17:00 + Sprint review 18:00

════════════════════════════════════════════════════════════════

SEMANA 2 (04-08/03)
═══════════════════════════════════════════════════════════════

MON 04/03
│
├─ DEV 1: Dashboard page finalize
│         Gráficos com Recharts
│
├─ DEV 2: Relatório frequência page (start)
│         Quick actions comum
│
└─ LUIZ:  Standup + monitoring

──────────────────────────────────────────────────────────────

TUE 05/03
│
├─ DEV 1: Gráficos (finalize)
│         Email integration
│
├─ DEV 2: Relatório API
│         Mobile responsive (start)
│
└─ LUIZ:  Daily standup

──────────────────────────────────────────────────────────────

WED 06/03
│
├─ DEV 1: Dashboard final tweaks
│         Mobile responsive (pair with Dev 2)
│
├─ DEV 2: Mobile responsive (pair with Dev 1)
│         Alertas system
│
└─ LUIZ:  QA testing

──────────────────────────────────────────────────────────────

THU 07/03
│
├─ DEV 1: Final testing + docs
│         PR preparation
│
├─ DEV 2: Final testing + docs
│         PR preparation
│
└─ LUIZ:  Staging deployment prep

──────────────────────────────────────────────────────────────

FRI 08/03
│
├─ DEV 1: Wait for review + hotfixes
│         Documentation updates
│
├─ DEV 2: Wait for review + hotfixes
│         Documentation updates
│
└─ LUIZ:  Final code review 17:00
           Sprint 2 review 18:00
           Merge to main

════════════════════════════════════════════════════════════════

SEMANA 3 (10-12/03)
═══════════════════════════════════════════════════════════════

MON 10/03
│
├─ DEV 1: UAT + bug fixes
│
├─ DEV 2: UAT + bug fixes
│
└─ LUIZ:  Staging monitoring + QA

──────────────────────────────────────────────────────────────

TUE 11/03
│
├─ DEV 1: Final polish
│
├─ DEV 2: Final polish
│
└─ LUIZ:  Final checks + deployment prep

──────────────────────────────────────────────────────────────

WED 12/03
│
├─ DEV 1: ✅ Standby for production
│
├─ DEV 2: ✅ Standby for production
│
└─ LUIZ:  🚀 LAUNCH PRODUCTION (morning)
           ✅ LIVE in production

════════════════════════════════════════════════════════════════
```

---

## ⚡ Critical Path (PERT Analysis)

### Optimistic - Pessimistic - Most Likely

```
Safe2Pay Integration:
  Optimistic:  8h  (if credentials ready)
  Likely:      12h (creds delayed 1-2h)
  Pessimistic: 16h (integration issues)
  Expected:    12h

JWT + QR Real:
  Optimistic:  6h  (smooth implementation)
  Likely:      10h (debugging needed)
  Pessimistic: 14h (token validation issues)
  Expected:    10h

Dashboard + Gráficos:
  Optimistic:  6h  (UI straightforward)
  Likely:      10h (styling + responsive)
  Pessimistic: 14h (library conflicts)
  Expected:    10h

Testing + Polish:
  Optimistic:  4h  (few bugs)
  Likely:      8h  (normal bugs)
  Pessimistic: 12h (major issues)
  Expected:    8h

──────────────────────────────────────────
TOTAL EXPECTED: 40h (2.5 days of slippage room)
DEADLINE:       12/03 23:59
BUFFER:         3+ days before deadline ✅
```

---

## 🚨 Red Flags & Contingencies

### Risk 1: Safe2Pay API Delays
- **Likelihood**: Medium (30%)
- **Impact**: High (blocks Dev 1 for 1-2 days)
- **Contingency**: Create mock Safe2Pay adapter to continue development in parallel
- **Owner**: Luiz

### Risk 2: JWT Token Validation Issues
- **Likelihood**: Low (15%)
- **Impact**: High (blocks QR checkin)
- **Contingency**: Pre-written token validation tests + backup lib (crypto-jwt)
- **Owner**: Dev 2

### Risk 3: Database Schema Issues
- **Likelihood**: Low (10%)
- **Impact**: High (blocks data persistence)
- **Contingency**: Pre-migration scripts + RLS policy validation
- **Owner**: Luiz

### Risk 4: Scope Creep from Stakeholders
- **Likelihood**: High (70%)
- **Impact**: Medium (pushes timeline)
- **Contingency**: Clear MVP scope defined + future sprint backlog
- **Owner**: Luiz

### Mitigation Playbook:
```
IF any task overruns by >2 hours:
  → Pair programming with another dev
  → Remove non-critical features (polish)
  → Extend timeline by 1 day max

IF Safe2Pay unavailable:
  → Use mock adapter (dev continues)
  → Setup call with Safe2Pay support EOD

IF major bug found 24h before launch:
  → Temporarily revert feature
  → Add to post-launch fix list
  → Launch with current scope
```

---

## ✅ Definition of Done (Por Task)

- [ ] Code написан и testado locally
- [ ] Unit tests passando (coverage >80%)
- [ ] PR aberto с description clara
- [ ] Code review concluído (Luiz approve)
- [ ] Build passing (npm run build)
- [ ] Deploy to staging validated
- [ ] E2E testing completo
- [ ] Documentation atualizada
- [ ] Merged to main

---

## 📞 Communication Cadence

```
DAILY (weekdays):
  15:00-15:15 BRT: Standup (Luiz, Dev 1, Dev 2)
    - Yesterday: what shipped?
    - Today: what's planned?
    - Blockers: any help needed?
  
WEEKLY:
  Friday 17:00: Code Review
    - Review all PRs from week
    - Approve/request changes
    - Plan merge timing
    
  Friday 18:00: Sprint Review
    - Demo completed work
    - Team feedback
    - Next sprint planning
    
  Monday 09:00: Sprint Planning (only on Sprint start)
    - Assign tasks
    - Clarify requirements
    - Setup dev environments

SLACK:
  Channel: #sprint-2-payments-qr
  Updates: Deploy notifications + PR links
  Questions: Ping @luiz or @dev1 or @dev2
```

---

## 📊 Velocity & Burndown

### Expected Burndown (Ideal vs Actual)

```
Sprint 2 Burndown Chart
─────────────────────────────────────────

40h ┤                              ┌─ Ideal (linear)
    │    
35h │  
    │    \ (Dev 1 setup + learning)
30h │     \
    │      ├─ Actual (expected curve)
25h │      \
    │       ┌─────┐ (Stalled on deps)
20h │       │     └──\
    │       │        \  
15h │       │         \┌─ Fast progress
    │       │         │ 
10h │       │         │
    │       │         │
 5h │       │         │
    │ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
 0h └────────────────────
    MON    TUE   WED   THU   FRI
    25/02        26/02        27/02-01/03
    
    Week 1: ~7h/day (good pace)
    Week 2: ~8h/day (full speed)
    Week 3: ~4h/day (polish)
```

---

## 🏁 Go/No-Go Criteria (12/03 Launch)

### MUST HAVE (MVP Core)
- [x] Pagamentos funcionando (Sprint 1A)
- [x] QR Code funcionando (Sprint 1B)
- [ ] Safe2Pay integrado (Sprint 2A)
- [ ] JWT + Real QR (Sprint 2B)
- [ ] Database persistence
- [ ] Dashboard básico

### SHOULD HAVE (MVP+)
- [ ] Webhook confirmations
- [ ] Email notifications
- [ ] Relatório frequência
- [ ] Gráficos receita

### NICE TO HAVE (Sprint 3+)
- [ ] Mobile app
- [ ] SMS alerts
- [ ] Voice notifications
- [ ] API for third parties

### Minimum Viable MVP:
- ✅ Create payment order
- ✅ Generate QR code
- **⏳ Process payment (Safe2Pay)**
- **⏳ Register check-in (Database)**
- ✅ View data (Dashboard)

**Status**: All dependent on Sprint 2 completion on 08/03 ✅

---

## 🎁 Final Deliverables (12/03)

### Code
```
apps/titan/
├── app/
│   ├── api/
│   │   ├── pagamentos/ [criar, listar, checkout, stats]
│   │   ├── acesso/ [gerar-qr, checkin, relatorio]
│   │   └── webhooks/ [safe2pay]
│   └── (dashboard)/
│       ├── page.tsx (dashboard principal)
│       ├── pagamentos/ [...]
│       └── acesso/ [...relatorio...]
├── components/
│   ├── pagamentos/ [CriarPedidoForm, DashboardReceitas, ...]
│   ├── acesso/ [QRGenerator, ...]
│   └── dashboard/ [DashboardCharts, Stats, ...]
├── lib/
│   ├── safe2pay/ [client, webhook validator]
│   └── acesso/ [qr-validator, jwt utils]
└── ... (styles, utils, etc)
```

### Documentation
```
📖 SPRINT_1_STATUS_FINAL.md (delivered)
📖 SPRINT_2_PLANEJAMENTO.md (detailed spec)
📖 RUNNING_GUIDES.md (how to run locally)
📖 DEPLOYMENT.md (how to deploy)
📖 API_DOCS.md (endpoint reference)
📖 TROUBLESHOOTING.md (common issues)
```

### Infrastructure
```
✅ Database schema (frequencia table)
✅ Environment variables (.env.local)
✅ Vercel deployment (auto-deploy on push)
✅ GitHub Actions (CI/CD pipeline)
✅ Monitoring (error logs in Sentry)
```

---

## 🚀 Launch Sequence (12/03/2026)

```
Wednesday, March 12, 2026
───────────────────────────────────────────

06:00 - Luiz wakes up, checks servers
        All systems green? → continue
        Issues? → rollback to 01/03

08:00 - Dev 1 + Dev 2 awake + on Slack
        Ready for live support? Confirm!

09:00 - Daily standup (quick!)
        LastInvokedCommand: vercel --prod
        → Deployment initiated
        ETA: 10 minutes
        
09:15 - Vercel shows: ✅ DEPLOYED
        curl https://titan.smaartpro.com
        → Status 200, homepage loads
        
09:30 - Team smoke tests:
        ✅ Login works
        ✅ Dashboard loads
        ✅ Create payment works
        ✅ Generate QR works
        ✅ Webhook receives test
        
10:00 - 📢 Announce #launch-live on Slack
        Monitoring: error logs, performance
        Support ready for 24/7 calls
        
12:00 - First real users register
        Monitor: metrics dashboard
        Issues? Quick hotfix + re-deploy
        
18:00 - Day 1 summary
        ✅ 50+ athletes registered
        ✅ 20+ payments processed
        ✅ 100+ attendances logged
        ✅ ZERO critical errors
        
23:59 - End of MVP launch day
        ✅ SUCCESS! 🎉

────────────────────────────────────────────
POST-LAUNCH (Next Sprint):
  • Performance optimization
  • Mobile app development
  • Additional federation features
  • Competitor integrations
```

---

**Plan Version**: 1.0  
**Created**: 18/02/2026  
**Last Updated**: 18/02/2026  
**Confidentiality**: SMAART PRO Internal Only

