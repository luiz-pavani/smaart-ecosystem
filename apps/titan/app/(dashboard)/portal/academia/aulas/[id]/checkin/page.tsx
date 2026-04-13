'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Users, RefreshCw, CheckCircle2, QrCode, ClipboardList, X } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

interface CheckinEntry {
  id: string
  athlete_id: string
  nome_completo: string
  checked_in_at: string
}

interface EnrolledAthlete {
  id: string
  nome_completo: string
  enrolled_at: string
}

type Tab = 'qr' | 'manual'

export default function CheckinPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const supabase = createClient()

  const [className, setClassName] = useState('')
  const [checkins, setCheckins] = useState<CheckinEntry[]>([])
  const [enrolled, setEnrolled] = useState<EnrolledAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('qr')
  const [date] = useState(() => new Date().toISOString().split('T')[0])
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    supabase.from('classes').select('name').eq('id', classId).maybeSingle().then(({ data }) => {
      if (data) setClassName((data as any).name)
    })
  }, [classId])

  const loadCheckins = useCallback(async () => {
    const res = await fetch(`/api/aulas/${classId}/checkin?date=${date}`)
    if (res.ok) {
      const json = await res.json()
      setCheckins(json.checkins || [])
    }
  }, [classId, date])

  const loadEnrolled = useCallback(async () => {
    const res = await fetch(`/api/aulas/${classId}/atletas`)
    if (res.ok) {
      const json = await res.json()
      setEnrolled(json.enrolled || [])
    }
  }, [classId])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadCheckins(), loadEnrolled()])
    setLoading(false)
  }, [loadCheckins, loadEnrolled])

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadCheckins, 10_000)
    return () => clearInterval(interval)
  }, [loadAll, loadCheckins])

  const checkinIds = new Set(checkins.map(c => c.athlete_id))

  const toggleCheckin = async (athleteId: string, isPresent: boolean) => {
    setToggling(athleteId)
    try {
      if (isPresent) {
        // Remove check-in
        await fetch(`/api/aulas/${classId}/checkin`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athlete_id: athleteId, date }),
        })
      } else {
        // Add check-in
        await fetch(`/api/aulas/${classId}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athlete_id: athleteId, date }),
        })
      }
      await loadCheckins()
    } finally {
      setToggling(null)
    }
  }

  const qrUrl = origin ? `${origin}/checkin/${classId}?date=${date}` : ''
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  // Sort enrolled: present first, then alphabetical
  const sortedEnrolled = [...enrolled].sort((a, b) => {
    const aPresent = checkinIds.has(a.id)
    const bPresent = checkinIds.has(b.id)
    if (aPresent !== bPresent) return aPresent ? -1 : 1
    return a.nome_completo.localeCompare(b.nome_completo)
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={() => router.push(`/portal/academia/aulas/${classId}`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Chamada</h1>
              {className && (
                <p className="text-gray-400 mt-1">
                  {className} — <span className="capitalize">{dateLabel}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {checkins.length} presença{checkins.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={loadAll}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab selector */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit mb-8">
          <button
            onClick={() => setTab('qr')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'qr'
                ? 'bg-purple-500/30 text-white border border-purple-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'manual'
                ? 'bg-blue-500/30 text-white border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Chamada Manual
            {enrolled.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">
                {checkins.length}/{enrolled.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tab === 'qr' ? (
          // ── QR Tab ──────────────────────────────────────────────────────────
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white rounded-2xl p-6 shadow-2xl">
                {qrUrl ? (
                  <QRCodeSVG value={qrUrl} size={280} level="M" />
                ) : (
                  <div className="w-[280px] h-[280px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-4 text-center max-w-xs">
                Atletas matriculados escaneiam este QR para registrar presença
              </p>
              <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-500 break-all text-center max-w-xs">
                {qrUrl}
              </div>
            </div>

            {/* Live presence list */}
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-green-400" />
                Presenças via QR ({checkins.length})
              </h2>
              {checkins.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
                  Nenhum check-in ainda hoje
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {checkins.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
                      <span className="text-green-400 font-bold text-sm w-6 text-right">{i + 1}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{c.nome_completo}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(c.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // ── Manual Tab ──────────────────────────────────────────────────────
          <div>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Progresso da chamada</span>
                <span className="text-white font-semibold">
                  {checkins.length} / {enrolled.length} presentes
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: enrolled.length > 0 ? `${(checkins.length / enrolled.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {enrolled.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Nenhum atleta matriculado</p>
                <p className="text-gray-400 text-sm">
                  Adicione atletas a esta turma na página de gerenciamento de aulas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedEnrolled.map(a => {
                  const present = checkinIds.has(a.id)
                  const busy = toggling === a.id
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleCheckin(a.id, present)}
                      disabled={busy}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        present
                          ? 'bg-green-500/15 border-green-500/40 hover:bg-green-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {busy ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 shrink-0" />
                      ) : present ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${present ? 'text-white' : 'text-gray-300'}`}>
                          {a.nome_completo}
                        </p>
                        {present && (
                          <p className="text-green-400/70 text-xs mt-0.5">
                            {(() => {
                              const c = checkins.find(c => c.athlete_id === a.id)
                              return c
                                ? new Date(c.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : 'Presente'
                            })()}
                          </p>
                        )}
                      </div>
                      {present && (
                        <X className="w-3.5 h-3.5 text-red-400/50 hover:text-red-400 shrink-0" aria-label="Remover presença" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="text-center text-xs text-gray-600 mt-6">
              Toque para marcar presença · Toque novamente para desfazer
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
