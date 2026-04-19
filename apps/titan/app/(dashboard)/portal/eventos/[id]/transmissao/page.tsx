'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Tv, Plus, Save, Trash2, Radio, Eye, ExternalLink } from 'lucide-react'

interface Stream {
  id: string
  area_id: number
  titulo: string
  tipo: string
  stream_url: string | null
  stream_key: string | null
  status: string
}

export default function TransmissaoPage() {
  const router = useRouter()
  const { id: eventoId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [streams, setStreams] = useState<Stream[]>([])
  const [numAreas, setNumAreas] = useState(1)
  const [saving, setSaving] = useState<number | null>(null)

  // Form per area
  const [forms, setForms] = useState<Record<number, { titulo: string; tipo: string; stream_url: string; stream_key: string }>>({})

  const load = useCallback(async () => {
    const [strRes, evtRes] = await Promise.all([
      fetch(`/api/eventos/${eventoId}/streams`).then(r => r.json()),
      fetch(`/api/eventos/${eventoId}`).then(r => r.json()).catch(() => null),
    ])
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
