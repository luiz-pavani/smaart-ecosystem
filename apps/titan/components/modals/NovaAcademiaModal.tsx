'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

const academiaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  sigla: z.string().min(2, 'Sigla deve ter no mínimo 2 caracteres').optional().or(z.literal('')),
  cidade: z.string().min(2, 'Cidade deve ter no mínimo 2 caracteres'),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres'),
  status: z.string(),
})

type AcademiaFormData = z.infer<typeof academiaSchema>

interface NovaAcademiaModalProps {
  isOpen: boolean
  onClose: () => void
  federacaoId: string
  onSuccess: () => void
}

export function NovaAcademiaModal({ isOpen, onClose, federacaoId, onSuccess }: NovaAcademiaModalProps) {
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AcademiaFormData>({
    resolver: zodResolver(academiaSchema),
  })

  const onSubmit = async (data: AcademiaFormData) => {
    try {
      setLoading(true)

      const { error } = await supabase.from('academias').insert({
        nome: data.nome,
        sigla: data.sigla || null,
        cidade: data.cidade,
        estado: data.estado,
        status: data.status,
        federacao_id: federacaoId,
      })

      if (error) throw error

      showToast('success', 'Academia cadastrada com sucesso!')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast('error', error.message || 'Erro ao cadastrar academia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Academia" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome da Academia *
          </label>
          <input
            {...register('nome')}
            type="text"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Academia Bushido"
          />
          {errors.nome && (
            <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>
          )}
        </div>

        {/* Sigla */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sigla</label>
          <input
            {...register('sigla')}
            type="text"
            maxLength={10}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="BUSHIDO"
          />
          {errors.sigla && (
            <p className="text-red-400 text-xs mt-1">{errors.sigla.message}</p>
          )}
        </div>

        {/* Cidade e Estado */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cidade *
            </label>
            <input
              {...register('cidade')}
              type="text"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Porto Alegre"
            />
            {errors.cidade && (
              <p className="text-red-400 text-xs mt-1">{errors.cidade.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Estado *
            </label>
            <input
              {...register('estado')}
              type="text"
              maxLength={2}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors uppercase"
              placeholder="RS"
            />
            {errors.estado && (
              <p className="text-red-400 text-xs mt-1">{errors.estado.message}</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select
            {...register('status')}
            defaultValue="Ativa"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Ativa">Ativa</option>
            <option value="Inativa">Inativa</option>
            <option value="Suspensa">Suspensa</option>
          </select>
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
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Cadastrar Academia'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
