'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DAN_NIVEIS } from '@/lib/utils/graduacao'
import { createClient } from '@/lib/supabase/client'

export interface NovoAtletaFormSimpleProps {
  academiasDisponiveis: Array<{ id: string; nome: string }>
  federacaoId: string
  academiaId?: string
  role: string
}

export default function NovoAtletaFormSimple({
  academiasDisponiveis,
  federacaoId,
  academiaId,
  role,
}: NovoAtletaFormSimpleProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [graduacoes, setGraduacoes] = useState<Array<{ id: number; cor_faixa: string; kyu_dan: string }>>([])

  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    graduacao: '',
    dan_nivel: '',
    academia_id: academiaId || '',
    lote: new Date().getFullYear() + ' 1',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    const loadGraduacoes = async () => {
      const { data } = await supabase
        .from('kyu_dan')
        .select('id, cor_faixa, kyu_dan')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      setGraduacoes((data as Array<{ id: number; cor_faixa: string; kyu_dan: string }>) || [])
    }

    loadGraduacoes()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const uploadData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        uploadData.append(key, value)
      })
      uploadData.append('federacao_id', federacaoId)

      // Determine federation initials
      const fedInitials = federacaoId === 'LRSJ_UUID' ? 'lrsj' : 'other'; // Replace logic as needed
      const response = await fetch(`/api/user_fed_${fedInitials}`, {
        method: 'POST',
        body: uploadData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao cadastrar atleta')
      }

      const result = await response.json()
      alert(`Atleta cadastrado com sucesso!\nNúmero de registro: ${result.numero_registro}`)
      router.push(`/user_fed_${fedInitials}`)
      router.refresh()
    } catch (error) {
      console.error('Erro:', error)
      alert(error instanceof Error ? error.message : 'Erro ao cadastrar atleta')
    } finally {
      setLoading(false)
    }
  }

  const isFaixaPreta = formData.graduacao.toLowerCase().includes('dan') || formData.graduacao.toLowerCase().includes('preta') || formData.graduacao.toLowerCase().includes('vermelha')

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/atletas">
            <button type="button" className="text-gray-600 hover:text-gray-900">
              ← Voltar
            </button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold">Novo Atleta</h2>
            <p className="text-gray-600">Preencha os dados do atleta</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Salvando...' : 'Salvar Atleta'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Dados Básicos</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            required
            value={formData.nome_completo}
            onChange={(e) => handleChange('nome_completo', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
          <input
            type="text"
            required
            maxLength={14}
            placeholder="000.000.000-00"
            value={formData.cpf}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, '')
              if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2')
                value = value.replace(/(\d{3})(\d)/, '$1.$2')
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
              }
              handleChange('cpf', value)
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Nascimento *
          </label>
          <input
            type="date"
            required
            value={formData.data_nascimento}
            onChange={(e) => handleChange('data_nascimento', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Graduação *</label>
          <select
            required
            value={formData.graduacao}
            onChange={(e) => handleChange('graduacao', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione a faixa...</option>
            {graduacoes.map((grad) => (
              <option key={grad.id} value={`${grad.cor_faixa}|${grad.kyu_dan}`}>
                {grad.cor_faixa} | {grad.kyu_dan}
              </option>
            ))}
          </select>
        </div>

        {isFaixaPreta && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qual seu dan?</label>
            <select
              value={formData.dan_nivel}
              onChange={(e) => handleChange('dan_nivel', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o dan...</option>
              {DAN_NIVEIS.map((dan) => (
                <option key={dan} value={dan}>
                  {dan}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === 'federacao_admin' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academia *</label>
            <select
              required
              value={formData.academia_id}
              onChange={(e) => handleChange('academia_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione a academia...</option>
              {academiasDisponiveis.map((academia) => (
                <option key={academia.id} value={academia.id}>
                  {academia.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
          <input
            type="text"
            placeholder="Ex: 2026 1"
            value={formData.lote}
            onChange={(e) => handleChange('lote', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Link href="/atletas">
          <button
            type="button"
            className="text-gray-600 hover:text-gray-900 px-4 py-2"
          >
            Cancelar
          </button>
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Salvando...' : 'Salvar Atleta'}
        </button>
      </div>
    </form>
  )
}
