-- Migration 026: Fix atletas.user_id uniqueness for admin-created athletes
--
-- Problem:
-- A manual SQL script enforced UNIQUE(user_id) on atletas.
-- This blocks scenarios where one admin user registers multiple athletes,
-- causing: duplicate key value violates unique constraint "unique_user_id".
--
-- Decision:
-- Keep referential integrity (FK) and column, but remove UNIQUE constraint.
-- This allows one authenticated user to register/manage multiple athletes.

ALTER TABLE atletas DROP CONSTRAINT IF EXISTS unique_user_id;

-- Optional cleanup in case uniqueness was created as an index (defensive)
DROP INDEX IF EXISTS unique_user_id;
DROP INDEX IF EXISTS idx_atletas_user_id_unique;

-- Keep/ensure non-unique index for performance
CREATE INDEX IF NOT EXISTS idx_atletas_user_id ON atletas(user_id);
