'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Loader2, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface Evento {
  id: string
  nome: string
  data_evento: string
  local: string | null
  descricao: string | null
  status: string | null
  inscritos_academia: number
}

const STATUS_COLORS: Record<string, string> = {
  'Planejamento':       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Inscrições abertas': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Inscrições':         'bg-green-500/20 text-green-300 border-green-500/30',
  'Em andamento':       'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Encerrado':          'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export default function EventosAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [upcoming, setUpcoming] = useState<Evento[]>([])
  const [past, setPast] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const academiaId = getSelectedAcademiaId()
      const today = new Date().toISOString().split('T')[0]

      // Fetch all events
      const { data: eventos } = await supabase
        .from('eventos')
        .select('id, nome, data_evento, local, descricao, status')
        .order('data_evento', { ascending: true })

      if (!eventos?.length) {
        setUpcoming([])
        setPast([])
        setLoading(false)
        return
      }

      // Fetch athlete IDs for this academy
      let atletaIds: string[] = []
      if (academiaId) {
        const { data: ats } = await supabase
          .from('user_fed_lrsj')
          .select('stakeholder_id')
          .eq('academia_id', academiaId)
          .eq('federacao_id', 1)
        atletaIds = (ats || []).map((a: any) => a.stakeholder_id).filter(Boolean)
      }

      // Fetch all registrations for events
      const eventoIds = eventos.map((e: any) => e.id)
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('atleta_id, event_id')
        .in('event_id', eventoIds)
        .in('atleta_id', atletaIds.length ? atletaIds : ['__none__'])

      const regCount: Record<string, number> = {}
      for (const r of registrations || []) {
        if (r.event_id) regCount[r.event_id] = (regCount[r.event_id] || 0) + 1
      }

      const enriched: Evento[] = eventos.map((e: any) => ({
        ...e,
        inscritos_academia: regCount[e.id] || 0,
      }))

      setUpcoming(enriched.filter(e => e.data_evento >= today))
      setPast(enriched.filter(e => e.data_evento < today).reverse())
    } finally {
      setLoading(false)
    }
  }

  const list = tab === 'upcoming' ? upcoming : past

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Eventos</h1>
              <p className="text-gray-400 mt-1">Competições e eventos da federação</p>
            </div>
            <button
              onClick={() => window.open('https://sul.smoothcomp.com/pt_BR/federation/130/events/upcoming', '_blank', 'noopener')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-sm font-medium rounded-lg border border-white/10 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Smoothcomp
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-8 w-fit">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'upcoming' ? 'Próximos' : 'Anteriores'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {tab === 'upcoming' ? 'Nenhum evento próximo' : 'Nenhum evento anterior'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map(evento => {
              const statusClass = STATUS_COLORS[evento.status || ''] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              const dataFormatada = new Date(evento.data_evento + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })
              return (
                <div
                  key={evento.id}
                  className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 hover:border-pink-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-pink-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Trophy className="w-4 h-4 text-pink-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white leading-tight">{evento.nome}</h3>
                    </div>
                    {evento.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusClass}`}>
                        {evento.status}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{dataFormatada}</span>
                    </div>
                    {evento.local && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">{evento.local}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4 shrink-0" />
                      <span>
                        <span className="text-white font-medium">{evento.inscritos_academia}</span>
                        {' '}atleta{evento.inscritos_academia !== 1 ? 's' : ''} da academia
                      </span>
                    </div>
                  </div>

                  {evento.descricao && (
                    <p className="mt-3 text-xs text-gray-500 line-clamp-2">{evento.descricao}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
