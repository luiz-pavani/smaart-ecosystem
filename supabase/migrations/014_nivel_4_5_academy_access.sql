-- Migration 014: Level 4 & 5 Academy Management Access Policies
-- Description: Add RLS policies for academy staff levels 4 and 5

-- Allow nivel 4 and 5 to manage their own academy
CREATE POLICY "nivel_4_5_academy_select"
ON academias
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT academia_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND (nivel = 4 OR nivel = 5)
      AND academia_id IS NOT NULL
  )
);

-- Allow nivel 4 and 5 to view/manage academy data (modalities, classes, etc)
-- This is already restricted by RLS on individual tables

-- Update academy table to ensure RLS is enforced
ALTER TABLE academias ENABLE ROW LEVEL SECURITY;

-- Clear any conflicting policies for academias
DROP POLICY IF EXISTS "public_academias_select" ON academias;

-- Master access can see all academias
CREATE POLICY "master_access_academy_select"
ON academias
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT NULL -- Master access has no specific academy_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'master_access'
  )
  OR 1=1 -- Allow all (public view for now)
);
