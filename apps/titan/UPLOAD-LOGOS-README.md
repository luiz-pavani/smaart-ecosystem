# Upload de Logos - Documentação

## ✅ Sistema Configurado

O upload de logos de academias está 100% funcional. As imagens são armazenadas no Supabase Storage.

## 🎯 Como Funciona

### 1. Formulário de Academia
- Campo de upload com drag & drop
- Preview em tempo real
- Validações automáticas (tipo e tamanho)
- Upload acontece ao salvar a academia

### 2. Fluxo de Upload

```
Usuário seleciona imagem
  ↓
Preview é exibido instantaneamente
  ↓
Usuário preenche resto do formulário
  ↓
Clica em "Finalizar Cadastro"
  ↓
Sistema faz upload para Supabase Storage
  ↓
Obtém URL pública da imagem
  ↓
Salva academia com logo_url no banco
  ↓
Logo aparece automaticamente na lista
```

### 3. Storage Configuration

- **Bucket**: `academias-logos`
- **Acesso**: Público (leitura) / Autenticado (escrita)
- **Tamanho máximo**: 2 MB
- **Formatos**: PNG, JPG, JPEG, WEBP
- **Estrutura**: `/logos/{timestamp}_{random}.{ext}`

## 📸 Componente ImageUpload

### Props

```typescript
interface ImageUploadProps {
  value?: string           // URL atual (se editando)
  onChange?: (url: string) // Callback quando URL muda
  onFileSelected?: (file: File) // Callback quando arquivo selecionado
  disabled?: boolean       // Desabilitar upload
  maxSizeMB?: number      // Tamanho máximo (padrão: 2MB)
  aspectRatio?: string    // Proporção sugerida (padrão: '1:1')
  className?: string      // Classes CSS adicionais
}
```

### Uso Básico

```tsx
import { ImageUpload } from '@/components/forms/ImageUpload'

const [logoFile, setLogoFile] = useState<File | null>(null)
const [logoUrl, setLogoUrl] = useState('')

<ImageUpload
  value={logoUrl}
  onChange={setLogoUrl}
  onFileSelected={setLogoFile}
  maxSizeMB={2}
/>
```

## 🔧 Funções de Storage

### uploadAcademiaLogo()

Faz upload de uma imagem para o Storage e retorna a URL pública.

```typescript
import { uploadAcademiaLogo } from '@/lib/supabase/storage'

const logoUrl = await uploadAcademiaLogo(file, academiaId)
```

### deleteAcademiaLogo()

Remove uma logo antiga do Storage (útil ao editar).

```typescript
import { deleteAcademiaLogo } from '@/lib/supabase/storage'

await deleteAcademiaLogo(oldLogoUrl)
```

## 🎨 Features do Componente

### Drag & Drop
- Arraste imagem para área de upload
- Visual feedback ao arrastar

### Preview Instantâneo
- Mostra imagem antes de fazer upload
- Botão para remover/trocar imagem

### Validações
- ✅ Verifica tipo de arquivo (apenas imagens)
- ✅ Valida tamanho máximo (2MB padrão)
- ✅ Mensagens de erro amigáveis

### Responsivo
- Layout adaptativo mobile/desktop
- Touch-friendly para dispositivos móveis

## 📋 Checklist de Uso

Ao cadastrar uma academia:

- [ ] Preencha nome, sigla e outros dados
- [ ] Clique/arraste logo para área de upload
- [ ] Verifique o preview
- [ ] Se quiser trocar, clique em "Trocar imagem"
- [ ] Finalize o cadastro
- [ ] Logo será salva automaticamente

## 🔒 Segurança

### RLS Policies
O bucket é **público para leitura** mas **apenas usuários autenticados** podem fazer upload:

- ✅ Qualquer um pode visualizar as logos (necessário para exibição)
- ✅ Apenas usuários logados podem fazer upload
- ✅ Upload vinculado à sessão do Supabase Auth

### Validações
- Tipo de arquivo checado no client e server
- Tamanho máximo enforçado (2MB)
- Nomes de arquivo aleatórios (previne colisões)

## 🐛 Troubleshooting

### "Erro no upload: ..."
- Verifique se o bucket `academias-logos` existe
- Execute `node setup-storage.js` para criar
- Verifique as credenciais em `.env.local`

### Logo não aparece na lista
- Verifique se `logo_url` foi salvo no banco
- Abra o Network tab e veja se a URL retorna 200
- Verifique permissões do bucket (deve ser público)

### "File too large"
- Máximo configurado: 2MB
- Comprima a imagem antes de fazer upload
- Use ferramentas como TinyPNG, Squoosh

## 🚀 Próximos Passos

Para implementar upload em outros formulários (ex: atletas):

1. Reutilize o componente `ImageUpload`
2. Crie funções específicas em `storage.ts`:
   ```typescript
   export async function uploadAtletaFoto(file: File, atletaId: string)
   ```
3. Crie bucket separado se necessário (ex: `atletas-fotos`)

## 📦 Estrutura de Arquivos

```
apps/titan/
├── lib/
│   └── supabase/
│       └── storage.ts              # Funções de upload/delete
├── components/
│   └── forms/
│       └── ImageUpload.tsx         # Componente de upload
├── app/(dashboard)/
│   └── academias/
│       └── nova/
│           └── page.tsx            # Formulário com upload
└── setup-storage.js                # Script de configuração
```

## 🎯 URLs Geradas

As logos são salvas com URLs públicas:

```
https://<project-ref>.supabase.co/storage/v1/object/public/academias-logos/logos/1234567890_abc123.png
```

Essas URLs podem ser usadas diretamente em:
- Tags `<img>`
- CSS `background-image`
- PDFs e relatórios
- Emails e notificações
