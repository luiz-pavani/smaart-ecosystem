# 🚀 TITAN 2026 - PLANO EXECUTIVO (RESUMO)

**Criado em:** 17 de Fevereiro de 2026  
**Status:** ✅ Planejamento Completo  
**Próximo Passo:** Validar Prioridades com Stakeholders

---

## 📌 VISÃO GERAL

O Titan está evoluindo de um **dashboard básico** para uma **plataforma completa de gestão de academias de judo e jiu-jitsu**, com dois pilares:

1. **GESTOR** (Admin/Controle)
   - Pagamentos automáticos
   - Controle de acesso (QR + Frequência)
   - Dashboards de KPIs
   - Agendamento de aulas

2. **ALUNO** (Engagement)
   - QR para entrar
   - Histórico de frequência
   - Fichas de treino personalizadas
   - Reserva de aulas
   - Notificações automáticas

---

## 📊 ROADMAP EM 3 FASES

### 🟢 FASE 1 (Semanas 1-4): MVP Financeiro + Acesso
**Entrega:** Academias conseguem cobrar e controlar entrada

- **Semana 1-2:** Sistema de Pagamentos
  - Integração Safe2Pay com webhooks automáticos
  - Atualização de status em tempo real
  - Histórico de transações

- **Semana 2-3:** QR Code + Controle de Acesso
  - Geração de QR único por aluno (24h válido)
  - Scanner para catraca/tablet
  - Registro automático de frequência
  - Dashboard de presença

- **Semana 3-4:** Inadimplência
  - Notificações automáticas (3, 5, 15, 30 dias)
  - Suspensão automática de acesso
  - Retenção de alunos em risco

### 🟡 FASE 2 (Semanas 5-8): Dashboards + Agendamento
**Entrega:** Visibilidade total + experiência melhorada

- **Semana 5-6:** Dashboards de Indicadores
  - Taxa de renovação em tempo real
  - Churn rate (cancelamentos)
  - Receita vs. Target
  - Horários de pico (heatmap)
  - Aulas mais populares

- **Semana 6-7:** Agendamento de Aulas
  - CRUD de turmas
  - Aluno reserva vagas
  - Confirmação automática
  - Waitlist automático

- **Semana 7-8:** Fichas de Treino
  - Professor cria fichas
  - Aluno acompanha evolução
  - Histórico de cargas/séries

### 🔵 FASE 3 (Semanas 9-12): Comunicação + IA + Scale
**Entrega:** Retenção automática + Multiunidades

- **Semana 9:** Notificações (Push, Email, SMS)
- **Semana 10-11:** IA (Churn prediction, Recomendações)
- **Semana 11-12:** Gestão Multiunidades

---

## 💻 TECH STACK

**Já em Produção:**
- ✅ Next.js 16 + React 19
- ✅ Supabase + PostgreSQL
- ✅ Tailwind CSS 4
- ✅ Vercel Deployment

**A Integrar (Fase 1-2):**
- ⏳ Safe2Pay (Pagamentos)
- ⏳ Firebase Cloud Messaging (Notificações)
- ⏳ QR Code Library
- ⏳ Recharts (Gráficos)

**A Integrar (Fase 3):**
- ⏳ OpenAI (IA/Mensagens)
- ⏳ OneSignal (Notificações avançadas)
- ⏳ PostgreSQL Vectors (Recomendações)

---

## 📊 DATABASE - NOVAS TABELAS

```
Fase 1:
├── pedidos (status, valor, safe2pay_id)
├── webhooks_log (auditoria de integrações)
├── inadimplencia_eventos (histórico de cobrança)
├── frequencia (entrada/saída de alunos)
└── sessoes_qr (QR tokens com validade)

Fase 2:
├── aulas (agendamento, turmas)
├── reservas_aula (booking de vagas)
├── fichas_treino (workout plans)
└── exercicios (database de exercícios)

Fase 3:
├── notificacoes_eventos (triggers de envio)
├── ai_churn_scores (modelo de predição)
└── user_devices (FCM tokens para push)
```

---

## 🎯 PRIORIDADES IMEDIATAS (Próximos 7 Dias)

### ✅ Concluído Até Ontem
- [x] Deploy Beta 16 em produção
- [x] Fix de permissões (role-based hierarchy)
- [x] Dados de anuidade + país carregados
- [x] UI de academias com status

### 🔴 DEVE FAZER ESTA SEMANA
- [ ] Criar branches para Fase 1
- [ ] Implementar migrations SQL (pedidos, frequencia)
- [ ] Endpoint `/api/pagamentos/criar`
- [ ] Endpoint `/api/webhooks/safe2pay`
- [ ] Endpoint `/api/checkin` (QR validation)
- [ ] Componente `QRGenerator` e `QRScanner`
- [ ] Testes unitários

### 📋 BLOQUEADORES / DECISÕES PENDENTES

1. **Prioridade:** Pagamentos primeiro ou Acesso?
   - **Sugestão:** Ambos em paralelo (2 devs / semana cada)

2. **Safe2Pay:** Continuar com integração atual ou migrar para PagSeguro?
   - **Sugestão:** Manter Safe2Pay (já funciona)

3. **Notificações:** Firebase ou OneSignal?
   - **Sugestão:** Firebase (mais barato, integra com app)

4. **Catraca:** Hardware específico (Topaz? TechniS?) ou tablet Android?
   - **Sugestão:** Começar com tablet; hardware vem depois

5. **Multiunidades:** Essencial na Fase 1 ou pode ser Fase 3?
   - **Sugestão:** Fase 3; Fase 1 focar em single academy

---

## 💰 ESTIMATIVA

### Horas por Fase
- **Fase 1:** ~160h (6-8 semanas, 1-2 devs)
- **Fase 2:** ~120h (4-6 semanas, 1-2 devs)
- **Fase 3:** ~80h (3-4 semanas, 1 dev)
- **Total:** ~360h (~3-4 meses com team pequeno)

### Timeline Ideal
- **Março:** Fase 1 (Pagamentos + Acesso)
- **Abril:** Fase 2 (Dashboards + Agendamento)
- **Maio:** Fase 3 (Comunicação + IA)
- **Junho:** Polishes + Deploy v1.0 Final

---

## 📁 DOCUMENTAÇÃO CRIADA

Todos os arquivos estão em: `/smaart-ecosystem/`

1. **[ROADMAP_2026_TITAN.md](./ROADMAP_2026_TITAN.md)** ← Start here
   - Visão completa das 3 fases
   - Arquitetura geral
   - Tech stack
   - Estrutura de pastas proposta

2. **[SPRINT_1_PAGAMENTOS.md](./SPRINT_1_PAGAMENTOS.md)**
   - Schema SQL detalhado
   - Endpoints API com exemplos
   - Fluxo de webhooks
   - Cron jobs para inadimplência

3. **[SPRINT_2_ACESSO_QR.md](./SPRINT_2_ACESSO_QR.md)**
   - Arquitetura de QR Code
   - Endpoints de checkin
   - Componentes React
   - Integração com catraca

---

## 🚦 PRÓXIM PASSOS - POR ORDEM

### Hoje (17/02):
1. ✅ Validar este plano com stakeholders
2. ✅ Decidir Prioridade: Pagamentos ou Acesso?
3. ✅ Alocar recursos (devs, horas)

### Amanhã (18/02):
1. Criar branch `feat/sistema-pagamentos`
2. Setup das migrations SQL
3. Iniciar dev de `/api/pagamentos/criar`

### Semana que vem (25/02):
1. Deploy de Fase 1 em staging
2. Testes com academia piloto
3. Feedback e ajustes

---

## 📞 PERGUNTAS PARA DECIDIR

1. **Qual é a urgência?**
   - Precisa de pagamentos automáticos antes de maioc?
   - Catraca é crítica para controle de acesso?

2. **Qual é o budget?**
   - Quanto pode investir em dev?
   - Quanto pode gastar em ferramentas (Firebase, OneSignal, etc)?

3. **Qual é o escopo de rollout?**
   - Começa com 1 academia (LRSJ) ou todas as 29?
   - Multiunidades (LRSJ + federação São Paulo) é essencial já?

4. **Qual é a métrica de sucesso?**
   - Taxa de cobrança (90%+ de sucesso)?
   - Taxa de frequência (70%+ presença)?
   - NPS (Net Promoter Score)?

---

**📧 Próxima Ação:** Agendar reunião com produto/stakeholders para validação e ajustes.

---

*Versão: 1.0 | Status: ✅ Ready for Review | Owner: Dev Team*
