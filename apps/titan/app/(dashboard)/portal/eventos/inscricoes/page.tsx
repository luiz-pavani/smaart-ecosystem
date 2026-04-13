'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Download, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Inscricao {
  id: string
  atleta_nome: string
  status: string
  registration_date: string
  event: { id: string; nome: string; data_evento: string } | null
}

export default function InscricoesEventosPage() {
  const router = useRouter()
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/eventos/inscricoes')
      .then(r => r.json())
      .then(j => setInscricoes(j.inscricoes || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = inscricoes.filter(i =>
    i.atleta_nome.toLowerCase().includes(search.toLowerCase()) ||
    (i.event?.nome || '').toLowerCase().includes(search.toLowerCase())
  )

  function downloadCSV() {
    const rows = [
      ['Evento', 'Atleta', 'Data Inscrição', 'Status'],
      ...filtered.map(i => [
        i.event?.nome || '—', i.atleta_nome,
        i.registration_date ? new Date(i.registration_date).toLocaleDateString('pt-BR') : '—',
        i.status || '—',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'inscricoes_eventos.csv'; a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Inscrições</h1>
          <p className="text-gray-400 mt-1">{loading ? '...' : `${inscricoes.length} inscrições no total`}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar por atleta ou evento..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <button onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all">
            <Download className="w-4 h-4" />CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-gray-400">
            {search ? 'Nenhum resultado para a busca' : 'Nenhuma inscrição encontrada'}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Evento</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Atleta</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Data</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300">{i.event?.nome || '—'}</td>
                    <td className="px-6 py-4 text-gray-300">{i.atleta_nome}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {i.registration_date ? new Date(i.registration_date).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        ['confirmed','Confirmado'].includes(i.status) ? 'bg-green-500/20 text-green-400'
                        : ['cancelled','Cancelado'].includes(i.status) ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                      }`}>{i.status || 'Pendente'}</span>
                    </td>
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
