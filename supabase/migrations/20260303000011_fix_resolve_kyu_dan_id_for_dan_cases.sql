-- ============================================================
-- Corrigir resolve_kyu_dan_id para casos Dan (6º/7º/8º etc)
-- Data: 2026-03-03
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_kyu_dan_id(
  graduacao_text TEXT,
  dan_numeric INT DEFAULT NULL,
  dan_nivel_text TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resolved_id BIGINT;
  normalized_graduacao TEXT;
  resolved_dan INT;
  dan_from_text INT;
BEGIN
  resolved_dan := COALESCE(dan_numeric, public.map_dan_nivel_to_number(dan_nivel_text));

  -- Prioridade 1: dan explícito informado em campo dedicado
  IF resolved_dan IS NOT NULL AND resolved_dan BETWEEN 1 AND 10 THEN
    SELECT kd.id
    INTO resolved_id
    FROM public.kyu_dan kd
    WHERE lower(kd.kyu_dan) = lower(format('%sº dan', resolved_dan))
    LIMIT 1;

    IF resolved_id IS NOT NULL THEN
      RETURN resolved_id;
    END IF;
  END IF;

  IF graduacao_text IS NULL OR trim(graduacao_text) = '' THEN
    RETURN NULL;
  END IF;

  normalized_graduacao := UPPER(trim(graduacao_text));

  -- Prioridade 2: qualquer graduação com DAN no texto
  IF normalized_graduacao LIKE '%DAN%' THEN
    dan_from_text := NULLIF(substring(normalized_graduacao FROM '([0-9]{1,2})'), '')::INT;

    IF dan_from_text IS NOT NULL AND dan_from_text BETWEEN 1 AND 10 THEN
      SELECT kd.id
      INTO resolved_id
      FROM public.kyu_dan kd
      WHERE lower(kd.kyu_dan) = lower(format('%sº dan', dan_from_text))
      LIMIT 1;
    ELSIF normalized_graduacao LIKE '%VERMELHA E BRANCA%' THEN
      -- fallback seguro para faixa vermelha e branca sem número explícito
      SELECT kd.id
      INTO resolved_id
      FROM public.kyu_dan kd
      WHERE lower(kd.kyu_dan) = '6º dan'
      LIMIT 1;
    ELSE
      SELECT kd.id
      INTO resolved_id
      FROM public.kyu_dan kd
      WHERE lower(kd.kyu_dan) = '1º dan'
      LIMIT 1;
    END IF;

    IF resolved_id IS NOT NULL THEN
      RETURN resolved_id;
    END IF;
  END IF;

  -- Kyu/belts (sem Dan)
  IF normalized_graduacao LIKE '%BRANCA E CINZA%' OR normalized_graduacao LIKE '%11%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '11º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%CINZA E AZUL%' OR normalized_graduacao LIKE '%9%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '9º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%AZUL E AMARELA%' OR normalized_graduacao LIKE '%7%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '7º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%AMARELA E LARANJA%' OR normalized_graduacao LIKE '%5%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '5º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%MŪKYŪ%' OR normalized_graduacao LIKE '%MUKYU%' OR normalized_graduacao LIKE 'BRANCA |%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = 'mūkyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%10%' OR normalized_graduacao LIKE '%CINZA%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '10º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%8%' OR normalized_graduacao LIKE '%AZUL%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '8º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%6%' OR normalized_graduacao LIKE '%AMARELA%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '6º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%4%' OR normalized_graduacao LIKE '%LARANJA%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '4º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%3%' OR normalized_graduacao LIKE '%VERDE%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '3º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%2%' OR normalized_graduacao LIKE '%ROXA%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '2º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%1%' OR normalized_graduacao LIKE '%MARROM%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '1º kyū' LIMIT 1;
  ELSIF normalized_graduacao LIKE '%PRETA%' OR normalized_graduacao LIKE '%YUDANSHA%' THEN
    SELECT id INTO resolved_id FROM public.kyu_dan WHERE kyu_dan = '1º dan' LIMIT 1;
  END IF;

  RETURN resolved_id;
END;
$$;

-- Reprocessa registros Dan para corrigir mapeamentos antigos
UPDATE public.user_fed_lrsj u
SET kyu_dan_id = public.resolve_kyu_dan_id(
  u.graduacao,
  NULLIF(regexp_replace(COALESCE(u.dan::TEXT, ''), '[^0-9]', '', 'g'), '')::INT,
  NULL
)
WHERE u.graduacao IS NOT NULL
  AND trim(u.graduacao) <> ''
  AND upper(u.graduacao) LIKE '%DAN%';
