'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Loader2, MapPin } from 'lucide-react'

export default function EditarAcademiaPage() {
  const router = useRouter()
  const params = useParams()
  const academiaId = params.id as string
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    sigla: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    
    // Endereço
    endereco_cep: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    
    // Contato
    telefone: '',
    email: '',
    
    // Responsável
    responsavel_nome: '',
    responsavel_cpf: '',
    responsavel_telefone: '',
    responsavel_email: '',
    
    // Status
    status: 'ativo',
  })

  useEffect(() => {
    loadAcademia()
  }, [])

  const loadAcademia = async () => {
    try {
      const { data, error } = await supabase
        .from('academias')
        .select('*')
        .eq('id', academiaId)
        .single()

      if (error) throw error
      
      if (data) {
        setFormData({
          nome: data.nome || '',
          sigla: data.sigla || '',
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
          telefone: data.telefone || '',
          email: data.email || '',
          responsavel_nome: data.responsavel_nome || '',
          responsavel_cpf: data.responsavel_cpf || '',
          responsavel_telefone: data.responsavel_telefone || '',
          responsavel_email: data.responsavel_email || '',
          status: data.status || 'ativo',
        })
      }
    } catch (err: any) {
      console.error('Error loading academia:', err)
      alert('Erro ao carregar dados da academia')
    } finally {
      setLoading(false)
    }
  }

  const searchCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setCepLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) {
        alert('CEP não encontrado')
        return
      }

      setFormData(prev => ({
        ...prev,
        endereco_rua: data.logradouro || '',
        endereco_bairro: data.bairro || '',
        endereco_cidade: data.localidade || '',
        endereco_estado: data.uf || '',
      }))
    } catch (err) {
      console.error('Error fetching CEP:', err)
      alert('Erro ao buscar CEP')
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('academias')
        .update(formData)
        .eq('id', academiaId)

      if (error) throw error

      alert('Academia atualizada com sucesso!')
      router.push('/academias')
    } catch (err: any) {
      console.error('Error:', err)
      alert(err.message || 'Erro ao atualizar academia')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-foreground">Editar Academia</h1>
        <p className="text-muted-foreground mt-2">
          Atualize os dados da academia {formData.sigla || formData.nome}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Dados Básicos */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Dados Básicos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome (Razão Social) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sigla *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sigla}
                  onChange={(e) => updateField('sigla', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => updateField('cnpj', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  value={formData.inscricao_estadual}
                  onChange={(e) => updateField('inscricao_estadual', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  CEP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.endereco_cep}
                    onChange={(e) => updateField('endereco_cep', e.target.value)}
                    onBlur={(e) => searchCEP(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="00000-000"
                  />
                  <button
                    type="button"
                    onClick={() => searchCEP(formData.endereco_cep)}
                    disabled={cepLoading}
                    className="px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50"
                  >
                    {cepLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.endereco_numero}
                  onChange={(e) => updateField('endereco_numero', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Rua
                </label>
                <input
                  type="text"
                  value={formData.endereco_rua}
                  onChange={(e) => updateField('endereco_rua', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.endereco_bairro}
                  onChange={(e) => updateField('endereco_bairro', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.endereco_complemento}
                  onChange={(e) => updateField('endereco_complemento', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.endereco_cidade}
                  onChange={(e) => updateField('endereco_cidade', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Estado (UF)
                </label>
                <select
                  value={formData.endereco_estado}
                  onChange={(e) => updateField('endereco_estado', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Contato</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Responsável */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Responsável</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.responsavel_nome}
                  onChange={(e) => updateField('responsavel_nome', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.responsavel_cpf}
                  onChange={(e) => updateField('responsavel_cpf', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.responsavel_telefone}
                  onChange={(e) => updateField('responsavel_telefone', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.responsavel_email}
                  onChange={(e) => updateField('responsavel_email', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
