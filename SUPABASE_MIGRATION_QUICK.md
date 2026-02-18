# 📋 GUIA RÁPIDO: EXECUTAR MIGRATIONS NO SUPABASE CONSOLE

## ⏱️ Tempo estimado: 3 minutos

### PASSO 1️⃣: Acessar o Supabase Console

1. Abra: **https://app.supabase.com**
2. Clique no projeto **Titan Academy**
3. Menu lateral esquerdo → **SQL Editor**

![Supabase SQL Editor](https://i.imgur.com/xyz.png)

---

### PASSO 2️⃣: Copiar o SQL

Abra o arquivo:
```
apps/titan/supabase/migrations/010_frequencia_acesso.sql
```

**Copie TODO o conteúdo** (desde `-- ============` até o final)

---

### PASSO 3️⃣: Colar no Editor

1. No Supabase, clique em **"+ New Query"**
2. Cole o SQL no editor
3. Você verá algo assim:

```sql
-- ============================================
-- SPRINT 1B: TABELAS DE ACESSO & FREQUÊNCIA
-- ============================================

CREATE TABLE IF NOT EXISTS frequencia (
  ...
)
```

---

### PASSO 4️⃣: Executar

1. Clique no botão **"RUN"** (canto superior direito)
   OU
   Pressione **Ctrl+Enter** (Windows/Linux) ou **Cmd+Enter** (Mac)

2. Aguarde (~5 segundos)

---

### PASSO 5️⃣: Verificar Resultado

Você deverá ver:

```
✅ Query executed successfully
```

Ou nos resultados:

```
CREATE TABLE
CREATE INDEX
CREATE POLICY
```

Se for verde ✅, significa que tudo funcionou!

---

## 🔍 VALIDAÇÃO: Confirmar que as Tabelas Foram Criadas

Cole este comando adicional para validar:

```sql
-- Listar as novas tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('frequencia', 'sessoes_qr')
ORDER BY table_name;
```

Resultado esperado:
```
table_name
-----------
frequencia
sessoes_qr
```

---

## 🛑 SE HOUVER ERRO

### Erro: "relation frequencia already exists"
- As tabelas já foram criadas antes
- É seguro ignorar (IF NOT EXISTS protege)

### Erro: "user_roles não encontrado"
- Significa que a tabela user_roles não existe
- Verifique as migrations anteriores
- Execute a migration 009 primeiro

### Erro de RLS Policy
- Às vezes ignora ou dá warning
- É ok, as policies foram criadas

---

## ✅ CHECKLIST FINAL

- [ ] Acessei o Supabase Console
- [ ] Colei o SQL do arquivo 010_frequencia_acesso.sql
- [ ] Cliquei em RUN
- [ ] Vi mensagem de sucesso ✅
- [ ] Validei com a query SELECT (tabelas aparecem)
- [ ] Feito! 🎉

---

## 🚀 PRÓXIMOS PASSOS

Após as migrations:

1. **Testar na aplicação:**
   - Abra: https://titan.smaartpro.com/dashboard/modulo-acesso
   - Deverá carregar o dashboard de frequência

2. **Testar os endpoints:**
   - Veja arquivo: `test-frequencia.sh`
   - Execute com um JWT token válido

3. **Inserir dados de teste:**
   ```sql
   INSERT INTO frequencia (academia_id, atleta_id, data_entrada, hora_entrada, status)
   VALUES ('550e8400-e29b-41d4-a716-446655440000', 'seu_atleta_uuid', '2026-02-18', '08:30', 'autorizado');
   ```

---

## 📞 SUPORTE

Se tiver dúvidas:
- Verifique se o arquivo 010_frequencia_acesso.sql está completo
- Copie TODO o conteúdo (não deixe linhas para trás)
- Tente novamente
- Cheque a aba "Console" para mensagens de erro detalhadas
