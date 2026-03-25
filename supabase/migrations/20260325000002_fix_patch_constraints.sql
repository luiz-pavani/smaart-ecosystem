-- Drop existing check constraints on patch columns
ALTER TABLE user_fed_lrsj DROP CONSTRAINT IF EXISTS user_fed_lrsj_cor_patch_check;
ALTER TABLE user_fed_lrsj DROP CONSTRAINT IF EXISTS user_fed_lrsj_tamanho_patch_check;

-- Normalize cor_patch to uppercase
UPDATE user_fed_lrsj SET cor_patch = 'AZUL' WHERE cor_patch = 'azul';
UPDATE user_fed_lrsj SET cor_patch = 'ROSA' WHERE cor_patch = 'rosa';

-- Normalize tamanho_patch: text descriptions → G/M/P
UPDATE user_fed_lrsj SET tamanho_patch = 'G' WHERE tamanho_patch ILIKE 'GRANDE%';
UPDATE user_fed_lrsj SET tamanho_patch = 'M' WHERE tamanho_patch ILIKE 'MÉDIO%';
UPDATE user_fed_lrsj SET tamanho_patch = 'M' WHERE tamanho_patch ILIKE 'MEDIO%';
UPDATE user_fed_lrsj SET tamanho_patch = 'P' WHERE tamanho_patch ILIKE 'PEQUENO%';

-- Add new constraints
ALTER TABLE user_fed_lrsj ADD CONSTRAINT user_fed_lrsj_cor_patch_check
  CHECK (cor_patch IN ('AZUL', 'ROSA') OR cor_patch IS NULL);

ALTER TABLE user_fed_lrsj ADD CONSTRAINT user_fed_lrsj_tamanho_patch_check
  CHECK (tamanho_patch IN ('G', 'M', 'P') OR tamanho_patch IS NULL);
