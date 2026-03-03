-- ============================================================
-- Blindagem kyu_dan_id para graduações Dan em user_fed_lrsj
-- Data: 2026-03-03
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL THEN
    RAISE NOTICE 'Tabela public.user_fed_lrsj não existe. Migração ignorada.';
    RETURN;
  END IF;

  -- Recalcula kyu_dan_id para graduações com Dan
  UPDATE public.user_fed_lrsj u
  SET kyu_dan_id = public.resolve_kyu_dan_id(
    u.graduacao,
    NULLIF(regexp_replace(COALESCE(u.dan::TEXT, ''), '[^0-9]', '', 'g'), '')::INT,
    NULL
  )
  WHERE u.graduacao IS NOT NULL
    AND trim(u.graduacao) <> ''
    AND upper(u.graduacao) LIKE '%DAN%'
    AND public.resolve_kyu_dan_id(
      u.graduacao,
      NULLIF(regexp_replace(COALESCE(u.dan::TEXT, ''), '[^0-9]', '', 'g'), '')::INT,
      NULL
    ) IS NOT NULL
    AND (u.kyu_dan_id IS NULL OR u.kyu_dan_id IS DISTINCT FROM public.resolve_kyu_dan_id(
      u.graduacao,
      NULLIF(regexp_replace(COALESCE(u.dan::TEXT, ''), '[^0-9]', '', 'g'), '')::INT,
      NULL
    ));

  -- Reforça trigger automático para manter consistência no futuro
  CREATE OR REPLACE FUNCTION public.set_user_fed_lrsj_kyu_dan_id()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $fn$
  BEGIN
    NEW.kyu_dan_id := public.resolve_kyu_dan_id(
      NEW.graduacao,
      NULLIF(regexp_replace(COALESCE(NEW.dan::TEXT, ''), '[^0-9]', '', 'g'), '')::INT,
      NULL
    );

    IF NEW.graduacao IS NOT NULL AND trim(NEW.graduacao) <> '' AND NEW.kyu_dan_id IS NULL THEN
      RAISE EXCEPTION 'Graduação inválida: %, cadastre em public.kyu_dan antes de salvar.', NEW.graduacao;
    END IF;

    RETURN NEW;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS trg_user_fed_lrsj_set_kyu_dan_id ON public.user_fed_lrsj;

  CREATE TRIGGER trg_user_fed_lrsj_set_kyu_dan_id
  BEFORE INSERT OR UPDATE OF graduacao, dan
  ON public.user_fed_lrsj
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_fed_lrsj_kyu_dan_id();
END;
$$;
