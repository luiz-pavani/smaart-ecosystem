'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, Building2 } from 'lucide-react'

interface SearchResult {
  registration_id: string
  nome: string
  peso_inscricao: number | null
  status: string
  academia: { id: string; nome: string; logo_url: string | null } | null
  categoria: { id: string; nome_display: string; genero: string } | null
}

interface Props {
  eventoId: string
  onSelectAtleta?: (result: SearchResult) => void
}

export default function AtletaSearch({ eventoId, onSelectAtleta }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Debounce search to 250ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/eventos/${eventoId}/atletas/search?q=${encodeURIComponent(query.trim())}`)
        const json = await res.json()
        if (res.ok) setResults(json.results || [])
        else setResults([])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [query, eventoId])

  // Close dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar atleta, academia ou categoria…"
          className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/40"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            aria-label="Limpar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Procurando…
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-slate-500 text-sm">
              Nenhum atleta encontrado para “{query}”.
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-1.5">
              {results.map((r) => (
                <li key={r.registration_id}>
                  <button
                    onClick={() => {
                      onSelectAtleta?.(r)
                      setOpen(false)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    {r.academia?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.academia.logo_url} alt="" className="w-9 h-9 rounded-full object-cover bg-white/5 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{r.nome}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {r.academia?.nome || '— sem academia'}
                        {r.categoria && (
                          <>
                            <span className="mx-1.5 text-slate-600">•</span>
                            <span>{r.categoria.nome_display}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {r.peso_inscricao && (
                      <span className="text-[11px] px-2 py-0.5 bg-white/5 text-slate-300 rounded font-mono">
                        {Number(r.peso_inscricao).toFixed(1)}kg
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
