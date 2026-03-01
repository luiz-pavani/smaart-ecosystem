-- ============================================================
-- AUDITORIA: Registros de user_fed_lrsj sem academia_id
-- ============================================================

-- 1) Total e classificação do problema
SELECT
  COUNT(*) AS total_user_fed_lrsj,
  COUNT(*) FILTER (WHERE academia_id IS NULL) AS total_sem_academia_id,
  COUNT(*) FILTER (
    WHERE academia_id IS NULL
      AND (academias IS NULL OR TRIM(academias) = '')
  ) AS sem_texto_academia,
  COUNT(*) FILTER (
    WHERE academia_id IS NULL
      AND academias IS NOT NULL
      AND TRIM(academias) <> ''
  ) AS com_texto_nao_mapeado
FROM public.user_fed_lrsj;

-- 2) Top textos de academias não mapeadas
SELECT
  academias AS texto_academia,
  COUNT(*) AS quantidade
FROM public.user_fed_lrsj
WHERE academia_id IS NULL
  AND academias IS NOT NULL
  AND TRIM(academias) <> ''
GROUP BY academias
ORDER BY COUNT(*) DESC;

-- 3) Registros sem academia_id e sem texto de academia (dados faltantes)
SELECT
  id,
  numero_membro,
  nome_completo,
  email,
  academias,
  academia_id,
  status_membro
FROM public.user_fed_lrsj
WHERE academia_id IS NULL
  AND (academias IS NULL OR TRIM(academias) = '')
ORDER BY nome_completo
LIMIT 200;

-- 4) Registros com texto, mas sem mapeamento
SELECT
  id,
  numero_membro,
  nome_completo,
  email,
  academias,
  academia_id,
  status_membro
FROM public.user_fed_lrsj
WHERE academia_id IS NULL
  AND academias IS NOT NULL
  AND TRIM(academias) <> ''
ORDER BY academias, nome_completo;

-- 5) Confirmar vínculo das academias com LRSJ
SELECT
  f.id AS federacao_id,
  f.sigla,
  f.nome AS federacao_nome,
  COUNT(a.id) AS total_academias
FROM public.federacoes f
LEFT JOIN public.academias a ON a.federacao_id = f.id
GROUP BY f.id, f.sigla, f.nome
ORDER BY total_academias DESC;

-- 6) Conferir academias sem federacao_id (deve ser 0)
SELECT
  COUNT(*) AS academias_sem_federacao_id
FROM public.academias
WHERE federacao_id IS NULL;

-- 7) Confirmar tipo/constraint de academia_id em user_fed_lrsj
SELECT
  c.column_name,
  c.data_type,
  c.udt_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'user_fed_lrsj'
  AND c.column_name = 'academia_id';

SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.user_fed_lrsj'::regclass
  AND conname = 'user_fed_lrsj_academia_id_fkey';
