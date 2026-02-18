# Sprint 2 - Planejamento Completo (25/02 - 10/03/2026)

## 📋 Visão Geral

**Objetivo Principal**: Consolidar Sprint 1A e 1B com integração real de pagamentos (Safe2Pay) e QR codes genuínos, além de adicionar features críticas para MVP.

**Timeline**: 25/02 (segunda) a 10/03 (segunda) - 2 semanas  
**Equipe**: Dev 1 (Pagamentos) + Dev 2 (QR Acesso) + Luiz (Tech Lead/Revisão)  
**Deadline MVP**: 12/03/2026 (quarta-feira)

**Status Pré-Sprint**: ✅ Sprint 1A e 1B LIVE com mocks  
**KPI Sprint 2**: Safe2Pay integrado + QR real + Dashboard completo + 95% test coverage

---

## 🎯 Objetivos por Sprint

### Sprint 2A - Payment Gateway Integration (Dev 1)
- [ ] Integrar API Safe2Pay
- [ ] Criar fluxo de pagamento PIX
- [ ] Criar fluxo de pagamento Boleto
- [ ] Dashboard de receitas
- [ ] Webhook handler para confirmações

### Sprint 2B - QR Code & Check-in System (Dev 2)
- [ ] QR Code geração real (qrcode library)
- [ ] JWT tokens real (jsonwebtoken)
- [ ] Check-in persistence no banco
- [ ] Relatório de frequência
- [ ] Validação de expiração

### Sprint 2C - Dashboard & Analytics (Both)
- [ ] Dashboard unificado com stats
- [ ] Gráficos de pagamentos (Chart.js)
- [ ] Relatório de frequência
- [ ] Export CSV/PDF

---

## 📊 Detalhes Sprint 2A - Pagamentos

### Semana 1 (25/02 - 01/03)

#### Task 2A.1 - Setup Safe2Pay (1h)
**Dev**: Dev 1  
**Quando**: Segunda 25/02, manhã

**Checklist**:
- [ ] Obter credentials Safe2Pay (token, merchant ID, webhook key)
- [ ] Armazenar em `.env.local`:
  ```env
  NEXT_PUBLIC_SAFE2PAY_MERCHANT_ID=...
  SAFE2PAY_TOKEN=...
  SAFE2PAY_WEBHOOK_KEY=...
  ```
- [ ] Validar acesso à API Safe2Pay via curl/Postman
- [ ] Criar arquivo `lib/safe2pay/client.ts`

**Referência API Safe2Pay**:
```typescript
// Estrutura básica
const createOrder = async (amount, method) => {
  const response = await fetch('https://api.safe2pay.com.br/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SAFE2PAY_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amount * 100, // em centavos
      payment_method: method, // 'pix', 'boleto', 'credit_card'
      customer: { email, cpf },
      webhook_url: 'https://titan.smaartpro.com/api/webhooks/safe2pay'
    })
  })
  return response.json()
}
```

---

#### Task 2A.2 - Form com Seletor de Método (2h)
**Dev**: Dev 1  
**Quando**: Segunda-Terça 25-26/02

**Criar**: `components/pagamentos/CriarPedidoForm.tsx`

**Features**:
- Academia + Atleta dropdowns (autocomplete)
- Campo valor (decimal)
- Radio buttons: PIX | Boleto | Creditcard
- Preview de taxas por método
- Submit button desabilitado até valores válidos
- Loading state durante submissão
- Success toast com pedido_id
- Error handling com mensagem clara

**Exemplo Componente**:
```tsx
'use client'

export function CriarPedidoForm() {
  const [formData, setFormData] = useState({
    academia_id: '',
    atleta_id: '',
    valor: '',
    metodo_pagamento: 'PIX'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/pagamentos/criar', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) throw new Error('Erro ao criar pedido')
      
      const { pedido_id } = await res.json()
      
      // Redirecionar para checkout Safe2Pay
      window.location.href = `/pagamentos/checkout/${pedido_id}`
      
    } catch (error) {
      // Toast error
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Academia + Atleta + Valor + Método */}
      <button disabled={loading || !formData.academia_id || !formData.atleta_id || !formData.valor}>
        {loading ? 'Processando...' : 'Prosseguir para Pagamento'}
      </button>
    </form>
  )
}
```

---

#### Task 2A.3 - Endpoint Checkout (3h)
**Dev**: Dev 1  
**Quando**: Terça-Quarta 26-27/02

**Criar**: `app/api/pagamentos/checkout.ts`

**Fluxo**:
1. Recebe `pedido_id` da URL
2. Busca pedido no banco + verifica status
3. Chama Safe2Pay createOrder()
4. Salva response (transaction_id, qr_code PIX, link boleto)
5. Atualiza pedido com status='aguardando_pagamento'
6. Retorna dados para cliente

**Código Base**:
```typescript
export async function POST(request: NextRequest) {
  const { pedido_id } = await request.json()
  
  try {
    // 1. Buscar pedido
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedido_id)
      .single()
    
    if (!pedido) {
      return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })
    }
    
    // 2. Chamar Safe2Pay
    const response = await fetch('https://api.safe2pay.com.br/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SAFE2PAY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(pedido.valor * 100), // centavos
        payment_method: pedido.metodo_pagamento.toLowerCase(),
        reference: pedido_id,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/safe2pay`
      })
    })
    
    const orderData = await response.json()
    
    // 3. Salvar transaction_id
    await supabase
      .from('pedidos')
      .update({
        status: 'aguardando_pagamento',
        transaction_id: orderData.id,
        metadata: { qr_code: orderData.qr_code }
      })
      .eq('id', pedido_id)
    
    // 4. Retornar para cliente
    return NextResponse.json({
      success: true,
      pedido_id,
      transaction_id: orderData.id,
      qr_code: orderData.qr_code, // PIX
      boleto_link: orderData.boleto_url, // Boleto
      expiration_date: orderData.expiration_date
    })
    
  } catch (error) {
    return NextResponse.json(
      { erro: 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}
```

---

#### Task 2A.4 - Página Checkout UI (2h)
**Dev**: Dev 1  
**Quando**: Quarta 27/02

**Criar**: `app/(dashboard)/pagamentos/checkout/[pedido_id]/page.tsx`

**Features**:
- Exibir QR Code PIX (copiar com 1 clique)
- Link de download Boleto (se aplicável)
- Dados do pedido (academia, atleta, valor)
- Timer de expiração (24h)
- Status polling a cada 5s
- "Pagamento confirmado!" quando status muda
- Botão voltar para lista

**UI Mock**:
```
┌─────────────────────────────────┐
│ Pagamento #ABC123               │
│                                 │
│ Pagador: João Silva             │
│ Academia: JUDO SAMPA            │
│ Valor: R$ 129,90                │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    [QR CODE PIX]            │ │
│ │    Escanear com seu banco    │ │
│ └─────────────────────────────┘ │
│                                 │
│ [📋 Copiar chave PIX]           │
│ [💾 Download Boleto]            │
│                                 │
│ Válido até: 19/02 15:30         │
│ Status: Aguardando pagamento    │
│                                 │
│ [← Voltar]                      │
└─────────────────────────────────┘
```

---

#### Task 2A.5 - Webhook Handler (2h)
**Dev**: Dev 1  
**Quando**: Quinta-Sexta 28-01/03

**Criar**: `app/api/webhooks/safe2pay.ts`

**Fluxo**:
1. Recebe webhook de Safe2Pay
2. Valida signature (SAFE2PAY_WEBHOOK_KEY)
3. Extrai transaction_id + status
4. Busca pedido pelo transaction_id
5. Atualiza status (aprovado/rejeitado/cancelado)
6. Se aprovado: emitir email confirmação
7. Returnr 200 OK

**Código Base**:
```typescript
import { createHmac } from 'crypto'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-safe2pay-signature')
  const body = await request.text()
  
  // 1. Validar assinatura
  const expectedSignature = createHmac('sha256', process.env.SAFE2PAY_WEBHOOK_KEY!)
    .update(body)
    .digest('hex')
  
  if (signature !== expectedSignature) {
    return NextResponse.json({ erro: 'Unauthorized' }, { status: 401 })
  }
  
  const payload = JSON.parse(body)
  const { transaction_id, status, reference } = payload
  
  // 2. Atualizar pedido
  const statusMap: Record<string, string> = {
    'approved': 'aprovado',
    'pending': 'pendente',
    'rejected': 'rejeitado',
    'cancelled': 'cancelado'
  }
  
  await supabase
    .from('pedidos')
    .update({
      status: statusMap[status] || 'desconhecido',
      updated_at: new Date().toISOString()
    })
    .eq('transaction_id', transaction_id)
  
  // 3. Se aprovado, enviar email
  if (status === 'approved') {
    // await sendEmailConfirmation(reference)
  }
  
  return NextResponse.json({ success: true })
}
```

---

### Semana 2 (04/03 - 10/03)

#### Task 2A.6 - Dashboard de Receitas (3h)
**Dev**: Dev 1  
**Quando**: Segunda-Terça 04-05/03

**Criar**: `components/pagamentos/DashboardReceitas.tsx`

**Metrics**:
```
┌──────────────────────────────────────────────┐
│ RECEITAS - ÚLTIMOS 30 DIAS                   │
├──────────────────────────────────────────────┤
│                                              │
│ Total de Receita:  R$ 12.890,50              │
│ Pedidos Aprovados: 42                        │
│ Pedidos Pendentes: 8                         │
│ Taxa Média:        3.2%                      │
│                                              │
│ [📊 Gráfico de Receita por Dia]              │
│                                              │
│ [📈 Top 5 Academias]                         │
│                                              │
│ [📥 Export CSV]                              │
└──────────────────────────────────────────────┘
```

**Features**:
- Cards com Total, Aprovados, Pendentes, Taxa
- Gráfico de linha (últimos 30 dias)
- Tabela TOP 5 academias por receita
- Date range picker (last 7/30/90 days)
- Export CSV com detalhes

**Dependência**: `npm install recharts` (ou Chart.js)

**Código Base**:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function DashboardReceitas() {
  const [data, setData] = useState([])
  const [stats, setStats] = useState({ total: 0, aprovados: 0, pendentes: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/pagamentos/stats')
      const { stats, chartData } = await res.json()
      setStats(stats)
      setData(chartData)
    }
    
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total" value={`R$ ${stats.total.toFixed(2)}`} />
        <StatCard label="Aprovados" value={stats.aprovados} />
        <StatCard label="Pendentes" value={stats.pendentes} />
      </div>
      
      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="receita" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

#### Task 2A.7 - Endpoint Stats (1h)
**Dev**: Dev 1  
**Quando**: Terça 05/03

**Criar**: `app/api/pagamentos/stats.ts`

**Retorna**:
```json
{
  "stats": {
    "total": 12890.50,
    "aprovados": 42,
    "pendentes": 8,
    "taxa_media": 3.2,
    "periodo": "30_days"
  },
  "chartData": [
    { "date": "2026-02-10", "receita": 450.00, "pedidos": 3 },
    { "date": "2026-02-11", "receita": 620.00, "pedidos": 5 },
    ...
  ],
  "topAcademias": [
    { "academia": "JUDO SAMPA", "receita": 2340.00, "pedidos": 18 },
    ...
  ]
}
```

---

#### Task 2A.8 - Integration Testing (2h)
**Dev**: Dev 1  
**Quando**: Sexta 07/03

**Manual Tests**:
- [ ] Flow PIX: criar pedido → checkout → escanear → confirmação
- [ ] Flow Boleto: criar pedido → checkout → download → boleto test
- [ ] Webhook: Safe2Pay envia confirmação → status atualiza
- [ ] Email: receber confirmação após pagamento
- [ ] Dashboard: stats refletem novos pagamentos

**Teste de Carga**:
```bash
# Simular 10 pagamentos simultâneos
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/pagamentos/criar \
    -H "Content-Type: application/json" \
    -d '{"academia_id":"...","atleta_id":"...","valor":129.90,"metodo_pagamento":"PIX"}'
done
```

---

## 📊 Detalhes Sprint 2B - QR Acesso

### Semana 1 (25/02 - 01/03)

#### Task 2B.1 - Instalar Dependências (15min)
**Dev**: Dev 2  
**Quando**: Segunda 25/02, manhã

**Commands**:
```bash
cd apps/titan
npm install jsonwebtoken @types/jsonwebtoken
npm install qrcode @types/qrcode
npm install uuid @types/uuid  # se não tem

# Validar
npm ls | grep -E "jsonwebtoken|qrcode|uuid"
```

---

#### Task 2B.2 - JWT Validator Library (1.5h)
**Dev**: Dev 2  
**Quando**: Segunda 25/02

**Criar**: `lib/acesso/qr-validator.ts`

**Funções**:
```typescript
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const JWT_EXPIRY = '24h'

export interface QRTokenPayload {
  atleta_id: string
  academia_id: string
  iat: number
  exp: number
}

export function generateQRToken(atleta_id: string, academia_id: string): string {
  return jwt.sign(
    { atleta_id, academia_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  )
}

export function validateQRToken(token: string): QRTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as QRTokenPayload
  } catch (error) {
    return null
  }
}

export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded?.exp) return null
    return new Date(decoded.exp * 1000)
  } catch {
    return null
  }
}
```

**Teste**:
```bash
# Criar arquivo test
cat > /tmp/test-jwt.ts << 'EOF'
import { generateQRToken, validateQRToken } from './qr-validator'

const token = generateQRToken('atleta-123', 'academia-456')
console.log('Token:', token)

const payload = validateQRToken(token)
console.log('Payload:', payload)

const invalid = validateQRToken('invalid-token')
console.log('Invalid:', invalid) // null
EOF

# Executar com tsx
npx tsx /tmp/test-jwt.ts
```

---

#### Task 2B.3 - Atualizar gerar-qr.ts com JWT Real (1h)
**Dev**: Dev 2  
**Quando**: Terça 26/02

**Modificar**: `app/api/acesso/gerar-qr.ts`

**Antes** (mock):
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const atleta_id = searchParams.get('atleta_id')
  const academia_id = searchParams.get('academia_id')
  
  if (!atleta_id || !academia_id) {
    return NextResponse.json({ erro: 'Missing params' }, { status: 400 })
  }
  
  // MOCK TOKEN
  const qr_token = `MOCK-TOKEN-${Date.now()}`
  const qr_image = 'data:image/png;base64,iVBORw0KGgo...'
  
  return NextResponse.json({
    success: true,
    qr_token,
    qr_image,
    validade_ate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  })
}
```

**Depois** (real JWT + QR):
```typescript
import { generateQRToken } from '@/lib/acesso/qr-validator'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const atleta_id = searchParams.get('atleta_id')
  const academia_id = searchParams.get('academia_id')
  
  if (!atleta_id || !academia_id) {
    return NextResponse.json({ erro: 'Missing params' }, { status: 400 })
  }
  
  try {
    // 1. Gerar JWT real
    const qr_token = generateQRToken(atleta_id, academia_id)
    
    // 2. Gerar imagem QR real
    const qr_image = await QRCode.toDataURL(qr_token, {
      width: 200,
      margin: 1,
      color: { dark: '#000', light: '#fff' }
    })
    
    // 3. Calcular expiração
    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    return NextResponse.json({
      success: true,
      qr_token,
      qr_image,
      validade_ate: expiration.toISOString(),
      duracao_minutos: 1440
    })
    
  } catch (error) {
    return NextResponse.json(
      { erro: 'Erro ao gerar QR' },
      { status: 500 }
    )
  }
}
```

---

#### Task 2B.4 - Atualizar checkin.ts com JWT Validation (1.5h)
**Dev**: Dev 2  
**Quando**: Quarta 27/02

**Modificar**: `app/api/acesso/checkin.ts`

**Antes** (mock validation):
```typescript
export async function POST(request: NextRequest) {
  const { qr_token, academia_id } = await request.json()
  
  if (!qr_token.startsWith('MOCK-TOKEN-')) {
    return NextResponse.json({ erro: 'QR inválido' }, { status: 403 })
  }
  
  return NextResponse.json({
    success: true,
    status: 'autorizado',
    hora_entrada: new Date().toISOString()
  })
}
```

**Depois** (real JWT validation + DB persistence):
```typescript
import { validateQRToken } from '@/lib/acesso/qr-validator'

export async function POST(request: NextRequest) {
  const { qr_token, academia_id } = await request.json()
  
  if (!qr_token || !academia_id) {
    return NextResponse.json({ erro: 'Missing params' }, { status: 400 })
  }
  
  try {
    // 1. Validar JWT
    const payload = validateQRToken(qr_token)
    
    if (!payload) {
      return NextResponse.json({ erro: 'QR inválido ou expirado' }, { status: 403 })
    }
    
    // 2. Validar academia_id matches token
    if (payload.academia_id !== academia_id) {
      return NextResponse.json({ erro: 'QR não pertence a esta academia' }, { status: 403 })
    }
    
    // 3. Registrar entrada no banco
    const { error: dbError } = await supabase
      .from('frequencia')
      .insert([
        {
          atleta_id: payload.atleta_id,
          academia_id: payload.academia_id,
          data_entrada: new Date().toISOString(),
          tipo: 'entrada'
        }
      ])
    
    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json({ erro: 'Erro ao registrar entrada' }, { status: 500 })
    }
    
    // 4. Retornar sucesso
    return NextResponse.json({
      success: true,
      status: 'autorizado',
      mensagem: `Bem-vindo! Entrada registrada às ${new Date().toLocaleTimeString('pt-BR')}`,
      hora_entrada: new Date().toISOString(),
      atleta_id: payload.atleta_id
    })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { erro: 'Erro ao processar QR' },
      { status: 500 }
    )
  }
}
```

---

#### Task 2B.5 - Melhorar QRGenerator Component (2h)
**Dev**: Dev 2  
**Quando**: Quarta-Quinta 27-28/02

**Modificar**: `components/acesso/QRGenerator.tsx`

**Mudanças**:
- Remover hardcoded atleta_id e academia_id
- Adicionar dropdown para selecionar Academia
- Adicionar dropdown para selecionar Atleta
- Habilitar botão apenas quando ambos selecionados
- Autoupdates quando seleção muda

**Novo Código**:
```tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface QRData {
  qr_token: string
  qr_image: string
  validade_ate: string
  duracao_minutos: number
}

interface Academia {
  id: string
  sigla: string
  nome: string
}

interface Atleta {
  id: string
  nome: string
}

export function QRGenerator() {
  const [academias, setAcademias] = useState<Academia[]>([])
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [selectedAcademia, setSelectedAcademia] = useState('')
  const [selectedAtleta, setSelectedAtleta] = useState('')
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [loading, setLoading] = useState(false)
  const [validadeTimer, setValidadeTimer] = useState('')

  // Carregar academias na montagem
  useEffect(() => {
    const fetchAcademias = async () => {
      const res = await fetch('/api/academias/listar')
      const { academias: data } = await res.json()
      setAcademias(data || [])
    }
    fetchAcademias()
  }, [])

  // Carregar atletas quando academia muda
  useEffect(() => {
    if (!selectedAcademia) {
      setAtletas([])
      return
    }

    const fetchAtletas = async () => {
      const res = await fetch(`/api/atletas/por-academia?academia_id=${selectedAcademia}`)
      const { atletas: data } = await res.json()
      setAtletas(data || [])
      setSelectedAtleta('') // Reset seleção de atleta
    }
    fetchAtletas()
  }, [selectedAcademia])

  // Timer de validade
  useEffect(() => {
    if (!qrData) return

    const updateTimer = () => {
      const now = new Date()
      const validade = new Date(qrData.validade_ate)
      const diff = validade.getTime() - now.getTime()

      if (diff <= 0) {
        setValidadeTimer('Expirado')
        return
      }

      const minutos = Math.floor(diff / 60000)
      const segundos = Math.floor((diff % 60000) / 1000)
      setValidadeTimer(`${minutos}m ${segundos}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [qrData])

  const handleGerarQR = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/acesso/gerar-qr?atleta_id=${selectedAtleta}&academia_id=${selectedAcademia}`
      )

      if (!res.ok) throw new Error('Erro ao gerar QR')

      const data = await res.json()
      setQrData(data)
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao gerar QR')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Seletores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Academia</label>
          <select
            value={selectedAcademia}
            onChange={(e) => setSelectedAcademia(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">Selecione uma academia</option>
            {academias.map((a) => (
              <option key={a.id} value={a.id}>
                {a.sigla} - {a.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Atleta</label>
          <select
            value={selectedAtleta}
            onChange={(e) => setSelectedAtleta(e.target.value)}
            disabled={!selectedAcademia}
            className="w-full px-3 py-2 border rounded-lg bg-white disabled:opacity-50"
          >
            <option value="">Selecione um atleta</option>
            {atletas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botão Gerar QR */}
      <button
        onClick={handleGerarQR}
        disabled={!selectedAcademia || !selectedAtleta || loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
      >
        {loading ? 'Gerando QR...' : 'Gerar Novo QR'}
      </button>

      {/* Display QR */}
      {qrData && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex flex-col items-center gap-4">
            <img
              src={qrData.qr_image}
              alt="QR Code"
              className="w-48 h-48 border-2 border-gray-300 rounded"
            />
            <div className="text-center">
              <p className="text-sm text-gray-600">Válido até:</p>
              <p className="text-lg font-mono">{validadeTimer}</p>
            </div>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(qrData.qr_token)
              alert('Token copiado!')
            }}
            className="w-full px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
          >
            📋 Copiar Token
          </button>
        </div>
      )}
    </div>
  )
}
```

---

#### Task 2B.6 - Endpoint atletas/por-academia (45min)
**Dev**: Dev 2  
**Quando**: Quinta 28/02

**Criar**: `app/api/atletas/por-academia.ts`

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const academia_id = searchParams.get('academia_id')

  if (!academia_id) {
    return NextResponse.json({ erro: 'Missing academia_id' }, { status: 400 })
  }

  try {
    const { data: atletas } = await supabase
      .from('atletas')
      .select('id, nome, cpf, email')
      .eq('academia_id', academia_id)
      .order('nome')

    return NextResponse.json({ success: true, atletas: atletas || [] })
  } catch (error) {
    return NextResponse.json({ erro: 'Database error' }, { status: 500 })
  }
}
```

---

### Semana 2 (04/03 - 10/03)

#### Task 2B.7 - Relatório de Frequência (2h)
**Dev**: Dev 2  
**Quando**: Segunda-Terça 04-05/03

**Criar**: `app/(dashboard)/acesso/relatorio/page.tsx`

**Features**:
- Data range picker
- Academia filter
- Atleta filter (opcional)
- Mostra: Data, Hora entrada, Atleta, Academia
- Total de entradas
- Export CSV

**Layout**:
```
┌──────────────────────────────────────┐
│ RELATÓRIO DE FREQUÊNCIA              │
├──────────────────────────────────────┤
│                                      │
│ [From Date] - [To Date]              │
│ [Academia Dropdown]                  │
│ [Export CSV]                         │
│                                      │
│ Total de Entradas: 234               │
│                                      │
│ Data      │ Hora     │ Atleta │ Acad │
│ 18/02     │ 08:30    │ João   │ JUDO │
│ 18/02     │ 09:15    │ Maria  │ JUDO │
│ ...                                  │
└──────────────────────────────────────┘
```

---

#### Task 2B.8 - Endpoint relatório (1.5h)
**Dev**: Dev 2  
**Quando**: Terça 05/03

**Criar**: `app/api/acesso/relatorio.ts`

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const academia_id = searchParams.get('academia_id')
  const de_data = searchParams.get('de_data')
  const ate_data = searchParams.get('ate_data')

  try {
    let query = supabase
      .from('frequencia')
      .select(`
        id,
        data_entrada,
        atleta_id,
        academia_id,
        atletas(nome),
        academias(sigla)
      `)
      .eq('tipo', 'entrada')

    if (academia_id) query = query.eq('academia_id', academia_id)
    if (de_data) query = query.gte('data_entrada', de_data)
    if (ate_data) query = query.lte('data_entrada', ate_data)

    const { data } = await query.order('data_entrada', { ascending: false })

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      entradas: data || []
    })
  } catch (error) {
    return NextResponse.json({ erro: 'Database error' }, { status: 500 })
  }
}
```

---

#### Task 2B.9 - Testing Manual (2h)
**Dev**: Dev 2  
**Quando**: Sexta 07/03

**Checklist**:
- [ ] Gerar QR com academia/atleta válidos
- [ ] Verificar QR é imagem real (não PNG mock)
- [ ] QR código é válido (testá com leitor)
- [ ] Escanear QR com câmera → redireciona para app
- [ ] POST checkin com token válido → autorizado
- [ ] POST checkin com token expirado → erro 403
- [ ] POST checkin com token inválido → erro 403
- [ ] Banco recebe entrada (check tabela frequencia)
- [ ] Relatório mostra entrada corretamente
- [ ] Export CSV funciona

---

## 📊 Detalhes Sprint 2C - Dashboard Unificado

### Task 2C.1 - Design Dashboard (1h)
**Dev**: Both (design planning)  
**Quando**: Segunda 25/02, tarde

**Layout Principal**:
```
┌────────────────────────────────────────────────┐
│ SMAART PRO - Dashboard                         │
│ Bem-vindo, Luiz!                 [15:30]      │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────┬──────────────┬─────────────┐ │
│  │ Pagamentos   │ Frequência   │ Atletas     │ │
│  │ R$ 12.890    │ 234 entradas │ 450 ativos  │ │
│  └──────────────┴──────────────┴─────────────┘ │
│                                                │
│  [📊 Receita Semanal] [📈 Top Academias]      │
│                                                │
│  [🚨 Alertas] [⚙️ Configurações]               │
└────────────────────────────────────────────────┘
```

---

### Task 2C.2 - Unificar Dashboard (3h)
**Dev**: Dev 1 + Dev 2 (pair programming)  
**Quando**: Quinta-Sexta 28-01/03

**Criar**: `app/(dashboard)/page.tsx` melhorado

**Features**:
- Cards de resumo (Receita, Entrada, Atletas)
- Gráfico receita vs frequência
- Quick actions (novo pagamento, gerar QR)
- Últimos eventos (últimos pagamentos, entradas)
- Alertas (pagamentos pendentes, QR a expirar)

---

### Task 2C.3 - Gráficos com Recharts (2h)
**Dev**: Dev 1  
**Quando**: Segunda 04/03

**Criar**: `components/dashboard/DashboardCharts.tsx`

**Gráficos**:
- Receita x Frequência (dual-axis line chart)
- Métodos de pagamento (pie chart)
- Academias com mais entradas (bar chart)

---

## 🧪 Testing Strategy

### Unit Tests (Dev 1 + Dev 2)
```bash
# Criar tests para utils
npm install --save-dev jest @testing-library/react

# Test files structure
app/
  ├── __tests__/
  │   ├── pagamentos.test.ts
  │   ├── acesso.test.ts
  │   └── qr-validator.test.ts
```

### Integration Tests (Luiz)
```bash
# Testar fluxo completo
1. Criar pagamento via API
2. Webhook confirma pagamento
3. Status atualiza em produção
4. Gerar QR para atleta pago
5. Scanear QR
6. Check-in registra entrada
```

### Load Testing (Luiz)
```bash
# k6 script
npm install -g k6

k6 run scripts/load-test.js
```

---

## 📋 Checklist Semanal

### Segunda 25/02 (Início Sprint 2)
- [ ] Kickoff reunião (09:00 BRT)
- [ ] Safe2Pay credentials obtidos (Dev 1)
- [ ] Dependências instaladas (Dev 2)
- [ ] `.env.local` configurado (ambos)

### Terça 26/02
- [ ] Safe2Pay client criado (Dev 1)
- [ ] Form de pagamento rascunho (Dev 1)
- [ ] JWT validator criado (Dev 2)
- [ ] Build passando (ambos)

### Quarta 27/02
- [ ] Página checkout criada (Dev 1)
- [ ] gerar-qr.ts atualizado (Dev 2)
- [ ] QRGenerator melhorado (Dev 2)
- [ ] Testes unitários (ambos)

### Quinta 28/02
- [ ] Webhook handler criado (Dev 1)
- [ ] checkin.ts com JWT validation (Dev 2)
- [ ] Testes manuais (ambos)
- [ ] Dashboard inicial (Dev 1)

### Sexta 01/03
- [ ] Safe2Pay flow testado end-to-end (Dev 1)
- [ ] QR flow testado end-to-end (Dev 2)
- [ ] PRs abertos para review (ambos)
- [ ] Doc atualizada (Luiz)

### Segunda 04/03
- [ ] PRs mergeados (Luiz)
- [ ] Relatório frequência (Dev 2)
- [ ] Dashboard stats (Dev 1)
- [ ] Gráficos (Dev 1)

### Terça 05/03 até Sexta 08/03
- [ ] Features finalizadas
- [ ] Testes completos
- [ ] Documentação final
- [ ] Deploy staging

### Segunda 10/03
- [ ] Bug fixes refinement
- [ ] Performance optimization
- [ ] User acceptance testing

### Quarta 12/03 (MVP Launch!)
- ✅ LAUNCH PRODUCTION

---

## 🎁 Deliverables

### Sprint 2A - Pagamentos
- [x] Safe2Pay integration
- [x] PIX payment flow
- [x] Boleto payment flow
- [x] Webhook handler
- [x] Dashboard receitas
- [x] Email confirmations
- [x] End-to-end testing

### Sprint 2B - QR Acesso
- [x] Real JWT tokens
- [x] Real QR code images
- [x] Academy/Athlete dropdowns
- [x] Database persistence (frequencia)
- [x] Relatório frequência
- [x] End-to-end testing

### Sprint 2C - Unificado
- [x] Dashboard principal
- [x] Gráficos (Recharts)
- [x] Quick actions
- [x] Alertas
- [x] Mobile responsivo

---

## ⚠️ Riscos & Mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Safe2Pay API delays | Alto | Média | Ter API docs preparadas + contato suporte |
| Webhook timeout | Alto | Baixa | Retry logic + logs detalhados |
| QR validation issues | Médio | Baixa | Testing rigoroso antes launch |
| Database performance | Médio | Baixa | Indexes nas tabelas frequencia |
| JWT token leaking | Alto | Baixa | HTTPS only + short expiry |

---

## 💰 Estimativas

| Sprint | Task | Dev 1 | Dev 2 | Total |
|--------|------|-------|-------|-------|
| 2A | Setup + Form | 3.5h | - | 3.5h |
| 2A | Checkout + Webhook | 5h | - | 5h |
| 2A | Dashboard + Stats | 3h | - | 3h |
| 2A | Testing | 2h | - | 2h |
| **2A Total** | | **13.5h** | - | **13.5h** |
| 2B | Deps + JWT | - | 1.5h | 1.5h |
| 2B | QR Real + Checkin | - | 2.5h | 2.5h |
| 2B | Component + API | - | 1.5h | 1.5h |
| 2B | Relatório | - | 2h | 2h |
| 2B | Testing | - | 2h | 2h |
| **2B Total** | | - | **9.5h** | **9.5h** |
| 2C | Dashboard unified | 3h | 3h | 6h |
| 2C | Gráficos | 2h | - | 2h |
| **2C Total** | | **5h** | **3h** | **8h** |
| | | | | |
| **SPRINT 2 TOTAL** | | **18.5h** | **12.5h** | **31h** |
| **Dias úteis** | | **2.3 dias** | **1.6 dias** | **2.2 dias (avg)** |

---

## 📞 Comunicação

**Daily Standup**: 15:00 BRT (Luiz, Dev 1, Dev 2)
- 5 min: O que fiz ontem?
- 5 min: O que faço hoje?
- 5 min: Blockers?

**Code Review**: Sexta-feira 17:00
- Revisar PRs da semana
- Aprovar + merge da main

**Sprint Review**: Sexta-feira 18:00
- Demo do que foi pronto
- Feedback do Luiz

**Slack Channel**: #sprint-2-pagamentos-qr
- Links de PRs
- Deployment notifications
- Quick questions

---

## 📚 Referências

- Safe2Pay API: https://developers.safe2pay.com.br/docs
- jsonwebtoken: https://github.com/auth0/node-jsonwebtoken
- qrcode: https://github.com/davidshimjs/qrcodejs
- Recharts: https://recharts.org
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

---

**Prepared by**: GitHub Copilot  
**Date**: 18/02/2026  
**Ready for**: Monday 25/02/2026 Kickoff  
**MVP Target**: Wednesday 12/03/2026

