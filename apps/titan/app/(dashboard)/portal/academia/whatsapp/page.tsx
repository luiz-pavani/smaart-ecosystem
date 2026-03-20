'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, MessageSquare, CheckCircle, Phone, Star,
  AlertCircle, XCircle, Clock, RefreshCw, ShieldCheck,
} from 'lucide-react'

interface Template {
  name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'NOT_FOUND' | string
  category: string | null
  quality_score: string | null
}

const TEMPLATE_LABELS: Record<string, string> = {
  lrsj_atleta_boas_vindas: 'Boas-vindas ao atleta',
  lrsj_atleta_plano_vencendo: 'Plano vencendo em breve',
  lrsj_atleta_plano_vencido: 'Plano vencido hoje',
  lrsj_academia_anuidade_vencendo: 'Anuidade da academia vencendo',
  lrsj_academia_anuidade_vencida: 'Anuidade da academia vencida',
}

function TemplateStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
          <CheckCircle className="w-3 h-3" /> Aprovado
        </span>
      )
    case 'PENDING':
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2.5 py-0.5">
          <Clock className="w-3 h-3" /> Em análise
        </span>
      )
    case 'REJECTED':
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-0.5">
          <XCircle className="w-3 h-3" /> Rejeitado
        </span>
      )
    case 'PAUSED':
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-0.5">
          <AlertCircle className="w-3 h-3" /> Pausado
        </span>
      )
    case 'NOT_FOUND':
    default:
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-500/10 border border-slate-500/20 rounded-full px-2.5 py-0.5">
          <AlertCircle className="w-3 h-3" /> Não cadastrado
        </span>
      )
  }
}

export default function WhatsAppPage() {
  const router = useRouter()

  const [status, setStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const [testPhone, setTestPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/instance')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => {})
      .finally(() => setLoadingStatus(false))

    fetchTemplates()
  }, [])

  function fetchTemplates() {
    setLoadingTemplates(true)
    setTemplateError(null)
    fetch('/api/whatsapp/templates')
      .then(r => r.json())
      .then(d => {
        if (d.error) setTemplateError(d.error)
        else setTemplates(d.templates || [])
      })
      .catch(() => setTemplateError('Erro ao carregar templates'))
      .finally(() => setLoadingTemplates(false))
  }

  const handleTestSend = async () => {
    if (!testPhone) return
    setSending(true)
    setSent(false)
    setSendError(null)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          text: 'Teste de integração SMAART PRO — Meta WhatsApp Business API.',
        }),
      })
      const data = await res.json()
      if (data?.messages?.[0]?.id) {
        setSent(true)
        setTimeout(() => setSent(false), 4000)
      } else {
        setSendError(data?.error?.message || 'Erro ao enviar. Verifique o número.')
      }
    } catch {
      setSendError('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const isConnected = status && !status.error && status.display_phone_number
  const approvedCount = templates.filter(t => t.status === 'APPROVED').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">WhatsApp Business</h1>
              <p className="text-gray-400 mt-0.5">Notificações automáticas via Meta Business API</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Status da Conexão */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Status da Conexão</h2>
          {loadingStatus ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
            </div>
          ) : isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                <CheckCircle className="w-5 h-5" />
                Conectado via Meta Business API
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white/5 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Número</p>
                  <p className="text-white font-semibold text-sm">{status.display_phone_number}</p>
                </div>
                <div className="bg-white/5 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Star className="w-3 h-3" /> Nome verificado</p>
                  <p className="text-white font-semibold text-sm">{status.verified_name || '—'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-yellow-400 text-sm">
              {status?.error?.message || 'Número não configurado. Adicione o chip e configure o número no Meta Business Manager.'}
            </div>
          )}
        </div>

        {/* Templates de Mensagem */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Templates de Mensagem
            </h2>
            <button
              onClick={fetchTemplates}
              disabled={loadingTemplates}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTemplates ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Templates aprovados pela Meta são necessários para envio de notificações proativas.
            {approvedCount > 0 && ` ${approvedCount}/5 aprovados.`}
          </p>

          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Consultando Meta...
            </div>
          ) : templateError ? (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {templateError}
              {templateError.includes('WHATSAPP_WABA_ID') && (
                <p className="mt-1 text-xs text-red-300">Adicione a variável WHATSAPP_WABA_ID nas configurações do Vercel (valor: 954872767488248)</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div
                  key={t.name}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    t.status === 'APPROVED' ? 'bg-green-500/5 border-green-500/15' :
                    t.status === 'REJECTED' ? 'bg-red-500/5 border-red-500/15' :
                    t.status === 'PENDING' ? 'bg-yellow-500/5 border-yellow-500/15' :
                    'bg-white/3 border-white/8'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{TEMPLATE_LABELS[t.name] ?? t.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{t.name}</p>
                  </div>
                  <TemplateStatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}

          {!loadingTemplates && !templateError && templates.some(t => t.status === 'NOT_FOUND') && (
            <p className="text-xs text-gray-500 mt-4">
              Templates "não cadastrados" devem ser criados no{' '}
              <span className="text-blue-400">Meta Business Manager → WhatsApp → Gerenciar modelos</span>.
            </p>
          )}
        </div>

        {/* Teste de Envio */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Teste de Sessão</h2>
          <p className="text-gray-400 text-sm">
            Envia mensagem de texto livre — funciona apenas dentro da janela de 24h após o contato do usuário.
            Para notificações proativas, use os templates acima.
          </p>
          {sendError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{sendError}</div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Número com DDD (ex: 51999887766)"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors text-sm"
            />
            <button
              onClick={handleTestSend}
              disabled={sending || !testPhone}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              {sending ? 'Enviando...' : sent ? 'Enviado!' : 'Enviar'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <h3 className="text-blue-300 font-semibold text-sm mb-2">Como funciona</h3>
          <ul className="text-gray-400 text-sm space-y-1.5">
            <li>• Notificações automáticas são disparadas diariamente às 8h via Cron</li>
            <li>• Templates aprovados permitem contato proativo independente de janela</li>
            <li>• Cota gratuita: 1.000 conversas por mês</li>
            <li>• Variável necessária: <span className="text-slate-300 font-mono text-xs">WHATSAPP_WABA_ID = 954872767488248</span></li>
          </ul>
        </div>

      </div>
    </div>
  )
}
