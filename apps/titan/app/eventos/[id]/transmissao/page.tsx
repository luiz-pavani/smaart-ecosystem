'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, Tv, Users as UsersIcon, AlertCircle, Play } from 'lucide-react'

interface Stream {
  id: string
  area_id: number
  titulo: string | null
  tipo: string
  status: string
  viewers_count: number | null
  ppv_habilitado: boolean
  ppv_valor: number | null
  stream_url: string | null
  locked: boolean
}

interface Data {
  evento: { id: string; nome: string }
  streams: Stream[]
}

/**
 * Página pública de transmissão. Lista tatames com vídeo embedded;
 * streams PPV mostram paywall até pagamento ser confirmado.
 *
 * Suporta: youtube (embed iframe), rtmp/hls (placeholder mostra link
 * pra player externo — a UI completa de HLS exigiria player tipo Plyr/Video.js).
 *
 * Acesso autenticado é necessário pra desbloquear PPV. Sem login, paywall
 * aparece mas botão "Comprar acesso" redireciona pra /acesso.
 */
export default function TransmissaoPublicaPage() {
  const { id: eventoId } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${eventoId}/streams/public`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erro'); return }
      setData(json)
      if (json.streams.length > 0 && selected === null) {
        // Seleciona o primeiro stream que está online se houver
        const online = json.streams.find((s: Stream) => s.status === 'online' && !s.locked)
        setSelected(online?.area_id ?? json.streams[0].area_id)
      }
    } catch { setError('Erro de rede') }
  }, [eventoId, selected])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) setUser({ id: u.id })
    })
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  const selectedStream = useMemo(() => {
    if (!data || selected === null) return null
    return data.streams.find(s => s.area_id === selected) || null
  }, [data, selected])

  const buyAccess = async (stream: Stream) => {
    if (!user) {
      router.push(`/acesso?next=${encodeURIComponent(`/eventos/${eventoId}/transmissao`)}`)
      return
    }
    setPurchasingId(stream.id)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto: 'ppv',
          referencia_id: stream.id,
          metodo: 'pix',
        }),
      })
      const json = await res.json()
      if (res.ok && json.pix_qr_code_url) {
        // Pop-up rápido com QR — versão minimalista
        window.open(json.pix_qr_code_url, '_blank', 'noopener,noreferrer,width=480,height=720')
      } else {
        alert(json.error || 'Erro ao iniciar checkout')
      }
    } finally {
      setPurchasingId(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl text-white">{error}</h1>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (data.streams.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Tv className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h1 className="text-xl text-white">Transmissão não disponível</h1>
          <p className="text-slate-400 text-sm mt-2">Este evento ainda não configurou streams ao vivo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-cyan-900/30 to-slate-950 border-b border-white/10">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="w-6 h-6 text-cyan-400" />
          Transmissão ao vivo
        </h1>
        <p className="text-sm text-slate-400 mt-1">{data.evento.nome}</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tatame selector */}
        {data.streams.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {data.streams.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s.area_id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                  selected === s.area_id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <span className="font-bold">Tatame {s.area_id}</span>
                {s.locked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                {s.status === 'online' && !s.locked && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}

        {selectedStream && (
          <>
            {/* Locked paywall */}
            {selectedStream.locked ? (
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-700/5 border border-amber-500/30 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Acesso pago necessário</h2>
                <p className="text-amber-100/80 mb-6">
                  A transmissão do tatame {selectedStream.area_id}{selectedStream.titulo ? ` — ${selectedStream.titulo}` : ''} está disponível por:
                </p>
                <div className="text-4xl font-black text-amber-300 mb-6">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedStream.ppv_valor || 0)}
                </div>
                <button
                  onClick={() => buyAccess(selectedStream)}
                  disabled={purchasingId === selectedStream.id}
                  className="flex items-center gap-2 mx-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {purchasingId === selectedStream.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  {user ? 'Comprar acesso' : 'Fazer login pra comprar'}
                </button>
                <p className="text-xs text-amber-200/50 mt-4">
                  Pagamento via PIX. Acesso liberado em até 1 minuto após confirmação.
                </p>
              </div>
            ) : selectedStream.stream_url ? (
              <StreamPlayer stream={selectedStream} />
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <Tv className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h2 className="text-lg text-white">Stream offline</h2>
                <p className="text-slate-400 text-sm mt-1">
                  O tatame {selectedStream.area_id} ainda não iniciou a transmissão.
                </p>
              </div>
            )}

            {/* Viewer count */}
            {!selectedStream.locked && selectedStream.viewers_count !== null && (
              <div className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                {selectedStream.viewers_count} {selectedStream.viewers_count === 1 ? 'pessoa assistindo' : 'pessoas assistindo'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StreamPlayer({ stream }: { stream: Stream }) {
  // YouTube embed
  if (stream.tipo === 'youtube' && stream.stream_url) {
    // Aceita URL completa ou ID do vídeo
    const videoId = extractYouTubeId(stream.stream_url)
    if (!videoId) {
      return (
        <div className="aspect-video bg-black rounded-2xl flex items-center justify-center">
          <p className="text-slate-400 text-sm">URL de stream inválida.</p>
        </div>
      )
    }
    return (
      <div className="aspect-video bg-black rounded-2xl overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
          title={stream.titulo || `Tatame ${stream.area_id}`}
        />
      </div>
    )
  }

  // HLS / RTMP — placeholder por enquanto (player real exige Plyr/Video.js)
  if ((stream.tipo === 'hls' || stream.tipo === 'rtmp') && stream.stream_url) {
    return (
      <div className="aspect-video bg-black rounded-2xl flex flex-col items-center justify-center gap-3 p-6">
        <Tv className="w-10 h-10 text-slate-500" />
        <p className="text-slate-300 text-sm">Stream {stream.tipo.toUpperCase()} disponível</p>
        <a
          href={stream.stream_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-200 text-sm hover:bg-cyan-500/30"
        >
          Abrir no player externo
        </a>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black rounded-2xl flex items-center justify-center">
      <p className="text-slate-400 text-sm">Tipo de stream não suportado: {stream.tipo}</p>
    </div>
  )
}

/** Extrai o videoId de uma URL do YouTube ou aceita o ID direto. */
function extractYouTubeId(input: string): string | null {
  // Já é só o ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input

  try {
    const url = new URL(input)
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1) || null
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v')
      if (v) return v
      // /embed/ID ou /live/ID
      const match = url.pathname.match(/\/(embed|live|shorts)\/([a-zA-Z0-9_-]{11})/)
      if (match) return match[2]
    }
  } catch {
    // não é URL válida
  }
  return null
}
