-- Migration 024: Remove overly restrictive UNIQUE constraints on stakeholder_id
-- 
-- Issue: Migration 019 created UNIQUE constraints preventing stakeholders from owning
-- multiple entities (e.g., can't own both a federation AND an academy).
-- 
-- Business Reality:
-- - A person can own multiple academies
-- - A federation president can also own/manage an academy
-- - A stakeholder should be allowed to have multiple roles across entities
--
-- Fix: Drop the UNIQUE indexes while keeping foreign key relationships intact

DROP INDEX IF EXISTS idx_federacoes_stakeholder_id_unique;
DROP INDEX IF EXISTS idx_academias_stakeholder_id_unique;
DROP INDEX IF EXISTS idx_atletas_stakeholder_id_unique;

-- Create regular (non-unique) indexes for query performance
-- These help with lookups without enforcing 1:1 relationships
CREATE INDEX IF NOT EXISTS idx_federacoes_stakeholder_id 
  ON federacoes(stakeholder_id) 
  WHERE stakeholder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_academias_stakeholder_id 
  ON academias(stakeholder_id) 
  WHERE stakeholder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atletas_stakeholder_id 
  ON atletas(stakeholder_id) 
  WHERE stakeholder_id IS NOT NULL;

-- Verification queries (run these after migration to validate)
-- SELECT 'Federações', COUNT(*) as total, COUNT(stakeholder_id) as with_stakeholder FROM federacoes
-- UNION ALL
-- SELECT 'Academias', COUNT(*), COUNT(stakeholder_id) FROM academias
-- UNION ALL
-- SELECT 'Atletas', COUNT(*), COUNT(stakeholder_id) FROM atletas;
