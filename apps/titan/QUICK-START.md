# Titan - Quick Start Guide

## 🚀 COMEÇAR AGORA (5 minutos)

### 1. Criar Projeto Supabase
1. Acesse https://supabase.com/dashboard
2. "New Project"
3. Nome: **Titan - Federações**
4. Região: **South America (São Paulo)**
5. Senha: (escolha uma forte)
6. Aguarde ~2min

### 2. Aplicar Database Schema
1. No Supabase, vá em **SQL Editor**
2. "New Query"
3. Cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. **Run** (Ctrl+Enter)
5. ✅ "Success. No rows returned"

### 3. Copiar Credenciais
1. **Settings** → **API**
2. Copie:
   - Project URL
   - anon key
   - service_role key

### 4. Configurar Ambiente
```bash
cd apps/titan
cp .env.local.example .env.local
```

Edite `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 5. Criar Primeiro Usuário
No Supabase:
1. **Authentication** → **Users**
2. **Add User**
3. Email: `admin@lrsj.com.br`
4. Senha: (escolha)
5. ✅ Criar

Depois, no **SQL Editor**:
```sql
-- Pegue o UUID do usuário criado
SELECT id, email FROM auth.users;

-- Crie a primeira federação (LRSJ)
INSERT INTO federacoes (nome, sigla, email, cor_primaria, cor_secundaria)
VALUES (
  'Liga Regional de Submission de Jiu-Jitsu',
  'LRSJ',
  'contato@lrsj.com.br',
  '#16A34A',
  '#DC2626'
);

-- Pegue o ID da federação
SELECT id, nome FROM federacoes;

-- Dê role de federacao_admin ao usuário
INSERT INTO user_roles (user_id, role, federacao_id)
VALUES (
  'COLE-USER-UUID-AQUI',
  'federacao_admin',
  'COLE-FEDERACAO-UUID-AQUI'
);
```

### 6. Iniciar Aplicação
```bash
npm run dev
```

Acesse: http://localhost:3000

Login:
- Email: `admin@lrsj.com.br`
- Senha: (que você criou)

## ✅ PRONTO!

Agora você pode:
- Ver o dashboard
- Navegar pelo menu lateral
- Clicar em "Nova Academia"
- Preencher o formulário (multi-step)

---

## 📝 PRÓXIMAS IMPLEMENTAÇÕES

### AGORA (30min)
- [ ] Ligar o form de academia ao banco
- [ ] Implementar listagem de academias
- [ ] Adicionar paginação

### HOJE (2h)
- [ ] Editar academia (modal ou página)
- [ ] Delete academia (soft delete)
- [ ] Buscar academias por nome

### ESSA SEMANA (8h)
- [ ] Safe2Pay: gerar cobrança anualidade
- [ ] Webhook Safe2Pay
- [ ] Email automático pós-pagamento
- [ ] Dashboard com dados reais

### PRÓXIMA SEMANA (16h)
- [ ] CRUD Atletas
- [ ] Upload de foto
- [ ] Eventos básicos
- [ ] Sistema de cursos

---

## 🎯 MVP CHECKLIST

Para lançar para LRSJ:

- [ ] Cadastrar academias ✅ (form pronto)
- [ ] Listar academias (30min)
- [ ] Editar academias (1h)
- [ ] Gerar cobrança anualidade (2h)
- [ ] Webhook processar pagamento (2h)
- [ ] Email confirmação (30min)

**Total: ~6 horas**

---

## 🔧 COMANDOS ÚTEIS

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Lint
npm run lint

# Formatar código
npx prettier --write .

# Limpar cache
rm -rf .next node_modules
npm install
```

---

## 📞 HELP

**Supabase não conecta?**
- Verifique .env.local
- Reinicie o dev server
- Teste no SQL Editor

**CSS não carrega?**
- `npm run dev` (rebuild)
- Hard refresh (Cmd+Shift+R)

**Middleware warning?**
- Pode ignorar (Next.js 16)

**Build error?**
- `rm -rf node_modules && npm install`

---

**Status:** ✅ PRONTO PARA USAR
