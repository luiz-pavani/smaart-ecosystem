'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BracketView from '@/components/eventos/BracketView'

interface Bracket {
  id: string
  tipo: string
  status: string
  num_rodadas: number
  area_id: number | null
  ordem_no_dia: number | null
  hora_estimada: string | null
  category: { id: string; nome_display: string; genero: string } | null
}

interface Data {
  evento: { id: string; nome: string }
  bracket: Bracket
  slots: unknown[]
  matches: unknown[]
}

/**
 * Bracket público em fullscreen pra TV.
 *
 * URL pública: /eventos/[id]/chaves/[bracketId]
 * Requer evento.publicado=true e bracket.status != 'draft'.
 *
 * Auto-refresh: Realtime em event_matches/event_brackets + fallback de 15s.
 * Header com nome do evento + categoria + tatame.
 */
export default function BracketTvPage() {
  const { id, bracketId } = useParams<{ id: string; bracketId: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${id}/brackets/${bracketId}/public`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Chave não disponível')
        return
      }
      setData(json)
      setError(null)
    } catch {
      setError('Erro de rede')
    }
  }, [id, bracketId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    if (!id || !bracketId) return
    const supabase = createClient()
    let debounce: ReturnType<typeof setTimeout> | null = null
    const channel = supabase
      .channel(`bracket-tv-${bracketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_matches', filter: `bracket_id=eq.${bracketId}` },
        () => {
          if (debounce) clearTimeout(debounce)
          debounce = setTimeout(load, 800)
        }
      )
      .subscribe()
    return () => {
      if (debounce) clearTimeout(debounce)
      supabase.removeChannel(channel)
    }
  }, [id, bracketId, load])

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-300 text-2xl">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60 text-2xl">
        Carregando chave…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header — fino, info da categoria */}
      <div className="px-8 py-3 bg-gradient-to-r from-cyan-900/40 via-slate-900 to-purple-900/40 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider">{data.evento.nome}</h1>
          <div className="text-sm text-cyan-200/70 mt-0.5 flex items-center gap-3">
            {data.bracket.category && (
              <span className="font-medium">{data.bracket.category.nome_display}</span>
            )}
            {data.bracket.area_id && (
              <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-200 text-xs font-bold">
                Tatame {data.bracket.area_id}
              </span>
            )}
            {data.bracket.hora_estimada && (
              <span className="text-cyan-200/60 text-xs">início estimado {data.bracket.hora_estimada.substring(0, 5)}</span>
            )}
          </div>
        </div>
        <BracketTvClock />
      </div>

      {/* Bracket fullscreen */}
      <div className="flex-1 overflow-auto p-6">
        <BracketView
          matches={data.matches as never[]}
          slots={data.slots as never[]}
          bracketType={data.bracket.tipo}
          numRodadas={data.bracket.num_rodadas}
          readOnly
        />
      </div>
    </div>
  )
}

function BracketTvClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="font-mono text-2xl font-bold text-cyan-300">
      {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}
