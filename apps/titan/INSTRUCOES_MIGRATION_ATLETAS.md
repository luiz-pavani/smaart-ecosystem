# 🎯 INSTRUÇÕES: Como Aplicar a Migration dos Atletas

## ✅ PASSO A PASSO (5 minutos)

### 1️⃣ **Abra o SQL Editor do Supabase**
Clique neste link:
👉 https://supabase.com/dashboard/project/<project-ref>/sql/new

### 2️⃣ **Abra o arquivo SQL no VS Code**
- Abra o arquivo: `APLICAR_NO_SUPABASE.sql` (está na raiz do projeto titan)
- Pressione `Cmd+A` para selecionar tudo
- Pressione `Cmd+C` para copiar

### 3️⃣ **Cole no SQL Editor**
- Volte para o Supabase SQL Editor
- Pressione `Cmd+V` para colar todo o SQL
- Clique no botão verde **"Run"** no canto superior direito

### 4️⃣ **Aguarde a execução**
- Deve levar 3-5 segundos
- Você verá "Success. No rows returned" (isso é normal!)

### 5️⃣ **Crie o bucket de Storage**
- Vá em: https://supabase.com/dashboard/project/<project-ref>/storage/buckets
- Clique em **"New bucket"**
- Nome: `atletas`
- Marque como **"Public bucket"** ✅
- Clique em **"Create bucket"**

---

## 🎉 PRONTO! Agora você pode:

1. **Testar o sistema**: http://localhost:3000/atletas
2. **Cadastrar atletas** com todos os campos:
   - ✅ Dados pessoais (nome, CPF, RG, contato)
   - ✅ Endereço completo (CEP com busca automática)
   - ✅ Graduação: BRANCA até FAIXA PRETA
   - ✅ Dan: SHODAN até HACHIDAN
   - ✅ Nível de arbitragem
   - ✅ Upload de fotos (perfil + documento)
   - ✅ Upload de certificados (dan + arbitragem)
   - ✅ Sistema de lotes (ex: "2026 1")
   - ✅ Número de registro automático (FED-ACAD-2026-0001)

---

## ❓ Troubleshooting

Se aparecer erro no Supabase:
- ✅ Certifique-se de que copiou **TODO** o conteúdo do arquivo SQL
- ✅ Não adicione nada antes ou depois do SQL
- ✅ Se aparecer "relation already exists", a tabela já foi criada!

---

## 📁 Arquivos Criados:

- ✅ `/supabase/migrations/006_atletas.sql` - Migration original
- ✅ `/APLICAR_NO_SUPABASE.sql` - Cópia para aplicar (mesmo conteúdo)
- ✅ `/app/(dashboard)/atletas/page.tsx` - Listagem de atletas
- ✅ `/app/(dashboard)/atletas/novo/page.tsx` - Página de cadastro
- ✅ `/components/forms/NovoAtletaForm.tsx` - Formulário com 4 etapas
- ✅ `/app/api/atletas/route.ts` - API para criar/listar atletas

---

## 🧪 Para verificar se deu certo:

Execute no terminal:
```bash
node verificar-tabela-atletas.js
```

Se aparecer "✅ Tabela atletas JÁ EXISTE!" = Sucesso! 🎉
