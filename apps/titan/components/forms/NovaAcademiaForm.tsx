'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Building2, Save, Loader2, LayoutGrid, Plus } from 'lucide-react'
import CSVImport, { CSVImportField } from '@/components/ui/CSVImport'

type FormMode = 'form' | 'csv'

export default function NovaAcademiaForm() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<FormMode>('form')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    sigla: '',
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
    endereco_pais: 'Brasil',
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
  })

  const searchCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) return

      setFormData(prev => ({
        ...prev,
        endereco_rua: data.logradouro || '',
        endereco_bairro: data.bairro || '',
        endereco_cidade: data.localidade || '',
        endereco_estado: data.uf || '',
      }))
    } catch (err) {
      console.error('CEP lookup error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: perfil } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .single()

      if (!perfil?.federacao_id) throw new Error('Federação não identificada')

      const { error } = await supabase
        .from('academias')
        .insert([{
          federacao_id: perfil.federacao_id,
          ...formData,
          ativo: true,
        }])

      if (error) throw error

      alert('Academia cadastrada com sucesso!')
      router.push('/academias')
      router.refresh()
    } catch (err) {
      console.error('Error:', err)
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar academia')
    } finally {
      setLoading(false)
    }
  }

  const handleCSVImport = async (rows: Array<Record<string, string>>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: perfil } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .single()

      if (!perfil?.federacao_id) throw new Error('Federação não identificada')

      const { error } = await supabase
        .from('academias')
        .insert(rows.map(row => ({
          federacao_id: perfil.federacao_id,
          ...row,
          ativo: true,
        })))

      if (error) throw error

      return {
        success: true,
        message: `${rows.length} academia(s) importada(s) com sucesso!`,
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro na importação')
    }
  }

  const csvFields: CSVImportField[] = [
    { name: 'nome', label: 'Nome', required: true, type: 'text' },
    { name: 'sigla', label: 'Sigla', required: true, type: 'text' },
    { name: 'cnpj', label: 'CNPJ', required: false, type: 'text' },
    { name: 'responsavel_nome', label: 'Responsável - Nome', required: true, type: 'text' },
    { name: 'responsavel_cpf', label: 'Responsável - CPF', required: true, type: 'cpf' },
    { name: 'responsavel_email', label: 'Responsável - Email', required: true, type: 'email' },
    { name: 'responsavel_telefone', label: 'Responsável - Telefone', required: true, type: 'phone' },
    { name: 'endereco_cep', label: 'CEP', required: false, type: 'text' },
    { name: 'endereco_rua', label: 'Rua', required: false, type: 'text' },
    { name: 'endereco_numero', label: 'Número', required: false, type: 'text' },
    { name: 'endereco_bairro', label: 'Bairro', required: false, type: 'text' },
    { name: 'endereco_cidade', label: 'Cidade', required: false, type: 'text' },
    { name: 'endereco_estado', label: 'UF', required: false, type: 'text' },
    { name: 'endereco_pais', label: 'País', required: false, type: 'text' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Nova Academia
          </h1>
          <p className="text-muted-foreground mt-2">
            Cadastre uma nova academia filiada
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setMode('form')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              mode === 'form'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-5 h-5" />
            Cadastro Individual
          </button>
          <button
            onClick={() => setMode('csv')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
              mode === 'csv'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            Importar CSV
          </button>
        </div>

        {/* Form Tab */}
        {mode === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Dados Básicos</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome da Academia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ex: Academia Força e Movimento"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sigla *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sigla}
                    onChange={(e) => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={3}
                    placeholder="AFM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Endereço</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  CEP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.endereco_cep}
                    onChange={(e) => setFormData({ ...formData, endereco_cep: e.target.value })}
                    onBlur={(e) => searchCEP(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="00000-000"
                  />
                  <button
                    type="button"
                    onClick={() => searchCEP(formData.endereco_cep)}
                    className="px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Rua
                  </label>
                  <input
                    type="text"
                    value={formData.endereco_rua}
                    onChange={(e) => setFormData({ ...formData, endereco_rua: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.endereco_numero}
                    onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    UF
                  </label>
                  <input
                    type="text"
                    value={formData.endereco_estado}
                    onChange={(e) => setFormData({ ...formData, endereco_estado: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    País
                  </label>
                  <input
                    type="text"
                    value={formData.endereco_pais}
                    onChange={(e) => setFormData({ ...formData, endereco_pais: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Brasil"
                  />
                </div>
              </div>
            </div>

            {/* Responsible */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Responsável Principal</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.responsavel_nome}
                  onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.responsavel_cpf}
                    onChange={(e) => setFormData({ ...formData, responsavel_cpf: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    RG
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel_rg}
                    onChange={(e) => setFormData({ ...formData, responsavel_rg: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.responsavel_telefone}
                    onChange={(e) => setFormData({ ...formData, responsavel_telefone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.responsavel_email}
                    onChange={(e) => setFormData({ ...formData, responsavel_email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Technical Responsible (Optional) */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Responsável Técnico (Opcional)</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.tecnico_nome}
                  onChange={(e) => setFormData({ ...formData, tecnico_nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.tecnico_cpf}
                    onChange={(e) => setFormData({ ...formData, tecnico_cpf: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Registro Profissional (CREF)
                  </label>
                  <input
                    type="text"
                    value={formData.tecnico_registro_profissional}
                    onChange={(e) => setFormData({ ...formData, tecnico_registro_profissional: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.tecnico_telefone}
                    onChange={(e) => setFormData({ ...formData, tecnico_telefone: e.target.value })}
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
                    value={formData.tecnico_email}
                    onChange={(e) => setFormData({ ...formData, tecnico_email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Cadastrar Academia
                </>
              )}
            </button>
          </form>
        )}

        {/* CSV Tab */}
        {mode === 'csv' && (
          <div className="bg-card rounded-2xl p-6 border border-border">
            <CSVImport
              title="Importar Academias via CSV"
              description="Faça upload de um arquivo CSV com múltiplas academias"
              fields={csvFields}
              onImport={handleCSVImport}
            />
          </div>
        )}
      </div>
    </div>
  )
}
