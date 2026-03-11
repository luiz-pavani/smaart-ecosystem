-- Migration 029: Consolidar stakeholders como fonte canônica
-- Objetivo:
-- 1) Popular stakeholders com dados relevantes de federacoes, academias e user_fed_lrsj
-- 2) Garantir vínculo por stakeholder_id nas 3 tabelas
-- 3) Refletir alterações em stakeholders automaticamente nas tabelas vinculadas

-- Drop legacy triggers that reference non-existent tables (e.g., generated_documents)
DROP TRIGGER IF EXISTS invalidate_athlete_documents ON public.user_fed_lrsj;
DROP TRIGGER IF EXISTS invalidate_athlete_documents ON public.atletas;
-- Drop the function itself (CASCADE removes all triggers using it)
DROP FUNCTION IF EXISTS invalidate_athlete_documents() CASCADE;

DO $$
BEGIN
  IF to_regclass('public.stakeholders') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.stakeholders não existe. Execute as migrations de stakeholders antes da 029.';
  END IF;
END;
$$;

-- ================================================================
-- 1) Garantir coluna stakeholder_id nas tabelas-alvo
-- ================================================================
DO $$
BEGIN
  IF to_regclass('public.federacoes') IS NOT NULL THEN
    ALTER TABLE public.federacoes
      ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_federacoes_stakeholder_id
      ON public.federacoes(stakeholder_id)
      WHERE stakeholder_id IS NOT NULL;
  END IF;

  IF to_regclass('public.academias') IS NOT NULL THEN
    ALTER TABLE public.academias
      ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_academias_stakeholder_id
      ON public.academias(stakeholder_id)
      WHERE stakeholder_id IS NOT NULL;
  END IF;

  IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
    ALTER TABLE public.user_fed_lrsj
      ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES public.stakeholders(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_stakeholder_id
      ON public.user_fed_lrsj(stakeholder_id)
      WHERE stakeholder_id IS NOT NULL;
  END IF;
END;
$$;

-- ================================================================
-- 2) Garantir stakeholders para todos auth.users (idempotente)
-- ================================================================
INSERT INTO public.stakeholders (id, funcao, nome_completo, email, nome_usuario, senha)
SELECT
  au.id,
  CASE
    WHEN UPPER(COALESCE(au.raw_user_meta_data->>'stakeholder_role', 'ATLETA')) IN ('FEDERACAO', 'ACADEMIA', 'ATLETA')
      THEN UPPER(COALESCE(au.raw_user_meta_data->>'stakeholder_role', 'ATLETA'))
    ELSE 'ATLETA'
  END::VARCHAR,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    COALESCE(NULLIF(au.email, ''), 'Usuário')
  ),
  NULLIF(au.email, ''),
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'username', ''),
    'user_' || SUBSTRING(REPLACE(au.id::TEXT, '-', '') FROM 1 FOR 12)
  ),
  NULL
FROM auth.users au
ON CONFLICT (id) DO UPDATE
SET
  nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), stakeholders.nome_completo),
  email = COALESCE(EXCLUDED.email, stakeholders.email),
  nome_usuario = COALESCE(NULLIF(EXCLUDED.nome_usuario, ''), stakeholders.nome_usuario);

-- ================================================================
-- 3) Backfill de links para federacoes e academias via user_roles
-- ================================================================
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL AND to_regclass('public.federacoes') IS NOT NULL THEN
    WITH federacao_owner AS (
      SELECT
        ur.federacao_id,
        ur.user_id,
        ROW_NUMBER() OVER (
          PARTITION BY ur.federacao_id
          ORDER BY ur.created_at ASC, ur.user_id ASC
        ) AS rn
      FROM public.user_roles ur
      WHERE ur.federacao_id IS NOT NULL
        AND ur.role IN ('federacao_admin', 'federacao_secretario', 'master_access')
    )
    UPDATE public.federacoes f
    SET stakeholder_id = fo.user_id
    FROM federacao_owner fo
    WHERE f.id = fo.federacao_id
      AND fo.rn = 1
      AND f.stakeholder_id IS NULL
      AND EXISTS (SELECT 1 FROM public.stakeholders s WHERE s.id = fo.user_id);
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL AND to_regclass('public.academias') IS NOT NULL THEN
    WITH academia_owner AS (
      SELECT
        ur.academia_id,
        ur.user_id,
        ROW_NUMBER() OVER (
          PARTITION BY ur.academia_id
          ORDER BY ur.created_at ASC, ur.user_id ASC
        ) AS rn
      FROM public.user_roles ur
      WHERE ur.academia_id IS NOT NULL
        AND ur.role IN ('academia_admin', 'academia_staff', 'professor', 'master_access')
    )
    UPDATE public.academias a
    SET stakeholder_id = ao.user_id
    FROM academia_owner ao
    WHERE a.id = ao.academia_id
      AND ao.rn = 1
      AND a.stakeholder_id IS NULL
      AND EXISTS (SELECT 1 FROM public.stakeholders s WHERE s.id = ao.user_id);
  END IF;
END;
$$;

-- ================================================================
-- 4) Fallback por email único para academias/federacoes/user_fed_lrsj
-- ================================================================
DO $$
BEGIN
  IF to_regclass('public.federacoes') IS NOT NULL THEN
    WITH stakeholders_email_unique AS (
      SELECT LOWER(email) AS email_norm, MIN(id::TEXT)::UUID AS stakeholder_id
      FROM public.stakeholders
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY LOWER(email)
      HAVING COUNT(*) = 1
    )
    UPDATE public.federacoes f
    SET stakeholder_id = seu.stakeholder_id
    FROM stakeholders_email_unique seu
    WHERE f.stakeholder_id IS NULL
      AND f.email IS NOT NULL
      AND LOWER(f.email) = seu.email_norm;
  END IF;

  IF to_regclass('public.academias') IS NOT NULL THEN
    WITH stakeholders_email_unique AS (
      SELECT LOWER(email) AS email_norm, MIN(id::TEXT)::UUID AS stakeholder_id
      FROM public.stakeholders
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY LOWER(email)
      HAVING COUNT(*) = 1
    )
    UPDATE public.academias a
    SET stakeholder_id = seu.stakeholder_id
    FROM stakeholders_email_unique seu
    WHERE a.stakeholder_id IS NULL
      AND a.responsavel_email IS NOT NULL
      AND LOWER(a.responsavel_email) = seu.email_norm;
  END IF;

  IF to_regclass('public.user_fed_lrsj') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_fed_lrsj'
        AND column_name = 'email'
    ) THEN
    WITH auth_email_unique AS (
      SELECT LOWER(email) AS email_norm, MIN(id::TEXT)::UUID AS user_id
      FROM auth.users
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY LOWER(email)
      HAVING COUNT(*) = 1
    )
    UPDATE public.user_fed_lrsj u
    SET stakeholder_id = aeu.user_id
    FROM auth_email_unique aeu
    WHERE u.stakeholder_id IS NULL
      AND u.email IS NOT NULL
      AND LOWER(u.email) = aeu.email_norm
      AND EXISTS (SELECT 1 FROM public.stakeholders s WHERE s.id = aeu.user_id);
  END IF;
END;
$$;

-- ================================================================
-- 4.1) Fallback extra para user_fed_lrsj via vínculo com academias
-- (cobre bases importadas sem auth.users por atleta)
-- ================================================================
CREATE OR REPLACE FUNCTION public.resolve_academia_stakeholder_id(academia_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_stakeholder_id UUID;
  v_clean_text TEXT;
  v_norm_text TEXT;
BEGIN
  IF academia_text IS NULL OR trim(academia_text) = '' THEN
    RETURN NULL;
  END IF;

  v_clean_text := UPPER(trim(academia_text));
  v_clean_text := REPLACE(v_clean_text, '•', ' ');
  v_clean_text := REPLACE(v_clean_text, '|', ' ');
  v_clean_text := REGEXP_REPLACE(v_clean_text, '\s+', ' ', 'g');
  v_clean_text := trim(v_clean_text);

  v_norm_text := TRANSLATE(
    v_clean_text,
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'AAAAAEEEEIIIIOOOOOUUUUCN'
  );

  SELECT a.stakeholder_id INTO v_stakeholder_id
  FROM public.academias a
  WHERE a.stakeholder_id IS NOT NULL
    AND (
      UPPER(COALESCE(a.sigla, '')) = v_clean_text
      OR UPPER(COALESCE(a.nome, '')) = v_clean_text
      OR UPPER(COALESCE(a.nome_fantasia, '')) = v_clean_text
    )
  LIMIT 1;

  IF v_stakeholder_id IS NOT NULL THEN
    RETURN v_stakeholder_id;
  END IF;

  SELECT a.stakeholder_id INTO v_stakeholder_id
  FROM public.academias a
  WHERE a.stakeholder_id IS NOT NULL
    AND (
      TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.nome, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') = v_norm_text
      OR TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.nome_fantasia, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') = v_norm_text
      OR TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.sigla, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') = v_norm_text
    )
  LIMIT 1;

  IF v_stakeholder_id IS NOT NULL THEN
    RETURN v_stakeholder_id;
  END IF;

  SELECT a.stakeholder_id INTO v_stakeholder_id
  FROM public.academias a
  WHERE a.stakeholder_id IS NOT NULL
    AND (
      TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.nome, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') LIKE '%' || v_norm_text || '%'
      OR v_norm_text LIKE '%' || TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.nome, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') || '%'
      OR TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.nome_fantasia, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') LIKE '%' || v_norm_text || '%'
      OR v_norm_text LIKE '%' || TRANSLATE(UPPER(REGEXP_REPLACE(REPLACE(COALESCE(a.nome_fantasia, ''), '•', ' '), '\s+', ' ', 'g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN') || '%'
    )
  ORDER BY a.nome
  LIMIT 1;

  RETURN v_stakeholder_id;
END;
$$;

DO $$
DECLARE
  has_col_academia_id BOOLEAN := FALSE;
  has_col_academia_sigla BOOLEAN := FALSE;
  has_col_academias BOOLEAN := FALSE;
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL OR to_regclass('public.academias') IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_fed_lrsj'
      AND column_name = 'academia_id'
  ) INTO has_col_academia_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_fed_lrsj'
      AND column_name = 'academia_sigla'
  ) INTO has_col_academia_sigla;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_fed_lrsj'
      AND column_name = 'academias'
  ) INTO has_col_academias;

  IF has_col_academia_id THEN
    EXECUTE '
      UPDATE public.user_fed_lrsj u
      SET stakeholder_id = public.resolve_academia_stakeholder_id(u.academia_id::text)
      WHERE u.stakeholder_id IS NULL
        AND NULLIF(trim(u.academia_id::text), '''') IS NOT NULL
        AND public.resolve_academia_stakeholder_id(u.academia_id::text) IS NOT NULL
    ';
  END IF;

  IF has_col_academia_sigla THEN
    EXECUTE '
      UPDATE public.user_fed_lrsj u
      SET stakeholder_id = public.resolve_academia_stakeholder_id(u.academia_sigla::text)
      WHERE u.stakeholder_id IS NULL
        AND NULLIF(trim(u.academia_sigla::text), '''') IS NOT NULL
        AND public.resolve_academia_stakeholder_id(u.academia_sigla::text) IS NOT NULL
    ';
  END IF;

  IF has_col_academias THEN
    EXECUTE '
      UPDATE public.user_fed_lrsj u
      SET stakeholder_id = public.resolve_academia_stakeholder_id(u.academias::text)
      WHERE u.stakeholder_id IS NULL
        AND NULLIF(trim(u.academias::text), '''') IS NOT NULL
        AND public.resolve_academia_stakeholder_id(u.academias::text) IS NOT NULL
    ';
  END IF;
END;
$$;

-- ================================================================
-- 5) Materializar dados relevantes das 3 tabelas em stakeholders
-- ================================================================
DO $$
BEGIN
  IF to_regclass('public.federacoes') IS NOT NULL THEN
    INSERT INTO public.stakeholders (id, funcao, nome_completo, email, nome_usuario, senha)
    SELECT DISTINCT ON (f.stakeholder_id)
      f.stakeholder_id,
      'FEDERACAO',
      COALESCE(NULLIF(f.nome, ''), 'Federação'),
      NULLIF(f.email, ''),
      'stake_fed_' || SUBSTRING(REPLACE(f.stakeholder_id::TEXT, '-', '') FROM 1 FOR 10),
      NULL
    FROM public.federacoes f
    WHERE f.stakeholder_id IS NOT NULL
    ORDER BY f.stakeholder_id, f.created_at DESC
    ON CONFLICT (id) DO UPDATE
    SET
      funcao = 'FEDERACAO',
      nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), public.stakeholders.nome_completo),
      email = COALESCE(EXCLUDED.email, public.stakeholders.email),
      nome_usuario = COALESCE(NULLIF(public.stakeholders.nome_usuario, ''), EXCLUDED.nome_usuario);
  END IF;

  IF to_regclass('public.academias') IS NOT NULL THEN
    INSERT INTO public.stakeholders (id, funcao, nome_completo, email, nome_usuario, senha)
    SELECT DISTINCT ON (a.stakeholder_id)
      a.stakeholder_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.federacoes f WHERE f.stakeholder_id = a.stakeholder_id) THEN 'FEDERACAO' ELSE 'ACADEMIA' END,
      COALESCE(NULLIF(a.responsavel_nome, ''), NULLIF(a.nome, ''), 'Academia'),
      NULLIF(a.responsavel_email, ''),
      'stake_acad_' || SUBSTRING(REPLACE(a.stakeholder_id::TEXT, '-', '') FROM 1 FOR 10),
      NULL
    FROM public.academias a
    WHERE a.stakeholder_id IS NOT NULL
    ORDER BY a.stakeholder_id, a.created_at DESC
    ON CONFLICT (id) DO UPDATE
    SET
      funcao = CASE WHEN public.stakeholders.funcao = 'FEDERACAO' THEN 'FEDERACAO' ELSE 'ACADEMIA' END,
      nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), public.stakeholders.nome_completo),
      email = COALESCE(EXCLUDED.email, public.stakeholders.email),
      nome_usuario = COALESCE(NULLIF(public.stakeholders.nome_usuario, ''), EXCLUDED.nome_usuario);
  END IF;

  IF to_regclass('public.user_fed_lrsj') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_fed_lrsj'
        AND column_name = 'nome_completo'
    ) THEN
    INSERT INTO public.stakeholders (id, funcao, nome_completo, email, nome_usuario, senha)
    SELECT DISTINCT ON (u.stakeholder_id)
      u.stakeholder_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.federacoes f WHERE f.stakeholder_id = u.stakeholder_id) THEN 'FEDERACAO'
           WHEN EXISTS (SELECT 1 FROM public.academias a WHERE a.stakeholder_id = u.stakeholder_id) THEN 'ACADEMIA'
           ELSE 'ATLETA'
      END,
      COALESCE(NULLIF(u.nome_completo, ''), 'Atleta'),
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'user_fed_lrsj'
            AND column_name = 'email'
        ) THEN NULLIF(u.email, '')
        ELSE NULL
      END,
      'stake_atl_' || SUBSTRING(REPLACE(u.stakeholder_id::TEXT, '-', '') FROM 1 FOR 10),
      NULL
    FROM public.user_fed_lrsj u
    WHERE u.stakeholder_id IS NOT NULL
    ORDER BY u.stakeholder_id
    ON CONFLICT (id) DO UPDATE
    SET
      funcao = CASE
        WHEN public.stakeholders.funcao = 'FEDERACAO' THEN 'FEDERACAO'
        WHEN public.stakeholders.funcao = 'ACADEMIA' THEN 'ACADEMIA'
        ELSE 'ATLETA'
      END,
      nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), public.stakeholders.nome_completo),
      email = COALESCE(EXCLUDED.email, public.stakeholders.email),
      nome_usuario = COALESCE(NULLIF(public.stakeholders.nome_usuario, ''), EXCLUDED.nome_usuario);
  END IF;
END;
$$;

-- ================================================================
-- 6) Sincronização automática: stakeholders -> tabelas de domínio
-- ================================================================
CREATE OR REPLACE FUNCTION public.sync_domain_tables_from_stakeholder()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  has_user_fed_nome BOOLEAN := FALSE;
  has_user_fed_email BOOLEAN := FALSE;
BEGIN
  IF to_regclass('public.federacoes') IS NOT NULL THEN
    UPDATE public.federacoes f
    SET
      nome = COALESCE(NULLIF(NEW.nome_completo, ''), f.nome),
      email = COALESCE(NULLIF(NEW.email, ''), f.email)
    WHERE f.stakeholder_id = NEW.id;
  END IF;

  IF to_regclass('public.academias') IS NOT NULL THEN
    UPDATE public.academias a
    SET
      responsavel_nome = COALESCE(NULLIF(NEW.nome_completo, ''), a.responsavel_nome),
      responsavel_email = COALESCE(NULLIF(NEW.email, ''), a.responsavel_email)
    WHERE a.stakeholder_id = NEW.id;
  END IF;

  IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_fed_lrsj'
        AND column_name = 'nome_completo'
    ) INTO has_user_fed_nome;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_fed_lrsj'
        AND column_name = 'email'
    ) INTO has_user_fed_email;

    IF has_user_fed_nome AND has_user_fed_email THEN
      EXECUTE '
        UPDATE public.user_fed_lrsj u
        SET
          nome_completo = COALESCE(NULLIF($1, ''''), u.nome_completo),
          email = COALESCE(NULLIF($2, ''''), u.email)
        WHERE u.stakeholder_id = $3
      '
      USING NEW.nome_completo, NEW.email, NEW.id;
    ELSIF has_user_fed_nome THEN
      EXECUTE '
        UPDATE public.user_fed_lrsj u
        SET nome_completo = COALESCE(NULLIF($1, ''''), u.nome_completo)
        WHERE u.stakeholder_id = $2
      '
      USING NEW.nome_completo, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_domain_from_stakeholder ON public.stakeholders;

CREATE TRIGGER trg_sync_domain_from_stakeholder
AFTER UPDATE OF nome_completo, email
ON public.stakeholders
FOR EACH ROW
EXECUTE FUNCTION public.sync_domain_tables_from_stakeholder();

-- ================================================================
-- 7) Auditoria de cobertura do vínculo
-- ================================================================
DO $$
DECLARE
  federacoes_total BIGINT := 0;
  federacoes_sem_stakeholder BIGINT := 0;
  academias_total BIGINT := 0;
  academias_sem_stakeholder BIGINT := 0;
  user_fed_total BIGINT := 0;
  user_fed_sem_stakeholder BIGINT := 0;
BEGIN
  IF to_regclass('public.federacoes') IS NOT NULL THEN
    SELECT COUNT(*) INTO federacoes_total FROM public.federacoes;
    SELECT COUNT(*) INTO federacoes_sem_stakeholder FROM public.federacoes WHERE stakeholder_id IS NULL;

    RAISE NOTICE '[029] federacoes total=%, sem_stakeholder_id=%',
      federacoes_total, federacoes_sem_stakeholder;
  END IF;

  IF to_regclass('public.academias') IS NOT NULL THEN
    SELECT COUNT(*) INTO academias_total FROM public.academias;
    SELECT COUNT(*) INTO academias_sem_stakeholder FROM public.academias WHERE stakeholder_id IS NULL;

    RAISE NOTICE '[029] academias total=%, sem_stakeholder_id=%',
      academias_total, academias_sem_stakeholder;
  END IF;

  IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
    SELECT COUNT(*) INTO user_fed_total FROM public.user_fed_lrsj;
    SELECT COUNT(*) INTO user_fed_sem_stakeholder FROM public.user_fed_lrsj WHERE stakeholder_id IS NULL;

    RAISE NOTICE '[029] user_fed_lrsj total=%, sem_stakeholder_id=%',
      user_fed_total, user_fed_sem_stakeholder;
  END IF;
END;
$$;
