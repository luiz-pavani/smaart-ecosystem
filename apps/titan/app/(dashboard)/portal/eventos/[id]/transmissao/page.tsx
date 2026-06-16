'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Tv, Plus, Save, Trash2, Radio, Eye, ExternalLink, Youtube, Link2, Unlink, Wand2, Copy, Check } from 'lucide-react'

interface Stream {
  id: string
  area_id: number
  titulo: string
  tipo: string
  stream_url: string | null
  stream_key: string | null
  status: string
}

interface YtStatus {
  connected: boolean
  channel_id: string | null
  channel_title: string | null
  connected_at: string | null
}

export default function TransmissaoPage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [streams, setStreams] = useState<Stream[]>([])
  const [numAreas, setNumAreas] = useState(1)
  const [saving, setSaving] = useState<number | null>(null)
  const [ytStatus, setYtStatus] = useState<YtStatus | null>(null)
  const [ytBusyArea, setYtBusyArea] = useState<number | null>(null)
  const [ytFlash, setYtFlash] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Form per area
  const [forms, setForms] = useState<Record<number, { titulo: string; tipo: string; stream_url: string; stream_key: string }>>({})

  const load = useCallback(async () => {
    const [strRes, evtRes, ytRes] = await Promise.all([
      fetch(`/api/eventos/${eventoId}/streams`).then(r => r.json()),
      fetch(`/api/eventos/${eventoId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/eventos/${eventoId}/streams/youtube-status`).then(r => r.json()).catch(() => null),
    ])
    if (ytRes) setYtStatus(ytRes)
    const strs = strRes.streams || []
    setStreams(strs)
    const na = evtRes?.evento?.num_areas || 1
    setNumAreas(na)

    // Initialize forms
    const f: typeof forms = {}
    for (let a = 1; a <= na; a++) {
      const existing = strs.find((s: Stream) => s.area_id === a)
      f[a] = {
        titulo: existing?.titulo || `Tatame ${a}`,
        tipo: existing?.tipo || 'youtube',
        stream_url: existing?.stream_url || '',
        stream_key: existing?.stream_key || '',
      }
    }
    setForms(f)
    setLoading(false)
  }, [eventoId])

  useEffect(() => { load() }, [load])

  const handleSave = async (areaId: number) => {
    const form = forms[areaId]
    if (!form) return
    setSaving(areaId)
    await fetch(`/api/eventos/${eventoId}/streams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area_id: areaId, ...form }),
    })
    setSaving(null)
    load()
  }

  const handleToggleStatus = async (stream: Stream) => {
    const newStatus = stream.status === 'live' ? 'offline' : 'live'
    await fetch(`/api/eventos/${eventoId}/streams`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream_id: stream.id, status: newStatus }),
    })
    load()
  }

  const handleDelete = async (stream: Stream) => {
    if (!confirm('Remover stream?')) return
    await fetch(`/api/eventos/${eventoId}/streams`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream_id: stream.id }),
    })
    load()
  }

  const updateForm = (areaId: number, field: string, value: string) => {
    setForms(prev => ({ ...prev, [areaId]: { ...prev[areaId], [field]: value } }))
  }

  // Check flash messages from OAuth callback redirect
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('yt_connected') === '1') {
      setYtFlash('Canal YouTube conectado com sucesso ✓')
      url.searchParams.delete('yt_connected')
      window.history.replaceState({}, '', url.toString())
      setTimeout(() => setYtFlash(null), 5000)
    }
    const ytErr = url.searchParams.get('yt_error')
    if (ytErr) {
      setYtFlash(`Erro YouTube: ${ytErr}`)
      url.searchParams.delete('yt_error')
      window.history.replaceState({}, '', url.toString())
      setTimeout(() => setYtFlash(null), 8000)
    }
  }, [])

  const handleYtConnect = () => {
    window.location.href = `/api/youtube/oauth/start?evento_id=${eventoId}`
  }

  const handleYtDisconnect = async () => {
    if (!confirm('Desconectar o canal do YouTube deste evento? As transmissões já criadas permanecem no canal.')) return
    await fetch(`/api/eventos/${eventoId}/streams/youtube-disconnect`, { method: 'POST' })
    load()
  }

  const handleYtCreate = async (areaId: number) => {
    setYtBusyArea(areaId)
    try {
      const res = await fetch(`/api/eventos/${eventoId}/streams/youtube-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area_id: areaId, titulo: forms[areaId]?.titulo || `Tatame ${areaId}` }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao criar transmissão')
      } else {
        setYtFlash(`Transmissão criada — ${data.watch_url}`)
        setTimeout(() => setYtFlash(null), 8000)
      }
    } finally {
      setYtBusyArea(null)
      load()
    }
  }

  const copyText = (label: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button onClick={() => router.push(`/portal/eventos/${eventoId}`)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Tv className="w-7 h-7 text-red-400" />Titan TV — Transmissão
              </h1>
              <p className="text-slate-400 text-sm mt-1">Configure streams ao vivo por tatame</p>
            </div>
            <button
              onClick={() => window.open(`/eventos/${eventoId}/ao-vivo`, '_blank')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 border border-red-500/30 text-sm transition-all"
            >
              <Eye className="w-4 h-4" /> Abrir Titan TV ↗
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {ytFlash && (
          <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm">
            {ytFlash}
          </div>
        )}

        {/* YouTube channel connection card */}
        <div className="mb-6 bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Youtube className="w-6 h-6 text-red-400" />
              <div>
                <div className="text-sm font-semibold text-white">Canal do YouTube</div>
                {ytStatus?.connected ? (
                  <div className="text-xs text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-3 h-3" /> Conectado: {ytStatus.channel_title || ytStatus.channel_id}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Conecte um canal para criar transmissões automaticamente</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {ytStatus?.connected ? (
                <>
                  <button
                    onClick={handleYtConnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 border border-white/10 text-xs"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Trocar canal
                  </button>
                  <button
                    onClick={handleYtDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-300 rounded-lg hover:bg-red-500/20 border border-red-500/20 text-xs"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Desconectar
                  </button>
                </>
              ) : (
                <button
                  onClick={handleYtConnect}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                >
                  <Youtube className="w-4 h-4" /> Conectar canal YouTube
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: numAreas }, (_, i) => i + 1).map(areaId => {
              const stream = streams.find(s => s.area_id === areaId)
              const form = forms[areaId] || { titulo: '', tipo: 'youtube', stream_url: '', stream_key: '' }
              const isLive = stream?.status === 'live'

              return (
                <div key={areaId} className={`bg-white/5 border rounded-xl p-5 ${isLive ? 'border-red-500/40' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">Tatame {areaId}</span>
                      {isLive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                          <Radio className="w-3 h-3" /> AO VIVO
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {ytStatus?.connected && form.tipo === 'youtube' && (
                        <button
                          onClick={() => handleYtCreate(areaId)}
                          disabled={ytBusyArea === areaId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50"
                          title="Cria automaticamente a transmissão e o ingest RTMP no seu canal"
                        >
                          {ytBusyArea === areaId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                          Criar transmissão YouTube
                        </button>
                      )}
                      {stream && (
                        <>
                          <button onClick={() => handleToggleStatus(stream)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isLive ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                            {isLive ? 'Parar' : 'Iniciar Live'}
                          </button>
                          <button onClick={() => handleDelete(stream)} className="p-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20 text-red-400 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {stream?.tipo === 'youtube' && stream?.stream_key && (
                    <div className="mb-4 bg-black/40 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2 font-semibold">📡 Ingest RTMP — configure no OBS/encoder</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500 mb-1">Server URL</div>
                          <div className="flex gap-1">
                            <code className="flex-1 bg-black/50 px-2 py-1 rounded text-emerald-300 font-mono truncate">rtmp://a.rtmp.youtube.com/live2</code>
                            <button
                              onClick={() => copyText(`rtmp-${areaId}`, 'rtmp://a.rtmp.youtube.com/live2')}
                              className="px-2 bg-white/5 hover:bg-white/10 rounded text-slate-300"
                            >
                              {copied === `rtmp-${areaId}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">Stream Key</div>
                          <div className="flex gap-1">
                            <code className="flex-1 bg-black/50 px-2 py-1 rounded text-amber-300 font-mono truncate">{stream.stream_key}</code>
                            <button
                              onClick={() => copyText(`key-${areaId}`, stream.stream_key || '')}
                              className="px-2 bg-white/5 hover:bg-white/10 rounded text-slate-300"
                            >
                              {copied === `key-${areaId}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      {stream.stream_url && (
                        <a
                          href={stream.stream_url}
                          target="_blank"
                          rel="noopener"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir no YouTube
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Título</label>
                      <input
                        value={form.titulo}
                        onChange={e => updateForm(areaId, 'titulo', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                      <select
                        value={form.tipo}
                        onChange={e => updateForm(areaId, 'tipo', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      >
                        <option value="youtube">YouTube Live</option>
                        <option value="rtmp_custom">RTMP Custom</option>
                        <option value="iframe">Iframe / Embed</option>
                        <option value="webcam">Câmera do dispositivo (local)</option>
                      </select>
                    </div>
                    {form.tipo !== 'webcam' ? (
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-400 mb-1 block">
                          {form.tipo === 'youtube' ? 'URL do YouTube (ex: https://youtube.com/watch?v=xxx ou embed URL)' :
                           form.tipo === 'iframe' ? 'URL do iframe embed' : 'URL RTMP'}
                        </label>
                        <input
                          value={form.stream_url}
                          onChange={e => updateForm(areaId, 'stream_url', e.target.value)}
                          placeholder={form.tipo === 'youtube' ? 'https://www.youtube.com/embed/VIDEO_ID' : 'rtmp://...'}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                        />
                      </div>
                    ) : (
                      <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-xs text-blue-300">
                          📹 A câmera do dispositivo será usada diretamente neste computador.
                          Os espectadores verão apenas o placar em tempo real no Titan TV.
                          Para transmitir vídeo remotamente, use YouTube Live ou OBS + RTMP.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSave(areaId)}
                    disabled={saving === areaId}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 border border-blue-500/30 text-sm transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" /> {saving === areaId ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
