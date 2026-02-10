-- ========================================
-- 🎁 CUPOM: 1º MÊS GRÁTIS
-- ========================================
-- Este script cria um cupom de 100% OFF
-- válido APENAS para cartão de crédito
-- ========================================

-- 1. Adicionar coluna payment_method na tabela coupons (se não existir)
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

-- 2. Criar o cupom de 1º mês grátis
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
  'PRIMEIROMES',
  '🎁 1º Mês Grátis - 100% OFF no primeiro pagamento (Somente Cartão)',
  100,
  NOW(),
  NOW() + INTERVAL '90 days',
  -1,
  'ACTIVE',
  'mensal',
  '2'
)
ON CONFLICT (code) 
DO UPDATE SET
  description = EXCLUDED.description,
  discount_percent = EXCLUDED.discount_percent,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  payment_method = EXCLUDED.payment_method,
  updated_at = NOW();

-- ========================================
-- ✅ CUPOM CRIADO COM SUCESSO!
-- ========================================
-- 
-- 📋 DETALHES:
-- • Código: PRIMEIROMES
-- • Desconto: 100% (1 mês completamente grátis)
-- • Válido: 90 dias a partir de hoje
-- • Plano: Mensal
-- • Restrição: APENAS cartão de crédito (payment_method = 2)
-- • Limite de Uso: Ilimitado
-- 
-- 💳 VALORES COM O CUPOM:
-- • Preço base mensal: R$ 49,90
-- • Desconto cartão: R$ 39,90
-- • Com PRIMEIROMES: R$ 0,00 (100% OFF)
-- 
-- ⚠️ OBSERVAÇÃO:
-- O cupom dá 100% de desconto no primeiro mês.
-- A partir do 2º mês, a cobrança será automática
-- pelo valor do plano (R$ 39,90 para cartão).
-- 
-- 🔗 COMO USAR:
-- 1. Acesse: https://www.profepmax.com.br/checkout?plan=mensal
-- 2. Selecione "Cartão de Crédito"
-- 3. Digite o cupom: PRIMEIROMES
-- 4. O valor cairá para R$ 0,00
-- 
-- ========================================

-- Verificar o cupom criado:
SELECT 
  code,
  description,
  discount_percent || '%' as desconto,
  valid_from::date as valido_de,
  valid_until::date as valido_ate,
  CASE payment_method
    WHEN '1' THEN 'Boleto'
    WHEN '2' THEN 'Cartão'
    WHEN '6' THEN 'Pix'
    ELSE 'Todos'
  END as metodo_pagamento,
  status
FROM coupons
WHERE code = 'PRIMEIROMES';
