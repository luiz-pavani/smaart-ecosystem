# 🎨 Componentes UI Padronizados - Titan Portal

Biblioteca de componentes reutilizáveis para manter consistência visual em todos os portais.

## 📊 Dashboard Components

### MetricCard
Card métrico com animações suaves e feedback visual aprimorado.

```tsx
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Users } from 'lucide-react'

<MetricCard
  title="Total de Atletas"
  value={150}
  icon={Users}
  color="blue"
  trend={{ value: 12, label: 'vs mês anterior' }}
  onClick={() => router.push('/atletas')}
/>
```

**Cores disponíveis:** `blue | green | purple | orange | red`

### LineChart / PieChart
Gráficos Recharts estilizados com tema dark padronizado.

```tsx
import { LineChart, PieChart } from '@/components/dashboard'

<LineChart
  title="Frequência Semanal"
  data={[{ name: 'Seg', value: 12 }, ...]}
  color="#10b981"
/>

<PieChart
  title="Distribuição por Graduação"
  data={[{ name: 'Branca', value: 45 }, ...]}
/>
```

### TopList
Lista ranqueada com destaque para top 3 e animações de hover.

```tsx
import { TopList } from '@/components/dashboard/TopList'

<TopList
  title="Top 5 Atletas"
  items={[
    { name: 'João Silva', value: 24, subtitle: 'Faixa Preta' }
  ]}
  valueLabel="presenças"
/>
```

## 🧩 UI Components

### PageHeader
Cabeçalho padronizado com navegação e ações.

```tsx
import { PageHeader } from '@/components/ui'

<PageHeader
  title="Meus Atletas"
  subtitle="Gerencie sua lista de atletas"
  backTo="/portal/academia"
  actions={
    <button className="btn-primary">+ Novo Atleta</button>
  }
/>
```

### DataTable
Tabela responsiva e estilizada.

```tsx
import { DataTable } from '@/components/ui'

<DataTable
  columns={[
    { header: 'Nome', accessor: 'nome' },
    { header: 'Status', accessor: (row) => <Badge>{row.status}</Badge> }
  ]}
  data={atletas}
  keyExtractor={(row) => row.id}
  emptyMessage="Nenhum atleta cadastrado"
/>
```

### LoadingState / ErrorState / EmptyState
Estados padronizados para feedback visual.

```tsx
import { LoadingState, ErrorState, EmptyState } from '@/components/ui'

// Loading
<LoadingState message="Carregando atletas..." size="lg" />

// Error
<ErrorState 
  message="Falha ao carregar dados"
  onRetry={() => reload()}
/>

// Empty
<EmptyState
  icon={Users}
  title="Nenhum atleta cadastrado"
  description="Comece adicionando seu primeiro atleta"
  action={<button>+ Adicionar</button>}
/>
```

## 🎯 Padrões de Design

### Cores do Tema
- **Background:** `bg-gradient-to-br from-slate-900 to-slate-800`
- **Cards:** `bg-white/5 backdrop-blur border border-white/10`
- **Hover:** `hover:bg-white/10 hover:border-white/20`
- **Text:** `text-white` (títulos), `text-gray-300` (corpo), `text-gray-400` (secundário)

### Bordas e Espaçamentos
- **Bordas:** `rounded-xl` (cards), `rounded-lg` (botões)
- **Padding:** `p-6` (cards), `p-4` (elementos menores)
- **Gap:** `gap-6` (grades), `gap-3` (elementos próximos)

### Transições
- **Padrão:** `transition-all duration-300`
- **Hover scale:** `hover:scale-[1.02]`
- **Active scale:** `active:scale-[0.98]`

## 📦 Importação Centralizada

```tsx
// Dashboard
import { 
  MetricCard, 
  LineChart, 
  PieChart, 
  TopList 
} from '@/components/dashboard'

// UI
import { 
  PageHeader, 
  DataTable, 
  EmptyState, 
  ErrorState, 
  LoadingState 
} from '@/components/ui'
```

## ✨ Melhorias Implementadas

- ✅ Animações suaves em hover/active
- ✅ Feedback visual consistente
- ✅ Estados de loading/error/empty padronizados
- ✅ Bordas arredondadas harmonizadas (rounded-xl)
- ✅ Transições de 300ms em todos os componentes
- ✅ Ícones com escala animada em hover
- ✅ Cores segmentadas para métricas (badges com trend)
- ✅ Tipografia tabular para números

---

**Última atualização:** 08/03/2026
**Commit:** 0da2dd5
