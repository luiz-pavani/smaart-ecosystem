'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Athlete {
  nome: string
  academia: string | null
  logo_url: string | null
}

interface Match {
  id: string
  match_number: number
  status: string
  tipo: string
  hora_estimada: string | null
  category_nome: string | null
  athlete1: Athlete | null
  athlete2: Athlete | null
}

interface Area {
  area_id: number
  current: Match | null
  upcoming: Match[]
}

interface Data {
  evento: { id: string; nome: string; status: string }
  areas: Area[]
}

/**
 * TV display do cronograma. Layout em grid de colunas por tatame, com a luta
 * atual destacada e próximas 5 listadas abaixo. Auto-refresh a cada 10s +
 * Realtime subscription para mudanças mais imediatas em event_matches.
 *
 * Fullscreen pelo navegador (F11). Sem chrome — só o conteúdo.
 */
export default function CronogramaTvPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastRefreshRef = useRef<number>(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${id}/schedule/public`)
      if (!res.ok) {
        setError('Cronograma não disponível')
        return
      }
      const json = await res.json()
      setData(json)
      lastRefreshRef.current = Date.now()
    } catch {
      setError('Erro de rede')
    }
  }, [id])

  // Polling de 10s
  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [load])

  // Realtime — escuta updates em event_matches do evento (debounced reload)
  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    let debounce: ReturnType<typeof setTimeout> | null = null
    const channel = supabase
      .channel(`tv-cronograma-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_matches' },
        () => {
          if (debounce) clearTimeout(debounce)
          debounce = setTimeout(load, 1000)
        }
      )
      .subscribe()
    return () => {
      if (debounce) clearTimeout(debounce)
      supabase.removeChannel(channel)
    }
  }, [id, load])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-300 text-3xl">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60 text-3xl">
        Carregando cronograma…
      </div>
    )
  }

  const numAreas = data.areas.length
  const gridCols = numAreas <= 2 ? 'grid-cols-2' : numAreas <= 3 ? 'grid-cols-3' : numAreas <= 4 ? 'grid-cols-4' : 'grid-cols-5'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header — fino, só nome do evento + hora */}
      <div className="px-8 py-4 bg-gradient-to-r from-cyan-900/40 via-slate-900 to-purple-900/40 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">{data.evento.nome}</h1>
          <p className="text-sm text-cyan-300/70 mt-0.5">Cronograma em tempo real</p>
        </div>
        <Clock />
      </div>

      {/* Grid de tatames */}
      <div className={`flex-1 grid ${gridCols} gap-2 p-2 overflow-hidden`}>
        {data.areas.map(area => (
          <AreaColumn key={area.area_id} area={area} />
        ))}
      </div>
    </div>
  )
}

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="font-mono text-3xl font-bold text-cyan-300">
      {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  )
}

function AreaColumn({ area }: { area: Area }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      {/* Área header */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white text-center py-2 rounded-lg flex-shrink-0">
        <div className="text-xs uppercase tracking-widest opacity-80">Tatame</div>
        <div className="text-4xl font-black leading-none">{area.area_id}</div>
      </div>

      {/* Current match — destaque grande */}
      {area.current ? (
        <CurrentMatchCard match={area.current} />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-white/30 flex-shrink-0">
          <div className="text-sm uppercase tracking-wider mb-1">Aguardando</div>
          <div className="text-3xl">—</div>
        </div>
      )}

      {/* Upcoming */}
      <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
        <div className="text-[10px] uppercase tracking-widest text-white/40 px-2 py-1 flex-shrink-0">
          Próximas lutas
        </div>
        <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
          {area.upcoming.length === 0 ? (
            <div className="text-white/20 text-sm text-center py-4">—</div>
          ) : (
            area.upcoming.map(m => <UpcomingMatchCard key={m.id} match={m} />)
          )}
        </div>
      </div>
    </div>
  )
}

function CurrentMatchCard({ match }: { match: Match }) {
  return (
    <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-700/20 border-2 border-cyan-400 rounded-xl p-4 flex-shrink-0 shadow-2xl shadow-cyan-500/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-cyan-300 font-mono text-xs font-bold">
          #{match.match_number}
        </span>
        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse">
          AO VIVO
        </span>
      </div>
      {match.category_nome && (
        <div className="text-cyan-200 text-xs mb-3 font-medium uppercase">
          {match.category_nome}
        </div>
      )}
      <AthleteRow a={match.athlete1} side="white" />
      <div className="text-center my-2 text-cyan-400/60 text-xs font-bold tracking-widest">VS</div>
      <AthleteRow a={match.athlete2} side="blue" />
    </div>
  )
}

function UpcomingMatchCard({ match }: { match: Match }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs flex-shrink-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-white/40 text-[10px]">#{match.match_number}</span>
        {match.category_nome && (
          <span className="text-white/60 truncate text-[10px]">{match.category_nome}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="flex-1 truncate text-white/90">{match.athlete1?.nome || 'TBD'}</span>
        <span className="text-white/30 text-[10px]">vs</span>
        <span className="flex-1 truncate text-right text-white/90">{match.athlete2?.nome || 'TBD'}</span>
      </div>
    </div>
  )
}

function AthleteRow({ a, side }: { a: Athlete | null; side: 'white' | 'blue' }) {
  if (!a) return <div className="text-white/30 text-xl">— vazio</div>
  const stripe = side === 'white' ? 'bg-white' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-3">
      <div className={`w-1.5 h-12 ${stripe} rounded`} />
      {a.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.logo_url} alt="" className="w-10 h-10 rounded-full object-cover bg-white/10 flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold leading-tight truncate">{a.nome}</div>
        {a.academia && (
          <div className="text-[11px] text-white/50 truncate">{a.academia}</div>
        )}
      </div>
    </div>
  )
}
