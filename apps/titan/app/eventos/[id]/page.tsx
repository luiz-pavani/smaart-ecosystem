'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Calendar, MapPin, Clock, Users, Trophy, ArrowLeft, ExternalLink,
  Loader2, MapPinned, Mail, Phone, FileText, Tv, BarChart3,
  ChevronRight, Tag, Shield, Swords
} from 'lucide-react'

interface Evento {
  id: string
  nome: string
  data_evento: string
  data_evento_fim: string | null
  hora_inicio: string | null
  hora_fim: string | null
  local: string | null
  cidade: string | null
  endereco_completo: string | null
  descricao: string | null
  regulamento: string | null
  status: string
  tipo_evento: string | null
  modalidade: string | null
  banner_url: string | null
  valor_inscricao: number | null
  limite_inscritos: number | null
  inscricao_inicio: string | null
  inscricao_fim: string | null
  num_areas: number | null
  contato_email: string | null
  contato_telefone: string | null
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Planejamento': { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  'Inscrições abertas': { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-300', dot: 'bg-green-400 animate-pulse' },
  'Inscrições encerradas': { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-300', dot: 'bg-orange-400' },
  'Em andamento': { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-300', dot: 'bg-cyan-400 animate-pulse' },
  'Encerrado': { bg: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-300', dot: 'bg-slate-400' },
  'Cancelado': { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-300', dot: 'bg-red-400' },
}

export default function EventoPublicPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [totalInscritos, setTotalInscritos] = useState(0)
  const [totalCategorias, setTotalCategorias] = useState(0)
  const [minhaInscricao, setMinhaInscricao] = useState<{ id: string; status: string } | null>(null)
  const [showRegulamento, setShowRegulamento] = useState(false)

  useEffect(() => {
    fetch(`/api/eventos/${id}`)
      .then(r => r.json())
      .then(data => {
        setEvento(data.evento || null)
        setTotalInscritos(data.total_inscritos || 0)
        setTotalCategorias(data.total_categorias || 0)
        setMinhaInscricao(data.minha_inscricao || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Trophy className="w-16 h-16 text-slate-700" />
        <h1 className="text-2xl font-bold text-white">Evento não encontrado</h1>
        <button onClick={() => router.push('/eventos')} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar aos eventos
        </button>
      </div>
    )
  }

  const sc = statusConfig[evento.status] || statusConfig['Planejamento']
  const isOpen = evento.status === 'Inscrições abertas'
  const isLive = evento.status === 'Em andamento'
  const isFinished = evento.status === 'Encerrado'

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const formatDateShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const formatTime = (t: string) => t.substring(0, 5)

  // Days until event
  const daysUntil = Math.ceil((new Date(evento.data_evento + 'T12:00:00').getTime() - Date.now()) / 86400000)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero / Banner */}
      <div className="relative">
        {evento.banner_url ? (
          <div className="h-64 md:h-80 lg:h-96 overflow-hidden">
            <img src={evento.banner_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        ) : (
          <div className="h-64 md:h-80 bg-gradient-to-br from-cyan-900/30 via-slate-950 to-purple-900/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.15),transparent_60%)]" />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.push('/eventos')}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg text-white/80 hover:text-white border border-white/10 text-sm transition-all z-10"
        >
          <ArrowLeft className="w-4 h-4" /> Eventos
        </button>

        {/* Event title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {evento.status}
              </span>
              {evento.tipo_evento && (
                <span className="px-2.5 py-1 bg-white/10 text-white/70 rounded-full text-xs font-medium">{evento.tipo_evento}</span>
              )}
              {evento.modalidade && evento.modalidade !== 'Judo' && (
                <span className="px-2.5 py-1 bg-white/10 text-white/70 rounded-full text-xs font-medium">{evento.modalidade}</span>
              )}
              {daysUntil > 0 && daysUntil <= 30 && (
                <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 rounded-full text-xs font-medium border border-cyan-500/20">
                  em {daysUntil} dia{daysUntil > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">{evento.nome}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick info cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <Calendar className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">{formatDateShort(evento.data_evento)}</div>
                {evento.data_evento_fim && evento.data_evento_fim !== evento.data_evento && (
                  <div className="text-xs text-slate-400">até {formatDateShort(evento.data_evento_fim)}</div>
                )}
              </div>
              {evento.hora_inicio && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{formatTime(evento.hora_inicio)}</div>
                  {evento.hora_fim && <div className="text-xs text-slate-400">até {formatTime(evento.hora_fim)}</div>}
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
                <div className="text-lg font-bold text-white">{totalInscritos}</div>
                <div className="text-xs text-slate-400">inscrito{totalInscritos !== 1 ? 's' : ''}</div>
              </div>
              {totalCategorias > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Tag className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{totalCategorias}</div>
                  <div className="text-xs text-slate-400">categoria{totalCategorias !== 1 ? 's' : ''}</div>
                </div>
              )}
            </div>

            {/* Description */}
            {evento.descricao && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Sobre o evento
                </h2>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{evento.descricao}</p>
              </div>
            )}

            {/* Regulamento */}
            {evento.regulamento && (
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowRegulamento(!showRegulamento)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" /> Regulamento
                  </span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showRegulamento ? 'rotate-90' : ''}`} />
                </button>
                {showRegulamento && (
                  <div className="px-6 pb-6">
                    <div className="p-4 bg-black/20 rounded-lg text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {evento.regulamento}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Location */}
            {(evento.local || evento.cidade || evento.endereco_completo) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <MapPinned className="w-4 h-4 text-red-400" /> Local
                </h2>
                {evento.local && <p className="text-white font-medium">{evento.local}</p>}
                {evento.endereco_completo && <p className="text-slate-400 text-sm mt-1">{evento.endereco_completo}</p>}
                {evento.cidade && !evento.endereco_completo && <p className="text-slate-400 text-sm mt-1">{evento.cidade}</p>}
              </div>
            )}

            {/* Links for live/finished events */}
            {(isLive || isFinished) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {isLive && (
                  <button
                    onClick={() => router.push(`/eventos/${id}/ao-vivo`)}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/15 transition-all"
                  >
                    <Tv className="w-5 h-5 text-red-400" />
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">Titan TV</div>
                      <div className="text-xs text-slate-400">Ao vivo</div>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => router.push(`/eventos/${id}/placar`)}
                  className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/15 transition-all"
                >
                  <Swords className="w-5 h-5 text-cyan-400" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Placar</div>
                    <div className="text-xs text-slate-400">Tempo real</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push(`/eventos/${id}/chaves`)}
                  className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/15 transition-all"
                >
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Chaves</div>
                    <div className="text-xs text-slate-400">Brackets</div>
                  </div>
                </button>
                {isFinished && (
                  <button
                    onClick={() => router.push(`/eventos/${id}/resultados`)}
                    className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/15 transition-all"
                  >
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">Resultados</div>
                      <div className="text-xs text-slate-400">Medalhas</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Inscription card */}
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 rounded-2xl p-6 sticky top-6">
              {/* Price */}
              <div className="text-center mb-5">
                {evento.valor_inscricao && evento.valor_inscricao > 0 ? (
                  <>
                    <div className="text-3xl font-black text-white">R$ {Number(evento.valor_inscricao).toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-1">por inscricao</div>
                  </>
                ) : (
                  <div className="text-3xl font-black text-green-400">Gratuito</div>
                )}
              </div>

              {/* Status-based CTA */}
              {minhaInscricao ? (
                <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
                  <div className="text-green-300 font-bold text-sm">Voce esta inscrito!</div>
                  <div className="text-xs text-slate-400 mt-1">Status: {minhaInscricao.status}</div>
                </div>
              ) : isOpen ? (
                <button
                  onClick={() => router.push('/portal/atleta/eventos')}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all text-sm shadow-lg shadow-cyan-500/20"
                >
                  Inscrever-se
                </button>
              ) : (
                <div className="text-center p-4 bg-slate-500/10 border border-slate-500/20 rounded-xl mb-4">
                  <div className="text-slate-300 text-sm font-medium">{evento.status}</div>
                </div>
              )}

              {/* Inscription period */}
              {(evento.inscricao_inicio || evento.inscricao_fim) && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periodo de inscricao</div>
                  {evento.inscricao_inicio && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Inicio</span>
                      <span className="text-white">{formatDateShort(evento.inscricao_inicio)}</span>
                    </div>
                  )}
                  {evento.inscricao_fim && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Fim</span>
                      <span className="text-white">{formatDateShort(evento.inscricao_fim)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Capacity */}
              {evento.limite_inscritos && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Vagas</span>
                    <span className="text-white">{totalInscritos} / {evento.limite_inscritos}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalInscritos / evento.limite_inscritos) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Areas */}
              {evento.num_areas && evento.num_areas > 1 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
                  <span className="text-slate-500">Tatames</span>
                  <span className="text-white">{evento.num_areas}</span>
                </div>
              )}

              {/* Full date */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data</div>
                <p className="text-sm text-white capitalize">{formatDate(evento.data_evento)}</p>
                {evento.data_evento_fim && evento.data_evento_fim !== evento.data_evento && (
                  <p className="text-sm text-white capitalize mt-1">até {formatDate(evento.data_evento_fim)}</p>
                )}
              </div>
            </div>

            {/* Contact */}
            {(evento.contato_email || evento.contato_telefone) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contato</div>
                {evento.contato_email && (
                  <a href={`mailto:${evento.contato_email}`} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 mb-2">
                    <Mail className="w-4 h-4" /> {evento.contato_email}
                  </a>
                )}
                {evento.contato_telefone && (
                  <a href={`tel:${evento.contato_telefone}`} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
                    <Phone className="w-4 h-4" /> {evento.contato_telefone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
