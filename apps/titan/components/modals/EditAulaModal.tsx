'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { CriteriosAulaSection } from './CriteriosAulaSection'

const aulaSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  location: z.string().optional(),
  capacity: z.number().min(1).optional(),
  instructor_name: z.string().optional(),
  days_of_week: z.array(z.number()).min(1, 'Selecione ao menos um dia'),
  start_time: z.string().min(1, 'Horário de início é obrigatório'),
  end_time: z.string().min(1, 'Horário de término é obrigatório'),
})

type AulaFormData = z.infer<typeof aulaSchema>

export interface AulaToEdit {
  id: string
  name: string
  location: string | null
  capacity: number | null
  instructor_name: string | null
  min_age: number | null
  max_age: number | null
  min_kyu_dan_id: number | null
  max_kyu_dan_id: number | null
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
}

interface EditAulaModalProps {
  isOpen: boolean
  onClose: () => void
  aula: AulaToEdit
  onSuccess: () => void
}

const dias = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

export function EditAulaModal({ isOpen, onClose, aula, onSuccess }: EditAulaModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [criterios, setCriterios] = useState({
    min_age: '', max_age: '', min_kyu_dan_id: '', max_kyu_dan_id: '',
  })
  const { showToast } = useToast()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<AulaFormData>({
    resolver: zodResolver(aulaSchema),
  })

  useEffect(() => {
    if (!aula) return
    const days = aula.schedules.map(s => s.day_of_week)
    const firstSchedule = aula.schedules[0]
    setSelectedDays(days)
    setCriterios({
      min_age: aula.min_age?.toString() || '',
      max_age: aula.max_age?.toString() || '',
      min_kyu_dan_id: aula.min_kyu_dan_id?.toString() || '',
      max_kyu_dan_id: aula.max_kyu_dan_id?.toString() || '',
    })
    reset({
      name: aula.name,
      location: aula.location || '',
      capacity: aula.capacity ?? undefined,
      instructor_name: aula.instructor_name || '',
      days_of_week: days,
      start_time: firstSchedule?.start_time.slice(0, 5) || '',
      end_time: firstSchedule?.end_time.slice(0, 5) || '',
    })
  }, [aula, reset])

  const toggleDay = (day: number) => {
    const updated = selectedDays.includes(day) ? selectedDays.filter(d => d !== day) : [...selectedDays, day]
    setSelectedDays(updated)
    setValue('days_of_week', updated)
  }

  const onSubmit = async (data: AulaFormData) => {
    try {
      setLoading(true)

      const { error: classError } = await supabase
        .from('classes')
        .update({
          name: data.name,
          location: data.location || null,
          capacity: data.capacity || null,
          instructor_name: data.instructor_name || null,
          min_age: criterios.min_age ? parseInt(criterios.min_age) : null,
          max_age: criterios.max_age ? parseInt(criterios.max_age) : null,
          min_kyu_dan_id: criterios.min_kyu_dan_id ? parseInt(criterios.min_kyu_dan_id) : null,
          max_kyu_dan_id: criterios.max_kyu_dan_id ? parseInt(criterios.max_kyu_dan_id) : null,
        })
        .eq('id', aula.id)

      if (classError) throw classError

      await supabase.from('class_schedules').delete().eq('class_id', aula.id)

      const { error: scheduleError } = await supabase
        .from('class_schedules')
        .insert(data.days_of_week.map(day => ({
          class_id: aula.id, day_of_week: day,
          start_time: data.start_time, end_time: data.end_time,
        })))

      if (scheduleError) throw scheduleError

      showToast('success', 'Aula atualizada com sucesso!')
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast('error', error.message || 'Erro ao atualizar aula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Aula" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Aula *</label>
          <input {...register('name')} type="text"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Local</label>
            <input {...register('location')} type="text"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Capacidade</label>
            <input {...register('capacity', { valueAsNumber: true })} type="number" min="1"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Professor / Instrutor</label>
          <input {...register('instructor_name')} type="text" placeholder="Nome do professor"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
        </div>

        <CriteriosAulaSection
          minAge={criterios.min_age} maxAge={criterios.max_age}
          minKyuDanId={criterios.min_kyu_dan_id} maxKyuDanId={criterios.max_kyu_dan_id}
          onChange={(field, value) => setCriterios(prev => ({ ...prev, [field]: value }))}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Dias da Semana *</label>
          <div className="flex flex-wrap gap-2">
            {dias.map(dia => (
              <button key={dia.value} type="button" onClick={() => toggleDay(dia.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedDays.includes(dia.value) ? 'bg-purple-500/30 border-purple-500/60 text-purple-200' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}>
                {dia.label}
              </button>
            ))}
          </div>
          {errors.days_of_week && <p className="text-red-400 text-xs mt-1">{errors.days_of_week.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Horário Início *</label>
            <input {...register('start_time')} type="time"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors" />
            {errors.start_time && <p className="text-red-400 text-xs mt-1">{errors.start_time.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Horário Término *</label>
            <input {...register('end_time')} type="time"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors" />
            {errors.end_time && <p className="text-red-400 text-xs mt-1">{errors.end_time.message}</p>}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
