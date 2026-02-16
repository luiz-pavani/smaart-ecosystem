'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Search, Building2, MapPin, User, CheckCircle, XCircle, Clock, Eye, Edit, Trash2, DollarSign, Shield } from 'lucide-react'
import { PaymentModal } from '@/components/modals/PaymentModal'
import CertificadoModal from '@/components/modals/CertificadoModal'

interface Academia {
  id: string
  nome: string
  nome_fantasia: string | null
  sigla?: string | null
  logo_url: string | null
  cnpj: string
  endereco_cidade: string
  endereco_estado: string
  responsavel_nome: string
  responsavel_email: string
  anualidade_status: 'paga' | 'pendente' | 'vencida'
  data_filiacao: string
  created_at: string
}

export default function AcademiasPage() {
  const [academias, setAcademias] = useState<Academia[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [certificadoModalOpen, setCertificadoModalOpen] = useState(false)
  const [selectedAcademia, setSelectedAcademia] = useState<Academia | null>(null)
  const [valorAnualidade, setValorAnualidade] = useState(690.00)
  const [maxParcelas, setMaxParcelas] = useState(10)
  const supabase = createClient()

  useEffect(() => {
    loadAcademias()
  }, [])

  const loadAcademias = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Get user's federacao_id
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .single()

      if (roleError || !roleData) throw new Error('Federação não encontrada')

      // Fetch federacao config (para valor da anuidade)
      const { data: federacao } = await supabase
        .from('federacoes')
        .select('valor_anualidade_2026, max_parcelas_anualidade')
        .eq('id', roleData.federacao_id)
        .single()

      if (federacao) {
        setValorAnualidade(federacao.valor_anualidade_2026 || 690.00)
        setMaxParcelas(federacao.max_parcelas_anualidade || 10)
      }

      // Fetch academias from this federacao
      const { data, error } = await supabase
        .from('academias')
        .select('*')
        .eq('federacao_id', roleData.federacao_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAcademias(data || [])
    } catch (err: any) {
      console.error('Error loading academias:', err)
      alert(`Erro ao carregar academias: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a academia "${nome}"?`)) return

    try {
      const { error } = await supabase
        .from('academias')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('✅ Academia excluída com sucesso')
      loadAcademias()
    } catch (err: any) {
      console.error('Error deleting academia:', err)
      alert(`❌ Erro ao excluir: ${err.message}`)
    }
  }

  const filteredAcademias = academias.filter(academia =>
    academia.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    academia.endereco_cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    academia.responsavel_nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const badges = {
      paga: { icon: CheckCircle, text: 'Paga', color: 'bg-green-100 text-green-800' },
      pendente: { icon: Clock, text: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      vencida: { icon: XCircle, text: 'Vencida', color: 'bg-red-100 text-red-800' }
    }
    const badge = badges[status as keyof typeof badges]
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Academias</h1>
            <p className="text-gray-600 mt-1">Gerencie as academias filiadas à sua federação</p>
          </div>
          <Link
            href="/academias/nova"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nova Academia
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-lg border border-gray-700">
          <div className="text-sm text-gray-300 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{academias.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-700 to-green-800 p-6 rounded-lg shadow-lg border border-green-600">
          <div className="text-sm text-green-100 mb-1">Anualidade Paga</div>
          <div className="text-2xl font-bold text-white">
            {academias.filter(a => a.anualidade_status === 'paga').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 p-6 rounded-lg shadow-lg border border-yellow-500">
          <div className="text-sm text-yellow-100 mb-1">Pendente</div>
          <div className="text-2xl font-bold text-white">
            {academias.filter(a => a.anualidade_status === 'pendente').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-700 to-red-800 p-6 rounded-lg shadow-lg border border-red-600">
          <div className="text-sm text-red-100 mb-1">Vencida</div>
          <div className="text-2xl font-bold text-white">
            {academias.filter(a => a.anualidade_status === 'vencida').length}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando academias...</p>
        </div>
      ) : filteredAcademias.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Nenhuma academia encontrada' : 'Nenhuma academia cadastrada'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Tente ajustar sua busca ou limpar o filtro.'
              : 'Comece cadastrando a primeira academia da sua federação.'}
          </p>
          {!searchTerm && (
            <Link
              href="/academias/nova"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Cadastrar Primeira Academia
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Academia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status Anualidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Filiação
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAcademias.map((academia) => (
                  <tr key={academia.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {academia.logo_url ? (
                          <img 
                            src={academia.logo_url} 
                            alt={academia.nome}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ${academia.logo_url ? 'hidden' : ''}`}>
                          {academia.sigla ? (
                            <span className="text-sm font-bold text-green-600">{academia.sigla}</span>
                          ) : (
                            <Building2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{academia.nome}</div>
                          {academia.nome_fantasia && (
                            <div className="text-sm text-gray-500">{academia.nome_fantasia}</div>
                          )}
                          <div className="text-xs text-gray-400 font-mono">{academia.cnpj}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {academia.endereco_cidade} - {academia.endereco_estado}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{academia.responsavel_nome}</div>
                          <div className="text-xs text-gray-500">{academia.responsavel_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(academia.anualidade_status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(academia.data_filiacao)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {academia.anualidade_status !== 'paga' && (
                          <button
                            onClick={() => {
                              setSelectedAcademia(academia)
                              setPaymentModalOpen(true)
                            }}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Gerar Cobrança"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAcademia(academia)
                            setCertificadoModalOpen(true)
                          }}
                          className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Gerar Certificado"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/academias/${academia.id}`}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/academias/${academia.id}/editar`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(academia.id, academia.nome)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedAcademia && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedAcademia(null)
            loadAcademias() // Recarregar para atualizar status
          }}
          academia={selectedAcademia}
          valorAnualidade={valorAnualidade}
          maxParcelas={maxParcelas}
        />
      )}

      {/* Certificado Modal */}
      {selectedAcademia && (
        <CertificadoModal
          isOpen={certificadoModalOpen}
          onClose={() => {
            setCertificadoModalOpen(false)
            setSelectedAcademia(null)
            loadAcademias() // Recarregar para atualizar dados
          }}
          academia={selectedAcademia}
        />
      )}
    </div>
  )
}
