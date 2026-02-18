# 🚀 PRÓXIMOS PASSOS - DESENVOLVIMENTO PRÁTICO 

**Estado Atual:** ✅ Pilar Fundamental Implementado (18/02/2026)  
**Deploy:** https://titan.smaartpro.com  
**Status:** 🟢 PRONTO PARA PRÓXIMA FASE

---

## ✅ PILAR FUNDAMENTAL - COMPLETADO

### O que foi entregue:

**1. Página Pública de Registro** (`/registro/[academia]`)
- ✅ Acessível SEM login obrigatório
- ✅ Formulário mínimo (4 campos: nome, email, graduação, CPF opcional)
- ✅ Auto-insert automático em `atletas` table
- ✅ Metadata de self-service incluída
- ✅ Redireciona para login após sucesso

**2. Link + QR Code Compartilháveis**
- ✅ URL única por academia: `https://titan.smaartpro.com/registro/SIGLA`
- ✅ Exemplo: `https://titan.smaartpro.com/registro/LRSJ`
- ✅ QR Code gerado dinamicamente via `qrcode` library
- ✅ Suporta compartilhamento WhatsApp, Email, Share API

**3. Página de Compartilhamento para Gestores** (`/compartilhar-registro`)
- ✅ Dashboard para gestores/admins
- ✅ Copy-to-clipboard do link
- ✅ Botões de ação: WhatsApp, Email, Share, QR Code
- ✅ Stats de registros (placeholder para próxima iteração)

**4. Integração no Sidebar**
- ✅ Novo menu item: "Compartilhar Registro" (com ícone Share2)
- ✅ Posicionado entre Atletas e Eventos
- ✅ Visível apenas para gestores/admins

**5. Banco de Dados**
- ✅ Nenhuma migration necessária (reutiliza tabela `atletas`)
- ✅ Campo `metadata` JSONB para rastreamento
- ✅ Exemplo: `{ "registro_via": "self_service", "fonte": "link_compartilhado" }`

---

## 📊 IMPACTO IMEDIATO

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo de registroa | 30 min (presencial) | 2 min (self-service) |
| Barreiras | Login obrigatório, 50+ campos | Não login, 4 campos |
| Compartilhabilidade | ❌ Nenhuma | ✅ WhatsApp, Email, QR |
| Conversão esperada | 30% | 70%+ |

---

## 🎯 PRÓXIMAS FASES (ROADMAP DE DESENVOLVIMENTO)

### 🔴 **FASE 1A - PAGAMENTOS AUTOMÁTICOS** (Semana 1-2)

**Objetivo:** Cobrança automática com Safe2Pay + webhooks

#### SPRINT Detalhado:

```
Dia 1-2 (Segunda-Terça):
  [ ] Criar migrations SQL (pedidos, frequencia, sessoes_qr)
  [ ] Testar em staging
  [ ] Validação de schema

Dia 3-4 (Quarta-Quinta):
  [ ] Implementar POST /api/pagamentos/criar
  [ ] Integração Safe2Pay (checkout link)
  [ ] Error handling

Dia 5-6 (Sexta+):
  [ ] POST /api/webhooks/safe2pay (receive payment status)
  [ ] Auto-update de plan_status em academias
  [ ] Log em webhooks_log table

Dia 7 (Segunda semana):
  [ ] Cron job: POST /api/cron/processar-inadimplencia
  [ ] Notificações automáticas (3, 5, 15, 30 dias)
  [ ] Testes end-to-end
  [ ] Deploy staging
```

**Código Pronto em:** [SPRINT_1_PAGAMENTOS.md](../SPRINT_1_PAGAMENTOS.md)

**Tempo Estimado:** 60 horas (1 dev, 1 semana)

---

### 🔵 **FASE 1B - QR CODE + ACESSO** (Semana 2-3, PARALELO)

**Objetivo:** Sistema de controle de entrada via QR

#### SPRINT Detalhado:

```
Dia 1-2 (Quarta-Quinta, semana 1):
  [ ] Criar table: frequencia (entrada/saída)
  [ ] Criar table: sessoes_qr (QR tokens)
  [ ] Setup JWT secret em env vars

Dia 3-4 (Sexta+):
  [ ] GET /api/acesso/gerar-qr (JWT token + image)
  [ ] Componente QRGenerator.tsx
  [ ] Página /modulo-acesso (frontend aluno)

Dia 5-6 (Seg-Ter, semana 2):
  [ ] POST /api/checkin (validar QR + registrar entrada)
  [ ] Scanner com qr-scanner library
  [ ] Página /catraca (tablet mode)

Dia 7-8 (Qua-Qui, semana 2):
  [ ] GET /api/acesso/historico (últimos 30 dias)
  [ ] Dashboard de frequência
  [ ] Integração com plan_status (bloqueia se expirado)
```

**Código Pronto em:** [SPRINT_2_ACESSO_QR.md](../SPRINT_2_ACESSO_QR.md)

**Tempo Estimado:** 70 horas (1 dev, 1-2 semanas)

---

### 🟡 **PHASE 1C - INADIMPLÊNCIA AUTOMÁTICA** (Semana 3-4)

**Objetivo:** Retenção de alunos + suspensão automática

#### SPRINT:

```
Dia 1-2:
  [ ] POST /api/cron/processar-inadimplencia
  [ ] Query: pedidos pendentes vencidos
  [ ] Retry automático Safe2Pay

Dia 3-4:
  [ ] Firebase Cloud Messaging setup
  [ ] Notificação 3 dias antes
  [ ] Notificação 5 dias depois

Dia 5-6:
  [ ] Notificação 15+ dias: gestor alerta
  [ ] Suspensão automática 30+ dias (plan_status = 'suspended')
  [ ] Desbloqueio automático ao pagar

Dia 7:
  [ ] Testes com dados reais (LRSJ)
  [ ] Relatório de inadimplência
  [ ] Deploy produção
```

**Tempo Estimado:** 30 horas (distribuído)

---

## 📌 MILESTONES DA FASE 1

| Marco | Data | Status |
|------|------|--------|
| ✅ Pilar Fundamental (Cadastro) | 18/02 | DONE |
| 🔴 Pagamentos v1 | 25/02 | TODO |
| 🔵 QR Code v1 | 04/03 | TODO |
| 🟡 Inadimplência v1 | 11/03 | TODO |
| 🚀 Fase 1 Complete (MVP) | 12/03 | TARGET |

---

## 🎬 COMEÇAR AGORA - PASSO A PASSO

### **Opção A: Dev 1 → Pagamentos**

```bash
# Dia 1 (segunda às 09:00)
cd apps/titan

# 1. Criar branch
git checkout -b feat/sprint-1a-pagamentos

# 2. Aplicar migrations SQL (do documento SPRINT_1_PAGAMENTOS.md)
# Copiar SQL completo para Supabase → SQL Editor → Executar

# 3. Criar pasta de endpoints
mkdir -p app/api/pagamentos
mkdir -p app/api/webhooks/safe2pay
mkdir -p app/api/cron

# 4. Começar código do endpoint /api/pagamentos/criar
# (Usar código pronto de SPRINT_1_PAGAMENTOS.md)

# 5. Testar localmente
npm run dev

# 6. Fazer commit
git add -A && git commit -m "feat: sprint 1a - pagamentos basico"
git push origin feat/sprint-1a-pagamentos
```

### **Opção B: Dev 2 → QR Code + Acesso**

```bash
# Dia 1 (segunda às 09:00)
cd apps/titan

# 1. Criar branch
git checkout -b feat/sprint-1b-qr-acesso

# 2. Aplicar migrations SQL (frequencia, sessoes_qr)
# (Supabase → SQL Editor)

# 3. Criar estruturas
mkdir -p app/api/acesso
mkdir -p components/qrcode
mkdir -p app/(dashboard)/modulo-acesso

# 4. Começar endpoint /api/acesso/gerar-qr
# (Usar código pronto de SPRINT_2_ACESSO_QR.md)

# 5. Começar componente QRGenerator
# (Usar code from SPRINT_2_ACESSO_QR.md - line 200+)

# 6. Testar
npm run dev

# 7. Commit
git add -A && git commit -m "feat: sprint 1b - qr code basico"
git push origin feat/sprint-1b-qr-acesso
```

---

## 📋 DETALHES TÉCNICOS POR SPRINT

### SPRINT 1A - Arquivo: **SPRINT_1_PAGAMENTOS.md**

No documento você tem:
- ✅ Schema SQL (3 tabelas + RLS)
- ✅ 4 endpoints API (request/response completos)
- ✅ Código TypeScript copiar/colar
- ✅ Configuração Safe2Pay
- ✅ Checklist de 10 items

**Leitura:** 30 min  
**Implementação:** 40-50 horas  
**Testing:** 5-10 horas  

---

### SPRINT 1B - Arquivo: **SPRINT_2_ACESSO_QR.md**

No documento você tem:
- ✅ Schema SQL (3 tabelas + RLS)
- ✅ 3 endpoints API (GET/POST completos)
- ✅ 2 React components (QRGenerator, QRScanner)
- ✅ Código TypeScript pronto
- ✅ Checklist de 12 items

**Leitura:** 40 min  
**Implementação:** 50-60 horas  
**Testing:** 5-10 horas

---

## 🔌 DEPENDÊNCIAS E BLOCADORES

### ✅ Resolvidos:
- Cadastro de atletas (PRONTO)
- Database schema (PRONTO)
- Autenticação (PRONTO)
- RLS policies (PRONTO)

### ⏳ Bloqueadores (você resolver):

1. **Safe2Pay API Key**
   - Onde pedir? Finance/CFO
   - Formato? sale_****** + secret_******
   - Teste? https://safe2pay.com.br/sandbox

2. **Firebase Setup**
   - Criar project em https://console.firebase.google.com
   - Habilitar Cloud Messaging
   - Copiar credenciais para .env.local

3. **NEXT_PUBLIC_URL**
   - Dev: http://localhost:3000
   - Prod: https://titan.smaartpro.com

4. **QR_SECRET_KEY**
   - Gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 🎯 PRÓXIMAS FASES (Março-Abril)

Depois de Fase 1 (MVP) completa:

### **FASE 2** (Semana 5-8): Dashboards + Agendamento
- KPIs em tempo real (taxa renovação, churn, receita)
- Agendamento de aulas (CRUD + reserva + waitlist)
- Fichas de treino (exercícios + video + tracking)

### **FASE 3** (Semana 9-12): IA + Scale
- Firebase Cloud Messaging (push notifications)
- ML Churn prediction
- Multiunidades (federação admin)
- Self-service portal

---

## 📞 CONTATO & DÚVIDAS

Qualquer bloqueador:
- Técnico: GitHub issue + tag no PR
- Decisões de prioridade: Slack #dev-titan
- Deploy/Infra: Slack #devops-alerts

---

## ✅ PRÓXIMA REUNIÃO

**Data:** Segunda 18/02 às 09:00  
**Agenda:**
1. ✅ Validar decisões de 5 perguntas
2. ✅ Review do Pilar Fundamental (cadastro)
3. 🔴 Revisar SPRINT_1A e SPRINT_1B
4. 🔴 Alocar devs e começar coding

---

**VERSION:** 1.0 | **CREATED:** 18/02/2026  
**STATUS:** 🟢 READY FOR SPRINT  
**NEXT:** Dev team comeca segunda as 09:00

