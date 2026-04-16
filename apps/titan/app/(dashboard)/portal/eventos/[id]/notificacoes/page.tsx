'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Send, Bell, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react'

interface Category {
  id: string
  nome_display: string
}

interface Notification {
  id: string
  tipo: string
  canal: string
  telefone: string | null
  mensagem: string
  status: string
  erro: string | null
  created_at: string
}

const TIPOS = [
  { value: 'lembrete_pre_evento', label: 'Lembrete pré-evento' },
  { value: 'chamada_luta', label: 'Chamada para luta' },
  { value: 'mudanca_area', label: 'Mudança de área/tatame' },
  { value: 'aviso_geral', label: 'Aviso geral' },
  { value: 'resultado', label: 'Resultado' },
]

export default function NotificacoesPage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [numAreas, setNumAreas] = useState(1)

  // Form
  const [tipo, setTipo] = useState('aviso_geral')
  const [mensagem, setMensagem] = useState('')
  const [targetMode, setTargetMode] = useState<'todos' | 'categoria' | 'area'>('todos')
  const [categoryId, setCategoryId] = useState('')
  const [areaId, setAreaId] = useState(1)

  // Result
  const [result, setResult] = useState<{ total: number; sent: number; skipped: number; failed: number } | null>(null)

  const load = useCallback(async () => {
    const [catRes, notRes, evtRes] = await Promise.all([
      fetch(`/api/eventos/${eventoId}/categories`).then(r => r.json()),
      fetch(`/api/eventos/${eventoId}/notifications`).then(r => r.json()),
      fetch(`/api/eventos/${eventoId}`).then(r => r.json()).catch(() => null),
    ])
    setCategories((catRes.categories || []).map((c: any) => ({ id: c.id, nome_display: c.nome_display })))
    setNotifications(notRes.notifications || [])
    setNumAreas(evtRes?.evento?.num_areas || 1)
    setLoading(false)
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const handleSend = async () => {
    if (!mensagem.trim()) return
    setSending(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = { tipo, mensagem }
      if (targetMode === 'categoria' && categoryId) body.category_id = categoryId
      if (targetMode === 'area') body.area_id = areaId

      const res = await fetch(`/api/eventos/${eventoId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setResult(json)
        setMensagem('')
        load() // refresh history
      } else {
        alert(json.error || 'Erro ao enviar')
      }
    } finally { setSending(false) }
  }

  const statusIcon = (s: string) => {
    if (s === 'sent') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />
    if (s === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />
    if (s === 'skipped') return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
    return <Bell className="w-3.5 h-3.5 text-slate-400" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-green-400" />Notificações WhatsApp
          </h1>
          <p className="text-slate-400 text-sm mt-1">Envie mensagens para atletas inscritos via WhatsApp</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send form */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-green-400" /> Nova Notificação</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Destinatários</label>
                  <div className="flex gap-2">
                    {(['todos', 'categoria', 'area'] as const).map(m => (
                      <button key={m} onClick={() => setTargetMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${targetMode === m ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                        {m === 'todos' ? 'Todos' : m === 'categoria' ? 'Categoria' : 'Tatame'}
                      </button>
                    ))}
                  </div>
                </div>

                {targetMode === 'categoria' && (
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Selecionar categoria...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nome_display}</option>)}
                  </select>
                )}

                {targetMode === 'area' && (
                  <select value={areaId} onChange={e => setAreaId(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {Array.from({ length: numAreas }, (_, i) => i + 1).map(a => (
                      <option key={a} value={a}>Tatame {a}</option>
                    ))}
                  </select>
                )}

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Mensagem <span className="text-slate-600">(use {'{{nome}}'} para personalizar)</span></label>
                  <textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    rows={4}
                    placeholder="Ex: Olá {{nome}}! Sua luta será no Tatame 2 em aproximadamente 15 minutos."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-y placeholder-slate-600"
                  />
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending || !mensagem.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar via WhatsApp
                </button>

                {result && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                    <p className="text-green-300 font-medium">Enviado!</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {result.sent} enviados · {result.skipped} sem telefone · {result.failed} falhas · {result.total} total
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /> Histórico</h3>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Nenhuma notificação enviada</div>
              ) : (
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                      {statusIcon(n.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{n.mensagem}</p>
                        <p className="text-[10px] text-slate-500">
                          {n.tipo} · {n.telefone || 'sem tel'} · {new Date(n.created_at).toLocaleString('pt-BR')}
                        </p>
                        {n.erro && <p className="text-[10px] text-red-400">{n.erro}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
