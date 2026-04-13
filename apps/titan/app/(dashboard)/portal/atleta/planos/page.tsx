'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Star, Check, Tag, Sparkles,
  CreditCard, AlertCircle, CheckCircle, Clock, Dumbbell,
} from 'lucide-react'
import CheckoutModal, { CheckoutProduto, CheckoutCustomer } from '@/components/checkout/CheckoutModal'

interface Plano {
  id: string
  nome: string
  descricao: string | null
  valor: number
  valor_original: number | null
  periodicidade: string
  duracao_meses: number | null
  max_aulas_semana: number | null
  beneficios: string[]
  destaque: boolean
}

interface AssinaturaAtual {
  id: string
  plano_id: string
  status: string
  valor_pago: number
  created_at: string
  academia_planos: { nome: string; periodicidade: string } | null
}

interface CupomValidado {
  valido: boolean
  erro?: string
  id?: string
  codigo?: string
  tipo_desconto?: string
  valor_desconto?: number
  valor_minimo?: number | null
  plano_ids?: string[] | null
  descricao?: string | null
}

interface CustomerData {
  name: string
  identity: string
  email: string
  phone: string
}

const PERIODICIDADE_LABELS: Record<string, string> = {
  mensal: '/mês',
  trimestral: '/trimestre',
  semestral: '/semestre',
  anual: '/ano',
  avulso: ' (único)',
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PlanosAtletaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [academia, setAcademia] = useState<{ id: string; nome: string; sigla?: string; pagamento_habilitado: boolean } | null>(null)
  const [assinaturaAtual, setAssinaturaAtual] = useState<AssinaturaAtual | null>(null)
  const [customer, setCustomer] = useState<CustomerData | null>(null)

  // Cupom
  const [cupomInput, setCupomInput] = useState('')
  const [cupomValidando, setCupomValidando] = useState(false)
  const [cupomData, setCupomData] = useState<CupomValidado | null>(null)

  // Checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null)

  // Success state
  const [contratado, setContratado] = useState(false)

  const fetchPlanos = useCallback(async () => {
    try {
      const res = await fetch('/api/atletas/self/planos')
      const data = await res.json()
      if (res.ok) {
        setPlanos(data.planos || [])
        setAcademia(data.academia || null)
        setAssinaturaAtual(data.assinatura_atual || null)
        setCustomer(data.customer || null)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlanos() }, [fetchPlanos])

  // ── Validate coupon ───────────────────────────────────────────────────────
  const validarCupom = async () => {
    if (!cupomInput.trim()) return
    setCupomValidando(true)
    setCupomData(null)
    try {
      const res = await fetch(`/api/atletas/self/planos?cupom=${encodeURIComponent(cupomInput.trim())}`)
      const data = await res.json()
      setCupomData(data.cupom || { valido: false, erro: 'Erro ao validar cupom' })
    } catch {
      setCupomData({ valido: false, erro: 'Erro de rede' })
    } finally {
      setCupomValidando(false)
    }
  }

  const removeCupom = () => {
    setCupomData(null)
    setCupomInput('')
  }

  // ── Calculate price with discount ─────────────────────────────────────────
  function calcValorComDesconto(plano: Plano): number {
    if (!cupomData?.valido) return plano.valor
    // Check if coupon is restricted to specific plans
    if (cupomData.plano_ids && cupomData.plano_ids.length > 0 && !cupomData.plano_ids.includes(plano.id)) {
      return plano.valor
    }
    if (cupomData.valor_minimo && plano.valor < cupomData.valor_minimo) {
      return plano.valor
    }
    if (cupomData.tipo_desconto === 'percentual') {
      return Math.round(plano.valor * (1 - (cupomData.valor_desconto || 0) / 100) * 100) / 100
    }
    return Math.max(0, Math.round((plano.valor - (cupomData.valor_desconto || 0)) * 100) / 100)
  }

  function cupomAppliesToPlan(plano: Plano): boolean {
    if (!cupomData?.valido) return false
    if (cupomData.plano_ids && cupomData.plano_ids.length > 0 && !cupomData.plano_ids.includes(plano.id)) return false
    if (cupomData.valor_minimo && plano.valor < cupomData.valor_minimo) return false
    return true
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const handleContratar = (plano: Plano) => {
    setSelectedPlano(plano)
    setCheckoutOpen(true)
  }

  const handlePaymentSuccess = async (pagamentoId: string) => {
    if (!selectedPlano) return
    // Create the subscription record
    try {
      await fetch('/api/atletas/self/planos/contratar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano_id: selectedPlano.id,
          cupom_id: cupomData?.valido ? cupomData.id : null,
          pagamento_id: pagamentoId,
        }),
      })
    } catch {
      // Payment was already successful, subscription creation failure is non-blocking
    }
    setCheckoutOpen(false)
    setContratado(true)
    // Refresh data
    setTimeout(() => fetchPlanos(), 1000)
  }

  // ── Build checkout produto ────────────────────────────────────────────────
  function buildCheckoutProduto(plano: Plano): CheckoutProduto {
    const valorFinal = calcValorComDesconto(plano)
    return {
      produto: 'academia_mensalidade',
      referencia_id: plano.id,
      valor: valorFinal,
      descricao: `${plano.nome}${academia?.sigla ? ` — ${academia.sigla}` : ''}`,
      subtitulo: `${formatCurrency(valorFinal)}${PERIODICIDADE_LABELS[plano.periodicidade] || ''}`,
      academia_id: academia?.id,
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Planos & Mensalidades</h1>
          <p className="text-slate-400">
            {academia?.nome ? `Planos disponíveis em ${academia.nome}` : 'Escolha seu plano'}
          </p>
        </div>
        <button
          onClick={() => router.push('/portal/atleta')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-400">Carregando planos...</span>
        </div>
      ) : !academia ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Sem academia vinculada</p>
          <p className="text-slate-400 text-sm">
            Você precisa estar vinculado a uma academia para ver os planos disponíveis.
          </p>
        </div>
      ) : planos.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Dumbbell className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">Nenhum plano disponível</p>
          <p className="text-slate-400 text-sm">
            A academia {academia.nome} ainda não cadastrou planos. Entre em contato com o responsável.
          </p>
        </div>
      ) : (
        <>
          {/* Success Banner */}
          {contratado && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-300 font-semibold">Plano contratado com sucesso!</p>
                <p className="text-green-400/70 text-sm">Sua assinatura já está ativa.</p>
              </div>
            </div>
          )}

          {/* Current subscription */}
          {assinaturaAtual && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-semibold">Plano Atual</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  assinaturaAtual.status === 'ativa'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {assinaturaAtual.status === 'ativa' ? 'Ativa' : 'Suspensa'}
                </span>
              </div>
              <p className="text-slate-300">
                {(assinaturaAtual.academia_planos as any)?.nome || 'Plano'} —{' '}
                <span className="text-emerald-300 font-semibold">
                  {formatCurrency(assinaturaAtual.valor_pago)}
                  {PERIODICIDADE_LABELS[(assinaturaAtual.academia_planos as any)?.periodicidade || ''] || ''}
                </span>
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Desde {new Date(assinaturaAtual.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          {/* Coupon Input */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold text-sm">Tem um cupom de desconto?</h3>
            </div>

            {cupomData?.valido ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-purple-300 font-mono font-bold text-sm">{cupomData.codigo}</span>
                  <span className="text-purple-400/70 text-xs">
                    — {cupomData.tipo_desconto === 'percentual'
                      ? `${cupomData.valor_desconto}% off`
                      : `${formatCurrency(cupomData.valor_desconto || 0)} off`}
                  </span>
                </div>
                <button
                  onClick={removeCupom}
                  className="px-3 py-2.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-xl text-zinc-300 transition-colors"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={cupomInput}
                  onChange={e => setCupomInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && validarCupom()}
                  placeholder="CÓDIGO DO CUPOM"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  onClick={validarCupom}
                  disabled={cupomValidando || !cupomInput.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
                >
                  {cupomValidando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Aplicar
                </button>
              </div>
            )}

            {cupomData && !cupomData.valido && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {cupomData.erro}
              </p>
            )}
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {planos.map(plano => {
              const valorFinal = calcValorComDesconto(plano)
              const temDesconto = cupomData?.valido && cupomAppliesToPlan(plano) && valorFinal < plano.valor
              const isCurrentPlan = assinaturaAtual?.plano_id === plano.id

              return (
                <div
                  key={plano.id}
                  className={`relative rounded-2xl border transition-all ${
                    plano.destaque
                      ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  } ${isCurrentPlan ? 'ring-2 ring-emerald-500/40' : ''}`}
                >
                  {/* Destaque badge */}
                  {plano.destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Sparkles className="w-3 h-3" /> MAIS POPULAR
                      </span>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        SEU PLANO
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Name */}
                    <h3 className="text-lg font-bold text-white mb-1">{plano.nome}</h3>
                    {plano.descricao && (
                      <p className="text-sm text-slate-400 mb-4">{plano.descricao}</p>
                    )}

                    {/* Price */}
                    <div className="mb-4">
                      {(plano.valor_original && plano.valor_original > plano.valor) || temDesconto ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-slate-500 line-through text-sm">
                            {formatCurrency(plano.valor_original || plano.valor)}
                          </span>
                          {temDesconto && (
                            <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-0.5 rounded-full">
                              CUPOM
                            </span>
                          )}
                        </div>
                      ) : null}
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">
                          {formatCurrency(temDesconto ? valorFinal : plano.valor)}
                        </span>
                        <span className="text-slate-400 text-sm">
                          {PERIODICIDADE_LABELS[plano.periodicidade] || ''}
                        </span>
                      </div>
                    </div>

                    {/* Info badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {plano.max_aulas_semana && (
                        <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Dumbbell className="w-3 h-3" />
                          {plano.max_aulas_semana}x/semana
                        </span>
                      )}
                      {plano.duracao_meses && (
                        <span className="text-xs bg-slate-500/10 text-slate-300 border border-slate-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {plano.duracao_meses} {plano.duracao_meses === 1 ? 'mês' : 'meses'}
                        </span>
                      )}
                    </div>

                    {/* Benefits */}
                    {plano.beneficios?.length > 0 && (
                      <ul className="space-y-2 mb-5">
                        {plano.beneficios.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA Button */}
                    {isCurrentPlan ? (
                      <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl text-center text-sm flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Plano atual
                      </div>
                    ) : academia?.pagamento_habilitado ? (
                      <button
                        onClick={() => handleContratar(plano)}
                        className={`w-full py-3 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                          plano.destaque
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Contratar
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium rounded-xl text-center text-sm">
                        Pagamento não habilitado
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Payment not enabled notice */}
          {!academia?.pagamento_habilitado && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 font-semibold text-sm">Pagamento online não habilitado</p>
                <p className="text-yellow-400/60 text-xs mt-1">
                  A academia ainda não ativou o pagamento online. Entre em contato diretamente para contratar um plano.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Checkout Modal */}
      {selectedPlano && customer && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => { setCheckoutOpen(false); setSelectedPlano(null) }}
          produto={buildCheckoutProduto(selectedPlano)}
          customer={customer}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
