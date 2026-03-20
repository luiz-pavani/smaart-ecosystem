'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Flame, TrendingUp, Calendar, Trophy, Zap } from 'lucide-react'

interface CheckinItem { data: string; turma: string; hora: string | null }
interface Stats { total: number; semana: number; media_semana: number; streak: number; melhor_streak: number }
interface TurmaCount { name: string; count: number }

type Periodo = 30 | 90 | 180 | 365

// ── Heatmap de semanas ──────────────────────────────────────────────────────
function Heatmap({ porDia, dias }: { porDia: Record<string, string[]>; dias: number }) {
  const hoje = new Date()
  const cells: { date: string; count: number }[] = []

  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() - i)
    const str = d.toISOString().split('T')[0]
    cells.push({ date: str, count: porDia[str]?.length || 0 })
  }

  // Agrupar em semanas (colunas)
  const WEEKS: typeof cells[] = []
  let week: typeof cells = []
  const firstDow = new Date(cells[0].date + 'T12:00:00').getDay()
  for (let p = 0; p < firstDow; p++) week.push({ date: '', count: -1 }) // padding
  for (const cell of cells) {
    week.push(cell)
    if (week.length === 7) { WEEKS.push(week); week = [] }
  }
  if (week.length > 0) { while (week.length < 7) week.push({ date: '', count: -1 }); WEEKS.push(week) }

  const DAYS_LABEL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  function color(count: number) {
    if (count < 0) return 'transparent'
    if (count === 0) return 'rgba(255,255,255,0.05)'
    if (count === 1) return 'rgba(139,92,246,0.4)'
    if (count === 2) return 'rgba(139,92,246,0.65)'
    return 'rgba(139,92,246,0.9)'
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-0.5 min-w-max">
        {/* Labels dos dias */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DAYS_LABEL.map((l, i) => (
            <div key={i} className="w-3 h-3 text-[9px] text-gray-600 flex items-center justify-center">{l}</div>
          ))}
        </div>
        {WEEKS.map((wk, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {wk.map((cell, ci) => (
              <div
                key={ci}
                title={cell.date ? `${cell.date}${cell.count > 0 ? ` — ${cell.count} treino${cell.count > 1 ? 's' : ''}` : ''}` : ''}
                className="w-3 h-3 rounded-sm transition-all"
                style={{ backgroundColor: color(cell.count) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Meses do calendário (grid) ───────────────────────────────────────────────
function MonthCalendar({ porDia }: { porDia: Record<string, string[]> }) {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()

  const meses = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(anoAtual, mesAtual - (2 - i), 1)
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {meses.map(({ ano, mes }) => {
        const firstDay = new Date(ano, mes, 1).getDay()
        const daysInMonth = new Date(ano, mes + 1, 0).getDate()
        const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
        while (cells.length % 7 !== 0) cells.push(null)

        return (
          <div key={`${ano}-${mes}`}>
            <p className="text-xs font-semibold text-gray-400 mb-2 text-center">{MONTHS_PT[mes]} {ano}</p>
            <div className="grid grid-cols-7 gap-0.5">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
                <div key={i} className="text-center text-[9px] text-gray-600">{l}</div>
              ))}
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const count = porDia[dateStr]?.length || 0
                const isHoje = dateStr === hoje.toISOString().split('T')[0]
                return (
                  <div
                    key={i}
                    title={count > 0 ? `${count} treino${count > 1 ? 's' : ''}` : dateStr}
                    className={`aspect-square rounded-sm text-[9px] flex items-center justify-center transition-all ${
                      count > 0
                        ? 'bg-purple-500/70 text-white font-bold'
                        : isHoje
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FrequenciaAtletaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>(90)
  const [stats, setStats] = useState<Stats | null>(null)
  const [checkins, setCheckins] = useState<CheckinItem[]>([])
  const [porDia, setPorDia] = useState<Record<string, string[]>>({})
  const [porTurma, setPorTurma] = useState<TurmaCount[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/atletas/self/frequencia?dias=${periodo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setStats(d.stats)
        setCheckins(d.checkins || [])
        setPorDia(d.por_dia || {})
        setPorTurma(d.por_turma || [])
      })
      .catch(() => setError('Erro ao carregar frequência'))
      .finally(() => setLoading(false))
  }, [periodo])

  const PERIODOS: { label: string; value: Periodo }[] = [
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
    { label: '6m', value: 180 },
    { label: '1 ano', value: 365 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Frequência</h1>
          <p className="text-slate-400">Histórico de presença nas aulas</p>
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

      {/* Seletor de período */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              periodo === p.value
                ? 'bg-purple-500/40 text-white border border-purple-500/40'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: `Treinos (${periodo}d)`, value: stats?.total ?? 0, icon: Calendar, color: 'text-green-400' },
              { label: 'Esta semana', value: stats?.semana ?? 0, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Média/semana', value: `${stats?.media_semana ?? 0}x`, icon: Zap, color: 'text-purple-400' },
              { label: 'Streak atual', value: `${stats?.streak ?? 0}d`, icon: Flame, color: 'text-orange-400' },
              { label: 'Melhor streak', value: `${stats?.melhor_streak ?? 0}d`, icon: Trophy, color: 'text-yellow-400' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              )
            })}
          </div>

          {/* Heatmap */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              Mapa de Atividade — últimos {periodo} dias
            </h2>
            <Heatmap porDia={porDia} dias={periodo} />
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-600">Menos</span>
              {[0, 1, 2, 3].map(n => (
                <div key={n} className="w-3 h-3 rounded-sm" style={{
                  backgroundColor: n === 0 ? 'rgba(255,255,255,0.05)' : n === 1 ? 'rgba(139,92,246,0.4)' : n === 2 ? 'rgba(139,92,246,0.65)' : 'rgba(139,92,246,0.9)',
                }} />
              ))}
              <span className="text-xs text-gray-600">Mais</span>
            </div>
          </div>

          {/* Calendário mensal */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Últimos 3 meses
            </h2>
            <MonthCalendar porDia={porDia} />
          </div>

          {/* Por turma + Histórico lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top turmas */}
            {porTurma.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Treinos por Turma
                </h2>
                <div className="space-y-3">
                  {porTurma.slice(0, 6).map((t, i) => {
                    const max = porTurma[0].count
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 truncate max-w-[200px]" title={t.name}>{t.name}</span>
                          <span className="text-white font-semibold tabular-nums ml-2">{t.count}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                            style={{ width: `${(t.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Histórico recente */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Últimos Check-ins
              </h2>
              {checkins.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">Nenhum treino no período</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {checkins.map((c, i) => {
                    const d = new Date(c.data + 'T12:00:00')
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm text-white font-medium">{c.turma}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        {c.hora && <span className="text-xs text-gray-500">{c.hora}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
