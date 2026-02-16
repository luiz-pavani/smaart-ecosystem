-- =====================================================
-- TITAN - Setup Primeiro Usuário e Federação LRSJ
-- Execute este SQL DEPOIS de criar o primeiro usuário via Authentication > Users
-- =====================================================

-- 1. VERIFICAR USUÁRIO CRIADO
-- Copie o UUID do usuário que você acabou de criar
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. CRIAR FEDERAÇÃO LRSJ
INSERT INTO federacoes (
  nome, 
  sigla, 
  email, 
  telefone,
  cor_primaria, 
  cor_secundaria,
  site
)
VALUES (
  'Liga Riograndense de Judô',
  'LRSJ',
  'contato@lrsj.com.br',
  '(11) 99999-9999',
  '#16A34A',
  '#DC2626',
  'https://lrsj.com.br'
)
RETURNING id, nome, sigla;

-- 3. COPIE O ID DA FEDERAÇÃO ACIMA E COLE ABAIXO

-- 4. DAR ROLE DE ADMIN AO USUÁRIO
-- COLE OS UUIDs COPIADOS:
INSERT INTO user_roles (user_id, role, federacao_id, permissions)
VALUES (
  'COLE-USER-UUID-AQUI',           -- UUID do usuário (passo 1)
  'federacao_admin',
  'COLE-FEDERACAO-UUID-AQUI',      -- UUID da federação (passo 2)
  '{"all": true}'::jsonb
);

-- 5. VERIFICAR SE DEU CERTO
SELECT 
  u.email,
  ur.role,
  f.nome as federacao
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN federacoes f ON f.id = ur.federacao_id;

-- ✅ Deve mostrar seu email com role 'federacao_admin' e federação 'LRSJ'
