# Migração 002 - Adicionar Logo e Sigla

## 📋 Instruções

Para adicionar os campos **logo** e **sigla** às academias, execute o SQL abaixo no Supabase Dashboard.

## 🔗 Passo a Passo

### 1. Acesse o SQL Editor do Supabase
```
https://supabase.com/dashboard/project/<project-ref>/sql
```

### 2. Clique em "New Query"

### 3. Cole e execute este SQL:

```sql
-- Adicionar coluna sigla (3 letras)
ALTER TABLE academias 
ADD COLUMN IF NOT EXISTS sigla VARCHAR(3);

-- Adicionar coluna logo_url
ALTER TABLE academias 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Adicionar comentários
COMMENT ON COLUMN academias.sigla IS 'Sigla de 3 letras da academia (ex: AJP, GFT)';
COMMENT ON COLUMN academias.logo_url IS 'URL da logo da academia, exibida automaticamente no perfil';
```

### 4. Clique em "Run" (F5)

## ✅ Verificação

Após executar, você pode verificar se funcionou:

```bash
node check-migration-002.js
```

## 🎯 O que isso adiciona?

- **`sigla`**: Campo de 3 letras para abreviação da academia (ex: "AJP", "GFT")
- **`logo_url`**: URL para a logo da academia, que será exibida automaticamente:
  - Na lista de academias
  - No perfil da academia
  - Em relatórios e documentos

## 📸 Como funciona?

1. **Cadastro**: Ao criar/editar uma academia, você pode informar a sigla e URL da logo
2. **Exibição**: 
   - Se houver logo, ela será exibida
   - Se não houver logo mas houver sigla, a sigla aparece em destaque
   - Se não houver nenhum dos dois, aparece o ícone padrão
3. **Perfil**: A logo entra automaticamente no perfil/cabeçalho da academia

## 💡 Alternativa: Modificar Schema Inicial

Se você ainda não cadastrou nenhuma academia, pode simplesmente aplicar a migração `001_initial_schema.sql` atualizada que já inclui esses campos.
