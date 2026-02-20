'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Users, Trophy } from 'lucide-react'
import { useState } from 'react'

export default function EventosAtletaPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('upcoming')

  const upcomingEvents = [
    {
      id: 1,
      title: 'Campeonato Estadual',
      date: '25 de Fevereiro',
      location: 'São Paulo, SP',
      status: 'Inscrito'
    },
    {
      id: 2,
      title: 'Torneio Interno da Academia',
      date: '10 de Março',
      location: 'Academia Master',
      status: 'Confirmado'
    },
    {
      id: 3,
      title: 'Open Judo Brasil',
      date: '15 de Abril',
      location: 'Rio de Janeiro, RJ',
      status: 'Interessado'
    },
  ]

  const pastEvents = [
    {
      id: 1,
      title: 'Campeonato Municipal Winter',
      date: '10 de Fevereiro',
      location: 'São Paulo, SP',
      result: '1º lugar'
    },
    {
      id: 2,
      title: 'Torneio Amistoso',
      date: '03 de Fevereiro',
      location: 'Academia Master',
      result: '3º lugar'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
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
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-4 font-semibold transition-colors ${
              activeTab === 'upcoming'
                ? 'text-white border-b-2 border-pink-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Próximos Eventos
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-4 font-semibold transition-colors ${
              activeTab === 'past'
                ? 'text-white border-b-2 border-pink-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Eventos Passados
          </button>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {activeTab === 'upcoming' && upcomingEvents.map(event => (
            <div key={event.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-pink-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full text-pink-300 text-xs font-semibold">
                  {event.status}
                </span>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-sm font-semibold rounded-lg transition-all">
                Ver Detalhes
              </button>
            </div>
          ))}

          {activeTab === 'past' && pastEvents.map(event => (
            <div key={event.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-yellow-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">{event.result}</span>
                </div>
              </div>
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all">
                Ver Certificado
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
