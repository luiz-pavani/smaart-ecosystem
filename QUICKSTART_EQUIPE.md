# ⚡ QUICK START - PARA A EQUIPE


**TL;DR:** Pilar fundamental (cadastro compartilhável) está ✅ PRONTO E LIVE. PRóximos 2 weeks: Pagamentos (Dev 1) + QR Acesso (Dev 2) em paralelo.

---

## 📱 TESTAR AGORA (3 MINUTOS)

### Desktop:
1. Abra: https://titan.smaartpro.com/registro/LRSJ
2. Preencha:
   - Nome: "Seu Nome"
   - Email: "seu-email@test.com"
   - Graduação: Escolha uma
3. Clique "Registrar"
4. ✅ Vejo "Cadastro realizado com sucesso!"

### Mobile (com QR):
1. Abra: https://titan.smaartpro.com/compartilhar-registro (logado)
2. Aponte câmera pro QR code na tela
3. Toque no link
4. Registre um novo atleta
5. ✅ Sucesso

---

## 🛠️ ALOCAR DEVS AGORA

### Dev 1: **SPRINT 1A - Pagamentos**
**Tempo:** 60 horas (1 semana)
**Começa:** Seg 18/02 09:00
**Leia:** [SPRINT_1_PAGAMENTOS.md](../SPRINT_1_PAGAMENTOS.md)

**O quê fazer:**
```sql
-- 1. Criar 3 tabelas no Supabase
   - pedidos (Safe2Pay orders)
   - webhooks_log (payment status)
   - inadimplencia_eventos (late payment tracking)

-- 2. Criar 3 endpoints (copy/paste do doc)
   POST /api/pagamentos/criar
   POST /api/webhooks/safe2pay
   GET /api/pagamentos/listar

-- 3. Integrar Safe2Pay SDK
   npm install safe2pay

-- 4. Testar com sandbox

-- 5. Deploy segunda fase
```

**Done:** Atleta registra → Sistema cobra automaticamente mês 1

---

### Dev 2: **SPRINT 1B - QR Acesso (PARALELO)**
**Tempo:** 70 horas (1-2 semanas)
**Começa:** Qua 19/02 09:00
**Leia:** [SPRINT_2_ACESSO_QR.md](../SPRINT_2_ACESSO_QR.md)

**O quê fazer:**
```javascript
// 1. Criar 2 tabelas no Supabase
   - frequencia (check-in logs)
   - sessoes_qr (JWT tokens para QR)

// 2. Criar 2 endpoints
   GET /api/acesso/gerar-qr → gera QR JWT
   POST /api/checkin → valida QR, registra entrada

// 3. Criar 2 componentes React
   <QRGenerator /> → mostra QR do aluno
   <QRScanner /> → portaria escaneia entrada

// 4. Deploy página
   GET /modulo-acesso → meu QR + histórico

// 5. Testar scanner
```

**Done:** Aluno tem QR pessoal → Portaria scaneia → Frequência automática

---

## 🎯 PRÓXIMAS MILESTONES

```
📅 SEM 1 (18-22 fev): Pilar + Start Pagamentos
   Mon 18: ✅ PILAR PRONTO + reunião aloc devs
   Tue 19: Dev 1 criando schema pagamentos
   Wed 20: Dev 2 criando schema QR
   Thu 21: Dev 1 endpoint /criar-pagamento
   Fri 22: Dev 2 endpoint /gerar-qr

📅 SEM 2 (25-01 mar): Webhooks + Scanner
   Mon 25: Dev 1 webhook Safe2Pay
   Tue 26: Dev 2 QR Scanner functional
   Wed 27: Dev 1 cron inadimplência
   Thu 28: Dev 2 Dashboard frequência
   Fri 01: Testes + hotfixes

📅 SEM 3 (04-08 mar): Polish + Deploy
   Mon 04: Integration testing (ambos juntos)
   Tue 05: Performance optimization
   Wed 06: Security audit (RLS final check)
   Thu 07: Staging deploy
   Fri 08: Produção GO-LIVE

📅 SEM 4 (11-15 mar): Fase 1 Completa
   Mon 11: Suportar LRSJ piloto
   Tue-Fri: Monitor + bugs + refinements
   RESULT: 🚀 MVP 100% funcional
```

---

## 🚦 STATUS DASHBOARD

```
🟢 ESTADO ATUAL (18/02/2026 16:00)

┌─────────────────────────────────────┐
│ PILAR FUNDAMENTAL - CADASTRO        │
│ Status: ✅ LIVE EM PRODUÇÃO         │
│ Público: https://titan.../registro  │
│ Gestores: /compartilhar-registro    │
│ QR Code: Funcionando                │
│ DB: Inserindo atletas               │
│ Deploy: 🟢 Production               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ SPRINT 1A - PAGAMENTOS              │
│ Status: ⏳ DESIGN PRONTO             │
│ Responsável: Dev 1                  │
│ Começa: Segunda 18/02               │
│ Safe2Pay: 🟡 KEY NEEDED             │
│ Tempo: 60h (1 semana)               │
│ Deadline: 25/02/2026                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ SPRINT 1B - QR ACESSO               │
│ Status: ⏳ DESIGN PRONTO             │
│ Responsável: Dev 2                  │
│ Começa: Quarta 19/02                │
│ Catraca Hardware: 🟡 SPECIFICATION  │
│ Tempo: 70h (1-2 semanas)            │
│ Deadline: 04/03/2026                │
└─────────────────────────────────────┘

🎯 OBJETIVO FINAL: MVP 100% em 12/03/2026
```

---

## 🔑 BLOCKERS A RESOLVER HOJE

**YOU NEED TO DO:**

1. **Safe2Pay API Key** (_Até 17h hoje_)
   - Contato: Finance/CFO
   - Use: sales_xxxxx + secret_xxxxx
   - Type: Insira em `.env.local`
   - Doc: [SPRINT_1_PAGAMENTOS.md](../SPRINT_1_PAGAMENTOS.md#setup-safe2pay)

2. **Firebase Cloud Messaging** (_Até amanhã_)
   - Ir: https://console.firebase.google.com
   - Criar novo projeto
   - Habilitar "Cloud Messaging"
   - Copy credenciais → `.env.local`
   - Doc: [Firebase Setup](../DEPLOYMENT.md#firebase-setup)

3. **Hardware Catraca** (_Esta semana_)
   - Decida: Tablet Android dedikado? Ou scanner BLE?
   - Budget: ~R$ 1.500-3.000
   - Dev 2 depende dessa decisão
   - Doc: Seção "Hardware" em [SPRINT_2_ACESSO_QR.md](../SPRINT_2_ACESSO_QR.md)

4. **LRSJ Notification** (_Segunda morning_)
   - Email: "Seu link de registro está pronto!"
   - Include: https://titan.smaartpro.com/registro/LRSJ
   - CC: Dev team (feedback)

---

## 💻 COMEÇAR CODING (SEGUNDA 09:00)

### Dev 1 (Pagamentos):
```bash
cd apps/titan

# Clone branches
git fetch origin
git checkout -b feat/sprint-1a-pagamentos origin/main

# Copy SQL from SPRINT_1_PAGAMENTOS.md
# Paste in Supabase → SQL Editor → Run

# Create folder structure
mkdir -p app/api/pagamentos
mkdir -p app/api/webhooks/safe2pay
mkdir -p lib/integrations

# Don't run npm install yet - wait for Safe2Pay key
# Then: npm install safe2pay

# Start building from the code snippets in the doc
npm run dev
```

### Dev 2 (QR Acesso):
```bash
cd apps/titan

# Clone branches
git fetch origin
git checkout -b feat/sprint-1b-qr-acesso origin/main

# Copy SQL from SPRINT_2_ACESSO_QR.md
# Paste in Supabase → SQL Editor → Run

# Create folder structure
mkdir -p app/api/acesso
mkdir -p components/acesso
mkdir -p app/\(dashboard\)/modulo-acesso

# Install dependencies (No hardware needed for MVP)
npm install qr-scanner
npm install jsonwebtoken

# Start building
npm run dev
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

| Doc | Uso |
|-----|-----|
| [SPRINT_1_PAGAMENTOS.md](../SPRINT_1_PAGAMENTOS.md) | Dev 1 - Copy/paste schema + endpoints |
| [SPRINT_2_ACESSO_QR.md](../SPRINT_2_ACESSO_QR.md) | Dev 2 - Copy/paste schema + endpoints |
| [PROXIMOS_PASSOS_SPRINT.md](./PROXIMOS_PASSOS_SPRINT.md) | General roadmap + milestones |
| [CHECKLIST_VALIDACAO_FINAL.md](./CHECKLIST_VALIDACAO_FINAL.md) | QA testing guide |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Vercel + infra setup |

---

## 🎬 REUNIÃO SEGUNDA (OBRIGATÓRIO)

**Hora:** 09:00  
**Duração:** 30 min  
**Agenda:**

```
[ ] 05 min: Aceitar decisões das 5 perguntas? (Pagamentos paralelo, Safe2Pay, Firebase, etc)
[ ] 05 min: Dev 1 recebe task: Sprint 1A
[ ] 05 min: Dev 2 recebe task: Sprint 1B
[ ] 10 min: Q&A sobre documentação
[ ] 05 min: Resolver blockers (Safe2Pay key?, Hardware?, Firebase?)
```

---

## ✅ CHECKLIST ANTES DE SEGUNDA

- [ ] Safe2Pay API key obtido (ou processo iniciado)
- [ ] Firebase account criado
- [ ] Dev 1 leu SPRINT_1_PAGAMENTOS.md
- [ ] Dev 2 leu SPRINT_2_ACESSO_QR.md
- [ ] Todos testaram /registro/LRSJ
- [ ] Todos testaram /compartilhar-registro
- [ ] Todos têm acesso ao Supabase
- [ ] Git branches setup (dev-main pronto)
- [ ] .env.local completado com keys

---

## 🚀 GO/NO-GO DECISION

**Pronto para começar Sprints segunda?**

```
Pré-requisitos:
  ✅ Pilar Fundamental live
  ✅ Design docs completos
  ✅ DB schema pronto
  ⏳ Safe2Pay key
  ⏳ Firebase setup
  ✅ Dev 1 + Dev 2 alocados
  ✅ Milestones alinhadas

🟢 GO/NOT-GO: _________________

Se GO → começamos segunda às 09:00
Se NOT-GO → fale antes de sexta
```

---

## 📞 SUPORTE

**Dúvida técnica?** → Slack #dev-titan + tag @dev  
**Bloqueador?** → Slack #devops-alerts + escalate  
**Feedback cadastro?** → Slack #product-feedback

---

**ÚLTIMA ATUALIZAÇÃO:** 18/02/2026 16:00  
**PRÓXIMA:** Segunda 18/02/2026 09:00  
**VERSION:** 1.0  
**STATUS:** 🟢 READY TO BUILD

