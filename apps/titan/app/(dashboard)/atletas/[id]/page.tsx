import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Award, Shield, FileText, User, Building2 } from 'lucide-react'
import ApprovalSection from '@/components/ApprovalSection'
import { getBeltColorClasses, getGraduationDisplayText, getGraduationTooltip } from '@/lib/utils/graduacao'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AtletaDetalhesPage(props: PageProps) {
  const params = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: perfil } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isFederacaoAdmin = perfil?.role === 'federacao_admin' || perfil?.role === 'federacao_staff'

  const { data: atleta, error } = await supabase
    .from('atletas')
    .select(`
      *,
      academia:academias!atletas_academia_id_fkey (
        id,
        nome,
        sigla
      ),
      federacao:federacoes!atletas_federacao_id_fkey (
        id,
        nome,
        sigla
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !atleta) {
    redirect('/atletas')
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ativo: 'bg-green-100 text-green-800 border-green-200',
      inativo: 'bg-gray-100 text-gray-800 border-gray-200',
      suspenso: 'bg-red-100 text-red-800 border-red-200',
      transferido: 'bg-blue-100 text-blue-800 border-blue-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/atletas"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Detalhes do Atleta</h2>
            <p className="text-muted-foreground">Informações completas do cadastro</p>
          </div>
        </div>
        <Link
          href={`/atletas/${atleta.id}/editar`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Editar
        </Link>
      </div>

      {/* Approval Cards */}
      <ApprovalSection
        atletaId={atleta.id}
        graduacao={atleta.graduacao}
        graduacaoAprovada={atleta.graduacao_aprovada}
        nivelArbitragem={atleta.nivel_arbitragem}
        arbitragemAprovada={atleta.arbitragem_aprovada}
        isFederacaoAdmin={isFederacaoAdmin}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow border border-border p-6 sticky top-6">
            {/* Photo */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4">
                {atleta.foto_perfil_url ? (
                  <Image
                    src={atleta.foto_perfil_url}
                    alt={atleta.nome_completo}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <User className="w-16 h-16" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground text-center mb-2">
                {atleta.nome_completo}
              </h3>
              <code className="text-sm bg-muted text-foreground px-3 py-1 rounded mb-3">
                {atleta.numero_registro}
              </code>
              <div className="flex gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(atleta.status)}`}>
                  {atleta.status.charAt(0).toUpperCase() + atleta.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Quick Info */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {calcularIdade(atleta.data_nascimento)} anos
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{atleta.academia?.nome || '-'}</span>
              </div>
              {atleta.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${atleta.email}`} className="text-blue-600 hover:underline">
                    {atleta.email}
                  </a>
                </div>
              )}
              {atleta.celular && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${atleta.celular}`} className="text-foreground hover:underline">
                    {atleta.celular}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Pessoais */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados Pessoais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">CPF</label>
                <p className="text-foreground font-medium">{formatCPF(atleta.cpf)}</p>
              </div>
              {atleta.rg && (
                <div>
                  <label className="text-sm text-muted-foreground">RG</label>
                  <p className="text-foreground font-medium">{atleta.rg}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground">Data de Nascimento</label>
                <p className="text-foreground font-medium">{formatDate(atleta.data_nascimento)}</p>
              </div>
              {atleta.genero && (
                <div>
                  <label className="text-sm text-muted-foreground">Gênero</label>
                  <p className="text-foreground font-medium capitalize">{atleta.genero}</p>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {atleta.cep && (
            <div className="bg-card rounded-lg shadow border border-border p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereço
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Logradouro</label>
                  <p className="text-foreground font-medium">
                    {atleta.endereco}, {atleta.numero}
                    {atleta.complemento && ` - ${atleta.complemento}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Bairro</label>
                  <p className="text-foreground font-medium">{atleta.bairro || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">CEP</label>
                  <p className="text-foreground font-medium">{atleta.cep}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cidade</label>
                  <p className="text-foreground font-medium">{atleta.cidade || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Estado</label>
                  <p className="text-foreground font-medium">{atleta.estado || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Graduação */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Graduação e Certificações
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Graduação Atual</label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${getBeltColorClasses(atleta.graduacao)}`}
                    title={getGraduationTooltip(atleta.graduacao, atleta.dan_nivel)}
                  >
                    {getGraduationDisplayText(atleta.graduacao, atleta.dan_nivel)}
                  </span>
                </div>
              </div>
              {atleta.dan_nivel && (
                <div>
                  <label className="text-sm text-muted-foreground">Nível Dan</label>
                  <p className="text-foreground font-medium">{atleta.dan_nivel}</p>
                </div>
              )}
              {atleta.data_graduacao && (
                <div>
                  <label className="text-sm text-muted-foreground">Data da Graduação</label>
                  <p className="text-foreground font-medium">{formatDate(atleta.data_graduacao)}</p>
                </div>
              )}
              {atleta.numero_diploma_dan && (
                <div>
                  <label className="text-sm text-muted-foreground">Número do Diploma Dan</label>
                  <p className="text-foreground font-medium">{atleta.numero_diploma_dan}</p>
                </div>
              )}
              {atleta.nivel_arbitragem && (
                <div>
                  <label className="text-sm text-muted-foreground">Nível de Arbitragem</label>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                      <Shield className="w-4 h-4" />
                      {atleta.nivel_arbitragem}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Documentos */}
            {(atleta.foto_documento_url || atleta.certificado_dan_url || atleta.certificado_arbitragem_url) && (
              <div className="mt-6 pt-6 border-t border-border">
                <h5 className="text-sm font-semibold text-foreground mb-3">Documentos Anexados</h5>
                <div className="flex flex-wrap gap-2">
                  {atleta.foto_documento_url && (
                    <a
                      href={atleta.foto_documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Documento
                    </a>
                  )}
                  {atleta.certificado_dan_url && (
                    <a
                      href={atleta.certificado_dan_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm"
                    >
                      <Award className="w-4 h-4" />
                      Certificado Dan
                    </a>
                  )}
                  {atleta.certificado_arbitragem_url && (
                    <a
                      href={atleta.certificado_arbitragem_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm"
                    >
                      <Shield className="w-4 h-4" />
                      Certificado Arbitragem
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Informações Administrativas */}
          <div className="bg-card rounded-lg shadow border border-border p-6">
            <h4 className="text-lg font-semibold text-foreground mb-4">Informações Administrativas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {atleta.lote && (
                <div>
                  <label className="text-sm text-muted-foreground">Lote</label>
                  <p className="text-foreground font-medium">{atleta.lote}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground">Status de Pagamento</label>
                <p className="text-foreground font-medium capitalize">{atleta.status_pagamento.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Cadastrado em</label>
                <p className="text-foreground font-medium">{formatDate(atleta.created_at)}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Última atualização</label>
                <p className="text-foreground font-medium">{formatDate(atleta.updated_at)}</p>
              </div>
            </div>
            {atleta.observacoes && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-sm text-muted-foreground">Observações</label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">{atleta.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
