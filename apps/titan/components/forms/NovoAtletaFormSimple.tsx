'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const GRADUACOES = [
  'BRANCA | MÚKYŪ',
  'CINZA | NANA-KYU',
  'AZUL | ROKKYŪ',
  'AMARELA | GOKYŪ',
  'LARANJA | YONKYŪ',
  'VERDE | SANKYŪ',
  'ROXA | NIKYŪ',
  'MARROM | IKKYŪ',
  'FAIXA PRETA | YUDANSHA',
  'FAIXA VERMELHA/BRANCA | KODANSHA',
]

const DAN_NIVEIS = ['SHODAN', 'NIDAN', 'SANDAN', 'YONDAN', 'GODAN', 'ROKUDAN', 'NANADAN', 'HACHIDAN']

const NIVEIS_ARBITRAGEM = [
  'Estadual C',
  'Estadual B',
  'Estadual A',
  'Nacional C',
  'Nacional B',
  'Nacional A',
  'Internacional C',
  'Internacional B',
  'Internacional A',
]

const TAMANHOS_BN = [
  'PEQUENO AZUL (28 cm2) - recomendado até 9 anos',
  'PEQUENO ROSA (28 cm2) - recomendado até 9 anos',
  'MÉDIO (34 cm2)',
  'GRANDE (41 cm2)',
]

interface NovoAtletaFormSimpleProps {
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
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    genero: '',
    email: '',
    celular: '',
    instagram: '',
    graduacao: '',
    dan_nivel: '',
    nivel_arbitragem: '',
    academia_id: academiaId || '',
    lote: new Date().getFullYear() + ' 1',
    backnumber_tamanho: '',
    backnumber_nome: '',
    backnumber_dourado: false,
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const uploadData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          uploadData.append(key, String(value))
        }
      })
      uploadData.append('federacao_id', federacaoId)

      const response = await fetch('/api/atletas', {
        method: 'POST',
        body: uploadData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao cadastrar atleta')
      }

      const result = await response.json()
      alert(`Atleta cadastrado com sucesso!\nNúmero de registro: ${result.numero_registro}`)
      router.push('/atletas')
      router.refresh()
    } catch (error) {
      console.error('Erro:', error)
      alert(error instanceof Error ? error.message : 'Erro ao cadastrar atleta')
    } finally {
      setLoading(false)
    }
  }

  const isFaixaPreta = formData.graduacao.includes('FAIXA PRETA') || formData.graduacao.includes('KODANSHA')
  const isAdmin = role === 'federacao_admin' || role === 'academia_admin'

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

      {/* Dados Pessoais */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Dados Pessoais</h3>

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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gênero *</label>
          <select
            required
            value={formData.genero}
            onChange={(e) => handleChange('genero', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>

      {/* Contato */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Contato</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular *</label>
            <input
              type="tel"
              required
              placeholder="(00) 00000-0000"
              value={formData.celular}
              onChange={(e) => handleChange('celular', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <input
              type="text"
              placeholder="@usuario"
              value={formData.instagram}
              onChange={(e) => handleChange('instagram', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Graduação */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Graduação e Certificações</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Graduação *</label>
          <select
            required
            value={formData.graduacao}
            onChange={(e) => handleChange('graduacao', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione a faixa...</option>
            {GRADUACOES.map((grad) => (
              <option key={grad} value={grad}>
                {grad}
              </option>
            ))}
          </select>
          {formData.graduacao && (formData.graduacao.includes('FAIXA PRETA') || formData.graduacao.includes('KODANSHA')) && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Graduações de faixa preta e superiores precisam de aprovação da federação
            </p>
          )}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Arbitragem</label>
          <select
            value={formData.nivel_arbitragem}
            onChange={(e) => handleChange('nivel_arbitragem', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Nenhum</option>
            {NIVEIS_ARBITRAGEM.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
          {formData.nivel_arbitragem && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Níveis de arbitragem precisam de aprovação da federação
            </p>
          )}
        </div>
      </div>

      {/* Kit de Filiação */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Kit de Filiação</h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm text-blue-900 font-medium">O kit de filiação inclui:</p>
          <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
            <li>Identidade Esportiva</li>
            <li>Certificado de Graduação</li>
            <li>Backnumber (Patch)</li>
          </ul>
        </div>

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

        <div className="border-t pt-4 mt-4">
          <h4 className="text-md font-semibold mb-3">Backnumber (Patch)</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tamanho do Patch
            </label>
            <select
              value={formData.backnumber_tamanho}
              onChange={(e) => handleChange('backnumber_tamanho', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o tamanho</option>
              {TAMANHOS_BN.map((tamanho) => (
                <option key={tamanho} value={tamanho}>
                  {tamanho}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Tamanho do patch para as costas do casaco do judogi
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome no Patch
            </label>
            <input
              type="text"
              maxLength={14}
              placeholder="Máximo 14 caracteres"
              value={formData.backnumber_nome}
              onChange={(e) => handleChange('backnumber_nome', e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
              <p className="text-xs text-yellow-900 font-medium mb-1">
                ⚠️ ATENÇÃO - NOME NO BACKNUMBER (PATCH):
              </p>
              <p className="text-xs text-yellow-800">
                O NOME NO PATCH DEVERÁ SER INFORMADO COM NO MÁXIMO 14 CARACTERES (LETRAS E ESPAÇOS). 
                NOME /OU/ SOBRENOME /OU/ NOME E SOBRENOME /OU/ INICIAL DO NOME E SOBRENOME.
              </p>
              <p className="text-xs text-red-700 font-semibold mt-1">
                * NÃO SERÃO ACEITOS SOBRENOMES ABREVIADOS OU APELIDOS.
              </p>
              {formData.backnumber_nome && (
                <p className="text-xs text-blue-700 mt-2">
                  Caracteres utilizados: {formData.backnumber_nome.length}/14
                </p>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="backnumber_dourado"
                checked={formData.backnumber_dourado}
                onChange={(e) => handleChange('backnumber_dourado', String(e.target.checked))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="backnumber_dourado" className="text-sm font-medium text-gray-700">
                BN DOURADO (apenas para administradores)
              </label>
            </div>
          )}
        </div>
      </div>

      {role === 'federacao_admin' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Academia</h3>
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
        </div>
      )}

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
