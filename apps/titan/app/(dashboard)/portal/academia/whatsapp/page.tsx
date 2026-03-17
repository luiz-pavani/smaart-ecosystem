'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, MessageSquare, CheckCircle, Phone, Star } from 'lucide-react'

export default function WhatsAppPage() {
  const router = useRouter()

  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg] = useState('Olá! Teste de integração WhatsApp via SMAART PRO.')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/instance')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setError('Erro ao verificar status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSend = async () => {
    if (!testPhone) return
    setSending(true)
    setSent(false)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone, text: testMsg }),
      })
      const data = await res.json()
      if (data?.messages?.[0]?.id) {
        setSent(true)
        setTimeout(() => setSent(false), 4000)
      } else {
        setError(data?.error?.message || 'Erro ao enviar. Verifique o número.')
      }
    } catch {
      setError('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const isConnected = status && !status.error && status.display_phone_number

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
              <p className="text-gray-400 mt-0.5">Envio de notificações via Meta Business API</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Status Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Status da Conexão</h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando...
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
              {status?.error?.message || 'Número não configurado. Verifique as variáveis de ambiente.'}
            </div>
          )}
        </div>

        {/* Teste de Envio */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Enviar Mensagem de Teste</h2>
          <p className="text-gray-400 text-sm">
            No modo de desenvolvimento, só é possível enviar para números previamente cadastrados no painel da Meta.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Número (com DDD)</label>
              <input
                type="text"
                placeholder="Ex: 51999887766"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Mensagem</label>
              <textarea
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !testPhone}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              {sending ? 'Enviando...' : sent ? 'Enviado!' : 'Enviar Teste'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <h3 className="text-blue-300 font-semibold text-sm mb-2">Como funciona</h3>
          <ul className="text-gray-400 text-sm space-y-1.5">
            <li>• Mensagens enviadas via Meta WhatsApp Business API (oficial)</li>
            <li>• Grátis até 1.000 conversas por mês</li>
            <li>• Token de produção: gere um System User Token permanente no Meta Business Manager</li>
            <li>• Para adicionar número real: acesse o painel Meta → WhatsApp → Números de telefone</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
