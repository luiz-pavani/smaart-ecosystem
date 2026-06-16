'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, Calendar, MapPin, IdCard, Check, Clock } from 'lucide-react'

interface Inscricao {
  id: string
  status: string
  checked_in: boolean
  checked_in_at: string | null
  peso_inscricao: number | null
  checkin_token: string
  atletas: { nome: string; sobrenome: string } | null
  categories: { nome: string; peso_min: number | null; peso_max: number | null; genero: string | null; faixa_etaria: string | null } | null
  eventos: { nome: string; data_evento: string; local: string | null; hora_inicio: string | null } | null
}

export default function ComprovantePage() {
  const { id: eventoId, token } = useParams<{ id: string; token: string }>()
  const [loading, setLoading] = useState(true)
  const [insc, setInsc] = useState<Inscricao | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/eventos/${eventoId}/comprovante/${token}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Comprovante inválido')
        } else {
          setInsc(data.inscricao)
        }
      } catch {
        setError('Erro ao carregar comprovante')
      }
      setLoading(false)
    })()
    // Refresh status a cada 15s pra ver quando credenciar
    const i = setInterval(async () => {
      try {
        const res = await fetch(`/api/eventos/${eventoId}/comprovante/${token}`)
        const data = await res.json()
        if (res.ok) setInsc(data.inscricao)
      } catch {/* ignore */}
    }, 15000)
    return () => clearInterval(i)
  }, [eventoId, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error || !insc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-300 text-lg font-bold mb-2">Comprovante não encontrado</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    )
  }

  const isPaid = ['pago', 'confirmado', 'aprovado'].includes(insc.status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Banner status */}
        {insc.checked_in ? (
          <div className="mb-4 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-xl p-4 text-center">
            <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="text-emerald-300 text-xl font-bold">CREDENCIADO</div>
            {insc.checked_in_at && (
              <div className="text-emerald-200/70 text-xs mt-1">
                em {new Date(insc.checked_in_at).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        ) : isPaid ? (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <div className="text-amber-300 font-bold">Aguardando credenciamento</div>
            <div className="text-amber-200/70 text-xs mt-1">Apresente este QR na mesa do evento</div>
          </div>
        ) : (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <div className="text-red-300 font-bold">Pagamento pendente</div>
            <div className="text-red-200/70 text-xs mt-1">Status: {insc.status}</div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-xl p-6 shadow-xl">
          <div className="text-center mb-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Comprovante de Inscrição</div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{insc.eventos?.nome || 'Evento'}</h1>
          </div>

          {/* QR Code */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 flex items-center justify-center mb-4">
            <QRCodeSVG value={insc.checkin_token} size={220} level="M" />
          </div>

          <div className="text-center font-mono text-xs text-slate-500 mb-4 tracking-widest select-all">
            {insc.checkin_token}
          </div>

          {/* Info atleta */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 text-slate-700">
              <IdCard className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <div>
                <div className="font-semibold">{insc.atletas?.nome} {insc.atletas?.sobrenome}</div>
                <div className="text-xs text-slate-500">
                  {insc.categories?.nome || '—'}
                  {insc.peso_inscricao && ` · ${insc.peso_inscricao}kg`}
                </div>
              </div>
            </div>
            {insc.eventos?.data_evento && (
              <div className="flex items-start gap-2 text-slate-700">
                <Calendar className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div className="text-xs">
                  {new Date(insc.eventos.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}
                  {insc.eventos.hora_inicio && ` · ${insc.eventos.hora_inicio}`}
                </div>
              </div>
            )}
            {insc.eventos?.local && (
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div className="text-xs">{insc.eventos.local}</div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-4 text-slate-500 text-xs">
          🤖 Titan / SMAART PRO
        </div>
      </div>
    </div>
  )
}
