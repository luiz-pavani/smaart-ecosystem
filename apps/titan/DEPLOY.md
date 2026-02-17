# 🚀 Guia de Deploy - Titan

## 🎯 Deploy Automático (Recomendado)

Use o fluxo Git normal. O Vercel detecta e faz deploy automático:

```bash
cd /path/to/apps/titan

# 1. Fazer suas alterações
# 2. Adicionar e comitar
git add -A
git commit -m "feat: sua feature aqui"

# 3. Push (deploy automático)
git push
```

✅ O Vercel dispara o deploy automaticamente após o push
⏱️ Aguarde 1-2 minutos para conclusão
🔗 Acesse: https://titan.smaartpro.com

## 📊 Monitorar Deploy

- Dashboard: https://vercel.com/luiz-pavanis-projects/titan-app
- Ver logs: `vercel logs https://titan.smaartpro.com`
- Listar deploys: `vercel ls`

## 🔧 Testar Antes (Opcional)

```bash
# Build local para validar
npm run build

# Dev server
npm run dev
```

## 📌 Configuração Atual

- **URL Produção**: https://titan.smaartpro.com
- **Branch**: main (auto-deploy habilitado)
- **Root Directory**: apps/titan
- **Framework**: Next.js 16 + Turbopack

## ⚡ Alternativas Rápidas

### Deploy Manual (sem commit)
```bash
vercel --prod
```

### Scripts Auxiliares

**Deploy Completo** (build + commit + push + deploy):
```bash
./deploy.sh "mensagem"
```

**Deploy Rápido** (commit + push + deploy):
```bash
./deploy-quick.sh "mensagem"
```

## ❓ Solução de Problemas

### Deploy não aconteceu após push
1. Verifique em: https://vercel.com/luiz-pavanis-projects/titan-app
2. Confirme que está no branch `main`
3. Force um deploy: `vercel --prod`

### Cache no navegador
- Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows/Linux)
- Ou modo anônimo

### Build falhou
1. Rode `npm run build` localmente
2. Corrija erros
3. Comite e push novamente

## 📝 Boas Práticas

- ✅ Sempre teste com `npm run build` antes de comitar
- ✅ Use mensagens de commit descritivas
- ✅ Verifique o deploy no dashboard após push
- ✅ Aguarde conclusão antes de testar em produção

