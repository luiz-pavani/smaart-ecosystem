# ⚡ AÇÃO IMEDIATA - TITAN SETUP

## 🎯 SERVIDOR JÁ ESTÁ RODANDO!
✅ http://localhost:3000

**MAS** você precisa configurar o Supabase primeiro!

---

## 📋 SIGA ESTES 4 PASSOS (6 minutos):

### 1️⃣ CRIAR PROJETO SUPABASE (2 min)

**👉 CLIQUE AQUI: https://supabase.com/dashboard**

- New Project
- Name: `Titan Federacoes`
- Region: **South America (São Paulo)**
- Password: wvlZXvAOpUOz7B1l
- ⏳ Aguarde 2 min

---

### 2️⃣ APLICAR SQL (30 seg)

No Supabase:
1. **SQL Editor** (menu lateral)
2. **New Query**
3. Abra: `apps/titan/supabase/migrations/001_initial_schema.sql`
4. Copie TUDO (329 linhas)
5. Cole no SQL Editor
6. **Run** (Cmd+Enter)
7. ✅ "Success. No rows returned"

---

### 3️⃣ COPIAR CREDENCIAIS (1 min)

No Supabase:
1. **Settings** → **API**
2. Copie os 3 valores
3. Cole em: `apps/titan/.env.local` (já existe!)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

4. Salve (Cmd+S)
5. **Reinicie o servidor**: Ctrl+C no terminal e `npm run dev` novamente

---

### 4️⃣ CRIAR USUÁRIO (2 min)

No Supabase:
1. **Authentication** → **Users** → **Add User**
2. Email: `admin@lrsj.com.br`
3. Password: (anote!)
4. ✅ **Auto Confirm User**
5. **Create user**

#### Agora dê permissões:

1. **SQL Editor** → **New Query**
2. Abra: `apps/titan/setup-first-user.sql`
3. Execute **cada bloco** e copie os UUIDs
4. Verifique no final se aparece seu email

---

## 🎉 PRONTO! ABRA O NAVEGADOR

**👉 http://localhost:3000**

Login:
- Email: `admin@lrsj.com.br`
- Senha: (que você criou)

**Você verá:**
- ✅ Dashboard verde/vermelho LRSJ
- ✅ Menu lateral
- ✅ Botão "Nova Academia"

---

## 🚨 IMPORTANTE

Se aparecer erro 500:
1. Você esqueceu de copiar as credenciais no `.env.local`
2. OU esqueceu de reiniciar o servidor após editar `.env.local`

**Solução:**
```bash
Ctrl+C (parar servidor)
npm run dev (reiniciar)
```

---

## ✅ CHECKLIST

- [ ] Projeto Supabase criado
- [ ] SQL executado (5 tabelas)
- [ ] `.env.local` preenchido
- [ ] Servidor reiniciado
- [ ] Usuário criado
- [ ] Role admin atribuída
- [ ] Login OK em localhost:3000

**TEMPO: 6 minutos** ⏱️

---

**TUDO ESTÁ PREPARADO! Só seguir os passos acima** 🚀
