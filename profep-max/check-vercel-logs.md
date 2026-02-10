# Verificar Logs do Vercel

## Status atual:
- ✅ Testes retornam HTTP 200
- ❌ Nenhum dado é gravado no Supabase
- ❌ subscription_events vazio
- ❌ profiles não atualizado
- ❌ vendas não criado

## O que fazer:

1. **Acessar Vercel Dashboard**:
   - Ir para: https://vercel.com/luiz-pavanis-projects/profep-max
   - Clicar em "Deployments"
   - Clicar no deployment mais recente (commit ae12db4)
   - Clicar em "Functions" → "api/webhooks/safe2pay"
   - Ver os logs em tempo real

2. **O que procurar nos logs**:
   - `[DEBUG] Webhook POST chamado!`
   - `[RECURRENCE] ✅ Detectado evento:`
   - `[AUDIT] Tentando registrar evento:`
   - `[AUDIT] ✅ Evento`
   - Erros do Supabase

3. **Se não houver logs**:
   - O código não está executando
   - Pode estar em cache antigo do Vercel
   - Tentar forçar redeploy

4. **Próximos passos**:
   - Copiar os logs do Vercel aqui
   - Eu analiso e identifico o problema
