'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, User, Mail, Award, CreditCard, BookOpen, X, Plus } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AtletaDocumentos from '@/components/AtletaDocumentos'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string; icones?: string }

interface AtletaPerfil {
  stakeholder_id: string
  nome_completo: string | null
  nome_patch: string | null
  genero: string | null
  data_nascimento: string | null
  nacionalidade: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  pais: string | null
  kyu_dan_id: number | null
  academias: string | null
  status_plano: string | null
  status_membro: string | null
  data_expiracao: string | null
  url_foto: string | null
  nivel_arbitragem: string | null
  tamanho_patch: string | null
}

const statusColor = (s: string | null) => {
  if (s === 'Válido' || s === 'Aceito') return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (s === 'Vencido' || s === 'Rejeitado') return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right">{value || '—'}</span>
    </div>
  )
}

export default function AtletaAcademiaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const atletaId = params.id as string
  const supabase = createClient()
  const [atleta, setAtleta] = useState<AtletaPerfil | null>(null)
  const [kyuDan, setKyuDan] = useState<KyuDan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [turmas, setTurmas] = useState<{ id: string; name: string; schedules: { day_of_week: number; start_time: string; end_time: string }[] }[]>([])
  const [allTurmas, setAllTurmas] = useState<{ id: string; name: string; enrolled: boolean }[]>([])
  const [showAddTurma, setShowAddTurma] = useState(false)
  const [turmaActionId, setTurmaActionId] = useState<string | null>(null)
  const [academiaId, setAcademiaId] = useState<string | null>(null)

  const dayShort: Record<number, string> = { 0:'Dom',1:'Seg',2:'Ter',3:'Qua',4:'Qui',5:'Sex',6:'Sáb' }

  const loadTurmas = useCallback(async (acadId: string) => {
    const res = await fetch(`/api/atletas/${atletaId}/turmas?academiaId=${acadId}`)
    if (!res.ok) return
    const json = await res.json()
    setTurmas(json.enrolled || [])
    setAllTurmas(json.all || [])
  }, [atletaId])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Usuário não autenticado'); return }

        // Verify user is associated with an academia
        const { data: perfil } = await supabase
          .from('stakeholders')
          .select('academia_id, role')
          .eq('id', user.id)
          .maybeSingle()

        if (!perfil?.academia_id && perfil?.role !== 'master_access') {
          setError('Sem permissão para acessar este perfil')
          return
        }

        const acadId = await resolveAcademiaId(supabase)
        if (acadId) {
          setAcademiaId(acadId)
          loadTurmas(acadId)
        }

        const [{ data: fedData, error: fedErr }, { data: kdData }] = await Promise.all([
          supabase
            .from('user_fed_lrsj')
            .select('*')
            .eq('stakeholder_id', atletaId)
            .maybeSingle(),
          supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
        ])

        if (fedErr) throw fedErr

        if (fedData) {
          setAtleta(fedData as AtletaPerfil)
          const kd = (kdData || []).find((k: KyuDan) => k.id === fedData.kyu_dan_id)
          setKyuDan(kd || null)
        } else {
          setError('Atleta não encontrado')
        }
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar o perfil do atleta')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [atletaId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia/atletas')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Atletas
          </button>
          <h1 className="text-3xl font-bold text-white">Perfil do Atleta</h1>
          <p className="text-gray-400 mt-1">Dados de filiação na federação</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200 mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : atleta ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {atleta.url_foto ? (
                  <img src={atleta.url_foto} alt={atleta.nome_completo || ''} className="w-28 h-28 object-cover rounded-xl border-4 border-white/10 shrink-0" />
                ) : (
                  <div className="w-28 h-28 bg-blue-500/20 rounded-xl border-4 border-white/10 flex items-center justify-center shrink-0">
                    <User className="w-14 h-14 text-blue-300" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{atleta.nome_completo || '—'}</h2>
                  {atleta.nome_patch && <p className="text-gray-400 text-sm mb-3">"{atleta.nome_patch}"</p>}
                  <div className="flex flex-wrap gap-2">
                    {kyuDan && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {kyuDan.icones ? `${kyuDan.icones} ` : ''}{kyuDan.cor_faixa} | {kyuDan.kyu_dan}
                      </span>
                    )}
                    {atleta.academias && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-orange-500/20 text-orange-300 border-orange-500/30">
                        🥋 {atleta.academias}
                      </span>
                    )}
                    {atleta.status_plano && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(atleta.status_plano)}`}>
                        Plano {atleta.status_plano}
                      </span>
                    )}
                    {atleta.status_membro && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(atleta.status_membro)}`}>
                        {atleta.status_membro}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <AtletaDocumentos
                atletaId={atleta.stakeholder_id}
                statusMembro={atleta.status_membro}
                kyuDanId={atleta.kyu_dan_id}
              />
            </div>

            {/* Turmas */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white">Turmas</h3>
                <button
                  onClick={() => setShowAddTurma(v => !v)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {showAddTurma ? 'Fechar' : 'Adicionar'}
                </button>
              </div>

              {turmas.length === 0 && !showAddTurma && (
                <p className="text-gray-400 text-sm">Nenhuma turma atribuída</p>
              )}

              {turmas.length > 0 && (
                <div className="space-y-2 mb-4">
                  {turmas.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-white text-sm font-medium">{t.name}</p>
                        <p className="text-gray-400 text-xs">
                          {t.schedules.map(s => `${dayShort[s.day_of_week]} ${s.start_time.slice(0,5)}`).join(' · ')}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          setTurmaActionId(t.id)
                          await fetch(`/api/aulas/${t.id}/atletas`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ athlete_id: atletaId }),
                          })
                          if (academiaId) loadTurmas(academiaId)
                          setTurmaActionId(null)
                        }}
                        disabled={turmaActionId === t.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {turmaActionId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddTurma && (
                <div className="space-y-2 border-t border-white/10 pt-4 mt-2">
                  <p className="text-gray-400 text-xs mb-2">Selecione turmas para adicionar:</p>
                  {allTurmas.filter(t => !t.enrolled).length === 0 ? (
                    <p className="text-gray-500 text-sm">Todas as turmas já atribuídas</p>
                  ) : allTurmas.filter(t => !t.enrolled).map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                      <p className="text-gray-300 text-sm">{t.name}</p>
                      <button
                        onClick={async () => {
                          setTurmaActionId(t.id)
                          await fetch(`/api/aulas/${t.id}/atletas`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ athlete_id: atletaId }),
                          })
                          if (academiaId) loadTurmas(academiaId)
                          setTurmaActionId(null)
                        }}
                        disabled={turmaActionId === t.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-xs transition-colors disabled:opacity-50"
                      >
                        {turmaActionId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados Pessoais */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Dados Pessoais</h3>
                </div>
                <Row label="Gênero" value={atleta.genero} />
                <Row label="Data de Nascimento" value={atleta.data_nascimento} />
                <Row label="Nacionalidade" value={atleta.nacionalidade} />
                <Row label="Tamanho do Backnumber (patch)" value={atleta.tamanho_patch} />
              </div>

              {/* Contato */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Contato</h3>
                </div>
                <Row label="Email" value={atleta.email} />
                <Row label="Telefone" value={atleta.telefone} />
                <Row label="Cidade" value={atleta.cidade} />
                <Row label="Estado" value={atleta.estado} />
                <Row label="País" value={atleta.pais} />
              </div>

              {/* Graduação */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Graduação</h3>
                </div>
                <Row label="Faixa" value={kyuDan ? `${kyuDan.cor_faixa} | ${kyuDan.kyu_dan}` : '—'} />
                <Row label="Nível de Arbitragem" value={atleta.nivel_arbitragem} />
              </div>

              {/* Filiação */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Filiação</h3>
                </div>
                <Row label="Academia" value={atleta.academias} />
                <Row label="Status do Plano" value={atleta.status_plano} />
                <Row label="Status do Membro" value={atleta.status_membro} />
                <Row label="Validade" value={atleta.data_expiracao} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
            <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum perfil de filiação encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
