'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, IdCard, Search, Check, X, Camera, CameraOff,
  UserCheck, UserX, AlertCircle, RotateCcw,
} from 'lucide-react'

interface Inscricao {
  id: string
  status: string
  checked_in: boolean
  checked_in_at: string | null
  checkin_token: string
  peso_inscricao: number | null
  dados_atleta: Record<string, unknown>
  atletas: { nome: string; sobrenome: string } | null
  categories: { nome: string; peso_min: number | null; peso_max: number | null; genero: string | null; faixa_etaria: string | null } | null
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>
    }
  }
}

export default function CredenciamentoPage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [summary, setSummary] = useState({ total: 0, checked_in: 0, pendente: 0 })
  const [filtro, setFiltro] = useState<'all' | 'checked_in' | 'pending'>('pending')
  const [busca, setBusca] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ type: 'ok' | 'err' | 'warn'; msg: string } | null>(null)
  const [manualToken, setManualToken] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanLoopRef = useRef<number | null>(null)
  const lastScanRef = useRef<{ token: string; at: number } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/eventos/${eventoId}/checkin?status=all`)
    const data = await res.json()
    if (data.inscricoes) {
      setInscricoes(data.inscricoes)
      setSummary(data.summary)
    }
    setLoading(false)
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const flashMsg = (type: 'ok' | 'err' | 'warn', msg: string) => {
    setFlash({ type, msg })
    setTimeout(() => setFlash(null), 3000)
  }

  const handleCheckin = async (opts: { token?: string; registration_id?: string; revert?: boolean }) => {
    const res = await fetch(`/api/eventos/${eventoId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    })
    const data = await res.json()
    if (!res.ok) {
      flashMsg('err', data.error || 'Erro')
      return
    }
    if (data.was_already && data.checked_in) {
      flashMsg('warn', 'Atleta já estava credenciado')
    } else if (opts.revert) {
      flashMsg('ok', 'Credenciamento desfeito')
    } else {
      flashMsg('ok', '✓ Credenciado com sucesso')
    }
    load()
  }

  // Scanner QR via BarcodeDetector API (nativo)
  const startScan = async () => {
    setScanError(null)
    if (!window.BarcodeDetector) {
      setScanError('Scanner QR não suportado neste navegador. Use o campo manual abaixo.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

      const tick = async () => {
        if (!videoRef.current || !scanning) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            const token = codes[0].rawValue
            // Dedup — não dispara 2x mesmo token em <3s
            const now = Date.now()
            if (lastScanRef.current?.token === token && now - lastScanRef.current.at < 3000) {
              // skip
            } else {
              lastScanRef.current = { token, at: now }
              handleCheckin({ token })
            }
          }
        } catch {
          // ignore frame errors
        }
        scanLoopRef.current = window.requestAnimationFrame(tick)
      }
      scanLoopRef.current = window.requestAnimationFrame(tick)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro'
      setScanError(`Câmera negada: ${msg}`)
    }
  }

  const stopScan = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => () => stopScan(), [])

  const inscricoesFiltradas = inscricoes
    .filter(i => {
      if (filtro === 'checked_in') return i.checked_in
      if (filtro === 'pending') return !i.checked_in
      return true
    })
    .filter(i => {
      if (!busca) return true
      const b = busca.toLowerCase()
      const nome = `${i.atletas?.nome || ''} ${i.atletas?.sobrenome || ''}`.toLowerCase()
      return nome.includes(b) || (i.categories?.nome || '').toLowerCase().includes(b)
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push(`/portal/eventos/${eventoId}`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <IdCard className="w-7 h-7 text-cyan-400" /> Credenciamento — Mesa de Check-in
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Escaneie QR Code do comprovante ou busque pelo nome do atleta
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {flash && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium border ${
            flash.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
            flash.type === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
            'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>{flash.msg}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{summary.total}</div>
            <div className="text-xs text-slate-400">Inscritos pagos</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-300">{summary.checked_in}</div>
            <div className="text-xs text-emerald-400">Credenciados</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-300">{summary.pendente}</div>
            <div className="text-xs text-amber-400">Pendentes</div>
          </div>
        </div>

        {/* Scanner */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4" /> Scanner QR
            </div>
            {scanning ? (
              <button
                onClick={stopScan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 text-red-300 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/25"
              >
                <CameraOff className="w-3.5 h-3.5" /> Parar
              </button>
            ) : (
              <button
                onClick={startScan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs hover:bg-cyan-500/25"
              >
                <Camera className="w-3.5 h-3.5" /> Iniciar câmera
              </button>
            )}
          </div>

          {scanError && (
            <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> {scanError}
            </div>
          )}

          <video
            ref={videoRef}
            className={`w-full max-w-md mx-auto rounded-lg ${scanning ? 'block' : 'hidden'}`}
            playsInline
            muted
          />

          {/* Manual token input — fallback */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Token manual (do comprovante)"
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-mono"
              onKeyDown={e => {
                if (e.key === 'Enter' && manualToken.trim()) {
                  handleCheckin({ token: manualToken.trim() })
                  setManualToken('')
                }
              }}
            />
            <button
              onClick={() => {
                if (manualToken.trim()) {
                  handleCheckin({ token: manualToken.trim() })
                  setManualToken('')
                }
              }}
              disabled={!manualToken.trim()}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 disabled:opacity-50"
            >Credenciar</button>
          </div>
        </div>

        {/* Filters + List */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            {(['pending', 'checked_in', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  filtro === f
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {f === 'pending' ? `Pendentes (${summary.pendente})` :
                 f === 'checked_in' ? `Credenciados (${summary.checked_in})` :
                 `Todos (${summary.total})`}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar atleta…"
                className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-40 md:w-64 py-1.5"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : inscricoesFiltradas.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">Nenhuma inscrição encontrada</div>
          ) : (
            <div className="space-y-1">
              {inscricoesFiltradas.map(i => (
                <div
                  key={i.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                    i.checked_in
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">
                      {i.atletas?.nome} {i.atletas?.sobrenome}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {i.categories?.nome || '—'} · {i.peso_inscricao ? `${i.peso_inscricao}kg` : 's/peso'}
                    </div>
                  </div>
                  {i.checked_in ? (
                    <>
                      <span className="text-xs text-emerald-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {i.checked_in_at && new Date(i.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleCheckin({ registration_id: i.id, revert: true })}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-red-300"
                        title="Desfazer credenciamento"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleCheckin({ registration_id: i.id })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Credenciar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
