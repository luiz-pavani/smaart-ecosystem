-- ============================================================
-- Unificação de status: Approved + Dados Validados -> Status do Membro
-- Tabela alvo: public.user_fed_lrsj
-- Status final permitido: Em análise | Aceito | Rejeitado
-- ============================================================

ALTER TABLE public.user_fed_lrsj
ADD COLUMN IF NOT EXISTS status_membro text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_fed_lrsj'
      AND column_name = 'approved'
  ) THEN
    EXECUTE $sql$
      UPDATE public.user_fed_lrsj
      SET status_membro = CASE
        WHEN COALESCE(approved, false) = true THEN 'Aceito'
        WHEN lower(COALESCE(status_membro, '')) IN ('rejected', 'rejeitado') THEN 'Rejeitado'
        WHEN COALESCE(dados_validados, false) = true THEN 'Aceito'
        ELSE 'Em análise'
      END
    $sql$;
  ELSE
    UPDATE public.user_fed_lrsj
    SET status_membro = CASE
      WHEN lower(COALESCE(status_membro, '')) IN ('approved', 'aceito') THEN 'Aceito'
      WHEN lower(COALESCE(status_membro, '')) IN ('rejected', 'rejeitado') THEN 'Rejeitado'
      WHEN COALESCE(dados_validados, false) = true THEN 'Aceito'
      ELSE 'Em análise'
    END;
  END IF;
END $$;

ALTER TABLE public.user_fed_lrsj
ALTER COLUMN status_membro SET DEFAULT 'Em análise';

UPDATE public.user_fed_lrsj
SET status_membro = 'Em análise'
WHERE status_membro IS NULL OR btrim(status_membro) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_fed_lrsj_status_membro_check'
  ) THEN
    ALTER TABLE public.user_fed_lrsj
    ADD CONSTRAINT user_fed_lrsj_status_membro_check
    CHECK (status_membro IN ('Em análise', 'Aceito', 'Rejeitado'));
  END IF;
END $$;

ALTER TABLE public.user_fed_lrsj
ALTER COLUMN status_membro SET NOT NULL;

ALTER TABLE public.user_fed_lrsj
DROP COLUMN IF EXISTS dados_validados;

ALTER TABLE public.user_fed_lrsj
DROP COLUMN IF EXISTS approved;
