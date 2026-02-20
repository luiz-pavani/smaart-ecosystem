'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Calendar } from 'lucide-react'

export default function EventosAcademiaPage() {
  const router = useRouter()

  const eventos = [
    { id: 1, nome: 'Torneio Interno', data: '10 de Março', inscritos: 24, status: 'Planejamento' },
    { id: 2, nome: 'Campeonato Municipal', data: '15 de Abril', inscritos: 15, status: 'Inscrições' },
    { id: 3, nome: 'Treinamento Avançado', data: '20 de Março', inscritos: 8, status: 'Confirmado' },
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
          <h1 className="text-3xl font-bold text-white">Eventos</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Add Button */}
        <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-lg transition-all mb-8">
          <Plus className="w-5 h-5" />
          Novo Evento
        </button>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map(evento => (
            <div key={evento.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-pink-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{evento.nome}</h3>
                <span className="px-2 py-1 bg-pink-500/20 border border-pink-500/50 rounded text-pink-300 text-xs font-semibold">
                  {evento.status}
                </span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  {evento.data}
                </div>
                <div className="text-gray-400">
                  <span className="font-semibold text-white">{evento.inscritos}</span> inscritos
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all">
                Ver Detalhes
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
