'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function NovoEventoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '', data_evento: '', cidade: '', local: '',
    categoria: '', limite_inscritos: '', taxa_inscricao: '',
    descricao: '', status: 'Planejamento',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.data_evento) { setError('Nome e data são obrigatórios'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao criar evento')
      router.push('/portal/eventos')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const ic = "w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Criar Novo Evento</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-8">
          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave() }}>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Nome do Evento *</label>
              <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Campeonato Estadual 2026" className={ic} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Data do Evento *</label>
                <input type="date" name="data_evento" value={formData.data_evento} onChange={handleChange} className={ic} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={ic}>
                  <option value="Planejamento">Planejamento</option>
                  <option value="Inscrições abertas">Inscrições abertas</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Encerrado">Encerrado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Cidade</label>
                <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} placeholder="Porto Alegre" className={ic} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Local</label>
                <input type="text" name="local" value={formData.local} onChange={handleChange} placeholder="Ginásio de Esportes" className={ic} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Categoria</label>
                <select name="categoria" value={formData.categoria} onChange={handleChange} className={ic}>
                  <option value="">Todas</option>
                  <option value="infantil">Infantil</option>
                  <option value="juvenil">Juvenil</option>
                  <option value="adulto">Adulto</option>
                  <option value="master">Master</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Limite de Inscritos</label>
                <input type="number" name="limite_inscritos" value={formData.limite_inscritos} onChange={handleChange} placeholder="100" className={ic} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Taxa (R$)</label>
                <input type="number" name="taxa_inscricao" value={formData.taxa_inscricao} onChange={handleChange} placeholder="50.00" step="0.01" className={ic} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Descrição</label>
              <textarea name="descricao" value={formData.descricao} onChange={handleChange}
                placeholder="Descreva o evento, regras especiais, etc..." rows={4} className={`${ic} resize-none`} />
            </div>
            <div className="flex gap-3 pt-6 border-t border-white/10">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Criando...' : 'Criar Evento'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold rounded-lg transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
