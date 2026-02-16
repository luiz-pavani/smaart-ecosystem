# Titan - Configuração Supabase

## 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em "New Project"
3. Configurações:
   - **Name**: `Titan - Federações`
   - **Database Password**: Escolha uma senha forte (será solicitado depois)
   - **Region**: `South America (São Paulo)` - sa-east-1
   - **Pricing Plan**: Free (para desenvolvimento) ou Pro (para produção)

4. Aguarde ~2 minutos enquanto o projeto é provisionado

## 2. Copiar Credenciais

1. No dashboard do projeto, vá em **Settings** → **API**
2. Copie as seguintes informações:

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Configurar Variáveis de Ambiente

1. Crie o arquivo `.env.local` na raiz do projeto:

```bash
cp .env.local.example .env.local
```

2. Edite `.env.local` e cole as credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Aplicar Migrations

### Opção A: Usando o SQL Editor (Recomendado para primeira vez)

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Abra o arquivo `supabase/migrations/001_initial_schema.sql`
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Clique em **Run** (ou Ctrl/Cmd + Enter)
7. Verifique se aparece "Success. No rows returned"

### Opção B: Usando Supabase CLI (Para desenvolvedores avançados)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto (pegue o Project ID em Settings > General)
supabase link --project-ref xxxxx

# Aplicar migrations
supabase db push
```

## 5. Verificar Instalação

Execute no SQL Editor:

```sql
-- Deve retornar 5 tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('federacoes', 'academias', 'user_roles', 'pagamentos', 'subscription_events');
```

Se retornar 5 linhas, está tudo certo! ✅

## 6. Criar Primeiro Super Admin (Opcional - Desenvolvimento)

```sql
-- Primeiro, crie um usuário pelo Authentication > Users > Add User
-- Email: admin@titan.dev
-- Password: (escolha uma senha forte)

-- Depois, pegue o UUID do usuário e execute:
INSERT INTO user_roles (user_id, role, permissions)
VALUES (
  'COLE-O-UUID-AQUI', 
  'super_admin',
  '{"all": true}'::jsonb
);
```

## 7. Testar Aplicação

```bash
npm run dev
```

Acesse http://localhost:3000 - deve redirecionar para /login

## 8. Próximos Passos

- [ ] Criar interface de login
- [ ] Criar primeira federação (LRSJ)
- [ ] Configurar Safe2Pay credentials na federação
- [ ] Cadastrar academias

## Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou as chaves corretamente no `.env.local`
- Reinicie o servidor de desenvolvimento (`npm run dev`)

### Erro: "relation does not exist"
- As migrations não foram aplicadas
- Execute novamente o script SQL no SQL Editor

### Erro: "row-level security policy"
- Você está tentando acessar dados sem autenticação
- Faça login primeiro ou use o service_role key para testes

### Banco de dados não está em São Paulo
- Infelizmente, após criação não é possível mudar a região
- Delete o projeto e crie novamente selecionando `South America (São Paulo)`

## Estrutura Criada

```
Tabelas:
├── federacoes (Tenants raiz)
├── academias (Filiadas às federações)
├── user_roles (RBAC - Multi-role por usuário)
├── pagamentos (Transações Safe2Pay)
└── subscription_events (Logs de webhooks)

Políticas RLS:
├── Isolamento por federacao_id
├── Controle por role (admin, secretario, etc)
└── Usuários só veem seus próprios dados
```

## Segurança

- ✅ Row Level Security (RLS) ativado em todas as tabelas
- ✅ Políticas isolam dados por federação
- ✅ RBAC controla permissões por role
- ✅ Service role key nunca exposto no frontend
- ✅ Auth.users gerenciado pelo Supabase Auth

## Safe2Pay

Cada federação terá suas próprias credenciais Safe2Pay armazenadas em:
- `federacoes.safe2pay_token`
- `federacoes.safe2pay_signature_key`
- `federacoes.safe2pay_sandbox` (true para testes)

Isso permite que cada federação tenha sua própria conta Safe2Pay independente.
