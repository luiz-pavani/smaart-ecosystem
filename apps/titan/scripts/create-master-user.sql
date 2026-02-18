-- Script para criar usuário master admin
-- Email: luizpavani@gmail.com
-- Senha: Gold8892#

-- IMPORTANTE: Este script deve ser executado no Supabase SQL Editor
-- 1. Vá para: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- 2. Cole este SQL
-- 3. Execute

-- Primeiro, verificar se o usuário já existe
DO $$
DECLARE
  user_id uuid;
  user_exists boolean;
BEGIN
  -- Verificar se o email já está registrado no auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'luizpavani@gmail.com'
  ) INTO user_exists;

  IF NOT user_exists THEN
    -- Criar usuário no auth.users (isso deve ser feito via Supabase Dashboard > Authentication > Add User)
    RAISE NOTICE 'ATENÇÃO: Crie o usuário manualmente no Supabase Dashboard primeiro!';
    RAISE NOTICE 'Email: luizpavani@gmail.com';
    RAISE NOTICE 'Senha: Gold8892#';
  ELSE
    -- Pegar o user_id
    SELECT id INTO user_id FROM auth.users WHERE email = 'luizpavani@gmail.com';
    
    -- Verificar se já tem role de super_admin
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = user_id AND role = 'super_admin'
    ) THEN
      -- Adicionar role de super_admin
      INSERT INTO user_roles (user_id, role, federacao_id, academia_id)
      VALUES (user_id, 'super_admin', NULL, NULL)
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE 'Role super_admin adicionada para luizpavani@gmail.com';
    ELSE
      RAISE NOTICE 'Usuário luizpavani@gmail.com já tem role super_admin';
    END IF;
  END IF;
END $$;

-- Verificar resultado
SELECT 
  u.email,
  ur.role,
  ur.federacao_id,
  ur.academia_id,
  u.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'luizpavani@gmail.com';
