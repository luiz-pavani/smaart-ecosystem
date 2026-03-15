'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, FileText, FileSpreadsheet, CalendarDays, User } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { NovaAulaModal } from '@/components/modals/NovaAulaModal'
import { EditAulaModal, type AulaToEdit } from '@/components/modals/EditAulaModal'
import { exportAulasToPDF } from '@/lib/export/pdf'
import { exportAulasToExcel } from '@/lib/export/excel'
import { exportAulasToCalendar } from '@/lib/export/calendar'
import { SearchShortcut } from '@/components/command-palette/SearchShortcut'

interface AulaItem {
  id: string
  name: string
  location: string | null
  capacity: number | null
  current_enrollment: number | null
  instructor_name: string | null
  min_age: number | null
  max_age: number | null
  min_kyu_dan_id: number | null
  max_kyu_dan_id: number | null
  schedules: { start_time: string; end_time: string; day_of_week: number }[]
}

const dayLabels: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
}
const dayOrder = [1, 2, 3, 4, 5, 6, 0]

export default function AulasAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aulas, setAulas] = useState<AulaItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingAula, setEditingAula] = useState<AulaToEdit | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [academiaId, setAcademiaId] = useState<string | null>(null)

  // Filters
  const [filterLocal, setFilterLocal] = useState('')
  const [filterDia, setFilterDia] = useState<number | null>(null)
  const [filterProfessor, setFilterProfessor] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Usuário não autenticado'); return }

        const resolvedId = await resolveAcademiaId(supabase)
        if (!resolvedId) { setError('Academia não encontrada. Selecione uma academia no portal.'); return }

        setAcademiaId(resolvedId)
        await fetchAulas(resolvedId)
      } catch {
        setError('Não foi possível carregar as aulas da academia')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [supabase])

  async function fetchAulas(resolvedId: string) {
    const baseQuery = () => supabase
      .from('classes')
      .select('id, name, location, capacity, current_enrollment, class_schedules(start_time, end_time, day_of_week)')
      .eq('academy_id', resolvedId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    // Try with all extra columns; fall back to base if any column missing
    const withExtras = await supabase
      .from('classes')
      .select('id, name, location, capacity, current_enrollment, instructor_name, min_age, max_age, min_kyu_dan_id, max_kyu_dan_id, class_schedules(start_time, end_time, day_of_week)')
      .eq('academy_id', resolvedId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    let rows: any[]
    if (withExtras.error) {
      const fallback = await baseQuery()
      if (fallback.error) { setAulas([]); return }
      rows = (fallback.data as any[]) || []
    } else {
      rows = (withExtras.data as any[]) || []
    }

    setAulas(rows.map((item: any) => ({
      id: item.id,
      name: item.name,
      location: item.location,
      capacity: item.capacity,
      current_enrollment: item.current_enrollment,
      instructor_name: item.instructor_name || null,
      min_age: item.min_age ?? null,
      max_age: item.max_age ?? null,
      min_kyu_dan_id: item.min_kyu_dan_id ?? null,
      max_kyu_dan_id: item.max_kyu_dan_id ?? null,
      schedules: item.class_schedules || [],
    })))
  }

  async function load() {
    try {
      setLoading(true)
      const resolvedId = academiaId || await resolveAcademiaId(supabase)
      if (!resolvedId) return
      setAcademiaId(resolvedId)
      await fetchAulas(resolvedId)
    } finally {
      setLoading(false)
    }
  }

  // Derived filter options
  const locais = useMemo(() =>
    [...new Set(aulas.map(a => a.location).filter(Boolean) as string[])].sort(),
    [aulas]
  )
  const professores = useMemo(() =>
    [...new Set(aulas.map(a => a.instructor_name).filter(Boolean) as string[])].sort(),
    [aulas]
  )

  // Apply filters
  const aulasFiltradas = useMemo(() => {
    return aulas.filter(a => {
      if (filterLocal && a.location !== filterLocal) return false
      if (filterProfessor && a.instructor_name !== filterProfessor) return false
      if (filterDia !== null && !a.schedules.some(s => s.day_of_week === filterDia)) return false
      return true
    })
  }, [aulas, filterLocal, filterProfessor, filterDia])

  const aulasPorDia = useMemo(() => {
    const map: Record<string, AulaItem[]> = {}
    aulasFiltradas.forEach(aula => {
      aula.schedules.forEach(schedule => {
        if (filterDia !== null && schedule.day_of_week !== filterDia) return
        const label = dayLabels[schedule.day_of_week] || `Dia ${schedule.day_of_week}`
        map[label] = map[label] || []
        map[label].push({ ...aula, schedules: [schedule] })
      })
    })
    return map
  }, [aulasFiltradas, filterDia])

  const diasOrdenados = Object.keys(aulasPorDia).sort((a, b) => {
    const iA = dayOrder.indexOf(Object.entries(dayLabels).find(([, v]) => v === a)?.[0] as any)
    const iB = dayOrder.indexOf(Object.entries(dayLabels).find(([, v]) => v === b)?.[0] as any)
    return iA - iB
  })

  const handleDelete = async (aulaId: string) => {
    if (!confirm('Excluir esta aula? Esta ação não pode ser desfeita.')) return
    setDeletingId(aulaId)
    try {
      await supabase.from('class_schedules').delete().eq('class_id', aulaId)
      await supabase.from('classes').update({ is_active: false }).eq('id', aulaId)
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  const hasFilters = filterLocal || filterDia !== null || filterProfessor

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Aulas & Horários</h1>
          <p className="text-gray-400 mt-1">Organize turmas, horários e capacidade</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <SearchShortcut />
          <button
            onClick={() => exportAulasToPDF(aulas.flatMap(a => a.schedules.map(s => ({ ...a, ...s }))))}
            disabled={aulas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => exportAulasToExcel(aulas.flatMap(a => a.schedules.map(s => ({ ...a, ...s }))))}
            disabled={aulas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => exportAulasToCalendar(aulas)}
            disabled={aulas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarDays className="w-4 h-4" /> Calendário
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" /> Nova Aula
          </button>
        </div>

        {/* Filters */}
        {aulas.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 space-y-3">
            {/* Day toggle */}
            <div className="flex flex-wrap gap-2">
              {dayOrder.map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDia(filterDia === d ? null : d)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors ${
                    filterDia === d
                      ? 'bg-purple-500/30 border-purple-500/60 text-purple-200'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                  }`}
                >
                  {dayLabels[d].slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Location filter */}
              <select
                value={filterLocal}
                onChange={e => setFilterLocal(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Todos os locais</option>
                {locais.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              {/* Professor filter */}
              <select
                value={filterProfessor}
                onChange={e => setFilterProfessor(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Todos os professores</option>
                {professores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              {hasFilters && (
                <button
                  onClick={() => { setFilterDia(null); setFilterLocal(''); setFilterProfessor('') }}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-200 font-medium mb-3">{error}</p>
            <button onClick={() => load()} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : diasOrdenados.length === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-12 text-center">
            {hasFilters ? (
              <>
                <h3 className="text-white text-lg font-semibold mb-2">Nenhuma aula com esses filtros</h3>
                <button onClick={() => { setFilterDia(null); setFilterLocal(''); setFilterProfessor('') }} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <h3 className="text-white text-lg font-semibold mb-2">Nenhuma aula cadastrada</h3>
                <p className="text-gray-400 mb-4">Crie a primeira aula para começar a organizar a academia.</p>
                <button onClick={() => setShowModal(true)} className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium">
                  Nova Aula
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {diasOrdenados.map((dia) => (
              <div key={dia} className="bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-white">{dia}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {aulasPorDia[dia].map((aula) => {
                    const schedule = aula.schedules[0]
                    return (
                      <div key={`${aula.id}-${schedule.start_time}`} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                        {/* Time badge */}
                        <div className="shrink-0 text-center w-20">
                          <p className="text-purple-300 font-bold text-sm">{schedule.start_time.slice(0, 5)}</p>
                          <p className="text-gray-500 text-xs">{schedule.end_time.slice(0, 5)}</p>
                        </div>

                        {/* Main info — clickable */}
                        <button
                          onClick={() => router.push(`/portal/academia/aulas/${aula.id}`)}
                          className="text-left flex-1 min-w-0"
                        >
                          <p className="font-bold text-white text-base leading-tight">{aula.name}</p>
                          {aula.instructor_name && (
                            <p className="text-purple-400 text-sm flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" /> {aula.instructor_name}
                            </p>
                          )}
                          <p className="text-gray-400 text-xs mt-0.5">
                            {aula.location || 'Local não definido'} · <span className="text-gray-300">{aula.current_enrollment || 0}/{aula.capacity || '—'} alunos</span>
                          </p>
                        </button>

                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => { const full = aulas.find(a => a.id === aula.id); if (full) setEditingAula(full) }}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(aula.id)}
                            disabled={deletingId === aula.id}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {deletingId === aula.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {academiaId && (
        <NovaAulaModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          academiaId={academiaId}
          onSuccess={() => load()}
        />
      )}
      {editingAula && (
        <EditAulaModal
          isOpen={!!editingAula}
          onClose={() => setEditingAula(null)}
          aula={editingAula}
          onSuccess={() => { setEditingAula(null); load() }}
        />
      )}
    </div>
  )
}
