'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Upload, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Documento {
  id: string; titulo: string; ano: number | null
  url: string | null; tipo: string | null; created_at: string
}

export default function RegulamentoFederacaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ titulo: '', url: '', tipo: 'PDF', ano: new Date().getFullYear().toString() })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('regulamentos')
        .select('id, titulo, ano, url, tipo, created_at')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
      setDocs(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!form.titulo) { setError('Título é obrigatório'); return }
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase.from('regulamentos').insert({
        titulo: form.titulo, url: form.url || null,
        tipo: form.tipo, ano: form.ano ? parseInt(form.ano) : null, ativo: true,
      })
      if (err) throw new Error(err.message)
      setShowForm(false)
      setForm({ titulo: '', url: '', tipo: 'PDF', ano: new Date().getFullYear().toString() })
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const ic = "w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Regulamentações</h1>
              <p className="text-gray-400 mt-1">Documentos oficiais da federação</p>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium rounded-lg border border-red-500/30 transition-all">
              <Upload className="w-4 h-4" />{showForm ? 'Cancelar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">Novo Documento</h3>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Regulamento Geral 2026" className={ic} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">URL do Documento</label>
                <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..." className={ic} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={ic}>
                  <option>PDF</option><option>DOCX</option><option>Link</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ano</label>
                <input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} className={ic} />
              </div>
            </div>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}Salvar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : docs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-gray-400">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p>Nenhum documento cadastrado</p>
            <p className="text-sm text-gray-500 mt-1">Clique em "Adicionar" para inserir regulamentos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.id} className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-red-500/30 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{doc.titulo}</h3>
                    <p className="text-gray-400 text-sm">{doc.tipo}{doc.ano ? ` · ${doc.ano}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs font-semibold">Ativo</span>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-3">Informações Importantes</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2"><span className="text-blue-400 shrink-0">•</span>Todos os atletas devem estar familiarizados com o Código de Conduta</li>
            <li className="flex gap-2"><span className="text-blue-400 shrink-0">•</span>As normas de segurança são obrigatórias em todos os eventos</li>
            <li className="flex gap-2"><span className="text-blue-400 shrink-0">•</span>Dúvidas? Contate a administração da federação</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
