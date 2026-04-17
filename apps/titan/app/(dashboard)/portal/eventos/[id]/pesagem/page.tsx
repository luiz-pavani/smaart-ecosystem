'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Search, Scale, Check, X, AlertTriangle, Zap } from 'lucide-react'

interface Pesagem {
  id: string
  peso_oficial: number
  dentro_limite: boolean
  status: string
  observacao: string | null
  pesado_em: string
}

interface Row {
  registration_id: string
  nome: string
  academia: string
  peso_inscricao: number | null
  categoria_id: string | null
  categoria_nome: string
  peso_min: number | null
  peso_max: number | null
  pesagem: Pesagem | null
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'acima' | 'abaixo'
}

interface Counts {
  total: number
  pendente: number
  aprovado: number
  rejeitado: number
  acima: number
  abaixo: number
}

interface PesagemConfig {
  acima_peso: string
  abaixo_peso: string
  tolerancia_g: number
}

export default function PesagemPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Counts>({ total: 0, pendente: 0, aprovado: 0, rejeitado: 0, acima: 0, abaixo: 0 })
  const [pesagemConfig, setPesagemConfig] = useState<PesagemConfig>({ acima_peso: 'desclassificar', abaixo_peso: 'ignorar', tolerancia_g: 0 })
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPeso, setEditPeso] = useState('')
  const [editObs, setEditObs] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmWo, setConfirmWo] = useState<Row | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL(`/api/eventos/${eventoId}/pesagem`, window.location.origin)
      if (q) url.searchParams.set('q', q)
      if (statusFilter) url.searchParams.set('status', statusFilter)
      const res = await fetch(url.toString())
      const json = await res.json()
      if (res.ok) {
        setRows(json.rows || [])
        setCounts(json.counts || { total: 0, pendente: 0, aprovado: 0, rejeitado: 0, acima: 0, abaixo: 0 })
        if (json.pesagem_config) setPesagemConfig(json.pesagem_config)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId, q, statusFilter])

  useEffect(() => { load() }, [load])

  const startEdit = (row: Row) => {
    setEditingId(row.registration_id)
    setEditPeso(row.pesagem?.peso_oficial?.toString() || row.peso_inscricao?.toString() || '')
    setEditObs(row.pesagem?.observacao || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPeso('')
    setEditObs('')
  }

  const save = async (row: Row) => {
    const peso = parseFloat(editPeso.replace(',', '.'))
    if (isNaN(peso) || peso <= 0) return
    setSending(true)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/pesagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: row.registration_id,
          peso_oficial: peso,
          observacao: editObs || null,
        }),
      })
      if (res.ok) {
        cancelEdit()
        await load()
      }
    } catch { /* silent */ } finally { setSending(false) }
  }

  const applyWo = async (row: Row) => {
    setSending(true)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/pesagem/apply-wo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: row.registration_id }),
      })
      if (res.ok) {
        setConfirmWo(null)
        await load()
      }
    } catch { /* silent */ } finally { setSending(false) }
  }

  const formatLimite = (min: number | null, max: number | null) => {
    if (max === null && min === null) return '—'
    if (max === null) return `+${min}kg`
    if (min === null) return `até ${max}kg`
    return `${min}–${max}kg`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold">Pesagem</h1>
          </div>
        </div>

        {/* Config info bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400">
          <span className="font-bold text-white">Regras:</span>
          <span>Acima do peso: <span className={pesagemConfig.acima_peso === 'desclassificar' ? 'text-red-400 font-bold' : pesagemConfig.acima_peso === 'registrar' ? 'text-yellow-400 font-bold' : 'text-slate-300'}>
            {pesagemConfig.acima_peso === 'desclassificar' ? 'Desclassifica' : pesagemConfig.acima_peso === 'registrar' ? 'Apenas registra' : 'Ignora'}
          </span></span>
          <span className="text-slate-600">|</span>
          <span>Abaixo do peso: <span className={pesagemConfig.abaixo_peso === 'desclassificar' ? 'text-red-400 font-bold' : pesagemConfig.abaixo_peso === 'registrar' ? 'text-yellow-400 font-bold' : 'text-slate-300'}>
            {pesagemConfig.abaixo_peso === 'desclassificar' ? 'Desclassifica' : pesagemConfig.abaixo_peso === 'registrar' ? 'Apenas registra' : 'Ignora'}
          </span></span>
          {pesagemConfig.tolerancia_g > 0 && (
            <>
              <span className="text-slate-600">|</span>
              <span>Tolerancia: <span className="text-cyan-400 font-bold">{pesagemConfig.tolerancia_g}g</span></span>
            </>
          )}
        </div>

        {/* Counters */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <button onClick={() => setStatusFilter('')}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === '' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total</div>
            <div className="text-2xl font-bold">{counts.total}</div>
          </button>
          <button onClick={() => setStatusFilter('pendente')}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'pendente' ? 'bg-slate-500/20 border-slate-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pendentes</div>
            <div className="text-2xl font-bold text-slate-300">{counts.pendente}</div>
          </button>
          <button onClick={() => setStatusFilter('aprovado')}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'aprovado' ? 'bg-green-500/20 border-green-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Aprovados</div>
            <div className="text-2xl font-bold text-green-400">{counts.aprovado}</div>
          </button>
          <button onClick={() => setStatusFilter('rejeitado')}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'rejeitado' ? 'bg-red-500/20 border-red-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Rejeitados</div>
            <div className="text-2xl font-bold text-red-400">{counts.rejeitado}</div>
          </button>
          <button onClick={() => setStatusFilter('acima')}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'acima' ? 'bg-orange-500/20 border-orange-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Acima</div>
            <div className="text-2xl font-bold text-orange-400">{counts.acima}</div>
          </button>
          <button onClick={() => setStatusFilter('abaixo')}
            className={`p-3 rounded-xl border text-left transition-all ${statusFilter === 'abaixo' ? 'bg-yellow-500/20 border-yellow-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Abaixo</div>
            <div className="text-2xl font-bold text-yellow-400">{counts.abaixo}</div>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, academia ou categoria..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500" />
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Nenhuma inscrição encontrada</div>
        ) : (
          <div className="space-y-2">
            {rows.map(row => {
              const isEditing = editingId === row.registration_id
              const statusBg = row.status === 'aprovado' ? 'border-green-500/30 bg-green-500/5'
                : row.status === 'rejeitado' ? 'border-red-500/30 bg-red-500/5'
                : row.status === 'acima' ? 'border-orange-500/30 bg-orange-500/5'
                : row.status === 'abaixo' ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-white/10 bg-white/5'
              return (
                <div key={row.registration_id} className={`rounded-xl border ${statusBg} p-4`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{row.nome}</div>
                      <div className="text-xs text-slate-400 truncate">{row.academia || '—'}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
                        <span className="text-cyan-400">{row.categoria_nome || 'sem categoria'}</span>
                        <span className="text-slate-500">Limite: <span className="text-slate-300">{formatLimite(row.peso_min, row.peso_max)}</span></span>
                        {row.peso_inscricao && (
                          <span className="text-slate-500">Inscrição: <span className="text-slate-300">{row.peso_inscricao}kg</span></span>
                        )}
                      </div>
                    </div>

                    {/* Status badge / peso */}
                    <div className="flex items-center gap-2">
                      {row.pesagem && !isEditing && (
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            row.status === 'aprovado' ? 'text-green-400' :
                            row.status === 'rejeitado' ? 'text-red-400' :
                            row.status === 'acima' ? 'text-orange-400' :
                            row.status === 'abaixo' ? 'text-yellow-400' : 'text-slate-400'
                          }`}>
                            {row.pesagem.peso_oficial}kg
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">
                            {row.status === 'aprovado' ? 'Aprovado' :
                             row.status === 'rejeitado' ? 'Rejeitado' :
                             row.status === 'acima' ? 'Acima (registrado)' :
                             row.status === 'abaixo' ? 'Abaixo (registrado)' : row.status}
                          </div>
                        </div>
                      )}
                      {row.status === 'pendente' && !isEditing && (
                        <div className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs font-bold uppercase">
                          Pendente
                        </div>
                      )}

                      {!isEditing && (
                        <button onClick={() => startEdit(row)}
                          className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-bold">
                          {row.pesagem ? 'Repesar' : 'Pesar'}
                        </button>
                      )}

                      {row.status === 'rejeitado' && !isEditing && (
                        <button onClick={() => setConfirmWo(row)}
                          className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" />W.O.
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit form */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Peso oficial (kg)</label>
                          <input type="number" step="0.01" value={editPeso} onChange={e => setEditPeso(e.target.value)}
                            autoFocus
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
                        </div>
                        <div className="flex-[2]">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Observação</label>
                          <input value={editObs} onChange={e => setEditObs(e.target.value)}
                            placeholder="opcional"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={cancelEdit} disabled={sending}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">
                          Cancelar
                        </button>
                        <button onClick={() => save(row)} disabled={sending || !editPeso}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm disabled:opacity-40 flex items-center gap-1">
                          <Check className="w-4 h-4" />Registrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm W.O. Modal */}
      {confirmWo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-white">Aplicar W.O. em cadeia</h3>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Isso vai marcar <span className="font-bold text-white">todas as lutas pendentes</span> de <span className="font-bold text-white">{confirmWo.nome}</span> como <span className="font-bold text-red-400">fusen-gachi</span>, dando vitória automática aos adversários.
            </p>
            <p className="text-xs text-slate-500 mb-5">
              Use quando o atleta não poderá lutar no evento por reprovação na pesagem. Esta ação não pode ser desfeita facilmente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmWo(null)} disabled={sending}
                className="flex-1 py-2.5 bg-white/5 text-slate-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => applyWo(confirmWo)} disabled={sending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm disabled:opacity-40 flex items-center justify-center gap-1">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirmar W.O.
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
