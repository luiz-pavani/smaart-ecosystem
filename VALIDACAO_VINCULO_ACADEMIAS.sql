-- ============================================================
-- VALIDAÇÃO: Vínculo user_fed_lrsj -> academias
-- ============================================================

-- 1. ESTATÍSTICAS GERAIS
SELECT 
    'user_fed_lrsj -> academias' AS vinculo,
    COUNT(*) AS total_registros,
    COUNT(academia_id) AS registros_vinculados,
    COUNT(*) - COUNT(academia_id) AS registros_sem_vinculo,
    ROUND(100.0 * COUNT(academia_id) / NULLIF(COUNT(*), 0), 2) || '%' AS percentual_vinculado
FROM public.user_fed_lrsj;

-- 2. ACADEMIAS NÃO MAPEADAS
SELECT 
    academias AS texto_original,
    COUNT(*) AS quantidade_registros
FROM public.user_fed_lrsj
WHERE academia_id IS NULL
  AND academias IS NOT NULL
  AND TRIM(academias) != ''
GROUP BY academias
ORDER BY COUNT(*) DESC;

-- 3. DISTRIBUIÇÃO POR ACADEMIA (TOP 20)
SELECT 
    a.sigla,
    a.nome AS academia_nome,
    COUNT(u.id) AS total_atletas,
    ROUND(100.0 * COUNT(u.id) / NULLIF(SUM(COUNT(u.id)) OVER(), 0), 2) || '%' AS percentual
FROM public.academias a
LEFT JOIN public.user_fed_lrsj u ON u.academia_id = a.id
GROUP BY a.id, a.sigla, a.nome
HAVING COUNT(u.id) > 0
ORDER BY COUNT(u.id) DESC
LIMIT 20;

-- 4. VERIFICAR REGISTROS COM ACADEMIA_ID MAS TEXTO DIFERENTE
-- (Para validar se o mapeamento está correto)
SELECT 
    u.academias AS texto_original,
    a.sigla AS sigla_mapeada,
    a.nome AS nome_mapeado,
    COUNT(*) AS quantidade
FROM public.user_fed_lrsj u
INNER JOIN public.academias a ON u.academia_id = a.id
WHERE u.academias IS NOT NULL
  AND TRIM(u.academias) != ''
GROUP BY u.academias, a.sigla, a.nome
ORDER BY COUNT(*) DESC
LIMIT 30;

-- 5. TRIGGER FUNCIONANDO?
-- Verificar se trigger está ativo
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS tabela,
    CASE tgenabled
        WHEN 'O' THEN 'Habilitado'
        WHEN 'D' THEN 'Desabilitado'
        WHEN 'R' THEN 'Replica'
        WHEN 'A' THEN 'Always'
    END AS status
FROM pg_trigger
WHERE tgname = 'trg_user_fed_lrsj_set_academia_id';

-- 6. TESTE DE FUNÇÃO resolve_academia_id
-- Testar alguns casos conhecidos
SELECT 
    'Santa Maria' AS texto_entrada,
    public.resolve_academia_id('Santa Maria') AS academia_id_resolvido,
    a.sigla,
    a.nome
FROM public.academias a
WHERE a.id = public.resolve_academia_id('Santa Maria');

SELECT 
    'CaJu' AS texto_entrada,
    public.resolve_academia_id('CaJu') AS academia_id_resolvido,
    a.sigla,
    a.nome
FROM public.academias a
WHERE a.id = public.resolve_academia_id('CaJu');

SELECT 
    'Tanemaki Judô' AS texto_entrada,
    public.resolve_academia_id('Tanemaki Judô') AS academia_id_resolvido,
    a.sigla,
    a.nome
FROM public.academias a
WHERE a.id = public.resolve_academia_id('Tanemaki Judô');

-- 7. ACADEMIAS SEM NENHUM ATLETA VINCULADO
SELECT 
    a.sigla,
    a.nome,
    a.cidade,
    a.estado
FROM public.academias a
LEFT JOIN public.user_fed_lrsj u ON u.academia_id = a.id
WHERE u.id IS NULL
ORDER BY a.nome;

-- 8. COMPARAÇÃO ANTES/DEPOIS (usar texto vs usar FK)
-- Contar por texto (método antigo)
SELECT 
    'Método TEXTO (antigo)' AS metodo,
    academias,
    COUNT(*) AS quantidade
FROM public.user_fed_lrsj
WHERE academias IS NOT NULL
GROUP BY academias
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Contar por FK (método novo)
SELECT 
    'Método FK (novo)' AS metodo,
    a.sigla || ' - ' || a.nome AS academia,
    COUNT(u.id) AS quantidade
FROM public.academias a
INNER JOIN public.user_fed_lrsj u ON u.academia_id = a.id
GROUP BY a.id, a.sigla, a.nome
ORDER BY COUNT(u.id) DESC
LIMIT 10;

-- 9. SUMMARY FINAL
SELECT 
    '✅ VALIDAÇÃO COMPLETA' AS status,
    (SELECT COUNT(*) FROM public.academias) AS total_academias_cadastradas,
    (SELECT COUNT(DISTINCT academia_id) FROM public.user_fed_lrsj WHERE academia_id IS NOT NULL) AS academias_com_atletas,
    (SELECT COUNT(*) FROM public.user_fed_lrsj WHERE academia_id IS NULL AND academias IS NOT NULL AND TRIM(academias) != '') AS atletas_sem_vinculo,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.user_fed_lrsj WHERE academia_id IS NULL AND academias IS NOT NULL AND TRIM(academias) != '') < 100
        THEN '✅ Menos de 100 sem vínculo - Aceitável'
        ELSE '⚠️ Verificar academias não mapeadas'
    END AS resultado_final;
