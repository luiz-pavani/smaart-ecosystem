'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DAN_NIVEIS, GRADUACOES_DB } from '@/lib/utils/graduacao'

interface Atleta {
  id: string
  nome_completo: string
  cpf: string
  rg?: string | null
  data_nascimento: string
  genero?: string | null
  email?: string | null
  telefone?: string | null
  celular?: string | null
  graduacao: string
  dan_nivel?: string | null
  data_graduacao?: string | null
  numero_diploma_dan?: string | null
  nivel_arbitragem?: string | null
  academia_id: string
  cep?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  lote?: string | null
  observacoes?: string | null
  status?: string | null
  status_pagamento?: string | null
  foto_perfil_url?: string | null
}

interface EditarAtletaFormProps {
  atleta: Atleta
  academias?: Array<{ id: string; nome: string }>
  academiasDisponiveis?: Array<{ id: string; nome: string }>
  role?: string
}

const formatGraduacaoLabel = (graduacao: string) => {
  const beltPart = graduacao.split('|')[0]
  return beltPart
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function EditarAtletaForm({
  atleta,
  academias,
  academiasDisponiveis,
  role,
}: EditarAtletaFormProps) {
    const listaAcademias = academiasDisponiveis || academias || []
    const router = useRouter()
    // Track if form was submitted
    const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graduacaoValue, setGraduacaoValue] = useState(atleta.graduacao || '')
  const [danNivelValue, setDanNivelValue] = useState(atleta.dan_nivel || '')
  const [fotoPreview, setFotoPreview] = useState(atleta.foto_perfil_url || '')

  const graduacoesOptions = useMemo(() => {
    const values = new Set<string>(GRADUACOES_DB)
    if (atleta.graduacao) {
      values.add(atleta.graduacao)
    }
    return Array.from(values)
  }, [atleta.graduacao])

  const isFaixaPreta = graduacaoValue.includes('FAIXA PRETA') || graduacaoValue.includes('VERMELHA')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('graduacao', graduacaoValue)
      formData.set('dan_nivel', danNivelValue)

      const response = await fetch(`/api/atletas/${atleta.id}`, {
        method: 'PUT',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar atleta')
      }

      setSubmitted(true)
      // Use browser history to go back
      router.back()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="foto_perfil" className="block text-sm font-medium mb-2">
            Foto do Atleta
          </label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {fotoPreview ? (
                <img src={fotoPreview} alt={atleta.nome_completo} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Sem foto</span>
              )}
            </div>
            <input
              type="file"
              id="foto_perfil"
              name="foto_perfil"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const url = URL.createObjectURL(file)
                  setFotoPreview(url)
                }
              }}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label htmlFor="nome_completo" className="block text-sm font-medium mb-2">
            Nome Completo
          </label>
          <input
            type="text"
            id="nome_completo"
            name="nome_completo"
            required
            defaultValue={atleta.nome_completo}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="cpf" className="block text-sm font-medium mb-2">
            CPF
          </label>
          <input
            type="text"
            id="cpf"
            name="cpf"
            required
            defaultValue={atleta.cpf}
            readOnly
            className="w-full px-4 py-2 border rounded-lg bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="rg" className="block text-sm font-medium mb-2">
            RG
          </label>
          <input
            type="text"
            id="rg"
            name="rg"
            defaultValue={atleta.rg || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="data_nascimento" className="block text-sm font-medium mb-2">
            Data de Nascimento
          </label>
          <input
            type="date"
            id="data_nascimento"
            name="data_nascimento"
            required
            defaultValue={atleta.data_nascimento}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="genero" className="block text-sm font-medium mb-2">
            Gênero
          </label>
          <select
            id="genero"
            name="genero"
            defaultValue={atleta.genero || ''}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">Selecione</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            defaultValue={atleta.email || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="telefone" className="block text-sm font-medium mb-2">
            Telefone
          </label>
          <input
            type="tel"
            id="telefone"
            name="telefone"
            defaultValue={atleta.telefone || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="celular" className="block text-sm font-medium mb-2">
            Celular
          </label>
          <input
            type="tel"
            id="celular"
            name="celular"
            defaultValue={atleta.celular || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="academia_id" className="block text-sm font-medium mb-2">
            Academia
          </label>
          <select
            id="academia_id"
            name="academia_id"
            required
            defaultValue={atleta.academia_id}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">Selecione uma academia</option>
            {listaAcademias.map((academia) => (
              <option key={academia.id} value={academia.id}>
                {academia.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="graduacao" className="block text-sm font-medium mb-2">
            Graduação
          </label>
          <select
            id="graduacao"
            name="graduacao"
            required
            value={graduacaoValue}
            onChange={(e) => setGraduacaoValue(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">Selecione</option>
            {graduacoesOptions.map((grad) => (
              <option key={grad} value={grad}>
                {formatGraduacaoLabel(grad)}
              </option>
            ))}
          </select>
        </div>

        {isFaixaPreta && (
          <div>
            <label htmlFor="dan_nivel" className="block text-sm font-medium mb-2">
              Nível Dan
            </label>
            <select
              id="dan_nivel"
              name="dan_nivel"
              value={danNivelValue}
              onChange={(e) => setDanNivelValue(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Selecione</option>
              {DAN_NIVEIS.map((dan) => (
                <option key={dan} value={dan}>
                  {dan}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="data_graduacao" className="block text-sm font-medium mb-2">
            Data da Graduação
          </label>
          <input
            type="date"
            id="data_graduacao"
            name="data_graduacao"
            defaultValue={atleta.data_graduacao || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="numero_diploma_dan" className="block text-sm font-medium mb-2">
            Número do Diploma Dan
          </label>
          <input
            type="text"
            id="numero_diploma_dan"
            name="numero_diploma_dan"
            defaultValue={atleta.numero_diploma_dan || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="nivel_arbitragem" className="block text-sm font-medium mb-2">
            Nível de Arbitragem
          </label>
          <input
            type="text"
            id="nivel_arbitragem"
            name="nivel_arbitragem"
            defaultValue={atleta.nivel_arbitragem || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="lote" className="block text-sm font-medium mb-2">
            Lote
          </label>
          <input
            type="text"
            id="lote"
            name="lote"
            defaultValue={atleta.lote || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={atleta.status || 'ativo'}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="transferido">Transferido</option>
          </select>
        </div>

        <div>
          <label htmlFor="status_pagamento" className="block text-sm font-medium mb-2">
            Status de Pagamento
          </label>
          <select
            id="status_pagamento"
            name="status_pagamento"
            defaultValue={atleta.status_pagamento || 'pendente'}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="pendente">Pendente</option>
            <option value="em_dia">Em dia</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>

        <div>
          <label htmlFor="cep" className="block text-sm font-medium mb-2">
            CEP
          </label>
          <input
            type="text"
            id="cep"
            name="cep"
            defaultValue={atleta.cep || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="numero" className="block text-sm font-medium mb-2">
            Numero
          </label>
          <input
            type="text"
            id="numero"
            name="numero"
            defaultValue={atleta.numero || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="endereco" className="block text-sm font-medium mb-2">
            Endereco
          </label>
          <input
            type="text"
            id="endereco"
            name="endereco"
            defaultValue={atleta.endereco || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="complemento" className="block text-sm font-medium mb-2">
            Complemento
          </label>
          <input
            type="text"
            id="complemento"
            name="complemento"
            defaultValue={atleta.complemento || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="bairro" className="block text-sm font-medium mb-2">
            Bairro
          </label>
          <input
            type="text"
            id="bairro"
            name="bairro"
            defaultValue={atleta.bairro || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="cidade" className="block text-sm font-medium mb-2">
            Cidade
          </label>
          <input
            type="text"
            id="cidade"
            name="cidade"
            defaultValue={atleta.cidade || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium mb-2">
            Estado
          </label>
          <input
            type="text"
            id="estado"
            name="estado"
            defaultValue={atleta.estado || ''}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="observacoes" className="block text-sm font-medium mb-2">
            Observacoes
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            defaultValue={atleta.observacoes || ''}
            className="w-full px-4 py-2 border rounded-lg min-h-[96px]"
          />
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Atualizar Atleta'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
