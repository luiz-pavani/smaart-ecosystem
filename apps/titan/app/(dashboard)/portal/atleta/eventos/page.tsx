'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Trophy, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RegistroEvento {
  id: string
  status: string
  registration_date: string
  event: {
    id: string
    nome: string
    data_evento: string
    local: string
  } | null
}

export default function EventosAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<RegistroEvento[]>([])
  const [pastEvents, setPastEvents] = useState<RegistroEvento[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: atleta } = await supabase
          .from('atletas')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (!atleta?.id) {
          setUpcomingEvents([])
          setPastEvents([])
          return
        }

        const { data } = await supabase
          .from('event_registrations')
          .select('id, status, registration_date, event:eventos(id, nome, data_evento, local)')
          .eq('atleta_id', atleta.id)
          .order('registration_date', { ascending: false })

        const now = new Date()
        const upcoming: RegistroEvento[] = []
        const past: RegistroEvento[] = []

        ;(data || []).forEach((item: any) => {
          const eventDate = item.event?.data_evento ? new Date(item.event.data_evento) : null
          if (eventDate && eventDate >= now) {
            upcoming.push(item)
          } else {
            past.push(item)
          }
        })

        setUpcomingEvents(upcoming)
        setPastEvents(past)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

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
            Proximos Eventos
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'upcoming' && (upcomingEvents.length ? upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-pink-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{event.event?.nome || 'Evento'}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {event.event?.data_evento ? new Date(event.event.data_evento).toLocaleDateString('pt-BR') : 'Data a definir'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {event.event?.local || 'Local a definir'}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full text-pink-300 text-xs font-semibold">
                    {event.status || 'INSCRITO'}
                  </span>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-sm font-semibold rounded-lg transition-all">
                  Ver Detalhes
                </button>
              </div>
            )) : (
              <div className="text-gray-400">Nenhum evento futuro encontrado.</div>
            ))}

            {activeTab === 'past' && (pastEvents.length ? pastEvents.map((event) => (
              <div key={event.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-yellow-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{event.event?.nome || 'Evento'}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {event.event?.data_evento ? new Date(event.event.data_evento).toLocaleDateString('pt-BR') : 'Data a definir'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {event.event?.local || 'Local a definir'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Concluido</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all">
                  Ver Certificado
                </button>
              </div>
            )) : (
              <div className="text-gray-400">Nenhum evento passado encontrado.</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
