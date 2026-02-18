# ✅ CHECKLIST FINAL - VALIDAÇÃO DO PILAR FUNDAMENTAL

**Data:** 18/02/2026  
**Responsável:** Equipe Dev / Gestor Técnico  
**Objetivo:** Confirmar que Cadastro Compartilhável está 100% funcional

---

## 🚀 TESTE 1: PÁGINA PÚBLICA DE REGISTRO

### Teste Manual:

```
URL: https://titan.smaartpro.com/registro/LRSJ

Resultado esperado:
[ ] Página carrega sem erro (branca, limpa)
[ ] Botão "Entrar" não visível (foi removido - não precisa login)
[ ] Título: "Bem-vindo(a) à Liga de Rugby de São João"
[ ] Formulário com 4 campos:
    [ ] Nome Completo (text input)
    [ ] Email (email input)
    [ ] Graduação (select: Branca, Azul, Roxa, Marrom, Preta)
    [ ] CPF (optional, masked)
[ ] Botão "Registrar" em azul
[ ] Botão "ou faça login aqui" em cinza

Ação 1: Preencher com dados fake:
  Nome: "João Silva"
  Email: "joao@test.com"
  Graduação: "Azul"
  CPF: deixar vazio

[ ] Clicar "Registrar"
[ ] Página carregando aparece (spinner)
[ ] Em ~2 segundos:
    [ ] Mensagem de sucesso: "Cadastro realizado com sucesso!"
    [ ] Dados do atleta exibidos (Nome, Email, Graduation, Academia)
    [ ] Botão "Copiar Link de Compartilhamento"
    [ ] Sugestão: "Compartilhe este link com seus amigos"

Ação 2: Validar inserção no banco:
  [ ] Ir para Supabase → Tabela `atletas`
  [ ] Filtrar por email: "joao@test.com"
  [ ] Confirmar que foi inserido com:
       - academia_id: (ID da LRSJ)
       - status: 'ativo'
       - status_pagamento: 'pendente'
       - metadata.registro_via: 'self_service'

Ação 3: Testar com academia diferente:
  URL: https://titan.smaartpro.com/registro/SP001
  [ ] Página carrega
  [ ] Nome da academia mudou (ou exibe ID se academa não existe)
  [ ] Formulário aparece igual
  [ ] Registrar é idêntico

Ação 4: Erro handling:
  [ ] Preencher apenas "Nome Completo"
  [ ] Clicar "Registrar"
  [ ] [ Mensagem de erro aparece: "Preencha todos os campos obrigatórios"
  [ ] Form fica no lugar, dados não perdem

Ação 5: Email duplicado:
  [ ] Tentar registrar com mesmo email "joao@test.com" novamente
  [ ] [ ] Erro deve aparecer: "Email já registrado"
  [ ] [ ] Form mantém dados preenchidos

```

**✅ TESTE 1 PASSOU?** → [ ] SIM [ ] NÃO

---

## 📱 TESTE 2: PÁGINA DE COMPARTILHAMENTO (GESTOR)

### Pré-requisito: Estar logado como gestor/admin

```
URL: https://titan.smaartpro.com/compartilhar-registro

Resultado esperado:
[ ] Página carrega (dentro do dashboard)
[ ] Header: "Compartilhar Registro de Atletas"
[ ] Card principal com:
    [ ] Nome da academia (ex: "Liga de Rugby de São João")
    [ ] Link gerado: "https://titan.smaartpro.com/registro/LRSJ"
    [ ] Campo de texto com link completo (readonly)
    [ ] Botão "Copiar Link" ao lado
    [ ] [ ] QR Code grande e visível (quadrado preto/branco)

Ação 1: Copiar link
  [ ] Clicar botão "Copiar Link"
  [ ] Mensagem "Copiado para área de transferência!" aparece
  [ ] Aguardar 2 segundos e desaparecer
  [ ] Ctrl+V em outro lugar → colar o link

Ação 2: Compartilhar via WhatsApp
  [ ] Clicar botão "WhatsApp" (ícone de WhatsApp)
  [ ] Abre WhatsApp com mensagem pré-preenchida:
      "Olá! 👋 Cadastre-se como atleta aqui: https://titan.smaartpro.com/registro/LRSJ"
  [ ] Escolher contato ou depois de cancelar, voltar à página

Ação 3: Compartilhar via Email
  [ ] Clicar botão "Email"
  [ ] Abre cliente de email com:
      Subject: "Cadastro de Atletas - LRSJ"
      Body: "Acesse: https://titan.smaartpro.com/registro/LRSJ"
  [ ] Ou voltar sem enviar

Ação 4: Share API Nativa
  [ ] Clicar botão "Compartilhar" (icon rounded arrow)
  [ ] Menu do SO aparece (Share Sheet no iOS, intent picker no Android)
  [ ] Opções: WhatsApp, Telegram, Messenger, etc aparecem
  [ ] Clicar WhatsApp → enviar
  [ ] Voltar à página

Ação 5: QR Code válido
  [ ] Abrir câmera do celular
  [ ] Apontar para QR Code na tela
  [ ] iOS: Detecta link, toca, abre página de registro
  [ ] Android: Abre scanner/navegador → link válido
  [ ] Se scanear com app QR → deve decodificar para "https://titan.smaartpro.com/registro/LRSJ"

Ação 6: Stats placeholder (futura feature)
  [ ] Área "Estatísticas" exibe:
      [ ] "0 registros esta semana"
      [ ] "0 registros este mês"
  [ ] (Será atualizado quando implementar tracking)

```

**✅ TESTE 2 PASSOU?** → [ ] SIM [ ] NÃO

---

## 🔗 TESTE 3: COMPARTILHAMENTO END-TO-END

### Cenário Real: Gestor compartilha com alunos

```
Ação 1: Gestor copia link
  [ ] Escreve em group de WhatsApp: "Pessoal, registrem aqui: https://titan.smaartpro.com/registro/LRSJ"
  [ ] (Simulação: copiar link de /compartilhar-registro)

Ação 2: Aluno clica no link (sem estar logado)
  [ ] Celular/Desktop abre link
  [ ] Carrega página público de registro (SEM botão de login)
  [ ] [ Preenche form
  [ ] [ Registra com sucesso
  [ ] [ Vê mensagem de sucesso

Ação 3: Validar no banco
  [ ] Supabase → atletas
  [ ] Confirmar novo registro existe
  [ ] metadata.registro_via === 'self_service'

Ação 4: Aluno pode fazer login (new user)
  [ ] Ir para /login
  [ ] Usar email que registrou
  [ ] Password: criar nova senha
  [ ] [ ] Login funciona
  [ ] [ ] Vê seu profile como atleta

Ação 5: Aluno vê seu QR de acesso
  [ ] Depois de login, ir para /modulo-acesso
  [ ] Vê seu QR code pessoal
  [ ] [ ] QR scanavel
  [ ] [ ] Mostra últimas entradas

```

**✅ TESTE 3 PASSOU?** → [ ] SIM [ ] NÃO

---

## 🎯 TESTE 4: INTEGRAÇÃO COM SIDEBAR

### Verificar que menu aparece corretamente

```
URL: https://titan.smaartpro.com/dashboard (logado como gestor)

[ ] Sidebar esquerda expande
[ ] Menu items na ordem:
    1. Dashboard
    2. Atletas
    3. Eventos
    4. Compartilhar Registro   ← NOVO ITEM
    5. Configurações
    
[ ] Ícone "Share" (Share2 icon) próximo a "Compartilhar Registro"
[ ] Clicar "Compartilhar Registro" → vai para /compartilhar-registro
[ ] Cor de destaque ao estar em /compartilhar-registro

```

**✅ TESTE 4 PASSOU?** → [ ] SIM [ ] NÃO

---

## 🐛 TESTE 5: ERROR HANDLING

### Testar situações de erro

```
Teste 5A: Academia não existe
  URL: https://titan.smaartpro.com/registro/INEXISTENTE
  [ ] Página carrega (não dá 404)
  [ ] Exibe: "Academia não encontrada" ou ID padrão
  [ ] Form ainda aparece (fallback)

Teste 5B: Network error durante submit
  [ ] Abrir DevTools → Network → throttle para "slow 3G"
  [ ] Preencher form
  [ ] Clicar Registrar
  [ ] Aguardar ~5 segundos
  [ ] [ ] Spinner aparece
  [ ] [ ] Timeout tratado graciosamente
  [ ] [ ] Erro exibido: "Erro na conexão. Tente novamente."
  [ ] [ ] Botão Registrar fica habilitado para retry

Teste 5C: Email duplicado (DB constraint)
  [ ] Usar email que já existe na tabela atletas
  [ ] Submeter form
  [ ] [ ] Erro de constraint tratado
  [ ] [ ] Mensagem amiga: "Email já registrado em nossa base"

```

**✅ TESTE 5 PASSOU?** → [ ] SIM [ ] NÃO

---

## 📊 TESTE 6: PERFORMANCE

### Validar velocidade e UX

```
[ ] Página de registro carrega em < 2s (home page)
[ ] Form submissão em < 500ms (API response)
[ ] QR Code gera em < 1s
[ ] Link copy é instantâneo
[ ] Sidebar navigation é smooth (sem lag)
[ ] Sem console errors ao abrir browser DevTools

Teste Performance Detail:
  [ ] Abrir DevTools → Lighthouse
  [ ] Performance score > 80
  [ ] Accessibility score > 85
  [ ] Best Practices > 80

```

**✅ TESTE 6 PASSOU?** → [ ] SIM [ ] NÃO

---

## 🔐 TESTE 7: SEGURANÇA & RLS

### Validar que permissões funcionam

```
Teste 7A: Usuário NÃO autenticado pode:
  [ ] Acessar /registro/LRSJ → ✅ SIM
  [ ] Ver formulário → ✅ SIM
  [ ] Fazer insert de atleta → ✅ SIM
  [ ] NÃO pode acessar /compartilhar-registro → vai para login ✅

Teste 7B: Atleta logado:
  [ ] NÃO pode acessar /compartilhar-registro (não é gestor)
  [ ] Redireciona para /unauthorized ou dashboard
  [ ] [ ] Mensagem: "Você não tem permissão"

Teste 7C: Gestor/Admin logado:
  [ ] [ ] PODE acessar /compartilhar-registro
  [ ] [ ] Vê apenas SUA academia (não outras)
  [ ] [ ] Botão de share funciona

Teste 7D: Injeção SQL
  [ ] Campo nome: "'; DROP TABLE atletas; --"
  [ ] Submit form
  [ ] [ ] Não executa SQL (Supabase parameterized queries)
  [ ] [ ] Registra literal com aspas/semicolons
  [ ] [ ] Nenhum erro no banco

```

**✅ TESTE 7 PASSOU?** → [ ] SIM [ ] NÃO

---

## 📈 TESTE 8: ANALYTICS & TRACKING

### Validar metadata e rastreamento

```
Teste 8A: Metadata na criação:
  [ ] Registrar novo atleta
  [ ] Ir ao Supabase → atletas
  [ ] Ver coluna `metadata`:
      [ ] { "registro_via": "self_service" }
      [ ] timestamp de criação
      [ ] fonte: "link_compartilhado"
      [ ] academia_id correto
      [ ] federacao_id correto

Teste 8B: Status padrões:
  [ ] status = 'ativo'
  [ ] status_pagamento = 'pendente'
  [ ] plan_status = null (será setado após pagamento)

Teste 8C: Rastreamento de sharing
  [ ] (Futuro) Contar quantos registros vieram via self_service
  [ ] Query Supabase:
      SELECT COUNT(*) FROM atletas 
      WHERE metadata->>'registro_via' = 'self_service'

```

**✅ TESTE 8 PASSOU?** → [ ] SIM [ ] NÃO

---

## 📋 RESUMO FINAL

### Marque todos os testes que passaram ✅

- [ ] ✅ Teste 1: Página Pública de Registro
- [ ] ✅ Teste 2: Página de Compartilhamento (Gestor)
- [ ] ✅ Teste 3: End-to-End (Gestor → Aluno)
- [ ] ✅ Teste 4: Integração com Sidebar
- [ ] ✅ Teste 5: Error Handling
- [ ] ✅ Teste 6: Performance
- [ ] ✅ Teste 7: Segurança & RLS
- [ ] ✅ Teste 8: Analytics & Tracking

### Status Geral:

```
🟢 TODOS OS TESTES PASSARAM?
   [ ] SIM → Pilar Fundamental PRÉ-PRODUÇÃO ✅
   [ ] NÃO → Ver falhas abaixo

Testes que FALHARAM:
  1. ___________________
  2. ___________________
  3. ___________________

Próxima ação:
  [ ] Debug no código
  [ ] Run npm run build again
  [ ] Deploy hotfix
  [ ] Re-teste
```

---

## 🚀 PROSEGUIR PARA PRÓXIMA FASE?

Se **TODOS** os testes acima passaram ✅:

```
█████████████████████████ 100% PRONTO

Próximo passo: SPRINT 1A - PAGAMENTOS
  
Ler: SPRINT_1_PAGAMENTOS.md
Version: v1.0
Start date: Segunda 18/02 às 09:00
Estimated duration: 60 horas (1 dev, 1 semana)

🎯 Meta: Live production com cobrança automática em 25/02
```

---

**CREATED:** 18/02/2026  
**LAST UPDATED:** 18/02/2026  
**VERSION:** 1.0  
**STATUS:** 🟢 READY FOR QA

