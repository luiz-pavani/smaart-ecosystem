'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Building2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const pageSize = 12

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

        const { data: academiasData, count } = await supabase
          .from('academias')
          .select('id, nome, sigla, cidade, status', { count: 'exact' })
          .eq('federacao_id', role.federacao_id)
          .order('nome', { ascending: true })
          .range(start, end)

        const { data: atletasData } = await supabase
          .from('atletas')
          .select('id, academia_id')
          .eq('federacao_id', role.federacao_id)

        const counts = new Map<string, number>()
        ;(atletasData || []).forEach((a: any) => {
          counts.set(a.academia_id, (counts.get(a.academia_id) || 0) + 1)
        })

        const mapped = (academiasData || []).map((a: any) => ({
          ...a,
          atletas: counts.get(a.id) || 0,
        }))

        setAcademias(mapped)
        setTotalCount(count || 0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase, page])

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
        {/* Add Button */}
        <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all mb-8">
          <Plus className="w-5 h-5" />
          Nova Academia
        </button>

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

                <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all">
                  Editar
                </button>
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
    </div>
  )
}
