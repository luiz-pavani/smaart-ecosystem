'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Plus, Loader2, X, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Resultado { id: string; evento_id: string; evento_nome: string; categoria: string; colocacao: number; atleta_nome: string }
interface Evento { id: string; nome: string }

export default function ResultadosEventosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ evento_id: '', categoria: '', colocacao: '1', atleta_nome: '', observacoes: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [resRes, evRes] = await Promise.all([
        supabase.from('event_results').select('id, evento_id, categoria, colocacao, atleta_nome').order('colocacao'),
        supabase.from('eventos').select('id, nome').order('data_evento', { ascending: false }).limit(50),
      ])
      const eventoMap = new Map((evRes.data || []).map((e: any) => [e.id, e.nome]))
      setResultados((resRes.data || []).map((r: any) => ({ ...r, evento_nome: eventoMap.get(r.evento_id) || '—' })))
      setEventos(evRes.data || [])
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!form.evento_id || !form.atleta_nome || !form.categoria) { setError('Evento, atleta e categoria são obrigatórios'); return }
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase.from('event_results').insert({
        evento_id: form.evento_id, categoria: form.categoria,
        colocacao: parseInt(form.colocacao), atleta_nome: form.atleta_nome,
        observacoes: form.observacoes || null,
      })
      if (err) throw new Error(err.message)
      setShowForm(false)
      setForm({ evento_id: '', categoria: '', colocacao: '1', atleta_nome: '', observacoes: '' })
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const ic = "w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Resultados</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold rounded-lg transition-all mb-6">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Inserir Resultado'}
        </button>

        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">Novo Resultado</h3>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Evento *</label>
                <select value={form.evento_id} onChange={e => setForm(f => ({ ...f, evento_id: e.target.value }))} className={ic}>
                  <option value="">Selecione...</option>
                  {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Categoria *</label>
                <input type="text" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  placeholder="Ex: Juvenil Masculino" className={ic} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Atleta *</label>
                <input type="text" value={form.atleta_nome} onChange={e => setForm(f => ({ ...f, atleta_nome: e.target.value }))}
                  placeholder="Nome do atleta" className={ic} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Colocação</label>
                <select value={form.colocacao} onChange={e => setForm(f => ({ ...f, colocacao: e.target.value }))} className={ic}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}º lugar</option>)}
                </select>
              </div>
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Salvar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : resultados.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-gray-400">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            Nenhum resultado cadastrado ainda
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Evento</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Categoria</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-white">Colocação</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Atleta</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300">{r.evento_nome}</td>
                    <td className="px-6 py-4 text-gray-400">{r.categoria}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className={`w-4 h-4 ${r.colocacao===1?'text-yellow-400':r.colocacao===2?'text-gray-400':r.colocacao===3?'text-orange-600':'text-gray-600'}`} />
                        <span className="font-semibold text-white">{r.colocacao}º</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{r.atleta_nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
