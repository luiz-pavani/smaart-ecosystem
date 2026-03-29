'use client'

import { useEffect, useState } from 'react'
import { Loader2, CalendarDays, MapPin, Clock } from 'lucide-react'

interface ScheduleEvent {
  id: string
  titulo: string
  descricao?: string
  data: string
  hora?: string
  local?: string
  tipo?: string
}

function groupByMonth(events: ScheduleEvent[]) {
  const groups: Record<string, ScheduleEvent[]> = {}
  events.forEach(ev => {
    const d = new Date(ev.data)
    const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  })
  return groups
}

function formatEventDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })
}

const TIPO_COLORS: Record<string, string> = {
  exame: 'bg-red-600/20 text-red-400 border-red-600/30',
  treino: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  seminario: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  reuniao: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  default: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
}

export default function CronogramaPage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/candidato/dados')
      .then(r => r.json())
      .then(d => setEvents(d.federation_schedule || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  const grouped = groupByMonth(events)
  const months = Object.keys(grouped)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Cronograma Oficial</h1>
        <p className="text-slate-400 mt-1">Liga Riograndense de Judô — Programa de Faixas Pretas</p>
      </div>

      {months.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Nenhum evento cadastrado no momento.</p>
          <p className="text-slate-600 text-sm mt-1">O cronograma será atualizado em breve.</p>
        </div>
      ) : (
        months.map(month => (
          <div key={month}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase">{month}</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="space-y-3">
              {grouped[month].map(ev => {
                const tipoKey = ev.tipo?.toLowerCase() || 'default'
                const colorClass = TIPO_COLORS[tipoKey] || TIPO_COLORS.default
                return (
                  <div
                    key={ev.id}
                    className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex gap-5"
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <p className="text-2xl font-black text-white leading-none">
                        {new Date(ev.data).getDate().toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-slate-500 uppercase mt-0.5">
                        {new Date(ev.data).toLocaleDateString('pt-BR', { month: 'short' })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-white font-bold text-base">{ev.titulo}</h3>
                          {ev.descricao && (
                            <p className="text-slate-400 text-sm mt-1">{ev.descricao}</p>
                          )}
                        </div>
                        {ev.tipo && (
                          <span className={`text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${colorClass} flex-shrink-0`}>
                            {ev.tipo}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3">
                        {ev.hora && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            {ev.hora}
                          </div>
                        )}
                        {ev.local && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            {ev.local}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
