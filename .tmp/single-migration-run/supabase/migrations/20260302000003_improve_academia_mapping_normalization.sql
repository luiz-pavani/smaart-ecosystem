-- ============================================================
-- IMPROVEMENT: Melhorar mapeamento de academias (normalização)
-- ============================================================
-- Objetivo: reduzir registros sem academia_id em user_fed_lrsj
-- tratando acentos, símbolos e variações de texto.

CREATE OR REPLACE FUNCTION public.resolve_academia_id(academia_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_academia_id UUID;
    v_clean_text TEXT;
    v_norm_text TEXT;
BEGIN
    IF academia_text IS NULL OR TRIM(academia_text) = '' THEN
        RETURN NULL;
    END IF;

    -- Limpeza básica
    v_clean_text := UPPER(TRIM(academia_text));

    -- Remover símbolos comuns e normalizar espaços
    v_clean_text := REPLACE(v_clean_text, '•', ' ');
    v_clean_text := REPLACE(v_clean_text, '|', ' ');
    v_clean_text := REGEXP_REPLACE(v_clean_text, '\s+', ' ', 'g');
    v_clean_text := TRIM(v_clean_text);

    -- Normalização de acentos (manual)
    v_norm_text := TRANSLATE(
        v_clean_text,
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'AAAAAEEEEIIIIOOOOOUUUUCN'
    );

    -- 1) Match exato por nome
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE UPPER(nome) = v_clean_text
    LIMIT 1;

    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;

    -- 2) Match exato por sigla
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE UPPER(sigla) = v_clean_text
    LIMIT 1;

    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;

    -- 3) Match por nome normalizado (acentos/símbolos)
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE TRANSLATE(
            UPPER(REGEXP_REPLACE(REPLACE(nome, '•', ' '), '\s+', ' ', 'g')),
            'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'AAAAAEEEEIIIIOOOOOUUUUCN'
          ) = v_norm_text
    LIMIT 1;

    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;

    -- 4) Match parcial por nome normalizado
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE TRANSLATE(
            UPPER(REGEXP_REPLACE(REPLACE(nome, '•', ' '), '\s+', ' ', 'g')),
            'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'AAAAAEEEEIIIIOOOOOUUUUCN'
          ) LIKE '%' || v_norm_text || '%'
       OR v_norm_text LIKE '%' || TRANSLATE(
            UPPER(REGEXP_REPLACE(REPLACE(nome, '•', ' '), '\s+', ' ', 'g')),
            'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'AAAAAEEEEIIIIOOOOOUUUUCN'
          ) || '%'
    ORDER BY nome
    LIMIT 1;

    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;

    -- 5) Mapeamentos específicos conhecidos
    IF v_norm_text LIKE '%SANTA MARIA%' OR v_norm_text LIKE '%SMJ%' THEN
      SELECT id INTO v_academia_id
      FROM public.academias
      WHERE UPPER(sigla) = 'SMJ'
         OR TRANSLATE(UPPER(nome), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') LIKE '%SANTA MARIA%'
      LIMIT 1;
      IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;

    IF v_norm_text LIKE '%CAJU%' THEN
      SELECT id INTO v_academia_id
      FROM public.academias
      WHERE UPPER(sigla) = 'CAJU'
         OR TRANSLATE(UPPER(nome), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') LIKE '%CAJU%'
      LIMIT 1;
      IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;

    IF v_norm_text LIKE '%TANEMAKI%' THEN
      SELECT id INTO v_academia_id
      FROM public.academias
      WHERE TRANSLATE(UPPER(nome), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') LIKE '%TANEMAKI%'
      LIMIT 1;
      IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;

    IF v_norm_text LIKE '%JUDOCAS%FUTURO%' THEN
      SELECT id INTO v_academia_id
      FROM public.academias
      WHERE TRANSLATE(UPPER(nome), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') LIKE '%JUDOCAS%FUTURO%'
      LIMIT 1;
      IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- Reprocessar pendentes
UPDATE public.user_fed_lrsj
SET academia_id = public.resolve_academia_id(academias)
WHERE academia_id IS NULL
  AND academias IS NOT NULL
  AND TRIM(academias) <> '';

-- Auditoria final
DO $$
DECLARE
  v_total INT;
  v_com_fk INT;
  v_sem_fk INT;
  rec RECORD;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE academia_id IS NOT NULL), COUNT(*) FILTER (WHERE academia_id IS NULL)
  INTO v_total, v_com_fk, v_sem_fk
  FROM public.user_fed_lrsj;

  RAISE NOTICE '=== AUDITORIA APÓS NORMALIZAÇÃO ===';
  RAISE NOTICE 'Total user_fed_lrsj: %', v_total;
  RAISE NOTICE 'Com academia_id: %', v_com_fk;
  RAISE NOTICE 'Sem academia_id: %', v_sem_fk;
  RAISE NOTICE 'Percentual: %%%', ROUND(100.0 * v_com_fk / NULLIF(v_total, 0), 2);

  IF v_sem_fk > 0 THEN
    RAISE NOTICE 'Top não mapeadas:';
    FOR rec IN (
      SELECT academias, COUNT(*) AS qtd
      FROM public.user_fed_lrsj
      WHERE academia_id IS NULL
        AND academias IS NOT NULL
        AND TRIM(academias) <> ''
      GROUP BY academias
      ORDER BY COUNT(*) DESC
      LIMIT 20
    ) LOOP
      RAISE NOTICE '  - "%": %', rec.academias, rec.qtd;
    END LOOP;
  END IF;
END $$;
