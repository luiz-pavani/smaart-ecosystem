'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface NovoAtletaFormSimpleProps {
  academiasDisponiveis?: Array<{ id: string; nome: string }>
  academias?: Array<{ id: string; nome: string }>
  usuarioId?: string
  usuarioRole?: string
  federacaoId?: string
  academiaId?: string
  role?: string
}

export default function NovoAtletaFormSimple({
  academiasDisponiveis,
  academias,
  usuarioId,
  usuarioRole,
  federacaoId,
  academiaId,
  role,
}: NovoAtletaFormSimpleProps) {
  const listaAcademias = academiasDisponiveis || academias || []
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const data = {
        federacao_id: federacaoId,
        academia_id: formData.get('academia_id'),
        nome_completo: formData.get('nome_completo'),
        cpf: formData.get('cpf'),
        data_nascimento: formData.get('data_nascimento'),
        genero: formData.get('genero'),
        email: formData.get('email'),
        celular: formData.get('celular'),
        graduacao: formData.get('graduacao'),
      }

      const response = await fetch('/api/atletas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar atleta')
      }

      router.push('/atletas')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nome_completo" className="block text-sm font-medium mb-2">
            Nome Completo
          </label>
          <input
            type="text"
            id="nome_completo"
            name="nome_completo"
            required
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="Nome completo"
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
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="000.000.000-00"
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
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="email@example.com"
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
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="(11) 99999-9999"
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
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="">Selecione</option>
            <option value="BRANCA|MÚKYŪ">Branca</option>
            <option value="CINZA|NANA-KYU">Cinza</option>
            <option value="AZUL|ROKKYŪ">Azul</option>
            <option value="AMARELA|GOKYÚ">Amarela</option>
            <option value="LARANJA|YONKYŪ">Laranja</option>
            <option value="VERDE|SANKYŪ">Verde</option>
            <option value="ROXA|NIKYŪ">Roxa</option>
            <option value="MARROM|IKKYŪ">Marrom</option>
            <option value="FAIXA PRETA|YUDANSHA">Faixa Preta</option>
          </select>
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Cadastrar Atleta'}
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
