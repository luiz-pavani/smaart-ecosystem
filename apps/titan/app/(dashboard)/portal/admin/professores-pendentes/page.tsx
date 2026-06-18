'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, GraduationCap, Loader2, Check, X, RefreshCw,
  Mail, Phone, IdCard, Building2,
} from 'lucide-react'

interface Pendente {
  id: string
  nome_completo: string
  email: string
  telefone: string | null
  cpf: string | null
  academia_id: string | null
  approval_status: string
  approval_requested_at: string | null
}

export default function ProfessoresPendentesPage() {
  const router = useRouter()
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [academias, setAcademias] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/academias/aprovar-professor')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await res.json()
    setPendentes(data.pendentes || [])

    // Hidrata nomes das academias
    const ids = (data.pendentes || []).map((p: Pendente) => p.academia_id).filter(Boolean)
    if (ids.length > 0) {
      const { data: acads } = await sb.from('academias').select('id, nome').in('id', ids)
      const map: Record<string, string> = {}
      for (const a of acads || []) map[a.id] = a.nome
      setAcademias(map)
    }
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  const act = async (stakeholderId: string, action: 'aprovar' | 'rejeitar') => {
    setActingId(stakeholderId)
    const res = await fetch('/api/academias/aprovar-professor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stakeholder_id: stakeholderId, action }),
    })
    const data = await res.json()
    setActingId(null)
    if (!res.ok) {
      setFlash({ ok: false, msg: data.error || 'Erro' })
    } else {
      setFlash({ ok: true, msg: action === 'aprovar' ? '✓ Professor aprovado' : 'Cadastro rejeitado' })
      load()
    }
    setTimeout(() => setFlash(null), 4000)
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-300 text-lg font-bold mb-1">Sem permissão</div>
          <p className="text-slate-400 text-sm">Apenas master, federação ou admin de academia podem aprovar professores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-cyan-400" />
            Aprovações pendentes
          </h1>
          <button onClick={load} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {flash && (
          <div className={`mb-4 px-4 py-2 rounded-lg border text-sm ${
            flash.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>{flash.msg}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
        ) : pendentes.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">Nenhuma aprovação pendente</p>
            <p className="text-slate-500 text-xs mt-1">Cadastros novos aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendentes.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-white">{p.nome_completo}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>
                      {p.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.telefone}</span>}
                      {p.cpf && <span className="flex items-center gap-1 font-mono"><IdCard className="w-3 h-3" /> {p.cpf}</span>}
                    </div>
                    {p.academia_id && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-300 font-medium">{academias[p.academia_id] || p.academia_id}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.approval_status === 'pendente_academia'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {p.approval_status === 'pendente_academia' ? 'Pendente academia' : 'Pendente federação'}
                    </span>
                    {p.approval_requested_at && (
                      <span className="text-xs text-slate-500">
                        {new Date(p.approval_requested_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => act(p.id, 'rejeitar')}
                    disabled={actingId === p.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                  <button
                    onClick={() => act(p.id, 'aprovar')}
                    disabled={actingId === p.id}
                    className="flex items-center gap-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                  >
                    {actingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-xs text-slate-500 text-center">
          <strong>Escopo:</strong> master vê todas · federação vê da federação · academia vê da própria academia
        </div>
      </div>
    </div>
  )
}
