'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface EditarAcademiaFormProps {
  academia: any
}

export default function EditarAcademiaForm({ academia }: EditarAcademiaFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nome: academia.nome || '',
    nome_fantasia: academia.nome_fantasia || '',
    sigla: academia.sigla || '',
    cnpj: academia.cnpj || '',
    inscricao_estadual: academia.inscricao_estadual || '',
    inscricao_municipal: academia.inscricao_municipal || '',
    endereco_rua: academia.endereco_rua || '',
    endereco_numero: academia.endereco_numero || '',
    endereco_complemento: academia.endereco_complemento || '',
    endereco_bairro: academia.endereco_bairro || '',
    endereco_cidade: academia.endereco_cidade || '',
    endereco_estado: academia.endereco_estado || '',
    endereco_cep: academia.endereco_cep || '',
    responsavel_nome: academia.responsavel_nome || '',
    responsavel_cpf: academia.responsavel_cpf || '',
    responsavel_rg: academia.responsavel_rg || '',
    responsavel_faixa: academia.responsavel_faixa || '',
    responsavel_telefone: academia.responsavel_telefone || '',
    responsavel_email: academia.responsavel_email || '',
    tecnico_nome: academia.tecnico_nome || '',
    tecnico_cpf: academia.tecnico_cpf || '',
    tecnico_registro_profissional: academia.tecnico_registro_profissional || '',
    tecnico_telefone: academia.tecnico_telefone || '',
    tecnico_email: academia.tecnico_email || '',
    horario_funcionamento: academia.horario_funcionamento || '',
    quantidade_alunos: academia.quantidade_alunos || 0,
    ativo: academia.ativo !== false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/academias/${academia.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar academia')
      }

      alert('✅ Academia atualizada com sucesso!')
      router.push('/academias')
    } catch (error) {
      console.error('Error:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Erro ao atualizar academia'}`)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/academias"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Editar Academia</h2>
          <p className="text-muted-foreground">Atualize os dados de {academia.nome}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Informações Básicas */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Informações Básicas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => updateField('nome', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Sigla</label>
              <input
                type="text"
                value={formData.sigla}
                onChange={(e) => updateField('sigla', e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">CNPJ</label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => updateField('cnpj', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select value={formData.ativo ? 'ativo' : 'inativo'} onChange={(e) => updateField('ativo', e.target.value === 'ativo')} className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground">
                <option value="ativo">Ativa</option>
                <option value="inativo">Inativa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsável Principal */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Responsável Principal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
              <input
                type="text"
                required
                value={formData.responsavel_nome}
                onChange={(e) => updateField('responsavel_nome', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">CPF</label>
              <input
                type="text"
                value={formData.responsavel_cpf}
                onChange={(e) => updateField('responsavel_cpf', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
              <input
                type="text"
                required
                value={formData.responsavel_telefone}
                onChange={(e) => updateField('responsavel_telefone', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.responsavel_email}
                onChange={(e) => updateField('responsavel_email', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Rua</label>
              <input
                type="text"
                value={formData.endereco_rua}
                onChange={(e) => updateField('endereco_rua', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Número</label>
              <input
                type="text"
                value={formData.endereco_numero}
                onChange={(e) => updateField('endereco_numero', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
              <input
                type="text"
                value={formData.endereco_cidade}
                onChange={(e) => updateField('endereco_cidade', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Estado</label>
              <input
                type="text"
                value={formData.endereco_estado}
                onChange={(e) => updateField('endereco_estado', e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">CEP</label>
              <input
                type="text"
                value={formData.endereco_cep}
                onChange={(e) => updateField('endereco_cep', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Dados Operacionais */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Dados Operacionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Quantidade de Alunos</label>
              <input
                type="number"
                value={formData.quantidade_alunos}
                onChange={(e) => updateField('quantidade_alunos', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Horário de Funcionamento</label>
              <input
                type="text"
                value={formData.horario_funcionamento}
                onChange={(e) => updateField('horario_funcionamento', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="Ex: 08:00 - 22:00"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
          <Link
            href="/academias"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </form>
    </div>
  )
}
