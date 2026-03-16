'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Users, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

interface CheckinEntry {
  id: string
  athlete_id: string
  nome_completo: string
  checked_in_at: string
}

export default function CheckinPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const supabase = createClient()

  const [className, setClassName] = useState('')
  const [checkins, setCheckins] = useState<CheckinEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date] = useState(() => new Date().toISOString().split('T')[0])
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    supabase.from('classes').select('name').eq('id', classId).maybeSingle().then(({ data }) => {
      if (data) setClassName((data as any).name)
    })
  }, [classId])

  const load = useCallback(async () => {
    const res = await fetch(`/api/aulas/${classId}/checkin?date=${date}`)
    if (res.ok) {
      const json = await res.json()
      setCheckins(json.checkins || [])
    }
    setLoading(false)
  }, [classId, date])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000) // refresh every 10s
    return () => clearInterval(interval)
  }, [load])

  const qrUrl = origin ? `${origin}/checkin/${classId}?date=${date}` : ''

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button
            onClick={() => router.push(`/portal/academia/aulas/${classId}`)}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Check-in por QR Code</h1>
          {className && <p className="text-gray-400 mt-1">{className} — <span className="capitalize">{dateLabel}</span></p>}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            {qrUrl ? (
              <QRCodeSVG value={qrUrl} size={280} level="M" />
            ) : (
              <div className="w-[280px] h-[280px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-4 text-center max-w-xs">
            Atletas matriculados escaneiam este QR para registrar presença
          </p>
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-500 break-all text-center max-w-xs">
            {qrUrl}
          </div>
        </div>

        {/* Live attendance list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              Presenças ({checkins.length})
            </h2>
            <button
              onClick={load}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : checkins.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-400">
              Nenhum check-in ainda hoje
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {checkins.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
                  <span className="text-green-400 font-bold text-sm w-6 text-right">{i + 1}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{c.nome_completo}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(c.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
