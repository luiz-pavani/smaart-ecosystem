-- Migration 015: Fix RLS policies for master_access on atletas
-- This replaces the conflicting policies from migrations 006 and 013
-- to allow master_access users to insert athletes while maintaining security

-- Drop existing conflicting INSERT policies
DROP POLICY IF EXISTS "Federation admins can insert athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can insert athletes for their academy" ON atletas;
DROP POLICY IF EXISTS "Master access can insert atletas" ON atletas;

-- Updated INSERT policy that includes master_access
-- Master access OR Federation admins OR Academia admins can insert
CREATE POLICY "Users can insert athletes based on their role"
  ON atletas FOR INSERT
  WITH CHECK (
    (
      -- Master access users can insert (must have federacao_id and academia_id NOT NULL)
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'master_access'
      )
      AND federacao_id IS NOT NULL
      AND academia_id IS NOT NULL
    )
    OR
    (
      -- Federation admins can insert for their federation
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.federacao_id = atletas.federacao_id
          AND user_roles.role IN ('federacao_admin', 'federacao_staff')
      )
    )
    OR
    (
      -- Academia admins can insert for their academy
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
          AND user_roles.academia_id = atletas.academia_id
          AND user_roles.role IN ('academia_admin', 'academia_staff')
      )
    )
  );

-- Drop existing SELECT policies and recreate with master_access
DROP POLICY IF EXISTS "Federation admins can view all athletes in their federation" ON atletas;
DROP POLICY IF EXISTS "Academia admins can view their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can view all atletas" ON atletas;

-- Updated SELECT policy that includes master_access
CREATE POLICY "Users can view athletes based on their role"
  ON atletas FOR SELECT
  USING (
    -- Master access can view all athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'master_access'
    )
    OR
    -- Federation admins can see all athletes in their federation
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role IN ('federacao_admin', 'federacao_staff')
    )
    OR
    -- Academia admins can see only their academy's athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.academia_id = atletas.academia_id
        AND user_roles.role IN ('academia_admin', 'academia_staff')
    )
  );

-- Drop existing UPDATE policies and recreate with master_access
DROP POLICY IF EXISTS "Federation admins can update athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can update their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can update atletas" ON atletas;

-- Updated UPDATE policy that includes master_access
CREATE POLICY "Users can update athletes based on their role"
  ON atletas FOR UPDATE
  USING (
    -- Master access can update all athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'master_access'
    )
    OR
    -- Federation admins can update any athlete in their federation
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role IN ('federacao_admin', 'federacao_staff')
    )
    OR
    -- Academia admins can update only their academy's athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.academia_id = atletas.academia_id
        AND user_roles.role IN ('academia_admin', 'academia_staff')
    )
  );

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Federation admins can delete athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can delete atletas" ON atletas;

-- Updated DELETE policy that includes master_access
CREATE POLICY "Users can delete athletes based on their role"
  ON atletas FOR DELETE
  USING (
    -- Master access can delete all athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'master_access'
    )
    OR
    -- Only federation admins can delete athletes
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.federacao_id = atletas.federacao_id
        AND user_roles.role = 'federacao_admin'
    )
  );
