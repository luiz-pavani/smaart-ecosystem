# 🚀 CAMPANHA DE MIGRAÇÃO - INSTRUÇÕES FINAIS

## ✅ STATUS: TUDO PRONTO PARA ENVIO

### 📦 O que já está pronto:

#### 1. Edge Function Deploy ✅
- **Status:** Deployed com sucesso
- **Nome:** `send-migration-campaign`
- **URL:** https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-migration-campaign
- **Dashboard:** https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/functions

#### 2. Email Template ✅
- **Saudação:** HAI, Sensei [Nome]!
- **Despedida:** ARIAGATŌ! Equipe PROFEP MAX
- **Assunto:** 🥋 PROFEP MAX 2026 - 35% OFF por 48h (R$ 39,90/mês)
- **Design:** Responsivo, visual moderno com gradientes vermelho/dourado
- **Conteúdo:** Completo com oferta, passo a passo, FAQ

#### 3. Oferta Relâmpago ⏳
- **Status:** A aplicar na campanha
- **Desconto:** 35% OFF (R$ 61,38 → R$ 39,90)
- **Validade:** 48 horas a partir do disparo
- **Restrição:** APENAS cartão de crédito (código 2)
- **Limite:** Primeiros 30 clientes

#### 4. Checkout URL ✅
- **Link:** `https://www.profepmax.com.br/checkout?plan=mensal&paymentMethod=2`
- **Features:** Auto-seleção de cartão
- **Deploy:** Produção (Vercel)

---

## 🎯 PASSO A PASSO PARA LANÇAR A CAMPANHA

### PASSO 1: Configurar a Oferta Relâmpago

1. Acesse: https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/editor
2. Clique em **"SQL Editor"** no menu lateral
3. Ajuste a configuração/valor do checkout conforme a oferta de 35% OFF por 48h (cartão)

```sql
-- 1. Adicionar coluna payment_method (se ainda não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE coupons ADD COLUMN payment_method VARCHAR(10) DEFAULT NULL;
        COMMENT ON COLUMN coupons.payment_method IS 'Método de pagamento restrito: 1=Boleto, 2=Cartão, 6=Pix. NULL=Todos';
    END IF;
END $$;

-- 2. Criar o cupom PROFEP2026
INSERT INTO coupons (
  code, 
  description, 
  discount_percent, 
  valid_from, 
  valid_until, 
  max_uses, 
  status, 
  plan_type,
  payment_method
)
VALUES (
  'PROFEP2026',
  '🎁 Migração Exclusiva - 50% OFF Permanente (Membros Antigos)',
  50,
  NOW(),
  '2026-01-31 23:59:59',
  -1,
  'ACTIVE',
  'mensal',
  '2'
)
ON CONFLICT (code) 
DO UPDATE SET
  description = EXCLUDED.description,
  discount_percent = EXCLUDED.discount_percent,
  discount_fixed = NULL,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  payment_method = EXCLUDED.payment_method,
  updated_at = NOW();

-- Verificar o cupom criado
SELECT 
  code,
  description,
  discount_percent,
  valid_until,
  payment_method,
  status
FROM coupons
WHERE code = 'PROFEP2026';
```

4. Clique em **"RUN"**
5. Verifique se o preço exibido no checkout é **R$ 39,90/mês**

---

### PASSO 2: Testar a Oferta no Checkout

1. Acesse: https://www.profepmax.com.br/checkout?plan=mensal&paymentMethod=2
2. Verifique se:
   - ✅ Cartão de crédito está selecionado automaticamente
  - ✅ Valor exibido é **R$ 39,90/mês**
  - ✅ Mensagem de desconto mostra "35% OFF" e 48h
  - ✅ Oferta limitada a 30 clientes

---

### PASSO 3: Enviar Email de Teste

Antes de disparar para todos, envie um teste para você mesmo:

```bash
# Opção A: Curl
curl -X POST \
  'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-migration-campaign' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json'

# Opção B: Via Dashboard Supabase
```

**Checklist do Email:**
- ✅ Saudação: "HAI, Sensei [Seu Nome]!"
- ✅ Preço: R$ 39,90/mês (35% OFF)
- ✅ Economia: R$ 257,76 anual
- ✅ Urgência: 48 horas + limite de 30 clientes
- ✅ Link funcional com cupom auto-aplicado
- ✅ Despedida: "ARIAGATŌ! Equipe PROFEP MAX"
- ✅ Design responsivo (teste em mobile)

---

### PASSO 4: Disparar Campanha Completa

⚠️ **ATENÇÃO:** Isso enviará email para TODOS os usuários da base!

```bash
# Via Terminal
curl -X POST \
  'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-migration-campaign' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Ou via Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/sxmrqiohfrktwlkwmfyr/functions/send-migration-campaign
2. Clique em **"Invoke Function"**
3. Clique em **"Send Request"**

**Logs em Tempo Real:**
```bash
npx supabase functions logs send-migration-campaign --remote
```

---

### PASSO 5: Monitorar Resultados

#### Acompanhe em Tempo Real:

1. **Logs da Edge Function:**
   - Dashboard → Functions → send-migration-campaign → Logs
   - Veja quem recebeu/falhou em tempo real

2. **Analytics no Resend:**
   - https://resend.com/emails
   - Taxa de entrega, aberturas, cliques

3. **Conversões no Checkout:**
   - Monitore a tabela `vendas` no Supabase
   - Filtre por: `coupon_code = 'PROFEP2026'`

#### Query para Acompanhar Conversões:

```sql
-- Ver vendas com o cupom PROFEP2026
SELECT 
  created_at,
  email,
  valor,
  plan_type,
  payment_method
FROM vendas
WHERE coupon_code = 'PROFEP2026'
ORDER BY created_at DESC;

-- Contagem total
SELECT COUNT(*) as total_conversoes, SUM(valor) as receita_total
FROM vendas
WHERE coupon_code = 'PROFEP2026';
```

---

## 📊 MÉTRICAS ESPERADAS

### Estimativas:
- **Emails enviados:** ~X usuários (conforme base atual)
- **Taxa de abertura esperada:** 20-30%
- **Taxa de clique esperada:** 10-15%
- **Taxa de conversão esperada:** 5-10%

### Prazo:
- **Validade da oferta:** 48 horas a partir do disparo
- **Urgência:** Reforçar a contagem regressiva e o limite de 30 clientes

---

## 🆘 TROUBLESHOOTING

### Problema: "Cupom inválido" no checkout
**Solução:** Verificar se o cupom foi criado corretamente no Supabase
```sql
SELECT * FROM coupons WHERE code = 'PROFEP2026';
```

### Problema: Emails não estão sendo enviados
**Solução:** Verificar variável de ambiente RESEND_API_KEY no Supabase
```bash
# Ver segredos configurados
npx supabase secrets list
```

### Problema: Link não aplica cupom automaticamente
**Solução:** Verificar se está usando exatamente este URL:
`https://www.profepmax.com.br/checkout?plan=mensal&paymentMethod=2&coupon=PROFEP2026`

### Problema: Preço calculado errado
**Solução:** Verificar se o cupom tem `discount_percent = 50` (e não discount_fixed)

---

## 📝 CHECKLIST FINAL

Antes de disparar, confirme:

- [ ] Cupom PROFEP2026 criado no Supabase (50% OFF)
- [ ] Teste do cupom no checkout funcionando
- [ ] Email de teste recebido e conferido
- [ ] Design responsivo OK no mobile
- [ ] Links do email funcionando
- [ ] Checkout aplicando desconto correto (R$ 29,95)
- [ ] Edge Function deployed e testada
- [ ] Resend API Key configurada
- [ ] Backup da base de dados feito (precaução)
- [ ] Suporte preparado para dúvidas (WhatsApp/Email)

---

## 🎯 CALL TO ACTION

Quando estiver pronto para disparar:

```bash
curl -X POST \
  'https://sxmrqiohfrktwlkwmfyr.supabase.co/functions/v1/send-migration-campaign' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**HAI! Boa sorte com a campanha! 🥋**

**ARIAGATŌ!**  
Equipe PROFEP MAX
