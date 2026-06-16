'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, RefreshCw, Filter } from 'lucide-react'

interface LogRow {
  id: number
  occurred_at: string
  severity: string
  source: string
  user_id: string | null
  evento_id: string | null
  url: string | null
  message: string
  stack: string | null
}

export default function ErrorLogPage() {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [severity, setSeverity] = useState<'all' | 'fatal' | 'error' | 'warn' | 'info'>('error')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    let q = sb.from('app_error_log')
      .select('id, occurred_at, severity, source, user_id, evento_id, url, message, stack')
      .order('occurred_at', { ascending: false })
      .limit(200)
    if (severity !== 'all') q = q.eq('severity', severity)
    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }, [severity])

  useEffect(() => { load() }, [load])

  const toggle = (id: number) => {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-7 h-7 text-amber-400" />
          <h1 className="text-2xl font-bold">Error Log</h1>
          <div className="flex-1" />
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10">
            <RefreshCw className="w-3.5 h-3.5" /> Recarregar
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['fatal', 'error', 'warn', 'info', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`px-3 py-1 rounded-lg text-xs ${
                severity === s
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >{s.toUpperCase()}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center text-slate-500 py-12">Sem erros registrados ✓</div>
        ) : (
          <div className="space-y-1">
            {rows.map(r => (
              <div key={r.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggle(r.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left"
                >
                  <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${
                    r.severity === 'fatal' ? 'bg-red-600 text-white' :
                    r.severity === 'error' ? 'bg-red-500/20 text-red-300' :
                    r.severity === 'warn' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-500/20 text-slate-300'
                  }`}>{r.severity}</span>
                  <span className="text-xs text-slate-500 font-mono w-32 flex-shrink-0">
                    {new Date(r.occurred_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}
                  </span>
                  <span className="text-xs text-slate-400 w-32 flex-shrink-0 truncate">{r.source}</span>
                  <span className="text-sm text-white flex-1 truncate">{r.message}</span>
                </button>
                {expanded.has(r.id) && (
                  <div className="px-3 py-2 bg-black/30 border-t border-white/10 text-xs space-y-1 font-mono">
                    {r.url && <div className="text-slate-400">URL: <span className="text-slate-200">{r.url}</span></div>}
                    {r.evento_id && <div className="text-slate-400">Evento: <span className="text-slate-200">{r.evento_id}</span></div>}
                    {r.user_id && <div className="text-slate-400">User: <span className="text-slate-200">{r.user_id}</span></div>}
                    {r.stack && (
                      <pre className="mt-2 text-slate-300 whitespace-pre-wrap text-[10px] leading-snug bg-black/40 p-2 rounded">{r.stack}</pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
