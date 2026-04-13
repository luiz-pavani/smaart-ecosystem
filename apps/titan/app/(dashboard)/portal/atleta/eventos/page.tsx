'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Trophy, Loader2, ChevronDown, ChevronUp, FileDown, PlusCircle, X, Scale } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CheckoutModal, { type CheckoutProduto } from '@/components/checkout/CheckoutModal'
import CategorySelector from '@/components/eventos/CategorySelector'

interface RegistroEvento {
  id: string
  status: string
  registration_date: string
  category_id: string | null
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
  data_evento_fim: string | null
  hora_inicio: string | null
  local: string | null
  cidade: string | null
  descricao: string | null
  status: string | null
  limite_inscritos: number | null
  valor_inscricao: number | null
  tipo_evento: string | null
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
  const [checkoutProduto, setCheckoutProduto] = useState<CheckoutProduto | null>(null)
  const [atletaInfo, setAtletaInfo] = useState<{ nome: string; email: string; genero?: string; idade?: number; peso?: number } | null>(null)

  // Category selection modal
  const [categoryModalEvent, setCategoryModalEvent] = useState<EventoDisponivel | null>(null)

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
          .select('id, status, registration_date, category_id, event:eventos(id, nome, data_evento, local, cidade, descricao, status)')
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
          .select('id, nome, data_evento, data_evento_fim, hora_inicio, local, cidade, descricao, status, limite_inscritos, valor_inscricao, tipo_evento')
          .eq('publicado', true)
          .gte('data_evento', now)
          .order('data_evento', { ascending: true }),
      ])

      if (atletaRes.data?.nome_completo) setNomeAtleta(atletaRes.data.nome_completo)

      // Fetch athlete profile info for category matching
      const perfilRes = await fetch('/api/atletas/self/perfil-dados')
      const perfilData = await perfilRes.json()
      if (perfilData.stakeholder) {
        const s = perfilData.stakeholder
        const birth = s.data_nascimento ? new Date(s.data_nascimento) : null
        const age = birth ? Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined
        setAtletaInfo({
          nome: s.nome_completo || '',
          email: s.email || '',
          genero: s.genero || undefined,
          idade: age,
          peso: s.peso_atual || undefined,
        })
      }

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

      const disponiveis = (eventosRes.data || []).filter((e: any) => !registeredSet.has(e.id))
      setAvailable(disponiveis)
    } finally {
      setLoading(false)
    }
  }

  async function handleInscrever(evento: EventoDisponivel) {
    // Verificar se evento tem categorias
    try {
      const res = await fetch(`/api/eventos/${evento.id}/categories`)
      const json = await res.json()
      if (res.ok && json.categories && json.categories.length > 0) {
        // Evento tem categorias — abrir seletor
        setCategoryModalEvent(evento)
        return
      }
    } catch {
      // Se falhar a verificação, inscreve sem categoria
    }

    // Sem categorias — inscrição direta
    await inscrever(evento.id, evento.nome)
  }

  async function inscrever(eventId: string, eventoNome: string, categoryId?: string) {
    setRegistering(eventId)
    try {
      const body: Record<string, any> = { event_id: eventId }
      if (categoryId) body.category_id = categoryId

      const res = await fetch('/api/eventos/self/inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { showToast(json.error || 'Erro ao inscrever', false); return }

      if (json.needs_payment && json.data?.id) {
        const descCat = json.categoria ? ` (${json.categoria})` : ''
        setCheckoutProduto({
          produto: 'evento',
          referencia_id: json.data.id,
          valor: json.valor,
          descricao: `Inscricao — ${eventoNome}${descCat}`,
        })
      } else {
        showToast(json.categoria ? `Inscricao confirmada na categoria ${json.categoria}!` : 'Inscricao confirmada!')
        await load()
        setActiveTab('upcoming')
      }
    } finally {
      setRegistering(null)
      setCategoryModalEvent(null)
    }
  }

  async function cancelar(eventId: string) {
    setCanceling(eventId)
    try {
      const res = await fetch(`/api/eventos/self/inscricao?event_id=${eventId}`, { method: 'DELETE' })
      if (!res.ok) { showToast('Erro ao cancelar inscricao', false); return }
      showToast('Inscricao cancelada')
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
      doc.text('CERTIFICADO DE PARTICIPACAO', W / 2, 55, { align: 'center' })

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
      doc.text('SMAART PRO — Sistema de Gestao Esportiva', W / 2, H - 18, { align: 'center' })

      doc.save(`certificado_${reg.event.nome.replace(/\s+/g, '_').toLowerCase()}.pdf`)
    } finally {
      setGeneratingCert(null)
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'available', label: 'Disponiveis', count: available.length },
    { key: 'upcoming', label: 'Minhas Inscricoes', count: upcomingEvents.length },
    { key: 'past', label: 'Historico', count: pastEvents.length },
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

      {/* Category Selection Modal */}
      {categoryModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-400" />Selecionar Categoria
                </h2>
                <p className="text-slate-400 text-sm mt-1">{categoryModalEvent.nome}</p>
              </div>
              <button onClick={() => setCategoryModalEvent(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <CategorySelector
                eventoId={categoryModalEvent.id}
                atletaGenero={atletaInfo?.genero}
                atletaIdade={atletaInfo?.idade}
                atletaPeso={atletaInfo?.peso}
                onSelect={(cat) => {
                  inscrever(categoryModalEvent.id, categoryModalEvent.nome, cat.id)
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Eventos</h1>
          <p className="text-gray-400 mt-1">Inscreva-se em competicoes e acompanhe seu historico</p>
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
            {/* Disponiveis */}
            {activeTab === 'available' && (available.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-gray-400">
                <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                Nenhum evento disponivel no momento
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
                          {ev.data_evento_fim && ` - ${new Date(ev.data_evento_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`}
                        </div>
                        {(ev.local || ev.cidade) && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {[ev.local, ev.cidade].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {ev.status && (
                        <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-semibold shrink-0">
                          {ev.status}
                        </span>
                      )}
                      {ev.tipo_evento && (
                        <span className="text-xs text-slate-500">{ev.tipo_evento}</span>
                      )}
                    </div>
                  </div>
                  {ev.descricao && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{ev.descricao}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleInscrever(ev)}
                      disabled={registering === ev.id}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
                    >
                      {registering === ev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      {registering === ev.id ? 'Inscrevendo...' : 'Inscrever-se'}
                    </button>
                    {ev.valor_inscricao && ev.valor_inscricao > 0 && (
                      <span className="text-green-400 text-sm font-medium">R$ {Number(ev.valor_inscricao).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            )))}

            {/* Minhas Inscricoes */}
            {activeTab === 'upcoming' && (upcomingEvents.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-gray-400">
                Nenhuma inscricao em evento futuro.
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
                    {!reg.event?.descricao && !reg.event?.status && <p className="text-gray-500 italic">Sem informacoes adicionais</p>}
                  </div>
                )}
              </div>
            )))}

            {/* Historico */}
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
                    <span className="text-yellow-400 font-semibold">Concluido</span>
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

      {/* Checkout para inscricao paga */}
      {checkoutProduto && atletaInfo && (
        <CheckoutModal
          isOpen={!!checkoutProduto}
          onClose={() => setCheckoutProduto(null)}
          produto={checkoutProduto}
          customer={{
            name: atletaInfo.nome,
            identity: '',
            email: atletaInfo.email,
          }}
          onSuccess={() => {
            setCheckoutProduto(null)
            showToast('Pagamento confirmado! Inscricao ativa.')
            load()
            setActiveTab('upcoming')
          }}
        />
      )}
    </div>
  )
}
