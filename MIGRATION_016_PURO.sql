-- Migration 016: Fix ALL RLS policies for master_access

-- ============================================
-- ATLETAS TABLE - Fix INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Federation admins can insert athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can insert athletes for their academy" ON atletas;
DROP POLICY IF EXISTS "Master access can insert atletas" ON atletas;
DROP POLICY IF EXISTS "Users can insert athletes based on their role" ON atletas;

CREATE POLICY "Atletas - insert based on role"
  ON atletas FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access') AND federacao_id IS NOT NULL AND academia_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = atletas.academia_id AND role IN ('academia_admin', 'academia_staff'))
  );

DROP POLICY IF EXISTS "Federation admins can view all athletes in their federation" ON atletas;
DROP POLICY IF EXISTS "Academia admins can view their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can view all atletas" ON atletas;
DROP POLICY IF EXISTS "Users can view athletes based on their role" ON atletas;

CREATE POLICY "Atletas - select based on role"
  ON atletas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = atletas.academia_id AND role IN ('academia_admin', 'academia_staff'))
  );

DROP POLICY IF EXISTS "Federation admins can update athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can update their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can update atletas" ON atletas;
DROP POLICY IF EXISTS "Users can update athletes based on their role" ON atletas;

CREATE POLICY "Atletas - update based on role"
  ON atletas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = atletas.academia_id AND role IN ('academia_admin', 'academia_staff'))
  );

DROP POLICY IF EXISTS "Federation admins can delete athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can delete atletas" ON atletas;
DROP POLICY IF EXISTS "Users can delete athletes based on their role" ON atletas;

CREATE POLICY "Atletas - delete based on role"
  ON atletas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role = 'federacao_admin')
  );

-- ============================================
-- ACADEMIAS TABLE - Fix for master_access
-- ============================================

DROP POLICY IF EXISTS "nivel_4_5_academy_select" ON academias;
DROP POLICY IF EXISTS "master_access_academy_select" ON academias;

ALTER TABLE academias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Academias - master_access view all"
  ON academias FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "Academias - nivel 4 5 view own"
  ON academias FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = academias.id AND role IN ('nivel_4', 'nivel_5', 'instructor', 'staff'))
  );

CREATE POLICY "Academias - admins view their academias"
  ON academias FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.federacao_id = academias.federacao_id AND ur.role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.academia_id = academias.id AND ur.role IN ('academia_admin', 'academia_staff'))
  );
