'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

const aulaSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  location: z.string().optional(),
  capacity: z.number().min(1, 'Capacidade deve ser maior que 0').optional(),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, 'Horário de início é obrigatório'),
  end_time: z.string().min(1, 'Horário de término é obrigatório'),
})

type AulaFormData = z.infer<typeof aulaSchema>

interface NovaAulaModalProps {
  isOpen: boolean
  onClose: () => void
  academiaId: string
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

export function NovaAulaModal({ isOpen, onClose, academiaId, onSuccess }: NovaAulaModalProps) {
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AulaFormData>({
    resolver: zodResolver(aulaSchema),
  })

  const onSubmit = async (data: AulaFormData) => {
    try {
      setLoading(true)

      // Create class
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .insert({
          name: data.name,
          location: data.location || null,
          capacity: data.capacity || null,
          academy_id: academiaId,
          is_active: true,
          current_enrollment: 0,
        })
        .select()
        .single()

      if (classError) throw classError

      // Create schedule
      const { error: scheduleError } = await supabase
        .from('class_schedules')
        .insert({
          class_id: classData.id,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
        })

      if (scheduleError) throw scheduleError

      showToast('success', 'Aula cadastrada com sucesso!')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast('error', error.message || 'Erro ao cadastrar aula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Aula" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome da Aula *
          </label>
          <input
            {...register('name')}
            type="text"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Judô Infantil"
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Local */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Local</label>
          <input
            {...register('location')}
            type="text"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Tatame Principal"
          />
        </div>

        {/* Capacidade */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Capacidade Máxima
          </label>
          <input
            {...register('capacity', { valueAsNumber: true })}
            type="number"
            min="1"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="20"
          />
          {errors.capacity && (
            <p className="text-red-400 text-xs mt-1">{errors.capacity.message}</p>
          )}
        </div>

        {/* Dia da Semana */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Dia da Semana *
          </label>
          <select
            {...register('day_of_week', { valueAsNumber: true })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">Selecione...</option>
            {dias.map((dia) => (
              <option key={dia.value} value={dia.value}>
                {dia.label}
              </option>
            ))}
          </select>
          {errors.day_of_week && (
            <p className="text-red-400 text-xs mt-1">{errors.day_of_week.message}</p>
          )}
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Horário Início *
            </label>
            <input
              {...register('start_time')}
              type="time"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            {errors.start_time && (
              <p className="text-red-400 text-xs mt-1">{errors.start_time.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Horário Término *
            </label>
            <input
              {...register('end_time')}
              type="time"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            {errors.end_time && (
              <p className="text-red-400 text-xs mt-1">{errors.end_time.message}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Cadastrar Aula'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
