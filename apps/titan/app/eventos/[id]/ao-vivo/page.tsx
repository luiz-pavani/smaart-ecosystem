'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Tv, Radio, Loader2, Maximize, Volume2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Stream {
  id: string
  area_id: number
  titulo: string
  tipo: string
  stream_url: string | null
  status: string
}

interface ScoreData {
  pontos_athlete1: { wazaari: number; shido: number }
  pontos_athlete2: { wazaari: number; shido: number }
  clock_seconds: number
  clock_running: boolean
  golden_score: boolean
  status: string
  osaekomi_athlete: number | null
  osaekomi_seconds: number
}

interface AreaMatch {
  id: string
  match_number: number
  categoria: string
  athlete1_nome: string
  athlete1_academia: string
  athlete2_nome: string
  athlete2_academia: string
}

interface AreaData {
  area_id: number
  active_match: {
    id: string
    match_number: number
    tipo: string
    athlete1: { dados_atleta: Record<string, unknown> } | null
    athlete2: { dados_atleta: Record<string, unknown> } | null
    bracket?: { category: { nome_display: string } | null }
  } | null
  score: ScoreData | null
  next_matches: AreaMatch[]
}

function extractYouTubeEmbedUrl(url: string): string {
  // Handle various YouTube URL formats
  const patterns = [
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/live\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const match = url.match(p)
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`
  }
  // Already an embed URL or unknown format
  if (url.includes('/embed/')) return url + (url.includes('?') ? '&' : '?') + 'autoplay=1&mute=1'
  return url
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ScoreOverlay({ area, score }: { area: AreaData; score: ScoreData }) {
  const m = area.active_match
  if (!m) return null

  const a1 = m.athlete1?.dados_atleta || {}
  const a2 = m.athlete2?.dados_atleta || {}
  const nome1 = (a1.nome_completo as string) || (a1.nome as string) || 'Atleta 1'
  const nome2 = (a2.nome_completo as string) || (a2.nome as string) || 'Atleta 2'
  const acad1 = (a1.academia as string) || ''
  const acad2 = (a2.academia as string) || ''
  const cat = m.bracket?.category?.nome_display || ''

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pointer-events-none">
      {/* Category */}
      <div className="text-center mb-1">
        <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider">{cat}</span>
      </div>

      {/* Score board */}
      <div className="flex items-center justify-center gap-2">
        {/* Athlete 1 (white) */}
        <div className="flex-1 text-right">
          <div className="text-sm font-bold text-white truncate">{nome1}</div>
          <div className="text-[10px] text-slate-400 truncate">{acad1}</div>
        </div>
        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
          <div className="text-center min-w-[28px]">
            <div className="text-lg font-black text-white">{score.pontos_athlete1?.wazaari || 0}</div>
            <div className="text-[8px] text-red-400">S{score.pontos_athlete1?.shido || 0}</div>
          </div>
          <div className="text-center px-2">
            <div className={`text-lg font-mono font-bold ${score.golden_score ? 'text-yellow-400' : score.clock_running ? 'text-green-400' : 'text-white'}`}>
              {formatTime(score.clock_seconds)}
            </div>
            {score.golden_score && <div className="text-[8px] text-yellow-400 font-bold">GOLDEN SCORE</div>}
            {score.osaekomi_athlete && (
              <div className="text-[8px] text-orange-400 font-bold animate-pulse">
                OSAEKOMI {score.osaekomi_seconds}s
              </div>
            )}
          </div>
          <div className="text-center min-w-[28px]">
            <div className="text-lg font-black text-blue-300">{score.pontos_athlete2?.wazaari || 0}</div>
            <div className="text-[8px] text-red-400">S{score.pontos_athlete2?.shido || 0}</div>
          </div>
        </div>
        {/* Athlete 2 (blue) */}
        <div className="flex-1">
          <div className="text-sm font-bold text-blue-300 truncate">{nome2}</div>
          <div className="text-[10px] text-slate-400 truncate">{acad2}</div>
        </div>
      </div>
    </div>
  )
}

function StreamPlayer({ stream }: { stream: Stream }) {
  if (!stream.stream_url) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Sem URL de stream configurada</p>
      </div>
    )
  }

  if (stream.tipo === 'youtube') {
    const embedUrl = extractYouTubeEmbedUrl(stream.stream_url)
    return (
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  if (stream.tipo === 'iframe') {
    return <iframe src={stream.stream_url} className="w-full h-full" allowFullScreen />
  }

  // Fallback
  return (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Tipo de stream não suportado no navegador</p>
    </div>
  )
}

export default function TitanTVPage() {
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [eventoNome, setEventoNome] = useState('')
  const [streams, setStreams] = useState<Stream[]>([])
  const [areas, setAreas] = useState<AreaData[]>([])
  const [fullscreen, setFullscreen] = useState<number | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const [strRes, scoreRes] = await Promise.all([
      fetch(`/api/eventos/${eventoId}/streams`).then(r => r.json()),
      fetch(`/api/eventos/${eventoId}/scoring/active-all`).then(r => r.json()),
    ])
    setStreams(strRes.streams || [])
    setEventoNome(scoreRes.evento_nome || '')
    setAreas(scoreRes.areas || [])
    setLoading(false)
  }, [eventoId])

  useEffect(() => { load() }, [load])

  // Refresh scores every 5 seconds
  useEffect(() => {
    const iv = setInterval(async () => {
      const res = await fetch(`/api/eventos/${eventoId}/scoring/active-all`).then(r => r.json())
      setAreas(res.areas || [])
    }, 5000)
    return () => clearInterval(iv)
  }, [eventoId])

  // Listen for realtime score updates
  useEffect(() => {
    const channel = supabase.channel(`titan-tv-${eventoId}`)
    channel.on('broadcast', { event: 'score-update' }, (payload: any) => {
      // Refresh on any score update
      fetch(`/api/eventos/${eventoId}/scoring/active-all`).then(r => r.json()).then(data => {
        setAreas(data.areas || [])
      })
    }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventoId, supabase])

  const liveStreams = streams.filter(s => s.status === 'live' && s.stream_url)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
      </div>
    )
  }

  // Fullscreen single area
  if (fullscreen !== null) {
    const stream = liveStreams.find(s => s.area_id === fullscreen)
    const area = areas.find(a => a.area_id === fullscreen)

    return (
      <div className="fixed inset-0 bg-black z-50">
        <button
          onClick={() => setFullscreen(null)}
          className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-black/60 text-white rounded-lg text-sm hover:bg-black/80 transition-all"
        >
          ✕ Fechar
        </button>
        <div className="relative w-full h-full">
          {stream ? <StreamPlayer stream={stream} /> : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <p className="text-slate-500">Stream offline</p>
            </div>
          )}
          {area?.active_match && area.score && (
            <ScoreOverlay area={area} score={area.score as ScoreData} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/30 via-black to-red-900/30 border-b border-red-500/20 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tv className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-bold">Titan TV</h1>
              <p className="text-xs text-slate-400">{eventoNome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {liveStreams.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                <Radio className="w-3 h-3 animate-pulse" /> {liveStreams.length} AO VIVO
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {liveStreams.length === 0 ? (
          <div className="text-center py-24">
            <Tv className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-400 mb-2">Nenhuma transmissão ao vivo</h2>
            <p className="text-sm text-slate-600">As transmissões aparecerão aqui quando iniciadas pelo organizador</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${liveStreams.length === 1 ? 'grid-cols-1' : liveStreams.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {liveStreams.map(stream => {
              const area = areas.find(a => a.area_id === stream.area_id)

              return (
                <div key={stream.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-red-500/30 transition-all group">
                  {/* Stream + overlay */}
                  <div className="relative aspect-video bg-black">
                    <StreamPlayer stream={stream} />
                    {area?.active_match && area.score && (
                      <ScoreOverlay area={area} score={area.score as ScoreData} />
                    )}
                    {/* Live badge */}
                    <div className="absolute top-2 left-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                      </span>
                    </div>
                    {/* Fullscreen button */}
                    <button
                      onClick={() => setFullscreen(stream.area_id)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info bar */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{stream.titulo || `Tatame ${stream.area_id}`}</div>
                      {area?.active_match && (
                        <div className="text-[10px] text-slate-500">
                          Luta #{(area.active_match as any).match_number}
                          {area.next_matches?.length > 0 && ` · +${area.next_matches.length} na fila`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Areas without stream but with active matches */}
        {areas.filter(a => a.active_match && !liveStreams.find(s => s.area_id === a.area_id)).length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-500 mb-3">Tatames sem transmissão (apenas placar)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {areas.filter(a => a.active_match && !liveStreams.find(s => s.area_id === a.area_id)).map(area => {
                const m = area.active_match!
                const a1 = (m.athlete1 as any)?.dados_atleta || {}
                const a2 = (m.athlete2 as any)?.dados_atleta || {}
                const score = area.score as ScoreData | null

                return (
                  <div key={area.area_id} className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
                    <div className="text-xs text-slate-500 mb-2">Tatame {area.area_id} — {m.bracket?.category?.nome_display || ''}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white truncate">{a1.nome_completo || 'TBD'}</div>
                      <div className="text-sm font-bold text-white">{score?.pontos_athlete1?.wazaari || 0}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-blue-300 truncate">{a2.nome_completo || 'TBD'}</div>
                      <div className="text-sm font-bold text-blue-300">{score?.pontos_athlete2?.wazaari || 0}</div>
                    </div>
                    {score && (
                      <div className="text-center mt-1">
                        <span className={`text-xs font-mono ${score.golden_score ? 'text-yellow-400' : 'text-slate-400'}`}>
                          {formatTime(score.clock_seconds)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
