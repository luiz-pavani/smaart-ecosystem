'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, Clock, Trophy, Filter, Search, Loader2 } from 'lucide-react'

interface Evento {
  id: string
  nome: string
  data_evento: string
  data_evento_fim: string | null
  hora_inicio: string | null
  local: string | null
  cidade: string | null
  status: string
  tipo_evento: string | null
  modalidade: string | null
  banner_url: string | null
  publicado: boolean
  valor_inscricao: number | null
  limite_inscritos: number | null
  num_areas: number | null
}

export default function EventosPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroTempo, setFiltroTempo] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ publicado: 'true' })
        if (filtroTempo === 'upcoming') params.set('upcoming', 'true')
        if (filtroTipo) params.set('tipo_evento', filtroTipo)

        const res = await fetch(`/api/eventos?${params}`)
        const json = await res.json()
        if (res.ok) setEventos(json.eventos || [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filtroTipo, filtroTempo])

  const filtrados = eventos.filter(e => {
    if (search) {
      const s = search.toLowerCase()
      return e.nome.toLowerCase().includes(s) || (e.cidade || '').toLowerCase().includes(s)
    }
    if (filtroTempo === 'past') {
      return new Date(e.data_evento) < new Date()
    }
    return true
  })

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const formatTime = (t: string | null) => t ? t.substring(0, 5) : null

  const statusColors: Record<string, string> = {
    'Planejamento': 'bg-yellow-500/20 text-yellow-300',
    'Inscrições abertas': 'bg-green-500/20 text-green-300',
    'Inscrições encerradas': 'bg-orange-500/20 text-orange-300',
    'Em andamento': 'bg-cyan-500/20 text-cyan-300',
    'Encerrado': 'bg-slate-500/20 text-slate-300',
    'Cancelado': 'bg-red-500/20 text-red-300',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Eventos</h1>
          </div>
          <p className="text-slate-400">Competicoes e campeonatos da federacao</p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar evento..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['upcoming', 'past', 'all'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFiltroTempo(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  filtroTempo === t
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {t === 'upcoming' ? 'Proximos' : t === 'past' ? 'Anteriores' : 'Todos'}
              </button>
            ))}
          </div>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos os tipos</option>
            <option value="Campeonato">Campeonato</option>
            <option value="Torneio">Torneio</option>
            <option value="Seminário">Seminario</option>
            <option value="Exame de Faixa">Exame de Faixa</option>
            <option value="Festival">Festival</option>
            <option value="Treino Coletivo">Treino Coletivo</option>
          </select>
        </div>
      </div>

      {/* Event List */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum evento encontrado</h3>
            <p className="text-slate-400">
              {search ? 'Tente outra busca.' : filtroTempo === 'upcoming' ? 'Nao ha eventos proximos no momento.' : 'Nenhum evento disponivel.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map(evento => (
              <button
                key={evento.id}
                onClick={() => router.push(`/portal/eventos/${evento.id}`)}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.08] hover:border-cyan-500/30 transition-all text-left group"
              >
                {/* Banner */}
                {evento.banner_url ? (
                  <div className="h-40 overflow-hidden">
                    <img src={evento.banner_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-cyan-500/30" />
                  </div>
                )}

                <div className="p-5">
                  {/* Status + Type */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[evento.status] || 'bg-slate-500/20 text-slate-300'}`}>
                      {evento.status}
                    </span>
                    {evento.tipo_evento && (
                      <span className="text-xs text-slate-500">{evento.tipo_evento}</span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {evento.nome}
                  </h3>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{formatDate(evento.data_evento)}{evento.data_evento_fim ? ` - ${formatDate(evento.data_evento_fim)}` : ''}</span>
                    </div>
                    {evento.hora_inicio && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{formatTime(evento.hora_inicio)}</span>
                      </div>
                    )}
                    {(evento.local || evento.cidade) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{[evento.local, evento.cidade].filter(Boolean).join(' - ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    {evento.valor_inscricao && evento.valor_inscricao > 0 ? (
                      <span className="text-green-400 font-bold text-sm">R$ {Number(evento.valor_inscricao).toFixed(2)}</span>
                    ) : (
                      <span className="text-green-400 text-sm font-medium">Gratuito</span>
                    )}
                    {evento.modalidade && (
                      <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">{evento.modalidade}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
