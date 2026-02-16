'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MapPin, Phone, Mail, User, Calendar, Building2, Shield, DollarSign, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Academia {
  id: string
  nome: string
  nome_fantasia: string | null
  sigla: string | null
  logo_url: string | null
  cnpj: string
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  endereco_rua: string
  endereco_numero: string
  endereco_complemento: string | null
  endereco_bairro: string
  endereco_cidade: string
  endereco_estado: string
  endereco_cep: string
  responsavel_nome: string
  responsavel_cpf: string
  responsavel_rg: string | null
  responsavel_telefone: string
  responsavel_email: string
  responsavel_faixa: string | null
  tecnico_nome: string | null
  tecnico_cpf: string | null
  tecnico_registro_profissional: string | null
  tecnico_telefone: string | null
  tecnico_email: string | null
  data_filiacao: string
  horario_funcionamento: string | null
  quantidade_alunos: number
  anualidade_status: 'paga' | 'pendente' | 'vencida'
  anualidade_vencimento: string | null
  ativo: boolean
  created_at: string
}

export default function AcademiaDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadAcademia()
  }, [id])

  const loadAcademia = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('academias')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setAcademia(data)
    } catch (error) {
      console.error('Erro ao carregar academia:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!academia) return

    const confirmacao = window.confirm(
      `Tem certeza que deseja EXCLUIR a academia "${academia.nome}"?\n\nEsta ação não pode ser desfeita.`
    )

    if (!confirmacao) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('academias')
        .delete()
        .eq('id', academia.id)

      if (error) throw error

      alert('Academia excluída com sucesso!')
      router.push('/academias')
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir academia')
    }
  }

  const formatCPF = (cpf: string) => {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const formatCEP = (cep: string) => {
    return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      paga: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Paga'
      },
      pendente: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: Clock,
        label: 'Pendente'
      },
      vencida: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircle,
        label: 'Vencida'
      }
    }

    const config = configs[status as keyof typeof configs]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!academia) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Academia não encontrada</h1>
          <Link href="/academias" className="text-green-600 hover:text-green-700">
            Voltar para a lista
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/academias"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para lista
          </Link>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {academia.logo_url && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={academia.logo_url}
                      alt={academia.nome}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{academia.nome}</h1>
                    {academia.sigla && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-bold text-sm">
                        {academia.sigla}
                      </span>
                    )}
                  </div>
                  {academia.nome_fantasia && (
                    <p className="text-gray-600 mb-2">{academia.nome_fantasia}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>CNPJ: {formatCNPJ(academia.cnpj)}</span>
                    <span>•</span>
                    <span>Filiada desde: {formatDate(academia.data_filiacao)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/academias/${academia.id}/editar`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status da Anuidade */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Status da Anuidade 2026
              </h2>
              <div className="flex items-center gap-4">
                {getStatusBadge(academia.anualidade_status)}
                {academia.anualidade_vencimento && (
                  <span className="text-sm text-gray-600">
                    Vencimento: {formatDate(academia.anualidade_vencimento)}
                  </span>
                )}
              </div>
            </div>
            {academia.anualidade_status !== 'paga' && (
              <Link
                href="/academias"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Gerar Cobrança
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Endereço */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                {academia.endereco_rua}, {academia.endereco_numero}
                {academia.endereco_complemento && ` - ${academia.endereco_complemento}`}
              </p>
              <p className="text-gray-700">{academia.endereco_bairro}</p>
              <p className="text-gray-700">
                {academia.endereco_cidade} - {academia.endereco_estado}
              </p>
              <p className="text-gray-700">CEP: {formatCEP(academia.endereco_cep)}</p>
            </div>
          </div>

          {/* Responsável Principal */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Responsável Principal
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Nome</p>
                <p className="text-sm font-medium text-gray-900">{academia.responsavel_nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">CPF</p>
                  <p className="text-sm text-gray-700">{formatCPF(academia.responsavel_cpf)}</p>
                </div>
                {academia.responsavel_rg && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">RG</p>
                    <p className="text-sm text-gray-700">{academia.responsavel_rg}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Telefone</p>
                <p className="text-sm text-gray-700">{academia.responsavel_telefone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-700">{academia.responsavel_email}</p>
              </div>
              {academia.responsavel_faixa && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Faixa</p>
                  <p className="text-sm font-medium text-green-700">{academia.responsavel_faixa}</p>
                </div>
              )}
            </div>
          </div>

          {/* Responsável Técnico */}
          {academia.tecnico_nome && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Responsável Técnico
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nome</p>
                  <p className="text-sm font-medium text-gray-900">{academia.tecnico_nome}</p>
                </div>
                {academia.tecnico_cpf && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">CPF</p>
                    <p className="text-sm text-gray-700">{formatCPF(academia.tecnico_cpf)}</p>
                  </div>
                )}
                {academia.tecnico_registro_profissional && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Registro Profissional</p>
                    <p className="text-sm text-gray-700">{academia.tecnico_registro_profissional}</p>
                  </div>
                )}
                {academia.tecnico_telefone && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Telefone</p>
                    <p className="text-sm text-gray-700">{academia.tecnico_telefone}</p>
                  </div>
                )}
                {academia.tecnico_email && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-700">{academia.tecnico_email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informações Adicionais */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações Adicionais
            </h2>
            <div className="space-y-3">
              {academia.inscricao_estadual && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Inscrição Estadual</p>
                  <p className="text-sm text-gray-700">{academia.inscricao_estadual}</p>
                </div>
              )}
              {academia.inscricao_municipal && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Inscrição Municipal</p>
                  <p className="text-sm text-gray-700">{academia.inscricao_municipal}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Quantidade de Alunos</p>
                <p className="text-sm font-medium text-gray-900">{academia.quantidade_alunos}</p>
              </div>
              {academia.horario_funcionamento && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Horário de Funcionamento</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{academia.horario_funcionamento}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className={`text-sm font-medium ${academia.ativo ? 'text-green-600' : 'text-red-600'}`}>
                  {academia.ativo ? 'Ativa' : 'Inativa'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
