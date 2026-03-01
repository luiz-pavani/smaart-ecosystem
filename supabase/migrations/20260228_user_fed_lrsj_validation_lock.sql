-- Regras de validação e travamento de edição para user_fed_lrsj
-- Objetivo:
-- 1) Atleta/Academia podem editar enquanto dados NÃO estiverem validados
-- 2) Após validação, somente Federação e Master podem editar
-- 3) Master sempre pode tudo

ALTER TABLE public.user_fed_lrsj
  ADD COLUMN IF NOT EXISTS dados_validados BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_dados_validados
  ON public.user_fed_lrsj (dados_validados);

CREATE OR REPLACE FUNCTION public.set_user_fed_lrsj_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_fed_lrsj_updated_at ON public.user_fed_lrsj;

CREATE TRIGGER trg_user_fed_lrsj_updated_at
BEFORE UPDATE ON public.user_fed_lrsj
FOR EACH ROW
EXECUTE FUNCTION public.set_user_fed_lrsj_updated_at();

ALTER TABLE public.user_fed_lrsj ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_fed_lrsj_update_with_validation_lock" ON public.user_fed_lrsj;

CREATE POLICY "user_fed_lrsj_update_with_validation_lock"
ON public.user_fed_lrsj
FOR UPDATE
TO authenticated
USING (
  -- Master sempre pode
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_access'
  )
  OR
  -- Federação sempre pode
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('federacao_admin', 'federacao_staff')
  )
  OR
  (
    -- Atleta/Academia apenas antes de validar
    COALESCE(dados_validados, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('academia_admin', 'academia_staff', 'atleta')
      )
      OR (email IS NOT NULL AND LOWER(email) = LOWER((auth.jwt() ->> 'email')))
    )
  )
)
WITH CHECK (
  -- Master sempre pode
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'master_access'
  )
  OR
  -- Federação sempre pode (inclui validar)
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('federacao_admin', 'federacao_staff')
  )
  OR
  (
    -- Atleta/Academia só podem salvar registros NÃO validados
    COALESCE(dados_validados, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('academia_admin', 'academia_staff', 'atleta')
      )
      OR (email IS NOT NULL AND LOWER(email) = LOWER((auth.jwt() ->> 'email')))
    )
  )
);
