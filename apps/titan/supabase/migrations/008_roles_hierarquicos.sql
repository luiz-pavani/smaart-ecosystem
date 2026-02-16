-- Migration 008: Sistema de Roles Hierárquicos
-- Created: 2026-02-16
-- Description: Implementa sistema completo de permissões hierárquicas

-- Drop old constraint if exists
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new roles to user_roles
-- Hierarchy (top to bottom):
-- 1. master_access - Acesso a absolutamente tudo
-- 2. federacao_admin (admin) - Acesso a tudo na federação e abaixo
-- 3. federacao_gestor (gestor) - Acesso a tudo na federação (exceto financeiro)
-- 4. academia_admin (responsável técnico/presidente) - Acesso a tudo na academia
-- 5. academia_gestor (auxiliar técnico) - Acesso a tudo na academia (exceto financeiro)
-- 6. professor - Acesso às suas turmas e alunos
-- 7. atleta - Acesso às suas informações

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN (
  'master_access',
  'federacao_admin',
  'federacao_gestor',
  'academia_admin', 
  'academia_gestor',
  'professor',
  'atleta'
));

-- Add nivel_hierarquico for easy comparison
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS nivel_hierarquico INTEGER;

-- Update nivel_hierarquico based on role
UPDATE user_roles
SET nivel_hierarquico = CASE role
  WHEN 'master_access' THEN 1
  WHEN 'federacao_admin' THEN 2
  WHEN 'federacao_gestor' THEN 3
  WHEN 'academia_admin' THEN 4
  WHEN 'academia_gestor' THEN 5
  WHEN 'professor' THEN 6
  WHEN 'atleta' THEN 7
  ELSE 7
END;

-- Create trigger to auto-set nivel_hierarquico
CREATE OR REPLACE FUNCTION set_nivel_hierarquico()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nivel_hierarquico := CASE NEW.role
    WHEN 'master_access' THEN 1
    WHEN 'federacao_admin' THEN 2
    WHEN 'federacao_gestor' THEN 3
    WHEN 'academia_admin' THEN 4
    WHEN 'academia_gestor' THEN 5
    WHEN 'professor' THEN 6
    WHEN 'atleta' THEN 7
    ELSE 7
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_nivel_hierarquico ON user_roles;
CREATE TRIGGER trigger_set_nivel_hierarquico
  BEFORE INSERT OR UPDATE OF role
  ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION set_nivel_hierarquico();

-- Function to check if user can grant permission to another user
CREATE OR REPLACE FUNCTION pode_atribuir_permissao(
  usuario_que_atribui_id UUID,
  role_a_atribuir TEXT,
  federacao_alvo_id UUID DEFAULT NULL,
  academia_alvo_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  role_atual TEXT;
  nivel_atual INTEGER;
  nivel_alvo INTEGER;
  federacao_atual_id UUID;
  academia_atual_id UUID;
BEGIN
  -- Get current user role and hierarchy level
  SELECT role, nivel_hierarquico, federacao_id, academia_id
  INTO role_atual, nivel_atual, federacao_atual_id, academia_atual_id
  FROM user_roles
  WHERE user_id = usuario_que_atribui_id;

  -- If user not found or has no role, deny
  IF role_atual IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get target role hierarchy level
  nivel_alvo := CASE role_a_atribuir
    WHEN 'master_access' THEN 1
    WHEN 'federacao_admin' THEN 2
    WHEN 'federacao_gestor' THEN 3
    WHEN 'academia_admin' THEN 4
    WHEN 'academia_gestor' THEN 5
    WHEN 'professor' THEN 6
    WHEN 'atleta' THEN 7
    ELSE 7
  END;

  -- Rule 1: Can only grant permissions below your level
  IF nivel_alvo <= nivel_atual THEN
    RETURN FALSE;
  END IF;

  -- Rule 2: master_access can grant anything
  IF role_atual = 'master_access' THEN
    RETURN TRUE;
  END IF;

  -- Rule 3: federacao roles can only grant within their federation
  IF role_atual IN ('federacao_admin', 'federacao_gestor') THEN
    IF federacao_alvo_id IS NULL OR federacao_alvo_id != federacao_atual_id THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  -- Rule 4: academia roles can only grant within their academia
  IF role_atual IN ('academia_admin', 'academia_gestor') THEN
    IF academia_alvo_id IS NULL OR academia_alvo_id != academia_atual_id THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  -- Professors and athletes cannot grant permissions
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN user_roles.nivel_hierarquico IS 'Nível hierárquico: 1=master, 2=fed_admin, 3=fed_gestor, 4=acad_admin, 5=acad_gestor, 6=professor, 7=atleta';
COMMENT ON FUNCTION pode_atribuir_permissao IS 'Verifica se um usuário pode atribuir determinada permissão a outro usuário';

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_user_roles_nivel_hierarquico ON user_roles(nivel_hierarquico);

-- Create helper view for role descriptions
CREATE OR REPLACE VIEW vw_roles_info AS
SELECT 
  'master_access' as role,
  'Master Access' as nome,
  'Acesso a absolutamente tudo e todos' as descricao,
  1 as nivel_hierarquico,
  true as acesso_financeiro
UNION ALL SELECT 
  'federacao_admin',
  'Administrador da Federação',
  'Acesso a tudo e todos em sua federação e abaixo',
  2,
  true
UNION ALL SELECT 
  'federacao_gestor',
  'Gestor da Federação',
  'Acesso a tudo e todos em sua federação e abaixo (exceto financeiro)',
  3,
  false
UNION ALL SELECT 
  'academia_admin',
  'Responsável Técnico / Presidente',
  'Acesso a tudo e todos no nível de academia e abaixo',
  4,
  true
UNION ALL SELECT 
  'academia_gestor',
  'Auxiliar Técnico',
  'Acesso a tudo e todos no nível de academia e abaixo (exceto financeiro)',
  5,
  false
UNION ALL SELECT 
  'professor',
  'Professor',
  'Acesso às informações de suas turmas e de seus alunos',
  6,
  false
UNION ALL SELECT 
  'atleta',
  'Atleta',
  'Acesso às suas informações',
  7,
  false;

COMMENT ON VIEW vw_roles_info IS 'View com informações descritivas de cada role do sistema';
