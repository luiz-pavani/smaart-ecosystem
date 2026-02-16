# Busca Automática de Endereço por CEP

## 📦 Componente Criado: `CepInput`

Componente reutilizável que busca automaticamente o endereço completo ao digitar um CEP válido.

### 🎯 Funcionalidades

1. **Formatação automática**: CEP formatado como `00000-000`
2. **Busca automática**: Ao sair do campo com CEP válido (8 dígitos)
3. **Botão de busca manual**: Com ícone de lupa
4. **Feedback visual**:
   - Loading spinner durante busca
   - Check verde ao encontrar
   - Mensagem de erro se CEP inválido
5. **API ViaCEP**: Gratuita, sem necessidade de chave

---

## 🚀 Como Usar

### 1. Importar o componente

```tsx
import { CepInput } from '@/components/forms/CepInput'
```

### 2. Usar no formulário

```tsx
const [formData, setFormData] = useState({
  endereco_cep: '',
  endereco_rua: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
})

const handleAddressFound = (address: {
  rua: string
  bairro: string
  cidade: string
  estado: string
}) => {
  setFormData({
    ...formData,
    endereco_rua: address.rua,
    endereco_bairro: address.bairro,
    endereco_cidade: address.cidade,
    endereco_estado: address.estado,
  })
}

// No JSX:
<CepInput
  value={formData.endereco_cep}
  onChange={(value) => setFormData({ ...formData, endereco_cep: value })}
  onAddressFound={handleAddressFound}
  required
/>
```

---

## 📁 Arquivos Criados

### 1. **Hook**: `lib/hooks/useAddressByCep.ts`
Hook reutilizável para buscar endereço via API ViaCEP.

**API**: `https://viacep.com.br/ws/${cep}/json/`

**Retorno**:
```typescript
{
  rua: string      // logradouro
  bairro: string
  cidade: string   // localidade
  estado: string   // uf (sigla)
}
```

**Estados**:
- `loading`: boolean (durante fetch)
- `error`: string | null (mensagem de erro)

### 2. **Componente**: `components/forms/CepInput.tsx`
Componente de input com busca automática.

**Props**:
```typescript
{
  value: string                  // CEP atual
  onChange: (value: string) => void  // Callback de mudança
  onAddressFound?: (address) => void // Callback quando encontrar
  required?: boolean             // Campo obrigatório
  className?: string             // Classes adicionais
}
```

---

## ✅ Implementado em:

- [x] **Cadastro de Academias** (`app/(dashboard)/academias/nova/page.tsx`)
  - Campo CEP com busca automática
  - Preenche: rua, bairro, cidade, estado

---

## 🔜 Próximos Formulários:

### Atletas (TODO)
```tsx
// app/(dashboard)/atletas/novo/page.tsx
<CepInput
  value={formData.endereco_cep}
  onChange={(value) => updateFormData('endereco_cep', value)}
  onAddressFound={handleAddressFound}
  required
/>
```

### Federações - Edição (TODO)
```tsx
// app/(dashboard)/configuracoes/page.tsx
<CepInput
  value={federacaoData.endereco_cep}
  onChange={(value) => updateFederacaoData('endereco_cep', value)}
  onAddressFound={handleAddressFound}
/>
```

---

## 🎨 Estilo Visual

1. **Campo normal**: Border padrão
2. **Buscando**: Spinner animado no botão + mensagem "Buscando endereço..."
3. **Sucesso**: Check verde + mensagem "Endereço encontrado!" (2s)
4. **Erro**: Texto vermelho com mensagem ("CEP não encontrado" ou "Erro ao buscar CEP")
5. **Desabilitado**: Botão opaco quando CEP incompleto

---

## 📱 Responsivo

- **Desktop**: Input + botão lado a lado
- **Mobile**: Mantém layout horizontal (compacto)

---

## 🔧 Validação

- Aceita apenas números
- Formata automaticamente com hífen
- Valida 8 dígitos antes de buscar
- Bloqueia botão se CEP inválido

---

## 💡 Exemplo Completo

```tsx
'use client'

import { useState } from 'react'
import { CepInput } from '@/components/forms/CepInput'

export default function MeuFormulario() {
  const [dados, setDados] = useState({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
  })

  const handleAddressFound = (address) => {
    setDados({
      ...dados,
      rua: address.rua,
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
    })
  }

  return (
    <form>
      <CepInput
        value={dados.cep}
        onChange={(value) => setDados({ ...dados, cep: value })}
        onAddressFound={handleAddressFound}
        required
      />
      
      <input 
        type="text" 
        value={dados.rua} 
        onChange={(e) => setDados({ ...dados, rua: e.target.value })}
        placeholder="Rua"
      />
      
      {/* ... outros campos ... */}
    </form>
  )
}
```

---

## 🌐 API ViaCEP

**Endpoint**: `https://viacep.com.br/ws/{cep}/json/`

**Exemplo**:
```bash
curl https://viacep.com.br/ws/01310100/json/
```

**Resposta**:
```json
{
  "cep": "01310-100",
  "logradouro": "Avenida Paulista",
  "complemento": "",
  "bairro": "Bela Vista",
  "localidade": "São Paulo",
  "uf": "SP",
  "ibge": "3550308",
  "gia": "1004",
  "ddd": "11",
  "siafi": "7107"
}
```

---

## ⚡ Performance

- Busca apenas quando CEP completo (8 dígitos)
- Busca automática ao sair do campo (onBlur)
- Busca manual via botão
- Debounce implícito (onBlur evita múltiplas requisições)

---

## 🔐 Segurança

- API pública (sem autenticação)
- HTTPS obrigatório
- Validação de formato no cliente
- Tratamento de erros robusto
