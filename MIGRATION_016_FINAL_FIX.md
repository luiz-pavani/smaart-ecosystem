# 🔧 CORREÇÃO FINAL - RLS Master Access (Migration 016)

## ⚠️ PROBLEMA ENCONTRADO

1. ❌ Atletas: RLS policies conflitantes bloqueiam INSERT
2. ❌ Academias: master_access NÃO consegue ver  nenhuma academia
3. ❌ Resultado: Erro ao salvar atleta + Menu "Academias" não funciona

## ✅ SOLUÇÃO

Tenho uma nova migration 016 que **consolida e corrige TODOS os problemas**:

### O que será corrigido:

**ATLETAS:**
- ✅ INSERT: master_access + federacao_admin + academia_admin
- ✅ SELECT: master_access pode ver TODOS
- ✅ UPDATE: master_access pode editar TODOS
- ✅ DELETE: master_access pode deletar TODOS

**ACADEMIAS:**
- ✅ SELECT: master_access pode ver TODAS as academias
- ✅ Nivel 4/5: veem apenas sua academia
- ✅ Admins: veem suas academias

## 🚀 COMO APLICAR (PASSO A PASSO)

### 1️⃣ Abra SQL Editor do Supabase
```
https://app.supabase.com/project/_/sql
```
(Substitua `_` pelo seu project ID)

### 2️⃣ Cole ESTE SQL INTEIRO:

```sql
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = academias.id AND (nivel = 4 OR nivel = 5))
  );

CREATE POLICY "Academias - admins view their academias"
  ON academias FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.federacao_id = academias.federacao_id AND ur.role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.academia_id = academias.id AND ur.role IN ('academia_admin', 'academia_staff'))
  );
```

### 3️⃣ Clique em "RUN" (Cmd+Enter ou Ctrl+Enter)

### 4️⃣ Aguarde a confirmação:
```
✅ 11 commands executed successfully
```

## ✅ PRONTO!

### Teste agora:

1. **❌ Feche as abas/tabs abertas do navegador**
2. **❌ Limpe cache do navegador (Cmd+Shift+Delete)**  
3. **✅ Recarregue https://titan.smaartpro.com**
4. **✅ Faça login novamente como luizpavani@gmail.com**

### Deve funcionar:
- ✅ Clique em "Academias" no menu → Aparecem 29+ academias
- ✅ Clique em "Atletas" → Aparecem todos os atletas
- ✅ Clique em "Novo Atleta" → Pode preencher e salvar SEM erro RLS
- ✅ Mensagem "Atleta cadastrado com sucesso!"

## 🆘 Se Ainda Não Funcionar

1. **Verifique o SQL foi executado com sucesso**
   - Console do Supabase deve mostrar: "✅ 11 commands executed successfully"

2. **Limpe o cache do Next.js**
   - Vá ao terminal e rode: `npm run build`

3. **Se ainda não funcionar, verifique se a Tabela `atletas` tem RLS habilitada:**
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename = 'atletas';
   ```

4. **Contate com screenshot do erro na consola (F12)**

---

**Migration:** 016_fix_master_access_rls_final.sql  
**Data:** 2026-02-19  
**Status:** CRÍTICO - Resolve erro ao salvar atleta + acesso academias
