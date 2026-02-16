'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Building2, User, CreditCard, Check } from 'lucide-react'

const STEPS = [
  { id: 1, name: 'Dados da Entidade', icon: Building2 },
  { id: 2, name: 'Responsáveis', icon: User },
  { id: 3, name: 'Pagamento', icon: CreditCard },
]

export default function NovaAcademiaPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form data
  const [formData, setFormData] = useState({
    // Dados da Entidade
    nome: '',
    nome_fantasia: '',
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
    
    // Responsável Principal
    responsavel_nome: '',
    responsavel_cpf: '',
    responsavel_rg: '',
    responsavel_telefone: '',
    responsavel_email: '',
    responsavel_faixa: '',
    
    // Responsável Técnico
    tecnico_nome: '',
    tecnico_cpf: '',
    tecnico_registro_profissional: '',
    tecnico_telefone: '',
    tecnico_email: '',
    
    // Operacional
    horario_funcionamento: '',
    quantidade_alunos: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Get user's federacao_id from user_roles
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // TODO: Insert academia
      // const { error } = await supabase
      //   .from('academias')
      //   .insert([{
      //     federacao_id: 'TODO',
      //     ...formData
      //   }])

      // if (error) throw error

      alert('Academia cadastrada com sucesso! (TODO: Implementar inserção no banco)')
      router.push('/academias')
    } catch (err: any) {
      console.error('Error:', err)
      alert(err.message || 'Erro ao cadastrar academia')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-foreground">Nova Academia</h1>
        <p className="text-muted-foreground mt-2">
          Cadastre uma nova academia filiada
        </p>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isComplete = currentStep > step.id
            const isCurrent = currentStep === step.id
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isComplete
                        ? 'bg-primary text-white'
                        : isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium text-center ${
                      isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.name}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 transition-all ${
                      isComplete ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-card rounded-2xl p-8 border border-border">
          {/* Step 1: Dados da Entidade */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nome (Razão Social) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => updateFormData('nome', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="Academia de Jiu-Jitsu..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => updateFormData('nome_fantasia', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => updateFormData('cnpj', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CEP *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_cep}
                    onChange={(e) => updateFormData('endereco_cep', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Rua *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_rua}
                    onChange={(e) => updateFormData('endereco_rua', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.endereco_numero}
                      onChange={(e) => updateFormData('endereco_numero', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formData.endereco_complemento}
                      onChange={(e) => updateFormData('endereco_complemento', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_bairro}
                    onChange={(e) => updateFormData('endereco_bairro', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco_cidade}
                    onChange={(e) => updateFormData('endereco_cidade', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estado *
                  </label>
                  <select
                    required
                    value={formData.endereco_estado}
                    onChange={(e) => updateFormData('endereco_estado', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    {/* TODO: Add all states */}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Responsáveis */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Responsável Principal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.responsavel_nome}
                      onChange={(e) => updateFormData('responsavel_nome', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      CPF *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.responsavel_cpf}
                      onChange={(e) => updateFormData('responsavel_cpf', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.responsavel_telefone}
                      onChange={(e) => updateFormData('responsavel_telefone', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.responsavel_email}
                      onChange={(e) => updateFormData('responsavel_email', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Faixa
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_faixa}
                      onChange={(e) => updateFormData('responsavel_faixa', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="Ex: Preta 3º Grau"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pagamento */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-accent/50 border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Resumo do Cadastro
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    <strong>Academia:</strong> {formData.nome || '---'}
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Responsável:</strong> {formData.responsavel_nome || '---'}
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Endereço:</strong> {formData.endereco_rua} {formData.endereco_numero}, {formData.endereco_cidade}/{formData.endereco_estado}
                  </p>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                <p className="text-sm text-foreground">
                  Após o cadastro, a academia receberá um email com as instruções de pagamento 
                  da anualidade (R$ 500,00/ano) via Safe2Pay.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 rounded-lg border border-input hover:bg-accent transition-all"
              >
                Voltar
              </button>
            )}
            
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
              >
                Próximo
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
