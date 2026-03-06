import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, Building2, FileText, User } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AcademiaDetalhesPage(props: PageProps) {
  const params = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: academia, error } = await supabase
    .from('academias')
    .select(`
      *,
      federacao:federacoes!academias_federacao_id_fkey (
        id,
        nome,
        sigla
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !academia) {
    redirect('/academias')
  }

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return '-'
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const isVencida = (vencimento: string | null) => {
    if (!vencimento) return false
    return new Date(vencimento) < new Date()
  }

  const getAnuidadeStatus = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      paga: { label: 'Em dia', color: 'text-green-600 bg-green-50' },
      pendente: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50' },
      vencida: { label: 'Vencida', color: 'text-red-600 bg-red-50' },
    }
    return statusMap[status] || { label: status, color: 'text-gray-600 bg-gray-50' }
  }

  const statusData = getAnuidadeStatus(academia.anualidade_status || 'pendente')

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/academias"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Detalhes da Academia</h2>
            <p className="text-muted-foreground">Informações completas do cadastro</p>
          </div>
        </div>
        <Link
          href={`/academias/${academia.id}/editar`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          Editar Academia
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo e Informações Básicas */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Informações Básicas</h3>
            <div className="grid gap-6">
              {academia.logo_url && (
                <div className="flex justify-center">
                  <Image
                    src={academia.logo_url}
                    alt={academia.nome}
                    width={200}
                    height={200}
                    className="max-w-xs object-contain"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-foreground font-medium mt-1">{academia.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Fantasia</label>
                  <p className="text-foreground font-medium mt-1">{academia.nome_fantasia || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sigla</label>
                  <p className="text-foreground font-medium mt-1">{academia.sigla || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                  <p className="text-foreground font-medium mt-1">{formatCNPJ(academia.cnpj)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-foreground font-medium mt-1">
                    <span className={`inline-block px-2 py-1 rounded text-sm ${academia.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {academia.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Filiação</label>
                  <p className="text-foreground font-medium mt-1">{formatDate(academia.data_filiacao)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dados de Endereço */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Endereço
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Rua</label>
                <p className="text-foreground mt-1">{academia.endereco_rua || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número</label>
                <p className="text-foreground mt-1">{academia.endereco_numero || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Complemento</label>
                <p className="text-foreground mt-1">{academia.endereco_complemento || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                <p className="text-foreground mt-1">{academia.endereco_bairro || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                <p className="text-foreground mt-1">{academia.endereco_cidade || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <p className="text-foreground mt-1">{academia.endereco_estado || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">CEP</label>
                <p className="text-foreground mt-1">{academia.endereco_cep || '-'}</p>
              </div>
            </div>
          </div>

          {/* Responsável Principal */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <User className="w-5 h-5" /> Responsável Principal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-foreground font-medium mt-1">{academia.responsavel_nome || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CPF</label>
                <p className="text-foreground mt-1">{academia.responsavel_cpf || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">RG</label>
                <p className="text-foreground mt-1">{academia.responsavel_rg || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Faixa</label>
                <p className="text-foreground mt-1">{academia.responsavel_faixa || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Telefone
                </label>
                <p className="text-foreground mt-1">{academia.responsavel_telefone || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <p className="text-foreground mt-1">{academia.responsavel_email || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Anuidade */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Anuidade
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusData.color}`}>
                  {statusData.label}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Vencimento</label>
                <p className="text-foreground font-medium mt-1">{formatDate(academia.anualidade_vencimento)}</p>
                {isVencida(academia.anualidade_vencimento) && (
                  <p className="text-xs text-red-600 mt-1">Vencida</p>
                )}
              </div>
              {academia.safe2pay_subscription_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Safe2Pay</label>
                  <p className="text-foreground text-sm mt-1 break-all">{academia.safe2pay_subscription_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dados Operacionais */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Dados Operacionais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantidade de Alunos</label>
                <p className="text-foreground font-bold text-lg mt-1">{academia.quantidade_alunos || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Horário de Funcionamento</label>
                <p className="text-foreground mt-1 text-sm">
                  {academia.horario_funcionamento || 'Não informado'}
                </p>
              </div>
            </div>
          </div>

          {/* Responsável Técnico */}
          {academia.tecnico_nome && (
            <div className="bg-card rounded-lg shadow border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Responsável Técnico</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-foreground mt-1">{academia.tecnico_nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p className="text-foreground mt-1">{academia.tecnico_cpf || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registro Profissional</label>
                  <p className="text-foreground mt-1">{academia.tecnico_registro_profissional || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-foreground mt-1">{academia.tecnico_telefone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground mt-1 break-all">{academia.tecnico_email || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
