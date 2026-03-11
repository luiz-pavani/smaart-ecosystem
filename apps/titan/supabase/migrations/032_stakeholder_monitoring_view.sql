-- Migration 032: Stakeholder Integrity Monitoring VIEW
-- Objetivo:
-- - Criar VIEW persistente para monitoramento contínuo da integridade de stakeholders
-- - Adicionar snapshot histórico para análise de tendências
-- - Fornecer base para automação de alertas

-- ================================================================
-- 1) Criar VIEW de Healthcheck
-- ================================================================
CREATE OR REPLACE VIEW public.v_stakeholder_integrity_healthcheck AS
SELECT 'federacoes_sem_stakeholder' AS check_name,
       COUNT(*) AS valor,
       NOW() AS checked_at
FROM public.federacoes 
WHERE stakeholder_id IS NULL

UNION ALL

SELECT 'academias_sem_stakeholder' AS check_name,
       COUNT(*) AS valor,
       NOW() AS checked_at
FROM public.academias 
WHERE stakeholder_id IS NULL

UNION ALL

SELECT 'user_fed_lrsj_sem_stakeholder' AS check_name,
       COUNT(*) AS valor,
       NOW() AS checked_at
FROM public.user_fed_lrsj 
WHERE stakeholder_id IS NULL

UNION ALL

SELECT 'user_fed_lrsj_fk_stakeholder_invalida' AS check_name,
       COUNT(*) AS valor,
       NOW() AS checked_at
FROM public.user_fed_lrsj u 
LEFT JOIN public.stakeholders s ON s.id = u.stakeholder_id
WHERE u.stakeholder_id IS NOT NULL AND s.id IS NULL

UNION ALL

SELECT 'user_fed_lrsj_fk_academia_invalida' AS check_name,
       COUNT(*) AS valor,
       NOW() AS checked_at
FROM public.user_fed_lrsj u 
LEFT JOIN public.academias a ON a.id = u.academia_id
WHERE u.academia_id IS NOT NULL AND a.id IS NULL

UNION ALL

SELECT 'user_fed_lrsj_sem_kyu_dan_id' AS check_name,
       COUNT(*) AS valor,
       NOW() AS checked_at
FROM public.user_fed_lrsj 
WHERE kyu_dan_id IS NULL;

-- ================================================================
-- 2) Tabela de snapshot histórico para análise de tendências
-- ================================================================
CREATE TABLE IF NOT EXISTS public.stakeholder_healthcheck_log (
  id BIGSERIAL PRIMARY KEY,
  check_name TEXT NOT NULL,
  valor BIGINT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_healthcheck_log_check_name 
  ON public.stakeholder_healthcheck_log(check_name);

CREATE INDEX IF NOT EXISTS idx_stakeholder_healthcheck_log_checked_at 
  ON public.stakeholder_healthcheck_log(checked_at DESC);

-- ================================================================
-- 3) Função para capturar snapshot do healthcheck
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_capture_stakeholder_healthcheck_snapshot()
RETURNS TABLE (
  check_name TEXT,
  valor BIGINT,
  captured_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.stakeholder_healthcheck_log (check_name, valor, checked_at)
  SELECT v.check_name, v.valor, NOW()
  FROM public.v_stakeholder_integrity_healthcheck v;

  RETURN QUERY
  SELECT l.check_name, l.valor, l.created_at
  FROM public.stakeholder_healthcheck_log l
  ORDER BY l.created_at DESC
  LIMIT 6;
END;
$$;

-- ================================================================
-- 4) Tabela de alertas (opcional para futuros webhooks/notifications)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.stakeholder_integrity_alerts (
  id BIGSERIAL PRIMARY KEY,
  check_name TEXT NOT NULL,
  threshold_value BIGINT NOT NULL DEFAULT 0,
  actual_value BIGINT NOT NULL,
  alert_level TEXT NOT NULL, -- 'warning', 'critical'
  message TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_integrity_alerts_check_name 
  ON public.stakeholder_integrity_alerts(check_name);

CREATE INDEX IF NOT EXISTS idx_stakeholder_integrity_alerts_created_at 
  ON public.stakeholder_integrity_alerts(created_at DESC);

-- ================================================================
-- 5) Função para detecção de anomalias
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_check_stakeholder_integrity_anomalies()
RETURNS TABLE (
  check_name TEXT,
  threshold_value BIGINT,
  actual_value BIGINT,
  alert_level TEXT,
  message TEXT,
  detected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_threshold BIGINT := 0; -- Esperamos 0 em produção
BEGIN
  -- Executar healthcheck e comparar com threshold
  RETURN QUERY
  WITH health_results AS (
    SELECT v.check_name, v.valor
    FROM public.v_stakeholder_integrity_healthcheck v
  )
  SELECT 
    h.check_name,
    v_threshold,
    h.valor,
    CASE 
      WHEN h.valor > v_threshold THEN 'critical'
      ELSE 'ok'
    END AS alert_level,
    CASE 
      WHEN h.valor > v_threshold 
        THEN format('Integridade comprometida: %s tem %L registros (esperado 0)', h.check_name, h.valor)
      ELSE 'Integridade OK'
    END AS message,
    NOW() AS detected_at
  FROM health_results h
  WHERE h.valor > v_threshold;

  -- Registrar alertas detectados
  INSERT INTO public.stakeholder_integrity_alerts (check_name, threshold_value, actual_value, alert_level, message)
  SELECT 
    h.check_name,
    v_threshold,
    h.valor,
    CASE WHEN h.valor > v_threshold THEN 'critical' ELSE 'warning' END,
    CASE 
      WHEN h.valor > v_threshold 
        THEN format('Integridade comprometida: %s tem %L registros (esperado 0)', h.check_name, h.valor)
      ELSE 'Integridade OK'
    END
  FROM (
    SELECT v.check_name, v.valor
    FROM public.v_stakeholder_integrity_healthcheck v
  ) h
  WHERE h.valor > v_threshold;
END;
$$;

-- ================================================================
-- 6) VIEW agregada de status geral
-- ================================================================
CREATE OR REPLACE VIEW public.v_stakeholder_integrity_status AS
SELECT 
  CASE WHEN SUM(h.valor) = 0 THEN 'HEALTHY' ELSE 'UNHEALTHY' END AS status,
  SUM(h.valor) AS total_issues,
  COUNT(*) AS total_checks,
  COUNT(CASE WHEN h.valor = 0 THEN 1 END) AS passing_checks,
  COUNT(CASE WHEN h.valor > 0 THEN 1 END) AS failing_checks,
  MAX(h.checked_at) AS last_checked
FROM public.v_stakeholder_integrity_healthcheck h;

-- ================================================================
-- 7) Initial snapshot capture (baseline)
-- ================================================================
DO $$
BEGIN
  -- Capturar snapshot inicial
  PERFORM public.fn_capture_stakeholder_healthcheck_snapshot();
  
  RAISE NOTICE '[032] Stakeholder monitoring VIEW criado com sucesso.';
  RAISE NOTICE '[032] Snapshot inicial capturado em stakeholder_healthcheck_log.';
  RAISE NOTICE '[032] Use: SELECT * FROM public.v_stakeholder_integrity_healthcheck;';
  RAISE NOTICE '[032] Use: SELECT * FROM public.v_stakeholder_integrity_status;';
  RAISE NOTICE '[032] Use: SELECT * FROM public.fn_capture_stakeholder_healthcheck_snapshot();';
END;
$$;

-- ================================================================
-- INSTRUÇÕES DE USO
-- ================================================================
-- QUERIES ÚTEIS PARA MONITORAMENTO:
-- 1. SELECT * FROM public.v_stakeholder_integrity_status;
-- 2. SELECT check_name, valor FROM public.v_stakeholder_integrity_healthcheck;
-- 3. SELECT * FROM public.fn_capture_stakeholder_healthcheck_snapshot();
-- 4. SELECT * FROM public.fn_check_stakeholder_integrity_anomalies();
-- 5. SELECT * FROM public.stakeholder_integrity_alerts WHERE resolved_at IS NULL;
-- pg_cron (se disponivel):
-- SELECT cron.schedule('capture_stakeholder_healthcheck', '0 */6 * * *',
--   'SELECT public.fn_capture_stakeholder_healthcheck_snapshot()');
