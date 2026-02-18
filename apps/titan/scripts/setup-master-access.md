# Setup Master Access - luizpavani@gmail.com

## Passo 1: Criar Usuário no Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/users
2. Clique em **"Add User"** ou **"Convidar usuário"**
3. Preencha:
   - **Email**: `luizpavani@gmail.com`
   - **Password**: `Gold8892#`
   - ✅ **Auto Confirm User** (marcar)
4. Clique em **"Create User"**

## Passo 2: Adicionar Role Super Admin

### Opção A: Via Supabase SQL Editor (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Cole e execute o seguinte SQL:

```sql
-- Adicionar role super_admin para luizpavani@gmail.com
INSERT INTO user_roles (user_id, role, federacao_id, academia_id)
SELECT 
  id,
  'super_admin',
  NULL,
  NULL
FROM auth.users 
WHERE email = 'luizpavani@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'luizpavani@gmail.com';
```

### Opção B: Via Supabase Table Editor

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
2. Abra a tabela **`user_roles`**
3. Clique em **"Insert"** → **"Insert row"**
4. Preencha:
   - **user_id**: (copie o ID do usuário da tabela `auth.users`)
   - **role**: `super_admin`
   - **federacao_id**: `NULL`
   - **academia_id**: `NULL`
5. Clique em **"Save"**

## Credenciais

```
Email: luizpavani@gmail.com
Senha: Gold8892#
Role: super_admin
```

## Verificação

Após completar os passos, faça login em: https://titan.smaartpro.com

O usuário deve ter acesso completo a todas as funcionalidades do sistema.

## Roles Disponíveis

- `super_admin` - Acesso total ao sistema
- `federacao_admin` - Administrador de federação
- `federacao_staff` - Staff da federação
- `academia_admin` - Administrador de academia
- `academia_staff` - Staff da academia
- `professor` - Professor/Instrutor
- `atleta` - Atleta (usuário padrão)
