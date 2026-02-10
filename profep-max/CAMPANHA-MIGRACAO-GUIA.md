# 📧 CAMPANHA DE MIGRAÇÃO - GUIA COMPLETO

## ✅ STATUS ATUAL

### 1. Checkout Atualizado ✓
- **URL Mágica:** `https://www.profepmax.com.br/checkout?plan=mensal&paymentMethod=2&coupon=PROFEP2026`
- Cartão já selecionado automaticamente
- Cupom PROFEP2026 aplicado automaticamente
- Desconto de R$ 20 já calculado (R$ 59,90 → R$ 39,90)

### 2. Edge Function Criada ✓
- **Arquivo:** `/supabase/functions/send-migration-campaign/index.ts`
- Envia para TODOS os emails da tabela `profiles`
- Email HTML profissional com design moderno
- Assunto: "🥋 PROFEP MAX 2026 - NOVA PLATAFORMA: Seu Acesso Antecipado Exclusivo Está Aqui"

### 3. Cupom SQL Preparado ✓
- **Arquivo:** `cupom-migracao-profep2026.sql`
- Código: PROFEP2026
- Desconto: R$ 20 fixo
- Válido até: 31/01/2026
- Apenas cartão de crédito

---

## 🚀 PASSO A PASSO PARA ENVIAR

### PASSO 1: Criar o Cupom no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo do arquivo: `cupom-migracao-profep2026.sql`
5. Clique em **Run**
6. Verifique se apareceu "Query returned successfully"

**Verificar se foi criado:**
```sql
SELECT * FROM coupons WHERE code = 'PROFEP2026';
```

---

### PASSO 2: Deploy da Edge Function no Supabase

**No terminal:**

```bash
cd /Users/judo365/Documents/MASTER\ ESPORTES/SMAART\ PRO/PROFEP/profep-max-2026

# Deploy da função
npx supabase functions deploy send-migration-campaign

# Configurar variáveis de ambiente (se ainda não fez)
npx supabase secrets set RESEND_API_KEY=sua_chave_aqui
```

**Ou pelo Dashboard:**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions**
4. Clique em **Deploy a new function**
5. Upload do arquivo: `/supabase/functions/send-migration-campaign/index.ts`
6. Configure as secrets:
   - `RESEND_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

### PASSO 3: Teste com UM Email Primeiro

**Modificar temporariamente a query da Edge Function:**

No arquivo `send-migration-campaign/index.ts`, linha 34, trocar:
```typescript
// ANTES:
.not('email', 'is', null)

// DEPOIS (para teste):
.eq('email', 'seu-email@example.com')
```

**Executar o teste:**
```bash
# Via curl:
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-migration-campaign \
  -H "Authorization: Bearer SUA_ANON_KEY"

# Ou pelo Dashboard Supabase > Edge Functions > send-migration-campaign > Invoke
```

**Verificar:**
- Email chegou na caixa de entrada?
- Layout está correto?
- Link funciona e aplica o cupom?
- Desconto está aparecendo correto?

---

### PASSO 4: Envio em Massa (APÓS TESTE OK)

**Reverter a mudança de teste:**
```typescript
// Voltar para o original:
.not('email', 'is', null)
```

**Redeploy e Executar:**
```bash
npx supabase functions deploy send-migration-campaign

# Executar o envio
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-migration-campaign \
  -H "Authorization: Bearer SUA_ANON_KEY"
```

**Monitorar:**
- Logs do Supabase: Dashboard > Edge Functions > send-migration-campaign > Logs
- Resend Dashboard: https://resend.com/emails
- Taxa de entrega
- Taxa de abertura

---

## 📊 DETALHES DA CAMPANHA

### Conteúdo do Email:

**Assunto:**
```
🥋 PROFEP MAX 2026 - NOVA PLATAFORMA: Seu Acesso Antecipado Exclusivo Está Aqui
```

**Destaques:**
- ✅ Desconto permanente: R$ 59,90 → R$ 39,90/mês
- ✅ Economia: R$ 240/ano
- ✅ Cupom: PROFEP2026
- ✅ Validade: 31/01/2026
- ✅ WhatsApp: (55) 98408-5000
- ✅ Link direto com cupom aplicado

**Design:**
- Header vermelho com gradiente
- Boxes destacados para oferta
- Cupom em destaque com código
- CTA grande "MIGRAR AGORA"
- Layout responsivo
- Cores da marca (vermelho, amarelo, verde)

---

## 📈 RESULTADOS ESPERADOS

### Métricas para Acompanhar:

1. **Taxa de Entrega:** >95%
2. **Taxa de Abertura:** 20-30%
3. **Taxa de Clique:** 10-20%
4. **Taxa de Conversão:** 5-10%

### Onde Acompanhar:

- **Resend:** Taxa de entrega e abertura
- **Google Analytics:** Cliques no link
- **Supabase:** Uso do cupom na tabela `coupons`
- **Safe2Pay:** Transações aprovadas

---

## ⚠️ CHECKLIST ANTES DE ENVIAR

- [ ] Cupom PROFEP2026 criado no banco
- [ ] Edge Function deployada
- [ ] Variáveis de ambiente configuradas
- [ ] Teste enviado e validado
- [ ] Layout verificado (desktop e mobile)
- [ ] Link do checkout testado
- [ ] Cupom aplicando corretamente
- [ ] WhatsApp atualizado no email
- [ ] Data de validade correta (31/01/2026)

---

## 🆘 TROUBLESHOOTING

### Email não chegou:
- Verificar se RESEND_API_KEY está configurada
- Verificar domínio verificado no Resend
- Checar logs da Edge Function

### Cupom não funciona:
- Verificar se foi criado: `SELECT * FROM coupons WHERE code = 'PROFEP2026'`
- Verificar data de validade
- Verificar se payment_method = '2'

### Link não aplica cupom:
- Testar URL manualmente
- Verificar parâmetros: `?plan=mensal&paymentMethod=2&coupon=PROFEP2026`
- Checar se deploy do checkout foi feito

---

## 📞 SUPORTE

**Problemas técnicos?**
- Logs do Supabase: Dashboard > Edge Functions > Logs
- Resend Support: https://resend.com/support
- Vercel Logs: https://vercel.com/dashboard

---

**Criado em:** 22/01/2026
**Válido até:** 31/01/2026 23h59
**Última atualização:** Deploy concluído
