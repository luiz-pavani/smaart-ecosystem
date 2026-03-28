'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, User, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

interface AtletaPerfil {
  stakeholder_id: string
  nome_completo: string | null
  nome_patch: string | null
  academias: string | null
  status_plano: string | null
  status_membro: string | null
  data_expiracao: string | null
  url_foto: string | null
  kyu_dan_id: number | null
}

interface KyuDan {
  id: number
  cor_faixa: string
  kyu_dan: string
  icones?: string
}

const BELT_COLORS: Record<string, string> = {
  'Branca':    '#ffffff',
  'Cinza':     '#9ca3af',
  'Amarela':   '#facc15',
  'Laranja':   '#f97316',
  'Verde':     '#22c55e',
  'Azul':      '#3b82f6',
  'Roxa':      '#a855f7',
  'Marrom':    '#92400e',
  'Preta':     '#111827',
  'Vermelha':  '#ef4444',
  'Coral':     '#fb7185',
}

export default function CarteiraPage() {
  const router = useRouter()
  const supabase = createClient()
  const [atleta, setAtleta] = useState<AtletaPerfil | null>(null)
  const [kyuDan, setKyuDan] = useState<KyuDan | null>(null)
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: fedData }, { data: kdData }] = await Promise.all([
        supabase.from('user_fed_lrsj').select('*').eq('stakeholder_id', user.id).maybeSingle(),
        supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
      ])

      if (fedData) {
        setAtleta(fedData as AtletaPerfil)
        const kd = (kdData || []).find((k: KyuDan) => k.id === fedData.kyu_dan_id)
        setKyuDan(kd || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const beltColor = kyuDan ? (BELT_COLORS[kyuDan.cor_faixa] || '#6b7280') : '#6b7280'
  const beltIsDark = ['Preta', 'Marrom'].includes(kyuDan?.cor_faixa || '')

  const statusOk = atleta?.status_membro === 'Aceito' && atleta?.status_plano === 'Válido'
  const statusLabel = !atleta ? '—'
    : atleta.status_membro !== 'Aceito' ? atleta.status_membro || 'Pendente'
    : atleta.status_plano === 'Válido' ? 'Ativo'
    : atleta.status_plano || 'Inativo'

  const qrValue = atleta && origin
    ? `${origin}/carteira/${atleta.stakeholder_id}`
    : ''

  const expLabel = atleta?.data_expiracao
    ? new Date(atleta.data_expiracao + 'T12:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-lg mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Minha Carteirinha</h1>
          <p className="text-gray-400 mt-1">Apresente o QR ao professor para registrar presença</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : !atleta ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Perfil de filiação não encontrado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Card */}
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
            >
              {/* Belt accent stripe */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: beltColor }}
              />

              {/* Watermark */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
                <p className="text-[120px] font-black text-white leading-none">LRSJ</p>
              </div>

              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Liga Riograndense de Judô</p>
                    <p className="text-xs text-gray-600 mt-0.5">Carteira de Filiação</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      statusOk
                        ? 'bg-green-500/20 text-green-300 border-green-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}
                  >
                    {statusLabel}
                  </div>
                </div>

                {/* Main content */}
                <div className="flex gap-6 items-start">
                  {/* Photo */}
                  <div
                    className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border-2"
                    style={{ borderColor: beltColor + '60' }}
                  >
                    {atleta.url_foto ? (
                      <img src={atleta.url_foto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white leading-tight">{atleta.nome_completo || '—'}</h2>
                    {atleta.nome_patch && (
                      <p className="text-gray-400 text-sm mt-0.5">"{atleta.nome_patch}"</p>
                    )}
                    <div className="mt-3 space-y-1">
                      {kyuDan && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ background: beltColor }}
                          />
                          <span className="text-sm font-medium" style={{ color: beltColor }}>
                            {kyuDan.cor_faixa}
                          </span>
                          <span className="text-gray-500 text-xs">·</span>
                          <span className="text-gray-400 text-xs">{kyuDan.kyu_dan}</span>
                        </div>
                      )}
                      {atleta.academias && (
                        <p className="text-gray-400 text-xs">🥋 {atleta.academias}</p>
                      )}
                      {expLabel && (
                        <p className="text-gray-500 text-xs">Válido até {expLabel}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR + ID */}
                <div className="mt-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">ID</p>
                    <p className="text-xs font-mono text-gray-500 break-all">{atleta.stakeholder_id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-lg">
                    {qrValue ? (
                      <QRCodeSVG value={qrValue} size={100} level="M" />
                    ) : (
                      <div className="w-[100px] h-[100px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
              <p className="text-sm font-semibold text-white">Como usar</p>
              <ul className="text-sm text-gray-400 space-y-1.5">
                <li className="flex gap-2"><span className="text-blue-400 shrink-0">1.</span>Abra esta tela ao chegar na academia</li>
                <li className="flex gap-2"><span className="text-blue-400 shrink-0">2.</span>Mostre o QR code ao professor ou responsável</li>
                <li className="flex gap-2"><span className="text-blue-400 shrink-0">3.</span>Sua presença será registrada automaticamente</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
