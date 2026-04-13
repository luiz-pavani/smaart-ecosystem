'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Loader2, Camera, Maximize } from 'lucide-react'

interface Score {
  match_id?: string
  pontos_athlete1: { wazaari: number; yuko: number; shido: number }
  pontos_athlete2: { wazaari: number; yuko: number; shido: number }
  osaekomi_athlete: number | null
  osaekomi_seconds: number
  golden_score: boolean
  clock_seconds: number
  clock_running: boolean
  status: string
  judogi1?: string
  judogi2?: string
}

interface MatchData {
  id: string
  match_number: number
  tipo: string
  status: string
  bracket_id: string
  bracket: {
    id: string
    area_id: number
    category: { nome_display: string; tempo_luta_seg: number }
  }
  athlete1: { id: string; dados_atleta: Record<string, unknown> } | null
  athlete2: { id: string; dados_atleta: Record<string, unknown> } | null
}

interface NextMatch {
  id: string
  match_number: number
  categoria: string
  athlete1_nome: string
  athlete2_nome: string
}

interface AreaData {
  area_id: number
  active_match: MatchData | null
  score: Score | null
  logos: { athlete1: string | null; athlete2: string | null }
  next_matches: NextMatch[]
}

function getName(dados: Record<string, unknown> | null): string {
  if (!dados) return '—'
  return (dados.nome_completo as string) || (dados.nome as string) || '—'
}
function getAcademia(dados: Record<string, unknown> | null): string {
  if (!dados) return ''
  return (dados.academia as string) || ''
}

type JudogiColor = 'white' | 'blue' | 'red'

const JUDOGI: Record<JudogiColor, { bg: string; text: string; shidoEmpty: string }> = {
  white: { bg: 'bg-white', text: 'text-slate-900', shidoEmpty: 'bg-slate-200' },
  blue:  { bg: 'bg-blue-600', text: 'text-white', shidoEmpty: 'bg-blue-800/50' },
  red:   { bg: 'bg-red-600', text: 'text-white', shidoEmpty: 'bg-red-800/50' },
}

const formatClock = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ============================================================
// Single Area Placar Component (used in grid AND fullscreen)
// ============================================================
function AreaPlacar({
  areaData, eventoNome, compact, onClickArea
}: {
  areaData: AreaData
  eventoNome: string
  compact: boolean
  onClickArea?: (area: number) => void
}) {
  const { active_match: match, score: propScore, logos, next_matches: nextMatches, area_id } = areaData
  const [liveScore, setLiveScore] = useState<Score | null>(null)
  const matchIdRef = useRef<string | null>(null)
  const score = liveScore || propScore
  const [judogi1, setJudogi1] = useState<JudogiColor>('white')
  const [judogi2, setJudogi2] = useState<JudogiColor>('blue')
  const [isVarActive, setIsVarActive] = useState(false)
  const [winnerAthlete, setWinnerAthlete] = useState<1 | 2 | null>(null)
  const [winnerResultado, setWinnerResultado] = useState('')
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false)

  // Reset liveScore only when match changes (new match loaded by polling)
  useEffect(() => {
    if (match?.id !== matchIdRef.current) {
      matchIdRef.current = match?.id || null
      setLiveScore(null)
    }
  }, [match?.id])

  const j1 = JUDOGI[judogi1]
  const j2 = JUDOGI[judogi2]

  // Realtime for this area's active match
  useEffect(() => {
    if (!match) return
    const supabase = createClient()

    const ch = supabase
      .channel(`scoring-live-${match.id}`)
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        if (!payload) return
        const s = payload as Score & { winner?: number; resultado?: string; judogi1?: JudogiColor; judogi2?: JudogiColor }
        setLiveScore(s)
        if (s.judogi1) setJudogi1(s.judogi1)
        if (s.judogi2) setJudogi2(s.judogi2)
        if (s.status === 'finished' && s.winner) {
          setWinnerAthlete(s.winner as 1 | 2)
          setWinnerResultado(s.resultado || '')
          setShowWinnerAnimation(true)
          setTimeout(() => { setShowWinnerAnimation(false); setWinnerAthlete(null) }, 6000)
        }
      })
      .subscribe()

    const dbCh = supabase
      .channel(`placar-db-${match.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'event_match_var',
        filter: `match_id=eq.${match.id}`
      }, () => { setIsVarActive(true); setTimeout(() => setIsVarActive(false), 15000) })
      .subscribe()

    return () => { supabase.removeChannel(ch); supabase.removeChannel(dbCh) }
  }, [match?.id])

  const AcademyLogo = ({ url, size = 56 }: { url: string | null; size?: number }) => {
    if (!url) return <div className="rounded-full bg-black/10 flex-shrink-0" style={{ width: size, height: size }} />
    return (
      <img src={url} alt=""
        className="rounded-full object-cover flex-shrink-0 bg-black/10"
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  // === WAITING ===
  if (!match || !score) {
    return (
      <div
        className={`bg-black flex flex-col items-center justify-center relative overflow-hidden ${compact ? 'h-full' : 'h-screen'}`}
        onClick={() => onClickArea?.(area_id)}
        style={{ cursor: onClickArea ? 'pointer' : 'default' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 animate-pulse" />
        <div className="relative text-center z-10 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-bold text-sm tracking-wider">TATAME {area_id}</span>
          </div>
          <Trophy className={`${compact ? 'w-10 h-10' : 'w-16 h-16'} text-slate-700 mx-auto mb-3`} />
          <p className={`text-slate-400 font-medium ${compact ? 'text-sm' : 'text-xl'}`}>Aguardando proxima luta...</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
          {nextMatches.length > 0 && (
            <div className="mt-4 max-w-sm mx-auto">
              <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Proximas lutas</div>
              <div className="space-y-1">
                {nextMatches.map((nm, i) => (
                  <div key={nm.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${i === 0 ? 'bg-white/5 border-cyan-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                    <div className={`text-[10px] font-bold w-5 ${i === 0 ? 'text-cyan-400' : 'text-slate-600'}`}>#{nm.match_number}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className={`${compact ? 'text-[11px]' : 'text-sm'} text-white font-medium truncate`}>{nm.athlete1_nome} <span className="text-slate-600">vs</span> {nm.athlete2_nome}</div>
                      <div className="text-[9px] text-slate-600">{nm.categoria}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // === ACTIVE MATCH ===
  const a1 = match.athlete1?.dados_atleta || null
  const a2 = match.athlete2?.dados_atleta || null
  const p1 = score.pontos_athlete1
  const p2 = score.pontos_athlete2
  const isFinished = score.status === 'finished'

  // Sizes based on compact
  const nameSize = compact ? 'text-xl' : 'text-5xl'
  const academiaSize = compact ? 'text-xs' : 'text-xl'
  const scoreSize = compact ? 'text-3xl' : 'text-8xl'
  const scoreSubSize = compact ? 'text-xl' : 'text-5xl'
  const clockSize = compact ? 'text-4xl' : 'text-[80px]'
  const logoSize = compact ? 40 : 72
  const shidoSize = compact ? 'w-4 h-4' : 'w-8 h-8'
  const px = compact ? 'px-3' : 'px-6'

  const AthleteBar = ({ dados, pontos, jc, winner, logoUrl }: {
    dados: Record<string, unknown> | null
    pontos: { wazaari: number; yuko: number; shido: number }
    jc: typeof j1
    winner: boolean
    logoUrl: string | null
  }) => (
    <div className={`flex-1 ${jc.bg} ${jc.text} flex items-center ${px} relative ${winner ? 'ring-4 ring-amber-400/50 ring-inset' : ''}`}>
      <AcademyLogo url={logoUrl} size={logoSize} />
      <div className={`flex-1 min-w-0 ${compact ? 'ml-2' : 'ml-5'}`}>
        <div className={`${nameSize} font-black truncate leading-tight`}>{getName(dados)}</div>
        <div className={`${academiaSize} opacity-60 truncate mt-0.5`}>{getAcademia(dados)}</div>
      </div>
      <div className={`flex items-center ${compact ? 'gap-3' : 'gap-6'}`}>
        <div className="text-center">
          <div className={`${scoreSize} leading-none font-black`}>{pontos.wazaari}</div>
          <div className={`${compact ? 'text-[8px]' : 'text-sm'} uppercase opacity-40 tracking-[0.2em]`}>WZA</div>
        </div>
        <div className="text-center">
          <div className={`${scoreSubSize} leading-none font-black opacity-70`}>{pontos.yuko || 0}</div>
          <div className={`${compact ? 'text-[8px]' : 'text-sm'} uppercase opacity-40 tracking-[0.2em]`}>YUK</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          {pontos.shido >= 3 ? (
            <div className={`${compact ? 'px-2 py-1 text-[9px]' : 'px-4 py-2 text-lg'} bg-red-600 rounded-lg text-white font-black tracking-widest animate-pulse`}>
              HSK
            </div>
          ) : (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`${shidoSize} rounded-md ${i < pontos.shido ? 'bg-yellow-400 shadow-lg shadow-yellow-400/30' : jc.shidoEmpty}`} />
              ))}
            </div>
          )}
        </div>
      </div>
      {winner && <div className="absolute top-2 right-3"><Trophy className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} text-amber-400`} /></div>}
    </div>
  )

  return (
    <div
      className={`bg-black text-white relative overflow-hidden flex flex-col ${compact ? 'h-full' : 'h-screen'}`}
      onClick={() => onClickArea?.(area_id)}
      style={{ cursor: onClickArea ? 'pointer' : 'default' }}
    >
      {/* VAR overlay */}
      {isVarActive && (
        <div className="absolute inset-0 bg-red-900/50 z-50 flex items-center justify-center animate-pulse">
          <div className={`bg-red-600/90 ${compact ? 'px-6 py-3' : 'px-12 py-6'} rounded-2xl flex items-center gap-3`}>
            <Camera className={`${compact ? 'w-6 h-6' : 'w-12 h-12'} text-white`} />
            <div className={`${compact ? 'text-lg' : 'text-4xl'} font-black text-white tracking-wider`}>REVISAO DE VIDEO</div>
          </div>
        </div>
      )}

      {/* Winner animation overlay */}
      {showWinnerAnimation && winnerAthlete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className={`absolute inset-0 ${winnerAthlete === 1 ? j1.bg : j2.bg} opacity-90`} />
          <div className="relative text-center z-10">
            <div className={`${compact ? 'text-4xl' : 'text-[120px]'} font-black tracking-widest leading-none mb-2 ${winnerAthlete === 1 ? j1.text : j2.text}`}>
              {winnerResultado ? winnerResultado.toUpperCase().replace('-', ' ') : 'VENCEDOR'}
            </div>
            <div className={`${compact ? 'text-lg' : 'text-4xl'} font-black ${winnerAthlete === 1 ? j1.text : j2.text}`}>
              {getName(winnerAthlete === 1 ? a1 : a2)}
            </div>
            <Trophy className={`${compact ? 'w-8 h-8' : 'w-16 h-16'} text-amber-400 mx-auto mt-2`} />
          </div>
        </div>
      )}

      {/* Finished overlay */}
      {isFinished && !showWinnerAnimation && (
        <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="text-center">
            <Trophy className={`${compact ? 'w-10 h-10' : 'w-20 h-20'} text-amber-400 mx-auto mb-2`} />
            <div className={`${compact ? 'text-2xl' : 'text-5xl'} font-black text-amber-400 tracking-wider`}>LUTA ENCERRADA</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center py-1 bg-black flex-shrink-0 border-b border-white/5">
        {!compact && <div className="text-[10px] text-slate-600 uppercase tracking-widest">{eventoNome}</div>}
        <div className={`${compact ? 'text-xs' : 'text-sm'} text-cyan-400 font-bold`}>
          {compact && <span className="text-slate-500 mr-1">Tatame {area_id} |</span>}
          {match.bracket?.category?.nome_display}
        </div>
        {!compact && (
          <div className="text-[10px] text-slate-700">
            Tatame {area_id} | Luta #{match.match_number}
          </div>
        )}
      </div>

      {/* Athlete 1 */}
      <AthleteBar dados={a1} pontos={p1} jc={j1} logoUrl={logos.athlete1}
        winner={isFinished && winnerAthlete === 1} />

      {/* Clock */}
      <div className={`bg-black flex items-center justify-center ${compact ? 'py-1.5' : 'py-3'} flex-shrink-0 border-y border-white/5`}>
        <div className="text-center">
          {score.golden_score && (
            <div className={`${compact ? 'text-[10px]' : 'text-sm'} font-black text-amber-400 tracking-widest animate-pulse mb-0.5`}>GOLDEN SCORE</div>
          )}
          <div className={`${clockSize} font-mono font-black leading-none ${
            score.clock_running ? 'text-green-400' : score.golden_score ? 'text-amber-400' : 'text-white'
          }`}>
            {formatClock(score.clock_seconds)}
          </div>
          {score.osaekomi_athlete && (
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400">OSA</span>
              <span className={`${compact ? 'text-lg' : 'text-3xl'} font-mono font-black text-amber-400`}>{score.osaekomi_seconds}s</span>
              <div className={`${compact ? 'w-16' : 'w-32'} h-2 bg-white/10 rounded-full overflow-hidden`}>
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(score.osaekomi_seconds / 20) * 100}%` }} />
              </div>
            </div>
          )}
          {!score.clock_running && !isFinished && score.status !== 'waiting' && !score.osaekomi_athlete && (
            <div className={`mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'} text-red-400 font-bold uppercase tracking-widest animate-pulse`}>MATTE</div>
          )}
        </div>
      </div>

      {/* Athlete 2 */}
      <AthleteBar dados={a2} pontos={p2} jc={j2} logoUrl={logos.athlete2}
        winner={isFinished && winnerAthlete === 2} />

      {/* Footer */}
      <div className={`text-center ${compact ? 'py-0.5' : 'py-1'} bg-black flex-shrink-0 text-[9px] text-slate-800`}>
        {compact ? `A${area_id} | #${match.match_number}` : 'TITAN SMAART PRO'}
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function PlacarPublicPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const eventoId = params.id as string

  const isOverlay = searchParams.get('overlay') === 'true'
  const areaFilter = searchParams.get('area') ? parseInt(searchParams.get('area')!) : null

  const [loading, setLoading] = useState(true)
  const [eventoNome, setEventoNome] = useState('')
  const [numAreas, setNumAreas] = useState(1)
  const [areasData, setAreasData] = useState<AreaData[]>([])

  // Single-area mode state (for overlay and ?area=N)
  const [singleMatch, setSingleMatch] = useState<MatchData | null>(null)
  const [singleScore, setSingleScore] = useState<Score | null>(null)
  const [singleLogos, setSingleLogos] = useState<{ athlete1: string | null; athlete2: string | null }>({ athlete1: null, athlete2: null })
  const [singleNextMatches, setSingleNextMatches] = useState<NextMatch[]>([])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeMatchIdRef = useRef<string | null>(null)

  // === MULTI-AREA POLLING ===
  const pollAllAreas = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${eventoId}/scoring/active-all`)
      const json = await res.json()
      if (res.ok) {
        setEventoNome(json.evento_nome || '')
        setNumAreas(json.num_areas || 1)
        setAreasData(json.areas || [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId])

  // === SINGLE-AREA POLLING (for ?area=N or overlay) ===
  const pollSingleArea = useCallback(async () => {
    try {
      const url = areaFilter
        ? `/api/eventos/${eventoId}/scoring/active?area=${areaFilter}`
        : `/api/eventos/${eventoId}/scoring/active`
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok) {
        setEventoNome(json.evento_nome || '')
        if (json.active_match) {
          setSingleMatch(json.active_match)
          setSingleScore(json.score)
          activeMatchIdRef.current = json.active_match.id
        } else {
          setSingleMatch(null)
          setSingleScore(null)
          activeMatchIdRef.current = null
        }
        setSingleLogos(json.logos || { athlete1: null, athlete2: null })
        setSingleNextMatches(json.next_matches || [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId, areaFilter])

  const isSingleMode = isOverlay || !!areaFilter

  useEffect(() => {
    if (isSingleMode) pollSingleArea()
    else pollAllAreas()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const hasActive = isSingleMode ? !!singleMatch : areasData.some(a => a.active_match)
    const interval = hasActive ? 8000 : 3000
    pollRef.current = setInterval(isSingleMode ? pollSingleArea : pollAllAreas, interval)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [singleMatch, areasData, isSingleMode, pollSingleArea, pollAllAreas])

  // Realtime for single mode
  useEffect(() => {
    if (!isSingleMode || !activeMatchIdRef.current) return
    const matchId = activeMatchIdRef.current
    const supabase = createClient()

    const ch = supabase
      .channel(`scoring-live-${matchId}`)
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        if (payload) {
          const s = payload as Score
          setSingleScore(s)
          if (s.status === 'finished') setTimeout(pollSingleArea, 7000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [activeMatchIdRef.current, isSingleMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  // === OVERLAY MODE ===
  if (isOverlay) {
    if (!singleMatch || !singleScore) return <div className="bg-transparent" />
    const a1 = singleMatch.athlete1?.dados_atleta || null
    const a2 = singleMatch.athlete2?.dados_atleta || null
    const p1 = singleScore.pontos_athlete1
    const p2 = singleScore.pontos_athlete2
    const j1 = JUDOGI.white
    const j2 = JUDOGI.blue

    return (
      <div className="w-full bg-transparent font-sans">
        <div className="fixed bottom-4 left-4 right-4 flex flex-col gap-0 rounded-xl overflow-hidden shadow-2xl">
          <div className={`flex items-center px-4 py-2 ${j1.bg} ${j1.text}`}>
            <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{getName(a1)}</div><div className="text-[10px] opacity-60 truncate">{getAcademia(a1)}</div></div>
            <div className="flex items-center gap-3 ml-3">
              <div className="text-center"><div className="text-2xl font-black">{p1.wazaari}</div><div className="text-[7px] opacity-50">WZA</div></div>
              <div className="flex gap-0.5">{[0,1,2].map(i => <div key={i} className={`w-3.5 h-3.5 rounded-sm ${i < p1.shido ? 'bg-yellow-400' : j1.shidoEmpty}`} />)}</div>
            </div>
          </div>
          <div className="flex items-center justify-center px-4 py-1.5 bg-black">
            {singleScore.golden_score && <span className="text-[9px] font-bold text-amber-400 animate-pulse mr-2">GS</span>}
            <span className={`text-2xl font-mono font-black ${singleScore.clock_running ? 'text-green-400' : 'text-white'}`}>{formatClock(singleScore.clock_seconds)}</span>
            {singleScore.osaekomi_athlete && <span className="text-xs text-amber-400 font-bold ml-2">OSA {singleScore.osaekomi_seconds}s</span>}
          </div>
          <div className={`flex items-center px-4 py-2 ${j2.bg} ${j2.text}`}>
            <div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{getName(a2)}</div><div className="text-[10px] opacity-60 truncate">{getAcademia(a2)}</div></div>
            <div className="flex items-center gap-3 ml-3">
              <div className="text-center"><div className="text-2xl font-black">{p2.wazaari}</div><div className="text-[7px] opacity-50">WZA</div></div>
              <div className="flex gap-0.5">{[0,1,2].map(i => <div key={i} className={`w-3.5 h-3.5 rounded-sm ${i < p2.shido ? 'bg-yellow-400' : j2.shidoEmpty}`} />)}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === LOADING ===
  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    )
  }

  // === SINGLE AREA FULLSCREEN ===
  if (areaFilter) {
    const areaData: AreaData = {
      area_id: areaFilter,
      active_match: singleMatch,
      score: singleScore,
      logos: singleLogos,
      next_matches: singleNextMatches,
    }
    return (
      <div className="h-screen bg-black relative" onClick={toggleFullscreen}>
        <AreaPlacar areaData={areaData} eventoNome={eventoNome} compact={false} />
        <div className="absolute bottom-2 right-3 z-30">
          <button onClick={toggleFullscreen} className="text-slate-700 hover:text-slate-500">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // === MULTI-AREA GRID ===
  const cols = numAreas <= 1 ? 1 : numAreas <= 2 ? 2 : numAreas <= 4 ? 2 : 3

  return (
    <div className="h-screen bg-black relative overflow-hidden" onClick={toggleFullscreen}>
      {/* Top bar */}
      <div className="text-center py-1.5 bg-black border-b border-white/5 flex-shrink-0 relative z-10">
        <div className="text-[10px] text-slate-600 uppercase tracking-[0.4em]">TITAN SMAART PRO</div>
        <div className="text-sm text-white font-bold">{eventoNome}</div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <button onClick={toggleFullscreen} className="text-slate-700 hover:text-slate-500">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="h-[calc(100vh-40px)] grid gap-px bg-slate-800"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: numAreas <= 2 ? '1fr' : numAreas <= 4 ? '1fr 1fr' : `repeat(${Math.ceil(numAreas / 3)}, 1fr)`,
        }}
      >
        {Array.from({ length: numAreas }, (_, i) => {
          const areaData = areasData.find(a => a.area_id === i + 1) || {
            area_id: i + 1,
            active_match: null,
            score: null,
            logos: { athlete1: null, athlete2: null },
            next_matches: [],
          }
          return (
            <div key={i + 1} className="overflow-hidden">
              <AreaPlacar
                areaData={areaData}
                eventoNome={eventoNome}
                compact={numAreas > 1}
                onClickArea={(area) => {
                  window.open(`/eventos/${eventoId}/placar?area=${area}`, '_blank')
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
