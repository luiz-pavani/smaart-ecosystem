-- =====================================================
-- Migration 013: Master Access Policies for Atletas
-- =====================================================
-- Description: Add RLS policies to allow master_access role to manage atletas table
-- This enables the master admin user to create, view, update, and delete athletes

-- Master access can view all atletas
CREATE POLICY "Master access can view all atletas"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

-- Master access can insert atletas (must have valid academia_id and federacao_id)
CREATE POLICY "Master access can insert atletas"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
    AND federacao_id IS NOT NULL
    AND academia_id IS NOT NULL
  );

-- Master access can update atletas
CREATE POLICY "Master access can update atletas"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

-- Master access can delete atletas
CREATE POLICY "Master access can delete atletas"
  ON atletas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );
