-- Auditoria completa da governança de stakeholder_id no schema public
-- Execute no SQL Editor do Supabase

-- 1) Inventário: todas as tabelas com coluna stakeholder_id
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.is_nullable,
  c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'stakeholder_id'
ORDER BY c.table_name;

-- 2) Função dinâmica de saúde por tabela
CREATE OR REPLACE FUNCTION public.fn_stakeholder_table_health()
RETURNS TABLE (
  table_name text,
  total_records bigint,
  with_stakeholder_id bigint,
  missing_stakeholder_id bigint,
  stakeholder_not_null boolean,
  has_stakeholder_fk boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  table_record RECORD;
  count_total BIGINT;
  count_with BIGINT;
  count_missing BIGINT;
  is_not_null BOOLEAN;
  has_fk BOOLEAN;
BEGIN
  FOR table_record IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'stakeholder_id'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.table_name) INTO count_total;
    EXECUTE format('SELECT COUNT(stakeholder_id) FROM public.%I', table_record.table_name) INTO count_with;
    count_missing := count_total - count_with;

    SELECT (c.is_nullable = 'NO')
      INTO is_not_null
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = table_record.table_name
      AND c.column_name = 'stakeholder_id';

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = table_record.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'stakeholder_id'
        AND ccu.table_name = 'stakeholders'
        AND ccu.column_name = 'id'
    ) INTO has_fk;

    table_name := table_record.table_name;
    total_records := count_total;
    with_stakeholder_id := count_with;
    missing_stakeholder_id := count_missing;
    stakeholder_not_null := COALESCE(is_not_null, false);
    has_stakeholder_fk := COALESCE(has_fk, false);
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 3) Visão consolidada (snapshot atual)
SELECT *
FROM public.fn_stakeholder_table_health()
ORDER BY table_name;

-- 4) Somente problemas
SELECT *
FROM public.fn_stakeholder_table_health()
WHERE missing_stakeholder_id > 0
   OR stakeholder_not_null = false
   OR has_stakeholder_fk = false
ORDER BY table_name;

-- 5) Registros recentes com risco (últimas 24h)
-- Ajuste/descomente para tabelas-chave conforme necessário:
SELECT 'federacoes' AS table_name, id, created_at
FROM public.federacoes
WHERE stakeholder_id IS NULL
  AND created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'academias' AS table_name, id, created_at
FROM public.academias
WHERE stakeholder_id IS NULL
  AND created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'atletas' AS table_name, id, created_at
FROM public.atletas
WHERE stakeholder_id IS NULL
  AND created_at >= NOW() - INTERVAL '24 hours';

-- 6) Auditoria de padronização de graduações via kyu_dan_id
-- Tabelas com coluna graduacao e se já possuem coluna kyu_dan_id
SELECT
  g.table_schema,
  g.table_name,
  CASE WHEN k.column_name IS NOT NULL THEN TRUE ELSE FALSE END AS has_kyu_dan_id_column
FROM information_schema.columns g
LEFT JOIN information_schema.columns k
  ON k.table_schema = g.table_schema
 AND k.table_name = g.table_name
 AND k.column_name = 'kyu_dan_id'
WHERE g.table_schema = 'public'
  AND g.column_name = 'graduacao'
ORDER BY g.table_name;

-- 7) Somente inconsistências de graduação (sem kyu_dan_id)
SELECT
  g.table_name,
  'Tabela com graduacao sem coluna kyu_dan_id' AS issue
FROM information_schema.columns g
LEFT JOIN information_schema.columns k
  ON k.table_schema = g.table_schema
 AND k.table_name = g.table_name
 AND k.column_name = 'kyu_dan_id'
WHERE g.table_schema = 'public'
  AND g.column_name = 'graduacao'
  AND k.column_name IS NULL
ORDER BY g.table_name;

-- 8) (Opcional) Valores de graduação sem equivalência para kyu_dan em atletas
-- Use para identificar mapeamentos que precisam de confirmação manual
SELECT DISTINCT a.graduacao
FROM public.atletas a
WHERE a.graduacao IS NOT NULL
  AND trim(a.graduacao) <> ''
  AND public.resolve_kyu_dan_id(a.graduacao, NULL, a.dan_nivel) IS NULL
ORDER BY a.graduacao;
