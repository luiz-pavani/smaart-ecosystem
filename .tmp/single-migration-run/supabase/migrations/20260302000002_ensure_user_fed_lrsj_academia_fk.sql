-- ============================================================
-- FIX: Garantir FK user_fed_lrsj.academia_id -> academias.id
-- ============================================================
-- Motivo: em alguns ambientes a coluna academia_id está como TEXT
-- (legado), o que impede criar FK e quebra relações PostgREST.

DO $$
DECLARE
  v_col_type TEXT;
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL OR to_regclass('public.academias') IS NULL THEN
    RAISE NOTICE 'Tabelas necessárias não encontradas. Pulando.';
    RETURN;
  END IF;

  SELECT data_type
  INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_fed_lrsj'
    AND column_name = 'academia_id';

  IF v_col_type IS NULL THEN
    ALTER TABLE public.user_fed_lrsj
      ADD COLUMN academia_id UUID;
    RAISE NOTICE 'Coluna academia_id criada como UUID.';
  ELSIF v_col_type <> 'uuid' THEN
    RAISE NOTICE 'academia_id atual = %, iniciando conversão para UUID...', v_col_type;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_fed_lrsj'
        AND column_name = 'academia_id_uuid'
    ) THEN
      ALTER TABLE public.user_fed_lrsj
        ADD COLUMN academia_id_uuid UUID;
    END IF;

    -- 1) reaproveita valores UUID válidos já existentes em academia_id (TEXT)
    UPDATE public.user_fed_lrsj
    SET academia_id_uuid = academia_id::uuid
    WHERE academia_id_uuid IS NULL
      AND academia_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

    -- 2) para os demais, tenta resolver via campo texto legado academias
    UPDATE public.user_fed_lrsj
    SET academia_id_uuid = public.resolve_academia_id(academias)
    WHERE academia_id_uuid IS NULL
      AND academias IS NOT NULL
      AND TRIM(academias) <> '';

    ALTER TABLE public.user_fed_lrsj
      DROP COLUMN academia_id;

    ALTER TABLE public.user_fed_lrsj
      RENAME COLUMN academia_id_uuid TO academia_id;

    RAISE NOTICE 'Conversão academia_id -> UUID concluída.';
  ELSE
    RAISE NOTICE 'academia_id já está como UUID.';
  END IF;

  -- remove FK quebrada, se existir
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_fed_lrsj'::regclass
      AND conname = 'user_fed_lrsj_academia_id_fkey'
  ) THEN
    ALTER TABLE public.user_fed_lrsj
      DROP CONSTRAINT user_fed_lrsj_academia_id_fkey;
  END IF;

  -- cria FK correta
  ALTER TABLE public.user_fed_lrsj
    ADD CONSTRAINT user_fed_lrsj_academia_id_fkey
    FOREIGN KEY (academia_id)
    REFERENCES public.academias(id)
    ON DELETE SET NULL
    NOT VALID;

  BEGIN
    ALTER TABLE public.user_fed_lrsj
      VALIDATE CONSTRAINT user_fed_lrsj_academia_id_fkey;
    RAISE NOTICE 'FK user_fed_lrsj_academia_id_fkey validada.';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'FK criada mas não validada agora: %', SQLERRM;
  END;

  CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_academia_id
    ON public.user_fed_lrsj (academia_id);
END $$;

-- Diagnóstico de vínculo de academias com federação
DO $$
DECLARE
  v_total_academias INT;
  v_sem_federacao INT;
  v_total_user_fed INT;
  v_user_fed_com_academia INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE federacao_id IS NULL)
  INTO v_total_academias, v_sem_federacao
  FROM public.academias;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE academia_id IS NOT NULL)
  INTO v_total_user_fed, v_user_fed_com_academia
  FROM public.user_fed_lrsj;

  RAISE NOTICE 'Academias total: %', v_total_academias;
  RAISE NOTICE 'Academias sem federacao_id: %', v_sem_federacao;
  RAISE NOTICE 'user_fed_lrsj total: %', v_total_user_fed;
  RAISE NOTICE 'user_fed_lrsj com academia_id: %', v_user_fed_com_academia;
END $$;
