'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, Filter, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AtletaRow {
  id: string
  nome: string
  cpf: string | null
  graduacao: string | null
  status?: string | null
}

export default function AtletasAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Nao autenticado')

        const { data: role } = await supabase
          .from('user_roles')
          .select('academia_id')
          .eq('user_id', user.id)
          .not('academia_id', 'is', null)
          .limit(1)
          .single()

        if (!role?.academia_id) throw new Error('Academia nao encontrada')

        const start = page * pageSize
        const end = start + pageSize - 1

        const { data, count } = await supabase
          .from('atletas')
          .select('id, nome, cpf, graduacao, status', { count: 'exact' })
          .eq('academia_id', role.academia_id)
          .order('nome', { ascending: true })
          .range(start, end)

        setAtletas(data || [])
        setTotalCount(count || 0)
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar atletas')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase, page])

  const atletasFiltrados = atletas.filter((atleta) =>
    atleta.nome?.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-white">Meus Atletas</h1>
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all">
            <Plus className="w-4 h-4" />
            Novo Atleta
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : totalCount === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum atleta cadastrado</h3>
              <p className="text-gray-400 mb-6">Comece adicionando o primeiro atleta da sua academia</p>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all">
                <Plus className="w-4 h-4 inline mr-2" />
                Cadastrar Primeiro Atleta
              </button>
            </div>
          </div>
        ) : (
          <>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nome</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">CPF</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Graduacao</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {atletasFiltrados.map((atleta) => (
                  <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300">{atleta.nome}</td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-sm">{atleta.cpf || '—'}</td>
                    <td className="px-6 py-4 text-gray-300">{atleta.graduacao || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        (atleta.status || 'Ativo') === 'Ativo'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {atleta.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
                        Editar
                      </button>
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
