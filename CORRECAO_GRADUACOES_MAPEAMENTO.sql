-- ============================================================
-- CORREÇÃO: Remapear 917 graduações incorretas
-- ============================================================
-- Problema: 917 atletas têm graduação preenchida mas estão
-- mapeados para 'NÃO ESPECIFICADA' (ordem=999)
-- Solução: Mapear baseado no campo 'graduacao'
-- ============================================================

-- PASSO 1: Verificar tabela kyu_dan e seus valores
SELECT id, cor_faixa, kyu_dan, ordem 
FROM public.kyu_dan 
ORDER BY ordem;

-- PASSO 2: Criar mapeamento temporário para análise
-- Verificar quais valores de graduacao podem ser mapeados
SELECT 
    DISTINCT u.graduacao,
    COUNT(*) as quantidade
FROM public.user_fed_lrsj u
INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
WHERE k.ordem = 999 
AND u.graduacao IS NOT NULL
GROUP BY u.graduacao
ORDER BY quantidade DESC;

-- PASSO 3: Tentar mapear baseado em padrão "COR | KYU"
-- Exemplo: "BRANCA | MŪKYŪ" → buscar kyu_dan onde cor_faixa = "BRANCA" e kyu_dan = "MŪKYŪ"

-- Teste com BRANCA | MŪKYŪ (234 registros)
SELECT 
    id, cor_faixa, kyu_dan, ordem
FROM public.kyu_dan
WHERE cor_faixa = 'BRANCA' AND kyu_dan = 'MŪKYŪ';

-- Teste com CINZA | NANAKYŪ (217 registros)
SELECT 
    id, cor_faixa, kyu_dan, ordem
FROM public.kyu_dan
WHERE cor_faixa = 'CINZA' AND kyu_dan = 'NANAKYŪ';

-- PASSO 4: Update em massa (USAR COM CUIDADO!)
-- Só executar após validar que os IDs existem

-- Exemplo para BRANCA | MŪKYŪ
-- UPDATE public.user_fed_lrsj u
-- SET kyu_dan_id = (
--     SELECT id FROM public.kyu_dan 
--     WHERE cor_faixa = 'BRANCA' AND kyu_dan = 'MŪKYŪ'
-- )
-- WHERE u.graduacao = 'BRANCA | MŪKYŪ'
-- AND EXISTS (
--     SELECT 1 FROM public.kyu_dan k 
--     WHERE k.id = u.kyu_dan_id AND k.ordem = 999
-- );

-- PASSO 5: Verificação pós-update
-- SELECT COUNT(*) FROM public.user_fed_lrsj u
-- INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
-- WHERE k.ordem = 999;
-- Deve retornar apenas 83 (os que realmente não têm graduacao)
