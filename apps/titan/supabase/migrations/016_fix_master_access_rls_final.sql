-- Migration 016: Fix ALL RLS policies for master_access
-- This fixes: atletas table + academias table for master_access users

-- ============================================
-- ATLETAS TABLE - Fix INSERT policy
-- ============================================

-- Drop existing conflicting INSERT policies on atletas
DROP POLICY IF EXISTS "Federation admins can insert athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can insert athletes for their academy" ON atletas;
DROP POLICY IF EXISTS "Master access can insert atletas" ON atletas;
DROP POLICY IF EXISTS "Users can insert athletes based on their role" ON atletas;

-- New consolidated INSERT policy for atletas
CREATE POLICY "Atletas - insert based on role"
  ON atletas FOR INSERT
  WITH CHECK (
    -- Master access can insert (must have federacao_id and academia_id NOT NULL)
    (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role = 'master_access'
      )
      AND federacao_id IS NOT NULL
      AND academia_id IS NOT NULL
    )
    OR
    -- Federation admins can insert for their federation
    (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND federacao_id = atletas.federacao_id
          AND role IN ('federacao_admin', 'federacao_staff')
      )
    )
    OR
    -- Academia admins can insert for their academy
    (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND academia_id = atletas.academia_id
          AND role IN ('academia_admin', 'academia_staff')
      )
    )
  );

-- Drop existing SELECT policies on atletas
DROP POLICY IF EXISTS "Federation admins can view all athletes in their federation" ON atletas;
DROP POLICY IF EXISTS "Academia admins can view their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can view all atletas" ON atletas;
DROP POLICY IF EXISTS "Users can view athletes based on their role" ON atletas;

-- New consolidated SELECT policy for atletas
CREATE POLICY "Atletas - select based on role"
  ON atletas FOR SELECT
  USING (
    -- Master access can view all athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
    OR
    -- Federation admins can see all athletes in their federation
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND federacao_id = atletas.federacao_id
        AND role IN ('federacao_admin', 'federacao_staff')
    )
    OR
    -- Academia admins can see only their academy's athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND academia_id = atletas.academia_id
        AND role IN ('academia_admin', 'academia_staff')
    )
  );

-- Drop existing UPDATE policies on atletas
DROP POLICY IF EXISTS "Federation admins can update athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can update their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can update atletas" ON atletas;
DROP POLICY IF EXISTS "Users can update athletes based on their role" ON atletas;

-- New consolidated UPDATE policy for atletas
CREATE POLICY "Atletas - update based on role"
  ON atletas FOR UPDATE
  USING (
    -- Master access can update all athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
    OR
    -- Federation admins can update any athlete in their federation
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND federacao_id = atletas.federacao_id
        AND role IN ('federacao_admin', 'federacao_staff')
    )
    OR
    -- Academia admins can update only their academy's athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND academia_id = atletas.academia_id
        AND role IN ('academia_admin', 'academia_staff')
    )
  );

-- Drop existing DELETE policies on atletas
DROP POLICY IF EXISTS "Federation admins can delete athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can delete atletas" ON atletas;
DROP POLICY IF EXISTS "Users can delete athletes based on their role" ON atletas;

-- New consolidated DELETE policy for atletas
CREATE POLICY "Atletas - delete based on role"
  ON atletas FOR DELETE
  USING (
    -- Master access can delete all athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
    OR
    -- Only federation admins can delete athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND federacao_id = atletas.federacao_id
        AND role = 'federacao_admin'
    )
  );

-- ============================================
-- ACADEMIAS TABLE - Fix for master_access
-- ============================================

-- Drop problematic policies
DROP POLICY IF EXISTS "nivel_4_5_academy_select" ON academias;
DROP POLICY IF EXISTS "master_access_academy_select" ON academias;

-- Ensure RLS is enabled
ALTER TABLE academias ENABLE ROW LEVEL SECURITY;

-- New policy: Master access can see ALL academias
CREATE POLICY "Academias - master_access view all"
  ON academias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
    -- Master access sees all academias (no additional filter needed)
  );

-- Nivel 4 and 5 can see their own academy
CREATE POLICY "Academias - nivel 4 5 view own"
  ON academias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND academia_id = academias.id
        AND (nivel = 4 OR nivel = 5)
    )
  );

-- Federation and academia admins can see their academias
CREATE POLICY "Academias - admins view their academias"
  ON academias FOR SELECT
  USING (
    -- Federation admins see all their federation's academias
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.federacao_id = academias.federacao_id
        AND ur.role IN ('federacao_admin', 'federacao_staff')
    )
    OR
    -- Academia admins see their academy
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.academia_id = academias.id
        AND ur.role IN ('academia_admin', 'academia_staff')
    )
  );
