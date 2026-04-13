'use client'

import { useState, useCallback } from 'react'
import { X, CreditCard, QrCode, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import PixDisplay from './PixDisplay'

export interface CheckoutProduto {
  produto: 'filiacao_atleta' | 'anuidade_academia' | 'profep' | 'evento' | 'filiacao_bulk' | 'academia_mensalidade'
  referencia_id?: string
  referencia_ids?: string[]  // para bulk
  valor?: number              // valor override (obrigatório para filiacao_bulk)
  descricao?: string          // título exibido no modal
  subtitulo?: string
  academia_id?: string        // for per-academia Safe2Pay credentials
}

export interface CheckoutCustomer {
  name: string
  identity: string  // CPF
  email: string
  phone?: string
  address?: {
    ZipCode?: string
    Street?: string
    Number?: string
    CityName?: string
    StateInitials?: string
  }
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  produto: CheckoutProduto
  customer: CheckoutCustomer
  onSuccess?: (pagamentoId: string) => void
  allowRecorrente?: boolean
}

type Metodo = 'pix' | 'cartao'
type Stage = 'selecionar' | 'cartao_form' | 'aguardando_pix' | 'pago' | 'erro'

interface CardForm {
  number: string
  holder: string
  expiry: string
  cvv: string
}

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)

const formatExpiry = (v: string) =>
  v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 7)

export default function CheckoutModal({
  isOpen, onClose, produto, customer, onSuccess, allowRecorrente = false,
}: CheckoutModalProps) {
  const [metodo, setMetodo] = useState<Metodo>('pix')
  const [stage, setStage] = useState<Stage>('selecionar')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [card, setCard] = useState<CardForm>({ number: '', holder: '', expiry: '', cvv: '' })

  // Pix result
  const [pixData, setPixData] = useState<{
    pagamentoId: string; qrCode: string; qrCodeUrl?: string; expiracao: string
  } | null>(null)

  // Success
  const [pagamentoId, setPagamentoId] = useState('')

  const reset = useCallback(() => {
    setStage('selecionar')
    setErro('')
    setPixData(null)
    setCard({ number: '', holder: '', expiry: '', cvv: '' })
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const valorFormatado = produto.valor?.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  })

  // ── Pagar via Pix ───────────────────────────────────────────────────────────
  const pagarPix = async () => {
    setLoading(true)
    setErro('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto: produto.produto,
          referencia_id: produto.referencia_id,
          referencia_ids: produto.referencia_ids,
          valor: produto.valor,
          descricao: produto.descricao,
          metodo: 'pix',
          academia_id: produto.academia_id,
          customer: {
            name: customer.name,
            identity: customer.identity,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
          },
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || 'Erro ao gerar Pix')
        setStage('erro')
        return
      }

      setPixData({
        pagamentoId: data.pagamento_id,
        qrCode: data.pix_qr_code,
        qrCodeUrl: data.pix_qr_code_url,
        expiracao: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      setStage('aguardando_pix')
    } catch (e: any) {
      setErro(e.message || 'Erro de rede')
      setStage('erro')
    } finally {
      setLoading(false)
    }
  }

  // ── Pagar via Cartão ─────────────────────────────────────────────────────────
  const pagarCartao = async () => {
    if (!card.number || !card.holder || !card.expiry || !card.cvv) {
      setErro('Preencha todos os dados do cartão')
      return
    }

    setLoading(true)
    setErro('')

    try {
      // 1. Tokenizar
      const tokRes = await fetch('/api/checkout/tokenizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: card.number.replace(/\s/g, ''),
          holderName: card.holder,
          expirationDate: card.expiry,
          securityCode: card.cvv,
        }),
      })
      const tokData = await tokRes.json()
      if (!tokRes.ok) {
        setErro(tokData.error || 'Erro ao tokenizar cartão')
        setLoading(false)
        return
      }

      // 2. Cobrar
      const payRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto: produto.produto,
          referencia_id: produto.referencia_id,
          referencia_ids: produto.referencia_ids,
          valor: produto.valor,
          descricao: produto.descricao,
          metodo: 'cartao',
          card_token: tokData.token,
          academia_id: produto.academia_id,
          customer: {
            name: customer.name,
            identity: customer.identity,
            email: customer.email,
            phone: customer.phone,
          },
        }),
      })
      const payData = await payRes.json()

      if (!payRes.ok) {
        setErro(payData.error || 'Erro ao processar pagamento')
        setStage('erro')
        return
      }

      if (payData.status === 'pago') {
        setPagamentoId(payData.pagamento_id)
        setStage('pago')
        onSuccess?.(payData.pagamento_id)
      } else {
        setErro('Pagamento não confirmado. Verifique os dados do cartão.')
        setStage('erro')
      }
    } catch (e: any) {
      setErro(e.message || 'Erro de rede')
      setStage('erro')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="font-semibold text-white">{produto.descricao || 'Pagamento'}</h2>
            {produto.subtitulo && <p className="text-sm text-zinc-400">{produto.subtitulo}</p>}
            {produto.valor && (
              <p className="text-2xl font-bold text-green-400 mt-0.5">{valorFormatado}</p>
            )}
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* ── Selecionar método ──────────────────────────────────────────────── */}
          {stage === 'selecionar' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">Escolha como pagar:</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMetodo('pix')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    metodo === 'pix'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <QrCode className={`w-8 h-8 ${metodo === 'pix' ? 'text-green-400' : 'text-zinc-400'}`} />
                  <span className={`text-sm font-medium ${metodo === 'pix' ? 'text-green-300' : 'text-zinc-300'}`}>
                    Pix
                  </span>
                  <span className="text-xs text-zinc-500">Instantâneo</span>
                </button>

                <button
                  onClick={() => setMetodo('cartao')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    metodo === 'cartao'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <CreditCard className={`w-8 h-8 ${metodo === 'cartao' ? 'text-blue-400' : 'text-zinc-400'}`} />
                  <span className={`text-sm font-medium ${metodo === 'cartao' ? 'text-blue-300' : 'text-zinc-300'}`}>
                    Cartão
                  </span>
                  <span className="text-xs text-zinc-500">Crédito</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (metodo === 'pix') pagarPix()
                  else setStage('cartao_form')
                }}
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {metodo === 'pix' ? 'Gerar QR Code Pix' : 'Continuar com Cartão'}
              </button>
            </div>
          )}

          {/* ── Formulário de cartão ───────────────────────────────────────────── */}
          {stage === 'cartao_form' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Número do cartão</label>
                <input
                  value={card.number}
                  onChange={e => setCard(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nome no cartão</label>
                <input
                  value={card.holder}
                  onChange={e => setCard(p => ({ ...p, holder: e.target.value.toUpperCase() }))}
                  placeholder="NOME SOBRENOME"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Validade</label>
                  <input
                    value={card.expiry}
                    onChange={e => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/AAAA"
                    maxLength={7}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">CVV</label>
                  <input
                    value={card.cvv}
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="000"
                    maxLength={4}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {erro && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {erro}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setStage('selecionar'); setErro('') }}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={pagarCartao}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Processando...' : `Pagar ${valorFormatado}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Aguardando Pix ─────────────────────────────────────────────────── */}
          {stage === 'aguardando_pix' && pixData && (
            <PixDisplay
              qrCode={pixData.qrCode}
              qrCodeUrl={pixData.qrCodeUrl}
              pagamentoId={pixData.pagamentoId}
              expiracao={pixData.expiracao}
              onPago={() => {
                setPagamentoId(pixData.pagamentoId)
                setStage('pago')
                onSuccess?.(pixData.pagamentoId)
              }}
              onExpirado={() => setStage('selecionar')}
            />
          )}

          {/* ── Pago ─────────────────────────────────────────────────────────────── */}
          {stage === 'pago' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="w-16 h-16 text-green-400" />
              <div>
                <p className="text-xl font-semibold text-white">Pagamento confirmado!</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Sua solicitação foi processada com sucesso.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          )}

          {/* ── Erro ──────────────────────────────────────────────────────────────── */}
          {stage === 'erro' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <AlertCircle className="w-16 h-16 text-red-400" />
              <div>
                <p className="text-lg font-semibold text-white">Erro no pagamento</p>
                <p className="text-sm text-zinc-400 mt-1">{erro}</p>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
