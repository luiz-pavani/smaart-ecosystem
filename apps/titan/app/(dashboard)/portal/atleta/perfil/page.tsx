'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, User, Mail, Award, CreditCard, Settings, Calendar, Clock, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AtletaDocumentos from '@/components/AtletaDocumentos'
import { RatingStars } from '@/components/RatingStars'

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string; icones?: string }

interface TurmaMatriculada {
  id: string
  name: string
  location: string | null
  instructor_name: string | null
  enrolled_at: string
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
}

const dayLabels: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

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

export default function PerfilAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  interface WaitlistItem {
    class_id: string
    name: string
    position: number
  }

  const [atleta, setAtleta] = useState<AtletaPerfil | null>(null)
  const [kyuDan, setKyuDan] = useState<KyuDan | null>(null)
  const [turmas, setTurmas] = useState<TurmaMatriculada[]>([])
  const [waitlistItems, setWaitlistItems] = useState<WaitlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingWaitlist, setRemovingWaitlist] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Usuário não autenticado'); return }

        const [{ data: fedData, error: fedErr }, { data: kdData }, { data: enrollData }, { data: waitData }] = await Promise.all([
          supabase.from('user_fed_lrsj').select('*').eq('stakeholder_id', user.id).maybeSingle(),
          supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
          supabase.from('class_enrollments')
            .select('enrolled_at, class:class_id(id, name, location, instructor_name, class_schedules(day_of_week, start_time, end_time))')
            .eq('athlete_id', user.id)
            .eq('is_active', true)
            .order('enrolled_at', { ascending: false }),
          supabase.from('class_waitlist')
            .select('position, class:class_id(id, name)')
            .eq('athlete_id', user.id)
            .order('position', { ascending: true }),
        ])

        if (fedErr) throw fedErr

        if (fedData) {
          setAtleta(fedData as AtletaPerfil)
          const kd = (kdData || []).find((k: KyuDan) => k.id === fedData.kyu_dan_id)
          setKyuDan(kd || null)
        }

        setTurmas((enrollData || []).map((e: any) => {
          const c = Array.isArray(e.class) ? e.class[0] : e.class
          return {
            id: c?.id || '',
            name: c?.name || '',
            location: c?.location || null,
            instructor_name: c?.instructor_name || null,
            enrolled_at: e.enrolled_at,
            schedules: c?.class_schedules || [],
          }
        }).filter((t: TurmaMatriculada) => t.id))

        setWaitlistItems((waitData || []).map((w: any) => {
          const c = Array.isArray(w.class) ? w.class[0] : w.class
          return { class_id: c?.id || '', name: c?.name || '—', position: w.position }
        }).filter((w: WaitlistItem) => w.class_id))
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar seu perfil')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 mt-1">Dados pessoais e de filiação na federação</p>
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
                <button
                  onClick={() => router.push('/configuracoes')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shrink-0"
                >
                  <Settings className="w-4 h-4" />
                  Editar Perfil
                </button>
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
                <Row label="Tamanho do Patch" value={atleta.tamanho_patch} />
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
                <Row
                  label="Faixa"
                  value={kyuDan ? `${kyuDan.cor_faixa} | ${kyuDan.kyu_dan}` : '—'}
                />
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

            {/* Minhas Turmas */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white">Minhas Turmas</h3>
                <span className="ml-auto text-xs text-gray-400">{turmas.length} matriculado{turmas.length !== 1 ? 's' : ''}</span>
              </div>
              {turmas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Nenhuma turma matriculada</p>
              ) : (
                <div className="space-y-3">
                  {turmas.map((t) => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                      <p className="text-white font-medium text-sm">{t.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {t.instructor_name && (
                          <span className="text-xs text-purple-400">👤 {t.instructor_name}</span>
                        )}
                        {t.location && (
                          <span className="text-xs text-gray-400">📍 {t.location}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {t.schedules.map((s, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {dayLabels[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                        {atleta && (
                          <RatingStars classId={t.id} athleteId={atleta.stakeholder_id} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Fila de Espera */}
            {waitlistItems.length > 0 && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <h3 className="font-semibold text-white">Fila de Espera</h3>
                  <span className="ml-auto text-xs text-gray-400">{waitlistItems.length} turma{waitlistItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {waitlistItems.map((w) => (
                    <div key={w.class_id} className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {w.position}
                      </span>
                      <p className="text-white font-medium text-sm flex-1">{w.name}</p>
                      <span className="text-orange-300 text-xs">Posição #{w.position}</span>
                      <button
                        onClick={async () => {
                          setRemovingWaitlist(w.class_id)
                          await fetch(`/api/aulas/${w.class_id}/waitlist`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          })
                          setWaitlistItems(prev => prev.filter(x => x.class_id !== w.class_id))
                          setRemovingWaitlist(null)
                        }}
                        disabled={removingWaitlist === w.class_id}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Sair da fila"
                      >
                        {removingWaitlist === w.class_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
            <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum perfil de filiação encontrado</p>
            <p className="text-gray-500 text-sm mt-1">Entre em contato com sua academia ou federação</p>
          </div>
        )}
      </div>
    </div>
  )
}
