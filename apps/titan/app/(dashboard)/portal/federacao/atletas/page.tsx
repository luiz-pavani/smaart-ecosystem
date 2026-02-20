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
}

export default function AtletasFedaracaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaRow[]>([])

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

        const { data } = await supabase
          .from('atletas')
          .select('id, nome, graduacao, academia:academias(nome)')
          .eq('federacao_id', role.federacao_id)
          .order('nome', { ascending: true })

        const mapped = (data || []).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          graduacao: item.graduacao,
          academia: Array.isArray(item.academia) ? item.academia[0] || null : item.academia || null,
        }))

        setAtletas(mapped)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  const atletasFiltrados = atletas.filter((a) =>
    a.nome?.toLowerCase().includes(search.toLowerCase())
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nome</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Academia</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white">Graduacao</th>
                  </tr>
                </thead>
                <tbody>
                  {atletasFiltrados.map((atleta) => (
                    <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-300">{atleta.nome}</td>
                      <td className="px-6 py-4 text-gray-300">{atleta.academia?.nome || '—'}</td>
                      <td className="px-6 py-4 text-gray-300">{atleta.graduacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-gray-400 text-sm mt-4">Total: {atletasFiltrados.length} atletas</p>
          </>
        )}
      </div>
    </div>
  )
}
