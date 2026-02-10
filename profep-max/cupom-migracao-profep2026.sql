-- ========================================
-- 🎁 CUPOM: MIGRAÇÃO PROFEP2026
-- ========================================
-- Cupom exclusivo para membros antigos
-- Desconto fixo para combinar com 20% do cartão
-- ========================================

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
  discount_fixed,
  valid_from, 
  valid_until, 
  max_uses, 
  status, 
  plan_type,
  payment_method
)
VALUES (
  'PROFEP2026',
  '🎁 Migração Exclusiva - R$ 9,95 OFF para stack com cartão',
  9.95,
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
  discount_percent = NULL,
  discount_fixed = EXCLUDED.discount_fixed,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  payment_method = EXCLUDED.payment_method,
  updated_at = NOW();

-- ========================================
-- ✅ CUPOM CRIADO COM SUCESSO!
-- ========================================
-- 
-- 📋 DETALHES:
-- • Código: PROFEP2026
-- • Desconto: R$ 9,95 (cupom) + 20% (cartão)
-- • Válido: Até 31/01/2026 23h59
-- • Plano: Mensal
-- • Restrição: APENAS cartão de crédito
-- • Limite de Uso: Ilimitado
-- 
-- 💳 VALORES COM O CUPOM:
-- • Preço base mensal: R$ 59,90
-- • Desconto 20% cartão + R$ 9,95 cupom
-- • Valor final esperado conforme cálculo combinado com 20% do cartão
-- • Economia mensal: R$ 9,95 + 20% do valor base
-- • Economia anual: depende do plano ativo
-- 
-- ========================================

-- Verificar o cupom criado:
SELECT 
  code,
  description,
  'R$ ' || discount_fixed::text as desconto,
  valid_from::date as valido_de,
  valid_until as valido_ate,
  CASE payment_method
    WHEN '1' THEN 'Boleto'
    WHEN '2' THEN 'Cartão'
    WHEN '6' THEN 'Pix'
    ELSE 'Todos'
  END as metodo_pagamento,
  status
FROM coupons
WHERE code = 'PROFEP2026';
