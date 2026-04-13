'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Clock, AlertCircle, CreditCard, RefreshCw, User } from 'lucide-react'
import CheckoutModal, { CheckoutCustomer } from '@/components/checkout/CheckoutModal'

function formatCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function validateCpf(cpf: string) {
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(n[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(n[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(n[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(n[10])
}

interface InscricaoData {
  id: string
  graduacao_pretendida: string
  status_inscricao: string
  status_pagamento: string
  created_at: string
}

interface CandidatoData {
  inscricao: InscricaoData | null
  stakeholder?: {
    nome_completo: string
    email: string
    telefone: string
    cpf?: string
    cidade?: string
    estado?: string
  } | null
  pagamento?: {
    id: string
    tipo: string
    valor: number
    status: string
    pix_qr_code?: string
    pix_qr_code_url?: string
    pix_expiracao?: string
    safe2pay_id?: string
  } | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'CONFIRMADO' || status === 'APROVADO' || status === 'pago') {
    return (
      <span className="flex items-center gap-1.5 text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full text-xs font-black uppercase">
        <CheckCircle2 className="w-3.5 h-3.5" /> {status === 'pago' ? 'PAGO' : status}
      </span>
    )
  }
  if (status === 'PENDENTE' || status === 'pendente') {
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
  const [dados, setDados] = useState<CandidatoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [cpfInput, setCpfInput] = useState('')
  const [cpfConfirmed, setCpfConfirmed] = useState(false)
  const [showCpfForm, setShowCpfForm] = useState(false)

  async function load() {
    try {
      const d = await fetch('/api/candidato/dados').then(r => r.json())
      setDados(d)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const inscricao = dados?.inscricao
  const stakeholder = dados?.stakeholder
  const pagamento = dados?.pagamento

  // Determina se o pagamento já foi confirmado
  const pago = pagamento?.status === 'pago' || inscricao?.status_pagamento === 'CONFIRMADO'

  // Determina o valor correto (promoção ou regular)
  // A promoção de R$1.880 seria via resolverValor no servidor; aqui mostramos R$2.200
  // mas o checkout busca o valor do produto 'profep' (R$2.200)

  const cpfFinal = stakeholder?.cpf?.replace(/\D/g, '') || cpfInput.replace(/\D/g, '')
  const customer: CheckoutCustomer = {
    name: stakeholder?.nome_completo ?? '',
    identity: cpfFinal,
    email: stakeholder?.email ?? '',
    phone: stakeholder?.telefone,
    address: stakeholder?.cidade ? {
      CityName: stakeholder.cidade,
      StateInitials: stakeholder.estado ?? '',
    } : undefined,
  }
  const needsCpf = !cpfFinal || cpfFinal === '00000000000' || !validateCpf(cpfFinal)

  async function handleReload() {
    setReloading(true)
    await load()
    setReloading(false)
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Inscrição</h1>
          <p className="text-slate-400 mt-1">Processo de inscrição e pagamento do Programa de Faixas Pretas</p>
        </div>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Status da inscrição */}
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
              <StatusBadge status={pagamento?.status ?? inscricao.status_pagamento} />
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

      {/* Valor */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Taxa de Inscrição</p>
        <p className="text-3xl font-black text-white">R$ 2.200<span className="text-slate-500 text-xs">,00</span></p>
        <p className="text-slate-400 text-sm mt-3">Válido para inscrições dentro do prazo regular.</p>
      </div>

      {/* Pagamento */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Pagamento</h2>
        </div>

        {pago ? (
          /* Pagamento confirmado */
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-green-300 font-bold text-sm">Pagamento confirmado</p>
              {pagamento?.valor && (
                <p className="text-green-200/60 text-xs mt-0.5">
                  R$ {pagamento.valor.toFixed(2).replace('.', ',')} via {pagamento.tipo === 'cartao' ? 'Cartão' : 'Pix'}
                  {pagamento.safe2pay_id && ` · #${pagamento.safe2pay_id}`}
                </p>
              )}
            </div>
          </div>
        ) : pagamento?.status === 'pendente' && pagamento.pix_qr_code ? (
          /* Pix pendente — mostrar QR novamente */
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-yellow-300 text-xs">Pagamento Pix aguardando confirmação. Escaneie o QR Code abaixo.</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-4 bg-black border border-slate-700 rounded-xl">
              {pagamento.pix_qr_code_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pagamento.pix_qr_code_url} alt="QR Code Pix" className="w-48 h-48 rounded-lg" />
              )}
              <button
                onClick={() => navigator.clipboard.writeText(pagamento.pix_qr_code!)}
                className="text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors"
              >
                Copiar código Pix
              </button>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full py-3 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm transition-colors"
            >
              Pagar com cartão de crédito
            </button>
          </div>
        ) : inscricao ? (
          /* Inscrição existe mas sem pagamento */
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Escolha a forma de pagamento para confirmar sua inscrição.</p>

            {/* Formulário de CPF se necessário */}
            {(showCpfForm || needsCpf) && !cpfConfirmed && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-300 font-medium">Informe seu CPF para o pagamento</p>
                </div>
                <input
                  type="text"
                  value={cpfInput}
                  onChange={e => setCpfInput(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-red-500"
                />
                {cpfInput.replace(/\D/g,'').length === 11 && !validateCpf(cpfInput) && (
                  <p className="text-red-400 text-xs">CPF inválido</p>
                )}
                <button
                  disabled={!validateCpf(cpfInput)}
                  onClick={() => setCpfConfirmed(true)}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Confirmar CPF
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (needsCpf && !cpfConfirmed) { setShowCpfForm(true); return }
                setCheckoutOpen(true)
              }}
              disabled={showCpfForm && needsCpf && !cpfConfirmed}
              className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-sm"
            >
              <CreditCard className="w-4 h-4" />
              Pagar inscrição — R$ 2.200,00
            </button>
          </div>
        ) : (
          /* Sem inscrição — desabilita pagamento */
          <p className="text-slate-500 text-sm">Realize a inscrição primeiro na seção Visão Geral.</p>
        )}
      </div>

      {/* CheckoutModal */}
      {inscricao && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          produto={{
            produto: 'profep',
            referencia_id: inscricao.id,
            descricao: 'PROFEP 2026 — Programa de Faixas Pretas',
            subtitulo: `Inscrição de ${stakeholder?.nome_completo ?? ''}`,
          }}
          customer={customer}
          onSuccess={async () => {
            setCheckoutOpen(false)
            await handleReload()
          }}
        />
      )}
    </div>
  )
}
