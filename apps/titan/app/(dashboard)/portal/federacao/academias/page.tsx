'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Building2, Loader2, FileText, FileSpreadsheet, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NovaAcademiaModal } from '@/components/modals/NovaAcademiaModal'
import { exportAcademiasToPDF } from '@/lib/export/pdf'
import { exportAcademiasToExcel } from '@/lib/export/excel'
import { SearchShortcut } from '@/components/command-palette/SearchShortcut'
import { gerarCertificadoPdf } from '@/lib/certificados/gerarCertificadoPdf'

interface AcademiaRow {
  id: string
  nome: string
  sigla: string | null
  cidade: string | null
  status?: string | null
  atletas: number
}

export default function AcademiasFedaracaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [academias, setAcademias] = useState<AcademiaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCidade, setFilterCidade] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [federacaoId, setFederacaoId] = useState<string | null>(null)
  const [downloadingCertificado, setDownloadingCertificado] = useState<string | null>(null)
  const pageSize = 50

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: role } = await supabase
          .from('user_roles')
          .select('federacao_id')
          .eq('user_id', user.id)
          .not('federacao_id', 'is', null)
          .limit(1)
          .single()

        if (!role?.federacao_id) return
        
        setFederacaoId(role.federacao_id)

        // Fetch from API endpoint (same as /academias page)
        console.log('📤 Buscando academias via API endpoint...')
        const response = await fetch('/api/academias/listar')
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Erro na API:', errorData.error)
          setAcademias([])
          setTotalCount(0)
          return
        }

        const responseData = await response.json()
        const { academias: allAcademias, error: apiError } = responseData

        if (apiError) {
          console.error('❌ Erro da API:', apiError)
          setAcademias([])
          setTotalCount(0)
          return
        }

        console.log('✅ Academias retornadas pela API:', allAcademias?.length || 0)
        
        // Filter by federacao_id
        let filtered = (allAcademias || []).filter((a: any) => a.federacao_id === role.federacao_id)

        // Apply local filters
        if (filterStatus) {
          filtered = filtered.filter((a: any) => a.ativo === (filterStatus === 'Ativa'))
        }
        if (filterCidade) {
          filtered = filtered.filter((a: any) => 
            a.endereco_cidade?.toLowerCase().includes(filterCidade.toLowerCase())
          )
        }

        // Sort by name
        filtered.sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

        // Count atletas for each academia (optional - can be removed if slow)
        const atletasCounts = new Map<string, number>()
        filtered.forEach((a: any) => {
          atletasCounts.set(a.id, 0) // Initialize with 0
        })

        const totalFiltered = filtered.length

        // Apply pagination
        const start = page * pageSize
        const end = start + pageSize
        const paginated = filtered.slice(start, end)

        // Map to expected format
        const mapped = paginated.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          sigla: a.sigla,
          cidade: a.endereco_cidade,
          status: a.ativo ? 'Ativa' : 'Inativa',
          atletas: atletasCounts.get(a.id) || 0,
        }))

        setAcademias(mapped)
        setTotalCount(totalFiltered)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase, page, filterStatus, filterCidade])

  const handleDownloadCertificado = async (academiaId: string, nome: string) => {
    try {
      setDownloadingCertificado(academiaId)
      const response = await fetch(`/api/academias/${academiaId}/certificado`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao gerar certificado' }))
        throw new Error(errorData.error || 'Erro ao gerar certificado')
      }

      const result = await response.json()
      if (!result?.certificadoData) {
        throw new Error('Dados do certificado não encontrados')
      }

      await gerarCertificadoPdf(result.certificadoData)
    } catch (error) {
      console.error('Error downloading certificate:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Erro ao baixar certificado'}`)
    } finally {
      setDownloadingCertificado(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Academias Filiadas</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Toolbar */}
        <div className="flex gap-3 mb-8">
          <SearchShortcut />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Todos Status</option>
            <option value="Ativa">Ativa</option>
            <option value="Inativa">Inativa</option>
            <option value="Suspensa">Suspensa</option>
          </select>
          <input
            type="text"
            placeholder="Filtrar por cidade..."
            value={filterCidade}
            onChange={(e) => { setFilterCidade(e.target.value); setPage(0); }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={() => exportAcademiasToPDF(academias)}
            disabled={academias.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar PDF"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => exportAcademiasToExcel(academias)}
            disabled={academias.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 text-gray-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all ml-auto"
          >
            <Plus className="w-5 h-5" />
            Nova Academia
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : totalCount === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Nenhuma academia filiada</h3>
              <p className="text-gray-400 mb-6">Comece filiando a primeira academia à sua federação</p>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all">
                <Plus className="w-4 h-4 inline mr-2" />
                Filiar Primeira Academia
              </button>
            </div>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {academias.map(academia => (
              <div key={academia.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{academia.nome}</h3>
                      <p className="text-gray-400 text-sm">{academia.sigla || '—'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold">
                    {academia.status || 'Ativa'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <p className="text-gray-400"><span className="text-gray-300 font-semibold">{academia.cidade || '—'}</span></p>
                  <p className="text-gray-400"><span className="text-gray-300 font-semibold">{academia.atletas}</span> atletas</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => router.push(`/academias/${academia.id}/editar`)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDownloadCertificado(academia.id, academia.nome)}
                    disabled={downloadingCertificado === academia.id}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingCertificado === academia.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                        <span className="hidden sm:inline">Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Certificado</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-8">
            <p className="text-gray-400 text-sm">
              Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} de {totalCount} academias
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
          </> 
        )}
      </div>

      {/* Modal */}
      {federacaoId && (
        <NovaAcademiaModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          federacaoId={federacaoId}
          onSuccess={() => {
            setPage(0)
            load()
          }}
        />
      )}
    </div>
  )

  async function load() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: role } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .not('federacao_id', 'is', null)
        .limit(1)
        .single()

      if (!role?.federacao_id) return
      
      setFederacaoId(role.federacao_id)

      // Fetch from API endpoint (same as /academias page)
      const response = await fetch('/api/academias/listar')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erro na API:', errorData.error)
        setAcademias([])
        setTotalCount(0)
        return
      }

      const responseData = await response.json()
      const { academias: allAcademias, error: apiError } = responseData

      if (apiError) {
        console.error('❌ Erro da API:', apiError)
        setAcademias([])
        setTotalCount(0)
        return
      }

      // Filter by federacao_id
      let filtered = (allAcademias || []).filter((a: any) => a.federacao_id === role.federacao_id)

      // Apply local filters
      if (filterStatus) {
        filtered = filtered.filter((a: any) => a.ativo === (filterStatus === 'Ativa'))
      }
      if (filterCidade) {
        filtered = filtered.filter((a: any) => 
          a.endereco_cidade?.toLowerCase().includes(filterCidade.toLowerCase())
        )
      }

      // Sort by name
      filtered.sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

      const totalFiltered = filtered.length

      // Apply pagination
      const start = page * pageSize
      const end = start + pageSize
      const paginated = filtered.slice(start, end)

      // Map to expected format
      const mapped = paginated.map((a: any) => ({
        id: a.id,
        nome: a.nome,
        sigla: a.sigla,
        cidade: a.endereco_cidade,
        status: a.ativo ? 'Ativa' : 'Inativa',
        atletas: 0, // Can be populated later if needed
      }))

      setAcademias(mapped)
      setTotalCount(totalFiltered)
    } finally {
      setLoading(false)
    }
  }
}
