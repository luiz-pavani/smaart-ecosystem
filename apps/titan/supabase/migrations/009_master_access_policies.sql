-- =====================================================
-- Migration 009: Master Access Policies
-- =====================================================

-- Federações
CREATE POLICY "Master access can view all federacoes"
  ON federacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

CREATE POLICY "Master access can insert federacoes"
  ON federacoes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

CREATE POLICY "Master access can update federacoes"
  ON federacoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

CREATE POLICY "Master access can delete federacoes"
  ON federacoes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

-- Academias
CREATE POLICY "Master access can view all academias"
  ON academias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

CREATE POLICY "Master access can insert academias"
  ON academias FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

CREATE POLICY "Master access can update academias"
  ON academias FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );

CREATE POLICY "Master access can delete academias"
  ON academias FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_access'
    )
  );
