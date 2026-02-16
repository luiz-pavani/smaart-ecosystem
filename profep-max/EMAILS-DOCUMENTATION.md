# 📧 Sistema de Emails PROFEP MAX - Documentação Completa

## 📊 Visão Geral

Sistema completo de automação de emails com **9 tipos de emails** configurados usando **Resend** como provedor.

---

## ✅ Emails Ativos (6)

### 1. 🎉 Boas-Vindas
**Trigger**: Novo cadastro na plataforma  
**Arquivo**: `supabase/functions/send-welcome-email/index.ts`  
**Status**: ✅ Ativo (Webhook Supabase)  
**Quando**: Imediatamente após criação da conta  
**Conteúdo**:
- Mensagem de boas-vindas personalizada
- Próximos passos (completar perfil, explorar cursos)
- Botão CTA para começar

---

### 2. 💳 Confirmação de Pagamento (Federação)
**Trigger**: Webhook Safe2Pay (status 3 - Pago) com referência `FEDERATION:`  
**Arquivo**: `src/app/actions/email.ts` → `sendFederationPaymentConfirmation`  
**Status**: ✅ Ativo  
**Quando**: Pagamento de taxa de graduação confirmado  
**Conteúdo**:
- Confirmação do pagamento
- Detalhes da inscrição (federação, graduação pretendida)
- Próximos passos (enviar documentos)
- Dados do recibo

---

### 3. 💳 Confirmação de Pagamento (Profep MAX)
**Trigger**: Webhook Safe2Pay (status 3 - Pago) com referência `SUBSCRIPTION:`  
**Arquivo**: `src/app/actions/email.ts` → `sendProfepPaymentConfirmation`  
**Status**: ✅ Ativo  
**Quando**: Assinatura Profep MAX confirmada  
**Conteúdo**:
- Confirmação do plano contratado
- Valor e validade
- Acesso liberado aos cursos
- Botão para acessar plataforma

---

### 4. 📄 Notificação de Dossiê
**Trigger**: Admin aprova/rejeita dossiê ou envia mensagem  
**Arquivo**: `src/app/actions/notifications.ts` → `sendDossierNotification`  
**Status**: ✅ Ativo  
**Quando**: Admin interage com dossiê do candidato  
**Conteúdo**:
- Status (APROVADO / REJEITADO / Aviso)
- Mensagem personalizada do admin
- Orientações sobre próximos passos

---

### 5. 🎖️ Certificado Disponível
**Trigger**: Admin aprova candidato (status_inscricao = 'APROVADO')  
**Arquivo**: `src/app/actions/email-templates.ts` → `sendCertificateAvailableEmail`  
**Local**: `src/app/federation/[slug]/admin/page.tsx`  
**Status**: ✅ Ativo  
**Quando**: Candidato é aprovado no exame  
**Conteúdo**:
- Mensagem de parabéns pela aprovação
- Graduação conquistada em destaque
- Link para download do certificado
- Frase motivacional de Jigoro Kano

---

### 6. 🎯 Primeiro Acesso a Curso
**Trigger**: Primeira vez que aluno entra em um curso  
**Arquivo**: `src/app/actions/email-templates.ts` → `sendFirstCourseAccessEmail`  
**Local**: `src/app/(ava)/cursos/[id]/page.tsx`  
**Status**: ✅ Ativo  
**Quando**: Usuário abre curso pela primeira vez (sem progresso prévio)  
**Conteúdo**:
- Parabéns pela jornada iniciada
- Nome do curso em destaque
- Dicas de estudo (assistir em ordem, fazer anotações, revisar)
- Botão para continuar aprendendo

---

### 7. 🏆 Ranking Semanal (Top 5)
**Trigger**: Cron Job (sexta-feira 18h BRT)  
**Arquivo**: `supabase/functions/send-weekly-ranking/index.ts`  
**Status**: ✅ Deployed (aguardando configuração do cron)  
**Quando**: Toda sexta às 18h (horário de Brasília)  
**Destinatários**: Todos os usuários com `plano = 'ATIVO'`  
**Conteúdo**:
- Top 5 da semana com medalhas (🥇🥈🥉)
- Posição individual do usuário
- Pontuação atual
- Mensagem especial se estiver no Top 5
- Dicas de como subir no ranking
- Botões: Ver Ranking Completo + Fazer Uma Aula

**📋 Configuração Pendente**: Ver arquivo `CRON-RANKING-SETUP.md`

---

## 🔧 Emails Planejados (3)

### 8. ⚠️ Lembrete de Documentos Pendentes
**Trigger**: Cron Job (diário)  
**Lógica**: 3 dias após pagamento sem upload de documentos  
**Status**: 🔧 Pendente  
**Query SQL**:
```sql
SELECT * FROM entity_memberships
WHERE status_pagamento = 'CONFIRMADO'
  AND data_pagamento < NOW() - INTERVAL '3 days'
  AND status_inscricao IN ('PENDENTE', 'EM ANÁLISE')
  AND (documento_identidade_url IS NULL OR documento_graduacao_url IS NULL)
```

---

### 9. 📅 Lembrete de Evento Próximo
**Trigger**: Cron Job (diário às 9h)  
**Lógica**: 7 dias antes de evento do cronograma  
**Status**: 🔧 Pendente  
**Query SQL**:
```sql
SELECT * FROM entity_schedule
WHERE event_date BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'
  AND send_reminder = true
```

---

### 10. 🔔 Renovação de Plano
**Trigger**: Cron Job (diário às 8h)  
**Lógica**: 7 dias antes do vencimento  
**Status**: 🔧 Pendente  
**Query SQL**:
```sql
SELECT * FROM profiles
WHERE plano IN ('MENSAL', 'ANUAL')
  AND data_fim_plano BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'
```

---

## 🔑 Configuração

### Variáveis de Ambiente

```bash
RESEND_API_KEY=re_your_api_key_here
```

### Email Sender
```
PROFEP MAX <judo@profepmax.com.br>
```

### Domínio
- **Produção**: profepmax.com.br
- **Status DNS**: Configurado no Vercel (Hostinger email)
- **Verificação Resend**: ⚠️ Pendente

---

## 📂 Estrutura de Arquivos

```
src/app/actions/
├── email.ts                    # Emails de pagamento (2)
├── email-templates.ts          # Emails gerais (7)
└── notifications.ts            # Notificações de dossiê (1)

supabase/functions/
├── send-welcome-email/         # Boas-vindas ✅
│   └── index.ts
└── send-weekly-ranking/        # Ranking semanal ✅
    └── index.ts

src/app/api/webhooks/safe2pay/
└── route.ts                    # Webhook que chama emails de pagamento

src/app/federation/[slug]/admin/
└── page.tsx                    # Chama email de certificado

src/app/(ava)/cursos/[id]/
└── page.tsx                    # Chama email primeiro acesso
```

---

## 🎨 Design dos Emails

Todos os emails seguem o padrão visual da marca:

- **Background**: Preto (#000)
- **Cor primária**: Vermelho (#DC2626)
- **Cor secundária**: Variável por tipo de email
- **Tipografia**: Sans-serif, maiúsculas, bold, italic
- **Elementos**: Gradientes, bordas arredondadas, sombras

---

## 🧪 Como Testar

### Teste Manual (Edge Function)
```bash
curl -X POST https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-weekly-ranking \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### Teste de Email Individual
```typescript
import { sendWeeklyRankingEmail } from '@/app/actions/email-templates';

await sendWeeklyRankingEmail(
  'teste@email.com',
  'Nome Teste',
  10, // posição
  150, // pontos
  [
    { name: 'Sensei 1', points: 500, position: 1 },
    { name: 'Sensei 2', points: 450, position: 2 },
    // ...
  ]
);
```

---

## 📊 Monitoramento

### Logs do Supabase
https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/functions

### Dashboard Resend
https://resend.com/emails

### Métricas a Acompanhar
- Taxa de entrega
- Taxa de abertura
- Taxa de clique
- Bounces
- Spam reports

---

## 🚀 Próximas Ações

1. **Configurar Cron Job do Ranking**
   - Ver instruções em `CRON-RANKING-SETUP.md`
   - Agendar para sextas às 18h BRT

2. **Verificar Domínio no Resend**
   - Adicionar profepmax.com.br
   - Configurar SPF e DKIM
   - Aguardar propagação DNS

3. **Criar Emails Restantes**
   - Lembrete de documentos pendentes
   - Lembrete de evento próximo
   - Renovação de plano

4. **Testes em Produção**
   - Monitorar primeiro envio do ranking
   - Verificar deliverability
   - Ajustar templates se necessário

---

## 📞 Suporte

Em caso de problemas:
1. Verificar logs no Supabase
2. Verificar Dashboard Resend
3. Conferir variáveis de ambiente
4. Validar DNS do domínio

---

**Última atualização**: 21 de janeiro de 2026  
**Status Geral**: 7/10 emails ativos ✅
