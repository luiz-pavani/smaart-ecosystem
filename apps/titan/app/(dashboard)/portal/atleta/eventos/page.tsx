'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Trophy, Loader2, ChevronDown, ChevronUp, FileDown, PlusCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RegistroEvento {
  id: string
  status: string
  registration_date: string
  event: {
    id: string
    nome: string
    data_evento: string
    local: string | null
    cidade: string | null
    descricao: string | null
    status: string | null
  } | null
}

interface EventoDisponivel {
  id: string
  nome: string
  data_evento: string
  local: string | null
  cidade: string | null
  descricao: string | null
  status: string | null
  limite_inscritos: number | null
  _inscritos?: number
}

type Tab = 'available' | 'upcoming' | 'past'

export default function EventosAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('available')
  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<RegistroEvento[]>([])
  const [pastEvents, setPastEvents] = useState<RegistroEvento[]>([])
  const [available, setAvailable] = useState<EventoDisponivel[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [nomeAtleta, setNomeAtleta] = useState<string>('')
  const [generatingCert, setGeneratingCert] = useState<string | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => { load() }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date().toISOString().split('T')[0]

      const [regRes, atletaRes, eventosRes] = await Promise.all([
        supabase
          .from('event_registrations')
          .select('id, status, registration_date, event:eventos(id, nome, data_evento, local, cidade, descricao, status)')
          .eq('atleta_id', user.id)
          .order('registration_date', { ascending: false }),
        supabase
          .from('user_fed_lrsj')
          .select('nome_completo')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('eventos')
          .select('id, nome, data_evento, local, cidade, descricao, status, limite_inscritos')
          .gte('data_evento', now)
          .order('data_evento', { ascending: true }),
      ])

      if (atletaRes.data?.nome_completo) setNomeAtleta(atletaRes.data.nome_completo)

      const today = new Date()
      const upcoming: RegistroEvento[] = []
      const past: RegistroEvento[] = []
      const registeredSet = new Set<string>()

      ;(regRes.data || []).forEach((item: any) => {
        const eventDate = item.event?.data_evento ? new Date(item.event.data_evento) : null
        if (item.event?.id) registeredSet.add(item.event.id)
        if (eventDate && eventDate >= today) upcoming.push(item)
        else past.push(item)
      })

      setRegisteredIds(registeredSet)
      setUpcomingEvents(upcoming)
      setPastEvents(past)

      // Eventos disponíveis = próximos que o atleta ainda não está inscrito
      const disponiveis = (eventosRes.data || []).filter((e: any) => !registeredSet.has(e.id))
      setAvailable(disponiveis)
    } finally {
      setLoading(false)
    }
  }

  async function inscrever(eventId: string) {
    setRegistering(eventId)
    try {
      const res = await fetch('/api/eventos/self/inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      const json = await res.json()
      if (!res.ok) { showToast(json.error || 'Erro ao inscrever', false); return }
      showToast('Inscrição confirmada!')
      await load()
      setActiveTab('upcoming')
    } finally {
      setRegistering(null)
    }
  }

  async function cancelar(eventId: string) {
    setCanceling(eventId)
    try {
      const res = await fetch(`/api/eventos/self/inscricao?event_id=${eventId}`, { method: 'DELETE' })
      if (!res.ok) { showToast('Erro ao cancelar inscrição', false); return }
      showToast('Inscrição cancelada')
      await load()
    } finally {
      setCanceling(null)
    }
  }

  async function gerarCertificado(reg: RegistroEvento) {
    if (!reg.event) return
    setGeneratingCert(reg.id)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = 297, H = 210

      doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, H, 'F')
      doc.setDrawColor(236, 72, 153); doc.setLineWidth(1.5); doc.rect(10, 10, W - 20, H - 20)
      doc.setLineWidth(0.5); doc.rect(13, 13, W - 26, H - 26)

      doc.setTextColor(255, 255, 255); doc.setFontSize(28); doc.setFont('helvetica', 'bold')
      doc.text('CERTIFICADO DE PARTICIPAÇÃO', W / 2, 55, { align: 'center' })

      doc.setDrawColor(236, 72, 153); doc.setLineWidth(0.8); doc.line(60, 62, W - 60, 62)

      doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 220)
      doc.text('Certificamos que', W / 2, 80, { align: 'center' })

      doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text(nomeAtleta || 'Atleta', W / 2, 98, { align: 'center' })

      doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 220)
      doc.text('participou do evento', W / 2, 113, { align: 'center' })

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(236, 72, 153)
      doc.text(reg.event.nome, W / 2, 128, { align: 'center' })

      const dataTxt = reg.event.data_evento
        ? new Date(reg.event.data_evento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : ''
      const localTxt = [reg.event.local, reg.event.cidade].filter(Boolean).join(' — ')

      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 180)
      if (dataTxt) doc.text(dataTxt, W / 2, 143, { align: 'center' })
      if (localTxt) doc.text(localTxt, W / 2, 153, { align: 'center' })

      doc.setFontSize(9); doc.setTextColor(100, 100, 120)
      doc.text('SMAART PRO — Sistema de Gestão Esportiva', W / 2, H - 18, { align: 'center' })

      doc.save(`certificado_${reg.event.nome.replace(/\s+/g, '_').toLowerCase()}.pdf`)
    } finally {
      setGeneratingCert(null)
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'available', label: 'Disponíveis', count: available.length },
    { key: 'upcoming', label: 'Minhas Inscrições', count: upcomingEvents.length },
    { key: 'past', label: 'Histórico', count: pastEvents.length },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3 ${
          toast.ok ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Eventos</h1>
          <p className="text-gray-400 mt-1">Inscreva-se em competições e acompanhe seu histórico</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8 border-b border-white/10">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-4 font-semibold transition-colors flex items-center gap-2 ${
                activeTab === t.key
                  ? 'text-white border-b-2 border-pink-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-300 text-xs rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Disponíveis ─────────────────────────────────────────── */}
            {activeTab === 'available' && (available.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-gray-400">
                <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                Nenhum evento disponível no momento
              </div>
            ) : available.map(ev => (
              <div key={ev.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden hover:border-pink-500/30 transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{ev.nome}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {new Date(ev.data_evento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                        {(ev.local || ev.cidade) && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {[ev.local, ev.cidade].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    {ev.status && (
                      <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-semibold shrink-0">
                        {ev.status}
                      </span>
                    )}
                  </div>
                  {ev.descricao && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{ev.descricao}</p>
                  )}
                  {ev.limite_inscritos && (
                    <p className="text-gray-500 text-xs mb-3">Limite: {ev.limite_inscritos} vagas</p>
                  )}
                  <button
                    onClick={() => inscrever(ev.id)}
                    disabled={registering === ev.id}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
                  >
                    {registering === ev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    {registering === ev.id ? 'Inscrevendo...' : 'Inscrever-se'}
                  </button>
                </div>
              </div>
            )))}

            {/* ── Minhas Inscrições (próximos) ─────────────────────────── */}
            {activeTab === 'upcoming' && (upcomingEvents.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-gray-400">
                Nenhuma inscrição em evento futuro.
              </div>
            ) : upcomingEvents.map(reg => (
              <div key={reg.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden hover:border-pink-500/30 transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{reg.event?.nome || 'Evento'}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {reg.event?.data_evento ? new Date(reg.event.data_evento).toLocaleDateString('pt-BR') : 'Data a definir'}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="w-4 h-4" />
                          {[reg.event?.local, reg.event?.cidade].filter(Boolean).join(', ') || 'Local a definir'}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full text-pink-300 text-xs font-semibold">
                      {reg.status || 'INSCRITO'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedId(prev => prev === reg.id ? null : reg.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-sm font-semibold rounded-lg transition-all"
                    >
                      {expandedId === reg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expandedId === reg.id ? 'Fechar' : 'Ver Detalhes'}
                    </button>
                    {reg.event?.id && (
                      <button
                        onClick={() => cancelar(reg.event!.id)}
                        disabled={canceling === reg.event?.id}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 disabled:opacity-50 text-gray-400 hover:text-red-300 text-sm font-semibold rounded-lg border border-white/10 transition-all"
                      >
                        {canceling === reg.event?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
                {expandedId === reg.id && (
                  <div className="px-6 pb-6 border-t border-white/5 pt-4 space-y-2 text-sm">
                    {reg.event?.descricao && <p className="text-gray-300 leading-relaxed">{reg.event.descricao}</p>}
                    {reg.event?.status && <p className="text-gray-400">Status: <span className="text-white font-medium">{reg.event.status}</span></p>}
                    {!reg.event?.descricao && !reg.event?.status && <p className="text-gray-500 italic">Sem informações adicionais</p>}
                  </div>
                )}
              </div>
            )))}

            {/* ── Histórico (passados) ─────────────────────────────────── */}
            {activeTab === 'past' && (pastEvents.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-gray-400">
                Nenhum evento passado encontrado.
              </div>
            ) : pastEvents.map(reg => (
              <div key={reg.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-yellow-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{reg.event?.nome || 'Evento'}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {reg.event?.data_evento ? new Date(reg.event.data_evento).toLocaleDateString('pt-BR') : 'Data a definir'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {[reg.event?.local, reg.event?.cidade].filter(Boolean).join(', ') || 'Local a definir'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Concluído</span>
                  </div>
                </div>
                <button
                  onClick={() => gerarCertificado(reg)}
                  disabled={generatingCert === reg.id}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all"
                >
                  {generatingCert === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  {generatingCert === reg.id ? 'Gerando...' : 'Ver Certificado'}
                </button>
              </div>
            )))}
          </div>
        )}
      </div>
    </div>
  )
}
