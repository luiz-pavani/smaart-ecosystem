# Sistema de Certificados/Alvarás - Titan

## 📋 Visão Geral

Sistema completo para geração de **Certificados de Autorização de Funcionamento** para academias filiadas, com QR Code de validação pública funcionando.

## ✨ Funcionalidades

### 1. Geração de Certificados
- ✅ Emissão de certificado oficial pela federação
- ✅ Numeração automática sequencial (Ex: LRSJ-2026-00001)
- ✅ Validação de anuidade paga antes da emissão
- ✅ QR Code único para validação pública
- ✅ Download em PDF de alta qualidade
- ✅ Layout profissional com logo da federação

### 2. Validação Pública
- ✅ Página pública de validação (sem autenticação)
- ✅ Escaneamento de QR Code via smartphone
- ✅ Verificação de autenticidade em tempo real
- ✅ Status: válido, expirado, ou cancelado
- ✅ Exibição completa dos dados do certificado

### 3. Segurança
- ✅ Hash SHA-256 único por certificado
- ✅ Impossível falsificar ou duplicar
- ✅ Validação de anualidade paga
- ✅ RLS policies no Supabase
- ✅ Controle de acesso por role (federacao_admin)

## 🗄️ Banco de Dados

### Tabela: `certificados`

```sql
CREATE TABLE certificados (
  id UUID PRIMARY KEY,
  federacao_id UUID,
  academia_id UUID,
  numero_certificado VARCHAR(50) UNIQUE,  -- LRSJ-2026-00001
  ano_validade INTEGER,                   -- 2026
  data_emissao DATE,
  data_validade DATE,                     -- 31/12/2026
  hash_validacao VARCHAR(64) UNIQUE,      -- SHA256
  status VARCHAR(20),                     -- ativo, cancelado, expirado
  emitido_por_user_id UUID,
  created_at TIMESTAMPTZ
)
```

### Alteração: `academias`

```sql
ALTER TABLE academias 
ADD COLUMN certificado_2026_id UUID REFERENCES certificados(id);
```

### Função SQL: Geração Automática de Número

```sql
CREATE FUNCTION gerar_numero_certificado(
  p_federacao_id UUID,
  p_sigla_federacao VARCHAR(10),
  p_ano INTEGER
) RETURNS VARCHAR(50)
```

**Output:** `LRSJ-2026-00001`, `LRSJ-2026-00002`, etc.

## 📁 Estrutura de Arquivos

```
apps/titan/
├── supabase/migrations/
│   └── 005_certificados.sql                 # Migration completa
│
├── app/
│   ├── api/certificados/
│   │   ├── gerar/route.ts                   # POST - Gerar certificado
│   │   └── validar/[hash]/route.ts          # GET - Validar certificado
│   │
│   ├── (dashboard)/academias/
│   │   └── page.tsx                         # Lista com botão 🛡️
│   │
│   └── (public)/validar-certificado/
│       └── [hash]/page.tsx                  # Página pública de validação
│
├── components/
│   ├── modals/
│   │   └── CertificadoModal.tsx             # Modal de geração
│   │
│   └── pdf/
│       └── CertificadoPDF.tsx               # Gerador de PDF
│
└── lib/utils/
    └── certificado.ts                       # Utils (QR code, formatação)
```

## 🔌 APIs

### 1. POST `/api/certificados/gerar`

**Autenticação:** Requerida (federacao_admin)

**Body:**
```json
{
  "academia_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "certificado": {
    "id": "uuid",
    "numero_certificado": "LRSJ-2026-00001",
    "ano_validade": 2026,
    "data_emissao": "2026-02-15",
    "data_validade": "2026-12-31",
    "hash_validacao": "sha256...",
    "url_validacao": "https://titan.lrsj.com.br/validar-certificado/abc123",
    "academia": {...},
    "federacao": {...}
  }
}
```

**Validações:**
- ✅ Usuário é federacao_admin
- ✅ Academia pertence à federação do usuário
- ✅ Anualidade da academia está paga
- ✅ Certificado 2026 ainda não foi emitido

### 2. GET `/api/certificados/validar/[hash]`

**Autenticação:** Não requerida (público)

**Response:**
```json
{
  "valid": true,
  "status": "válido",
  "mensagem": "Certificado válido e ativo",
  "certificado": {
    "numero": "LRSJ-2026-00001",
    "ano": 2026,
    "dataEmissao": "2026-02-15",
    "dataValidade": "2026-12-31",
    "academia": {...},
    "federacao": {...}
  }
}
```

**Status possíveis:**
- `válido` - Certificado ativo e dentro da validade
- `expirado` - Data de validade passou
- `cancelado` - Certificado foi cancelado pela federação
- `inválido` - Hash não encontrado

## 🎨 Interface do Usuário

### Lista de Academias

Novo botão 🛡️ **"Gerar Certificado"** em cada linha:

```
[💰 Gerar Cobrança] [🛡️ Gerar Certificado] [👁 Ver] [✏️ Editar] [🗑️ Excluir]
```

### Modal de Geração

**Etapa 1: Confirmação**
- Dados da academia
- Verificações (filiada, anuidade paga)
- Informações do certificado
- Botão: "Gerar Certificado"

**Etapa 2: Sucesso**
- ✅ Certificado gerado
- Número do certificado em destaque
- Datas de emissão e validade
- Botão: "📥 Baixar PDF"
- Botão: "🔗 Ver Página de Validação"

### PDF do Certificado

**Layout:**
1. **Header:** Logo da federação + Nome
2. **Título:** "CERTIFICADO DE AUTORIZAÇÃO DE FUNCIONAMENTO"
3. **Número:** Destaque vermelho (LRSJ-2026-00001)
4. **Declaração:** Texto oficial de autorização
5. **Dados da Academia:** Nome, sigla, CNPJ, localidade, responsável
6. **Dados do Certificado:** Emissão, validade
7. **QR Code:** 120x120px com URL de validação
8. **Footer:** Data de geração, número do certificado

**Características:**
- Formato: A4 (210x297mm)
- Cores: Verde #16A34A (primária), Vermelho #DC2626 (destaque)
- Fontes: Helvetica
- QR Code: 200x200px (no PDF 120x120px)
- Margens: 40px

### Página Pública de Validação

**URL:** `https://titan.lrsj.com.br/validar-certificado/{hash}`

**Layout:**
- Header com status visual (verde/amarelo/vermelho)
- Ícone de status (✓/⚠️/✗)
- Mensagem de validação
- Logo da federação
- Dados completos do certificado
- Dados da academia
- Footer com data de verificação

## 🔐 Segurança

### RLS Policies

```sql
-- Federação admins podem ver certificados
CREATE POLICY "Federação admins can view their certificates"
  ON certificados FOR SELECT
  USING (federacao_id IN (SELECT federacao_id FROM user_roles ...));

-- Federação admins podem criar certificados  
CREATE POLICY "Federação admins can insert certificates"
  ON certificados FOR INSERT
  WITH CHECK (federacao_id IN (SELECT federacao_id FROM user_roles ...));

-- Academia admins podem ver seus certificados
CREATE POLICY "Academia admins can view their own certificates"
  ON certificados FOR SELECT
  USING (academia_id IN (SELECT academia_id FROM user_roles ...));
```

### Hash de Validação

```typescript
const timestamp = Date.now()
const randomData = Math.random().toString(36).substring(2, 15)
const hashValidacao = createHash('sha256')
  .update(`${academia_id}-${timestamp}-${randomData}`)
  .digest('hex')
```

**Características:**
- SHA-256 (64 caracteres hexadecimais)
- Único por certificado
- Impossível de falsificar
- Contém timestamp e dados aleatórios

## 🚀 Como Usar

### 1. Aplicar Migration

```bash
# Copiar SQL da migration 005_certificados.sql
# Colar no Supabase SQL Editor
# Executar (F5)
```

**Verificar:**
```sql
-- Tabela criada?
SELECT * FROM certificados LIMIT 1;

-- Função criada?
SELECT gerar_numero_certificado(
  '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d',
  'LRSJ',
  2026
);
-- Output esperado: LRSJ-2026-00001
```

### 2. Gerar Certificado (Interface)

1. Login como federacao_admin
2. Navegar para `/academias`
3. Encontrar academia com anuidade "PAGA"
4. Clicar no botão 🛡️ "Gerar Certificado"
5. Revisar informações no modal
6. Clicar em "Gerar Certificado"
7. Aguardar confirmação ✅
8. Clicar em "Baixar PDF" 📥

**Download:**
- Nome do arquivo: `Certificado-LRSJ-2026-00001.pdf`
- Formato: PDF de alta qualidade
- Tamanho: ~100-200 KB

### 3. Validar Certificado (Público)

**Via QR Code:**
1. Abrir câmera do smartphone
2. Escanear QR Code do certificado
3. Abre URL automática no navegador
4. Página de validação aparece

**Via URL direta:**
```
https://titan.lrsj.com.br/validar-certificado/{hash}
```

**Resultado:**
- ✅ Certificado válido → Tela verde com dados completos
- ⚠️ Certificado expirado → Tela amarela com aviso
- ❌ Certificado inválido → Tela vermelha com erro

## 📊 Fluxo Completo

```
1. Academia faz pagamento da anuidade
   ↓
2. Status muda para "paga"
   ↓
3. Botão 🛡️ fica disponível para federação
   ↓
4. Federacao_admin clica em "Gerar Certificado"
   ↓
5. Sistema valida anuidade paga
   ↓
6. Gera número automático (LRSJ-2026-00001)
   ↓
7. Cria hash SHA-256 único
   ↓
8. Insere registro na tabela certificados
   ↓
9. Atualiza academia.certificado_2026_id
   ↓
10. Gera QR Code com URL de validação
    ↓
11. Cria PDF com todos os dados + QR Code
    ↓
12. Usuário baixa PDF
    ↓
13. Academia imprime e exibe certificado
    ↓
14. Qualquer pessoa pode escanear QR Code
    ↓
15. Sistema valida e exibe dados oficiais
```

## 🛠️ Dependências

```json
{
  "qrcode": "^1.5.4",
  "@types/qrcode": "^1.5.5",
  "@react-pdf/renderer": "^4.2.0"
}
```

**Instalação:**
```bash
cd apps/titan
npm install qrcode @types/qrcode @react-pdf/renderer
```

## 🔍 Troubleshooting

### Erro: "A anuidade deve estar paga"
**Causa:** Academia não tem status de anuidade igual a 'paga'  
**Solução:** Gerar cobrança da anuidade e marcar como paga

### Erro: "Certificado já emitido"
**Causa:** Academia já tem certificado ativo para 2026  
**Solução:** Cancelar certificado antigo primeiro (se necessário)

### Erro ao gerar PDF
**Causa:** Dependências não instaladas ou logo inválida  
**Solução:** 
```bash
npm install @react-pdf/renderer qrcode
```

### QR Code não funciona
**Causa:** URL de validação incorreta ou hash inválido  
**Solução:** Verificar `certificado.url_validacao` no banco de dados

### Página de validação retorna 404
**Causa:** Hash não encontrado no banco  
**Solução:** Verificar se certificado existe:
```sql
SELECT * FROM certificados WHERE hash_validacao = 'hash_aqui';
```

## 📈 Próximos Passos

### Melhorias Futuras

1. **Email automático** com certificado em PDF
2. **Cancelamento de certificados** pela federação
3. **Histórico de certificados** por academia
4. **Relatório de certificados emitidos** (dashboard)
5. **Renovação automática** no início do ano
6. **Notificação de expiração** 30 dias antes
7. **Certificados para atletas** (carteirinha)
8. **Impressão em lote** de múltiplos certificados

### Integrações

- [ ] WhatsApp: Enviar certificado via API
- [ ] Email: Anexar PDF automaticamente
- [ ] Storage: Salvar PDFs gerados no Supabase Storage
- [ ] Analytics: Tracking de validações por certificado

## 📝 Notas Importantes

1. **Certificado por ano:** Cada academia recebe UM certificado por ano
2. **Validade:** Sempre até 31/12 do ano vigente (ex: 31/12/2026)
3. **Numeração:** Sequencial por federação e por ano
4. **QR Code:** Permanente e imutável após geração
5. **Validação pública:** Qualquer pessoa pode validar (importante para transparência)

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar logs no navegador (F12 → Console)
- Verificar logs do Supabase (Dashboard → Logs)
- Testar APIs via Postman/Thunder Client
- Revisar RLS policies no Supabase

---

**Sistema desenvolvido para o Titan Platform**  
**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Documentação completa:** `/apps/titan/CERTIFICADOS-README.md`
