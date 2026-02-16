-- Migration 007: Atletas - Campos Adicionais e Aprovações
-- Created: 2026-02-16
-- Description: Add Instagram, Backnumber fields, approval system for graduacao and arbitragem

-- Add Instagram field
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);

-- Add Backnumber (Patch) fields
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS backnumber_tamanho VARCHAR(100),
ADD COLUMN IF NOT EXISTS backnumber_nome VARCHAR(14),
ADD COLUMN IF NOT EXISTS backnumber_dourado BOOLEAN DEFAULT false;

-- Add approval fields for graduacao and arbitragem
ALTER TABLE atletas
ADD COLUMN IF NOT EXISTS graduacao_aprovada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS graduacao_aprovada_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS graduacao_aprovada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS arbitragem_aprovada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arbitragem_aprovada_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS arbitragem_aprovada_em TIMESTAMP WITH TIME ZONE;

-- Remove telefone (optional - uncomment if you want to drop the column)
-- ALTER TABLE atletas DROP COLUMN IF EXISTS telefone;

-- Add comments to columns
COMMENT ON COLUMN atletas.instagram IS 'Instagram handle do atleta (ex: @usuario)';
COMMENT ON COLUMN atletas.backnumber_tamanho IS 'Tamanho do patch backnumber: PEQUENO AZUL/ROSA, MÉDIO ou GRANDE';
COMMENT ON COLUMN atletas.backnumber_nome IS 'Nome impresso no backnumber - máximo 14 caracteres';
COMMENT ON COLUMN atletas.backnumber_dourado IS 'Indica se o backnumber é dourado (apenas para atletas especiais)';
COMMENT ON COLUMN atletas.graduacao_aprovada IS 'Indica se a graduação foi aprovada (faixa preta+ requer federação)';
COMMENT ON COLUMN atletas.graduacao_aprovada_por IS 'Usuário que aprovou a graduação';
COMMENT ON COLUMN atletas.graduacao_aprovada_em IS 'Data/hora da aprovação da graduação';
COMMENT ON COLUMN atletas.arbitragem_aprovada IS 'Indica se o nível de arbitragem foi aprovado pela federação';
COMMENT ON COLUMN atletas.arbitragem_aprovada_por IS 'Usuário que aprovou a arbitragem';
COMMENT ON COLUMN atletas.arbitragem_aprovada_em IS 'Data/hora da aprovação da arbitragem';

-- Create index for approval queries
CREATE INDEX IF NOT EXISTS idx_atletas_graduacao_aprovada ON atletas(graduacao_aprovada);
CREATE INDEX IF NOT EXISTS idx_atletas_arbitragem_aprovada ON atletas(arbitragem_aprovada);

-- Function to auto-approve graduacoes below faixa preta by academia
CREATE OR REPLACE FUNCTION auto_aprovar_graduacao_academia()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve graduacoes até faixa marrom (não faixa preta ou kodansha)
  IF NEW.graduacao NOT LIKE '%FAIXA PRETA%' 
     AND NEW.graduacao NOT LIKE '%KODANSHA%' 
     AND NEW.graduacao_aprovada IS NULL THEN
    NEW.graduacao_aprovada := true;
    NEW.graduacao_aprovada_em := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-approval
DROP TRIGGER IF EXISTS trigger_auto_aprovar_graduacao ON atletas;
CREATE TRIGGER trigger_auto_aprovar_graduacao
  BEFORE INSERT OR UPDATE OF graduacao
  ON atletas
  FOR EACH ROW
  EXECUTE FUNCTION auto_aprovar_graduacao_academia();
