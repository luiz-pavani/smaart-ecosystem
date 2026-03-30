-- Fix tamanho_patch check constraint to only allow P, M, G (or null)
ALTER TABLE public.user_fed_lrsj
  DROP CONSTRAINT IF EXISTS user_fed_lrsj_tamanho_patch_check;

ALTER TABLE public.user_fed_lrsj
  ADD CONSTRAINT user_fed_lrsj_tamanho_patch_check
  CHECK (tamanho_patch IS NULL OR tamanho_patch IN ('P', 'M', 'G'));

-- Nullify any existing values that don't match the new constraint
UPDATE public.user_fed_lrsj
  SET tamanho_patch = NULL
  WHERE tamanho_patch IS NOT NULL AND tamanho_patch NOT IN ('P', 'M', 'G');
