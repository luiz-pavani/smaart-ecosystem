'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Loader2, Download, X, CheckCircle, XCircle } from 'lucide-react'
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
  nome_completo: string
  graduacao: string | null
  kyuDanIcones?: string | null
  kyuDanNome?: string | null
  academia?: { nome: string } | null
  status: string | null
  statusMembro: string | null
  status_plano: string | null
  validade: string | null
}

export default function AtletasFedaracaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaRow[]>([])
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterGraduacao, setFilterGraduacao] = useState('')
  const [graduacoes, setGraduacoes] = useState<KyuDanOption[]>([])
  const [filterAcademia, setFilterAcademia] = useState('')
  const [filterSituacao, setFilterSituacao] = useState('')
  const [filterStatusMembro, setFilterStatusMembro] = useState('')
  const [downloadingCSV, setDownloadingCSV] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [aprovando, setAprovando] = useState<string | null>(null)
  const [academiasOptions, setAcademiasOptions] = useState<{ id: string; sigla: string; nome: string }[]>([])
  const [sortBy, setSortBy] = useState<'nome_completo'|'academia'|'graduacao'|'status'|'validade'>('nome_completo')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc')
  const pageSize = 100

  // Debounce search input — only trigger fetch after 300ms of no typing
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    const loadOptions = async () => {
      const [gradRes, acadRes] = await Promise.all([
        supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').eq('ativo', true).order('ordem', { ascending: true }),
        supabase.from('academias').select('id, sigla, nome').order('sigla', { ascending: true }),
      ])
      setGraduacoes((gradRes.data as KyuDanOption[]) || [])
      setAcademiasOptions(acadRes.data || [])
    }
    loadOptions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: perfilArr } = await supabase
          .from('stakeholders')
          .select('role, federacao_id')
          .eq('id', user.id)
          .limit(1)

        const perfil = perfilArr?.[0]
        if (!perfil) return

        const isMaster = perfil.role === 'master_access'
        if (!isMaster && !perfil.federacao_id) return

        // Alias for downstream compatibility
        const role = perfil

        const start = page * pageSize
        const end = start + pageSize - 1

        let query, mapped, count;
        // LRSJ federation identifiers (UUID atual + legado numérico)
        const LRSJ_FED_ID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d';
        const roleFederacaoId = String(perfil.federacao_id ?? '').trim();
        // master_access always uses LRSJ view (all athletes live in user_fed_lrsj)
        const isLrsjFederacao = isMaster || roleFederacaoId === LRSJ_FED_ID || roleFederacaoId === '1';
        if (isLrsjFederacao) {
          query = supabase
            .from('user_fed_lrsj')
            .select('stakeholder_id, nome_completo, academias, academia_id, status_plano, status_membro, data_expiracao, kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)', { count: 'exact' });
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
          if (filterStatusMembro) {
            query = query.eq('status_membro', filterStatusMembro);
          }
          const res = await query.order('nome_completo', { ascending: true }).range(start, end);

          if (res.error) {
            console.error('Erro ao carregar user_fed_lrsj:', res.error)
            setAtletas([])
            setTotalCount(0)
            return
          }

          const academiaIds = Array.from(new Set((res.data || [])
            .map((item: any) => item.academia_id)
            .filter(Boolean)))

          let academiaSiglaById: Record<string, string> = {}
          if (academiaIds.length > 0) {
            const { data: academiasData } = await supabase
              .from('academias')
              .select('id, sigla')
              .in('id', academiaIds)

            academiaSiglaById = (academiasData || []).reduce((acc: Record<string, string>, academia: any) => {
              if (academia?.id && academia?.sigla) {
                acc[academia.id] = academia.sigla
              }
              return acc
            }, {})
          }

          mapped = (res.data || []).map((item: any) => ({
            id: item.stakeholder_id,
            nome_completo: item.nome_completo ?? '',
            graduacao: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : '',
            kyuDanIcones: item.kyu_dan?.icones || null,
            kyuDanNome: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
            academia: academiaSiglaById[item.academia_id] ? { nome: academiaSiglaById[item.academia_id] } : (item.academias ? { nome: item.academias } : null),
            status: item.status_plano ?? '—',
            statusMembro: item.status_membro ?? 'Em análise',
            status_plano: item.status_plano ?? null,
            validade: item.data_expiracao ?? '—',
          }));
          count = res.count;
        } else {
          query = supabase
            .from('stakeholders')
            .select('id, nome_completo, graduacao, status_plano, status_membro, data_expiracao, academia:academias(sigla), kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)', { count: 'exact' })
            .eq('role', 'atleta')
          if (!isMaster && perfil.federacao_id) {
            query = query.eq('federacao_id', perfil.federacao_id)
          }
          if (search) {
            query = query.ilike('nome_completo', `%${search}%`);
          }
          if (filterGraduacao) {
            query = query.eq('kyu_dan_id', Number(filterGraduacao));
          }
          const res = await query.order('nome_completo', { ascending: true }).range(start, end);
          mapped = (res.data || []).map((item: any) => ({
            id: item.id,
            nome_completo: item.nome_completo ?? '',
            graduacao: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : (item.graduacao ?? ''),
            kyuDanIcones: item.kyu_dan?.icones || null,
            kyuDanNome: item.kyu_dan ? `${item.kyu_dan.cor_faixa} | ${item.kyu_dan.kyu_dan}` : null,
            academia: item.academia?.sigla ? { nome: item.academia.sigla } : null,
            status: item.status_plano ?? '—',
            statusMembro: item.status_membro ?? 'Em análise',
            status_plano: item.status_plano ?? null,
            validade: item.data_expiracao ?? '—',
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
  }, [page, search, filterGraduacao, filterAcademia, filterSituacao, filterStatusMembro]) // eslint-disable-line react-hooks/exhaustive-deps

  async function atualizarStatus(atletaId: string, novoStatus: 'Aceito' | 'Rejeitado') {
    if (!atletaId) return
    setAprovando(atletaId + novoStatus)
    try {
      const res = await fetch(`/api/atletas/${atletaId}/update-fed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_membro: novoStatus }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error || 'Erro ao atualizar status')
        return
      }
      // Atualiza local sem reload completo
      setAtletas(prev => prev.map(a =>
        a.id === atletaId ? { ...a, statusMembro: novoStatus } : a
      ))
    } finally {
      setAprovando(null)
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setFilterGraduacao('')
    setFilterAcademia('')
    setFilterSituacao('')
    setFilterStatusMembro('')
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

      const { data: perfilArr2 } = await supabase
        .from('stakeholders')
        .select('role, federacao_id')
        .eq('id', user.id)
        .limit(1)

      const perfil2 = perfilArr2?.[0]
      if (!perfil2) {
        alert('Erro: Perfil não encontrado')
        return
      }

      const isMaster2 = perfil2.role === 'master_access'
      if (!isMaster2 && !perfil2.federacao_id) {
        alert('Erro: Federação não encontrada')
        return
      }

      // Alias for downstream compatibility
      const role = perfil2

      let query
      const LRSJ_FED_ID = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
      const roleFederacaoId = String(perfil2.federacao_id ?? '').trim()
      // master_access always uses LRSJ view (all athletes live in user_fed_lrsj)
      const isLrsjFederacao = isMaster2 || roleFederacaoId === LRSJ_FED_ID || roleFederacaoId === '1'
      
      if (isLrsjFederacao) {
        // Query com todos os campos da tabela
        query = supabase
          .from('user_fed_lrsj')
          .select(`
            stakeholder_id, nome_completo, nome_patch, genero, data_nascimento, idade, 
            nacionalidade, email, telefone, cidade, estado, pais,
            nivel_arbitragem, academias, academia_id, academia:academia_id(sigla), status_membro, data_adesao, plano_tipo, status_plano, 
            data_expiracao, url_foto, url_documento_id, url_certificado_dan, tamanho_patch,
            lote_id, observacoes, validado_em, validado_por, updated_at,
            kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan, icones)
          `)
        
        if (search) query = query.ilike('nome_completo', `%${search}%`)
        if (filterGraduacao) query = query.eq('kyu_dan_id', Number(filterGraduacao))
        if (filterAcademia) query = query.ilike('academias', `%${filterAcademia}%`)
        if (filterSituacao) query = query.eq('status_plano', filterSituacao)
        if (filterStatusMembro) {
          query = query.eq('status_membro', filterStatusMembro)
        }
      } else {
        // Non-LRSJ / master_access: export from stakeholders
        query = supabase
          .from('stakeholders')
          .select('id, nome_completo, email, role, academia_id, federacao_id')
          .eq('role', 'atleta')
        if (!isMaster2 && perfil2.federacao_id) {
          query = query.eq('federacao_id', perfil2.federacao_id)
        }
        if (search) query = query.ilike('nome_completo', `%${search}%`)
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
          'Stakeholder ID', 'Nome Completo', 'Nome Patch', 'Gênero', 'Data Nascimento', 
          'Idade', 'Nacionalidade', 'Email', 'Telefone', 'Cidade', 'Estado', 'País', 
          'Cor Faixa', 'Kyu/Dan', 'Nível Arbitragem', 'Academia', 'Status Membro', 'Data Adesão', 
          'Plano', 'Status Plano', 'Data Expiração', 'URL Foto', 'URL Documento ID', 
          'URL Certificado Dan', 'Tamanho Patch', 'Lote ID', 'Observações', 'Validado Em', 'Validado Por', 'Atualizado Em'
        ]

        const csvContent = [
          headers.join(','),
          ...data.map((item: any) => [
            item.stakeholder_id || '',
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
            `"${(item.pais || '').replace(/"/g, '""')}"`,
            `"${(item.kyu_dan?.cor_faixa || '').replace(/"/g, '""')}"`,
            `"${(item.kyu_dan?.kyu_dan || '').replace(/"/g, '""')}"`,
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
    } catch (error) {
      console.error('Erro ao baixar CSV:', error)
      alert('Erro ao baixar CSV. Verifique o console.')
    } finally {
      setDownloadingCSV(false)
    }
  }

  const downloadPDF = async () => {
    if (atletas.length === 0) return
    setDownloadingPDF(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      doc.setFontSize(16)
      doc.setTextColor(30, 30, 30)
      doc.text('Lista de Filiados — LRSJ', 14, 16)
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      const filters = [
        search && `Busca: "${search}"`,
        filterStatusMembro && `Status: ${filterStatusMembro}`,
        filterSituacao && `Plano: ${filterSituacao}`,
        filterAcademia && `Academia: ${filterAcademia}`,
      ].filter(Boolean).join(' · ')
      doc.text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}${filters ? ' · ' + filters : ''} · ${atletas.length} atletas`,
        14, 22
      )

      autoTable(doc, {
        startY: 27,
        head: [['Nome', 'Academia', 'Faixa', 'Status Membro', 'Plano', 'Validade']],
        body: atletas.map(a => [
          a.nome_completo,
          a.academia?.nome || '—',
          a.graduacao || '—',
          a.statusMembro || '—',
          a.status_plano || '—',
          a.validade && a.validade !== '—'
            ? new Date(a.validade + 'T12:00:00').toLocaleDateString('pt-BR')
            : '—',
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 40 }, 2: { cellWidth: 45 }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 28 } },
      })

      doc.save(`filiados_lrsj_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    } finally {
      setDownloadingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
              {academiasOptions.map(a => (
                <option key={a.id} value={a.sigla || a.nome}>{a.sigla || a.nome}</option>
              ))}
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
              <option value="Válido">Válido</option>
              <option value="Vencido">Vencido</option>
              <option value="Pendente">Pendente</option>
            </select>

            <select
              value={filterStatusMembro}
              onChange={(e) => { setFilterStatusMembro(e.target.value); setPage(0); }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Todos Status do Membro</option>
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
              onClick={downloadAllFilteredCSV}
              disabled={totalCount === 0 || downloadingCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg text-green-400 hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingCSV ? 'Baixando...' : `CSV (${totalCount})`}
            </button>
            <button
              onClick={downloadPDF}
              disabled={atletas.length === 0 || downloadingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingPDF ? 'Gerando...' : `PDF (${atletas.length})`}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('nome_completo');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>Nome</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('academia');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>Academia</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('graduacao');setSortOrder(sortOrder==='asc'?'desc':'asc')}} title="Graduação">🥋</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('status');setSortOrder(sortOrder==='asc'?'desc':'asc')}} title="Status do Plano">$</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white" title="Status do Membro">👤</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('validade');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>VENCIMENTO</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-white">AÇÃO</th>
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
                        <a href={`/portal/federacao/atletas/${atleta.id}`} className="underline hover:text-blue-400 transition-colors">
                          {atleta.nome_completo}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{atleta.academia?.nome || '—'}</td>
                      <td className="px-3 py-4 text-center" title={atleta.kyuDanNome || atleta.graduacao || 'Sem graduação'}>
                        <span className="text-lg">
                          {atleta.kyuDanNome?.includes('NÃO ESPECIFICADA') ? '❌' : (atleta.kyuDanIcones || (atleta.graduacao ? atleta.graduacao : '✖️'))}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {atleta.status_plano === 'Válido' ? (
                          <span title="Válido" className="inline-block w-4 h-4 rounded-full bg-green-500"></span>
                        ) : atleta.status_plano === 'Vencido' ? (
                          <span title="Vencido" className="inline-block w-4 h-4 rounded-full bg-red-500"></span>
                        ) : (
                          <span title={atleta.status_plano || 'Indefinido'} className="inline-block w-4 h-4 rounded-full bg-gray-400"></span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        {atleta.statusMembro === 'Aceito' ? (
                          <span title="Aceito" className="inline-block w-4 h-4 rounded-full bg-green-500"></span>
                        ) : atleta.statusMembro === 'Rejeitado' ? (
                          <span title="Rejeitado" className="inline-block w-4 h-4 rounded-full bg-red-500"></span>
                        ) : (
                          <span title="Em análise" className="inline-block w-4 h-4 rounded-full bg-yellow-500"></span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">{atleta.validade}</td>
                      <td className="px-4 py-4">
                        {atleta.statusMembro !== 'Aceito' && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Aprovar"
                              disabled={aprovando === atleta.id + 'Aceito'}
                              onClick={() => atualizarStatus(atleta.id, 'Aceito')}
                              className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/40 text-green-400 transition-colors disabled:opacity-50"
                            >
                              {aprovando === atleta.id + 'Aceito' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            {atleta.statusMembro !== 'Rejeitado' && (
                              <button
                                title="Rejeitar"
                                disabled={aprovando === atleta.id + 'Rejeitado'}
                                onClick={() => atualizarStatus(atleta.id, 'Rejeitado')}
                                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors disabled:opacity-50"
                              >
                                {aprovando === atleta.id + 'Rejeitado' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
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
