'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Filter, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AtletaRow {
  id: string
  nome: string
  graduacao: string | null
  academia?: { nome: string } | null
  status: string | null
  validade: string | null
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
  const [sortBy, setSortBy] = useState<'nome'|'academia'|'graduacao'|'status'|'validade'>('nome')
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc')
  const pageSize = 20

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
            .select('id, nome_completo, graduacao, academia_id, status_membro, status_plano, data_expiracao', { count: 'exact' });
          if (search) {
            query = query.ilike('nome_completo', `%${search}%`);
          }
          if (filterGraduacao) {
            query = query.eq('graduacao', filterGraduacao);
          }
          const res = await query.order('nome_completo', { ascending: true }).range(start, end);
          mapped = (res.data || []).map((item: any) => ({
            id: item.id,
            nome: item.nome_completo ?? '',
            graduacao: item.graduacao ?? '',
            academia: item.academia_id ? { nome: item.academia_id } : null,
            status: item.status_plano ?? '—',
            validade: item.data_expiracao ?? '—',
          }));
            // ...existing code...
          count = res.count;
        } else {
          query = supabase
            .from('atletas')
            .select('id, nome, graduacao, academia:academias(nome)', { count: 'exact' })
            .eq('federacao_id', role.federacao_id);
          if (search) {
            query = query.ilike('nome', `%${search}%`);
          }
          if (filterGraduacao) {
            query = query.eq('graduacao', filterGraduacao);
          }
          const res = await query.order('nome', { ascending: true }).range(start, end);
          mapped = (res.data || []).map((item: any) => ({
            id: item.id,
            nome: item.nome_completo ?? '',
            graduacao: item.graduacao ?? '',
            academia: item.academia_id ? { nome: '—' } : null,
            status: item.status_plano ?? '—',
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
  }, [supabase, page, search, filterGraduacao])

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
        <div className="flex gap-3 mb-8">
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
          <select
            value={filterGraduacao}
            onChange={(e) => { setFilterGraduacao(e.target.value); setPage(0); }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Todas Graduações</option>
            <option value="Branca">Branca</option>
            <option value="Cinza">Cinza</option>
            <option value="Azul">Azul</option>
            <option value="Amarela">Amarela</option>
            <option value="Laranja">Laranja</option>
            <option value="Verde">Verde</option>
            <option value="Roxa">Roxa</option>
            <option value="Marrom">Marrom</option>
            <option value="Preta">Preta</option>
          </select>
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('graduacao');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>Graduação</th>
                    {/* STATUS column removed */}
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white cursor-pointer" onClick={() => {setSortBy('status');setSortOrder(sortOrder==='asc'?'desc':'asc')}}>Situação</th>
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
                        <a href={`/portal/federacao/atletas/${atleta.id}`} className="underline hover:text-blue-400 transition-colors">
                          {atleta.nome}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{atleta.academia?.nome || '—'}</td>
                      <td className="px-6 py-4 text-gray-300">{atleta.graduacao || '—'}</td>
                      <td className="px-6 py-4">
                        {atleta.status === 'Active' ? (
                          <span title="Ativo" className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2 align-middle"></span>
                        ) : atleta.status === 'Expired' ? (
                          <span title="Expirado" className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2 align-middle"></span>
                        ) : (
                          <span title={atleta.status || 'Indefinido'} className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-2 align-middle"></span>
                        )}
                        <span className="text-gray-300 align-middle">{atleta.status}</span>
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
