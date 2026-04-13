'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X, ChevronDown, DollarSign, CheckCircle2, Clock, XCircle, Plus, CalendarDays } from 'lucide-react'

interface Candidato {
  id: string
  nome_completo: string
  email: string
  telefone: string
  data_nascimento: string
  kyu_dan: { id: number; kyu_dan: string; cor_faixa: string } | null
  inscricao: {
    id: string
    graduacao_pretendida: string
    status_inscricao: string
    status_pagamento: string
    created_at: string
    observacoes?: string
  } | null
}

const STATUS_INSCRICAO = ['PENDENTE', 'EM_ANALISE', 'CONFIRMADO', 'REPROVADO', 'CANCELADO']
const STATUS_PAGAMENTO = ['PENDENTE', 'APROVADO', 'RECUSADO', 'REEMBOLSADO']
const GRADUACOES = [
  'Shodan (1º Dan)', 'Nidan (2º Dan)', 'Sandan (3º Dan)', 'Yondan (4º Dan)',
  'Godan (5º Dan)', 'Rokudan (6º Dan)', 'Shichidan (7º Dan)', 'Hachidan (8º Dan)',
  'Kudan (9º Dan)', 'Judan (10º Dan)',
]

const STATUS_COLORS: Record<string, string> = {
  CONFIRMADO: 'bg-green-600/20 text-green-400 border-green-600/30',
  APROVADO: 'bg-green-600/20 text-green-400 border-green-600/30',
  PENDENTE: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  EM_ANALISE: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  REPROVADO: 'bg-red-600/20 text-red-400 border-red-600/30',
  RECUSADO: 'bg-red-600/20 text-red-400 border-red-600/30',
  CANCELADO: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  REEMBOLSADO: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
}

function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_COLORS[value] || 'bg-slate-600/20 text-slate-400 border-slate-600/30'
  return (
    <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${cls}`}>{value}</span>
  )
}

const selectCls = "w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500"
const labelCls = "text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5"

function EditModal({ candidato, onClose, onSave }: { candidato: Candidato; onClose: () => void; onSave: (data: any) => void }) {
  const [graduacao, setGraduacao] = useState(candidato.inscricao?.graduacao_pretendida || 'Shodan (1º Dan)')
  const [statusInscricao, setStatusInscricao] = useState(candidato.inscricao?.status_inscricao || 'PENDENTE')
  const [statusPagamento, setStatusPagamento] = useState(candidato.inscricao?.status_pagamento || 'PENDENTE')
  const [observacoes, setObservacoes] = useState(candidato.inscricao?.observacoes || '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setErro('')
    try {
      await onSave({
        inscricao_id: candidato.inscricao?.id,
        stakeholder_id: candidato.id,
        graduacao_pretendida: graduacao,
        status_inscricao: statusInscricao,
        status_pagamento: statusPagamento,
        observacoes,
      })
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-black text-lg">{candidato.nome_completo}</h3>
            <p className="text-slate-500 text-xs">{candidato.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        {!candidato.inscricao && (
          <div className="mb-4 px-3 py-2 bg-indigo-900/20 border border-indigo-800/30 rounded-lg">
            <p className="text-indigo-300 text-xs font-semibold">Sem inscrição registrada. Ao salvar, uma inscrição será criada pelo admin.</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Graduação Pretendida</label>
            <div className="relative">
              <select value={graduacao} onChange={e => setGraduacao(e.target.value)} className={selectCls}>
                {GRADUACOES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status da Inscrição</label>
            <div className="relative">
              <select value={statusInscricao} onChange={e => setStatusInscricao(e.target.value)} className={selectCls}>
                {STATUS_INSCRICAO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status do Pagamento</label>
            <div className="relative">
              <select value={statusPagamento} onChange={e => setStatusPagamento(e.target.value)} className={selectCls}>
                {STATUS_PAGAMENTO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={4}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
        </div>

        {erro && <p className="mt-4 text-red-400 text-xs font-semibold">{erro}</p>}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagamentos Modal ────────────────────────────────────────────────────────

interface PagamentoRow {
  id: string; tipo: string; valor: number; status: string; safe2pay_id: string | null
  metadata: any; created_at: string
}

function PagStatusIcon({ s }: { s: string }) {
  if (s === 'pago') return <CheckCircle2 className="w-4 h-4 text-green-400" />
  if (s === 'pendente') return <Clock className="w-4 h-4 text-yellow-400" />
  return <XCircle className="w-4 h-4 text-slate-500" />
}

const PAG_STATUS_CLS: Record<string, string> = {
  pago: 'bg-green-600/20 text-green-400 border-green-600/30',
  pendente: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  cancelado: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  falhou: 'bg-red-600/20 text-red-400 border-red-600/30',
}

function PagamentosModal({ candidato, onClose }: { candidato: Candidato; onClose: () => void }) {
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [valor, setValor] = useState('2200')
  const [tipo, setTipo] = useState('pix')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [changingId, setChangingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  async function load() {
    try {
      const res = await fetch(`/api/candidato/pagamentos?stakeholder_id=${candidato.id}`)
      const d = await res.json()
      setPagamentos(d.pagamentos || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [candidato.id])

  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleRegister = async () => {
    setSaving(true); setErro('')
    try {
      const res = await fetch('/api/candidato/pagamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_id: candidato.id, valor: Number(valor), tipo, observacao: obs }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setShowForm(false); setObs(''); await load()
    } catch (e: any) { setErro(e.message || 'Erro') }
    finally { setSaving(false) }
  }

  const handleChangeStatus = async (pagId: string, status: string) => {
    try {
      const res = await fetch('/api/candidato/pagamentos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagamento_id: pagId, status }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setChangingId(null); await load()
    } catch { /* silent */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-black text-lg">{candidato.nome_completo}</h3>
            <p className="text-slate-500 text-xs">Pagamentos · Total pago: <span className="text-green-400 font-bold">{fmt(totalPago)}</span></p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : (
          <>
            {pagamentos.length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-sm">Nenhum pagamento registrado</div>
            ) : (
              <div className="space-y-2 mb-4">
                {pagamentos.map(p => (
                  <div key={p.id} className="bg-black/40 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <PagStatusIcon s={p.status} />
                      <span className="text-white font-bold text-sm">{fmt(p.valor)}</span>
                      <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${PAG_STATUS_CLS[p.status] || PAG_STATUS_CLS.pendente}`}>{p.status}</span>
                      <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${p.tipo === 'pix' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>{p.tipo}</span>
                      {p.metadata?.manual && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">MANUAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-slate-600 text-xs flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {p.safe2pay_id && <span className="text-slate-700 text-xs font-mono">#{p.safe2pay_id}</span>}
                    </div>
                    {p.metadata?.observacao && <p className="text-slate-500 text-xs italic mt-1">{p.metadata.observacao}</p>}

                    {/* Quick status change */}
                    {changingId === p.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                          className="bg-black border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs appearance-none focus:outline-none">
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                        <button onClick={() => handleChangeStatus(p.id, newStatus)}
                          className="text-xs text-green-400 hover:text-green-300 font-bold px-2 py-1 rounded bg-green-600/10">OK</button>
                        <button onClick={() => setChangingId(null)} className="text-xs text-slate-500 hover:text-white px-2 py-1">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setChangingId(p.id); setNewStatus(p.status) }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold mt-2">
                        Alterar status
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Register manual payment */}
            {!showForm ? (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-green-500/30 rounded-xl text-green-400 hover:text-green-300 hover:border-green-500/50 text-xs font-bold transition-colors">
                <Plus className="w-4 h-4" /> Registrar Pagamento Manual
              </button>
            ) : (
              <div className="bg-black/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-black tracking-widest text-slate-400 uppercase">Novo pagamento (manual)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-white text-sm appearance-none focus:outline-none">
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Observação</label>
                  <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Depósito bancário, transferência..."
                    className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none" />
                </div>
                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-700 rounded-lg text-slate-400 text-xs">Cancelar</button>
                  <button onClick={handleRegister} disabled={saving || !valor}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Confirmar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminCandidatosPage() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Candidato | null>(null)
  const [viewingPagamentos, setViewingPagamentos] = useState<Candidato | null>(null)

  useEffect(() => {
    fetch('/api/candidato/admin/lista')
      .then(r => r.json())
      .then(d => setCandidatos(d.candidatos || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = candidatos.filter(c =>
    c.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: candidatos.length,
    confirmados: candidatos.filter(c => c.inscricao?.status_inscricao === 'CONFIRMADO').length,
    pendentes: candidatos.filter(c => c.inscricao?.status_inscricao === 'PENDENTE' || c.inscricao?.status_inscricao === 'EM_ANALISE').length,
    semInscricao: candidatos.filter(c => !c.inscricao).length,
  }

  const handleSave = async (data: any) => {
    const res = await fetch('/api/candidato/admin/inscricao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Erro ao salvar')
    if (result.inscricao) {
      setCandidatos(prev => prev.map(c => {
        if (data.inscricao_id && c.inscricao?.id === data.inscricao_id) return { ...c, inscricao: result.inscricao }
        if (!data.inscricao_id && c.id === data.stakeholder_id) return { ...c, inscricao: result.inscricao }
        return c
      }))
      setEditing(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Gerenciar Candidatos</h1>
        <p className="text-slate-400 mt-1">Programa de Formação de Faixas Pretas — Liga Riograndense de Judô</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Confirmados', value: stats.confirmados, color: 'text-green-400' },
          { label: 'Em Análise', value: stats.pendentes, color: 'text-yellow-400' },
          { label: 'Sem Inscrição', value: stats.semInscricao, color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full bg-[#111827] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-px">
          <div className="col-span-5 grid grid-cols-[1fr_auto_auto_auto_auto] bg-[#0d1420] px-5 py-3">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Candidato</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-32">Faixa Atual</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-36">Objetivo</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-32">Status</span>
            <span className="w-24" />
          </div>

          {filtered.length === 0 ? (
            <div className="col-span-5 py-12 text-center text-slate-500 text-sm">
              {search ? 'Nenhum candidato encontrado.' : 'Nenhum candidato cadastrado.'}
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="col-span-5 grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-4 border-t border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{c.nome_completo}</p>
                  <p className="text-slate-500 text-xs truncate">{c.email}</p>
                </div>
                <div className="text-center w-32">
                  <p className="text-slate-300 text-xs">{c.kyu_dan?.cor_faixa || '—'}</p>
                </div>
                <div className="text-center w-36">
                  <p className="text-slate-300 text-xs">{c.inscricao?.graduacao_pretendida || '—'}</p>
                </div>
                <div className="flex flex-col items-center gap-1 w-32">
                  {c.inscricao ? (
                    <>
                      <StatusBadge value={c.inscricao.status_inscricao} />
                      <StatusBadge value={c.inscricao.status_pagamento} />
                    </>
                  ) : (
                    <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">sem inscrição</span>
                  )}
                </div>
                <div className="w-24 flex justify-end gap-1.5">
                  <button
                    onClick={() => setViewingPagamentos(c)}
                    className="text-xs text-green-400 hover:text-green-300 font-semibold px-2 py-1.5 rounded-lg bg-green-600/10 hover:bg-green-600/20 transition-colors"
                    title="Pagamentos"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditing(c)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editing && (
        <EditModal
          candidato={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {viewingPagamentos && (
        <PagamentosModal
          candidato={viewingPagamentos}
          onClose={() => setViewingPagamentos(null)}
        />
      )}
    </div>
  )
}
