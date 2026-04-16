'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, FileText, Plus, Trash2, Save, Eye } from 'lucide-react'

interface Waiver {
  id: string
  titulo: string
  conteudo: string
  obrigatorio: boolean
  ordem: number
  ativo: boolean
}

export default function TermosPage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titulo: '', conteudo: '', obrigatorio: true })
  const [preview, setPreview] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/eventos/${eventoId}/waivers`)
    const json = await res.json()
    setWaivers(json.waivers || [])
    setLoading(false)
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.titulo || !form.conteudo) return
    setSaving(true)
    await fetch(`/api/eventos/${eventoId}/waivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ titulo: '', conteudo: '', obrigatorio: true })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const handleDelete = async (waiverId: string) => {
    if (!confirm('Excluir este termo?')) return
    await fetch(`/api/eventos/${eventoId}/waivers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiver_id: waiverId }),
    })
    load()
  }

  const handleToggle = async (waiver: Waiver) => {
    await fetch(`/api/eventos/${eventoId}/waivers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waiver_id: waiver.id, ativo: !waiver.ativo }),
    })
    load()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-purple-400" />Termos & Waivers
            </h1>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 border border-purple-500/30 text-sm transition-all">
              <Plus className="w-4 h-4" /> Novo Termo
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
        ) : (
          <>
            {/* Create form */}
            {showForm && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-bold text-white mb-3">Novo Termo</h3>
                <input
                  placeholder="Título do termo"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3"
                />
                <textarea
                  placeholder="Conteúdo do termo (texto completo que o atleta deve aceitar)..."
                  value={form.conteudo}
                  onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  rows={8}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3 resize-y"
                />
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={form.obrigatorio} onChange={e => setForm(f => ({ ...f, obrigatorio: e.target.checked }))} className="rounded" />
                    Obrigatório para inscrição
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                    {saving ? 'Salvando...' : 'Criar Termo'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg text-sm hover:bg-white/10 transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            {waivers.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum termo configurado</p>
                <p className="text-xs mt-1">Crie termos que os atletas devem aceitar na inscrição</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waivers.map(w => (
                  <div key={w.id} className={`bg-white/5 border rounded-xl p-4 ${w.ativo ? 'border-white/10' : 'border-red-500/20 opacity-60'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-white">{w.titulo}</h4>
                          {w.obrigatorio && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-[10px] font-bold">OBRIGATÓRIO</span>}
                          {!w.ativo && <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded text-[10px]">INATIVO</span>}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{w.conteudo}</p>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button onClick={() => setPreview(preview === w.id ? null : w.id)} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggle(w)} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(w.id)} className="p-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20 text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {preview === w.id && (
                      <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/5 text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {w.conteudo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
