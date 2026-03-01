'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Loader2, Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface KyuDanOption {
  id: number
  cor_faixa: string
  kyu_dan: string
  icones?: string
}

interface AtletaRow {
  id: string
  numero_membro?: string
  nome: string
  graduacao: string | null
  kyuDanIcones?: string | null
  kyuDanNome?: string | null
  academia?: { nome: string } | null
  status: string | null
  validade: string | null
  dadosValidados?: boolean
}

export default function AtletasFedaracaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaRow[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterGraduacao, setFilterGraduacao] = useState('')
  const [graduacoes, setGraduacoes] = useState<KyuDanOption[]>([])
  const [filterAcademia, setFilterAcademia] = useState('')
  const [filterSituacao, setFilterSituacao] = useState('')
  const [filterValidado, setFilterValidado] = useState('')
  const [downloadingCSV, setDownloadingCSV] = useState(false)
  const [sortBy, setSortBy] = useState<'nome'|'academia'|'graduacao'|'status'|'validade'>('nome')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc')
  const pageSize = 100

  useEffect(() => {
    const loadGraduacoes = async () => {
      const { data } = await supabase
        .from('kyu_dan')
        .select('id, cor_faixa, kyu_dan, icones')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      setGraduacoes((data as KyuDanOption[]) || [])
    }

    loadGraduacoes()
  }, [supabase])

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

        const start = page * pageSize
        const end = start + pageSize - 1

        let query, mapped, count;
        // LRSJ federation UUID (actual value)
        const LRSJ_FED_ID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d';
        if (role.federacao_id === LRSJ_FED_ID) {
          query = supabase
            .from('user_fed_lrsj')
            .select('id, numero_membro, nome_completo, graduacao, academias, status_plano, data_expiracao, dados_validados, kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)', { count: 'exact' });
          if (search) {
            query = query.ilike('nome_completo', `%${search}%`);
          }
          if (filterGraduacao) {
            query = query.eq('kyu_dan_id', Number(filterGraduacao));
          }
          if (filterAcademia) {
            query = query.ilike('academias', `%${filterAcademia}%`);
          }
          if (filterSituacao) {
            query = query.eq('status_plano', filterSituacao);
          }
          if (filterValidado) {
            const isValidado = filterValidado === 'sim';
            query = query.eq('dados_validados', isValidado);
          }
          const res = await query.order('nome_completo', { ascending: true }).range(start, end);
          mapped = (res.data || []).map((item: any) => ({
            id: item.id,
            numero_membro: item.numero_membro,
            nome: item.nome_completo ?? '',
            graduacao: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : (item.graduacao ?? ''),
            kyuDanIcones: item.kyu_dan?.icones || null,
            kyuDanNome: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
            academia: item.academias ? { nome: item.academias } : null,
            status: item.status_plano ?? '—',
            validade: item.data_expiracao ?? '—',
            dadosValidados: item.dados_validados ?? false,
          }));
          count = res.count;
        } else {
          query = supabase
            .from('atletas')
            .select('id, nome, graduacao, academia:academias(nome), kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)', { count: 'exact' })
            .eq('federacao_id', role.federacao_id);
          if (search) {
            query = query.ilike('nome', `%${search}%`);
          }
          if (filterGraduacao) {
            query = query.eq('kyu_dan_id', Number(filterGraduacao));
          }
          const res = await query.order('nome', { ascending: true }).range(start, end);
          mapped = (res.data || []).map((item: any) => ({
            id: item.id,
            nome: item.nome_completo ?? '',
            graduacao: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : (item.graduacao ?? ''),
            kyuDanIcones: item.kyu_dan?.icones || null,
            kyuDanNome: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
            academia: item.academia_id ? { nome: '—' } : null,
            status: item.status_plano ?? '—',
            validade: item.data_expiracao ?? '—',
            dadosValidados: false,
          }));
          count = res.count;
        }
        setAtletas(mapped);
        setTotalCount(count || 0);
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase, page, search, filterGraduacao, filterAcademia, filterSituacao, filterValidado])

  const clearFilters = () => {
    setSearch('')
    setFilterGraduacao('')
    setFilterAcademia('')
    setFilterSituacao('')
    setFilterValidado('')
    setPage(0)
  }

  const downloadAllFilteredCSV = async () => {
    try {
      setDownloadingCSV(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Erro: Usuário não autenticado')
        return
      }

      const { data: role } = await supabase
        .from('user_roles')
        .select('federacao_id')
        .eq('user_id', user.id)
        .not('federacao_id', 'is', null)
        .limit(1)
        .single()

      if (!role?.federacao_id) {
        alert('Erro: Federação não encontrada')
        return
      }

      let query
      const LRSJ_FED_ID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
      
      if (role.federacao_id === LRSJ_FED_ID) {
        // Query com todos os campos da tabela
        query = supabase
          .from('user_fed_lrsj')
          .select(`
            id, numero_membro, nome_completo, nome_patch, genero, data_nascimento, idade, 
            nacionalidade, email, telefone, cidade, estado, endereco_residencia, graduacao, dan, 
            nivel_arbitragem, academias, status_membro, data_adesao, plano_tipo, status_plano, 
            data_expiracao, url_foto, url_documento_id, url_certificado_dan, tamanho_patch,
            lote_id, observacoes, dados_validados, validado_em, validado_por, updated_at,
            kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)
          `)
        
        if (search) query = query.ilike('nome_completo', `%${search}%`)
        if (filterGraduacao) query = query.eq('kyu_dan_id', Number(filterGraduacao))
        if (filterAcademia) query = query.ilike('academias', `%${filterAcademia}%`)
        if (filterSituacao) query = query.eq('status_plano', filterSituacao)
        if (filterValidado) {
          const isValidado = filterValidado === 'sim'
          query = query.eq('dados_validados', isValidado)
        }

        const { data, error } = await query.order('nome_completo', { ascending: true })
        
        if (error) {
          alert('Erro ao buscar dados: ' + error.message)
          return
        }

        if (!data || data.length === 0) {
          alert('Nenhum atleta encontrado com os filtros selecionados')
          return
        }

        // Headers com todos os campos
        const headers = [
          'ID', 'Número Membro', 'Nome Completo', 'Nome Patch', 'Gênero', 'Data Nascimento', 
          'Idade', 'Nacionalidade', 'Email', 'Telefone', 'Cidade', 'Estado', 'Endereço', 
          'Graduação', 'Cor Faixa', 'Kyu/Dan', 'Dan', 'Nível Arbitragem', 'Academia', 'Status Membro', 'Data Adesão', 
          'Plano', 'Status Plano', 'Data Expiração', 'URL Foto', 'URL Documento ID', 
          'URL Certificado Dan', 'Tamanho Patch', 'Lote ID', 'Observações', 'Dados Validados', 
          'Validado Em', 'Validado Por', 'Atualizado Em'
        ]

        const csvContent = [
          headers.join(','),
          ...data.map((item: any) => [
            item.id || '',
            `"${(item.numero_membro || '').replace(/"/g, '""')}"`,
            `"${(item.nome_completo || '').replace(/"/g, '""')}"`,
            `"${(item.nome_patch || '').replace(/"/g, '""')}"`,
            `"${(item.genero || '').replace(/"/g, '""')}"`,
            item.data_nascimento || '',
            item.idade || '',
            `"${(item.nacionalidade || '').replace(/"/g, '""')}"`,
            item.email || '',
            item.telefone || '',
            `"${(item.cidade || '').replace(/"/g, '""')}"`,
            item.estado || '',
            `"${(item.endereco_residencia || '').replace(/"/g, '""')}"`,
            `"${(item.graduacao || '').replace(/"/g, '""')}"`,
            `"${(item.kyu_dan?.cor_faixa || '').replace(/"/g, '""')}"`,
            `"${(item.kyu_dan?.kyu_dan || '').replace(/"/g, '""')}"`,
            item.dan || '',
            `"${(item.nivel_arbitragem || '').replace(/"/g, '""')}"`,
            `"${(item.academias || '').replace(/"/g, '""')}"`,
            `"${(item.status_membro || '').replace(/"/g, '""')}"`,
            item.data_adesao || '',
            `"${(item.plano_tipo || '').replace(/"/g, '""')}"`,
            `"${(item.status_plano || '').replace(/"/g, '""')}"`,
            item.data_expiracao || '',
            item.url_foto || '',
            item.url_documento_id || '',
            item.url_certificado_dan || '',
            `"${(item.tamanho_patch || '').replace(/"/g, '""')}"`,
            `"${(item.lote_id || '').replace(/"/g, '""')}"`,
            `"${(item.observacoes || '').replace(/"/g, '""')}"`,
            item.dados_validados ? 'Sim' : 'Não',
            item.validado_em || '',
            item.validado_por || '',
            item.updated_at || ''
          ].join(','))
        ].join('\n')

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `atletas_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Erro ao baixar CSV:', error)
      alert('Erro ao baixar CSV. Verifique o console.')
    } finally {
      setDownloadingCSV(false)
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
          <h1 className="text-3xl font-bold text-white">Todos os Atletas</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Toolbar */}
        <div className="mb-8 space-y-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filterAcademia}
              onChange={(e) => { setFilterAcademia(e.target.value); setPage(0); }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todas Academias</option>
              <option value="Santa Maria">Santa Maria</option>
              <option value="CaJu">CaJu</option>
              <option value="Castelo Branco">Castelo Branco</option>
              <option value="OSL">OSL</option>
            </select>

            <select
              value={filterGraduacao}
              onChange={(e) => { setFilterGraduacao(e.target.value); setPage(0); }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todas Graduações</option>
              {graduacoes.map((graduacao) => (
                <option key={graduacao.id} value={graduacao.id}>
                  {graduacao.cor_faixa} | {graduacao.kyu_dan}
                </option>
              ))}
            </select>

            <select
              value={filterSituacao}
              onChange={(e) => { setFilterSituacao(e.target.value); setPage(0); }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todas Situações</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={filterValidado}
              onChange={(e) => { setFilterValidado(e.target.value); setPage(0); }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todos Registros</option>
              <option value="sim">Validado</option>
              <option value="nao">Não Validado</option>
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
              onClick={downloadAllFilteredCSV}
              disabled={totalCount === 0 || downloadingCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg text-green-400 hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingCSV ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Baixar CSV ({totalCount} atletas)
                </>
              )}
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
              <p className="text-gray-400 mb-6">Aguarde o cadastro dos primeiros atletas pelas academias filiadas</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('nome');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>Nome</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('academia');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>Academia</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('graduacao');setSortOrder(sortOrder==='asc'?'desc':'asc')}} title="Graduação">🥋</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('status');setSortOrder(sortOrder==='asc'?'desc':'asc')}} title="Situação">📊</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white" title="Validado">✓</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('validade');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>VENCIMENTO</th>
                  </tr>
                </thead>
                <tbody>
                  {[...atletas].sort((a, b) => {
                    const valA = a[sortBy] || '';
                    const valB = b[sortBy] || '';
                    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                    return 0;
                  }).map((atleta) => (
                    <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-300">
                        <a href={`/portal/federacao/atletas/${atleta.numero_membro || atleta.id}`} className="underline hover:text-blue-400 transition-colors">
                          {atleta.nome}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{atleta.academia?.nome || '—'}</td>
                      <td className="px-3 py-4 text-center" title={atleta.kyuDanNome || atleta.graduacao || 'Sem graduação'}>
                        <span className="text-2xl">
                          {atleta.kyuDanNome?.includes('NÃO ESPECIFICADA') ? '❌' : (atleta.kyuDanIcones || (atleta.graduacao ? atleta.graduacao : '✖️'))}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {atleta.status === 'Active' ? (
                          <span title="Ativo" className="inline-block w-4 h-4 rounded-full bg-green-500"></span>
                        ) : atleta.status === 'Expired' ? (
                          <span title="Expirado" className="inline-block w-4 h-4 rounded-full bg-red-500"></span>
                        ) : (
                          <span title={atleta.status || 'Indefinido'} className="inline-block w-4 h-4 rounded-full bg-gray-400"></span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        {atleta.dadosValidados ? (
                          <span title="Validado" className="inline-block w-4 h-4 rounded-full bg-green-500"></span>
                        ) : (
                          <span title="Não validado" className="inline-block w-4 h-4 rounded-full bg-yellow-500"></span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">{atleta.validade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-gray-400 text-sm">
                Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} de {totalCount} atletas
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
