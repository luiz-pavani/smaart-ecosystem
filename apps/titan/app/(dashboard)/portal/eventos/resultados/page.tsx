'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Plus } from 'lucide-react'
import { useState } from 'react'

export default function ResultadosEventosPage() {
  const router = useRouter()

  const resultados = [
    { id: 1, evento: 'Campeonato Estadual', categoria: 'Infantil', lugar: '1º', atleta: 'João Silva' },
    { id: 2, evento: 'Campeonato Estadual', categoria: 'Infantil', lugar: '2º', atleta: 'Lucas Mendes' },
    { id: 3, evento: 'Campeonato Estadual', categoria: 'Infantil', lugar: '3º', atleta: 'Pedro Costa' },
    { id: 4, evento: 'Campeonato Municipal', categoria: 'Juvenil', lugar: '1º', atleta: 'Ana Costa' },
    { id: 5, evento: 'Campeonato Municipal', categoria: 'Juvenil', lugar: '2º', atleta: 'Maria Santos' },
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
          <h1 className="text-3xl font-bold text-white">Resultados</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Add Button */}
        <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold rounded-lg transition-all mb-8">
          <Plus className="w-5 h-5" />
          Inserir Resultado
        </button>

        {/* Results Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Evento</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Categoria</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-white">Colocação</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Atleta</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((res) => (
                <tr key={res.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-300">{res.evento}</td>
                  <td className="px-6 py-4 text-gray-400">{res.categoria}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Trophy className={`w-4 h-4 ${
                        res.lugar === '1º' ? 'text-yellow-400' : 
                        res.lugar === '2º' ? 'text-gray-400' : 
                        'text-orange-600'
                      }`} />
                      <span className="font-semibold text-white">{res.lugar}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{res.atleta}</td>
                  <td className="px-6 py-4 text-green-400">
                    {res.lugar === '1º' && 'R$ 200'}
                    {res.lugar === '2º' && 'R$ 100'}
                    {res.lugar === '3º' && 'R$ 50'}
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
