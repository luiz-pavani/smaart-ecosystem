'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string }

interface Props {
  minAge: string
  maxAge: string
  minKyuDanId: string
  maxKyuDanId: string
  onChange: (field: 'min_age' | 'max_age' | 'min_kyu_dan_id' | 'max_kyu_dan_id', value: string) => void
}

export function CriteriosAulaSection({ minAge, maxAge, minKyuDanId, maxKyuDanId, onChange }: Props) {
  const [kyuDans, setKyuDans] = useState<KyuDan[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan').order('id').then(({ data }) => {
      setKyuDans(data || [])
    })
  }, [])

  return (
    <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Critérios de Matrícula</p>

      {/* Age range */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Faixa Etária</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={minAge}
              onChange={e => onChange('min_age', e.target.value)}
              placeholder="Mín"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">anos</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={maxAge}
              onChange={e => onChange('max_age', e.target.value)}
              placeholder="Máx"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">anos</span>
          </div>
        </div>
      </div>

      {/* Graduation range */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Graduação</label>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={minKyuDanId}
            onChange={e => onChange('min_kyu_dan_id', e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">Mín (qualquer)</option>
            {kyuDans.map(k => (
              <option key={k.id} value={k.id}>{k.cor_faixa} | {k.kyu_dan}</option>
            ))}
          </select>
          <select
            value={maxKyuDanId}
            onChange={e => onChange('max_kyu_dan_id', e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">Máx (qualquer)</option>
            {kyuDans.map(k => (
              <option key={k.id} value={k.id}>{k.cor_faixa} | {k.kyu_dan}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
