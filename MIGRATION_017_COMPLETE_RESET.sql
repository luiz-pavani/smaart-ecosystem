-- Migration 017: COMPLETE RLS Reset - Drop ALL policies and recreate clean

-- ============================================
-- ATLETAS TABLE - COMPLETE RESET
-- ============================================

-- Drop EVERY policy (not just known ones)
DROP POLICY IF EXISTS "Federation admins can insert athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can insert athletes for their academy" ON atletas;
DROP POLICY IF EXISTS "Master access can insert atletas" ON atletas;
DROP POLICY IF EXISTS "Users can insert athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - insert based on role" ON atletas;

DROP POLICY IF EXISTS "Federation admins can view all athletes in their federation" ON atletas;
DROP POLICY IF EXISTS "Academia admins can view their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can view all atletas" ON atletas;
DROP POLICY IF EXISTS "Users can view athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - select based on role" ON atletas;

DROP POLICY IF EXISTS "Federation admins can update athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can update their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can update atletas" ON atletas;
DROP POLICY IF EXISTS "Users can update athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - update based on role" ON atletas;

DROP POLICY IF EXISTS "Federation admins can delete athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can delete atletas" ON atletas;
DROP POLICY IF EXISTS "Users can delete athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - delete based on role" ON atletas;

-- Ensure RLS is enabled
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE and permissive policies

-- 1. Master Access - can do EVERYTHING
CREATE POLICY "MA Insert"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "MA Select"
  ON atletas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "MA Update"
  ON atletas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "MA Delete"
  ON atletas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

-- 2. Federation Admin - can manage athletes in their federation
CREATE POLICY "FA Insert"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role IN ('federacao_admin', 'federacao_staff')
    )
  );

CREATE POLICY "FA Select"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role IN ('federacao_admin', 'federacao_staff')
    )
  );

CREATE POLICY "FA Update"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role IN ('federacao_admin', 'federacao_staff')
    )
  );

CREATE POLICY "FA Delete"
  ON atletas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role = 'federacao_admin'
    )
  );

-- 3. Academia Admin - can manage athletes in their academy
CREATE POLICY "AA Insert"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role IN ('academia_admin', 'academia_staff')
    )
  );

CREATE POLICY "AA Select"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role IN ('academia_admin', 'academia_staff')
    )
  );

CREATE POLICY "AA Update"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role IN ('academia_admin', 'academia_staff')
    )
  );

CREATE POLICY "AA Delete"
  ON atletas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role = 'academia_admin'
    )
  );
