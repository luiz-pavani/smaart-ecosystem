'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadAcademiaLogo, deleteAcademiaLogo } from '@/lib/supabase/storage'
import { CepInput } from '@/components/forms/CepInput'
import { ImageUpload } from '@/components/forms/ImageUpload'
import { ArrowLeft, Save } from 'lucide-react'

const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

export default function EditarAcademiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    nome: '',
    nome_fantasia: '',
    sigla: '',
    logo_url: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    endereco_cep: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    responsavel_nome: '',
    responsavel_cpf: '',
    responsavel_rg: '',
    responsavel_telefone: '',
    responsavel_email: '',
    responsavel_faixa: '',
    tecnico_nome: '',
    tecnico_cpf: '',
    tecnico_registro_profissional: '',
    tecnico_telefone: '',
    tecnico_email: '',
    horario_funcionamento: '',
    quantidade_alunos: 0,
  })

  useEffect(() => {
    loadAcademia()
  }, [id])

  const loadAcademia = async () => {
    try {
      const { data, error } = await supabase
        .from('academias')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        nome: data.nome || '',
        nome_fantasia: data.nome_fantasia || '',
        sigla: data.sigla || '',
        logo_url: data.logo_url || '',
        cnpj: data.cnpj || '',
        inscricao_estadual: data.inscricao_estadual || '',
        inscricao_municipal: data.inscricao_municipal || '',
        endereco_cep: data.endereco_cep || '',
        endereco_rua: data.endereco_rua || '',
        endereco_numero: data.endereco_numero || '',
        endereco_complemento: data.endereco_complemento || '',
        endereco_bairro: data.endereco_bairro || '',
        endereco_cidade: data.endereco_cidade || '',
        endereco_estado: data.endereco_estado || '',
        responsavel_nome: data.responsavel_nome || '',
        responsavel_cpf: data.responsavel_cpf || '',
        responsavel_rg: data.responsavel_rg || '',
        responsavel_telefone: data.responsavel_telefone || '',
        responsavel_email: data.responsavel_email || '',
        responsavel_faixa: data.responsavel_faixa || '',
        tecnico_nome: data.tecnico_nome || '',
        tecnico_cpf: data.tecnico_cpf || '',
        tecnico_registro_profissional: data.tecnico_registro_profissional || '',
        tecnico_telefone: data.tecnico_telefone || '',
        tecnico_email: data.tecnico_email || '',
        horario_funcionamento: data.horario_funcionamento || '',
        quantidade_alunos: data.quantidade_alunos || 0,
      })

      setOriginalLogoUrl(data.logo_url)
    } catch (error) {
      console.error('Erro ao carregar academia:', error)
      alert('Erro ao carregar academia')
      router.push('/academias')
    } finally {
      setLoading(false)
    }
  }

  const handleAddressFound = (address: any) => {
    setFormData(prev => ({
      ...prev,
      endereco_rua: address.rua || '',
      endereco_bairro: address.bairro || '',
      endereco_cidade: address.cidade || '',
      endereco_estado: address.estado || '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      let logoUrl = formData.logo_url

      // Se houver nova logo para fazer upload
      if (logoFile) {
        // Deletar logo antiga se existir
        if (originalLogoUrl) {
          await deleteAcademiaLogo(originalLogoUrl)
        }
        
        // Upload nova logo
        logoUrl = await uploadAcademiaLogo(logoFile, id)
      }

      // Atualizar academia
      const { error } = await supabase
        .from('academias')
        .update({
          ...formData,
          logo_url: logoUrl,
        })
        .eq('id', id)

      if (error) throw error

      alert('Academia atualizada com sucesso!')
      router.push(`/academias/${id}`)
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      alert('Erro ao atualizar academia')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Editar Academia</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Entidade */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Dados da Entidade</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Academia *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sigla (3 letras) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={formData.sigla}
                    onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo da Academia
                  </label>
                  <ImageUpload
                    value={formData.logo_url}
                    onFileSelected={setLogoFile}
                    onChange={(url) => setFormData({ ...formData, logo_url: url })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inscrição Estadual
                  </label>
                  <input
                    type="text"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Endereço</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CEP *
                  </label>
                  <CepInput
                    value={formData.endereco_cep}
                    onChange={(cep) => setFormData({ ...formData, endereco_cep: cep })}
                    onAddressFound={handleAddressFound}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rua *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_rua}
                    onChange={(e) => setFormData({ ...formData, endereco_rua: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_numero}
                    onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.endereco_complemento}
                    onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_bairro}
                    onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_cidade}
                    onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado *
                  </label>
                  <select
                    required
                    value={formData.endereco_estado}
                    onChange={(e) => setFormData({ ...formData, endereco_estado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    {ESTADOS_BRASILEIROS.map(estado => (
                      <option key={estado.sigla} value={estado.sigla}>
                        {estado.sigla} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Responsável Principal */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Responsável Principal</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsavel_nome}
                    onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsavel_cpf}
                    onChange={(e) => setFormData({ ...formData, responsavel_cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RG
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel_rg}
                    onChange={(e) => setFormData({ ...formData, responsavel_rg: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.responsavel_telefone}
                    onChange={(e) => setFormData({ ...formData, responsavel_telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.responsavel_email}
                    onChange={(e) => setFormData({ ...formData, responsavel_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Faixa
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel_faixa}
                    onChange={(e) => setFormData({ ...formData, responsavel_faixa: e.target.value })}
                    placeholder="Ex: Preta 3º Grau"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Responsável Técnico */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Responsável Técnico (Opcional)</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.tecnico_nome}
                    onChange={(e) => setFormData({ ...formData, tecnico_nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.tecnico_cpf}
                    onChange={(e) => setFormData({ ...formData, tecnico_cpf: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registro Profissional
                  </label>
                  <input
                    type="text"
                    value={formData.tecnico_registro_profissional}
                    onChange={(e) => setFormData({ ...formData, tecnico_registro_profissional: e.target.value })}
                    placeholder="Ex: CREF 123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.tecnico_telefone}
                    onChange={(e) => setFormData({ ...formData, tecnico_telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.tecnico_email}
                    onChange={(e) => setFormData({ ...formData, tecnico_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informações Adicionais</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário de Funcionamento
                </label>
                <textarea
                  value={formData.horario_funcionamento}
                  onChange={(e) => setFormData({ ...formData, horario_funcionamento: e.target.value })}
                  rows={3}
                  placeholder="Ex: Segunda a Sexta: 6h às 22h"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade de Alunos
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantidade_alunos}
                  onChange={(e) => setFormData({ ...formData, quantidade_alunos: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
