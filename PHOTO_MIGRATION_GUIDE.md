# Migração de Fotos dos Atletas - Guia de Uso

Este guia explica como migrar as fotos dos atletas do SmoothComp para o Supabase Storage.

## 📋 Pré-requisitos

1. **Python 3.8+** instalado
2. **Credenciais do Supabase** (URL e Service Role Key)

## 🔧 Configuração

### 1. Instalar dependências Python

```bash
cd /Users/judo365/Documents/MASTER\ ESPORTES/SMAART\ PRO/smaart-ecosystem

pip3 install -r requirements-photo-migration.txt
```

### 2. Criar arquivo .env (se não existir)

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# Copie isso para um arquivo .env na raiz do projeto
NEXT_PUBLIC_SUPABASE_URL=https://risvafrrbnozyjquxvzi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 3. Obter a Service Role Key

1. Acesse: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/settings/api
2. Procure por "**service_role** secret"
3. Clique em "**Reveal**" e copie a chave
4. Cole no arquivo `.env` criado acima

⚠️ **IMPORTANTE**: A Service Role Key é secreta! Nunca commite no Git.

## 🚀 Executar a Migração

```bash
python3 migrate_athlete_photos.py
```

O script irá:
1. ✅ Criar o bucket `athlete-photos` no Supabase Storage (se não existir)
2. ✅ Buscar todos os atletas que têm fotos
3. ✅ Para cada atleta:
   - Baixar a foto do SmoothComp
   - Fazer upload para o Supabase Storage
   - Atualizar a URL no banco de dados
4. ✅ Exibir progresso e estatísticas

## 📊 Exemplo de Output

```
🚀 Iniciando migração de fotos dos atletas

📦 Criando bucket 'athlete-photos'...
✅ Bucket 'athlete-photos' criado com sucesso!

📊 Buscando atletas com fotos...
✅ Encontrados 1242 atletas com fotos

[1/1242] ALANYS LEITE AZAMBUJA DE LIMA (#5514)
   ⬇️  Baixando de https://smoothcomp.com/user/1058370/file/4395069...
   ⬆️  Fazendo upload para Supabase Storage...
   💾 Atualizando banco de dados...
   ✅ Migrado com sucesso! Nova URL: https://risvafrrbnozyjquxvzi...

[2/1242] ADEMIR DA SILVA JUNIOR (#5524)
   ...
```

## 🔄 Retomar Migração

Se a migração for interrompida, pode executar novamente:
- ✅ Atletas já migrados serão **pulados automaticamente**
- ✅ Continuará de onde parou

## 🛑 Pausar/Cancelar

Pressione **Ctrl+C** para pausar a qualquer momento.

## ✅ Verificar Resultados

Após a migração:

1. **No Supabase Studio**:
   - Vá em Storage → `athlete-photos`
   - Verifique se as imagens foram uploadadas

2. **No Titan**:
   - Acesse a página de um atleta
   - A foto deve carregar corretamente

3. **No Banco de Dados**:
   - Execute: `SELECT id, nome_completo, url_foto FROM user_fed_lrsj WHERE url_foto LIKE '%supabase%' LIMIT 10;`
   - Deve mostrar as novas URLs do Supabase

## 🐛 Troubleshooting

### Erro: "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env"
**Solução**: Crie o arquivo `.env` conforme instruções acima

### Erro: "No module named 'supabase'"
**Solução**: Execute `pip3 install -r requirements-photo-migration.txt`

### Erro: "bucket already exists"
**Solução**: Ignorar - o bucket já foi criado, o script detectará automaticamente

### Fotos não carregam após migração
**Solução**: 
1. Verifique se o bucket está público no Supabase
2. Verifique as URLs no banco de dados
3. Teste abrindo uma URL diretamente no navegador

## 📝 Notas

- O script cria um diretório temporário `temp_photos/` que é limpo automaticamente
- Cada foto é salva como `atleta_{id}.jpg` no Storage
- O script adiciona um delay de 0.5s entre cada atleta para não sobrecarregar
- URLs antigas do SmoothComp são preservadas (caso precise reverter)

## 🔐 Segurança

⚠️ **NUNCA commite o arquivo .env no Git!**

Adicione ao `.gitignore`:
```
.env
.env.local
temp_photos/
```

## 📞 Suporte

Em caso de dúvidas ou problemas, verifique:
- Logs do script (saída no terminal)
- Logs do Supabase Storage
- Conexão com internet
