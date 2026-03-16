'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, UserPlus, Loader2, Users, X, Filter, Star } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface Atleta {
  id: string
  nome_completo: string
  graduacao?: string | null
  enrolled?: boolean
}

interface ClassInfo {
  id: string
  name: string
  location: string | null
  capacity: number | null
  current_enrollment: number
  instructor_name: string | null
  min_age: number | null
  max_age: number | null
  min_kyu_dan_id: number | null
  max_kyu_dan_id: number | null
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
}

const dayLabels: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

export default function AulaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const supabase = createClient()

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [enrolled, setEnrolled] = useState<Atleta[]>([])
  const [searchResults, setSearchResults] = useState<Atleta[]>([])
  const [search, setSearch] = useState('')
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [filterByCriteria, setFilterByCriteria] = useState(false)
  const [rating, setRating] = useState<{ avg: number | null; total: number } | null>(null)

  // Load class info
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const resolvedId = await resolveAcademiaId(supabase)
      setAcademiaId(resolvedId)

      const { data } = await supabase
        .from('classes')
        .select('id, name, location, capacity, current_enrollment, instructor_name, min_age, max_age, min_kyu_dan_id, max_kyu_dan_id, class_schedules(start_time, end_time, day_of_week)')
        .eq('id', classId)
        .maybeSingle()

      if (data) {
        const d = data as any
        setClassInfo({
          id: d.id,
          name: d.name,
          location: d.location,
          capacity: d.capacity,
          current_enrollment: d.current_enrollment || 0,
          instructor_name: d.instructor_name || null,
          min_age: d.min_age ?? null,
          max_age: d.max_age ?? null,
          min_kyu_dan_id: d.min_kyu_dan_id ?? null,
          max_kyu_dan_id: d.max_kyu_dan_id ?? null,
          schedules: d.class_schedules || [],
        })
      }
      // Load rating
      const ratingRes = await fetch(`/api/aulas/${classId}/rating`)
      if (ratingRes.ok) {
        const ratingJson = await ratingRes.json()
        setRating({ avg: ratingJson.avg, total: ratingJson.total })
      }

      setLoading(false)
    }
    init()
  }, [classId])

  // Load enrolled athletes
  const loadEnrolled = useCallback(async () => {
    const res = await fetch(`/api/aulas/${classId}/atletas`)
    const json = await res.json()
    setEnrolled(json.enrolled || [])
  }, [classId])

  useEffect(() => { loadEnrolled() }, [loadEnrolled])

  // Search athletes
  useEffect(() => {
    if (!academiaId) return
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      const p = new URLSearchParams({ academiaId, search })
      if (filterByCriteria && classInfo) {
        if (classInfo.min_age != null) p.set('min_age', String(classInfo.min_age))
        if (classInfo.max_age != null) p.set('max_age', String(classInfo.max_age))
        if (classInfo.min_kyu_dan_id != null) p.set('min_kyu_dan_id', String(classInfo.min_kyu_dan_id))
        if (classInfo.max_kyu_dan_id != null) p.set('max_kyu_dan_id', String(classInfo.max_kyu_dan_id))
      }
      const res = await fetch(`/api/aulas/${classId}/atletas?${p}`)
      const json = await res.json()
      setSearchResults(json.athletes || [])
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, academiaId, classId, filterByCriteria, classInfo])

  const refreshSearch = useCallback(async () => {
    if (!academiaId) return
    const p = new URLSearchParams({ academiaId, search })
    if (filterByCriteria && classInfo) {
      if (classInfo.min_age != null) p.set('min_age', String(classInfo.min_age))
      if (classInfo.max_age != null) p.set('max_age', String(classInfo.max_age))
      if (classInfo.min_kyu_dan_id != null) p.set('min_kyu_dan_id', String(classInfo.min_kyu_dan_id))
      if (classInfo.max_kyu_dan_id != null) p.set('max_kyu_dan_id', String(classInfo.max_kyu_dan_id))
    }
    const res = await fetch(`/api/aulas/${classId}/atletas?${p}`)
    const json = await res.json()
    setSearchResults(json.athletes || [])
  }, [academiaId, search, classId, filterByCriteria, classInfo])

  const enroll = async (athleteId: string) => {
    setActionId(athleteId)
    await fetch(`/api/aulas/${classId}/atletas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId }),
    })
    await loadEnrolled()
    await refreshSearch()
    setClassInfo(prev => prev ? { ...prev, current_enrollment: (prev.current_enrollment || 0) + 1 } : prev)
    setActionId(null)
  }

  const remove = async (athleteId: string) => {
    setActionId(athleteId)
    await fetch(`/api/aulas/${classId}/atletas`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId }),
    })
    await loadEnrolled()
    await refreshSearch()
    setClassInfo(prev => prev ? { ...prev, current_enrollment: Math.max(0, (prev.current_enrollment || 0) - 1) } : prev)
    setActionId(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia/aulas')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Aulas
          </button>
          {classInfo && (
            <>
              <h1 className="text-3xl font-bold text-white">{classInfo.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 items-center">
                {classInfo.location && (
                  <span className="text-gray-400 text-sm">📍 {classInfo.location}</span>
                )}
                {classInfo.instructor_name && (
                  <span className="text-purple-300 text-sm">👤 {classInfo.instructor_name}</span>
                )}
                {classInfo.schedules.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">
                    {dayLabels[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                ))}
                <span className="text-gray-400 text-sm">
                  <Users className="w-4 h-4 inline mr-1" />
                  {classInfo.current_enrollment}/{classInfo.capacity || '—'} alunos
                </span>
                {rating && rating.total > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400 text-sm">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    {rating.avg!.toFixed(1)} <span className="text-gray-400 text-xs">({rating.total} avaliações)</span>
                  </span>
                )}
              </div>
              {/* Criteria badges */}
              {(classInfo.min_age != null || classInfo.max_age != null || classInfo.min_kyu_dan_id != null || classInfo.max_kyu_dan_id != null) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(classInfo.min_age != null || classInfo.max_age != null) && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                      Idade: {classInfo.min_age ?? '—'}–{classInfo.max_age ?? '—'} anos
                    </span>
                  )}
                  {(classInfo.min_kyu_dan_id != null || classInfo.max_kyu_dan_id != null) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30">
                      Graduação: faixa {classInfo.min_kyu_dan_id ?? '—'}–{classInfo.max_kyu_dan_id ?? '—'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Enrolled athletes */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Atletas na Turma
            <span className="ml-auto text-sm font-normal text-gray-400">{enrolled.length} matriculados</span>
          </h2>
          {enrolled.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
              Nenhum atleta matriculado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {enrolled.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/8 transition-colors">
                  <div>
                    <p className="text-white font-medium text-sm">{a.nome_completo}</p>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    disabled={actionId === a.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Remover da turma"
                  >
                    {actionId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Add athletes */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-400" />
            Adicionar Atletas
          </h2>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
          </div>

          {classInfo && (classInfo.min_age != null || classInfo.max_age != null || classInfo.min_kyu_dan_id != null || classInfo.max_kyu_dan_id != null) && (
            <button
              onClick={() => setFilterByCriteria(v => !v)}
              className={`mb-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterByCriteria
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrar por critérios da turma
            </button>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {searchResults.length === 0 && !searchLoading && (
              <div className="text-center text-gray-400 py-8 text-sm">
                {search ? 'Nenhum atleta encontrado' : 'Digite para buscar atletas da academia'}
              </div>
            )}
            {searchResults.map((a) => (
              <div key={a.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors ${
                a.enrolled
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/8'
              }`}>
                <div>
                  <p className="text-white font-medium text-sm">{a.nome_completo}</p>
                  {a.graduacao && <p className="text-gray-400 text-xs mt-0.5">{a.graduacao}</p>}
                </div>
                {a.enrolled ? (
                  <span className="text-green-400 text-xs font-medium px-2 py-1 rounded-full bg-green-500/20">
                    Matriculado
                  </span>
                ) : (
                  <button
                    onClick={() => enroll(a.id)}
                    disabled={actionId === a.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {actionId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    Adicionar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
