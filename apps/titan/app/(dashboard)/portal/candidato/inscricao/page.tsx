'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Clock, AlertCircle, CreditCard, QrCode, Copy, Check } from 'lucide-react'

interface InscricaoData {
  id: string
  graduacao_pretendida: string
  status_inscricao: string
  status_pagamento: string
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'CONFIRMADO' || status === 'APROVADO') {
    return (
      <span className="flex items-center gap-1.5 text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full text-xs font-black uppercase">
        <CheckCircle2 className="w-3.5 h-3.5" /> {status}
      </span>
    )
  }
  if (status === 'PENDENTE') {
    return (
      <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1.5 rounded-full text-xs font-black uppercase">
        <Clock className="w-3.5 h-3.5" /> PENDENTE
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-slate-400 bg-slate-400/10 border border-slate-400/20 px-3 py-1.5 rounded-full text-xs font-black uppercase">
      <AlertCircle className="w-3.5 h-3.5" /> {status}
    </span>
  )
}

export default function InscricaoPage() {
  const [inscricao, setInscricao] = useState<InscricaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPix, setShowPix] = useState(false)
  const [copied, setCopied] = useState(false)

  // Placeholder PIX code
  const PIX_CODE = '00020126580014BR.GOV.BCB.PIX013612345678-1234-1234-1234-1234567890005204000053039865802BR5915LIGA RIOGRAND6009SAO PAULO62140510pagamento6304ABCD'

  useEffect(() => {
    fetch('/api/candidato/dados')
      .then(r => r.json())
      .then(d => setInscricao(d.inscricao))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Inscrição</h1>
        <p className="text-slate-400 mt-1">Processo de inscrição e pagamento do Programa de Faixas Pretas</p>
      </div>

      {/* Status current */}
      {inscricao ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Status da Inscrição</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Inscrição</p>
              <StatusBadge status={inscricao.status_inscricao} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Pagamento</p>
              <StatusBadge status={inscricao.status_pagamento} />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Graduação Pretendida</p>
            <p className="text-white font-bold">{inscricao.graduacao_pretendida}</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-900/10 border border-yellow-600/20 rounded-xl p-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-bold text-sm mb-1">Inscrição não realizada</p>
            <p className="text-yellow-200/60 text-xs">Acesse a seção Visão Geral para definir sua graduação pretendida e iniciar o processo.</p>
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-bl-xl">
            PROMOÇÃO
          </div>
          <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Taxa Promocional</p>
          <p className="text-3xl font-black text-white">R$ 1.880</p>
          <p className="text-slate-500 text-xs mt-1">,00</p>
          <p className="text-slate-400 text-sm mt-3">Válido para inscrições realizadas até 30 dias antes do exame.</p>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Taxa Regular</p>
          <p className="text-3xl font-black text-white">R$ 2.200</p>
          <p className="text-slate-500 text-xs mt-1">,00</p>
          <p className="text-slate-400 text-sm mt-3">Válido para inscrições regulares dentro do prazo.</p>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Pagamento</h2>
        </div>

        <div className="space-y-4">
          {/* PIX placeholder */}
          <button
            onClick={() => setShowPix(!showPix)}
            className="w-full flex items-center justify-between p-4 bg-black border border-slate-700 hover:border-slate-500 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-red-500" />
              <div className="text-left">
                <p className="text-white font-bold text-sm">Pagar via PIX</p>
                <p className="text-slate-500 text-xs">Copie o código ou escaneie o QR Code</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Clique para ver</span>
          </button>

          {showPix && (
            <div className="bg-black border border-slate-700 rounded-xl p-5 space-y-4">
              {/* Coming soon notice */}
              <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-600/20 rounded-lg">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-blue-300 text-xs">
                  <strong>Em breve:</strong> Integração automática com Safe2Pay. Por enquanto, entre em contato com a coordenação para efetuar o pagamento.
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Código PIX (simulado)</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={PIX_CODE.slice(0, 40) + '...'}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-xs font-mono"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-colors flex items-center gap-1.5 text-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact for payment */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Para efetuar o pagamento</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Entre em contato diretamente com a coordenação do programa via WhatsApp ou e-mail para receber
          as instruções de pagamento e confirmação de inscrição. Após confirmação do pagamento, seu
          status será atualizado em até 2 dias úteis.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <a
            href="https://wa.me/55519999999999?text=Olá, gostaria de informações sobre o pagamento do Programa de Faixas Pretas."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-white text-sm font-bold transition-colors"
          >
            WhatsApp
          </a>
          <a
            href="mailto:graduacao@lrsj.org.br?subject=Pagamento Programa Faixas Pretas"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm transition-colors"
          >
            E-mail
          </a>
        </div>
      </div>
    </div>
  )
}
