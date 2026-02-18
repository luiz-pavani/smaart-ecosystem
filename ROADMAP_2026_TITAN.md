# 🥋 ROADMAP TITAN 2026 - Plataforma de Gestão de Academias

**Status Atual:** Beta 16 | **Versão:** 0.15.0  
**Data:** Fevereiro 2026 | **Última Atualização:** Deploy permissões

---

## 📊 ESTADO ATUAL DO PROJETO

### ✅ Funcionalidades Implementadas
- **Gestão de Federações**: CRUD completo com RLS policies
- **Gestão de Academias**: Cadastro, edição, lista; integração com países (Brasil/Uruguai)
- **Gestão de Atletas**: Cadastro simplificado, lista otimizada, CSV import
- **Controle de Permissões**: Hierarquia de roles (Master → Atleta), edit/delete de permissões
- **Anuidade 2026**: Status (Active/Expired), datas de vencimento, método de pagamento
- **Dashboard**: Stats básicos, acesso seguro por role
- **Autenticação**: Supabase Auth com roles e RLS
- **Versioning**: Sistema de versões (Beta 16 = 0.15.0)

### ❌ Funcionalidades Críticas Faltantes

#### **PILAR 1: Gestão Financeira** (URGENTE)
- [ ] Sistema de Pagamentos (integração Safe2Pay/PagSeguro)
- [ ] Cobrança Automática (boleto, PIX, cartão)
- [ ] Gestão de Inadimplência (notificações, suspensão automática)
- [ ] Emissão de Notas Fiscais
- [ ] Relatórios Financeiros (receita, inadimplência, MRR)
- [ ] Histórico de Transações

#### **PILAR 2: Controle de Acesso** (ALTA PRIORIDADE)
- [ ] Catraca Digital / Controle de Entrada
- [ ] QR Code de Acesso (geração + validação)
- [ ] Biometria (opcional, integração com hardware)
- [ ] Validação Automática (verifica se plano está ativo)
- [ ] Registro de Frequência (presença em tempo real)

#### **PILAR 3: Dashboards & Indicadores** (ALTA PRIORIDADE)
- [ ] Dashboard do Gestor (KPIs em tempo real)
- [ ] Taxa de Renovação
- [ ] Frequência Média por Horário
- [ ] Aulas Populares (lotação)
- [ ] Churn Rate (cancelamentos)
- [ ] Receita Mensal vs. Target

#### **PILAR 4: Gestão de Planos** (MÉDIA PRIORIDADE)
- [ ] Planos Customizáveis (básico, premium, vip)
- [ ] Renovação Digital (1-click, automática)
- [ ] Congelamento de Plano (fidelização)
- [ ] Cancelamento com Motivo
- [ ] Trials e Promoções

#### **PILAR 5: Agendamento de Aulas** (MÉDIA PRIORIDADE)
- [ ] Calendário de Aulas
- [ ] Reserva de Vagas (com limite)
- [ ] Notificação de Confirmação
- [ ] Sistema de Waitlist
- [ ] Integração Wellhub/TotalPass (evitar superlotação)

#### **PILAR 6: Fichas de Treino** (MÉDIA PRIORIDADE)
- [ ] Criação de Fichas (por professor)
- [ ] Exercícios com Vídeos
- [ ] Acompanhamento de Evolução (séries/cargas)
- [ ] Histórico de Treinos Realizados
- [ ] Feedback Automático (IA)

#### **PILAR 7: Comunicação** (MÉDIA PRIORIDADE)
- [ ] Push Notifications
- [ ] Avisos de Renovação
- [ ] Lembretes de Aula
- [ ] Promoções e Campanhas
- [ ] SMS (opcional)

#### **PILAR 8: Comunidade/Social** (BAIXA PRIORIDADE)
- [ ] Feed da Academia (conquistas, rankings)
- [ ] Moderação de Conteúdo
- [ ] Desafios entre Alunos
- [ ] Badges e Gamification

#### **PILAR 9: IA & Automação** (BAIXA PRIORIDADE)
- [ ] Mensagens Automáticas (retenção)
- [ ] Personalização de Treinos
- [ ] Previsão de Churn
- [ ] Recomendações de Planos

#### **PILAR 10: Gestão Multiunidades** (BAIXA PRIORIDADE)
- [ ] Painel Centralizado
- [ ] Relatórios Consolidados
- [ ] Gestão de Permissões por Unidade
- [ ] Transferência entre Unidades

---

## 🚀 ROADMAP PRIORIZADO (3 FASES)

### **FASE 1 (SEMANAS 1-4): MVP Financeiro + Acesso**
**Objetivo:** Core de gestão operacional funcionando

1. **Sistema de Pagamentos** (Semana 1-2)
   - Integração Safe2Pay API
   - Webhooks para status de pagamento
   - Atualização automática de planos (Active/Expired)
   - Histórico de transações

2. **Controle de Acesso** (Semana 2-3)
   - Geração de QR Code por aluno
   - Scanner QR (app mobile + web)
   - Validação de acesso em tempo real
   - Registro de frequência

3. **Inadimplência** (Semana 3-4)
   - Notificações automáticas (3 dias antes vencimento)
   - Automação de cobrança (5, 15, 30 dias)
   - Suspensão automática (semanal, verificação de acesso)
   - Relatório de inadimplência para gestor

**Saída:** Academias podem cobrar e controlar quem entra.

---

### **FASE 2 (SEMANAS 5-8): Dashboards + Agendamento**
**Objetivo:** Visibilidade total + experiência de usuário melhorada

1. **Dashboards de Indicadores** (Semana 5-6)
   - KPIs em cards (renovação %, churn, receita, frequência)
   - Gráficos de receita vs. target
   - Horários de pico (heatmap)
   - Aulas mais populares (ranking)
   - Alertas automáticos (ex: "60% de ocupação em aulas matutinas")

2. **Agendamento de Aulas** (Semana 6-7)
   - CRUD de aulas (professor, horário, local, limite de vagas)
   - Calendário interativo (aluno reserves vagas)
   - Confirmação automática (notificação)
   - Cancelamento com 24h de antecedência
   - Waitlist automático

3. **Fichas de Treino** (Semana 7-8)
   - Interface para professor criar fichas
   - Exercícios com descrição + vídeo (YouTube embeds)
   - Aluno visualiza e marca como "completo"
   - Histórico de evolução (cargas, séries)

**Saída:** Gestores têm visibilidade de operações; alunos podem se auto-organizar.

---

### **FASE 3 (SEMANAS 9-12): Comunicação + IA + Multiunidades**
**Objetivo:** Retenção e escalabilidade

1. **Sistema de Notificações** (Semana 9)
   - Push notifications via Firebase/OneSignal
   - Avisos de renovação (15, 7, 1 dia antes)
   - Lembretes de aula agendada
   - Promoções e campanhas
   - SMS (Twilio, opcional)

2. **IA & Automação** (Semana 10-11)
   - Análise preditiva (churn score por aluno)
   - Mensagens automáticas personalizadas (recuperação de risco)
   - Recomendações de planos baseadas em frequência
   - Feedback automático em fichas de treino

3. **Gestão Multiunidades** (Semana 11-12)
   - Dashboard consolidado
   - Relatórios por unidade
   - Permissões por filial
   - Sincronização de dados em tempo real

**Saída:** Plataforma pronta for scale; economia de tempo em retenção; visão única para redes.

---

## 🏗️ ARQUITETURA PROPOSTA

### **Stack Atual**
```
Frontend: Next.js 16 + React 19 + Tailwind
Backend: Next.js API Routes + Edge Functions
Database: Supabase (PostgreSQL) + RLS
Auth: Supabase Auth
Deployment: Vercel
```

### **Tecnologias a Adicionar**

#### **Pagamentos**
- Safe2Pay SDK (já integrado em anuidade, expandir)
- Webhook listeners (PostgreSQL triggers para automação)

#### **QR Code & Acesso**
- `qrcode` library (já está no package.json)
- Camera API (web para mobile)
- Supabase Storage (para salvar QR PNG)

#### **Notificações**
- Firebase Cloud Messaging (FCM)
- OneSignal (alternativa com melhor dashboard)
- Twilio (SMS opcional)

#### **IA**
- OpenAI API (análise de churn, geração de mensagens)
- Supabase Vector (embeddings para recomendações)

#### **Gráficos/Dashboards**
- Recharts ou Chart.js (já usamos Tailwind, adicionar gráficos)
- ApexCharts (alternativa com mais tipos de gráfico)

#### **Agendamento**
- react-big-calendar (calendário interativo)
- ou ical.js (compatibilidade com Google Calendar)

---

## 📋 PRIORIDADEs IMEDIATAS (PRÓXIMOS 7 DIAS)

### **Sprint Inicial (MVP)**

#### **1. Infraestrutura de Pagamentos** ⚙️
- [ ] Configurar webhooks Safe2Pay no Supabase
- [ ] Criar função PostgreSQL para processar webhooks
- [ ] Atualizar status de plano automaticamente
- [ ] Apensar código em `app/api/webhooks/safe2pay`

#### **2. QR Code & Acesso** 🔐
- [ ] Criar página `/checkin` com scanner QR
- [ ] Adicionar endpoint `POST /api/checkin` (valida plano + gera log)
- [ ] Tabela `frequencia` em Supabase (user_id, data, status)
- [ ] Dashboard `/modulo-acesso` para gestor

#### **3. Notificações básicas** 📲
- [ ] Integrar Firebase Cloud Messaging
- [ ] Criar job para notificações de vencimento (cron job)
- [ ] Enviar notificação ao aluno 3 dias antes de vencer

#### **4. Melhorias no Dashboard** 📊
- [ ] Adicionar gráfico de receita (Chart.js ou Recharts)
- [ ] Card com "Taxa de Renovação"
- [ ] Card com "Alunos Inativos" (sem frequência em 30 dias)

---

## 📁 ESTRUTURA DE PASTAS (PROPOSTA)

```
apps/titan/
├── app/(dashboard)/
│   ├── dashboard/          # Dashboard principal (já existe)
│   ├── academias/          # Gestão de academias (já existe)
│   ├── atletas/            # Gestão de atletas (já existe)
│   ├── pagamentos/         # ✨ NOVO: Gestão financeira
│   ├── acesso/             # ✨ NOVO: Controle de entrada/frequência
│   ├── agendamento/        # ✨ NOVO: Aulas e reservas
│   ├── fichas/             # ✨ NOVO: Fichas de treino
│   ├── notificacoes/       # ✨ NOVO: Campanhas
│   ├── relatorios/         # ✨ NOVO: Indicadores avançados
│   ├── admin/              # ✨ NOVO: AI + Automação
│   └── comunidade/         # ✨ NOVO: Social (fase 3)
├── app/api/
│   ├── pagamentos/         # Endpoints de pagamento
│   ├── checkin/            # QR code validation
│   ├── agendamento/        # Aulas e vagas
│   ├── notificacoes/       # Push, SMS, email
│   ├── webhooks/           # Safe2Pay webhooks
│   └── ai/                 # IA endpoints
├── components/
│   ├── forms/
│   │   ├── PagamentoForm.tsx              # ✨ NOVO
│   │   ├── AgendamentoForm.tsx            # ✨ NOVO
│   │   └── ...
│   ├── dashboards/
│   │   ├── DashboardGestor.tsx            # ✨ NOVO
│   │   ├── DashboardIndicadores.tsx       # ✨ NOVO
│   │   └── ...
│   ├── qrcode/              # ✨ NOVO
│   │   ├── QRGenerator.tsx
│   │   └── QRScanner.tsx
│   └── ...
├── lib/
│   ├── safe2pay.ts          # Safe2Pay client (expandido)
│   ├── firebase.ts          # ✨ NOVO Firebase config
│   ├── ai.ts                # ✨ NOVO OpenAI client
│   ├── notifications.ts     # ✨ NOVO
│   └── ...
├── hooks/
│   ├── usePagamentos.ts     # ✨ NOVO
│   ├── useAgendamento.ts    # ✨ NOVO
│   └── ...
├── scripts/
│   ├── cron-notificacoes.ts # ✨ NOVO Scheduled jobs
│   ├── sync-safe2pay.ts     # ✨ NOVO
│   └── ...
└── supabase/migrations/
    ├── 010_pagamentos.sql            # ✨ NOVO
    ├── 011_frequencia.sql            # ✨ NOVO
    ├── 012_agendamento_aulas.sql     # ✨ NOVO
    ├── 013_fichas_treino.sql         # ✨ NOVO
    └── ...
```

---

## 🎯 PRÓXMOS PASSOS (24h)

1. **Criar branch** `feat/pagamentos-v2` do main
2. **Documentar** esquema de pagamentos (tabelas + webhooks)
3. **Integração Safe2Pay** - endpoints e testes
4. **QR Code MVP** - páginas de checkIn + validação
5. **Enviar detalhado para validação com usuário**

---

## 📞 PERGUNTAS CHAVE

1. **Qual é a prioridade:** Pagamentos ou Acesso/Frequência?
2. **Safe2Pay ou outro processor?** (tem preferência de gateway?)
3. **Push Notifications:** Firebase ou OneSignal?
4. **Multiunidades é essencial?** (ou focamos em single academy first?)
5. **Quando precisa de IA:** Fase 2 ou fase 3?

---

**Versão:** 1.0 | **Criado:** 2026-02-17 | **Status:** Rascunho Executivo
