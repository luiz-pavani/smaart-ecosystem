# 🚀 DEV 1 - SPRINT 1A (PAGAMENTOS)

**Commit inicial:** `d02a8af` ✅  
**Build status:** Passing ✅  
**Rota:** `/dashboard/pagamentos` ✅

---

## ✅ O Que Já Está Pronto

### Endpoints Criados
```
POST /api/pagamentos/criar
├─ Valida: academia_id, atleta_id, valor, metodo_pagamento
├─ Cria pedido em tabel: pedidos
└─ Retorna: { pedido_id, status: 'pendente' }

GET /api/pagamentos/listar
├─ Lista todos os pedidos com info de academia/atleta
└─ Retorna: array de pedidos com valores formatados
```

### Componentes Criados
```
components/pagamentos/PagamentosLista.tsx
├─ Componente React que busca /api/pagamentos/listar
├─ Renderiza tabela bonita com status colorido
└─ Botão refresh para recarregar dados
```

### Página Criada
```
app/(dashboard)/pagamentos/page.tsx
├─ Página acessível em: /dashboard/pagamentos
└─ Renderiza: <PagamentosLista />
```

---

## 📋 Como Começar Segunda

### 1️⃣ Setup Local (5 min)
```bash
cd apps/titan

# Se não tiver a branch, criar:
git checkout -b feat/sprint-1a-pagamentos

# Ou se já tiver:
git checkout feat/sprint-1a-pagamentos

npm install
```

### 2️⃣ Testar Endpoints Localment (10 min)

**Terminal 1: Iniciar servidor**
```bash
npm run dev
# Acessa: http://localhost:3000/dashboard/pagamentos
```

**Terminal 2: Testar POST**
```bash
# Copie e cole no terminal (ou use Postman/Insomnia):

curl -X POST http://localhost:3000/api/pagamentos/criar \
  -H "Content-Type: application/json" \
  -d '{
    "academia_id": "<uuid-de-uma-academia>",
    "atleta_id": "<uuid-de-um-atleta>",
    "valor": 100.00,
    "metodo_pagamento": "pix"
  }'
```

📌 **Para pegar UUIDs reais:**
```bash
# Acesse Supabase → academias → copie um academia_id
# Acesse Supabase → atletas → copie um atleta_id
```

### 3️⃣ Seu Primeiro Commit
```bash
# Apenas para confirmar que tudo funciona localmente!
git add -A
git commit -m "test: validar endpoints Sprint 1A"
git push
```

---

## 📌 Próximas Features Para Você

### Feature 1: Componente de Criar Pedido (Esta semana)
```jsx
// components/pagamentos/CriarPedidoForm.tsx
<CriarPedidoForm 
  onSuccess={() => carregarPedidos()} 
/>
```

Precisa:
- Form com campos: academia_id (select), atleta_id (select), valor (input), metodo (select)
- POST para /api/pagamentos/criar
- Toast/Modal de sucesso

**Tempo estimado:** 2 horas  
**Roadmap:** Quarta 20/02

### Feature 2: Card de Estatísticas (Esta semana)
```jsx
// Mostrar: Total pedidos, Aprovados, Pendentes
// Valor total, Valor aprovado
```

**Tempo estimado:** 1.5 horas  
**Roadmap:** Quinta 21/02

### Feature 3: Integração Safe2Pay (Próxima semana)
```typescript
// POST /api/pagamentos/criar deve:
// 1. Validar dados
// 2. Criar pedido em DB (status: pendente)
// 3. Enviar para Safe2Pay
// 4. Retornar link de pagamento
```

**Tempo estimado:** 4 horas  
**Roadmap:** Segunda 25/02

---

## 🎯 Checklist Semanal

### Segunda 19/02
- [ ] Clone/setup local
- [ ] `npm run dev` funciona
- [ ] Consegue acessar /dashboard/pagamentos
- [ ] POST /api/pagamentos/criar retorna sucesso
- [ ] Primeiro commit enviado

### Terça 20/02
- [ ] CriarPedidoForm component criado
- [ ] Form valida dados
- [ ] Integrado no PagamentosLista (lado a lado ou modal)
- [ ] UI está bonita

### Quarta 21/02
- [ ] Card de Estatísticas funcionando
- [ ] Exibe números corretos
- [ ] Teste com 3+ pedidos

### Quinta 22/02
- [ ] PR criado (Pull Request)
- [ ] Code review com Luiz
- [ ] Merges para main
- [ ] Deploy com `vercel --prod`

---

## 🔧 Arquivos Importantes

| Arquivo | Função | Quando editar |
|---------|--------|---------------|
| `app/api/pagamentos/criar.ts` | POST endpoint | Se precisar validar mais coisa |
| `app/api/pagamentos/listar.ts` | GET endpoint | Se precisar filtrar/ordenar |
| `components/pagamentos/PagamentosLista.tsx` | Componente lista | Sempre que refatorar UI |
| `app/(dashboard)/pagamentos/page.tsx` | Página principal | Quando adicionar outro componente |
| `package.json` | Dependências | Se precisar instalar algo |

---

## 🐛 Troubleshooting

### "Module not found: @/..."
→ Use caminhos relativos, ex: `../../../components/...`

### "Build failed"
→ Rode `npm run build` lokally, veja o erro, fixe, commit

### "Não consegue conectar Supabase"
→ Verifique `.env.local` tem `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_KEY`

### "API retorna 404"
→ Verifique o caminho da rota, certifique-se que arquivo é `.ts` ou `.tsx`

### "Elementos não aparecem"
→ Abra inspector (F12), veja console.log(), rode `npm run dev` novamente

---

## 💬 Comunicação

- **Daily standup:** 15:00 BRT
- **Slack channel:** #sprint-pagamentos (criaremos segunda)
- **PR reviews:** Assim que enviar
- **Blocker:** Avise Luiz imediatamente

---

## 🚀 Sucesso é Quando

- ✅ Form cria pedido sem erros
- ✅ Lista mostra pedido criado
- ✅ Build passa (`npm run build`)
- ✅ Deploy em produção sem erros
- ✅ App acessível em https://titan.smaartpro.com/dashboard/pagamentos

---

**Boa sorte Dev 1! 💪**  
Qualquer dúvida, ping no Slack ou email!
