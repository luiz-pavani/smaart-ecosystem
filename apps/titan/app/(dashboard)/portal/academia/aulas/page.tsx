'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, FileText, FileSpreadsheet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NovaAulaModal } from '@/components/modals/NovaAulaModal'
import { exportAulasToPDF } from '@/lib/export/pdf'
import { exportAulasToExcel } from '@/lib/export/excel'
import { SearchShortcut } from '@/components/command-palette/SearchShortcut'

interface AulaItem {
  id: string
  name: string
  location: string | null
  capacity: number | null
  current_enrollment: number | null
  schedules: { start_time: string; end_time: string; day_of_week: number }[]
}

const dayLabels: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terca',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sabado',
}

export default function AulasAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [aulas, setAulas] = useState<AulaItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [academiaId, setAcademiaId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: role } = await supabase
          .from('user_roles')
          .select('academia_id')
          .eq('user_id', user.id)
          .not('academia_id', 'is', null)
          .limit(1)
          .single()

        if (!role?.academia_id) return
        
        setAcademiaId(role.academia_id)

        const { data } = await supabase
          .from('classes')
          .select('id, name, location, capacity, current_enrollment, class_schedules(start_time, end_time, day_of_week)')
          .eq('academy_id', role.academia_id)
          .eq('is_active', true)
          .order('name', { ascending: true })

        const mapped = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          location: item.location,
          capacity: item.capacity,
          current_enrollment: item.current_enrollment,
          schedules: item.class_schedules || [],
        }))

        setAulas(mapped)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  const aulasPorDia = aulas.reduce<Record<string, AulaItem[]>>((acc, aula) => {
    aula.schedules.forEach((schedule) => {
      const label = dayLabels[schedule.day_of_week] || `Dia ${schedule.day_of_week}`
      acc[label] = acc[label] || []
      acc[label].push({ ...aula, schedules: [schedule] })
    })
    return acc
  }, {})

  const diasOrdenados = Object.keys(aulasPorDia).sort((a, b) => {
    const indexA = Object.values(dayLabels).indexOf(a)
    const indexB = Object.values(dayLabels).indexOf(b)
    return indexA - indexB
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Aulas & Horarios</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Toolbar */}
        <div className="flex gap-3 mb-8">
          <SearchShortcut />
          <button
            onClick={() => exportAulasToPDF(aulas.flatMap(a => a.schedules.map(s => ({ ...a, ...s }))))}
            disabled={aulas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar PDF"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => exportAulasToExcel(aulas.flatMap(a => a.schedules.map(s => ({ ...a, ...s }))))}
            disabled={aulas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <div className="flex-1" />
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Nova Aula
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : diasOrdenados.length === 0 ? (
          <div className="text-gray-400">Nenhuma aula cadastrada.</div>
        ) : (
          <div className="space-y-6">
            {diasOrdenados.map((dia) => (
              <div key={dia} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                  <h3 className="font-semibold text-white">{dia}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {aulasPorDia[dia].map((aula) => {
                    const schedule = aula.schedules[0]
                    return (
                      <div key={`${aula.id}-${schedule.start_time}`} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div>
                          <p className="font-semibold text-white">{schedule.start_time} - {schedule.end_time}</p>
                          <p className="text-gray-400 text-sm">
                            {aula.name} • {aula.location || 'Sala nao definida'} • {aula.current_enrollment || 0}/{aula.capacity || '—'} alunos
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal */}
      {academiaId && (
        <NovaAulaModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          academiaId={academiaId}
          onSuccess={() => load()}
        />
      )}
    </div>
  )

  async function load() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: role } = await supabase
        .from('user_roles')
        .select('academia_id')
        .eq('user_id', user.id)
        .not('academia_id', 'is', null)
        .limit(1)
        .single()

      if (!role?.academia_id) return
      
      setAcademiaId(role.academia_id)

      const { data } = await supabase
        .from('classes')
        .select('id, name, location, capacity, current_enrollment, class_schedules(start_time, end_time, day_of_week)')
        .eq('academy_id', role.academia_id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        location: item.location,
        capacity: item.capacity,
        current_enrollment: item.current_enrollment,
        schedules: item.class_schedules || [],
      }))

      setAulas(mapped)
    } finally {
      setLoading(false)
    }
  }
}
