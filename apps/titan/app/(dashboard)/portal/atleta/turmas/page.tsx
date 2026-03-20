'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, Users, MapPin, QrCode,
  CheckCircle2, Calendar, Clock, Star,
} from 'lucide-react'

interface Schedule {
  day_of_week: number
  start_time: string
  end_time: string
}

interface Turma {
  id: string
  name: string
  instructor_name: string | null
  location: string | null
  capacity: number | null
  current_enrollment: number | null
  is_full: boolean
  schedules: Schedule[]
  checkins_30d: number
  ultimo_checkin: string | null
  waitlist_position: number | null
  minha_avaliacao: number | null
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function formatTime(t: string) { return t?.slice(0, 5) ?? '' }

function StarRating({ classId, userId, current, onChange }: {
  classId: string
  userId: string
  current: number | null
  onChange: (rating: number) => void
}) {
  const [hover, setHover] = useState(0)
  const [saving, setSaving] = useState(false)

  const submit = async (rating: number) => {
    setSaving(true)
    await fetch(`/api/aulas/${classId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: userId, rating }),
    })
    onChange(rating)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-1">
      {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400 mr-1" />}
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => submit(s)}
          disabled={saving}
          className="transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star className={`w-4 h-4 ${
            s <= (hover || current || 0)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-600'
          }`} />
        </button>
      ))}
      {current && <span className="text-xs text-gray-500 ml-1">sua nota</span>}
    </div>
  )
}

function TurmaCard({ turma, today, userId, onCheckin, onWaitlistChange, onRatingChange }: {
  turma: Turma
  today: string
  userId: string
  onCheckin: (id: string) => void
  onWaitlistChange: (classId: string, action: 'join' | 'leave') => Promise<void>
  onRatingChange: (classId: string, rating: number) => void
}) {
  const todayDow = new Date(today + 'T12:00:00').getDay()
  const hasClassToday = turma.schedules.some(s => s.day_of_week === todayDow)
  const ultimoLabel = turma.ultimo_checkin
    ? new Date(turma.ultimo_checkin + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null
  const [waitlistLoading, setWaitlistLoading] = useState(false)

  const handleWaitlist = async (action: 'join' | 'leave') => {
    setWaitlistLoading(true)
    await onWaitlistChange(turma.id, action)
    setWaitlistLoading(false)
  }

  return (
    <div className={`bg-white/5 backdrop-blur border rounded-xl p-5 transition-all ${
      hasClassToday ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-semibold text-base">{turma.name}</h3>
            {hasClassToday && (
              <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 rounded-full px-2 py-0.5">
                Hoje
              </span>
            )}
            {turma.is_full && !turma.waitlist_position && (
              <span className="text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                Lotada
              </span>
            )}
          </div>
          {turma.instructor_name && (
            <p className="text-sm text-gray-400 mt-0.5">{turma.instructor_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-white">{turma.checkins_30d}</p>
          <p className="text-xs text-gray-500">treinos/30d</p>
        </div>
      </div>

      {/* Horários */}
      {turma.schedules.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {turma.schedules.map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border ${
              s.day_of_week === todayDow
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              <span className="font-semibold">{DAYS[s.day_of_week]}</span>
              <Clock className="w-3 h-3 opacity-60" />
              <span>{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fila de espera */}
      {turma.waitlist_position !== null && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">
              Você está na fila — posição #{turma.waitlist_position}
            </span>
          </div>
          <button
            onClick={() => handleWaitlist('leave')}
            disabled={waitlistLoading}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {waitlistLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sair da fila'}
          </button>
        </div>
      )}

      {/* Footer: info + ações */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {turma.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {turma.location}
            </span>
          )}
          {turma.capacity != null && turma.current_enrollment != null && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {turma.current_enrollment}/{turma.capacity}
            </span>
          )}
          {ultimoLabel && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Último: {ultimoLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* NPS */}
          <StarRating
            classId={turma.id}
            userId={userId}
            current={turma.minha_avaliacao}
            onChange={(r) => onRatingChange(turma.id, r)}
          />

          {/* Ação principal */}
          {hasClassToday && !turma.is_full && (
            <button
              onClick={() => onCheckin(turma.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30
                         text-purple-300 hover:bg-purple-500/30 text-xs font-semibold transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              Check-in
            </button>
          )}
          {turma.is_full && turma.waitlist_position === null && (
            <button
              onClick={() => handleWaitlist('join')}
              disabled={waitlistLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30
                         text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {waitlistLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              Entrar na fila
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MinhasTurmasPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [today, setToday] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const res = await fetch('/api/atletas/self/turmas')
    const d = await res.json()
    if (d.error) { setError(d.error); return }
    setTurmas(d.turmas || [])
    setToday(d.today || new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  function handleCheckin(classId: string) {
    router.push(`/checkin/${classId}?date=${today}`)
  }

  const handleWaitlistChange = useCallback(async (classId: string, action: 'join' | 'leave') => {
    await fetch(`/api/aulas/${classId}/waitlist`, {
      method: action === 'join' ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    // Reload data to get updated position/is_full
    const res = await fetch('/api/atletas/self/turmas')
    const d = await res.json()
    if (!d.error) setTurmas(d.turmas || [])
  }, [])

  function handleRatingChange(classId: string, rating: number) {
    setTurmas(prev => prev.map(t => t.id === classId ? { ...t, minha_avaliacao: rating } : t))
  }

  const todayDow = today ? new Date(today + 'T12:00:00').getDay() : -1
  const turmasHoje = turmas.filter(t => t.schedules.some(s => s.day_of_week === todayDow))
  const turmasOutros = turmas.filter(t => !t.schedules.some(s => s.day_of_week === todayDow))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Minhas Turmas</h1>
          <p className="text-slate-400">
            {today
              ? DAYS_FULL[new Date(today + 'T12:00:00').getDay()] + ', ' +
                new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
              : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/portal/atleta')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                     text-slate-300 hover:text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : turmas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
          <Users className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Sem turmas matriculadas</p>
          <p className="text-gray-400 text-sm">Fale com sua academia para ser adicionado a uma turma.</p>
        </div>
      ) : (
        <>
          {turmasHoje.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Aulas de Hoje
              </h2>
              <div className="space-y-3">
                {turmasHoje.map(t => (
                  <TurmaCard
                    key={t.id} turma={t} today={today} userId={userId}
                    onCheckin={handleCheckin}
                    onWaitlistChange={handleWaitlistChange}
                    onRatingChange={handleRatingChange}
                  />
                ))}
              </div>
            </div>
          )}

          {turmasOutros.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {turmasHoje.length > 0 ? 'Demais Turmas' : 'Todas as Turmas'}
              </h2>
              <div className="space-y-3">
                {turmasOutros.map(t => (
                  <TurmaCard
                    key={t.id} turma={t} today={today} userId={userId}
                    onCheckin={handleCheckin}
                    onWaitlistChange={handleWaitlistChange}
                    onRatingChange={handleRatingChange}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
            <QrCode className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-purple-300 font-medium">Check-in por QR Code</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Escaneie o QR do professor para registrar presença automaticamente, ou use o botão "Check-in" quando há aula hoje.
                Avalie as turmas com as estrelas após treinar.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
