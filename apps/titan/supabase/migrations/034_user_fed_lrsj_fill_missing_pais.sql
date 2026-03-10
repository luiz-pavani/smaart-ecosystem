-- Migration 034: Preencher pais residual em user_fed_lrsj
-- Objetivo:
-- - Fechar pendências residuais de pais após migração 033
-- - Preencher somente registros ainda vazios com valor padrão 'Brasil'
-- - Manter operação idempotente e auditável

DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL THEN
    RAISE NOTICE '[034] Tabela public.user_fed_lrsj não existe neste ambiente. Migration ignorada.';
    RETURN;
  END IF;
END;
$$;

DO $$
DECLARE
  pais_type TEXT;
  before_missing BIGINT := 0;
  after_missing BIGINT := 0;
  filled_rows BIGINT := 0;
BEGIN
  SELECT c.data_type INTO pais_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'user_fed_lrsj'
    AND c.column_name = 'pais';

  IF pais_type IS NULL THEN
    RAISE NOTICE '[034] Coluna pais não existe em public.user_fed_lrsj. Migration ignorada.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO before_missing
  FROM public.user_fed_lrsj
  WHERE pais IS NULL OR trim(pais::TEXT) = '';

  UPDATE public.user_fed_lrsj
  SET pais = 'Brasil'
  WHERE pais IS NULL OR trim(pais::TEXT) = '';

  GET DIAGNOSTICS filled_rows = ROW_COUNT;

  SELECT COUNT(*) INTO after_missing
  FROM public.user_fed_lrsj
  WHERE pais IS NULL OR trim(pais::TEXT) = '';

  RAISE NOTICE '[034] user_fed_lrsj sem_pais antes=%', before_missing;
  RAISE NOTICE '[034] user_fed_lrsj preenchidos_com_Brasil=%', filled_rows;
  RAISE NOTICE '[034] user_fed_lrsj sem_pais depois=%', after_missing;
END;
$$;
