'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Search, Swords, Users, Trophy, ChevronRight } from 'lucide-react'
import BracketView from '@/components/eventos/BracketView'

interface Bracket {
  id: string
  category_id: string
  tipo: string
  status: string
  num_rodadas: number
  area_id: number
  total_matches: number
  finished_matches: number
  total_athletes: number
  category: { id: string; nome_display: string; genero: string } | null
}

const TIPO_LABELS: Record<string, string> = {
  'single_elimination': 'Eliminacao Simples',
  'single_elimination_bronze': 'Eliminacao + Bronze',
  'single_elimination_repechage': 'Repescagem IJF',
  'double_elimination': 'Dupla Eliminacao',
  'round_robin': 'Todos contra Todos',
  'group_stage_elimination': 'Grupos + Eliminacao',
}

export default function ChavesPublicPage() {
  const router = useRouter()
  const params = useParams()
  const eventoId = params.id as string

  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [loading, setLoading] = useState(true)
  const [eventoNome, setEventoNome] = useState('')
  const [search, setSearch] = useState('')
  const [generoFilter, setGeneroFilter] = useState('')
  const [selectedBracket, setSelectedBracket] = useState<string | null>(null)
  const [bracketDetail, setBracketDetail] = useState<{ bracket: Bracket; slots: unknown[]; matches: unknown[] } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback(async () => {
    try {
      const [bRes, eRes] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/brackets`),
        fetch(`/api/eventos/${eventoId}`),
      ])
      const bJson = await bRes.json()
      const eJson = await eRes.json()
      // Only show published brackets
      if (bRes.ok) setBrackets((bJson.brackets || []).filter((b: Bracket) => b.status !== 'draft'))
      if (eRes.ok) setEventoNome(eJson.evento?.nome || '')
    } catch { /* silent */ } finally { setLoading(false) }
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const loadBracketDetail = async (bracketId: string) => {
    setLoadingDetail(true)
    setSelectedBracket(bracketId)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/brackets/${bracketId}`)
      const json = await res.json()
      if (res.ok) setBracketDetail(json)
    } catch { /* silent */ } finally { setLoadingDetail(false) }
  }

  const filtered = useMemo(() => {
    return brackets.filter(b => {
      if (search && !b.category?.nome_display.toLowerCase().includes(search.toLowerCase())) return false
      if (generoFilter && b.category?.genero !== generoFilter) return false
      return true
    })
  }, [brackets, search, generoFilter])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar ao Evento
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />Chaves
          </h1>
          <p className="text-slate-400 text-sm mt-1">{eventoNome}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search / filter bar */}
        {brackets.length > 0 && !selectedBracket && (
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar categoria ou atleta..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>
            <select
              value={generoFilter}
              onChange={e => setGeneroFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm"
            >
              <option value="">Todos os generos</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : selectedBracket && bracketDetail ? (
          <div>
            <button onClick={() => { setSelectedBracket(null); setBracketDetail(null) }} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />Voltar para lista
            </button>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold text-white">{(bracketDetail.bracket as Bracket).category?.nome_display}</h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span>{TIPO_LABELS[(bracketDetail.bracket as Bracket).tipo]}</span>
                <span>{(bracketDetail.bracket as Bracket).total_athletes} atletas</span>
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
            ) : (
              <BracketView
                matches={bracketDetail.matches as never[]}
                slots={bracketDetail.slots as never[]}
                bracketType={(bracketDetail.bracket as Bracket).tipo}
                numRodadas={(bracketDetail.bracket as Bracket).num_rodadas}
                readOnly
              />
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Swords className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma chave publicada</h3>
            <p className="text-slate-400">As chaves serao publicadas pelo organizador em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => {
              const progress = b.total_matches > 0 ? Math.round(b.finished_matches / b.total_matches * 100) : 0
              return (
                <div
                  key={b.id}
                  onClick={() => loadBracketDetail(b.id)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-bold text-white text-sm">{b.category?.nome_display}</span>
                      {b.category?.genero && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.category.genero === 'Masculino' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                        }`}>
                          {b.category.genero === 'Masculino' ? 'M' : 'F'}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.total_athletes}</span>
                    <span className="flex items-center gap-1"><Swords className="w-3 h-3" />{b.finished_matches}/{b.total_matches}</span>
                    <span>{TIPO_LABELS[b.tipo] || b.tipo}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {b.status === 'finished' && (
                    <div className="mt-2 text-[10px] text-green-400 font-bold">FINALIZADA</div>
                  )}
                  {b.status === 'in_progress' && (
                    <div className="mt-2 text-[10px] text-yellow-400 font-bold animate-pulse">EM ANDAMENTO</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
