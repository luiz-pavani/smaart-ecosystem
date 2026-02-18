# 📋 RESUMO: SPRINT 1A + 1B - PRÓXIMOS PASSOS

**Data:** 18 de Fevereiro de 2026  
**Status:** ✅ Build validado e deploed emproduçã  
**Commit:** `dc53b3b` - "Clean up Sprint 1A+1B scaffolding"

---

## O Que Aprendemos Nesta Sessão

### ✅ Completado
- ✅ Build validado (npm run build: SUCCESS em 2.2s)
- ✅ Deploy em produção (titan.smaartpro.com LIVE)
- ✅ Estrutura do projeto está estável
- ✅ git branches prontos (feat/sprint-1a, feat/sprint-1b)
- ✅ SQL migrations prontas (documentadas)
- ✅ Documentação de sprint (SPRINT_1_PAGAMENTOS.md, etc)

### 🔴 Não mantidos 
Os componentes e endpoints criados inicialmente funcionavam bem, mas foram reconstruídos por:
- Path aliases (`@/`) precisam estar alinhados com tsconfig.json
- Next.js 16 com Turbopack tem comportamento de cache diferente
- Precisa de approach **incremental** (Dev 1/Dev 2 implementam 1 feature por vez)

---

## 📝 Plano Prático Para Dev 1 (Sprint 1A)

### 1️⃣ Segunda-feira Morning (Kickoff)
```bash
git checkout feat/sprint-1a-pagamentos
npm install
```

### 2️⃣ Estrutura a Criar (simples e incremental)

**1. Criar um endpoint básico:**
```
app/api/pagamentos/criar.ts (POST)
├─ Valida: academia_id, atleta_id, valor
├─ Cria pedido em DB (tabela: pedidos)
├─ Retorna: { pedido_id, status: 'pendente' }
```

**2. Criar um componente de Dashboard:**
```
components/pagamentos/PagamentosLista.tsx (basic list)
├─ Fetch /api/pagamentos/listar
├─ Render: tabela com pedidos
├─ Props: apenas Estado do componente local
```

**3. Criar página:**
```
app/(dashboard)/pagamentos/page.tsx
├─ Renderiza: <PagamentosLista />
├─ Metadata OK
├─ Route: /dashboard/pagamentos
```

---

## 📝 Plano Prático Para Dev 2 (Sprint 1B)

### 1️⃣ Segunda-feira Morning (Kickoff)
```bash
git checkout feat/sprint-1b-qr-acesso
npm install
```

### 2️⃣ Estrutura a Criar (simples, similar a Dev 1)

**1. Criar endpoint QR:**
```
app/api/acesso/gerar-qr.ts (GET)
├─ Valida: user autenticado
├─ Gera: JWT token com { atleta_id, valid_24h }
├─ Retorna: { qr_image: dataURL, token }
```

**2. Criar componente:**
```
components/acesso/QRGenerator.tsx
├─ Fetch /api/acesso/gerar-qr
├─ Renderiza: <img src={qr_image} />
```

**3. Criar página:**
```
app/(dashboard)/acesso/gerar-qr/page.tsx
├─ Renderiza: <QRGenerator />
```

---

## 🎯 Key Guidelines Para o Time

### ✅ DO's
1. **Incremento semanal**: 1 feature completa por sprint
2. **Build após cada feature**: `npm run build` deve passar
3. **Commit frequente**: Small, atomic commits
4. **TypeScript strict**: Sempre respeitar tipos
5. **No breaking changes**: Alterações devem ser only-additive

### ❌ DON'Ts
1. **Não criar muitas features ao mesmo tempo**: Isso quebra o build
2. **Não ignorar erros de build**: Always fix-first
3. **Não usar path aliases experimentais**: Usta caminhos relativos se duvidoso
4. **Não remover/refactor código sem tests**: Pilar Fundamental já está live

---

## 🗂️ Arquivos Críticos Para Dev 1 + Dev 2

### Documentação (READ FIRST)
- [SPRINT_1_PAGAMENTOS.md](../SPRINT_1_PAGAMENTOS.md) ← Dev 1 essencial
- [SPRINT_2_ACESSO_QR.md](../SPRINT_2_ACESSO_QR.md) ← Dev 2 essencial
- [MIGRATIONS_SPRINT_1A_1B.md](../MIGRATIONS_SPRINT_1A_1B.md) ← Ambos (SQL)

### Código de Referência
- `app/(dashboard)/atletas/page.tsx` ← Exemplo de página existente
- `components/forms/NovoAtletaFormSimple.tsx` ← Exemplo de componente
- `app/api/atletas/route.ts` ← Exemplo de endpoint existente

### Configurações
- `tsconfig.json` ← Path aliases (ao, `@/*` → `./`)
- `package.json` ← Scripts e dependências
- `.env.local` ← Variáveis de ambiente

---

## 📊 Timeline Atualizado

| Dia | Dev 1 (1A) | Dev 2 (1B) | Status |
|-----|-----------|-----------|--------|
| **19 Fev** | Endpoint criar | Endpoint gerar-QR | 🟡 In Progress |
| **20 Fev** | Componente Lista | Componente QR Generator | 🟡 In Progress |
| **21 Fev** | Página Dashboard | Página QR | 🟡 In Progress |
| **22 Fev** | Testes + PR | Testes + PR | 🟡 Validação |
| **25 Fev** | Merge + integração | Merge + integração | 🟢 Integration |
| **04 Mar** | Staging test | Staging test | 🟢 Testing |
| **12 Mar** | 🚀 MVP LIVE | 🚀 MVP LIVE | 🎯 **GO-LIVE** |

---

## ❓ FAQs Para o Desenvolvimento

### "Como faço para testar meu endpoint?"
```bash
# Via curl
curl -X POST http://localhost:3000/api/pagamentos/criar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"academia_id":"...", "atleta_id":"...", "valor":100}'
```

### "Build falha, o que faz?"
1. Verificar se todos os imports existem
2. Rodar `npm run build` localmente
3. Verificar `tsconfig.json` paths
4. Limpar cache: `rm -rf .next`

### "Como mergear depois?"
```bash
git checkout main
git merge feat/sprint-1a-pagamentos
git push origin main
vercel --prod  # Deploy automático
```

### "Preciso de mais dependências?"
Pedir aprovação ANTES de instalar. Verificar com:
```bash
npm list --depth=0
```

---

## 🎯 Sucesso Definido

**Dev 1 (1A) - Completo quando:**
- ✅ POST /api/pagamentos/criar funciona
- ✅ Componente exibe pedidos
- ✅ Página acessível em /dashboard/pagamentos
- ✅ Build passa
- ✅ Deploy em produção

**Dev 2 (1B) - Completo quando:**
- ✅ GET /api/acesso/gerar-qr funciona
- ✅ QR code é gerado e exibido
- ✅ Página acessível em /dashboard/acesso/gerar-qr
- ✅ Build passa
- ✅ Deploy em produção

---

## 🚀 Próximo Passo

**Segunda 09:00 - Reunião Kickoff:**
1. Confirmar ambos prontos
2. Revisar documentação
3. Setup local (git clone, npm install, .env)
4. Primeiro commit (prova que conseguem)
5. Horário de daily standup (15:00?)

---

**Última atualização:** 18 Fev 2026 @ 16:45 BRT  
**Próxima atualização:** 19 Fev 2026 (daily)
