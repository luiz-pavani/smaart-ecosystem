-- ================================================================
-- MIGRATION 021: STAKEHOLDER INTEGRITY AUDIT VIEWS
-- ================================================================
-- Objetivo:
-- - Facilitar validação pós-backfill
-- - Expor pendências de vínculo stakeholder_id

CREATE OR REPLACE VIEW vw_stakeholder_link_gaps AS
SELECT 'federacoes' AS entidade, COUNT(*)::BIGINT AS total_sem_vinculo
FROM federacoes
WHERE stakeholder_id IS NULL

UNION ALL

SELECT 'academias' AS entidade, COUNT(*)::BIGINT AS total_sem_vinculo
FROM academias
WHERE stakeholder_id IS NULL

UNION ALL

SELECT 'atletas' AS entidade, COUNT(*)::BIGINT AS total_sem_vinculo
FROM atletas
WHERE stakeholder_id IS NULL;

CREATE OR REPLACE VIEW vw_stakeholder_email_collisions AS
SELECT
  LOWER(email) AS email_normalizado,
  COUNT(*)::BIGINT AS qtd_stakeholders,
  ARRAY_AGG(id ORDER BY id) AS stakeholder_ids
FROM stakeholders
WHERE email IS NOT NULL AND email <> ''
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

CREATE OR REPLACE VIEW vw_stakeholder_username_collisions AS
SELECT
  LOWER(nome_usuario) AS username_normalizado,
  COUNT(*)::BIGINT AS qtd_stakeholders,
  ARRAY_AGG(id ORDER BY id) AS stakeholder_ids
FROM stakeholders
GROUP BY LOWER(nome_usuario)
HAVING COUNT(*) > 1;
