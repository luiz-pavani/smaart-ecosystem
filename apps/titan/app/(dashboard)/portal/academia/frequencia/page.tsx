'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Filter, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Row {
  atleta: string
  presencas: number
  faltas: number
  percentual: number
}

export default function FrequenciaAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [allRows, setAllRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [filterPercentual, setFilterPercentual] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: role } = await supabase
          .from('user_roles')
          .select('academia_id')
          .eq('user_id', user.id)
          .not('academia_id', 'is', null)
          .limit(1)
          .single()

        if (!role?.academia_id) return

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        const startDateStr = startDate.toISOString().split('T')[0]

        const { data } = await supabase
          .from('attendance_records')
          .select('athlete_id, status, attendance_date, athlete:atletas(nome)')
          .eq('academy_id', role.academia_id)
          .gte('attendance_date', startDateStr)

        const map = new Map<string, Row>()
        ;(data || []).forEach((record: any) => {
          const name = record.athlete?.nome || 'Sem nome'
          const current = map.get(name) || { atleta: name, presencas: 0, faltas: 0, percentual: 0 }
          if (record.status === 'PRESENT') current.presencas += 1
          if (record.status === 'ABSENT') current.faltas += 1
          map.set(name, current)
        })

        const computed = Array.from(map.values()).map((row) => {
          const total = row.presencas + row.faltas
          const percentual = total > 0 ? Math.round((row.presencas / total) * 100) : 0
          return { ...row, percentual }
        })

        setAllRows(computed)
        setRows(computed)
        setTotalCount(computed.length)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [supabase])

  // Filter client-side
  useEffect(() => {
    let filtered = allRows
    if (filterPercentual === 'high') {
      filtered = filtered.filter(r => r.percentual >= 80)
    } else if (filterPercentual === 'medium') {
      filtered = filtered.filter(r => r.percentual >= 50 && r.percentual < 80)
    } else if (filterPercentual === 'low') {
      filtered = filtered.filter(r => r.percentual < 50)
    }
    setRows(filtered)
  }, [filterPercentual, allRows])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Frequencia</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="flex gap-3 mb-8">
          <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-green-500">
            <option>Ultimos 30 dias</option>
          </select>
          <select
            value={filterPercentual}
            onChange={(e) => setFilterPercentual(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value="">Todos os atletas</option>
            <option value="high">Frequência alta (≥80%)</option>
            <option value="medium">Frequência média (50-79%)</option>
            <option value="low">Frequência baixa (&lt;50%)</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all ml-auto">
            <Download className="w-4 h-4" />
            Relatorio
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : totalCount === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum registro de frequência</h3>
              <p className="text-gray-400 mb-6">Comece registrando a presença dos seus atletas</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Atleta</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-white">Presencas</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-white">Faltas</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-white">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300">{row.atleta}</td>
                    <td className="px-6 py-4 text-center text-green-400 font-semibold">{row.presencas}</td>
                    <td className="px-6 py-4 text-center text-red-400 font-semibold">{row.faltas}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-white/10 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${row.percentual >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${row.percentual}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-300 text-sm font-semibold">{row.percentual}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
