'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

const atletaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional().or(z.literal('')),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  graduacao: z.string().min(1, 'Graduação é obrigatória'),
  status: z.string(),
})

type AtletaFormData = z.infer<typeof atletaSchema>

interface NovoAtletaModalProps {
  isOpen: boolean
  onClose: () => void
  academiaId: string
  onSuccess: () => void
}

export function NovoAtletaModal({ isOpen, onClose, academiaId, onSuccess }: NovoAtletaModalProps) {
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AtletaFormData>({
    resolver: zodResolver(atletaSchema),
  })

  const onSubmit = async (data: AtletaFormData) => {
    try {
      setLoading(true)

      // Get user's federacao_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: role } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .single()

      const { error } = await supabase.from('atletas').insert({
        nome: data.nome,
        cpf: data.cpf || null,
        data_nascimento: data.data_nascimento,
        graduacao: data.graduacao,
        status: data.status,
        academia_id: academiaId,
        federacao_id: role?.federacao_id || null,
      })

      if (error) throw error

      showToast('success', 'Atleta cadastrado com sucesso!')
      reset()
      onClose()
      onSuccess()
    } catch (error: any) {
      showToast('error', error.message || 'Erro ao cadastrar atleta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Atleta" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome Completo *
          </label>
          <input
            {...register('nome')}
            type="text"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="João da Silva"
          />
          {errors.nome && (
            <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>
          )}
        </div>

        {/* CPF */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">CPF</label>
          <input
            {...register('cpf')}
            type="text"
            maxLength={11}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="12345678901"
          />
          {errors.cpf && (
            <p className="text-red-400 text-xs mt-1">{errors.cpf.message}</p>
          )}
        </div>

        {/* Data Nascimento */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Data de Nascimento *
          </label>
          <input
            {...register('data_nascimento')}
            type="date"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          {errors.data_nascimento && (
            <p className="text-red-400 text-xs mt-1">{errors.data_nascimento.message}</p>
          )}
        </div>

        {/* Graduação */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Graduação *
          </label>
          <select
            {...register('graduacao')}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Selecione...</option>
            <option value="Branca">Branca</option>
            <option value="Cinza">Cinza</option>
            <option value="Azul">Azul</option>
            <option value="Amarela">Amarela</option>
            <option value="Laranja">Laranja</option>
            <option value="Verde">Verde</option>
            <option value="Roxa">Roxa</option>
            <option value="Marrom">Marrom</option>
            <option value="Preta">Preta</option>
          </select>
          {errors.graduacao && (
            <p className="text-red-400 text-xs mt-1">{errors.graduacao.message}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select
            {...register('status')}
            defaultValue="Ativo"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Suspenso">Suspenso</option>
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
              'Cadastrar Atleta'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
