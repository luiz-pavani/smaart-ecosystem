'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { ArrowLeft, Star, Loader2, MessageSquare, TrendingUp, Users } from 'lucide-react'

interface TurmaNPS {
  id: string
  name: string
  instructor_name: string | null
  avg: number | null
  total: number
  dist: { star: number; count: number }[]
  comments: { text: string; created_at: string }[]
}

interface GeralNPS {
  avg: number
  total: number
  dist: { star: number; count: number }[]
}

function StarDisplay({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  if (value === null) return <span className="text-gray-600 text-xs">sem avaliações</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`${sz} ${s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
      ))}
    </div>
  )
}

function DistBar({ dist, total }: { dist: { star: number; count: number }[]; total: number }) {
  return (
    <div className="space-y-1">
      {[...dist].reverse().map(d => (
        <div key={d.star} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-3 text-right">{d.star}</span>
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400/70 rounded-full transition-all"
              style={{ width: total > 0 ? `${(d.count / total) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-gray-500 w-5 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function NPSPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState<TurmaNPS[]>([])
  const [geral, setGeral] = useState<GeralNPS | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const academiaId = await resolveAcademiaId(supabase)
      const params = academiaId ? `?academia_id=${academiaId}` : ''
      const res = await fetch(`/api/academia/nps${params}`)
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setTurmas(d.turmas || [])
      setGeral(d.geral || null)
    }
    load().finally(() => setLoading(false))
  }, [])

  const comAvaliacoes = turmas.filter(t => t.total > 0)
  const semAvaliacoes = turmas.filter(t => t.total === 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Avaliações das Turmas</h1>
          <p className="text-slate-400">NPS e satisfação dos atletas por turma</p>
        </div>
        <button
          onClick={() => router.push('/portal/academia')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                     text-slate-300 hover:text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : (
        <>
          {/* Card geral */}
          {geral ? (
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Média geral da academia</p>
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-black text-white">{geral.avg}</span>
                    <div className="pb-2">
                      <StarDisplay value={geral.avg} size="lg" />
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {geral.total} avaliações · {comAvaliacoes.length} turmas
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-48">
                  <DistBar dist={geral.dist} total={geral.total} />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <Star className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">Nenhuma avaliação ainda</p>
              <p className="text-gray-400 text-sm">Os atletas podem avaliar suas turmas de 1 a 5 estrelas no portal deles.</p>
            </div>
          )}

          {/* Turmas com avaliações */}
          {comAvaliacoes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                Por Turma
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {comAvaliacoes.map(t => (
                  <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-white font-semibold">{t.name}</h3>
                        {t.instructor_name && <p className="text-xs text-gray-500 mt-0.5">{t.instructor_name}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-white">{t.avg}</p>
                        <p className="text-xs text-gray-500">{t.total} aval.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StarDisplay value={t.avg} />
                      <div className="flex-1">
                        <DistBar dist={t.dist} total={t.total} />
                      </div>
                    </div>

                    {t.comments.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Comentários recentes
                        </p>
                        {t.comments.map((c, i) => (
                          <p key={i} className="text-xs text-gray-300 bg-white/5 rounded-lg px-3 py-2 italic">
                            "{c.text}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Turmas sem avaliações */}
          {semAvaliacoes.length > 0 && comAvaliacoes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">Sem avaliações ainda</h2>
              <div className="flex flex-wrap gap-2">
                {semAvaliacoes.map(t => (
                  <span key={t.id} className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
