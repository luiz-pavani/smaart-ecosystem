-- ============================================================
-- FIX: Mapear todas graduações não encontradas em user_fed_lrsj
-- ============================================================
-- Esta migration garante que TODOS os registros em user_fed_lrsj
-- tenham um kyu_dan_id válido, criando graduações genéricas quando necessário

-- 1. DIAGNÓSTICO: Verificar graduações não mapeadas
DO $$
DECLARE
    v_total INT;
    v_mapped INT;
    v_unmapped INT;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(kyu_dan_id),
        COUNT(*) - COUNT(kyu_dan_id)
    INTO v_total, v_mapped, v_unmapped
    FROM public.user_fed_lrsj;
    
    RAISE NOTICE '=== DIAGNÓSTICO user_fed_lrsj ===';
    RAISE NOTICE 'Total de registros: %', v_total;
    RAISE NOTICE 'Registros mapeados: %', v_mapped;
    RAISE NOTICE 'Registros NÃO mapeados: %', v_unmapped;
    RAISE NOTICE 'Percentual mapeado: %%%', ROUND(100.0 * v_mapped / NULLIF(v_total, 0), 2);
END $$;

-- 2. CRIAR GRADUAÇÃO PADRÃO PARA NÃO MAPEADOS
-- Inserir graduação genérica caso não exista
INSERT INTO public.kyu_dan (cor_faixa, kyu_dan, icones, ordem, ativo, created_at, updated_at)
VALUES 
    ('NÃO ESPECIFICADA', 'Graduação não especificada', '❓', 999, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. ESTRATÉGIA DE MAPEAMENTO MELHORADO
-- Atualizar função resolve_kyu_dan_id para incluir fallback mais robusto
DROP FUNCTION IF EXISTS public.resolve_kyu_dan_id(TEXT, INT, TEXT);
DROP FUNCTION IF EXISTS public.resolve_kyu_dan_id(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.resolve_kyu_dan_id(
    graduacao_text TEXT,
    dan_numeric INT DEFAULT NULL,
    dan_nivel_text TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_kyu_dan_id INT;
    v_dan_as_int INT;
    v_clean_graduacao TEXT;
BEGIN
    -- Se graduacao_text for NULL ou vazio, buscar graduação padrão
    IF graduacao_text IS NULL OR TRIM(graduacao_text) = '' THEN
        SELECT id INTO v_kyu_dan_id
        FROM public.kyu_dan
        WHERE ordem = 999
        LIMIT 1;
        
        RETURN v_kyu_dan_id;
    END IF;
    
    -- Limpar graduacao_text
    v_clean_graduacao := UPPER(TRIM(graduacao_text));
    
    -- 1. Tentar match exato por cor_faixa
    SELECT id INTO v_kyu_dan_id
    FROM public.kyu_dan
    WHERE UPPER(cor_faixa) = v_clean_graduacao
    LIMIT 1;
    
    IF v_kyu_dan_id IS NOT NULL THEN
        RETURN v_kyu_dan_id;
    END IF;
    
    -- 2. Tentar match parcial por cor_faixa (contém)
    SELECT id INTO v_kyu_dan_id
    FROM public.kyu_dan
    WHERE UPPER(cor_faixa) LIKE '%' || v_clean_graduacao || '%'
       OR v_clean_graduacao LIKE '%' || UPPER(cor_faixa) || '%'
    ORDER BY ordem
    LIMIT 1;
    
    IF v_kyu_dan_id IS NOT NULL THEN
        RETURN v_kyu_dan_id;
    END IF;
    
    -- 3. Para graduações com DAN, tentar mapear por nível
    IF dan_nivel_text IS NOT NULL OR dan_numeric IS NOT NULL THEN
        -- Converter dan_nivel_text para número se fornecido
        IF dan_nivel_text IS NOT NULL THEN
            v_dan_as_int := public.map_dan_nivel_to_number(dan_nivel_text);
        ELSE
            v_dan_as_int := dan_numeric;
        END IF;
        
        -- Buscar DAN correspondente
        IF v_dan_as_int IS NOT NULL AND v_dan_as_int BETWEEN 1 AND 10 THEN
            SELECT id INTO v_kyu_dan_id
            FROM public.kyu_dan
            WHERE kyu_dan ILIKE v_dan_as_int || 'º DAN'
               OR kyu_dan ILIKE v_dan_as_int || '° DAN'
            LIMIT 1;
            
            IF v_kyu_dan_id IS NOT NULL THEN
                RETURN v_kyu_dan_id;
            END IF;
        END IF;
    END IF;
    
    -- 4. Mapeamento por padrões de texto comuns
    -- Branca e derivadas
    IF v_clean_graduacao LIKE '%BRANCA%' OR v_clean_graduacao LIKE '%WHITE%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 1 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Azul e derivadas
    IF v_clean_graduacao LIKE '%AZUL%' OR v_clean_graduacao LIKE '%BLUE%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 2 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Amarela e derivadas
    IF v_clean_graduacao LIKE '%AMARELA%' OR v_clean_graduacao LIKE '%YELLOW%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 3 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Laranja e derivadas
    IF v_clean_graduacao LIKE '%LARANJA%' OR v_clean_graduacao LIKE '%ORANGE%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 4 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Verde e derivadas
    IF v_clean_graduacao LIKE '%VERDE%' OR v_clean_graduacao LIKE '%GREEN%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 5 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Roxa e derivadas
    IF v_clean_graduacao LIKE '%ROXA%' OR v_clean_graduacao LIKE '%ROXO%' OR v_clean_graduacao LIKE '%PURPLE%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 6 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Marrom/castanha e derivadas
    IF v_clean_graduacao LIKE '%MARROM%' OR v_clean_graduacao LIKE '%CASTANHA%' OR v_clean_graduacao LIKE '%BROWN%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 7 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- Preta e derivadas
    IF v_clean_graduacao LIKE '%PRETA%' OR v_clean_graduacao LIKE '%PRETO%' OR v_clean_graduacao LIKE '%BLACK%' THEN
        SELECT id INTO v_kyu_dan_id FROM public.kyu_dan WHERE ordem = 8 LIMIT 1;
        IF v_kyu_dan_id IS NOT NULL THEN RETURN v_kyu_dan_id; END IF;
    END IF;
    
    -- 5. FALLBACK FINAL: Retornar graduação "NÃO ESPECIFICADA"
    SELECT id INTO v_kyu_dan_id
    FROM public.kyu_dan
    WHERE ordem = 999
    LIMIT 1;
    
    RETURN v_kyu_dan_id;
END;
$$;

-- 4. RE-EXECUTAR MAPEAMENTO COM A FUNÇÃO MELHORADA
-- Atualizar todos os registros não mapeados
UPDATE public.user_fed_lrsj
SET kyu_dan_id = public.resolve_kyu_dan_id(
    graduacao,
    NULLIF(regexp_replace(COALESCE(dan::TEXT, ''), '[^0-9]', '', 'g'), '')::INT,
    NULL
)
WHERE kyu_dan_id IS NULL;

-- 5. RELATÓRIO FINAL
DO $$
DECLARE
    v_total INT;
    v_mapped INT;
    v_unmapped INT;
    v_nao_especificada INT;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(kyu_dan_id),
        COUNT(*) - COUNT(kyu_dan_id)
    INTO v_total, v_mapped, v_unmapped
    FROM public.user_fed_lrsj;
    
    SELECT COUNT(*)
    INTO v_nao_especificada
    FROM public.user_fed_lrsj u
    INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
    WHERE k.ordem = 999;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== RESULTADO FINAL ===';
    RAISE NOTICE 'Total de registros: %', v_total;
    RAISE NOTICE 'Registros mapeados: %', v_mapped;
    RAISE NOTICE 'Registros NÃO mapeados: %', v_unmapped;
    RAISE NOTICE 'Mapeados como "NÃO ESPECIFICADA": %', v_nao_especificada;
    RAISE NOTICE 'Percentual mapeado: %%%', ROUND(100.0 * v_mapped / NULLIF(v_total, 0), 2);
    
    IF v_unmapped = 0 THEN
        RAISE NOTICE '✅ SUCESSO: Todos os registros foram mapeados!';
    ELSE
        RAISE WARNING '⚠️ ATENÇÃO: Ainda existem % registros não mapeados!', v_unmapped;
    END IF;
END $$;

-- 6. LISTAR GRADUAÇÕES QUE FORAM MAPEADAS COMO "NÃO ESPECIFICADA"
-- Para revisão manual se necessário
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== GRADUAÇÕES MAPEADAS COMO "NÃO ESPECIFICADA" ===';
    
    FOR rec IN (
        SELECT 
            u.graduacao,
            u.dan,
            COUNT(*) as qtd
        FROM public.user_fed_lrsj u
        INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
        WHERE k.ordem = 999
        GROUP BY u.graduacao, u.dan
        ORDER BY COUNT(*) DESC
        LIMIT 20
    ) LOOP
        RAISE NOTICE 'Graduação: % | Dan: % | Qtd: %', 
            COALESCE(rec.graduacao, '(NULL)'),
            COALESCE(rec.dan, '(NULL)'),
            rec.qtd;
    END LOOP;
END $$;
