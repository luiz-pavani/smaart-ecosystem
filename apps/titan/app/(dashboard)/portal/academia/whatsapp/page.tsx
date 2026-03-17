'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Wifi, WifiOff, RefreshCw, Trash2, MessageSquare, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import Image from 'next/image'

type Status = 'open' | 'connecting' | 'close' | 'DISCONNECTED'

export default function WhatsAppPage() {
  const router = useRouter()
  const supabase = createClient()

  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('DISCONNECTED')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')

  // Test send
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg] = useState('Olá! Teste de integração WhatsApp via SMAART PRO.')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const fetchStatus = useCallback(async (id: string) => {
    const res = await fetch(`/api/whatsapp/instance?academia_id=${id}`)
    const data = await res.json()
    const state: Status = data?.instance?.state || data?.state || 'DISCONNECTED'
    setStatus(state)
    return state
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const id = await resolveAcademiaId(supabase)
      if (!id) { setError('Academia não encontrada'); setLoading(false); return }
      setAcademiaId(id)

      const state = await fetchStatus(id)
      setLoading(false)

      // If connecting, poll for QR
      if (state !== 'open') {
        fetchQR(id)
      }
    }
    init()
  }, [supabase, fetchStatus])

  // Auto-poll status when QR is shown
  useEffect(() => {
    if (!academiaId || status === 'open') return
    if (!qrCode) return

    const interval = setInterval(async () => {
      const state = await fetchStatus(academiaId)
      if (state === 'open') {
        setQrCode(null)
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [academiaId, qrCode, status, fetchStatus])

  const fetchQR = async (id: string) => {
    const res = await fetch(`/api/whatsapp/instance?academia_id=${id}&action=qr`)
    const data = await res.json()
    const qr = data?.qrcode?.base64 || data?.base64
    if (qr) setQrCode(qr)
  }

  const handleConnect = async () => {
    if (!academiaId) return
    setConnecting(true)
    setError(null)
    try {
      // Create instance
      await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academia_id: academiaId }),
      })

      // Wait a bit then fetch QR
      await new Promise(r => setTimeout(r, 1500))
      await fetchQR(academiaId)
    } catch {
      setError('Erro ao iniciar conexão')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!academiaId) return
    setDisconnecting(true)
    try {
      await fetch(`/api/whatsapp/instance?academia_id=${academiaId}`, { method: 'DELETE' })
      setStatus('DISCONNECTED')
      setQrCode(null)
      setPhone('')
    } catch {
      setError('Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleRefreshQR = async () => {
    if (!academiaId) return
    setQrCode(null)
    await fetchQR(academiaId)
  }

  const handleSendTest = async () => {
    if (!academiaId || !testPhone) return
    setSending(true)
    setSent(false)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academia_id: academiaId, to: testPhone, text: testMsg }),
      })
      if (res.ok) setSent(true)
      else setError('Erro ao enviar mensagem de teste')
    } catch {
      setError('Erro ao enviar mensagem')
    } finally {
      setSending(false)
      setTimeout(() => setSent(false), 4000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  const isConnected = status === 'open'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
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
              <h1 className="text-3xl font-bold text-white">WhatsApp</h1>
              <p className="text-gray-400 mt-0.5">Conecte o WhatsApp da academia para enviar notificações</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400">{error}</div>
        )}

        {/* Status Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Status da Conexão</h2>
            {isConnected ? (
              <span className="flex items-center gap-2 text-green-400 text-sm font-semibold bg-green-400/10 px-3 py-1 rounded-full">
                <Wifi className="w-4 h-4" />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-400 text-sm font-semibold bg-white/5 px-3 py-1 rounded-full">
                <WifiOff className="w-4 h-4" />
                Desconectado
              </span>
            )}
          </div>

          {isConnected ? (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                WhatsApp conectado. Notificações automáticas estão ativas para esta academia.
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-sm font-semibold disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {!qrCode ? (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Clique em conectar para gerar o QR Code. Escaneie com o WhatsApp do celular da academia.
                  </p>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    {connecting ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Abra o WhatsApp no celular → <strong className="text-white">Menu (⋮)</strong> → <strong className="text-white">Aparelhos conectados</strong> → <strong className="text-white">Conectar um aparelho</strong> → escaneie o QR code abaixo:
                  </p>
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-xl">
                      <Image
                        src={qrCode}
                        alt="QR Code WhatsApp"
                        width={220}
                        height={220}
                        unoptimized
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Aguardando escaneamento...
                  </div>
                  <button
                    onClick={handleRefreshQR}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    QR expirou? Clique para renovar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Send (only when connected) */}
        {isConnected && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Teste de Envio</h2>
            <p className="text-gray-400 text-sm">Envie uma mensagem de teste para verificar a integração.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Número (com DDD)</label>
                <input
                  type="text"
                  placeholder="Ex: 11999887766"
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
                onClick={handleSendTest}
                disabled={sending || !testPhone}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sent ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {sending ? 'Enviando...' : sent ? 'Enviado!' : 'Enviar Teste'}
              </button>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <h3 className="text-blue-300 font-semibold text-sm mb-2">Como funciona</h3>
          <ul className="text-gray-400 text-sm space-y-1.5">
            <li>• Cada academia conecta seu próprio número de WhatsApp</li>
            <li>• O sistema usa WhatsApp Web — mantenha o celular com internet</li>
            <li>• Notificações automáticas de check-in, promoção e mensalidade</li>
            <li>• Mensagens aparecem como enviadas pelo número da academia</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
