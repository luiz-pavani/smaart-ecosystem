'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Edit2, MapPin, Phone, Mail, Users, Loader2 } from 'lucide-react'

interface Academia {
  id: string
  nome: string
  sigla: string
  cnpj?: string
  inscricao_estadual?: string
  inscricao_municipal?: string
  endereco_cep?: string
  endereco_rua?: string
  endereco_numero?: string
  endereco_complemento?: string
  endereco_bairro?: string
  endereco_cidade?: string
  endereco_estado?: string
  responsavel_nome?: string
  responsavel_cpf?: string
  responsavel_email?: string
  responsavel_telefone?: string
  tecnico_nome?: string
  tecnico_cpf?: string
  tecnico_email?: string
  tecnico_telefone?: string
  tecnico_registro_profissional?: string
  status?: string
  plano?: string
  data_filiacao?: string
  logo_url?: string
  plan_status?: string
  plan_expire_date?: string
  ativo?: boolean
  pais?: string
}

export default function AcademiaDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const academiaId = params.id as string
  const supabase = createClient()

  const [academia, setAcademia] = useState<Academia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAcademia()
  }, [academiaId])

  const loadAcademia = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('academias')
        .select('*')
        .eq('id', academiaId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Academia não encontrada')
        }
        throw fetchError
      }

      setAcademia(data)
    } catch (err) {
      console.error('Error loading academia:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar academia')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Carregando academia...</p>
        </div>
      </div>
    )
  }

  if (error || !academia) {
    return (
      <div className="min-h-screen bg-background p-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">{error || 'Academia não encontrada'}</p>
          <button
            onClick={() => router.push('/academias')}
            className="mt-4 text-red-600 hover:text-red-700 underline"
          >
            Voltar para Academias
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground">{academia.nome}</h1>
              <p className="text-lg text-muted-foreground mt-2">{academia.sigla}</p>
            </div>
            <button
              onClick={() => router.push(`/academias/${academiaId}/editar`)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98]"
            >
              <Edit2 className="w-5 h-5" />
              Editar Academia
            </button>
          </div>
        </div>

        {/* Status Badge */}
        {academia.status && (
          <div className="mb-6">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              academia.status === 'ativo'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {academia.status === 'ativo' ? '✓ Ativa' : 'Inativa'}
            </span>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Contato */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Informações de Contato</h2>
            
            {academia.responsavel_email && (
              <div className="flex items-start gap-3 mb-4">
                <Mail className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href={`mailto:${academia.responsavel_email}`} className="text-foreground hover:text-primary transition-colors font-medium">
                    {academia.responsavel_email}
                  </a>
                </div>
              </div>
            )}

            {academia.responsavel_telefone && (
              <div className="flex items-start gap-3 mb-4">
                <Phone className="w-5 h-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <a href={`tel:${academia.responsavel_telefone}`} className="text-foreground hover:text-primary transition-colors font-medium">
                    {academia.responsavel_telefone}
                  </a>
                </div>
              </div>
            )}

            {!academia.responsavel_email && !academia.responsavel_telefone && (
              <p className="text-muted-foreground italic">Sem contato cadastrado</p>
            )}
          </div>

          {/* Right Column - Endereço */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Localização
            </h2>

            {academia.endereco_rua ? (
              <div className="space-y-2 text-sm">
                <p className="text-foreground font-medium">
                  {academia.endereco_rua}, {academia.endereco_numero}
                  {academia.endereco_complemento && ` - ${academia.endereco_complemento}`}
                </p>
                <p className="text-muted-foreground">
                  {academia.endereco_bairro}
                </p>
                <p className="text-muted-foreground">
                  {academia.endereco_cidade}, {academia.endereco_estado}
                </p>
                {academia.endereco_cep && (
                  <p className="text-muted-foreground">
                    CEP: {academia.endereco_cep}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic">Endereço não cadastrado</p>
            )}
          </div>
        </div>

        {/* Responsável Info */}
        {(academia.responsavel_nome || academia.tecnico_nome) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {academia.responsavel_nome && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Responsável
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-foreground font-medium">{academia.responsavel_nome}</p>
                  {academia.responsavel_cpf && (
                    <p className="text-muted-foreground">CPF: {academia.responsavel_cpf}</p>
                  )}
                </div>
              </div>
            )}

            {academia.tecnico_nome && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Técnico Responsável
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-foreground font-medium">{academia.tecnico_nome}</p>
                  {academia.tecnico_email && (
                    <a href={`mailto:${academia.tecnico_email}`} className="text-primary hover:underline">
                      {academia.tecnico_email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documentação */}
        {(academia.cnpj || academia.inscricao_estadual) && (
          <div className="bg-card rounded-2xl p-6 border border-border mt-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Documentação</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {academia.cnpj && (
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="text-foreground font-monospace font-medium">{academia.cnpj}</p>
                </div>
              )}
              {academia.inscricao_estadual && (
                <div>
                  <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                  <p className="text-foreground font-monospace font-medium">{academia.inscricao_estadual}</p>
                </div>
              )}
              {academia.inscricao_municipal && (
                <div>
                  <p className="text-sm text-muted-foreground">Inscrição Municipal</p>
                  <p className="text-foreground font-monospace font-medium">{academia.inscricao_municipal}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plano Info */}
        {(academia.plano || academia.data_filiacao) && (
          <div className="bg-card rounded-2xl p-6 border border-border mt-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Informações de Filiação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {academia.plano && (
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="text-foreground font-medium">{academia.plano}</p>
                </div>
              )}
              {academia.data_filiacao && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Filiação</p>
                  <p className="text-foreground font-medium">
                    {new Date(academia.data_filiacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Button */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push(`/academias/${academiaId}/editar`)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-8 rounded-lg transition-all active:scale-[0.98]"
          >
            <Edit2 className="w-5 h-5" />
            Editar Academia
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-3 px-8 rounded-lg transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
