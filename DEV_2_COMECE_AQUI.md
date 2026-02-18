# 🚀 DEV 2 - SPRINT 1B (QR ACESSO)

**Commit inicial:** `73bce4c` ✅  
**Build status:** Passing ✅  
**Rotas:** `/dashboard/acesso/gerar-qr` ✅

---

## ✅ O Que Já Está Pronto

### Endpoints Criados
```
GET /api/acesso/gerar-qr
├─ Parâmetros: atleta_id, academia_id (query string)
├─ Retorna: { qr_token, qr_image, atlas_id, academia_id, validade_ate }
└─ (Atualmente com mock - Dev 2 vai implementar JWT real)

POST /api/acesso/checkin
├─ Body: { qr_token, academia_id }
├─ Valida: token correto
└─ Retorna: { status: 'autorizado', mensagem, hora_entrada }
```

### Componentes Criados
```
components/acesso/QRGenerator.tsx
├─ Componente que gera QR (mock por enquanto)
├─ Exibe QR image
├─ Botão "Gerar Novo QR"
└─ Conta tempo de validade (24h)
```

### Página Criada
```
app/(dashboard)/acesso/gerar-qr/page.tsx
├─ Página em: /dashboard/acesso/gerar-qr
└─ Renderiza: <QRGenerator /> + instrções
```

---

## 📋 Como Começar Segunda

### 1️⃣ Setup Local (5 min)
```bash
cd apps/titan

# Se não tiver a branch, criar:
git checkout -b feat/sprint-1b-qr-acesso

# Ou se já tiver:
git checkout feat/sprint-1b-qr-acesso

npm install
```

### 2️⃣ Testar Endpoints Localmente (10 min)

**Terminal 1: Iniciar servidor**
```bash
npm run dev
# Acessa: http://localhost:3000/dashboard/acesso/gerar-qr
```

**Terminal 2: Testar GET**
```bash
curl "http://localhost:3000/api/acesso/gerar-qr?atleta_id=test-123&academia_id=test-456"
```

**Terminal 2: Testar POST**
```bash
curl -X POST http://localhost:3000/api/acesso/checkin \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"MOCK-TOKEN-123","academia_id":"test-456"}'
```

### 3️⃣ Seu Primeiro Commit
```bash
# Apenas para confirmar que tudo funciona localmente!
git add -A
git commit -m "test: validar endpoints Sprint 1B"
git push
```

---

## 📌 Próximas Features Para Você

### Feature 1: Implementar JWT Real (Esta semana)
**Precisão:** `npm install jsonwebtoken`

```typescript
// lib/acesso/qr-validator.ts
import jwt from 'jsonwebtoken'

export function gerarToken(atleta_id: string, academia_id: string) {
  return jwt.sign(
    { atleta_id, academia_id, timestamp: Date.now() },
    process.env.QR_SECRET_KEY!,
    { expiresIn: '24h' }
  )
}

export function validarToken(token: string) {
  try {
    return jwt.verify(token, process.env.QR_SECRET_KEY!)
  } catch {
    return null
  }
}
```

**Tempo estimado:** 1.5 horas  
**Roadmap:** Terça 20/02

---

### Feature 2: Gerar QR Code Real (Esta semana)
**Precisão:** `npm install qrcode`

```jsx
// Em /api/acesso/gerar-qr.ts:
import QRCode from 'qrcode'

const qr_image = await QRCode.toDataURL(qr_token)
```

**Tempo estimado:** 1 hora  
**Roadmap:** Terça 20/02

---

### Feature 3: Seletor de Academia (Esta semana)
```jsx
// Usuário seleciona academy antes de gerar QR
// Componente com dropdown
```

**Tempo estimado:** 1.5 horas  
**Roadmap:** Quarta 21/02

---

### Feature 4: Validação de Checkin Real (Esta semana)
```typescript
// POST /api/acesso/checkin deve:
// 1. Decodificar JWT
// 2. Verificar se expired
// 3. Gravar em tabela: frequencia
// 4. Retornar sucesso/erro
```

**Tempo estimado:** 2 horas  
**Roadmap:** Quinta 22/02

---

## 🎯 Checklist Semanal

### Segunda 19/02
- [ ] Clone/setup local
- [ ] `npm run dev` funciona
- [ ] Consegue acessar /dashboard/acesso/gerar-qr
- [ ] GET /api/acesso/gerar-qr retorna QR_image
- [ ] POST /api/acesso/checkin retorna "autorizado"
- [ ] Primeiro commit enviado

### Terça 20/02
- [ ] `npm install jsonwebtoken qrcode` 
- [ ] JWT real funcionando em gerar-qr
- [ ] QR Code real sendo gerado (não mais mock)
- [ ] Testes com postman/curl

### Quarta 21/02
- [ ] Dropdown de academia funcionando
- [ ] Usuário seleciona academia e gera seu QR
- [ ] UI está bonita

### Quinta 22/02
- [ ] Checkin valida token JWT
- [ ] Registra frequencia em banco
- [ ] PR criado (Pull Request)
- [ ] Code review com Luiz
- [ ] Deploy com `vercel --prod`

---

## 🔧 Arquivos Importantes

| Arquivo | Função | Quando editar |
|---------|--------|---------------|
| `app/api/acesso/gerar-qr.ts` | GET endpoint | Implementar JWT + QRCode |
| `app/api/acesso/checkin.ts` | POST endpoint | Validar JWT, gravar frequencia |
| `components/acesso/QRGenerator.tsx` | Componente | Quando adicionar dropdown |
| `app/(dashboard)/acesso/gerar-qr/page.tsx` | Página | Quando mudar layout |
| `lib/acesso/qr-validator.ts` | (CRIAR) JWT utils | Terça 20/02 |
| `package.json` | Dependências | Quando instalar jsonwebtoken/qrcode |

---

## 🐛 Troubleshooting

### "Module not found: jsonwebtoken"
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### "Module not found: qrcode"
```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

### "JWT signature verification failed"
- Verificar se `process.env.QR_SECRET_KEY` está definido
- Verificar se tokens foram gerados com mesma chave

### "QR Code não aparece"
- Abra inspector (F12) → Console
- Verifique se `qr_image` é uma string válida (base64)

### "Checkin retorna erro 403"
- Verifique se token é válido: `jwt.verify()`
- Verifique se token não expirou

---

## 💬 Comunicação

- **Daily standup:** 15:00 BRT
- **Slack channel:** #sprint-qr-acesso (criaremos segunda)
- **PR reviews:** Assim que enviar
- **Blocker:** Avise Luiz imediatamente

---

## 🚀 Sucesso é Quando

- ✅ JWT é gerado corretamente
- ✅ QR code é renderizado
- ✅ Checkin valida token
- ✅ Build passa (`npm run build`)
- ✅ Deploy em produção sem erros
- ✅ App acessível em https://titan.smaartpro.com/dashboard/acesso/gerar-qr

---

**Boa sorte Dev 2! 💪**  
Qualquer dúvida, ping no Slack ou email!
