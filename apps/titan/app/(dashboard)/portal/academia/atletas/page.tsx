'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Loader2, Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface KyuDanOption {
  id: number
  cor_faixa: string
  kyu_dan: string
  icones?: string
}

interface AtletaRow {
  id: string
  nome_completo: string
  graduacao: string | null
  kyuDanIcones?: string | null
  kyuDanNome?: string | null
  status_plano: string | null
  statusMembro: string | null
  validade: string | null
}

export default function AtletasAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaRow[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterGraduacao, setFilterGraduacao] = useState('')
  const [graduacoes, setGraduacoes] = useState<KyuDanOption[]>([])
  const [filterSituacao, setFilterSituacao] = useState('')
  const [filterStatusMembro, setFilterStatusMembro] = useState('')
  const [downloadingCSV, setDownloadingCSV] = useState(false)
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const pageSize = 100

  useEffect(() => {
    const loadGraduacoes = async () => {
      const { data } = await supabase
        .from('kyu_dan')
        .select('id, cor_faixa, kyu_dan, icones')
        .order('id', { ascending: true })
      setGraduacoes((data as KyuDanOption[]) || [])
    }
    loadGraduacoes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const resolvedAcademiaId = await resolveAcademiaId(supabase)
        if (!resolvedAcademiaId) return

        setAcademiaId(resolvedAcademiaId)

        const start = page * pageSize
        const end = start + pageSize - 1

        let query = supabase
          .from('user_fed_lrsj')
          .select('stakeholder_id, nome_completo, status_plano, status_membro, data_expiracao, kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)', { count: 'exact' })
          .eq('academia_id', resolvedAcademiaId)

        if (search) query = query.ilike('nome_completo', `%${search}%`)
        if (filterGraduacao) query = query.eq('kyu_dan_id', Number(filterGraduacao))
        if (filterSituacao) query = query.eq('status_plano', filterSituacao)
        if (filterStatusMembro) query = query.eq('status_membro', filterStatusMembro)

        const { data, count } = await query.order('nome_completo', { ascending: true }).range(start, end)

        setAtletas((data || []).map((item: any) => ({
          id: item.stakeholder_id,
          nome_completo: item.nome_completo ?? '',
          graduacao: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
          kyuDanIcones: item.kyu_dan?.icones || null,
          kyuDanNome: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
          status_plano: item.status_plano ?? null,
          statusMembro: item.status_membro ?? 'Em análise',
          validade: item.data_expiracao ?? '—',
        })))
        setTotalCount(count || 0)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, search, filterGraduacao, filterSituacao, filterStatusMembro]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => {
    setSearch('')
    setFilterGraduacao('')
    setFilterSituacao('')
    setFilterStatusMembro('')
    setPage(0)
  }

  const downloadCSV = async () => {
    try {
      setDownloadingCSV(true)
      if (!academiaId) return

      let csvQuery = supabase
        .from('user_fed_lrsj')
        .select(`
          stakeholder_id, nome_completo, nome_patch, genero, data_nascimento,
          email, telefone, status_membro, status_plano, data_expiracao,
          kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan)
        `)
        .order('nome_completo', { ascending: true })

      if (academiaId) csvQuery = csvQuery.eq('academia_id', academiaId)

      const { data, error } = await csvQuery

      if (error || !data?.length) {
        alert('Nenhum atleta encontrado')
        return
      }

      const headers = ['Nome', 'Nome Patch', 'Gênero', 'Nascimento', 'Email', 'Telefone', 'Faixa', 'Kyu/Dan', 'Status Membro', 'Status Plano', 'Validade']
      const csv = [
        headers.join(','),
        ...data.map((r: any) => [
          `"${(r.nome_completo || '').replace(/"/g, '""')}"`,
          `"${(r.nome_patch || '').replace(/"/g, '""')}"`,
          `"${(r.genero || '').replace(/"/g, '""')}"`,
          r.data_nascimento || '',
          r.email || '',
          r.telefone || '',
          `"${(r.kyu_dan?.cor_faixa || '').replace(/"/g, '""')}"`,
          `"${(r.kyu_dan?.kyu_dan || '').replace(/"/g, '""')}"`,
          `"${(r.status_membro || '').replace(/"/g, '""')}"`,
          `"${(r.status_plano || '').replace(/"/g, '""')}"`,
          r.data_expiracao || '',
        ].join(','))
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.setAttribute('href', URL.createObjectURL(blob))
      link.setAttribute('download', `atletas_academia_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      alert('Erro ao baixar CSV')
    } finally {
      setDownloadingCSV(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meus Atletas</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Toolbar */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={filterGraduacao}
              onChange={(e) => { setFilterGraduacao(e.target.value); setPage(0) }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todas Graduações</option>
              {graduacoes.map((g) => (
                <option key={g.id} value={g.id}>{g.cor_faixa} | {g.kyu_dan}</option>
              ))}
            </select>

            <select
              value={filterSituacao}
              onChange={(e) => { setFilterSituacao(e.target.value); setPage(0) }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todos Status Plano</option>
              <option value="Válido">Válido</option>
              <option value="Vencido">Vencido</option>
            </select>

            <select
              value={filterStatusMembro}
              onChange={(e) => { setFilterStatusMembro(e.target.value); setPage(0) }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todos Status Membro</option>
              <option value="Em análise">Em análise</option>
              <option value="Aceito">Aceito</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar Filtros
            </button>
            <button
              onClick={downloadCSV}
              disabled={totalCount === 0 || downloadingCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg text-green-400 hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingCSV ? <><Loader2 className="w-4 h-4 animate-spin" />Baixando...</> : <><Download className="w-4 h-4" />Baixar CSV ({totalCount} atletas)</>}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : totalCount === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum atleta encontrado</h3>
              <p className="text-gray-400">Nenhum atleta vinculado a esta academia na federação</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nome</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white" title="Graduação">🥋</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white" title="Status do Plano">$</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white" title="Status do Membro">👤</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {atletas.map((atleta) => (
                    <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-300">
                        <a href={`/portal/academia/atletas/${atleta.id}`} className="underline hover:text-blue-400 transition-colors">
                          {atleta.nome_completo}
                        </a>
                      </td>
                      <td className="px-3 py-4 text-center" title={atleta.kyuDanNome || '—'}>
                        <span className="text-lg">
                          {atleta.kyuDanNome?.includes('NÃO ESPECIFICADA') ? '❌' : (atleta.kyuDanIcones || (atleta.graduacao ? atleta.graduacao : '✖️'))}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {atleta.status_plano === 'Válido' ? (
                          <span title="Válido" className="inline-block w-4 h-4 rounded-full bg-green-500" />
                        ) : atleta.status_plano === 'Vencido' ? (
                          <span title="Vencido" className="inline-block w-4 h-4 rounded-full bg-red-500" />
                        ) : (
                          <span title={atleta.status_plano || 'Indefinido'} className="inline-block w-4 h-4 rounded-full bg-gray-400" />
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        {atleta.statusMembro === 'Aceito' ? (
                          <span title="Aceito" className="inline-block w-4 h-4 rounded-full bg-green-500" />
                        ) : atleta.statusMembro === 'Rejeitado' ? (
                          <span title="Rejeitado" className="inline-block w-4 h-4 rounded-full bg-red-500" />
                        ) : (
                          <span title="Em análise" className="inline-block w-4 h-4 rounded-full bg-yellow-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">{atleta.validade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-6">
              <p className="text-gray-400 text-sm">
                Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} de {totalCount} atletas
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
    </div>
  )
}
