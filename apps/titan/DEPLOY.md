# 🚀 Guia de Deploy - Titan

## Configuração Atual

- **Repositório**: `https://github.com/luiz-pavani/smaart-ecosystem.git`
- **Branch principal**: `main`
- **Projeto Vercel**: `titan-app`
- **URL de Produção**: `https://titan.smaartpro.com`
- **Estrutura**: Monorepo (pasta `apps/titan`)

## Scripts de Deploy

### 1. Deploy Completo (Recomendado)
```bash
./deploy.sh "sua mensagem de commit"
```
- ✅ Build local antes de comitar
- ✅ Valida que o código compila
- ✅ Commit e push automático
- ✅ Deploy em produção

### 2. Deploy Rápido
```bash
./deploy-quick.sh "sua mensagem de commit"
```
- ⚡ Sem build local
- ⚡ Commit e push direto
- ⚡ Deploy em produção
- ⚠️  Útil para mudanças pequenas

### 3. Deploy Manual
```bash
# Apenas fazer deploy sem commit
cd /path/to/apps/titan
vercel --prod
```

## Processo Automático

O projeto está configurado para:
- ✅ Auto-deploy em push para branch `main`
- ✅ Detecta mudanças apenas em `apps/titan/`
- ✅ Usa Next.js com Turbopack
- ✅ Deploy automático via Vercel

## Comandos Úteis

### Build Local
```bash
npm run build
```

### Dev Server
```bash
npm run dev
```

### Verificar Status do Vercel
```bash
vercel ls
```

### Ver Logs do Deploy
```bash
vercel logs https://titan.smaartpro.com
```

## Solução de Problemas

### Deploy não está aparecendo
1. Limpe o cache do navegador (Cmd+Shift+R)
2. Aguarde 1-2 minutos para propagação
3. Verifique em: https://vercel.com/luiz-pavanis-projects/titan-app

### Build falhou
1. Rode `npm run build` localmente
2. Corrija os erros
3. Tente novamente

### Permissões negadas nos scripts
```bash
chmod +x deploy.sh deploy-quick.sh
```

## URLs Importantes

- 🌐 Produção: https://titan.smaartpro.com
- 📊 Dashboard Vercel: https://vercel.com/luiz-pavanis-projects/titan-app
- 📝 GitHub: https://github.com/luiz-pavani/smaart-ecosystem
- 📚 Docs Vercel: https://vercel.com/docs
