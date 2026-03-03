-- ============================================================
-- MIGRATION: Vincular user_fed_lrsj à tabela academias
-- ============================================================
-- Esta migration cria relacionamento FK entre user_fed_lrsj.academia_id
-- e academias.id, seguindo o padrão de normalização

-- ============================================================
-- 1. CRIAR COLUNA academia_id
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
    -- Adicionar coluna academia_id se não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'user_fed_lrsj' 
        AND column_name = 'academia_id'
    ) THEN
      ALTER TABLE public.user_fed_lrsj
      ADD COLUMN academia_id UUID REFERENCES public.academias(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Coluna academia_id adicionada a user_fed_lrsj';
    ELSE
      RAISE NOTICE 'Coluna academia_id já existe em user_fed_lrsj';
    END IF;
    
    -- Criar índice para performance
    CREATE INDEX IF NOT EXISTS idx_user_fed_lrsj_academia_id ON public.user_fed_lrsj (academia_id);
  END IF;
END $$;

-- ============================================================
-- 2. FUNÇÃO DE RESOLUÇÃO: Mapear texto de academia para ID
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_academia_id(academia_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_academia_id UUID;
    v_clean_text TEXT;
BEGIN
    -- Se academia_text for NULL ou vazio, retornar NULL
    IF academia_text IS NULL OR TRIM(academia_text) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Limpar texto
    v_clean_text := UPPER(TRIM(academia_text));
    
    -- 1. Tentar match exato por nome
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE UPPER(nome) = v_clean_text
    LIMIT 1;
    
    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;
    
    -- 2. Tentar match por sigla
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE UPPER(sigla) = v_clean_text
    LIMIT 1;
    
    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;
    
    -- 3. Tentar match parcial por nome (LIKE)
    SELECT id INTO v_academia_id
    FROM public.academias
    WHERE UPPER(nome) LIKE '%' || v_clean_text || '%'
       OR v_clean_text LIKE '%' || UPPER(nome) || '%'
    ORDER BY 
        CASE 
            WHEN UPPER(nome) = v_clean_text THEN 1
            WHEN UPPER(nome) LIKE v_clean_text || '%' THEN 2
            WHEN UPPER(nome) LIKE '%' || v_clean_text THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    IF v_academia_id IS NOT NULL THEN
        RETURN v_academia_id;
    END IF;
    
    -- 4. Mapeamentos hardcoded para casos conhecidos
    -- (baseado nos filtros da página)
    IF v_clean_text LIKE '%SANTA MARIA%' OR v_clean_text LIKE '%SMJ%' THEN
        SELECT id INTO v_academia_id FROM public.academias WHERE UPPER(sigla) = 'SMJ' OR UPPER(nome) LIKE '%SANTA MARIA%' LIMIT 1;
        IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;
    
    IF v_clean_text LIKE '%CAJU%' OR v_clean_text = 'CAJU' THEN
        SELECT id INTO v_academia_id FROM public.academias WHERE UPPER(sigla) = 'CAJU' OR UPPER(nome) LIKE '%CAJU%' LIMIT 1;
        IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;
    
    IF v_clean_text LIKE '%CASTELO BRANCO%' THEN
        SELECT id INTO v_academia_id FROM public.academias WHERE UPPER(nome) LIKE '%CASTELO BRANCO%' LIMIT 1;
        IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;
    
    IF v_clean_text LIKE '%OSL%' THEN
        SELECT id INTO v_academia_id FROM public.academias WHERE UPPER(sigla) = 'OSL' OR UPPER(nome) LIKE '%OSL%' LIMIT 1;
        IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;

    IF v_clean_text LIKE '%TANEMAKI%' THEN
        SELECT id INTO v_academia_id FROM public.academias WHERE UPPER(nome) LIKE '%TANEMAKI%' LIMIT 1;
        IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;

    IF v_clean_text LIKE '%JUDOCAS DO FUTURO%' OR v_clean_text LIKE '%PROJETO JUDOCAS%' THEN
        SELECT id INTO v_academia_id FROM public.academias WHERE UPPER(nome) LIKE '%JUDOCAS%FUTURO%' LIMIT 1;
        IF v_academia_id IS NOT NULL THEN RETURN v_academia_id; END IF;
    END IF;
    
    -- Retornar NULL se não encontrar match
    RETURN NULL;
END;
$$;

-- ============================================================
-- 3. BACKFILL: Mapear dados existentes
-- ============================================================
DO $$
DECLARE
    v_updated_count INT := 0;
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
    RAISE NOTICE 'Iniciando backfill de academia_id em user_fed_lrsj...';
    
    -- Atualizar academia_id baseado no campo texto 'academias'
    UPDATE public.user_fed_lrsj
    SET academia_id = public.resolve_academia_id(academias)
    WHERE academia_id IS NULL
      AND academias IS NOT NULL
      AND TRIM(academias) != '';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Backfill concluído: % registros atualizados', v_updated_count;
  END IF;
END $$;

-- ============================================================
-- 4. TRIGGER: Auto-resolver academia_id em INSERT/UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_fed_lrsj_academia_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Se academias (texto) foi alterado, tentar resolver academia_id
    IF NEW.academias IS NOT NULL AND TRIM(NEW.academias) != '' THEN
        NEW.academia_id := public.resolve_academia_id(NEW.academias);
    ELSE
        -- Se academias está vazio, limpar academia_id
        NEW.academia_id := NULL;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, manter o registro mas registrar warning
        RAISE WARNING 'Erro ao resolver academia_id para "%": %', NEW.academias, SQLERRM;
        RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_user_fed_lrsj_set_academia_id ON public.user_fed_lrsj;

CREATE TRIGGER trg_user_fed_lrsj_set_academia_id
BEFORE INSERT OR UPDATE OF academias ON public.user_fed_lrsj
FOR EACH ROW
EXECUTE FUNCTION public.set_user_fed_lrsj_academia_id();

-- ============================================================
-- 5. RELATÓRIO DIAGNÓSTICO
-- ============================================================
DO $$
DECLARE
    v_total INT;
    v_mapped INT;
    v_unmapped INT;
    v_percent NUMERIC;
    rec RECORD;
BEGIN
    IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
        SELECT 
            COUNT(*),
            COUNT(academia_id),
            COUNT(*) - COUNT(academia_id)
        INTO v_total, v_mapped, v_unmapped
        FROM public.user_fed_lrsj;
        
        v_percent := ROUND(100.0 * v_mapped / NULLIF(v_total, 0), 2);
        
        RAISE NOTICE '';
        RAISE NOTICE '=== DIAGNÓSTICO: Vínculo user_fed_lrsj -> academias ===';
        RAISE NOTICE 'Total de registros: %', v_total;
        RAISE NOTICE 'Registros com academia_id: %', v_mapped;
        RAISE NOTICE 'Registros sem academia_id: %', v_unmapped;
        RAISE NOTICE 'Percentual mapeado: %%%', v_percent;
        
        IF v_unmapped > 0 THEN
            RAISE NOTICE '';
            RAISE NOTICE 'Academias não mapeadas (top 10):';
            FOR rec IN (
                SELECT academias, COUNT(*) as qtd
                FROM public.user_fed_lrsj
                WHERE academia_id IS NULL
                  AND academias IS NOT NULL
                  AND TRIM(academias) != ''
                GROUP BY academias
                ORDER BY COUNT(*) DESC
                LIMIT 10
            ) LOOP
                RAISE NOTICE '  - "%": % ocorrências', rec.academias, rec.qtd;
            END LOOP;
        ELSE
            RAISE NOTICE '✅ Todas as academias foram mapeadas com sucesso!';
        END IF;
    END IF;
END $$;

-- ============================================================
-- 6. COMENTÁRIOS E METADADOS
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.user_fed_lrsj') IS NOT NULL THEN
    COMMENT ON COLUMN public.user_fed_lrsj.academia_id IS 'FK para academia em public.academias - auto-resolvida via trigger';
    COMMENT ON COLUMN public.user_fed_lrsj.academias IS 'Campo texto legado - mantido por compatibilidade. Use academia_id para queries.';
  END IF;
END $$;
