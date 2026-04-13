'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Trash2, Loader2, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comunicado {
  id: string; evento_id: string | null; evento_nome?: string
  titulo: string; mensagem: string; enviado: boolean; created_at: string
}
interface Evento { id: string; nome: string }

export default function ComunicadosEventosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ evento_id: '', titulo: '', mensagem: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [comRes, evRes] = await Promise.all([
        supabase.from('event_comunicados').select('id, evento_id, titulo, mensagem, enviado, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('eventos').select('id, nome').order('data_evento', { ascending: false }).limit(50),
      ])
      const eventoMap = new Map((evRes.data || []).map((e: any) => [e.id, e.nome]))
      setEventos(evRes.data || [])
      setComunicados((comRes.data || []).map((c: any) => ({ ...c, evento_nome: c.evento_id ? eventoMap.get(c.evento_id) : null })))
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    if (!form.titulo || !form.mensagem) { setError('Título e mensagem são obrigatórios'); return }
    setSending(true); setError(null)
    try {
      const { error: err } = await supabase.from('event_comunicados').insert({
        evento_id: form.evento_id || null, titulo: form.titulo,
        mensagem: form.mensagem, enviado: true,
      })
      if (err) throw new Error(err.message)
      setForm({ evento_id: '', titulo: '', mensagem: '' })
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    await supabase.from('event_comunicados').delete().eq('id', id)
    setComunicados(prev => prev.filter(c => c.id !== id))
  }

  const ic = "w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Comunicados</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-5">Novo Comunicado</h2>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Evento (opcional)</label>
              <select value={form.evento_id} onChange={e => setForm(f => ({ ...f, evento_id: e.target.value }))} className={ic}>
                <option value="">Todos os eventos / Geral</option>
                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Título *</label>
              <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Inscrições Abertas" className={ic} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Mensagem *</label>
              <textarea value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                placeholder="Digite a mensagem para os inscritos..." rows={4} className={`${ic} resize-none`} />
            </div>
            <button onClick={send} disabled={sending}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Salvando...' : 'Salvar Comunicado'}
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">Histórico</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : comunicados.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-gray-400">
            <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            Nenhum comunicado ainda
          </div>
        ) : (
          <div className="space-y-3">
            {comunicados.map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-blue-500/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white">{c.titulo}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        c.enviado ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}>{c.enviado ? 'Enviado' : 'Rascunho'}</span>
                    </div>
                    {c.evento_nome && <p className="text-gray-400 text-sm mb-1">{c.evento_nome}</p>}
                    <p className="text-gray-500 text-sm line-clamp-2">{c.mensagem}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => remove(c.id)}
                    className="ml-4 p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
