# ⚡ EXECUÇÃO RÁPIDA: 3 MINUTOS

## 🔴 VOCÊ PRECISA FAZER AGORA

### Passo 1: Abrir o Supabase Console (1 min)
```
1. Abra: https://app.supabase.com
2. Selecione projeto: Titan Academy
3. Menu esquerdo: SQL Editor
4. Clique: "+ New Query"
```

### Passo 2: Copiar o SQL (30 sec)
```
Abra este arquivo:
apps/titan/supabase/migrations/010_frequencia_acesso.sql

Cole TUDO (desde o primeiro -- até o final) 
no editor do Supabase
```

### Passo 3: Executar (30 sec)
```
Clique: "RUN" 
(ou Ctrl+Enter / Cmd+Enter)

Aguarde ~5 segundos
```

### Passo 4: Verificar Sucesso (1 min)
```
Você deverá ver verde ✅:
"Query executed successfully"

OU

Procure por:
CREATE TABLE
CREATE INDEX
CREATE POLICY
```

---

## ✅ DEPOIS DO "RUN"

Se tudo funcionou, as tabelas foram criadas:
- ✅ `frequencia` (histórico de acessos)
- ✅ `sessoes_qr` (QR codes com validade)
- ✅ RLS policies (segurança)

---

## 🧪 TESTAR

Abra no navegador:
```
https://titan.smaartpro.com/dashboard/modulo-acesso
```

Deverá aparecer:
- 4 Cards de estatísticas
- Seção de QR Code
- Histórico de acessos

---

## 🆘 SE HOUVER ERRO

### Erro: "relation frequencia already exists"
✅ Tudo bem, significa que já foi criado antes

### Erro: "user_roles não encontrado" 
❌ A tabela user_roles não existe
→ Execute outra migration antes

### Outro erro?
- Copie o erro exato
- Cole aqui para eu debugar

---

## 📊 DEPOIS DE TUDO FUNCIONAR

| Item | Status | Como testar |
|------|--------|-----------|
| Dashboard Frequência | ✅ | /dashboard/modulo-acesso |
| Histórico Detalhado | ✅ | /dashboard/modulo-acesso/frequencia |
| API Checkin | ✅ | POST /api/acesso/checkin |
| API Histórico | ✅ | GET /api/acesso/historico |

---

## 💾 TUDO PRONTO!

Você tem:
- ✅ Código em produção (Titan deployado)
- ✅ Migrations prontas
- ✅ Documentação clara
- ✅ Scripts de teste

**Agora só precisa executar o SQL no Supabase console!**

Quando terminar, me avisa que a gente testa tudo! 🚀
