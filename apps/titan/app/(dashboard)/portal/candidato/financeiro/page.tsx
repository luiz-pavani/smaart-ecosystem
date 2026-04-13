'use client'

import { useEffect, useState, useContext } from 'react'
import {
  Loader2, CheckCircle2, Clock, XCircle, AlertCircle,
  CreditCard, Receipt, DollarSign, Plus, X, CalendarDays,
} from 'lucide-react'
import { CandidatoContext } from '../context'

interface Pagamento {
  id: string
  tipo: string
  valor: number
  status: string
  safe2pay_id: string | null
  pix_qr_code: string | null
  pix_qr_code_url: string | null
  pix_expiracao: string | null
  metadata: any
  created_at: string
  updated_at: string
}

interface Inscricao {
  id: string
  status_inscricao: string
  status_pagamento: string
  graduacao_pretendida: string
  created_at: string
}

const VALOR_INSCRICAO = 2200

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pago': return <CheckCircle2 className="w-5 h-5 text-green-400" />
    case 'pendente': return <Clock className="w-5 h-5 text-yellow-400" />
    case 'cancelado': return <XCircle className="w-5 h-5 text-slate-500" />
    case 'falhou': return <XCircle className="w-5 h-5 text-red-400" />
    default: return <AlertCircle className="w-5 h-5 text-slate-400" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pago: 'bg-green-500/10 text-green-400 border-green-500/30',
    pendente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    cancelado: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    falhou: 'bg-red-500/10 text-red-400 border-red-500/30',
  }
  const label: Record<string, string> = {
    pago: 'PAGO', pendente: 'PENDENTE', cancelado: 'CANCELADO', falhou: 'FALHOU',
  }
  return (
    <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${map[status] || map.pendente}`}>
      {label[status] || status}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pix: { cls: 'bg-teal-500/10 text-teal-400 border-teal-500/30', label: 'PIX' },
    cartao: { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'CARTÃO' },
    recorrente: { cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30', label: 'RECORRENTE' },
  }
  const t = map[tipo] || { cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30', label: tipo }
  return (
    <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${t.cls}`}>
      {t.label}
    </span>
  )
}

// ─── Admin: Register manual payment modal ────────────────────────────────────
function ManualPaymentModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [valor, setValor] = useState(VALOR_INSCRICAO.toString())
  const [tipo, setTipo] = useState('pix')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setErro('')
    try {
      await onSave({ valor: Number(valor), tipo, observacao })
      onClose()
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-black text-lg">Registrar Pagamento</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        <p className="text-slate-400 text-xs mb-5">
          Registre um pagamento realizado fora do sistema (depósito, transferência, dinheiro, etc).
          O status da inscrição será atualizado para APROVADO automaticamente.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Forma de Pagamento</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500"
            >
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Observação</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Depósito bancário em 05/04..."
              rows={3}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {erro && <p className="mt-3 text-red-400 text-xs font-semibold">{erro}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !valor}
            className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Admin: Change status modal ──────────────────────────────────────────────
function ChangeStatusModal({ pagamento, onClose, onSave }: { pagamento: Pagamento; onClose: () => void; onSave: (data: any) => void }) {
  const [status, setStatus] = useState(pagamento.status)
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setErro('')
    try {
      await onSave({ pagamento_id: pagamento.id, status, observacao })
      onClose()
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-black text-lg">Alterar Status</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        <div className="bg-black/50 border border-slate-800 rounded-xl p-3 mb-5 flex items-center gap-3">
          <TipoBadge tipo={pagamento.tipo} />
          <span className="text-white font-bold text-sm">{formatCurrency(pagamento.valor)}</span>
          <span className="text-slate-500 text-xs">{formatDate(pagamento.created_at)}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Novo Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
              <option value="falhou">Falhou</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Observação</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Motivo da alteração..."
              rows={3}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {erro && <p className="mt-3 text-red-400 text-xs font-semibold">{erro}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || status === pagamento.status}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const { isAdmin } = useContext(CandidatoContext)
  const [loading, setLoading] = useState(true)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [inscricao, setInscricao] = useState<Inscricao | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [editingPag, setEditingPag] = useState<Pagamento | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/candidato/pagamentos')
      const data = await res.json()
      setPagamentos(data.pagamentos || [])
      setInscricao(data.inscricao || null)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Computed
  const totalPago = pagamentos
    .filter(p => p.status === 'pago')
    .reduce((sum, p) => sum + p.valor, 0)

  const saldoDevedor = Math.max(0, VALOR_INSCRICAO - totalPago)
  const pagamentoPendente = pagamentos.find(p => p.status === 'pendente')
  const quitado = totalPago >= VALOR_INSCRICAO

  // Admin: register manual payment
  const handleManualPayment = async (data: { valor: number; tipo: string; observacao: string }) => {
    const res = await fetch('/api/candidato/pagamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stakeholder_id: undefined, ...data }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao registrar pagamento')
    }
    await load()
  }

  // Admin: change status
  const handleChangeStatus = async (data: { pagamento_id: string; status: string; observacao: string }) => {
    const res = await fetch('/api/candidato/pagamentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao alterar status')
    }
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Financeiro</h1>
          <p className="text-slate-400 mt-1">Pagamentos e situação financeira do programa</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar Pagamento
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-slate-500" />
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Taxa de Inscrição</p>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(VALOR_INSCRICAO)}</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Total Pago</p>
          </div>
          <p className={`text-2xl font-black ${totalPago > 0 ? 'text-green-400' : 'text-slate-600'}`}>
            {formatCurrency(totalPago)}
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-yellow-500" />
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Saldo Devedor</p>
          </div>
          <p className={`text-2xl font-black ${quitado ? 'text-green-400' : 'text-yellow-400'}`}>
            {quitado ? 'QUITADO' : formatCurrency(saldoDevedor)}
          </p>
        </div>
      </div>

      {/* Inscription status */}
      {inscricao && (
        <div className={`border rounded-xl p-4 flex items-center gap-4 ${
          inscricao.status_pagamento === 'APROVADO'
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-yellow-500/5 border-yellow-500/20'
        }`}>
          {inscricao.status_pagamento === 'APROVADO' ? (
            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${inscricao.status_pagamento === 'APROVADO' ? 'text-green-300' : 'text-yellow-300'}`}>
              {inscricao.status_pagamento === 'APROVADO'
                ? 'Pagamento da inscrição confirmado'
                : 'Pagamento da inscrição pendente'}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              Inscrição: {inscricao.status_inscricao} · {inscricao.graduacao_pretendida} · desde {formatDate(inscricao.created_at)}
            </p>
          </div>
        </div>
      )}

      {/* Pending payment alert */}
      {pagamentoPendente && pagamentoPendente.pix_qr_code && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h3 className="text-yellow-300 text-sm font-bold">PIX pendente</h3>
          </div>
          <p className="text-slate-400 text-xs mb-3">
            Você tem um pagamento PIX aguardando confirmação.
            {pagamentoPendente.pix_expiracao && (
              <> Expira em: <span className="text-yellow-300 font-mono">{formatDateTime(pagamentoPendente.pix_expiracao)}</span></>
            )}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(pagamentoPendente.pix_qr_code!)}
            className="text-xs px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg text-yellow-300 font-semibold transition-colors"
          >
            Copiar código PIX
          </button>
        </div>
      )}

      {/* Payment History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-slate-500" />
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Histórico de Pagamentos</h2>
        </div>

        {pagamentos.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-8 text-center">
            <Receipt className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum pagamento registrado</p>
            <p className="text-slate-600 text-xs mt-1">
              Acesse a seção <span className="text-red-400 font-semibold">Inscrição</span> para realizar o pagamento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagamentos.map(p => (
              <div
                key={p.id}
                className="bg-[#111827] border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={p.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{formatCurrency(p.valor)}</span>
                      <TipoBadge tipo={p.tipo} />
                      <StatusBadge status={p.status} />
                      {p.metadata?.manual && (
                        <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                          MANUAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDateTime(p.created_at)}
                      </span>
                      {p.safe2pay_id && (
                        <span className="text-slate-600 text-xs font-mono">#{p.safe2pay_id}</span>
                      )}
                      {p.metadata?.observacao && (
                        <span className="text-slate-500 text-xs italic truncate max-w-[200px]">
                          {p.metadata.observacao}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin: edit button */}
                  {isAdmin && (
                    <button
                      onClick={() => setEditingPag(p)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors flex-shrink-0"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3">Informações</h3>
        <ul className="space-y-2 text-slate-400 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-slate-600">•</span>
            Pagamentos via PIX são confirmados automaticamente em até 5 minutos.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-600">•</span>
            Pagamentos via cartão são processados pela Safe2Pay e confirmados imediatamente.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-600">•</span>
            Pagamentos feitos fora do sistema (depósito, transferência) devem ser informados à coordenação para registro manual.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-slate-600">•</span>
            Em caso de dúvidas, entre em contato com a coordenação do programa.
          </li>
        </ul>
      </div>

      {/* Modals */}
      {showManual && (
        <ManualPaymentModal
          onClose={() => setShowManual(false)}
          onSave={handleManualPayment}
        />
      )}
      {editingPag && (
        <ChangeStatusModal
          pagamento={editingPag}
          onClose={() => setEditingPag(null)}
          onSave={handleChangeStatus}
        />
      )}
    </div>
  )
}
