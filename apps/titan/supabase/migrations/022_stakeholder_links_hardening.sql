-- ================================================================
-- MIGRATION 022: STAKEHOLDER LINKS HARDENING (GRADUAL)
-- ================================================================
-- Objetivo:
-- - Impedir novos registros sem stakeholder_id
-- - Manter compatibilidade com legado já existente
-- - Preparar validação final para evolução a NOT NULL

-- ================================================================
-- 1) Restrições graduais (NOT VALID)
--    - Não quebram linhas antigas
--    - Valem para novos INSERT/UPDATE
-- ================================================================
ALTER TABLE federacoes
  DROP CONSTRAINT IF EXISTS ck_federacoes_stakeholder_required;

ALTER TABLE federacoes
  ADD CONSTRAINT ck_federacoes_stakeholder_required
  CHECK (stakeholder_id IS NOT NULL)
  NOT VALID;

ALTER TABLE academias
  DROP CONSTRAINT IF EXISTS ck_academias_stakeholder_required;

ALTER TABLE academias
  ADD CONSTRAINT ck_academias_stakeholder_required
  CHECK (stakeholder_id IS NOT NULL)
  NOT VALID;

ALTER TABLE atletas
  DROP CONSTRAINT IF EXISTS ck_atletas_stakeholder_required;

ALTER TABLE atletas
  ADD CONSTRAINT ck_atletas_stakeholder_required
  CHECK (stakeholder_id IS NOT NULL)
  NOT VALID;

-- ================================================================
-- 2) View de prontidão para hardening final
-- ================================================================
CREATE OR REPLACE VIEW vw_stakeholder_hardening_readiness AS
SELECT
  'federacoes' AS entidade,
  COUNT(*)::BIGINT AS total,
  COUNT(*) FILTER (WHERE stakeholder_id IS NULL)::BIGINT AS sem_stakeholder,
  (COUNT(*) FILTER (WHERE stakeholder_id IS NULL) = 0) AS pronto_para_validar
FROM federacoes

UNION ALL

SELECT
  'academias' AS entidade,
  COUNT(*)::BIGINT AS total,
  COUNT(*) FILTER (WHERE stakeholder_id IS NULL)::BIGINT AS sem_stakeholder,
  (COUNT(*) FILTER (WHERE stakeholder_id IS NULL) = 0) AS pronto_para_validar
FROM academias

UNION ALL

SELECT
  'atletas' AS entidade,
  COUNT(*)::BIGINT AS total,
  COUNT(*) FILTER (WHERE stakeholder_id IS NULL)::BIGINT AS sem_stakeholder,
  (COUNT(*) FILTER (WHERE stakeholder_id IS NULL) = 0) AS pronto_para_validar
FROM atletas;

-- ================================================================
-- 3) Guia operacional (manual, pós-gap zero)
-- ================================================================
-- Quando sem_stakeholder = 0 para todas as entidades:
-- ALTER TABLE federacoes VALIDATE CONSTRAINT ck_federacoes_stakeholder_required;
-- ALTER TABLE academias VALIDATE CONSTRAINT ck_academias_stakeholder_required;
-- ALTER TABLE atletas VALIDATE CONSTRAINT ck_atletas_stakeholder_required;
--
-- Em seguida, opcionalmente:
-- ALTER TABLE federacoes ALTER COLUMN stakeholder_id SET NOT NULL;
-- ALTER TABLE academias ALTER COLUMN stakeholder_id SET NOT NULL;
-- ALTER TABLE atletas ALTER COLUMN stakeholder_id SET NOT NULL;
