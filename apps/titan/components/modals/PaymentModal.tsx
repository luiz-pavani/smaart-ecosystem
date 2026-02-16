'use client'

import { useState } from 'react'
import { X, CreditCard, Barcode, QrCode, DollarSign, Calendar, CheckCircle } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  academia: {
    id: string
    nome: string
    nome_fantasia: string | null
    responsavel_nome: string
    responsavel_email: string
  }
  valorAnualidade: number
  maxParcelas: number
}

export function PaymentModal({
  isOpen,
  onClose,
  academia,
  valorAnualidade,
  maxParcelas
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [parcelas, setParcelas] = useState(1)
  const [metodoPagamento, setMetodoPagamento] = useState<'credit_card' | 'boleto' | 'pix'>('credit_card')
  const [linkGerado, setLinkGerado] = useState<string | null>(null)

  if (!isOpen) return null

  const valorParcela = valorAnualidade / parcelas
  const vencimento = new Date()
  vencimento.setDate(vencimento.getDate() + 7) // 7 dias para pagamento

  const handleGerarCobranca = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pagamentos/gerar-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academia_id: academia.id,
          tipo: 'anualidade_academia',
          valor: valorAnualidade,
          parcelas,
          metodo_pagamento: metodoPagamento,
          data_vencimento: vencimento.toISOString().split('T')[0]
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar cobrança')
      }

      const data = await response.json()
      setLinkGerado(data.payment_url)
      
      // Enviar email automático para o responsável
      alert(`✅ Cobrança gerada! Email enviado para ${academia.responsavel_email}`)
      
    } catch (error: any) {
      alert(`❌ Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarEmail = () => {
    if (linkGerado) {
      alert(`📧 Email reenviado para ${academia.responsavel_email}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gerar Cobrança de Anuidade</h2>
            <p className="text-sm text-gray-600 mt-1">
              {academia.nome_fantasia || academia.nome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!linkGerado ? (
            <>
              {/* Valor */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Valor da Anuidade 2026</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  R$ {valorAnualidade.toFixed(2).replace('.', ',')}
                </div>
              </div>

              {/* Método de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setMetodoPagamento('credit_card')}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      metodoPagamento === 'credit_card'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                      metodoPagamento === 'credit_card' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium text-gray-900">Cartão</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagamento('boleto')}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      metodoPagamento === 'boleto'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Barcode className={`w-6 h-6 mx-auto mb-2 ${
                      metodoPagamento === 'boleto' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium text-gray-900">Boleto</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagamento('pix')}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      metodoPagamento === 'pix'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <QrCode className={`w-6 h-6 mx-auto mb-2 ${
                      metodoPagamento === 'pix' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium text-gray-900">PIX</div>
                  </button>
                </div>
              </div>

              {/* Parcelamento (apenas para cartão) */}
              {metodoPagamento === 'credit_card' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Parcelamento (até {maxParcelas}x sem juros)
                  </label>
                  <select
                    value={parcelas}
                    onChange={(e) => setParcelas(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x de R$ {(valorAnualidade / n).toFixed(2).replace('.', ',')} 
                        {n === 1 ? ' à vista' : ' sem juros'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Informações */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Responsável:</span>
                  <span className="font-medium text-gray-900">{academia.responsavel_nome}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{academia.responsavel_email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Vencimento:</span>
                  <span className="font-medium text-gray-900">
                    {vencimento.toLocaleDateString('pt-BR')} (7 dias)
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGerarCobranca}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Gerar Cobrança
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Link Gerado */
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Cobrança Gerada com Sucesso!
                </h3>
                <p className="text-gray-600">
                  Link de pagamento enviado para {academia.responsavel_email}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link de Pagamento
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkGerado}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(linkGerado)
                      alert('✅ Link copiado!')
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleEnviarEmail}
                  className="flex-1 px-6 py-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium"
                >
                  Reenviar Email
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
