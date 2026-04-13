'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCircle, Copy, Clock, RefreshCw, XCircle } from 'lucide-react'

interface PixDisplayProps {
  qrCode: string           // EMV payload (copia-e-cola)
  qrCodeUrl?: string       // URL da imagem QR (fallback: renderiza no canvas)
  pagamentoId: string
  expiracao: string        // ISO timestamp
  onPago: () => void
  onExpirado?: () => void
}

type PollingStatus = 'pendente' | 'pago' | 'falhou' | 'cancelado' | 'expirado'

export default function PixDisplay({
  qrCode, qrCodeUrl, pagamentoId, expiracao, onPago, onExpirado,
}: PixDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copiado, setCopiado] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>('pendente')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer regressivo
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(expiracao).getTime() - Date.now()) / 1000))
      setSegundos(diff)
      if (diff === 0) {
        setPollingStatus('expirado')
        onExpirado?.()
      }
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [expiracao, onExpirado])

  // Renderiza QR code no canvas se não tiver imagem
  useEffect(() => {
    if (qrCodeUrl || !qrCode || !canvasRef.current) return
    const generate = async () => {
      const QRCode = (await import('qrcode')).default
      QRCode.toCanvas(canvasRef.current!, qrCode, {
        width: 240,
        errorCorrectionLevel: 'M',
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }
    generate()
  }, [qrCode, qrCodeUrl])

  // Polling de status
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkout/status?pagamento_id=${pagamentoId}`)
      const data = await res.json()
      if (data.status === 'pago') {
        setPollingStatus('pago')
        if (pollingRef.current) clearInterval(pollingRef.current)
        onPago()
      } else if (data.status === 'expirado' || data.status === 'cancelado') {
        setPollingStatus(data.status)
        if (pollingRef.current) clearInterval(pollingRef.current)
        onExpirado?.()
      }
    } catch {
      // silencioso
    }
  }, [pagamentoId, onPago, onExpirado])

  useEffect(() => {
    pollingRef.current = setInterval(poll, 5000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [poll])

  const copiar = async () => {
    await navigator.clipboard.writeText(qrCode)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0')
  const ss = String(segundos % 60).padStart(2, '0')

  if (pollingStatus === 'pago') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-400" />
        <p className="text-xl font-semibold text-green-300">Pagamento confirmado!</p>
      </div>
    )
  }

  if (pollingStatus === 'expirado') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <XCircle className="w-16 h-16 text-red-400" />
        <p className="text-lg font-semibold text-red-300">Pix expirado</p>
        <p className="text-sm text-zinc-400">Gere um novo Pix para tentar novamente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div className="bg-white rounded-xl p-3">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code Pix" className="w-48 h-48 object-contain" />
        ) : (
          <canvas ref={canvasRef} className="w-48 h-48" />
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Clock className="w-4 h-4" />
        <span>Expira em <span className="font-mono font-semibold text-zinc-200">{mm}:{ss}</span></span>
        <span className="text-xs text-zinc-500 animate-pulse ml-1 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> verificando...
        </span>
      </div>

      {/* Copia e cola */}
      <div className="w-full">
        <p className="text-xs text-zinc-500 mb-1">Pix copia e cola:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={qrCode}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono truncate"
          />
          <button
            onClick={copiar}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-200 transition-colors"
          >
            {copiado ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Abra o app do seu banco, escaneie o QR code ou use o código copia e cola.
        O pagamento é confirmado automaticamente.
      </p>
    </div>
  )
}
