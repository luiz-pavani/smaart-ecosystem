-- =====================================================
-- Adicionar configurações de anuidade 2026
-- =====================================================

-- Adicionar valor da anuidade na tabela federacoes
ALTER TABLE federacoes 
ADD COLUMN IF NOT EXISTS valor_anualidade_2026 DECIMAL(10,2) DEFAULT 690.00;

-- Adicionar configurações de parcelamento
ALTER TABLE federacoes 
ADD COLUMN IF NOT EXISTS max_parcelas_anualidade INTEGER DEFAULT 10;

-- Adicionar comentários
COMMENT ON COLUMN federacoes.valor_anualidade_2026 IS 'Valor da anuidade para academias em 2026';
COMMENT ON COLUMN federacoes.max_parcelas_anualidade IS 'Número máximo de parcelas permitidas';

-- Atualizar federação LRSJ com valor 2026
UPDATE federacoes 
SET valor_anualidade_2026 = 690.00,
    max_parcelas_anualidade = 10
WHERE sigla = 'LRSJ';
