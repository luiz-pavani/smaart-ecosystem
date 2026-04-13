'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, RefreshCw,
  CheckSquare, Square, ChevronRight, CalendarDays, AlertTriangle, UserPlus,
  FileText, X, ExternalLink, Search, CreditCard, QrCode, DollarSign,
  Ban, Filter, Download, CheckCircle, Users,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DadosFormulario {
  tipo?: 'RENOVACAO' | 'FILIACAO'
  cpf?: string
  cidade?: string
  estado?: string
  pais?: string
  nacionalidade?: string
  genero?: string
  data_nascimento?: string
  nome_patch?: string
  tamanho_patch?: string
  cor_patch?: string
  kyu_dan_id?: number
  observacoes?: string
  projeto_social?: boolean
  valor?: number
}

interface Pagamento {
  referencia_id: string
  safe2pay_id: string | null
  tipo: 'pix' | 'cartao' | 'recorrente'
  valor: number
  status: 'pendente' | 'pago' | 'falhou' | 'cancelado'
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
}

interface FiliacaoPedido {
  id: string
  status: string
  created_at: string
  observacao?: string | null
  url_documento_id: string | null
  url_comprovante_pagamento: string | null
  dados_formulario: DadosFormulario | null
  stakeholder: { id: string; nome_completo: string; email: string; telefone: string | null; kyu_dan_id: number | null; genero: string | null; data_nascimento: string | null } | null
  academia: { id: string; nome: string; endereco_cidade: string; endereco_estado: string } | null
  pagamento: Pagamento | null
}

interface KyuDanOption {
  id: number
  cor_faixa: string
  kyu_dan: string
  icones?: string
}

interface AtletaRow {
  id: string
  nome_completo: string
  graduacao: string | null
  kyuDanIcones?: string | null
  kyuDanNome?: string | null
  academia?: { nome: string } | null
  status: string | null
  statusMembro: string | null
  status_plano: string | null
  validade: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function PagamentoBadge({ pagamento }: { pagamento: Pagamento | null }) {
  if (!pagamento) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
        <Ban className="w-3 h-3" />
        Sem pagamento
      </span>
    )
  }
  const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pago:     { color: 'text-green-400 bg-green-500/10 border-green-500/20',   icon: <CheckCircle2 className="w-3 h-3" />, label: 'Pago' },
    pendente: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <Clock className="w-3 h-3" />,        label: 'Aguardando' },
    falhou:   { color: 'text-red-400 bg-red-500/10 border-red-500/20',          icon: <XCircle className="w-3 h-3" />,      label: 'Falhou' },
    cancelado:{ color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',       icon: <Ban className="w-3 h-3" />,          label: 'Cancelado' },
  }
  const cfg = configs[pagamento.status] || configs.pendente
  const tipoIcon = pagamento.tipo === 'pix' ? <QrCode className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />
  const tipoLabel = pagamento.tipo === 'pix' ? 'Pix' : pagamento.tipo === 'cartao' ? 'Cartão' : 'Recorrente'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 text-xs ${cfg.color} border px-2 py-0.5 rounded-full`}>{cfg.icon}{cfg.label}</span>
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">{tipoIcon}{tipoLabel}</span>
    </div>
  )
}

function PagamentoDetails({ pagamento }: { pagamento: Pagamento | null }) {
  if (!pagamento) return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 flex items-center gap-3">
      <DollarSign className="w-5 h-5 text-gray-600" />
      <div>
        <p className="text-sm text-gray-400">Nenhum pagamento online registrado</p>
        <p className="text-xs text-gray-600 mt-0.5">Verifique o comprovante manual anexado (se houver)</p>
      </div>
    </div>
  )
  const statusLabels: Record<string, string> = { pago: 'Confirmado', pendente: 'Aguardando confirmação', falhou: 'Pagamento falhou', cancelado: 'Cancelado' }
  const tipoLabels: Record<string, string> = { pix: 'Pix', cartao: 'Cartão de Crédito', recorrente: 'Recorrente (Cartão)' }
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
      <Row label="Status" value={statusLabels[pagamento.status] || pagamento.status} />
      <Row label="Método" value={tipoLabels[pagamento.tipo] || pagamento.tipo} />
      <Row label="Valor" value={`R$ ${Number(pagamento.valor).toFixed(2)}`} />
      {pagamento.safe2pay_id && <Row label="Safe2Pay ID" value={pagamento.safe2pay_id} />}
      <Row label="Criado em" value={new Date(pagamento.created_at).toLocaleString('pt-BR')} />
      {pagamento.status === 'pago' && <Row label="Pago em" value={new Date(pagamento.updated_at).toLocaleString('pt-BR')} />}
    </div>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ pedido, kyuDanMap, onClose, onReview, acting }: {
  pedido: FiliacaoPedido
  kyuDanMap: Record<number, string>
  onClose: () => void
  onReview: (id: string, status: 'APROVADO' | 'REJEITADO' | 'PENDENTE', dataExpiracao: string, observacao: string) => void
  acting: boolean
}) {
  const df = pedido.dados_formulario || {}
  const st = pedido.stakeholder
  const ac = pedido.academia
  const pg = pedido.pagamento
  const kyuDanId = df.kyu_dan_id ?? st?.kyu_dan_id ?? null
  const graduacao = kyuDanId ? (kyuDanMap[kyuDanId] ?? `ID ${kyuDanId}`) : null
  const genero = df.genero ?? st?.genero ?? null
  const nascimento = df.data_nascimento ?? st?.data_nascimento ?? null
  const isPendente = pedido.status === 'PENDENTE'
  const isAprovado = pedido.status === 'APROVADO'
  const isRejeitado = pedido.status === 'REJEITADO'
  const defaultExp = (() => { const d = new Date(pedido.created_at); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0] })()
  const [dataExpiracao, setDataExpiracao] = useState(defaultExp)
  const [observacao, setObservacao] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">{st?.nome_completo || '—'}</h2>
              {isAprovado && <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Aprovado</span>}
              {isRejeitado && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Rejeitado</span>}
            </div>
            <p className="text-gray-400 text-xs mt-0.5">{df.tipo === 'RENOVACAO' ? 'Renovação de Filiação' : 'Nova Filiação'} · {new Date(pedido.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" />Pagamento</p>
            <PagamentoDetails pagamento={pg} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Dados Pessoais</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
              <Row label="E-mail" value={st?.email} />
              <Row label="Telefone" value={st?.telefone} />
              <Row label="CPF" value={df.cpf} />
              <Row label="Data de Nascimento" value={nascimento ? new Date(nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
              <Row label="Gênero" value={genero} />
              <Row label="Nacionalidade" value={df.nacionalidade} />
              <Row label="Cidade/Estado" value={df.cidade ? `${df.cidade}${df.estado ? `/${df.estado}` : ''}` : null} />
              <Row label="País" value={df.pais} />
            </div>
          </div>
          {ac && (
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Academia</p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
                <Row label="Nome" value={ac.nome} />
                <Row label="Cidade" value={`${ac.endereco_cidade}/${ac.endereco_estado}`} />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Dados Esportivos</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
              <Row label="Graduação" value={graduacao} />
              {df.tipo === 'RENOVACAO' && <Row label="Valor declarado" value={df.valor ? `R$ ${df.valor}` : null} />}
              {df.tipo === 'RENOVACAO' && df.projeto_social && <Row label="Projeto Social" value="Sim (SUB-18)" />}
              <Row label="Nome no Patch" value={df.nome_patch} />
              <Row label="Tamanho do Patch" value={df.tamanho_patch} />
              <Row label="Cor do Patch" value={df.cor_patch} />
              <Row label="Observações do atleta" value={df.observacoes} />
            </div>
          </div>
          {(pedido.url_documento_id || pedido.url_comprovante_pagamento) && (
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Documentos Anexados</p>
              <div className="space-y-2">
                {pedido.url_documento_id && (
                  <a href={pedido.url_documento_id} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Documento de Identidade</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                )}
                {pedido.url_comprovante_pagamento && (
                  <a href={pedido.url_comprovante_pagamento} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                    <FileText className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Comprovante de Pagamento (manual)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                )}
              </div>
            </div>
          )}
          {pedido.observacao && (
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Observação do Admin</p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-300">{pedido.observacao}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 shrink-0 space-y-3">
          {(isPendente || isRejeitado) && (
            <>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Observação do admin (opcional)</label>
                <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
                  placeholder="Ex: Comprovante verificado, aguardando documento..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-400 transition-colors resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400 shrink-0">Validade da filiação</label>
                <input type="date" value={dataExpiracao} onChange={e => setDataExpiracao(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors" />
              </div>
            </>
          )}

          {isPendente && (
            <div className="flex gap-3">
              <button onClick={() => onReview(pedido.id, 'REJEITADO', dataExpiracao, observacao)} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 font-medium transition-colors disabled:opacity-50">
                <XCircle className="w-4 h-4" />Rejeitar
              </button>
              <button onClick={() => onReview(pedido.id, 'APROVADO', dataExpiracao, observacao)} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 font-medium transition-colors disabled:opacity-50">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Aprovar
              </button>
            </div>
          )}

          {isAprovado && (
            <div className="space-y-2">
              <button onClick={() => onReview(pedido.id, 'APROVADO', dataExpiracao, observacao)} disabled={acting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 font-medium transition-colors disabled:opacity-50">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sincronizar atleta na lista
              </button>
              <div className="flex gap-2">
                <button onClick={() => onReview(pedido.id, 'PENDENTE', dataExpiracao, observacao)} disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 text-sm font-medium transition-colors disabled:opacity-50">
                  <Clock className="w-3.5 h-3.5" />Reabrir
                </button>
                <button onClick={() => onReview(pedido.id, 'REJEITADO', dataExpiracao, observacao)} disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50">
                  <XCircle className="w-3.5 h-3.5" />Rejeitar
                </button>
              </div>
            </div>
          )}

          {isRejeitado && (
            <div className="flex gap-3">
              <button onClick={() => onReview(pedido.id, 'PENDENTE', dataExpiracao, observacao)} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 font-medium transition-colors disabled:opacity-50">
                <Clock className="w-4 h-4" />Reabrir
              </button>
              <button onClick={() => onReview(pedido.id, 'APROVADO', dataExpiracao, observacao)} disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 font-medium transition-colors disabled:opacity-50">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Aprovar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Solicitações Tab ─────────────────────────────────────────────────────────

type SolTab = 'PENDENTE' | 'APROVADO' | 'REJEITADO'
type PagFilter = 'todos' | 'pago' | 'pendente' | 'sem'

function SolicitacoesTab() {
  const [todos, setTodos] = useState<FiliacaoPedido[]>([])
  const [kyuDanMap, setKyuDanMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [selected, setSelected] = useState<FiliacaoPedido | null>(null)
  const [tab, setTab] = useState<SolTab>('PENDENTE')
  const [search, setSearch] = useState('')
  const [pagFilter, setPagFilter] = useState<PagFilter>('todos')
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const [res, kdRes] = await Promise.all([
      fetch('/api/federacao/filiacao-pedidos').then(r => r.json()).catch(() => ({})),
      fetch('/api/kyu-dan').then(r => r.json()).catch(() => ({})),
    ])
    setTodos(res.pedidos || [])
    if (kdRes.kyu_dan) {
      const map: Record<number, string> = {}
      for (const k of kdRes.kyu_dan) map[k.id] = k.kyu_dan
      setKyuDanMap(map)
    }
    setLoading(false)
    setBulkSelected(new Set())
  }, [])

  useEffect(() => { load() }, [load])

  const review = async (pedidoId: string, status: 'APROVADO' | 'REJEITADO' | 'PENDENTE', dataExpiracao?: string, observacao?: string) => {
    setActing(true)
    await fetch('/api/federacao/filiacao-pedidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: pedidoId, status, data_expiracao_override: dataExpiracao, observacao }),
    })
    setActing(false)
    setSelected(null)
    load()
  }

  const bulkReview = async (status: 'APROVADO' | 'REJEITADO') => {
    if (!bulkSelected.size) return
    setActing(true)
    await Promise.all(Array.from(bulkSelected).map(id =>
      fetch('/api/federacao/filiacao-pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: id, status }),
      })
    ))
    setActing(false)
    setBulkSelected(new Set())
    load()
  }

  const byStatus = useMemo(() => ({
    pendentes: todos.filter(p => p.status === 'PENDENTE'),
    aprovadas: todos.filter(p => p.status === 'APROVADO'),
    rejeitadas: todos.filter(p => p.status === 'REJEITADO'),
  }), [todos])

  const lista = useMemo(() => {
    let items = tab === 'PENDENTE' ? byStatus.pendentes : tab === 'APROVADO' ? byStatus.aprovadas : byStatus.rejeitadas
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(p => {
        const nome = p.stakeholder?.nome_completo?.toLowerCase() || ''
        const email = p.stakeholder?.email?.toLowerCase() || ''
        const acad = p.academia?.nome?.toLowerCase() || ''
        const cpf = p.dados_formulario?.cpf || ''
        return nome.includes(q) || email.includes(q) || acad.includes(q) || cpf.includes(q)
      })
    }
    if (pagFilter !== 'todos') {
      items = items.filter(p =>
        pagFilter === 'pago' ? p.pagamento?.status === 'pago' :
        pagFilter === 'pendente' ? p.pagamento?.status === 'pendente' :
        !p.pagamento
      )
    }
    return items
  }, [tab, byStatus, search, pagFilter])

  const toggleBulk = (id: string) => setBulkSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAllBulk = () => setBulkSelected(bulkSelected.size === lista.length ? new Set() : new Set(lista.map(p => p.id)))

  const pagFilters: { key: PagFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' }, { key: 'pago', label: 'Pago' },
    { key: 'pendente', label: 'Aguardando' }, { key: 'sem', label: 'Sem pgto' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando solicitações...
    </div>
  )

  if (todos.length === 0) return (
    <div className="text-center py-16">
      <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
      <p className="text-white font-semibold text-lg">Nenhuma solicitação</p>
      <p className="text-gray-400 text-sm mt-1">Quando atletas solicitarem filiação, elas aparecerão aqui.</p>
    </div>
  )

  const solTabs = [
    { key: 'PENDENTE' as SolTab, label: 'Pendentes', count: byStatus.pendentes.length, color: 'text-yellow-400 border-yellow-400' },
    { key: 'APROVADO' as SolTab, label: 'Aprovadas',  count: byStatus.aprovadas.length,  color: 'text-green-400 border-green-400' },
    { key: 'REJEITADO' as SolTab,label: 'Rejeitadas', count: byStatus.rejeitadas.length, color: 'text-red-400 border-red-400' },
  ]

  return (
    <>
      {selected && (
        <ReviewModal pedido={selected} kyuDanMap={kyuDanMap} onClose={() => setSelected(null)} onReview={review} acting={acting} />
      )}

      {/* Sub-tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {solTabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setBulkSelected(new Set()) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${tab === t.key ? `bg-white/10 ${t.color}` : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
              {t.label}{t.count > 0 && ` (${t.count})`}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={acting} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search + payment filter */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, CPF ou academia..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-400 transition-colors" />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          {pagFilters.map(f => (
            <button key={f.key} onClick={() => setPagFilter(f.key)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${pagFilter === f.key ? 'bg-white/10 text-white border border-white/20' : 'text-gray-500 hover:text-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk bar */}
      {tab === 'PENDENTE' && lista.length > 0 && (
        <div className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2 mb-3">
          <button onClick={toggleAllBulk} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            {bulkSelected.size === lista.length && lista.length > 0
              ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              : <Square className="w-3.5 h-3.5" />}
            {bulkSelected.size > 0 ? `${bulkSelected.size} selecionado(s)` : 'Selecionar todos'}
          </button>
          {bulkSelected.size > 0 && (
            <div className="flex gap-1.5 ml-auto">
              <button onClick={() => bulkReview('APROVADO')} disabled={acting}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 text-xs font-medium transition-colors disabled:opacity-50">
                {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Aprovar {bulkSelected.size}
              </button>
              <button onClick={() => bulkReview('REJEITADO')} disabled={acting}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 text-xs font-medium transition-colors disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" />Rejeitar
              </button>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {lista.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">
          {search || pagFilter !== 'todos' ? 'Nenhuma solicitação com os filtros aplicados' : `Nenhuma solicitação ${tab === 'PENDENTE' ? 'pendente' : tab === 'APROVADO' ? 'aprovada' : 'rejeitada'}`}
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map(p => (
            <div key={p.id}
              className={`flex items-center gap-3 bg-white/5 border rounded-lg px-4 py-3 hover:bg-white/10 transition-colors ${bulkSelected.has(p.id) ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10'}`}>
              {tab === 'PENDENTE' && (
                <button onClick={() => toggleBulk(p.id)} className="shrink-0 text-gray-400 hover:text-white transition-colors">
                  {bulkSelected.has(p.id) ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
                </button>
              )}
              <button onClick={() => setSelected(p)} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium text-sm">{p.stakeholder?.nome_completo || '—'}</p>
                  {p.dados_formulario?.tipo === 'RENOVACAO'
                    ? <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Renovação</span>
                    : <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">Nova filiação</span>}
                  {p.status === 'APROVADO' && <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">Aprovado</span>}
                  {p.status === 'REJEITADO' && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">Rejeitado</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                  <span>{p.stakeholder?.email}</span>
                  {p.stakeholder?.telefone && <span>· {p.stakeholder.telefone}</span>}
                  {p.academia && <span>· {p.academia.nome} — {p.academia.endereco_cidade}/{p.academia.endereco_estado}</span>}
                  <span className="text-gray-600">· {new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="mt-1.5"><PagamentoBadge pagamento={p.pagamento} /></div>
              </button>
              <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {tab === 'PENDENTE' && byStatus.pendentes.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-600 px-1 mt-3">
          <span>{byStatus.pendentes.filter(p => p.pagamento?.status === 'pago').length} de {byStatus.pendentes.length} com pagamento confirmado</span>
          <span>R$ {byStatus.pendentes.filter(p => p.pagamento?.status === 'pago').reduce((s, p) => s + Number(p.pagamento?.valor || 0), 0).toFixed(2)} recebido</span>
        </div>
      )}
    </>
  )
}

// ─── Filiados Tab ─────────────────────────────────────────────────────────────

function FiliadosTab() {
  const router = useRouter()
  const supabase = createClient() // used only for options (kyu_dan, academias) and atualizarStatus
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaRow[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterGraduacao, setFilterGraduacao] = useState('')
  const [filterAcademia, setFilterAcademia] = useState('')
  const [filterSituacao, setFilterSituacao] = useState('')
  const [filterStatusMembro, setFilterStatusMembro] = useState('')
  const [graduacoes, setGraduacoes] = useState<KyuDanOption[]>([])
  const [academiasOptions, setAcademiasOptions] = useState<{ id: string; sigla: string; nome: string }[]>([])
  const [aprovando, setAprovando] = useState<string | null>(null)
  const [downloadingCSV, setDownloadingCSV] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [sortBy, setSortBy] = useState<'nome_completo' | 'academia' | 'graduacao' | 'status' | 'validade'>('nome_completo')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const pageSize = 100

  // Summary data
  const [summary, setSummary] = useState({ pendentes: 0, vencendo: 0, vencidas: 0, novas_mes: 0 })

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    Promise.all([
      supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').eq('ativo', true).order('ordem', { ascending: true }),
      supabase.from('academias').select('id, sigla, nome').order('sigla', { ascending: true }),
    ]).then(([gradRes, acadRes]) => {
      setGraduacoes((gradRes.data as KyuDanOption[]) || [])
      setAcademiasOptions(acadRes.data || [])
    })
    // Load summary
    fetch('/api/federacao/filiacoes').then(r => r.json()).then(d => {
      if (!d.error) setSummary({ pendentes: d.pendentes?.length ?? 0, vencendo: d.vencendo?.length ?? 0, vencidas: d.vencidas?.length ?? 0, novas_mes: d.novas_mes ?? 0 })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page) })
        if (search)           params.set('search', search)
        if (filterGraduacao)  params.set('graduacao', filterGraduacao)
        if (filterAcademia)   params.set('academia', filterAcademia)
        if (filterSituacao)   params.set('situacao', filterSituacao)
        if (filterStatusMembro) params.set('statusMembro', filterStatusMembro)

        const res = await fetch(`/api/federacao/filiados?${params}`)
        const json = await res.json()
        if (json.error) { setAtletas([]); setTotalCount(0); return }
        setAtletas(json.atletas || [])
        setTotalCount(json.total || 0)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, search, filterGraduacao, filterAcademia, filterSituacao, filterStatusMembro])

  async function atualizarStatus(atletaId: string, novoStatus: 'Aceito' | 'Rejeitado') {
    setAprovando(atletaId + novoStatus)
    const res = await fetch(`/api/atletas/${atletaId}/update-fed`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_membro: novoStatus }),
    })
    setAprovando(null)
    if (res.ok) setAtletas(prev => prev.map(a => a.id === atletaId ? { ...a, statusMembro: novoStatus } : a))
  }

  const clearFilters = () => { setSearchInput(''); setSearch(''); setFilterGraduacao(''); setFilterAcademia(''); setFilterSituacao(''); setFilterStatusMembro(''); setPage(0) }

  const downloadCSV = async () => {
    setDownloadingCSV(true)
    try {
      // Fetch all pages from the API (supabaseAdmin, bypasses RLS)
      const all: AtletaRow[] = []
      let p = 0
      while (true) {
        const params = new URLSearchParams({ page: String(p) })
        if (search)             params.set('search', search)
        if (filterGraduacao)    params.set('graduacao', filterGraduacao)
        if (filterAcademia)     params.set('academia', filterAcademia)
        if (filterSituacao)     params.set('situacao', filterSituacao)
        if (filterStatusMembro) params.set('statusMembro', filterStatusMembro)
        const res = await fetch(`/api/federacao/filiados?${params}`)
        const json = await res.json()
        const batch: AtletaRow[] = json.atletas || []
        all.push(...batch)
        if (batch.length < 100 || all.length >= json.total) break
        p++
      }
      if (!all.length) return

      const headers = ['Nome', 'Academia', 'Faixa / Graduação', 'Status Membro', 'Plano', 'Validade']
      const rows = all.map(i => [
        `"${(i.nome_completo || '').replace(/"/g, '""')}"`,
        `"${(i.academia?.nome || '').replace(/"/g, '""')}"`,
        `"${(i.kyuDanNome || i.graduacao || '').replace(/"/g, '""')}"`,
        i.statusMembro || '',
        i.status_plano || '',
        i.validade || '',
      ].join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `filiados_lrsj_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } finally { setDownloadingCSV(false) }
  }

  const downloadPDF = async () => {
    if (!atletas.length) return
    setDownloadingPDF(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFontSize(14); doc.setTextColor(30, 30, 30)
      doc.text('Lista de Filiados — LRSJ', 14, 14)
      doc.setFontSize(8); doc.setTextColor(120, 120, 120)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${atletas.length} atletas`, 14, 20)
      autoTable(doc, {
        startY: 24,
        head: [['Nome', 'Academia', 'Faixa', 'Status Membro', 'Plano', 'Validade']],
        body: atletas.map(a => [a.nome_completo, a.academia?.nome || '—', a.graduacao || '—', a.statusMembro || '—', a.status_plano || '—', a.validade && a.validade !== '—' ? new Date(a.validade + 'T12:00:00').toLocaleDateString('pt-BR') : '—']),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      })
      doc.save(`filiados_lrsj_${new Date().toISOString().split('T')[0]}.pdf`)
    } finally { setDownloadingPDF(false) }
  }

  const sortedAtletas = useMemo(() => [...atletas].sort((a, b) => {
    const va = (a as any)[sortBy] || ''
    const vb = (b as any)[sortBy] || ''
    return sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  }), [atletas, sortBy, sortOrder])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('asc') }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendentes aprovação', value: summary.pendentes, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Vencendo em 30 dias',  value: summary.vencendo,  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Anuidades vencidas',   value: summary.vencidas,  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Novas este mês',       value: summary.novas_mes, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
        ].map((m, i) => (
          <div key={i} className={`${m.bg} border rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-400 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar atleta por nome..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={filterAcademia} onChange={e => { setFilterAcademia(e.target.value); setPage(0) }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-blue-500 transition-colors">
            <option value="">Todas Academias</option>
            {academiasOptions.map(a => <option key={a.id} value={a.sigla || a.nome}>{a.sigla || a.nome}</option>)}
          </select>
          <select value={filterGraduacao} onChange={e => { setFilterGraduacao(e.target.value); setPage(0) }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-blue-500 transition-colors">
            <option value="">Todas Graduações</option>
            {graduacoes.map(g => <option key={g.id} value={g.id}>{g.cor_faixa} | {g.kyu_dan}</option>)}
          </select>
          <select value={filterSituacao} onChange={e => { setFilterSituacao(e.target.value); setPage(0) }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-blue-500 transition-colors">
            <option value="">Todas Situações</option>
            <option value="Válido">Válido</option>
            <option value="Vencido">Vencido</option>
            <option value="Pendente">Pendente</option>
          </select>
          <select value={filterStatusMembro} onChange={e => { setFilterStatusMembro(e.target.value); setPage(0) }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-blue-500 transition-colors">
            <option value="">Todos os Membros</option>
            <option value="Em análise">Em análise</option>
            <option value="Aceito">Aceito</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white text-sm transition-colors">
            <X className="w-3.5 h-3.5" />Limpar filtros
          </button>
          <button onClick={downloadCSV} disabled={totalCount === 0 || downloadingCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:text-green-300 text-sm transition-colors disabled:opacity-50">
            {downloadingCSV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            CSV ({totalCount})
          </button>
          <button onClick={downloadPDF} disabled={atletas.length === 0 || downloadingPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50">
            {downloadingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF ({atletas.length})
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando filiados...
        </div>
      ) : totalCount === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-white font-semibold">Nenhum atleta encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros ou aguarde novos cadastros.</p>
        </div>
      ) : (
        <>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white" onClick={() => toggleSort('nome_completo')}>
                    Nome {sortBy === 'nome_completo' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white" onClick={() => toggleSort('academia')}>
                    Academia {sortBy === 'academia' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white" onClick={() => toggleSort('graduacao')} title="Graduação">🥋</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400" title="Plano">Plano</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-400" title="Membro">Membro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white" onClick={() => toggleSort('validade')}>
                    Vencimento {sortBy === 'validade' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">Ação</th>
                </tr>
              </thead>
              <tbody>
                {sortedAtletas.map(atleta => (
                  <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/portal/federacao/atletas/${atleta.id}`} className="text-gray-200 hover:text-blue-400 transition-colors text-sm font-medium">
                        {atleta.nome_completo}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{atleta.academia?.nome || '—'}</td>
                    <td className="px-3 py-3 text-center text-lg" title={atleta.kyuDanNome || ''}>
                      {atleta.kyuDanNome?.includes('NÃO ESPECIFICADA') ? '❌' : (atleta.kyuDanIcones || (atleta.graduacao ? '🥋' : '✖️'))}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${atleta.status_plano === 'Válido' ? 'bg-green-500' : atleta.status_plano === 'Vencido' ? 'bg-red-500' : 'bg-gray-400'}`}
                        title={atleta.status_plano || 'Indefinido'} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${atleta.statusMembro === 'Aceito' ? 'bg-green-500' : atleta.statusMembro === 'Rejeitado' ? 'bg-red-500' : 'bg-yellow-500'}`}
                        title={atleta.statusMembro || 'Em análise'} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {atleta.validade && atleta.validade !== '—'
                        ? new Date(atleta.validade + 'T12:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {atleta.statusMembro !== 'Aceito' && (
                        <div className="flex items-center justify-center gap-1">
                          <button title="Aprovar" disabled={aprovando === atleta.id + 'Aceito'} onClick={() => atualizarStatus(atleta.id, 'Aceito')}
                            className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-400 transition-colors disabled:opacity-50">
                            {aprovando === atleta.id + 'Aceito' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                          {atleta.statusMembro !== 'Rejeitado' && (
                            <button title="Rejeitar" disabled={aprovando === atleta.id + 'Rejeitado'} onClick={() => atualizarStatus(atleta.id, 'Rejeitado')}
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors disabled:opacity-50">
                              {aprovando === atleta.id + 'Rejeitado' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} de {totalCount} filiados
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50 text-sm">
                ← Anterior
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50 text-sm">
                Próxima →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type MainTab = 'solicitacoes' | 'filiados'

export default function FiliacoesPage() {
  const router = useRouter()
  const [mainTab, setMainTab] = useState<MainTab>('solicitacoes')
  const [pendentesCount, setPendentesCount] = useState(0)

  useEffect(() => {
    fetch('/api/federacao/filiacao-pedidos')
      .then(r => r.json())
      .then(d => setPendentesCount((d.pedidos || []).filter((p: any) => p.status === 'PENDENTE').length))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Gestão de Filiações</h1>
          <p className="text-slate-400 text-sm">Solicitações, aprovações, renovações e vencimentos — LRSJ</p>
        </div>
        <button onClick={() => router.push('/portal/federacao')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 text-sm">
          <ArrowLeft className="w-4 h-4" />Voltar
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        <button onClick={() => setMainTab('solicitacoes')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'solicitacoes' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <UserPlus className="w-4 h-4" />
          Solicitações
          {pendentesCount > 0 && (
            <span className="text-xs text-yellow-400 bg-yellow-500/15 border border-yellow-500/25 px-1.5 py-0.5 rounded-full leading-none">
              {pendentesCount}
            </span>
          )}
        </button>
        <button onClick={() => setMainTab('filiados')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === 'filiados' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <Users className="w-4 h-4" />
          Filiados
        </button>
      </div>

      {/* Content */}
      <div>
        {mainTab === 'solicitacoes' && <SolicitacoesTab />}
        {mainTab === 'filiados' && <FiliadosTab />}
      </div>
    </div>
  )
}
