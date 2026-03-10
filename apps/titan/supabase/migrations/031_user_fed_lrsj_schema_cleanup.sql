-- Migration 031: Limpeza estrutural de user_fed_lrsj
-- Objetivo:
-- - Remover colunas legadas/duplicadas
-- - Padronizar colunas canônicas usadas pelo app atual
-- - Garantir academia_id como UUID + FK para academias

DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NULL THEN
    RAISE NOTICE '[031] Tabela public.user_fed_lrsj não existe neste ambiente. Migration ignorada.';
    RETURN;
  END IF;
END;
$$;

-- ================================================================
-- 1) Garantir colunas canônicas mínimas usadas no app
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
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS telefone TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS cidade TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS estado TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS endereco_residencia TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS graduacao TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS dan INT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS nivel_arbitragem TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS academias TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS status_membro TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS data_adesao DATE;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS plano_tipo TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS status_plano TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS data_expiracao DATE;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS url_foto TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS url_documento_id TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS url_certificado_dan TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS tamanho_patch TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS lote_id TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS observacoes TEXT;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS validado_por UUID;
  ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END;
$$;

-- ================================================================
-- 2) Resolver academia_id canônico (UUID)
-- ================================================================
CREATE OR REPLACE FUNCTION public.resolve_academia_id_uuid(academia_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resolved UUID;
  normalized TEXT;
BEGIN
  IF academia_text IS NULL OR trim(academia_text) = '' THEN
    RETURN NULL;
  END IF;

  normalized := upper(trim(academia_text));
  normalized := replace(normalized, '•', ' ');
  normalized := replace(normalized, '|', ' ');
  normalized := regexp_replace(normalized, '\s+', ' ', 'g');
  normalized := trim(normalized);

  -- UUID literal
  IF normalized ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN normalized::UUID;
  END IF;

  -- Match por sigla/nome/nome_fantasia
  SELECT a.id INTO resolved
  FROM public.academias a
  WHERE upper(coalesce(a.sigla, '')) = normalized
     OR upper(coalesce(a.nome, '')) = normalized
     OR upper(coalesce(a.nome_fantasia, '')) = normalized
  LIMIT 1;

  IF resolved IS NOT NULL THEN
    RETURN resolved;
  END IF;

  -- Match parcial
  SELECT a.id INTO resolved
  FROM public.academias a
  WHERE upper(coalesce(a.nome, '')) LIKE '%' || normalized || '%'
     OR normalized LIKE '%' || upper(coalesce(a.nome, '')) || '%'
     OR upper(coalesce(a.nome_fantasia, '')) LIKE '%' || normalized || '%'
     OR normalized LIKE '%' || upper(coalesce(a.nome_fantasia, '')) || '%'
  ORDER BY a.nome
  LIMIT 1;

  RETURN resolved;
END;
$$;

DO $$
DECLARE
  academia_id_type TEXT;
BEGIN
  SELECT c.data_type INTO academia_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'user_fed_lrsj'
    AND c.column_name = 'academia_id';

  IF academia_id_type IS NULL THEN
    ALTER TABLE public.user_fed_lrsj ADD COLUMN academia_id UUID;
  ELSIF academia_id_type <> 'uuid' THEN
    ALTER TABLE public.user_fed_lrsj ADD COLUMN IF NOT EXISTS academia_id_uuid UUID;

    UPDATE public.user_fed_lrsj u
    SET academia_id_uuid = public.resolve_academia_id_uuid(u.academia_id::TEXT)
    WHERE academia_id_uuid IS NULL;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_fed_lrsj'
        AND column_name = 'academias'
    ) THEN
      UPDATE public.user_fed_lrsj u
      SET academia_id_uuid = public.resolve_academia_id_uuid(u.academias)
      WHERE academia_id_uuid IS NULL
        AND u.academias IS NOT NULL
        AND trim(u.academias) <> '';
    END IF;

    ALTER TABLE public.user_fed_lrsj DROP COLUMN academia_id;
    ALTER TABLE public.user_fed_lrsj RENAME COLUMN academia_id_uuid TO academia_id;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.academias') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.user_fed_lrsj'::regclass
        AND conname = 'user_fed_lrsj_academia_id_fkey'
    ) THEN
      ALTER TABLE public.user_fed_lrsj
        ADD CONSTRAINT user_fed_lrsj_academia_id_fkey
        FOREIGN KEY (academia_id) REFERENCES public.academias(id) ON DELETE SET NULL;
    END IF;
  END IF;
END;
$$;

-- ================================================================
-- 3) Migrar dados de colunas legadas para canônicas
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_fed_lrsj' AND column_name = 'celular'
  ) THEN
    UPDATE public.user_fed_lrsj
    SET telefone = COALESCE(NULLIF(telefone, ''), NULLIF(celular, ''))
    WHERE COALESCE(NULLIF(celular, ''), NULLIF(telefone, '')) IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_fed_lrsj' AND column_name = 'lote'
  ) THEN
    UPDATE public.user_fed_lrsj
    SET lote_id = COALESCE(NULLIF(lote_id, ''), NULLIF(lote::TEXT, ''))
    WHERE COALESCE(NULLIF(lote_id, ''), NULLIF(lote::TEXT, '')) IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_fed_lrsj' AND column_name = 'foto_perfil_url'
  ) THEN
    UPDATE public.user_fed_lrsj
    SET url_foto = COALESCE(NULLIF(url_foto, ''), NULLIF(foto_perfil_url, ''))
    WHERE COALESCE(NULLIF(url_foto, ''), NULLIF(foto_perfil_url, '')) IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_fed_lrsj' AND column_name = 'foto_documento_url'
  ) THEN
    UPDATE public.user_fed_lrsj
    SET url_documento_id = COALESCE(NULLIF(url_documento_id, ''), NULLIF(foto_documento_url, ''))
    WHERE COALESCE(NULLIF(url_documento_id, ''), NULLIF(foto_documento_url, '')) IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_fed_lrsj' AND column_name = 'certificado_dan_url'
  ) THEN
    UPDATE public.user_fed_lrsj
    SET url_certificado_dan = COALESCE(NULLIF(url_certificado_dan, ''), NULLIF(certificado_dan_url, ''))
    WHERE COALESCE(NULLIF(url_certificado_dan, ''), NULLIF(certificado_dan_url, '')) IS NOT NULL;
  END IF;
END;
$$;

-- ================================================================
-- 4) Remover colunas legadas/redundantes
-- ================================================================
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS cpf;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS rg;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS celular;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS instagram;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS academia_sigla;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS dan_nivel;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS data_graduacao;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS lote;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS foto_perfil_url;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS foto_documento_url;
ALTER TABLE public.user_fed_lrsj DROP COLUMN IF EXISTS certificado_dan_url;

-- ================================================================
-- 5) Índices e auditoria final
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_nome_completo ON public.user_fed_lrsj (nome_completo);
CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_numero_membro ON public.user_fed_lrsj (numero_membro);
CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_academia_id ON public.user_fed_lrsj (academia_id);
CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_kyu_dan_id ON public.user_fed_lrsj (kyu_dan_id);
CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_stakeholder_id ON public.user_fed_lrsj (stakeholder_id);

DO $$
DECLARE
  total_rows BIGINT := 0;
  sem_stakeholder BIGINT := 0;
  sem_academia BIGINT := 0;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM public.user_fed_lrsj;
  SELECT COUNT(*) INTO sem_stakeholder FROM public.user_fed_lrsj WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO sem_academia FROM public.user_fed_lrsj WHERE academia_id IS NULL;

  RAISE NOTICE '[031] user_fed_lrsj total=%', total_rows;
  RAISE NOTICE '[031] user_fed_lrsj sem_stakeholder_id=%', sem_stakeholder;
  RAISE NOTICE '[031] user_fed_lrsj sem_academia_id=%', sem_academia;
END;
$$;
