'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, RefreshCw,
  CheckSquare, Square, ChevronRight, CalendarDays, AlertTriangle, UserPlus,
  FileText, X, ExternalLink,
} from 'lucide-react'

interface DadosFormulario {
  cpf?: string
  cidade?: string
  estado?: string
  pais?: string
  nacionalidade?: string
  nome_patch?: string
  tamanho_patch?: string
  cor_patch?: string
  kyu_dan_id?: number
  observacoes?: string
}

interface FiliacaoPedido {
  id: string
  status: string
  created_at: string
  url_documento_id: string | null
  url_comprovante_pagamento: string | null
  dados_formulario: DadosFormulario | null
  stakeholder: { id: string; nome_completo: string; email: string; telefone: string | null; kyu_dan_id: number | null } | null
  academia: { id: string; nome: string; endereco_cidade: string; endereco_estado: string } | null
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function ReviewModal({
  pedido,
  onClose,
  onReview,
  acting,
}: {
  pedido: FiliacaoPedido
  onClose: () => void
  onReview: (id: string, status: 'APROVADO' | 'REJEITADO') => void
  acting: boolean
}) {
  const df = pedido.dados_formulario || {}
  const st = pedido.stakeholder
  const ac = pedido.academia

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">{st?.nome_completo || '—'}</h2>
            <p className="text-gray-400 text-xs mt-0.5">Solicitação de Filiação · {new Date(pedido.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Dados pessoais */}
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Dados Pessoais</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
              <Row label="E-mail" value={st?.email} />
              <Row label="Telefone" value={st?.telefone} />
              <Row label="CPF" value={df.cpf} />
              <Row label="Nacionalidade" value={df.nacionalidade} />
              <Row label="Cidade" value={df.cidade ? `${df.cidade}${df.estado ? `/${df.estado}` : ''}` : null} />
              <Row label="País" value={df.pais} />
            </div>
          </div>

          {/* Academia */}
          {ac && (
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Academia</p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
                <Row label="Nome" value={ac.nome} />
                <Row label="Cidade" value={`${ac.endereco_cidade}/${ac.endereco_estado}`} />
              </div>
            </div>
          )}

          {/* Dados esportivos */}
          <div>
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Dados Esportivos</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-1">
              <Row label="Nome no Patch" value={df.nome_patch} />
              <Row label="Tamanho do Patch" value={df.tamanho_patch} />
              <Row label="Cor do Patch" value={df.cor_patch} />
              <Row label="Observações" value={df.observacoes} />
            </div>
          </div>

          {/* Documentos */}
          {(pedido.url_documento_id || pedido.url_comprovante_pagamento) && (
            <div>
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">Documentos</p>
              <div className="space-y-2">
                {pedido.url_documento_id && (
                  <a
                    href={pedido.url_documento_id}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Documento de Identidade</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                )}
                {pedido.url_comprovante_pagamento && (
                  <a
                    href={pedido.url_comprovante_pagamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Comprovante de Pagamento</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={() => onReview(pedido.id, 'REJEITADO')}
            disabled={acting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 font-medium transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Rejeitar
          </button>
          <button
            onClick={() => onReview(pedido.id, 'APROVADO')}
            disabled={acting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 font-medium transition-colors disabled:opacity-50"
          >
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Aprovar
          </button>
        </div>
      </div>
    </div>
  )
}

function SolicitacoesSection({ onRefresh }: { onRefresh: () => void }) {
  const [pedidos, setPedidos] = useState<FiliacaoPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [selected, setSelected] = useState<FiliacaoPedido | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/federacao/filiacao-pedidos').then(r => r.json()).catch(() => ({}))
    setPedidos((res.pedidos || []).filter((p: FiliacaoPedido) => p.status === 'PENDENTE'))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const review = async (pedidoId: string, status: 'APROVADO' | 'REJEITADO') => {
    setActing(true)
    await fetch('/api/federacao/filiacao-pedidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: pedidoId, status }),
    })
    setActing(false)
    setSelected(null)
    await load()
    onRefresh()
  }

  if (loading) return null
  if (pedidos.length === 0) return null

  return (
    <>
      {selected && (
        <ReviewModal
          pedido={selected}
          onClose={() => setSelected(null)}
          onReview={review}
          acting={acting}
        />
      )}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-yellow-400" />
          <h2 className="font-semibold text-white text-sm">Solicitações de Filiação ({pedidos.length})</h2>
          <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">Novo</span>
        </div>
        <div className="space-y-2">
          {pedidos.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full text-left flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{p.stakeholder?.nome_completo || '—'}</p>
                <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-400">
                  <span>{p.stakeholder?.email}</span>
                  {p.stakeholder?.telefone && <span>· {p.stakeholder.telefone}</span>}
                  {p.academia && <span>· {p.academia.nome} — {p.academia.endereco_cidade}/{p.academia.endereco_estado}</span>}
                  <span className="text-gray-600">· {new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

interface Atleta {
  id: string
  nome_completo: string
  academia: string
  academia_nome: string
  graduacao: string | null
  cor_faixa: string | null
  status_membro: string
  status_plano: string | null
  data_expiracao: string | null
  data_adesao: string | null
  telefone: string | null
  dias: number | null
}

interface Data {
  pendentes: Atleta[]
  vencendo: Atleta[]
  vencidas: Atleta[]
  novas_mes: number
}

type Tab = 'pendentes' | 'vencendo' | 'vencidas'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function nextYear() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

// ── Renovar inline ───────────────────────────────────────────────────────────
function RenovarButton({ atletaId, onDone }: { atletaId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(nextYear)
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    setSaving(true)
    await fetch(`/api/atletas/${atletaId}/update-fed`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_plano: 'Válido', data_expiracao: date }),
    })
    setSaving(false)
    setOpen(false)
    onDone()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30
                   text-blue-300 hover:bg-blue-500/30 text-xs font-medium transition-colors"
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Renovar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none focus:border-blue-400"
      />
      <button
        onClick={confirmar}
        disabled={saving}
        className="px-2.5 py-1.5 rounded-lg bg-green-500/30 border border-green-500/40 text-green-300 text-xs font-medium hover:bg-green-500/40 transition-colors"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'OK'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

// ── Atleta row ───────────────────────────────────────────────────────────────
function AtletaRow({
  a, selected, onSelect, actions,
}: {
  a: Atleta
  selected?: boolean
  onSelect?: () => void
  actions?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      selected ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10 hover:bg-white/8'
    }`}>
      {onSelect && (
        <button onClick={onSelect} className="shrink-0 text-gray-400 hover:text-white transition-colors">
          {selected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium text-sm truncate">{a.nome_completo}</p>
          {a.data_adesao && (
            <span className="text-xs text-gray-600 shrink-0">
              {fmtDate(a.data_adesao)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{a.academia}</span>
          {a.graduacao && <span className="text-xs text-gray-600">· {a.graduacao}</span>}
          {a.data_expiracao && (
            <span className={`text-xs ${
              a.dias !== null && a.dias < 0 ? 'text-red-400' :
              a.dias !== null && a.dias <= 7 ? 'text-amber-400' : 'text-gray-500'
            }`}>
              · {a.dias !== null && a.dias < 0
                  ? `Venceu há ${Math.abs(a.dias)}d (${fmtDate(a.data_expiracao)})`
                  : `Vence em ${a.dias}d (${fmtDate(a.data_expiracao)})`}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <button
          onClick={() => router.push(`/portal/federacao/atletas/${a.id}`)}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          title="Ver perfil completo"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function FiliacoesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pendentes')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelected(new Set())
    const res = await fetch('/api/federacao/filiacoes')
    const json = await res.json()
    if (json.error) setError(json.error)
    else setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const currentList: Atleta[] = data
    ? tab === 'pendentes' ? data.pendentes
    : tab === 'vencendo' ? data.vencendo
    : data.vencidas
    : []

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === currentList.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(currentList.map(a => a.id)))
    }
  }

  const bulkAction = async (action: 'aprovar' | 'rejeitar') => {
    if (!selected.size) return
    setActing(true)
    await fetch('/api/federacao/filiacoes/aprovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    })
    setActing(false)
    await load()
  }

  const singleAction = async (id: string, action: 'aprovar' | 'rejeitar') => {
    setActing(true)
    await fetch('/api/federacao/filiacoes/aprovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], action }),
    })
    setActing(false)
    await load()
  }

  const tabs: { key: Tab; label: string; count: number; color: string; icon: React.ReactNode }[] = [
    {
      key: 'pendentes',
      label: 'Pendentes',
      count: data?.pendentes.length ?? 0,
      color: 'text-yellow-400 border-yellow-400',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      key: 'vencendo',
      label: 'Vencendo em 30d',
      count: data?.vencendo.length ?? 0,
      color: 'text-amber-400 border-amber-400',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      key: 'vencidas',
      label: 'Vencidas',
      count: data?.vencidas.length ?? 0,
      color: 'text-red-400 border-red-400',
      icon: <XCircle className="w-4 h-4" />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestão de Filiações</h1>
          <p className="text-slate-400">Aprovações, renovações e vencimentos da LRSJ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/portal/federacao')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                       text-slate-300 hover:text-white transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>

      <SolicitacoesSection onRefresh={load} />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pendentes aprovação', value: data.pendentes.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { label: 'Vencendo em 30 dias', value: data.vencendo.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Anuidades vencidas', value: data.vencidas.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'Novas este mês', value: data.novas_mes, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
            ].map((m, i) => (
              <div key={i} className={`${m.bg} border rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelected(new Set()) }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key ? `bg-white/10 ${t.color}` : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk action bar — Pendentes only */}
          {tab === 'pendentes' && currentList.length > 0 && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {selected.size === currentList.length
                  ? <CheckSquare className="w-4 h-4 text-purple-400" />
                  : <Square className="w-4 h-4" />}
                {selected.size === currentList.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              {selected.size > 0 && (
                <>
                  <span className="text-gray-600 text-sm">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => bulkAction('aprovar')}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30
                                 text-green-300 hover:bg-green-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Aprovar selecionados
                    </button>
                    <button
                      onClick={() => bulkAction('rejeitar')}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30
                                 text-red-300 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* List */}
          {currentList.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
              {tab === 'pendentes' && (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">Nenhuma filiação pendente</p>
                  <p className="text-gray-400 text-sm mt-1">Todas as solicitações foram processadas.</p>
                </>
              )}
              {tab === 'vencendo' && (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">Nenhuma anuidade vencendo em 30 dias</p>
                </>
              )}
              {tab === 'vencidas' && (
                <p className="text-gray-500 text-sm">Nenhuma anuidade vencida</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {currentList.map(a => (
                <AtletaRow
                  key={a.id}
                  a={a}
                  selected={tab === 'pendentes' ? selected.has(a.id) : undefined}
                  onSelect={tab === 'pendentes' ? () => toggleSelect(a.id) : undefined}
                  actions={
                    tab === 'pendentes' ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => singleAction(a.id, 'aprovar')}
                          disabled={acting}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30
                                     text-green-300 hover:bg-green-500/30 text-xs font-medium transition-colors"
                          title="Aprovar"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => singleAction(a.id, 'rejeitar')}
                          disabled={acting}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30
                                     text-red-300 hover:bg-red-500/30 text-xs font-medium transition-colors"
                          title="Rejeitar"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <RenovarButton atletaId={a.id} onDone={load} />
                    )
                  }
                />
              ))}
            </div>
          )}

          {/* Tip */}
          {tab === 'pendentes' && currentList.length > 0 && (
            <p className="text-center text-xs text-gray-600">
              Ao aprovar, o atleta recebe notificação via WhatsApp (quando número disponível)
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
