# Variáveis de Ambiente Necessárias para o Admin

## Adicione ao seu arquivo .env.local:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Site URL para redirecionamentos
NEXT_PUBLIC_SITE_URL=https://www.profepmax.com.br

# Safe2Pay (já existentes)
SAFE2PAY_TOKEN=seu-token-safe2pay
```

## ⚠️ IMPORTANTE: Service Role Key

A variável `SUPABASE_SERVICE_ROLE_KEY` é necessária para:

1. Criar novos usuários via admin
2. Alterar senhas de usuários
3. Gerar links de recuperação de senha

**Onde encontrar:**
1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em Settings > API
4. Copie o "service_role" key (secret)
5. Cole no arquivo .env.local

**⚠️ NUNCA exponha esta chave publicamente!**
- Não commite .env.local no git
- Use apenas em server-side (API routes)
- Esta chave tem poderes de admin completo

## Configuração no Vercel

Para deploy em produção:

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em Settings > Environment Variables
4. Adicione:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
5. Faça novo deploy para aplicar as variáveis

---

**Status Atual:**
- ✅ Endpoints criados
- ✅ UI implementada
- ⚠️ Requer configuração das env vars para funcionar
