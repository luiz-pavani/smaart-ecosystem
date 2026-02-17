'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, Save, Loader2, Users, Plus, Tabs as TabIcon } from 'lucide-react'
import FileUpload from '@/components/ui/FileUpload'
import CSVImport, { CSVImportField } from '@/components/ui/CSVImport'
import { GRADUACOES_DB, DAN_NIVEIS } from '@/lib/utils/graduacao'

interface NewAtletaFormProps {
  academiasDisponiveis?: Array<{ id: string; nome: string; sigla: string }>
  federacaoId?: string
  academiaId?: string
  role?: string
}

type FormMode = 'form' | 'csv'

export default function NovoAtletaForm({
  academiasDisponiveis = [],
  federacaoId,
  academiaId,
  role,
}: NewAtletaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<FormMode>('form')
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    genero: '',
    email: '',
    telefone: '',
    celular: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    academia_id: academiaId || '',
    graduacao: '',
    dan_nivel: '',
    data_graduacao: '',
    nivel_arbitragem: '',
    observacoes: '',
  })

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Generate CEP address lookup
  const searchCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) return

      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }))
    } catch (err) {
      console.error('CEP lookup error:', err)
    }
  }

  const handleFileSelect = async (file: File) => {
    setPhotoLoading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      setSelectedFile(file)
    } finally {
      setPhotoLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let photoUrl: string | null = null

      // Upload photo if selected
      if (selectedFile) {
        const fileName = `${Date.now()}-${selectedFile.name}`
        const { data, error: uploadError } = await supabase.storage
          .from('atletas')
          .upload(`fotos/${fileName}`, selectedFile)

        if (uploadError) throw uploadError

        const { data: publicUrl } = supabase.storage
          .from('atletas')
          .getPublicUrl(`fotos/${fileName}`)

        photoUrl = publicUrl.publicUrl
      }

      // Create athlete record
      const { error } = await supabase
        .from('atletas')
        .insert([{
          federacao_id: federacaoId,
          academia_id: formData.academia_id || academiaId,
          nome_completo: formData.nome_completo,
          cpf: formData.cpf.replace(/\D/g, ''),
          rg: formData.rg,
          data_nascimento: formData.data_nascimento,
          genero: formData.genero,
          email: formData.email,
          telefone: formData.telefone,
          celular: formData.celular,
          cep: formData.cep,
          endereco: formData.endereco,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          graduacao: formData.graduacao,
          dan_nivel: formData.dan_nivel || null,
          data_graduacao: formData.data_graduacao,
          nivel_arbitragem: formData.nivel_arbitragem,
          foto_perfil_url: photoUrl,
          observacoes: formData.observacoes,
          status: 'ativo',
        }])

      if (error) throw error

      alert('Atleta cadastrado com sucesso!')
      router.push('/atletas')
      router.refresh()
    } catch (err) {
      console.error('Error:', err)
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar atleta')
    } finally {
      setLoading(false)
    }
  }

  const handleCSVImport = async (rows: Array<Record<string, string>>) => {
    try {
      const { error } = await supabase
        .from('atletas')
        .insert(rows.map(row => ({
          federacao_id: federacaoId,
          academia_id: row.academia_id || academiaId,
          nome_completo: row.nome_completo,
          cpf: row.cpf?.replace(/\D/g, '') || '',
          rg: row.rg || '',
          data_nascimento: row.data_nascimento,
          genero: row.genero,
          email: row.email,
          telefone: row.telefone || '',
          celular: row.celular,
          cep: row.cep || '',
          endereco: row.endereco || '',
          numero: row.numero || '',
          complemento: row.complemento || '',
          bairro: row.bairro || '',
          cidade: row.cidade || '',
          estado: row.estado || '',
          graduacao: row.graduacao,
          dan_nivel: row.dan_nivel || null,
          data_graduacao: row.data_graduacao || null,
          nivel_arbitragem: row.nivel_arbitragem || '',
          observacoes: row.observacoes || '',
          status: 'ativo',
        })))

      if (error) throw error

      return {
        success: true,
        message: `${rows.length} atleta(s) importado(s) com sucesso!`,
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro na importação')
    }
  }

  const csvFields: CSVImportField[] = [
    { name: 'nome_completo', label: 'Nome Completo', required: true, type: 'text' },
    { name: 'cpf', label: 'CPF', required: true, type: 'cpf' },
    { name: 'data_nascimento', label: 'Data de Nascimento', required: true, type: 'date' },
    { name: 'genero', label: 'Gênero', required: true, type: 'select', options: [
      { value: 'Masculino', label: 'Masculino' },
      { value: 'Feminino', label: 'Feminino' },
    ]},
    { name: 'email', label: 'E-mail', required: false, type: 'email' },
    { name: 'celular', label: 'Celular', required: false, type: 'phone' },
    { name: 'graduacao', label: 'Graduação', required: true, type: 'select', options: GRADUACOES_DB.map(g => ({ value: g.name, label: g.display })) },
    { name: 'dan_nivel', label: 'Nível Dan', required: false, type: 'text' },
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
            <Users className="w-8 h-8 text-primary" />
            Novo Atleta
          </h1>
          <p className="text-muted-foreground mt-2">
            {role === 'atleta'
              ? 'Complete seu cadastro como atleta'
              : 'Cadastre um novo atleta na plataforma'}
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
          {(role === 'academia_admin' || role === 'federacao_admin') && (
            <button
              onClick={() => setMode('csv')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
                mode === 'csv'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="w-5 h-5" />
              Importar CSV
            </button>
          )}
        </div>

        {/* Form Tab */}
        {mode === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Informações Pessoais</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nome completo"
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
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
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
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Inscrição RG"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Gênero *
                  </label>
                  <select
                    required
                    value={formData.genero}
                    onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Academia *
                  </label>
                  <select
                    required
                    value={formData.academia_id}
                    onChange={(e) => setFormData({ ...formData, academia_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione...</option>
                    {academiasDisponiveis.map(academia => (
                      <option key={academia.id} value={academia.id}>
                        {academia.nome} ({academia.sigla})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Contato</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Celular *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Endereço</h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  CEP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    onBlur={(e) => searchCEP(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="00000-000"
                  />
                  <button
                    type="button"
                    onClick={() => searchCEP(formData.cep)}
                    className="px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    UF
                  </label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Judo Information */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Informações de Judo</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Graduação *
                  </label>
                  <select
                    required
                    value={formData.graduacao}
                    onChange={(e) => setFormData({ ...formData, graduacao: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione...</option>
                    {GRADUACOES_DB.map(g => (
                      <option key={g.name} value={g.name}>
                        {g.display}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.graduacao === 'FAIXA PRETA|YUDANSHA' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nível Dan
                    </label>
                    <select
                      value={formData.dan_nivel}
                      onChange={(e) => setFormData({ ...formData, dan_nivel: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Selecione...</option>
                      {DAN_NIVEIS.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Data de Graduação
                  </label>
                  <input
                    type="date"
                    value={formData.data_graduacao}
                    onChange={(e) => setFormData({ ...formData, data_graduacao: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nível de Arbitragem
                  </label>
                  <input
                    type="text"
                    value={formData.nivel_arbitragem}
                    onChange={(e) => setFormData({ ...formData, nivel_arbitragem: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ex: Regional, Estadual, Nacional"
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Foto do Atleta
              </h2>

              <FileUpload
                label="Selecione foto"
                accept="image/*"
                maxSize={5}
                onFileSelect={handleFileSelect}
                preview={photoPreview}
                isLoading={photoLoading}
              />
            </div>

            {/* Observations */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h2 className="text-lg font-bold text-foreground">Observações</h2>

              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full h-24 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Informações adicionais..."
              />
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
                  Cadastrar Atleta
                </>
              )}
            </button>
          </form>
        )}

        {/* CSV Tab */}
        {mode === 'csv' && (
          <div className="bg-card rounded-2xl p-6 border border-border">
            <CSVImport
              title="Importar Atletas via CSV"
              description="Faça upload de um arquivo CSV com múltiplos atletas"
              fields={csvFields}
              onImport={handleCSVImport}
            />
          </div>
        )}
      </div>
    </div>
  )
}
