'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trophy, Users } from 'lucide-react'

export default function EventosFedaracaoPage() {
  const router = useRouter()

  const eventos = [
    { id: 1, nome: 'Campeonato Estadual', data: '25 de Fevereiro', inscritos: 120, status: 'Em andamento' },
    { id: 2, nome: 'Open Judo Brasil', data: '15 de Abril', inscritos: 85, status: 'Inscrições abertas' },
    { id: 3, nome: 'Campeonato Municipal', data: '10 de Março', inscritos: 45, status: 'Planejamento' },
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
          <h1 className="text-3xl font-bold text-white">Eventos & Competições</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Add Button */}
        <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold rounded-lg transition-all mb-8">
          <Plus className="w-5 h-5" />
          Novo Evento
        </button>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {eventos.map(evento => (
            <div key={evento.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-yellow-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{evento.nome}</h3>
                    <p className="text-gray-400 text-sm">{evento.data}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{evento.inscritos} inscritos</span>
                </div>
                <p className="text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    evento.status === 'Em andamento' 
                      ? 'bg-red-500/20 text-red-400'
                      : evento.status === 'Inscrições abertas'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {evento.status}
                  </span>
                </p>
              </div>

              <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all">
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
