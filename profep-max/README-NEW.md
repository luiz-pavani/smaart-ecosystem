# Profep Max 🎓

**Plataforma educacional premium** para preparação de professores de Educação Física. Next.js + Supabase + Safe2Pay recorrência integrada.

---

## 🚀 Início Rápido

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Ambiente
```bash
cp .env.local.example .env.local
# Editar .env.local com suas credenciais
```

### 3. Criar Plans no Safe2Pay
```bash
npx ts-node scripts/setup-safe2pay-plans.ts
# Copiar Plan IDs para .env.local
```

### 4. Rodar Desenvolvimento
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## 📚 Documentação Completa

### **Sistema de Pagamento**
- 📖 [RECORRENCIA-API-CORRETA.md](./RECORRENCIA-API-CORRETA.md) - **Implementação Safe2Pay Recurrence (LEIA PRIMEIRO)**
- 📖 [RECORRENCIA-SAFE2PAY.md](./RECORRENCIA-SAFE2PAY.md) - Guia prático de recorrência
- 📖 [RECORRENCIA-IMPLEMENTACAO-COMPLETA.md](./RECORRENCIA-IMPLEMENTACAO-COMPLETA.md) - Detalhes técnicos
- 📖 [COUPONS-SYSTEM.md](./COUPONS-SYSTEM.md) - Sistema de cupons de desconto

### **Emails & Triggers**
- 📖 [EMAILS-DOCUMENTATION.md](./EMAILS-DOCUMENTATION.md) - Configuração de emails
- 📖 [EMAIL-TRIGGERS.md](./EMAIL-TRIGGERS.md) - Gatilhos de email

### **Administração**
- 📖 [ENV-ADMIN-SETUP.md](./ENV-ADMIN-SETUP.md) - Setup de admin/secretaria
- 📖 [ADMIN-SECRETARIA.md](./ADMIN-SECRETARIA.md) - Painel administrativo
- 📖 [IMPLEMENTACAO-ADMIN-COMPLETA.md](./IMPLEMENTACAO-ADMIN-COMPLETA.md) - Admin completo

### **Campanhas & Ranking**
- 📖 [CAMPANHA-MIGRACAO-GUIA.md](./CAMPANHA-MIGRACAO-GUIA.md) - Migração de usuários
- 📖 [LANCAMENTO-CAMPANHA-LEADS.md](./LANCAMENTO-CAMPANHA-LEADS.md) - Campanha de leads
- 📖 [CRON-RANKING-SETUP.md](./CRON-RANKING-SETUP.md) - Ranking automático

### **Termos & Federações**
- 📖 [TERMOS-FEDERACOES-IMPLEMENTACAO.md](./TERMOS-FEDERACOES-IMPLEMENTACAO.md) - Aceite de termos

---

## 🛠️ Tecnologias

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Pagamentos:** [Safe2Pay Recurrence API](https://developers.safe2pay.com.br/)
- **Email:** [Resend](https://resend.com/)
- **Estilo:** Tailwind CSS
- **Deployment:** [Vercel](https://vercel.com/)

---

## 📂 Estrutura do Projeto

```
profep-max/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── checkout/route.ts         # ✅ Checkout com API de Recorrência
│   │   │   └── webhooks/
│   │   │       └── safe2pay/route.ts     # ✅ Webhooks de ciclo de vida
│   │   ├── (auth)/                       # Rotas de autenticação
│   │   ├── (dashboard)/                  # Dashboard do usuário
│   │   └── admin/                        # Painel administrativo
│   ├── components/                       # Componentes React
│   ├── lib/
│   │   └── safe2pay-recurrence.ts        # ✅ Utilitários Safe2Pay
│   └── actions/                          # Server Actions
├── scripts/
│   └── setup-safe2pay-plans.ts           # ✅ Criar plans no Safe2Pay
├── supabase/                             # Migrations SQL
├── public/                               # Assets estáticos
└── package.json
```

---

## ⚙️ Variáveis de Ambiente

Veja [.env.local.example](./.env.local.example) para lista completa.

**Essenciais:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SAFE2PAY_API_TOKEN=...
SAFE2PAY_PLAN_ID_MENSAL=...
SAFE2PAY_PLAN_ID_ANUAL=...
SAFE2PAY_PLAN_ID_VITALICIO=...
RESEND_API_KEY=...
```

---

## 🧪 Testes

### Checkout Local
```bash
# 1. Rodar dev
npm run dev

# 2. Acessar checkout
http://localhost:3000/checkout

# 3. Verificar logs
[CHECKOUT] Tokenizando cartão...
[CHECKOUT] ✅ Assinatura criada: sub_xyz789
```

### Webhooks (Ngrok)
```bash
# 1. Expor localhost
ngrok http 3000

# 2. Configurar Callback URL no Safe2Pay
https://abc123.ngrok.io/api/webhooks/safe2pay

# 3. Fazer checkout e verificar webhooks
```

---

## 🚀 Deploy

### Vercel (Recomendado)
```bash
vercel --prod
```

Configure as env vars no dashboard da Vercel.

### Callback URL Safe2Pay
```
https://seu-projeto.supabase.co/functions/v1/safe2pay-webhook
```

---

## 📝 Licença

Proprietary - SMAART PRO / Profep Max

---

## 🆘 Suporte

- **Documentação:** Leia [RECORRENCIA-API-CORRETA.md](./RECORRENCIA-API-CORRETA.md)
- **Logs:** Verifique Vercel Logs ou console local
- **Email:** contato@profepmax.com.br

---

> **Última atualização:** Janeiro 2025  
> **Status:** ✅ Produção (API de Recorrência v1)
