'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Play, Pause, RotateCcw, Trophy,
  Camera, X, Check, Settings, ArrowUpDown
} from 'lucide-react'

interface Score {
  pontos_athlete1: { wazaari: number; yuko: number; shido: number }
  pontos_athlete2: { wazaari: number; yuko: number; shido: number }
  osaekomi_athlete: number | null
  osaekomi_seconds: number
  golden_score: boolean
  clock_seconds: number
  clock_running: boolean
  status: string
}

interface MatchData {
  id: string
  match_number: number
  tipo: string
  bracket: {
    id: string
    area_id: number | null
    category: { nome_display: string; tempo_luta_seg: number; golden_score_seg: number | null }
  }
  athlete1: { id: string; dados_atleta: Record<string, unknown> } | null
  athlete2: { id: string; dados_atleta: Record<string, unknown> } | null
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

const JUDOGI_COLORS: Record<JudogiColor, { bg: string; text: string; label: string; accent: string; dot: string; ipponBg: string; scoreBg: string }> = {
  white: { bg: 'bg-white', text: 'text-slate-900', label: 'BRANCO', accent: 'border-slate-300', dot: 'bg-white border border-slate-300', ipponBg: 'bg-white/20 border-white/40', scoreBg: 'bg-white/90' },
  blue:  { bg: 'bg-blue-600', text: 'text-white', label: 'AZUL', accent: 'border-blue-400', dot: 'bg-blue-500', ipponBg: 'bg-blue-600/50 border-blue-400/40', scoreBg: 'bg-blue-600' },
  red:   { bg: 'bg-red-600', text: 'text-white', label: 'VERMELHO', accent: 'border-red-400', dot: 'bg-red-500', ipponBg: 'bg-red-600/50 border-red-400/40', scoreBg: 'bg-red-600' },
}

export default function ScoringPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string
  const matchId = params.matchId as string

  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState<MatchData | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const [sending, setSending] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [finishWinner, setFinishWinner] = useState<1 | 2 | null>(null)
  const [finishResultado, setFinishResultado] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showHskChoice, setShowHskChoice] = useState(false)
  const [hskLoser, setHskLoser] = useState<1 | 2 | null>(null)

  // Judogi colors
  const [judogi1, setJudogi1] = useState<JudogiColor>('white')
  const [judogi2, setJudogi2] = useState<JudogiColor>('blue')

  // VAR state
  const [varMode, setVarMode] = useState<'off' | 'request' | 'review'>('off')
  const [varMotivo, setVarMotivo] = useState('')
  const [varClipUrl, setVarClipUrl] = useState<string | null>(null)
  const [varId, setVarId] = useState<string | null>(null)
  const [varDecisao, setVarDecisao] = useState('')
  const [varObservacao, setVarObservacao] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const osaekomiRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const broadcastRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const scoreRef = useRef(score)

  // Camera/MediaRecorder refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const videoReplayRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const [varHistory, setVarHistory] = useState<{ id: string; motivo: string; decisao: string; timestamp_luta_seg: number; video_url: string | null }[]>([])

  const load = useCallback(async () => {
    try {
      const [matchRes, varRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/scoring/${matchId}`),
        fetch(`/api/eventos/${eventoId}/scoring/${matchId}/var`),
      ])
      const json = await matchRes.json()
      if (matchRes.ok) {
        setMatch(json.match)
        setScore(json.score)
      }
      const varJson = await varRes.json()
      if (varRes.ok) {
        setVarHistory(varJson.vars || [])
        // If there's a pending VAR, auto-open review mode
        const pending = (varJson.vars || []).find((v: any) => v.decisao === 'pendente')
        if (pending) {
          setVarMode('review')
          setVarId(pending.id)
          setVarMotivo(pending.motivo || '')
          setVarClipUrl(pending.video_url || null)
        }
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId, matchId])

  useEffect(() => { load() }, [load])
  useEffect(() => { scoreRef.current = score }, [score])

  // Realtime Broadcast channel
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`scoring-live-${matchId}`)
    channel.subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  useEffect(() => {
    if (broadcastRef.current) clearInterval(broadcastRef.current)
    if (score && score.status !== 'finished') {
      broadcastRef.current = setInterval(() => {
        const s = scoreRef.current
        if (!s) return
        channelRef.current?.send({
          type: 'broadcast',
          event: 'score_update',
          payload: { ...s, judogi1, judogi2 },
        })
      }, 200)
    }
    return () => { if (broadcastRef.current) clearInterval(broadcastRef.current) }
  }, [score?.status, judogi1, judogi2])

  // Clock countdown
  useEffect(() => {
    if (clockRef.current) clearInterval(clockRef.current)
    if (score?.clock_running && score.status !== 'finished') {
      clockRef.current = setInterval(() => {
        setScore(prev => {
          if (!prev || !prev.clock_running) return prev
          if (prev.golden_score) {
            // Golden Score: count UP, but respect golden_score_seg max if configured
            const gsMax = match?.bracket?.category?.golden_score_seg
            const nextGs = prev.clock_seconds + 1
            if (gsMax && nextGs >= gsMax) {
              // Golden score time expired — decide by score difference or hantei
              const p1 = prev.pontos_athlete1
              const p2 = prev.pontos_athlete2
              const s1 = (p1.wazaari || 0) * 10 + (p1.yuko || 0)
              const s2 = (p2.wazaari || 0) * 10 + (p2.yuko || 0)
              if (s1 !== s2) {
                const winner = s1 > s2 ? 1 : 2
                setShowFinish(true)
                setFinishWinner(winner as 1 | 2)
                setFinishResultado('yusei-gachi')
              } else {
                // Still tied — operator decides (hantei)
                setShowFinish(true)
                setFinishResultado('hantei')
              }
              return { ...prev, clock_seconds: nextGs, clock_running: false }
            }
            return { ...prev, clock_seconds: nextGs }
          }
          const next = prev.clock_seconds - 1
          if (next <= 0) {
            // Tempo regular acabou — verificar se há diferença de pontuação
            const p1 = prev.pontos_athlete1
            const p2 = prev.pontos_athlete2
            const score1 = (p1.wazaari || 0) * 10 + (p1.yuko || 0)
            const score2 = (p2.wazaari || 0) * 10 + (p2.yuko || 0)
            if (score1 !== score2) {
              // Há diferença — vitória por pontuação (não vai para golden score)
              const winner = score1 > score2 ? 1 : 2
              setShowFinish(true)
              setFinishWinner(winner as 1 | 2)
              setFinishResultado('yusei-gachi')
              return { ...prev, clock_seconds: 0, clock_running: false }
            }
            // Empate — vai para golden score
            sendAction('golden_score')
            return { ...prev, clock_seconds: 0, clock_running: false }
          }
          return { ...prev, clock_seconds: next }
        })
      }, 1000)
    }
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [score?.clock_running, score?.status])

  // Osaekomi counter
  useEffect(() => {
    if (osaekomiRef.current) clearInterval(osaekomiRef.current)
    if (score?.osaekomi_athlete && score.clock_running) {
      osaekomiRef.current = setInterval(() => {
        setScore(prev => {
          if (!prev || !prev.osaekomi_athlete) return prev
          const next = (prev.osaekomi_seconds || 0) + 1
          const ath = prev.osaekomi_athlete as 1 | 2

          // 5s → yuko
          if (next === 5) {
            sendAction(ath === 1 ? 'yuko_1' : 'yuko_2')
          }
          // 10s → retract yuko, give wazaari
          if (next === 10) {
            sendAction(ath === 1 ? 'undo_yuko_1' : 'undo_yuko_2')
            sendAction(ath === 1 ? 'wazaari_1' : 'wazaari_2')
            const currentWza = ath === 1 ? (prev.pontos_athlete1.wazaari || 0) : (prev.pontos_athlete2.wazaari || 0)
            if (currentWza + 1 >= 2) {
              sendAction('osaekomi_stop')
              setShowFinish(true); setFinishWinner(ath); setFinishResultado('ippon')
              return { ...prev, osaekomi_seconds: next, osaekomi_athlete: null }
            }
          }
          // 20s → retract wazaari, ippon
          if (next >= 20) {
            sendAction(ath === 1 ? 'undo_wazaari_1' : 'undo_wazaari_2')
            sendAction('osaekomi_stop')
            setShowFinish(true); setFinishWinner(ath); setFinishResultado('ippon')
            return { ...prev, osaekomi_seconds: 20, osaekomi_athlete: null }
          }
          return { ...prev, osaekomi_seconds: next }
        })
      }, 1000)
    }
    return () => { if (osaekomiRef.current) clearInterval(osaekomiRef.current) }
  }, [score?.osaekomi_athlete, score?.clock_running])

  // Auto-win check
  useEffect(() => {
    if (!score || score.status === 'finished') return
    if (score.osaekomi_athlete) return
    const p1 = score.pontos_athlete1
    const p2 = score.pontos_athlete2

    // 2 wazaari = ippon (any time)
    if (p1.wazaari >= 2) { setShowFinish(true); setFinishWinner(1); setFinishResultado('ippon'); return }
    if (p2.wazaari >= 2) { setShowFinish(true); setFinishWinner(2); setFinishResultado('ippon'); return }

    // Golden Score: ANY score difference ends the match immediately
    if (score.golden_score) {
      const score1 = (p1.wazaari || 0) * 10 + (p1.yuko || 0)
      const score2 = (p2.wazaari || 0) * 10 + (p2.yuko || 0)
      if (score1 !== score2) {
        const winner = score1 > score2 ? 1 : 2
        const resultado = p1.wazaari !== p2.wazaari ? 'waza-ari' : 'yusei-gachi'
        setShowFinish(true); setFinishWinner(winner as 1 | 2); setFinishResultado(resultado)
        return
      }
    }

    // 3 shido = hansoku-make
    if (p1.shido >= 3 && !showHskChoice) { setHskLoser(1); setShowHskChoice(true) }
    else if (p2.shido >= 3 && !showHskChoice) { setHskLoser(2); setShowHskChoice(true) }
  }, [score?.pontos_athlete1, score?.pontos_athlete2, score?.osaekomi_athlete, score?.golden_score])

  const sendAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setSending(true)
    try {
      const s = scoreRef.current
      const localClock = s?.clock_seconds ?? 0
      const localOsaekomi = s?.osaekomi_seconds ?? 0
      const res = await fetch(`/api/eventos/${eventoId}/scoring/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, clock_seconds: localClock, osaekomi_seconds: localOsaekomi, ...extra }),
      })
      const json = await res.json()
      if (res.ok && json.score) {
        // Actions that control clock/osaekomi — trust server response fully
        const serverTrustActions = ['hajime', 'matte', 'golden_score', 'finish', 'osaekomi_stop', 'osaekomi_start_1', 'osaekomi_start_2']
        if (!serverTrustActions.includes(action)) {
          // For scoring actions, preserve local clock & osaekomi to avoid reset
          json.score.clock_seconds = scoreRef.current?.clock_seconds ?? json.score.clock_seconds
          json.score.clock_running = scoreRef.current?.clock_running ?? json.score.clock_running
          json.score.osaekomi_seconds = scoreRef.current?.osaekomi_seconds ?? json.score.osaekomi_seconds
          json.score.osaekomi_athlete = scoreRef.current?.osaekomi_athlete ?? json.score.osaekomi_athlete
        } else {
          // Still preserve clock_seconds/clock_running from local for osaekomi actions
          if (action.startsWith('osaekomi')) {
            json.score.clock_seconds = scoreRef.current?.clock_seconds ?? json.score.clock_seconds
            json.score.clock_running = scoreRef.current?.clock_running ?? json.score.clock_running
          }
        }
        setScore(json.score)
      }
    } catch { /* silent */ } finally { setSending(false) }
  }

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      if (videoPreviewRef.current) { videoPreviewRef.current.srcObject = stream; videoPreviewRef.current.play() }
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' })
      recordedChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) { recordedChunksRef.current.push(e.data); if (recordedChunksRef.current.length > 60) recordedChunksRef.current.shift() }
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setCameraActive(true)
    } catch { setCameraActive(false) }
  }
  const stopCamera = () => { mediaRecorderRef.current?.stop(); streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; mediaRecorderRef.current = null; setCameraActive(false) }
  const restartRecording = () => {
    // Keep the stream alive but restart the recorder with fresh chunks
    if (!streamRef.current) return
    try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
    recordedChunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) { recordedChunksRef.current.push(e.data); if (recordedChunksRef.current.length > 60) recordedChunksRef.current.shift() }
    }
    recorder.start(1000)
    mediaRecorderRef.current = recorder
  }
  const captureClip = (): string | null => { if (recordedChunksRef.current.length === 0) return null; return URL.createObjectURL(new Blob(recordedChunksRef.current, { type: 'video/webm' })) }

  // Auto camera: start on hajime, restart on matte, stop on finish
  const prevClockRunning = useRef<boolean | null>(null)
  const prevStatus = useRef<string | null>(null)
  useEffect(() => {
    if (!score) return
    const wasRunning = prevClockRunning.current
    const wasStatus = prevStatus.current
    prevClockRunning.current = score.clock_running
    prevStatus.current = score.status

    // Hajime: clock just started running
    if (score.clock_running && wasRunning === false && score.status !== 'finished') {
      if (!cameraActive) {
        startCamera()
      } else {
        restartRecording() // new segment per hajime
      }
    }

    // Matte: clock just stopped (but not finished)
    if (!score.clock_running && wasRunning === true && score.status !== 'finished') {
      // Keep camera stream alive but capture clip marker
      // Recording continues — the buffer keeps last 60s across matte periods
    }

    // Fight ended
    if (score.status === 'finished' && wasStatus !== 'finished') {
      // Stop camera on fight end
      if (cameraActive) stopCamera()
    }
  }, [score?.clock_running, score?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // VAR
  const handleVarRequest = async () => {
    await sendAction('matte')
    const clipUrl = captureClip()
    setVarClipUrl(clipUrl)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/scoring/${matchId}/var`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitado_por: 'operador', motivo: varMotivo, timestamp_luta_seg: match ? match.bracket.category.tempo_luta_seg - (score?.clock_seconds || 0) : 0 }),
      })
      const json = await res.json()
      if (res.ok) setVarId(json.var?.id || null)
    } catch { /* silent */ }
    setVarMotivo(''); setVarMode('review'); setPlaybackSpeed(1)
  }

  const handleVarDecision = async () => {
    if (!varId) return
    try {
      await fetch(`/api/eventos/${eventoId}/scoring/${matchId}/var`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ var_id: varId, decisao: varDecisao || 'mantida', observacao: varObservacao }),
      })
    } catch { /* silent */ }
    if (varClipUrl) URL.revokeObjectURL(varClipUrl)
    setVarClipUrl(null); setVarId(null); setVarDecisao(''); setVarObservacao(''); setVarMode('off')
  }
  const handleVarCancel = () => { if (varClipUrl) URL.revokeObjectURL(varClipUrl); setVarClipUrl(null); setVarId(null); setVarMotivo(''); setVarDecisao(''); setVarObservacao(''); setVarMode('off') }

  const handleSwapAthletes = async () => {
    await sendAction('swap_athletes')
    // Reload full match data to get swapped athletes
    await load()
  }

  const handleFinish = async () => {
    if (!finishWinner || !match) return
    await sendAction('finish')
    const winnerId = finishWinner === 1 ? match.athlete1?.id : match.athlete2?.id
    if (!winnerId) return
    try {
      await fetch(`/api/eventos/${eventoId}/brackets/${match.bracket.id}/matches/${matchId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_registration_id: winnerId, resultado: finishResultado || null, pontos_athlete1: score?.pontos_athlete1, pontos_athlete2: score?.pontos_athlete2, duracao_segundos: match.bracket.category.tempo_luta_seg - (score?.clock_seconds || 0) }),
      })
    } catch { /* silent */ }

    // Send final broadcast with winner info for spectator animation
    channelRef.current?.send({
      type: 'broadcast', event: 'score_update',
      payload: { ...scoreRef.current, status: 'finished', judogi1, judogi2, winner: finishWinner, resultado: finishResultado },
    })

    setShowFinish(false)

    // Auto-load next fight after 4s delay (wait for bracket progression)
    const areaId = match.bracket.area_id
    setTimeout(async () => {
      try {
        // Try same area first
        const areaQuery = areaId ? `?area=${areaId}` : ''
        let res = await fetch(`/api/eventos/${eventoId}/scoring/active${areaQuery}`)
        let json = await res.json()
        if (json.active_match && json.active_match.id !== matchId) {
          router.push(`/portal/eventos/${eventoId}/scoring/${json.active_match.id}`)
          return
        }
        // Fallback: any area
        if (areaId) {
          res = await fetch(`/api/eventos/${eventoId}/scoring/active`)
          json = await res.json()
          if (json.active_match && json.active_match.id !== matchId) {
            router.push(`/portal/eventos/${eventoId}/scoring/${json.active_match.id}`)
            return
          }
        }
        router.push(`/portal/eventos/${eventoId}/chaves`)
      } catch {
        router.push(`/portal/eventos/${eventoId}/chaves`)
      }
    }, 4000)
  }

  const handleHskChoice = (tipo: 'tecnico' | 'disciplinar') => {
    const winner = hskLoser === 1 ? 2 : 1
    setShowHskChoice(false)
    setHskLoser(null)
    setFinishWinner(winner as 1 | 2)
    setFinishResultado(tipo === 'disciplinar' ? 'hansoku-make-disciplinar' : 'hansoku-make')
    setShowFinish(true)
  }

  useEffect(() => { return () => { stopCamera() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading || !match || !score) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    )
  }

  const a1 = match.athlete1?.dados_atleta || null
  const a2 = match.athlete2?.dados_atleta || null
  const p1 = score.pontos_athlete1
  const p2 = score.pontos_athlete2
  const isRunning = score.clock_running
  const isFinished = score.status === 'finished'
  const isGoldenScore = score.golden_score
  const j1 = JUDOGI_COLORS[judogi1]
  const j2 = JUDOGI_COLORS[judogi2]

  // Athlete row component for horizontal layout
  const AthleteRow = ({ num, dados, pontos, judogi, osaekomiActive }: {
    num: 1 | 2; dados: Record<string, unknown> | null
    pontos: { wazaari: number; yuko: number; shido: number }
    judogi: typeof j1; osaekomiActive: boolean
  }) => (
    <div className={`flex-1 ${judogi === j1 ? JUDOGI_COLORS[judogi1].bg : JUDOGI_COLORS[judogi2].bg} ${judogi === j1 ? j1.text : j2.text} flex items-center px-4 min-h-0`}>
      {/* Left half: Name + academia */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="font-black text-xl truncate leading-tight">{getName(dados)}</div>
        <div className="text-sm truncate opacity-60 mt-0.5">{getAcademia(dados)}</div>
      </div>

      {/* Right half: Scores + shido + buttons */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Scores: wazaari + yuko */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-5xl font-black leading-none">{pontos.wazaari}</div>
            <div className="text-[9px] uppercase opacity-50 tracking-wider">Wza</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black leading-none opacity-80">{pontos.yuko || 0}</div>
            <div className="text-[9px] uppercase opacity-50 tracking-wider">Yuko</div>
          </div>
        </div>

        {/* Shido / Hansoku-make */}
        <div className="flex gap-0.5 items-center mx-1">
          {pontos.shido >= 3 ? (
            <div className="px-2 py-1 bg-red-600 rounded text-[9px] font-black text-white tracking-wider shadow-lg shadow-red-600/50">
              HANSOKU
            </div>
          ) : (
            [0, 1, 2].map(i => (
              <div key={i} className={`w-5 h-5 rounded-sm ${i < pontos.shido ? 'bg-yellow-400' : 'bg-black/15'}`} />
            ))
          )}
        </div>

        {/* Action buttons — grid: action on top, undo below */}
        <div className="grid grid-cols-5 gap-x-1 gap-y-0.5">
          <button onClick={() => sendAction(`wazaari_${num}`)} disabled={isFinished}
            className="px-2.5 py-2 bg-black/20 hover:bg-black/30 font-bold rounded-lg text-xs active:scale-95 transition-transform disabled:opacity-30">
            +WZA
          </button>
          <button onClick={() => sendAction(`yuko_${num}`)} disabled={isFinished}
            className="px-2.5 py-2 bg-black/20 hover:bg-black/30 font-bold rounded-lg text-xs active:scale-95 transition-transform disabled:opacity-30">
            +YUK
          </button>
          <button onClick={() => sendAction(`shido_${num}`)} disabled={isFinished}
            className="px-2.5 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 font-bold rounded-lg text-xs active:scale-95 transition-transform disabled:opacity-30">
            +SHI
          </button>
          <button onClick={() => sendAction(`osaekomi_start_${num}`)} disabled={isFinished || osaekomiActive}
            className="px-2.5 py-2 bg-amber-500/30 hover:bg-amber-500/50 font-bold rounded-lg text-xs active:scale-95 transition-transform disabled:opacity-30">
            OSA
          </button>
          <button onClick={() => { setShowFinish(true); setFinishWinner(num); setFinishResultado('ippon') }} disabled={isFinished}
            className="px-2.5 py-2 bg-black/30 hover:bg-black/50 font-black rounded-lg text-xs active:scale-95 transition-transform border border-current/20 disabled:opacity-30">
            IPPON
          </button>
          {/* Undo row — directly below each action */}
          <button onClick={() => sendAction(`undo_wazaari_${num}`)} disabled={isFinished || pontos.wazaari === 0}
            className="py-1 bg-black/10 hover:bg-black/20 rounded text-[8px] opacity-50 disabled:opacity-15 flex items-center justify-center gap-0.5">
            <RotateCcw className="w-2.5 h-2.5" />WZA
          </button>
          <button onClick={() => sendAction(`undo_yuko_${num}`)} disabled={isFinished || (pontos.yuko || 0) === 0}
            className="py-1 bg-black/10 hover:bg-black/20 rounded text-[8px] opacity-50 disabled:opacity-15 flex items-center justify-center gap-0.5">
            <RotateCcw className="w-2.5 h-2.5" />YUK
          </button>
          <button onClick={() => sendAction(`undo_shido_${num}`)} disabled={isFinished || pontos.shido === 0}
            className="py-1 bg-black/10 hover:bg-black/20 rounded text-[8px] opacity-50 disabled:opacity-15 flex items-center justify-center gap-0.5">
            <RotateCcw className="w-2.5 h-2.5" />SHI
          </button>
          <div />
          <div />
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-black text-white select-none flex flex-col overflow-hidden">
      {/* Top bar — thin */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-white/10 flex-shrink-0">
        <button onClick={() => router.push(`/portal/eventos/${eventoId}/chaves`)} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <span className="text-[10px] text-slate-500">#{match.match_number}</span>
          <span className="text-xs text-slate-300 ml-2">{match.bracket.category.nome_display}</span>
          <span className="text-[10px] text-slate-600 ml-2">{match.tipo}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={cameraActive ? stopCamera : startCamera}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${cameraActive ? 'bg-green-600/80 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
            <Camera className="w-3 h-3" />{cameraActive ? 'REC' : 'CAM'}
          </button>
          <button onClick={() => setVarMode('request')} disabled={varMode !== 'off'}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-600/80 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 disabled:opacity-50">
            VAR
          </button>
        </div>
      </div>

      {/* Settings panel (judogi colors) */}
      {showSettings && (
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-900 border-b border-white/10 flex-shrink-0">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Judogi:</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Atleta 1:</span>
            {(['white', 'blue', 'red'] as JudogiColor[]).map(c => (
              <button key={c} onClick={() => setJudogi1(c)}
                className={`w-6 h-6 rounded-full border-2 ${JUDOGI_COLORS[c].bg} ${judogi1 === c ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-white/20'}`} />
            ))}
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Atleta 2:</span>
            {(['white', 'blue', 'red'] as JudogiColor[]).map(c => (
              <button key={c} onClick={() => setJudogi2(c)}
                className={`w-6 h-6 rounded-full border-2 ${JUDOGI_COLORS[c].bg} ${judogi2 === c ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-white/20'}`} />
            ))}
          </div>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={handleSwapAthletes} disabled={isFinished || sending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-[10px] font-bold transition-all disabled:opacity-30 active:scale-95">
            <ArrowUpDown className="w-3.5 h-3.5" />TROCAR LADOS
          </button>
          <button onClick={() => setShowSettings(false)} className="ml-auto text-slate-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* === ATHLETE 1 (TOP) === */}
      <AthleteRow num={1} dados={a1} pontos={p1} judogi={j1} osaekomiActive={!!score.osaekomi_athlete} />

      {/* === BLACK CENTER STRIP — Clock + Controls === */}
      <div className="bg-black flex items-center justify-between px-4 py-2 flex-shrink-0 border-y border-white/5" style={{ minHeight: 80 }}>
        {/* Left: Hajime/Matte/Toketa */}
        <div className="flex items-center gap-2">
          {score.osaekomi_athlete ? (
            <button onClick={() => {
                // Immediately clear osaekomi locally before server round-trip
                setScore(prev => prev ? { ...prev, osaekomi_athlete: null, osaekomi_seconds: 0 } : prev)
                sendAction('osaekomi_stop')
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm active:scale-95 transition-transform">
              TOKETA
            </button>
          ) : isRunning ? (
            <button onClick={() => sendAction('matte')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm active:scale-95 transition-transform">
              <Pause className="w-4 h-4 inline mr-1" />MATTE
            </button>
          ) : (
            <button onClick={() => sendAction('hajime')} disabled={isFinished}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-sm disabled:opacity-30 active:scale-95 transition-transform">
              <Play className="w-4 h-4 inline mr-1" />HAJIME
            </button>
          )}
        </div>

        {/* Center: Clock + Osaekomi */}
        <div className="text-center flex-1">
          {isGoldenScore && (
            <div className="text-[10px] font-bold text-amber-400 animate-pulse tracking-widest">GOLDEN SCORE</div>
          )}
          <div className={`text-5xl font-mono font-black tracking-wider ${
            isRunning ? 'text-green-400' : isGoldenScore ? 'text-amber-400' : 'text-white'
          }`}>
            {formatClock(score.clock_seconds)}
          </div>
          {score.osaekomi_athlete && (
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold ${score.osaekomi_athlete === 1 ? 'text-slate-300' : 'text-blue-400'}`}>
                OSAEKOMI
              </span>
              <span className="text-xl font-mono font-bold text-amber-400">{score.osaekomi_seconds}s</span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(score.osaekomi_seconds / 20) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Encerrar */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFinish(true)} disabled={isFinished}
            className="px-4 py-3 bg-amber-600/50 hover:bg-amber-600/70 text-amber-200 font-bold rounded-xl text-xs disabled:opacity-30 active:scale-95 transition-transform">
            <Trophy className="w-4 h-4 inline mr-1" />ENCERRAR
          </button>
        </div>
      </div>

      {/* === ATHLETE 2 (BOTTOM) === */}
      <AthleteRow num={2} dados={a2} pontos={p2} judogi={j2} osaekomiActive={!!score.osaekomi_athlete} />

      {/* Camera preview */}
      {cameraActive && varMode === 'off' && (
        <div className="fixed bottom-2 left-2 z-30 rounded-lg overflow-hidden border border-white/20 shadow-xl" style={{ width: 120, height: 68 }}>
          <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 px-1 py-0.5 bg-red-600/80 rounded text-[8px] text-white font-bold">
            <div className="w-1 h-1 rounded-full bg-white animate-pulse" />REC
          </div>
        </div>
      )}

      {/* VAR Request Modal */}
      {varMode === 'request' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                <Camera className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Revisao de Video (VAR)</h3>
                <p className="text-xs text-slate-400">O cronometro sera pausado e o video capturado automaticamente</p>
              </div>
            </div>
            {cameraActive && (
              <div className="mb-4 rounded-lg overflow-hidden border border-white/10" style={{ height: 200 }}>
                <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover" />
              </div>
            )}
            {!cameraActive && (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center" style={{ height: 120 }}>
                <div className="text-center text-slate-500 text-sm">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Camera nao ativa
                </div>
              </div>
            )}
            <textarea value={varMotivo} onChange={e => setVarMotivo(e.target.value)} placeholder="Descreva o lance a ser revisado..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm mb-4 resize-none h-20" />
            <div className="flex gap-3">
              <button onClick={handleVarCancel} className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl text-sm font-medium hover:bg-white/10">Cancelar</button>
              <button onClick={handleVarRequest} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />Solicitar VAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VAR Review Panel */}
      {varMode === 'review' && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-red-900/50 border-b border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center animate-pulse">
                <Camera className="w-4 h-4 text-red-300" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">REVISAO DE VIDEO (VAR)</div>
                <div className="text-[10px] text-red-300">Cronometro pausado</div>
              </div>
            </div>
            <button onClick={handleVarCancel} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-black p-4">
            {varClipUrl ? (
              <>
                <div className="w-full max-w-3xl rounded-xl overflow-hidden border border-white/10 bg-black mb-4" style={{ maxHeight: '50vh' }}>
                  <video ref={videoReplayRef} src={varClipUrl} controls playsInline className="w-full h-full object-contain" style={{ maxHeight: '50vh' }} />
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs text-slate-500 mr-2">Velocidade:</span>
                  {[0.25, 0.5, 1, 1.5].map(speed => (
                    <button key={speed} onClick={() => { setPlaybackSpeed(speed); if (videoReplayRef.current) videoReplayRef.current.playbackRate = speed }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${playbackSpeed === speed ? 'bg-red-500/30 text-red-300 border border-red-500/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}>
                      {speed === 1 ? '1x' : `${speed}x`}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 mb-6">
                <Camera className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum video disponivel</p>
              </div>
            )}
          </div>
          <div className="px-4 py-4 bg-slate-900/80 border-t border-white/10">
            <div className="max-w-lg mx-auto">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-bold">Decisao do Arbitro</div>
              <div className="flex gap-3 mb-3">
                <button onClick={() => setVarDecisao('mantida')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${varDecisao === 'mantida' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                  <Check className="w-4 h-4 inline mr-1" />Mantida
                </button>
                <button onClick={() => setVarDecisao('revertida')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${varDecisao === 'revertida' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                  <RotateCcw className="w-4 h-4 inline mr-1" />Revertida
                </button>
              </div>
              <input value={varObservacao} onChange={e => setVarObservacao(e.target.value)} placeholder="Observacao (opcional)..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm mb-3" />
              <button onClick={handleVarDecision} disabled={!varDecisao}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 disabled:opacity-40">
                Confirmar e Retomar Luta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hansoku-make Type Choice Modal */}
      {showHskChoice && hskLoser && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-black text-lg">HSK</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Hansoku-make</h3>
                <p className="text-sm text-slate-400">
                  {getName(hskLoser === 1 ? a1 : a2)} — 3 shidos
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-5">Qual o tipo de hansoku-make?</p>

            <div className="space-y-3">
              <button onClick={() => handleHskChoice('tecnico')}
                className="w-full p-4 bg-yellow-600/20 border border-yellow-500/30 hover:bg-yellow-600/30 rounded-xl text-left transition-all active:scale-[0.98]">
                <div className="font-bold text-yellow-300 text-base">Tecnico</div>
                <div className="text-xs text-slate-400 mt-1">
                  Acumulo de shidos. O atleta perde esta luta mas pode continuar nas proximas.
                </div>
              </button>

              <button onClick={() => handleHskChoice('disciplinar')}
                className="w-full p-4 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 rounded-xl text-left transition-all active:scale-[0.98]">
                <div className="font-bold text-red-300 text-base">Disciplinar</div>
                <div className="text-xs text-slate-400 mt-1">
                  Falta grave. O atleta e desqualificado de todas as lutas subsequentes do evento.
                </div>
              </button>
            </div>

            <button onClick={() => { setShowHskChoice(false); setHskLoser(null) }}
              className="w-full mt-4 py-2 bg-white/5 text-slate-400 rounded-lg text-sm hover:bg-white/10">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Finish Modal */}
      {showFinish && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Encerrar Luta</h3>
            </div>
            <div className="space-y-2 mb-4">
              <label className="text-sm font-semibold text-slate-300">Vencedor</label>
              <div className="flex gap-3">
                <button onClick={() => setFinishWinner(1)}
                  className={`flex-1 p-3 rounded-lg border text-sm font-bold transition-all ${finishWinner === 1 ? `${j1.ipponBg} ${j1.text}` : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${j1.dot} mx-auto mb-1`} />
                  {getName(a1)}
                </button>
                <button onClick={() => setFinishWinner(2)}
                  className={`flex-1 p-3 rounded-lg border text-sm font-bold transition-all ${finishWinner === 2 ? `${j2.ipponBg} ${j2.text}` : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <div className={`w-3 h-3 rounded-full ${j2.dot} mx-auto mb-1`} />
                  {getName(a2)}
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Resultado</label>
              <select value={finishResultado} onChange={e => setFinishResultado(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                <option value="">Selecionar...</option>
                <option value="ippon">Ippon</option>
                <option value="waza-ari">Waza-ari (tempo)</option>
                <option value="yusei-gachi">Yusei-gachi (por pontos)</option>
                <option value="golden_score">Golden Score</option>
                <option value="hansoku-make">Hansoku-make</option>
                <option value="fusen-gachi">Fusen-gachi (W.O.)</option>
                <option value="kiken-gachi">Kiken-gachi</option>
                <option value="sogo-gachi">Sogo-gachi</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowFinish(false); setFinishWinner(null); setFinishResultado('') }}
                className="flex-1 py-2.5 bg-white/5 text-slate-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleFinish} disabled={!finishWinner}
                className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-lg text-sm disabled:opacity-40">
                <Check className="w-4 h-4 inline mr-1" />Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
