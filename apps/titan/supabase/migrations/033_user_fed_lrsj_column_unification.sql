-- Migration 033: Unificação de colunas duplicadas em user_fed_lrsj
-- Objetivo:
-- - Consolidar aliases/duplicadas para nomes canônicos
-- - Renomear conceito de residência para coluna canônica `pais`
-- - Remover colunas redundantes após backfill

DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL THEN
    RAISE NOTICE '[033] Tabela public.user_fed_lrsj não existe neste ambiente. Migration ignorada.';
    RETURN;
  END IF;
END;
$$;

-- ================================================================
-- 1) Garantir colunas canônicas alvo
-- ================================================================
DO $$
BEGIN
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS numero_membro TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS nome_completo TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS nome_patch TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS genero TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS data_nascimento DATE;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS idade INT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS nacionalidade TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS telefone TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS cidade TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS estado TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS pais TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS status_membro TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS data_adesao DATE;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS plano_tipo TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS status_plano TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS data_expiracao DATE;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS url_foto TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS url_documento_id TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS url_certificado_dan TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS tamanho_patch TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS academias TEXT;
END;
$$;

-- ================================================================
-- 2) Funções utilitárias de backfill seguro
-- ================================================================
CREATE OR REPLACE FUNCTION public.try_parse_date(value_text TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parsed_date DATE;
BEGIN
  IF value_text IS NULL OR trim(value_text) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    parsed_date := value_text::DATE;
    RETURN parsed_date;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

DO $$
DECLARE
  data_nascimento_type TEXT;
  data_adesao_type TEXT;
  data_expiracao_type TEXT;
  idade_type TEXT;
BEGIN
  SELECT c.data_type INTO data_nascimento_type
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='user_fed_lrsj' AND c.column_name='data_nascimento';

  SELECT c.data_type INTO data_adesao_type
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='user_fed_lrsj' AND c.column_name='data_adesao';

  SELECT c.data_type INTO data_expiracao_type
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='user_fed_lrsj' AND c.column_name='data_expiracao';

  SELECT c.data_type INTO idade_type
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='user_fed_lrsj' AND c.column_name='idade';

  -- Backfill genérico texto -> texto
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='member_no') THEN
    UPDATE public.user_fed_lrsj SET numero_membro = COALESCE(NULLIF(numero_membro, ''), NULLIF(member_no::TEXT, ''))
    WHERE COALESCE(NULLIF(member_no::TEXT, ''), NULLIF(numero_membro, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='name') THEN
    UPDATE public.user_fed_lrsj SET nome_completo = COALESCE(NULLIF(nome_completo, ''), NULLIF(name::TEXT, ''))
    WHERE COALESCE(NULLIF(name::TEXT, ''), NULLIF(nome_completo, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='patch_name') THEN
    UPDATE public.user_fed_lrsj SET nome_patch = COALESCE(NULLIF(nome_patch, ''), NULLIF(patch_name::TEXT, ''))
    WHERE COALESCE(NULLIF(patch_name::TEXT, ''), NULLIF(nome_patch, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='gender') THEN
    UPDATE public.user_fed_lrsj SET genero = COALESCE(NULLIF(genero, ''), NULLIF(gender::TEXT, ''))
    WHERE COALESCE(NULLIF(gender::TEXT, ''), NULLIF(genero, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='nationality') THEN
    UPDATE public.user_fed_lrsj SET nacionalidade = COALESCE(NULLIF(nacionalidade, ''), NULLIF(nationality::TEXT, ''))
    WHERE COALESCE(NULLIF(nationality::TEXT, ''), NULLIF(nacionalidade, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='phone') THEN
    UPDATE public.user_fed_lrsj SET telefone = COALESCE(NULLIF(telefone, ''), NULLIF(phone::TEXT, ''))
    WHERE COALESCE(NULLIF(phone::TEXT, ''), NULLIF(telefone, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='city') THEN
    UPDATE public.user_fed_lrsj SET cidade = COALESCE(NULLIF(cidade, ''), NULLIF(city::TEXT, ''))
    WHERE COALESCE(NULLIF(city::TEXT, ''), NULLIF(cidade, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='province') THEN
    UPDATE public.user_fed_lrsj SET estado = COALESCE(NULLIF(estado, ''), NULLIF(province::TEXT, ''))
    WHERE COALESCE(NULLIF(province::TEXT, ''), NULLIF(estado, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='member_status') THEN
    UPDATE public.user_fed_lrsj SET status_membro = COALESCE(NULLIF(status_membro, ''), NULLIF(member_status::TEXT, ''))
    WHERE COALESCE(NULLIF(member_status::TEXT, ''), NULLIF(status_membro, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='plan') THEN
    UPDATE public.user_fed_lrsj SET plano_tipo = COALESCE(NULLIF(plano_tipo, ''), NULLIF(plan::TEXT, ''))
    WHERE COALESCE(NULLIF(plan::TEXT, ''), NULLIF(plano_tipo, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='plan_status') THEN
    UPDATE public.user_fed_lrsj SET status_plano = COALESCE(NULLIF(status_plano, ''), NULLIF(plan_status::TEXT, ''))
    WHERE COALESCE(NULLIF(plan_status::TEXT, ''), NULLIF(status_plano, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='foto') THEN
    UPDATE public.user_fed_lrsj SET url_foto = COALESCE(NULLIF(url_foto, ''), NULLIF(foto::TEXT, ''))
    WHERE COALESCE(NULLIF(foto::TEXT, ''), NULLIF(url_foto, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='identidade_img') THEN
    UPDATE public.user_fed_lrsj SET url_documento_id = COALESCE(NULLIF(url_documento_id, ''), NULLIF(identidade_img::TEXT, ''))
    WHERE COALESCE(NULLIF(identidade_img::TEXT, ''), NULLIF(url_documento_id, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='certificado_dan') THEN
    UPDATE public.user_fed_lrsj SET url_certificado_dan = COALESCE(NULLIF(url_certificado_dan, ''), NULLIF(certificado_dan::TEXT, ''))
    WHERE COALESCE(NULLIF(certificado_dan::TEXT, ''), NULLIF(url_certificado_dan, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='patch_size') THEN
    UPDATE public.user_fed_lrsj SET tamanho_patch = COALESCE(NULLIF(tamanho_patch, ''), NULLIF(patch_size::TEXT, ''))
    WHERE COALESCE(NULLIF(patch_size::TEXT, ''), NULLIF(tamanho_patch, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='academies') THEN
    UPDATE public.user_fed_lrsj SET academias = COALESCE(NULLIF(academias, ''), NULLIF(academies::TEXT, ''))
    WHERE COALESCE(NULLIF(academies::TEXT, ''), NULLIF(academias, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='endereco_residencia') THEN
    UPDATE public.user_fed_lrsj SET pais = COALESCE(NULLIF(pais, ''), NULLIF(endereco_residencia::TEXT, ''))
    WHERE COALESCE(NULLIF(endereco_residencia::TEXT, ''), NULLIF(pais, '')) IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='residence') THEN
    UPDATE public.user_fed_lrsj SET pais = COALESCE(NULLIF(pais, ''), NULLIF(residence::TEXT, ''))
    WHERE COALESCE(NULLIF(residence::TEXT, ''), NULLIF(pais, '')) IS NOT NULL;
  END IF;

  -- Backfill com parse para datas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='birthdate') THEN
    IF data_nascimento_type = 'date' THEN
      UPDATE public.user_fed_lrsj
      SET data_nascimento = public.try_parse_date(birthdate::TEXT)
      WHERE data_nascimento IS NULL
        AND birthdate IS NOT NULL
        AND trim(birthdate::TEXT) <> '';
    ELSIF data_nascimento_type IN ('text', 'character varying', 'character') THEN
      UPDATE public.user_fed_lrsj
      SET data_nascimento = COALESCE(
        NULLIF(data_nascimento::TEXT, ''),
        public.try_parse_date(birthdate::TEXT)::TEXT
      )
      WHERE (data_nascimento IS NULL OR trim(data_nascimento::TEXT) = '')
        AND birthdate IS NOT NULL
        AND trim(birthdate::TEXT) <> '';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='member_since') THEN
    IF data_adesao_type = 'date' THEN
      UPDATE public.user_fed_lrsj
      SET data_adesao = public.try_parse_date(member_since::TEXT)
      WHERE data_adesao IS NULL
        AND member_since IS NOT NULL
        AND trim(member_since::TEXT) <> '';
    ELSIF data_adesao_type IN ('text', 'character varying', 'character') THEN
      UPDATE public.user_fed_lrsj
      SET data_adesao = COALESCE(
        NULLIF(data_adesao::TEXT, ''),
        public.try_parse_date(member_since::TEXT)::TEXT
      )
      WHERE (data_adesao IS NULL OR trim(data_adesao::TEXT) = '')
        AND member_since IS NOT NULL
        AND trim(member_since::TEXT) <> '';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='expire_date') THEN
    IF data_expiracao_type = 'date' THEN
      UPDATE public.user_fed_lrsj
      SET data_expiracao = public.try_parse_date(expire_date::TEXT)
      WHERE data_expiracao IS NULL
        AND expire_date IS NOT NULL
        AND trim(expire_date::TEXT) <> '';
    ELSIF data_expiracao_type IN ('text', 'character varying', 'character') THEN
      UPDATE public.user_fed_lrsj
      SET data_expiracao = COALESCE(
        NULLIF(data_expiracao::TEXT, ''),
        public.try_parse_date(expire_date::TEXT)::TEXT
      )
      WHERE (data_expiracao IS NULL OR trim(data_expiracao::TEXT) = '')
        AND expire_date IS NOT NULL
        AND trim(expire_date::TEXT) <> '';
    END IF;
  END IF;

  -- Backfill para idade inteira
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_fed_lrsj' AND column_name='age') THEN
    IF idade_type IN ('smallint', 'integer', 'bigint') THEN
      UPDATE public.user_fed_lrsj
      SET idade = COALESCE(idade, NULLIF(regexp_replace(age::TEXT, '[^0-9]', '', 'g'), '')::INT)
      WHERE idade IS NULL
        AND age IS NOT NULL
        AND NULLIF(regexp_replace(age::TEXT, '[^0-9]', '', 'g'), '') IS NOT NULL;
    ELSIF idade_type IN ('text', 'character varying', 'character') THEN
      UPDATE public.user_fed_lrsj
      SET idade = COALESCE(
        NULLIF(idade::TEXT, ''),
        NULLIF(regexp_replace(age::TEXT, '[^0-9]', '', 'g'), '')
      )
      WHERE (idade IS NULL OR trim(idade::TEXT) = '')
        AND age IS NOT NULL
        AND NULLIF(regexp_replace(age::TEXT, '[^0-9]', '', 'g'), '') IS NOT NULL;
    END IF;
  END IF;
END;
$$;

-- ================================================================
-- 3) Remover aliases/colunas redundantes
-- ================================================================
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS member_no;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS name;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS patch_name;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS gender;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS birthdate;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS age;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS nationality;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS phone;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS city;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS province;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS endereco_residencia;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS residence;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS member_status;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS member_since;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS plan;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS plan_status;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS expire_date;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS foto;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS identidade_img;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS certificado_dan;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS patch_size;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS academies;

-- ================================================================
-- 4) Auditoria final da unificação
-- ================================================================
DO $$
DECLARE
  total_rows BIGINT := 0;
  sem_stakeholder BIGINT := 0;
  sem_academia BIGINT := 0;
  sem_pais BIGINT := 0;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM public.user_fed_lrsj;
  SELECT COUNT(*) INTO sem_stakeholder FROM public.user_fed_lrsj WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO sem_academia FROM public.user_fed_lrsj WHERE academia_id IS NULL;
  SELECT COUNT(*) INTO sem_pais FROM public.user_fed_lrsj WHERE pais IS NULL;

  RAISE NOTICE '[033] user_fed_lrsj total=%', total_rows;
  RAISE NOTICE '[033] user_fed_lrsj sem_stakeholder_id=%', sem_stakeholder;
  RAISE NOTICE '[033] user_fed_lrsj sem_academia_id=%', sem_academia;
  RAISE NOTICE '[033] user_fed_lrsj sem_pais=%', sem_pais;
END;
$$;
