-- Migration 035: Trocar chave para stakeholder_id e remover colunas legadas
-- Objetivo:
-- - Tornar stakeholder_id a chave primária de user_fed_lrsj
-- - Remover colunas legadas: id, numero_membro, graduacao, dan
-- - Manter operação segura e idempotente

DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL THEN
    RAISE NOTICE '[035] Tabela public.user_fed_lrsj não existe neste ambiente. Migration ignorada.';
    RETURN;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_fed_lrsj_dedup_log (
  id BIGSERIAL PRIMARY KEY,
  stakeholder_id UUID NOT NULL,
  removed_row JSONB NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo TEXT NOT NULL DEFAULT 'duplicate stakeholder_id in migration 035'
);

DO $$
DECLARE
  pk_name TEXT;
  pk_def TEXT;
  has_duplicates BIGINT := 0;
  has_nulls BIGINT := 0;
  removed_duplicates BIGINT := 0;
BEGIN
  -- 1) Pré-validação de stakeholder_id
  SELECT COUNT(*) INTO has_nulls
  FROM public.user_fed_lrsj
  WHERE stakeholder_id IS NULL;

  SELECT COUNT(*) INTO has_duplicates
  FROM (
    SELECT stakeholder_id
    FROM public.user_fed_lrsj
    WHERE stakeholder_id IS NOT NULL
    GROUP BY stakeholder_id
    HAVING COUNT(*) > 1
  ) d;

  IF has_nulls > 0 THEN
    RAISE EXCEPTION '[035] Abortado: stakeholder_id possui % valores NULL.', has_nulls;
  END IF;

  IF has_duplicates > 0 THEN
    -- Resolver duplicidades mantendo o registro mais recente e auditando remoções
    WITH ranked AS (
      SELECT
        u.ctid,
        u.stakeholder_id,
        ROW_NUMBER() OVER (
          PARTITION BY u.stakeholder_id
          ORDER BY
            COALESCE(
              CASE
                WHEN u.updated_at IS NULL THEN NULL
                WHEN trim(u.updated_at::TEXT) = '' THEN NULL
                WHEN trim(u.updated_at::TEXT) ~ '^\d{4}-\d{2}-\d{2}' THEN u.updated_at::TEXT::TIMESTAMPTZ
                ELSE NULL
              END,
              CASE
                WHEN u.validado_em IS NULL THEN NULL
                WHEN trim(u.validado_em::TEXT) = '' THEN NULL
                WHEN trim(u.validado_em::TEXT) ~ '^\d{4}-\d{2}-\d{2}' THEN u.validado_em::TEXT::TIMESTAMPTZ
                ELSE NULL
              END,
              NOW()
            ) DESC,
            COALESCE(
              CASE
                WHEN u.data_expiracao IS NULL THEN NULL
                WHEN trim(u.data_expiracao::TEXT) ~ '^\d{4}-\d{2}-\d{2}$' THEN u.data_expiracao::TEXT::DATE
                ELSE NULL
              END,
              DATE '1900-01-01'
            ) DESC,
            u.ctid DESC
        ) AS rn
      FROM public.user_fed_lrsj u
      WHERE u.stakeholder_id IS NOT NULL
    ),
    to_remove AS (
      SELECT r.ctid, r.stakeholder_id
      FROM ranked r
      WHERE r.rn > 1
    ),
    logged AS (
      INSERT INTO public.user_fed_lrsj_dedup_log (stakeholder_id, removed_row)
      SELECT u.stakeholder_id, to_jsonb(u)
      FROM public.user_fed_lrsj u
      JOIN to_remove tr ON tr.ctid = u.ctid
      RETURNING 1
    )
    DELETE FROM public.user_fed_lrsj u
    USING to_remove tr
    WHERE u.ctid = tr.ctid;

    GET DIAGNOSTICS removed_duplicates = ROW_COUNT;

    -- Revalidar duplicidades após resolução
    SELECT COUNT(*) INTO has_duplicates
    FROM (
      SELECT stakeholder_id
      FROM public.user_fed_lrsj
      WHERE stakeholder_id IS NOT NULL
      GROUP BY stakeholder_id
      HAVING COUNT(*) > 1
    ) d;

    IF has_duplicates > 0 THEN
      RAISE EXCEPTION '[035] Abortado: ainda existem % duplicidades de stakeholder_id após deduplicação.', has_duplicates;
    END IF;

    RAISE NOTICE '[035] Duplicidades resolvidas. Registros removidos=%', removed_duplicates;
  END IF;

  -- 2) Garantir unicidade em stakeholder_id
  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_fed_lrsj_stakeholder_id_unique
    ON public.user_fed_lrsj(stakeholder_id);

  -- 3) Ajustar PK para stakeholder_id (se necessário)
  SELECT conname, pg_get_constraintdef(oid)
    INTO pk_name, pk_def
  FROM pg_constraint
  WHERE conrelid = 'public.user_fed_lrsj'::regclass
    AND contype = 'p'
  LIMIT 1;

  IF pk_name IS NULL THEN
    ALTER TABLE public.user_fed_lrsj
      ADD CONSTRAINT user_fed_lrsj_pkey PRIMARY KEY (stakeholder_id);
  ELSIF pk_def NOT ILIKE '%(stakeholder_id)%' THEN
    EXECUTE format('ALTER TABLE public.user_fed_lrsj DROP CONSTRAINT %I', pk_name);
    ALTER TABLE public.user_fed_lrsj
      ADD CONSTRAINT user_fed_lrsj_pkey PRIMARY KEY (stakeholder_id);
  END IF;

  -- 4) Remover índices legados dependentes de colunas que serão removidas
  DROP INDEX IF EXISTS public.idx_user_fed_lrsj_numero_membro;

  -- 5) Remover colunas legadas
  ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS id;
  ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS numero_membro;
  ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS graduacao;
  ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS dan;

  RAISE NOTICE '[035] PK definida em stakeholder_id e colunas legadas removidas com sucesso.';
END;
$$;
