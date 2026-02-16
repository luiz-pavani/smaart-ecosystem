# 🚀 SETUP TITAN - SIGA ESTES PASSOS

## ✅ Passo 1: Criar Projeto Supabase (2 min)

### Clique aqui: [https://supabase.com/dashboard](https://supabase.com/dashboard)

1. **New Project**
2. Preencha:
   - **Name:** `Titan Federacoes`
   - **Database Password:** (escolha uma senha forte e ANOTE)
   - **Region:** `South America (São Paulo)` - sa-east-1
   - **Pricing:** Free (ou Pro)
3. Clique **Create new project**
4. ⏳ Aguarde ~2 minutos (tomar um café ☕)

---

## ✅ Passo 2: Aplicar Database Schema (1 min)

Quando o projeto estiver pronto:

1. No Supabase, clique em **SQL Editor** (menu lateral esquerdo)
2. Clique em **New Query**
3. Abra o arquivo: `apps/titan/supabase/migrations/001_initial_schema.sql`
4. **Copie TODO o conteúdo** (Cmd+A, Cmd+C)
5. **Cole no SQL Editor** do Supabase (Cmd+V)
6. Clique em **Run** (ou Cmd+Enter)
7. ✅ Deve aparecer: "Success. No rows returned"

---

## ✅ Passo 3: Copiar Credenciais (1 min)

1. No Supabase, vá em **Settings** → **API**
2. Você verá 3 valores:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. Abra o arquivo: `apps/titan/.env.local` (já criei para você)
4. Cole os 3 valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. Salve o arquivo (Cmd+S)

---

## ✅ Passo 4: Criar Primeiro Usuário (1 min)

1. No Supabase, vá em **Authentication** → **Users**
2. Clique em **Add User** → **Create new user**
3. Preencha:
   - **Email:** `admin@lrsj.com.br` (ou seu email)
   - **Password:** (escolha uma senha e ANOTE)
   - ✅ Marque **Auto Confirm User**
4. Clique **Create user**

### Agora configure a federação e role:

1. Volte ao **SQL Editor**
2. Abra o arquivo: `apps/titan/setup-first-user.sql` (já criei)
3. Execute **linha por linha** seguindo os comentários:
   - Primeiro: busca o UUID do usuário
   - Segundo: cria a federação LRSJ (copia o UUID retornado)
   - Terceiro: cola os UUIDs e dá role de admin
   - Quarto: verifica se funcionou

---

## ✅ Passo 5: Iniciar Aplicação (30 segundos)

Abra um terminal no VS Code e rode:

```bash
cd apps/titan
npm run dev
```

Aguarde aparecer:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

---

## ✅ Passo 6: Fazer Login! 🎉

1. Abra: [http://localhost:3000](http://localhost:3000)
2. Você será redirecionado para `/login`
3. Entre com:
   - **Email:** `admin@lrsj.com.br`
   - **Senha:** (que você criou no passo 4)
4. ✅ **BEM-VINDO AO TITAN!** 🥋

---

## 🎯 O que você verá:

- ✅ Dashboard verde/vermelho LRSJ
- ✅ Menu lateral com navegação
- ✅ Stats cards (zerados por enquanto)
- ✅ Botão "Nova Academia"

---

## 🐛 Problemas?

### "Invalid API key"
- Verifique se copiou as 3 chaves certas no `.env.local`
- Reinicie o servidor: `Ctrl+C` e `npm run dev` novamente

### "User not found" no login
- Você esqueceu de executar o `setup-first-user.sql`
- Volte ao SQL Editor e execute os passos

### "Cannot connect to Supabase"
- Verifique se o projeto Supabase está ativo (não pausado)
- Teste a conexão no SQL Editor primeiro

### Build error
```bash
rm -rf .next
npm run dev
```

---

## 📝 Checklist Rápido

- [ ] Projeto Supabase criado
- [ ] Migration SQL aplicada (5 tabelas criadas)
- [ ] Credenciais copiadas para `.env.local`
- [ ] Primeiro usuário criado no Authentication
- [ ] Federação LRSJ criada + role admin atribuída
- [ ] `npm run dev` rodando
- [ ] Login funcionando em http://localhost:3000

**Tempo total:** ~6 minutos ⏱️

---

## 🚀 Próximo: Testar Cadastro de Academia

1. Clique em **"Nova Academia"** no dashboard
2. Preencha o formulário multi-step
3. Clique em **"Finalizar Cadastro"**
4. Por enquanto vai dar alert (TODO) - normal! 
5. Próxima implementação: salvar no banco ✅

---

**Status:** 🟢 TUDO PRONTO - Só seguir os passos!
