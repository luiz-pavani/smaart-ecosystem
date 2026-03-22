'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, User, ShieldCheck, ShieldX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  'Branca': '#ffffff', 'Cinza': '#9ca3af', 'Amarela': '#facc15',
  'Laranja': '#f97316', 'Verde': '#22c55e', 'Azul': '#3b82f6',
  'Roxa': '#a855f7', 'Marrom': '#92400e', 'Preta': '#111827',
  'Vermelha': '#ef4444', 'Coral': '#fb7185',
}

export default function CarteiraPub() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [atleta, setAtleta] = useState<AtletaPerfil | null>(null)
  const [kyuDan, setKyuDan] = useState<KyuDan | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: fedData }, { data: kdData }] = await Promise.all([
        supabase.from('user_fed_lrsj').select('*').eq('stakeholder_id', id).maybeSingle(),
        supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
      ])

      if (!fedData) { setNotFound(true); setLoading(false); return }

      setAtleta(fedData as AtletaPerfil)
      const kd = (kdData || []).find((k: KyuDan) => k.id === fedData.kyu_dan_id)
      setKyuDan(kd || null)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )

  if (notFound || !atleta) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center">
        <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Atleta não encontrado</h1>
        <p className="text-gray-400 text-sm">Este QR code não corresponde a um filiado ativo.</p>
      </div>
    </div>
  )

  const beltColor = kyuDan ? (BELT_COLORS[kyuDan.cor_faixa] || '#6b7280') : '#6b7280'
  const statusOk = atleta.status_membro === 'Aceito' && atleta.status_plano === 'Válido'

  const expLabel = atleta.data_expiracao
    ? new Date(atleta.data_expiracao + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        {/* Verification banner */}
        <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl ${
          statusOk
            ? 'bg-green-500/20 border border-green-500/30'
            : 'bg-red-500/20 border border-red-500/30'
        }`}>
          {statusOk
            ? <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
            : <ShieldX className="w-6 h-6 text-red-400 shrink-0" />
          }
          <div>
            <p className={`font-semibold text-sm ${statusOk ? 'text-green-300' : 'text-red-300'}`}>
              {statusOk ? 'Filiação válida' : 'Filiação irregular'}
            </p>
            <p className="text-xs text-gray-400">
              {statusOk
                ? 'Atleta ativo na LRSJ'
                : `${atleta.status_membro || '—'} · Plano ${atleta.status_plano || '—'}`}
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: beltColor }} />

          <div className="relative p-7">
            <div className="flex gap-5 items-start">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2"
                style={{ borderColor: beltColor + '60' }}
              >
                {atleta.url_foto ? (
                  <img src={atleta.url_foto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <User className="w-9 h-9 text-gray-600" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white leading-tight">{atleta.nome_completo || '—'}</h1>
                {atleta.nome_patch && (
                  <p className="text-gray-400 text-xs mt-0.5">"{atleta.nome_patch}"</p>
                )}
                <div className="mt-2 space-y-1">
                  {kyuDan && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ background: beltColor }} />
                      <span className="text-xs font-medium" style={{ color: beltColor }}>
                        {kyuDan.cor_faixa}
                      </span>
                      <span className="text-gray-500 text-xs">·</span>
                      <span className="text-gray-400 text-xs">{kyuDan.kyu_dan}</span>
                    </div>
                  )}
                  {atleta.academias && (
                    <p className="text-gray-400 text-xs">🥋 {atleta.academias}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">LRSJ · Filiação</p>
                {expLabel && (
                  <p className="text-xs text-gray-500 mt-0.5">Válido até {expLabel}</p>
                )}
              </div>
              <p className="text-xs font-mono text-gray-600">{id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600">
          Verificação de identidade LRSJ · {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}
