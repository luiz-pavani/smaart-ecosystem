'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Download } from 'lucide-react'
import { useState } from 'react'

export default function InscricoesEventosPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const inscricoes = [
    { id: 1, evento: 'Campeonato Estadual', atleta: 'João Silva', data: '20/02', status: 'Confirmado' },
    { id: 2, evento: 'Campeonato Estadual', atleta: 'Maria Santos', data: '20/02', status: 'Pendente' },
    { id: 3, evento: 'Open Judo Brasil', atleta: 'Ana Costa', data: '12/03', status: 'Confirmado' },
    { id: 4, evento: 'Campeonato Municipal', atleta: 'Pedro Oliveira', data: '08/03', status: 'Confirmado' },
    { id: 5, evento: 'Open Judo Brasil', atleta: 'Lucas Mendes', data: '13/03', status: 'Pendente' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Inscrições</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Toolbar */}
        <div className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar inscrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Evento</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Atleta</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Data Inscrição</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {inscricoes.map((insc) => (
                <tr key={insc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-300">{insc.evento}</td>
                  <td className="px-6 py-4 text-gray-300">{insc.atleta}</td>
                  <td className="px-6 py-4 text-gray-400">{insc.data}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      insc.status === 'Confirmado'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {insc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
