-- ============================================================
-- VALIDAÇÃO FINAL: 100% Mapeamento de Graduações
-- ============================================================

-- 1. ESTATÍSTICAS GERAIS
SELECT 
    'user_fed_lrsj' AS tabela,
    COUNT(*) AS total_registros,
    COUNT(kyu_dan_id) AS registros_mapeados,
    COUNT(*) - COUNT(kyu_dan_id) AS registros_nao_mapeados,
    ROUND(100.0 * COUNT(kyu_dan_id) / NULLIF(COUNT(*), 0), 2) || '%' AS percentual_mapeado
FROM public.user_fed_lrsj

UNION ALL

SELECT 
    'atletas' AS tabela,
    COUNT(*) AS total_registros,
    COUNT(kyu_dan_id) AS registros_mapeados,
    COUNT(*) - COUNT(kyu_dan_id) AS registros_nao_mapeados,
    ROUND(100.0 * COUNT(kyu_dan_id) / NULLIF(COUNT(*), 0), 2) || '%' AS percentual_mapeado
FROM public.atletas;

-- 2. DISTRIBUIÇÃO POR GRADUAÇÃO EM user_fed_lrsj
SELECT 
    k.ordem,
    k.cor_faixa,
    k.kyu_dan,
    k.icones,
    COUNT(u.id) AS total_atletas,
    ROUND(100.0 * COUNT(u.id) / NULLIF(SUM(COUNT(u.id)) OVER(), 0), 2) || '%' AS percentual
FROM public.kyu_dan k
LEFT JOIN public.user_fed_lrsj u ON u.kyu_dan_id = k.id
GROUP BY k.id, k.ordem, k.cor_faixa, k.kyu_dan, k.icones
HAVING COUNT(u.id) > 0
ORDER BY k.ordem;

-- 3. DETALHES DOS 98 REGISTROS "NÃO ESPECIFICADA"
SELECT 
    u.id,
    u.nome_completo,
    u.graduacao AS graduacao_original,
    u.dan AS dan_original,
    k.cor_faixa AS graduacao_mapeada,
    u.created_at,
    u.updated_at
FROM public.user_fed_lrsj u
INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
WHERE k.ordem = 999
ORDER BY u.created_at DESC
LIMIT 20;

-- 4. VERIFICAÇÃO DE TRIGGERS
SELECT 
    tgname AS nome_trigger,
    tgrelid::regclass AS tabela,
    CASE tgenabled
        WHEN 'O' THEN 'Habilitado'
        WHEN 'D' THEN 'Desabilitado'
        WHEN 'R' THEN 'Replica'
        WHEN 'A' THEN 'Always'
    END AS status
FROM pg_trigger
WHERE tgname IN ('trg_user_fed_lrsj_set_kyu_dan_id', 'trg_atletas_set_kyu_dan_id')
ORDER BY tgrelid::regclass::text;

-- 5. TESTE DE INSERÇÃO - Verificar trigger funcionando
-- (Não vai inserir de verdade, apenas simula)
DO $$
DECLARE
    v_kyu_dan_id INT;
BEGIN
    -- Testar resolução para graduação nula
    v_kyu_dan_id := public.resolve_kyu_dan_id(NULL, NULL, NULL);
    RAISE NOTICE 'Graduação NULL → kyu_dan_id: %', v_kyu_dan_id;
    
    -- Testar resolução para "BRANCA"
    v_kyu_dan_id := public.resolve_kyu_dan_id('BRANCA', NULL, NULL);
    RAISE NOTICE 'Graduação BRANCA → kyu_dan_id: %', v_kyu_dan_id;
    
    -- Testar resolução para "PRETA" com dan
    v_kyu_dan_id := public.resolve_kyu_dan_id('PRETA', 1, NULL);
    RAISE NOTICE 'Graduação PRETA + dan 1 → kyu_dan_id: %', v_kyu_dan_id;
    
    -- Testar resolução para graduação desconhecida
    v_kyu_dan_id := public.resolve_kyu_dan_id('GRADUAÇÃO INEXISTENTE', NULL, NULL);
    RAISE NOTICE 'Graduação INEXISTENTE → kyu_dan_id: %', v_kyu_dan_id;
END $$;

-- 6. SUMMARY FINAL
SELECT 
    '✅ VALIDAÇÃO COMPLETA' AS status,
    (SELECT COUNT(*) FROM public.kyu_dan) AS total_graduacoes_cadastradas,
    (SELECT COUNT(*) FROM public.user_fed_lrsj WHERE kyu_dan_id IS NULL) AS user_fed_nao_mapeados,
    (SELECT COUNT(*) FROM public.atletas WHERE kyu_dan_id IS NULL) AS atletas_nao_mapeados,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.user_fed_lrsj WHERE kyu_dan_id IS NULL) = 0 
         AND (SELECT COUNT(*) FROM public.atletas WHERE kyu_dan_id IS NULL) = 0 
        THEN '✅ 100% MAPEADO'
        ELSE '⚠️ ATENÇÃO: Existem registros não mapeados'
    END AS resultado_final;
