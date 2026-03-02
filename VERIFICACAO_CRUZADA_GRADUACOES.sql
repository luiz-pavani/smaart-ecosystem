-- ============================================================
-- VERIFICAÇÃO CRUZADA: CSV vs Banco Remoto
-- ============================================================

-- 1. Total de registros "NÃO ESPECIFICADA"
SELECT 
    'Total NÃO ESPECIFICADA' AS descricao,
    COUNT(*) AS quantidade
FROM public.user_fed_lrsj u
INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
WHERE k.ordem = 999;

-- 2. Verificar se graduacao e dan são realmente NULL
SELECT 
    'Verificação de NULLs' AS descricao,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE u.graduacao IS NULL) AS graduacao_null,
    COUNT(*) FILTER (WHERE u.dan IS NULL) AS dan_null,
    COUNT(*) FILTER (WHERE u.graduacao IS NULL AND u.dan IS NULL) AS ambos_null,
    COUNT(*) FILTER (WHERE COALESCE(u.graduacao, '') = '' AND COALESCE(u.dan, '') = '') AS ambos_vazios
FROM public.user_fed_lrsj u
INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
WHERE k.ordem = 999;

-- 3. Listar alguns nomes específicos para comparação manual
SELECT 
    u.numero_membro,
    u.nome_completo,
    u.graduacao,
    u.dan,
    u.email,
    k.cor_faixa AS graduacao_mapeada
FROM public.user_fed_lrsj u
INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id
WHERE k.ordem = 999
ORDER BY u.nome_completo
LIMIT 20;

-- 4. Verificar se esses nomes batem com o CSV
-- Buscar especificamente os primeiros nomes da lista do CSV
SELECT 
    nome_completo,
    graduacao,
    dan,
    numero_membro
FROM public.user_fed_lrsj
WHERE nome_completo IN (
    'GABRIEL JUNQUEIRA VELASQUEZ',
    'Luiz Henrique Maia Deolindo',
    'DAVI DA ROSA DUARTE',
    'Eduarda Rosa',
    'Vicente Reis De Castro',
    'Alice Xavier',
    'Petherson Aires',
    'ALEXSSANDRO ALONSO BENDER',
    'ALICE GONÇALVES SARTURI',
    'ALICE SIMOES SILVEIRA'
)
ORDER BY nome_completo;

-- 5. Buscar últimos nomes da lista do CSV
SELECT 
    nome_completo,
    graduacao,
    dan,
    numero_membro
FROM public.user_fed_lrsj
WHERE nome_completo IN (
    'BARBARA MARTINS PIRES',
    'CRISTIANO CRUZ DA SILVA',
    'DIOZEFER MICAEL DA SILVA MACIEL',
    'GABRIEL GRESLLER',
    'KASSIA LOPES DE OLIVEIRA',
    'LUIS FERNANDO SILVEIRA FREITAS',
    'MIGUEL ANGELO CARVALHO DOS SANTOS',
    'MIRIAN PAIN CORREA',
    'RICARDO DE BORBA WENCESLAU',
    'THIAGO MULLER CRISPIM'
)
ORDER BY nome_completo;

-- 6. Estatística final de validação
SELECT 
    '✅ VALIDAÇÃO FINAL' AS status,
    (SELECT COUNT(*) FROM public.user_fed_lrsj u INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id WHERE k.ordem = 999) AS registros_nao_especificada,
    (SELECT COUNT(*) FROM public.user_fed_lrsj u INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id WHERE k.ordem = 999 AND u.graduacao IS NULL AND u.dan IS NULL) AS com_graduacao_e_dan_null,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.user_fed_lrsj u INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id WHERE k.ordem = 999) = 98
         AND (SELECT COUNT(*) FROM public.user_fed_lrsj u INNER JOIN public.kyu_dan k ON u.kyu_dan_id = k.id WHERE k.ordem = 999 AND u.graduacao IS NULL AND u.dan IS NULL) = 98
        THEN '✅ CORRETO: CSV e Banco 100% sincronizados'
        ELSE '❌ DIVERGÊNCIA ENCONTRADA'
    END AS resultado;
