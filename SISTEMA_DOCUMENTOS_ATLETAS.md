# Sistema de Geração Automática de Documentos de Atletas

## ✅ Implementado (Commit 57a9ef4)

### Estrutura Criada:
1. **Migration**: `supabase/migrations/20260303000012_athlete_documents_system.sql`
   - Tabelas: `document_templates`, `academy_logos`, `generated_documents`
   - RLS policies configuradas
   - Templates padrão pré-configurados
   - Trigger para invalidação de cache

2. **APIs Backend**:
   - `GET /api/atletas/[id]/identidade` - Retorna dados para identidade esportiva
   - `GET /api/atletas/[id]/certificado` - Retorna dados para certificado de graduação
   - Validação de permissões (atleta, academia_admin, federacao_admin, master_access)

3. **Componente React**: `components/AtletaDocumentos.tsx`
   - Gera identidade (PNG) via HTML Canvas
   - Gera certificado (PDF) via jsPDF
   - Interface com botões de download
   - Overlay de dados sobre fundos fornecidos

4. **Integração**: 
   - Adicionado ao perfil do atleta em `/portal/federacao/atletas/[id]`
   - Visível para todos os usuários autorizados

---

## 📋 Próximos Passos (Manual)

### 1. Upload dos Fundos para Supabase Storage

Acesse: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/storage/buckets

#### Criar Buckets:
1. **fundos** (Público)
   - Upload: `identidade_fundo.png` (imagem vazia da identidade)
   - Upload: `certificado_fundo.png` (imagem vazia do certificado)

2. **academias-logos** (Público)
   - Upload dos logos de cada academia conforme necessário
   - Formato: PNG com transparência (recomendado)

3. **athlete-documents** (Privado)
   - Bucket onde os documentos gerados serão armazenados (cache futuro)

#### URLs Esperadas:
- Identidade: `https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/identidade_fundo.png`
- Certificado: `https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/certificado_fundo.png`

---

### 2. Aplicar Migration no Banco de Dados

**Opção A: Via Supabase Dashboard (Mais Fácil)**

1. Acesse: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/sql/new
2. Copie o conteúdo de: `supabase/migrations/20260303000012_athlete_documents_system.sql`
3. Cole no SQL Editor
4. Clique em **RUN**
5. Verifique se as tabelas foram criadas:
   ```sql
   SELECT * FROM document_templates;
   SELECT * FROM academy_logos;
   SELECT * FROM generated_documents;
   ```

**Opção B: Via Supabase CLI (se funcionar)**

```bash
cd /Users/judo365/Documents/MASTER\ ESPORTES/SMAART\ PRO/smaart-ecosystem
supabase db push
```

---

### 3. Atualizar URLs dos Templates

Após upload dos fundos, atualizar as URLs na tabela `document_templates`:

```sql
-- Atualizar URL do fundo de Identidade
UPDATE document_templates
SET background_url = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/identidade_fundo.png'
WHERE template_type = 'identidade';

-- Atualizar URL do fundo de Certificado
UPDATE document_templates
SET background_url = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/certificado_fundo.png'
WHERE template_type = 'certificado';
```

---

### 4. Configurar Posicionamento dos Campos (Opcional)

Os campos já têm posições estimadas baseadas nas imagens fornecidas. Se precisar ajustar:

```sql
-- Exemplo: Ajustar posição do nome na identidade
UPDATE document_templates
SET field_config = jsonb_set(
  field_config,
  '{nome,x}',
  '400'::jsonb
)
WHERE template_type = 'identidade';
```

**Referência de Configuração** (`field_config`):
```json
{
  "nome": {
    "x": 384,           // Posição horizontal
    "y": 340,           // Posição vertical
    "fontSize": 40,     // Tamanho da fonte
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FFFFFF", // Cor do texto
    "align": "center",  // Alinhamento
    "maxWidth": 500     // Largura máxima (quebra de linha)
  }
}
```

---

### 5. Mapear Logos de Academias (Quando Disponíveis)

```sql
-- Exemplo: Adicionar logo da Atlética Falcons
INSERT INTO academy_logos (academia_nome, logo_url, logo_width, logo_height)
VALUES (
  'ATLÉTICA FALCONS JUDÔ',
   'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/academias-logos/atletica-falcons.png',
  120,
  120
);
```

---

### 6. Testar Geração de Documentos

1. Acesse o perfil de um atleta: `/portal/federacao/atletas/[id]`
2. Role até a seção "Documentos" no final da página
3. Clique em **"Baixar Identidade Esportiva"** ou **"Baixar Certificado de Graduação"**
4. O documento deve ser gerado e baixado automaticamente

**Dados Renderizados**:

**Identidade:**
- Nome completo
- Academia
- Data de nascimento
- Graduação (cor da faixa)
- Nível de arbitragem (ou `—` se NULL)
- Validade (data_expiracao)
- Logo da academia (se configurado)

**Certificado:**
- Nome completo
- Graduação (cor da faixa)
- Ano (extraído de data_validacao_federacao ou ano atual)
- Logo da academia (se configurado)

---

## 🎨 Customização Futura

### Ajustar Cores/Fontes
Edite `field_config` na tabela `document_templates`.

### Adicionar Novos Campos
1. Adicione na API: `/api/atletas/[id]/identidade` ou `/certificado`
2. Adicione no componente: `components/AtletaDocumentos.tsx`
3. Atualize `field_config` com posicionamento

### Versionar Templates
Crie novos registros em `document_templates` com `template_name` diferente e marque como `is_active = true`.

### Cache de Documentos
A tabela `generated_documents` já está preparada. Para implementar:
1. Salvar PDF/PNG gerado no bucket `athlete-documents`
2. Inserir registro em `generated_documents` com URL e hash
3. Verificar hash antes de regenerar (otimização futura)

---

## 🔧 Troubleshooting

### Imagens não carregam
- Verifique se buckets estão públicos
- Confirme URLs corretas em `document_templates`
- Teste CORS se imagens estiverem em domínio externo

### Campos desalinhados
- Ajuste coordenadas `x`, `y` em `field_config`
- Use inspector do browser para medir posições exatas

### Logo não aparece
- Confirme mapeamento em `academy_logos`
- Nome da academia deve corresponder exatamente ao campo `academias` em `user_fed_lrsj`

### PDF/PNG corrompido
- Verifique console do browser (F12) para erros
- Confirme que jsPDF está instalado (`package.json`)

---

## 📝 Checklist Final

- [ ] Criar buckets no Supabase Storage
- [ ] Upload dos fundos (identidade_fundo.png, certificado_fundo.png)
- [ ] Aplicar migration via Dashboard SQL Editor
- [ ] Atualizar URLs dos templates
- [ ] Testar geração de identidade
- [ ] Testar geração de certificado
- [ ] Mapear logos de academias (opcional)
- [ ] Ajustar posicionamento de campos (se necessário)

---

## 🚀 Deploy

O código já está commitado e pusheado:
```
Commit: 57a9ef4 - feat: sistema de geração automática de documentos de atletas
```

Após completar os passos manuais acima, o sistema estará 100% funcional!
