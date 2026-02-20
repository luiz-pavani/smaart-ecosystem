'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Filter } from 'lucide-react'

export default function FrequenciaAcademiaPage() {
  const router = useRouter()

  const monthData = [
    { atleta: 'João Silva', presencas: 18, faltas: 2, percenutal: 90 },
    { atleta: 'Maria Santos', presencas: 16, faltas: 4, percenutal: 80 },
    { atleta: 'Ana Costa', presencas: 20, faltas: 0, percenutal: 100 },
    { atleta: 'Pedro Oliveira', presencas: 12, faltas: 8, percenutal: 60 },
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
          <h1 className="text-3xl font-bold text-white">Frequência</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="flex gap-3 mb-8">
          <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-green-500">
            <option>Fevereiro 2026</option>
            <option>Janeiro 2026</option>
            <option>Dezembro 2025</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all ml-auto">
            <Download className="w-4 h-4" />
            Relatório
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Atleta</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-white">Presenças</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-white">Faltas</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-white">Percentual</th>
              </tr>
            </thead>
            <tbody>
              {monthData.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-300">{row.atleta}</td>
                  <td className="px-6 py-4 text-center text-green-400 font-semibold">{row.presencas}</td>
                  <td className="px-6 py-4 text-center text-red-400 font-semibold">{row.faltas}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${row.percenutal >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                          style={{ width: `${row.percenutal}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-300 text-sm font-semibold">{row.percenutal}%</span>
                    </div>
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
