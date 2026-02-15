# 🚀 GUIA RÁPIDO - TROUBLESHOOTING PROFEP MAX

## 🔍 Ferramentas de Diagnóstico

### 1. Health Check Geral
Verifica saúde do sistema completo:
```bash
node scripts/health-check.js
```

**O que verifica:**
- ✅ Cursos cadastrados e configuração
- ✅ Usuários ativos
- ✅ Assinaturas recorrentes
- ✅ Eventos e transações recentes (24h)
- ✅ Variáveis de ambiente

### 2. Diagnóstico de Usuário Específico
Verifica problema de um usuário:
```bash
node scripts/diagnose-user.js email@example.com
```

**O que verifica:**
- ✅ Perfil e status de assinatura
- ✅ Filiação a federações
- ✅ Cursos visíveis
- ✅ Histórico de pagamentos
- ✅ Eventos de assinatura

### 3. Correção de Visibilidade de Cursos
Garante que todos cursos são visíveis:
```bash
node scripts/fix-course-scopes.js
```

**O que faz:**
- Atualiza `federation_scope` de todos cursos para `'ALL'`
- Garante visibilidade máxima para assinantes

---

## 🐛 Problemas Comuns e Soluções

### Problema: "Nenhum curso encontrado"

**Sintoma:** Usuário vê página vazia em `/cursos`

**Causas possíveis:**
1. Usuário não está ativo (`status != 'active'`)
2. Cursos com `federation_scope` incorreto
3. Nenhum curso cadastrado no sistema

**Solução:**
```bash
# 1. Diagnosticar usuário
node scripts/diagnose-user.js email@usuario.com

# 2. Se mostra 0 cursos visíveis, corrigir scopes
node scripts/fix-course-scopes.js

# 3. Verificar se usuário está ativo no Supabase
# Dashboard → Table Editor → profiles → filtrar por email
```

---

### Problema: Login não funciona

**Sintoma:** Erro ao fazer login ou redirecionamento quebrado

**Causas possíveis:**
1. Cloudflare 522 (timeout Supabase)
2. Middleware redirecionando incorretamente
3. Sessão expirada

**Solução:**
```bash
# 1. Verificar se login email/password usa server-side
# Arquivo: src/app/login/page.tsx
# Deve chamar: fetch('/api/auth/login')

# 2. Testar Supabase direto do servidor
curl -I https://sxmrqiohfrktwlkwmfyr.supabase.co/auth/v1/health

# 3. Limpar cookies e tentar novamente
```

---

### Problema: Assinatura não aparece após pagamento

**Sintoma:** Usuário pagou mas ainda vê como inativo

**Causas possíveis:**
1. Webhook Safe2Pay não configurado
2. Webhook não foi processado
3. Email do pagamento diferente do cadastro

**Solução:**
```bash
# 1. Verificar se webhook está registrado
# Safe2Pay Dashboard → Webhooks → Verificar URL

# 2. Verificar logs de webhook
# Vercel Dashboard → Logs → Filtrar por "/api/webhooks/safe2pay"

# 3. Ativar manualmente (temporário)
# Supabase → Table Editor → profiles
# UPDATE: status='active', plan='mensal', plan_expires_at=NOW()+30 days
```

---

### Problema: Renovação não aconteceu

**Sintoma:** Assinatura expirou mas pagamento foi cobrado

**Causas possíveis:**
1. Webhook não foi recebido/processado
2. `id_subscription` incorreto no perfil
3. Erro no handler de renovação

**Solução:**
```bash
# 1. Verificar eventos de assinatura
node scripts/diagnose-user.js email@usuario.com
# Olhar seção "5️⃣ VERIFICANDO EVENTOS DE ASSINATURA"

# 2. Verificar logs do webhook no Vercel
# Buscar por: "SubscriptionRenewed"

# 3. Processar manualmente se necessário
# Supabase → Table Editor → profiles
# UPDATE: plan_expires_at = DATE + INTERVAL '1 month'
```

---

### Problema: Email não foi enviado

**Sintoma:** Usuário não recebeu notificação de assinatura

**Causas possíveis:**
1. API Key da Resend incorreta
2. Email em spam
3. Erro no envio (verificar logs)

**Solução:**
```bash
# 1. Testar envio direto
node scripts/test-email.js email@teste.com

# 2. Verificar configuração Resend
# .env.local → RESEND_API_KEY
# Resend Dashboard → API Keys

# 3. Verificar logs no Vercel
# Buscar por: "Email error" ou "resend.emails.send"
```

---

## 📦 Estrutura de Arquivos Importantes

```
profep-max/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts          # ← Login server-side
│   │   │   │   └── signup/route.ts         # ← Signup server-side
│   │   │   ├── webhooks/
│   │   │   │   └── safe2pay/route.ts       # ← Webhook handler
│   │   │   └── checkout/route.ts           # ← Checkout recorrente
│   │   ├── (ava)/
│   │   │   └── cursos/page.tsx             # ← Lista de cursos (BUG FIXADO)
│   │   ├── login/page.tsx                  # ← Página de login
│   │   └── cadastro/page.tsx               # ← Página de cadastro
│   ├── lib/
│   │   ├── safe2pay-recurrence.ts          # ← API Safe2Pay
│   │   └── email-subscriptions.ts          # ← Emails Resend
│   └── middleware.ts                       # ← Roteamento multi-tenant
├── scripts/
│   ├── health-check.js                     # ← Health check geral
│   ├── diagnose-user.js                    # ← Diagnóstico usuário
│   └── fix-course-scopes.js                # ← Correção de cursos
├── supabase/
│   └── migrations/
│       └── recorrencia-safe2pay.sql        # ← Migration recorrência
└── .env.local                              # ← Configurações sensíveis
```

---

## 🔐 Acessos Importantes

### Vercel
- URL: https://vercel.com/luiz-pavani/profep-max
- Logs em tempo real
- Environment variables

### Supabase
- URL: https://sxmrqiohfrktwlkwmfyr.supabase.co
- Table Editor: profiles, vendas, subscription_events
- Auth: gerenciar usuários

### Safe2Pay
- Dashboard: painel.safe2pay.com.br
- Webhooks: configurar URL de callback
- Logs: verificar chamadas

### Resend
- Dashboard: resend.com
- API Keys: gerenciar tokens
- Logs: emails enviados

---

## 🆘 Comandos de Emergência

### Resetar um usuário problemático
```sql
-- No Supabase SQL Editor
UPDATE profiles 
SET 
  status = 'active',
  plan = 'mensal',
  plan_expires_at = NOW() + INTERVAL '30 days',
  subscription_status = 'active'
WHERE email ILIKE 'email@usuario.com';
```

### Verificar webhooks recebidos
```sql
-- No Supabase SQL Editor
SELECT event_type, created_at, status_code 
FROM subscription_events 
WHERE subscription_id = 'SUB-XXXXX'
ORDER BY created_at DESC 
LIMIT 10;
```

### Listar assinaturas expiradas
```sql
-- No Supabase SQL Editor
SELECT email, plan, plan_expires_at, subscription_status
FROM profiles
WHERE plan_expires_at < NOW()
  AND status = 'active'
ORDER BY plan_expires_at DESC;
```

---

## 📞 Precisa de Ajuda?

1. **Verificar documentação:**
   - [SYSTEM-STATUS.md](SYSTEM-STATUS.md) - Status geral do sistema
   - [COURSE-VISIBILITY-FIX.md](COURSE-VISIBILITY-FIX.md) - Fix de cursos
   - [RECORRENCIA-SAFE2PAY.md](RECORRENCIA-SAFE2PAY.md) - Recorrência Safe2Pay

2. **Executar diagnósticos:**
   ```bash
   node scripts/health-check.js
   node scripts/diagnose-user.js <email>
   ```

3. **Verificar logs:**
   - Vercel: Deploy logs e Function logs
   - Supabase: Database logs e Auth logs
   - Safe2Pay: Webhook logs

---

*Última atualização: 15/02/2026*
