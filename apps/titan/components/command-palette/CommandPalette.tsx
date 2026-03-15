'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Building2, Calendar, Trophy, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  type: 'atleta' | 'academia' | 'aula' | 'evento'
  title: string
  subtitle?: string
  href: string
  icon: typeof Users
}

export function CommandPalette() {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Detect user role
  useEffect(() => {
    async function detectRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('stakeholders')
        .select('academia_id, role')
        .eq('id', user.id)
        .limit(1)
        .single()

      if (perfil?.academia_id) setUserRole('academia')
      else if (perfil?.role === 'master_access') setUserRole('federacao')
      else setUserRole('atleta')
    }
    detectRole()
  }, [supabase])

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('stakeholders')
        .select('academia_id, role')
        .eq('id', user.id)
        .limit(1)
        .single()

      if (!perfil) return

      const isMaster = perfil.role === 'master_access'
      const academiaId = perfil.academia_id

      const searchResults: SearchResult[] = []

      // Search Atletas
      let atletasQuery = supabase
        .from('user_fed_lrsj')
        .select('stakeholder_id, nome_completo, academia_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan)')
        .ilike('nome_completo', `%${searchQuery}%`)
        .eq('federacao_id', 1)
        .limit(5)

      if (academiaId && !isMaster) {
        atletasQuery = atletasQuery.eq('academia_id', academiaId)
      }

      const { data: atletas } = await atletasQuery

      atletas?.forEach((a: any) => {
        const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
        searchResults.push({
          id: a.stakeholder_id,
          type: 'atleta',
          title: a.nome_completo,
          subtitle: kd ? `${kd.cor_faixa} | ${kd.kyu_dan}` : 'Sem graduação',
          href: `/portal/federacao/atletas/${a.stakeholder_id}`,
          icon: Users
        })
      })

      // Search Academias (if master)
      if (isMaster) {
        const { data: academias } = await supabase
          .from('academias')
          .select('id, nome, endereco_cidade, endereco_estado')
          .ilike('nome', `%${searchQuery}%`)
          .limit(5)

        academias?.forEach((a: any) => {
          searchResults.push({
            id: a.id,
            type: 'academia',
            title: a.nome,
            subtitle: `${a.endereco_cidade || ''}, ${a.endereco_estado || ''}`,
            href: `/portal/federacao/academias`,
            icon: Building2
          })
        })
      }

      // Search Aulas (if academia)
      if (academiaId) {
        const { data: aulas } = await supabase
          .from('classes')
          .select('id, name, location')
          .eq('academy_id', academiaId)
          .ilike('name', `%${searchQuery}%`)
          .limit(5)

        aulas?.forEach((a: any) => {
          searchResults.push({
            id: a.id,
            type: 'aula',
            title: a.name,
            subtitle: a.location || 'Local não definido',
            href: `/portal/academia/aulas`,
            icon: Calendar
          })
        })
      }

      setResults(searchResults)
      setSelectedIndex(0)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        router.push(results[selectedIndex].href)
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, router])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar atletas, academias, aulas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-lg"
            autoFocus
          />
          {loading && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          <kbd className="hidden sm:block px-2 py-1 text-xs text-slate-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && query.trim() !== '' && !loading && (
            <div className="px-4 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400">Nenhum resultado encontrado</p>
              <p className="text-sm text-slate-500 mt-1">Tente buscar por outro termo</p>
            </div>
          )}

          {results.length === 0 && query.trim() === '' && (
            <div className="px-4 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400">Digite para buscar</p>
              <p className="text-sm text-slate-500 mt-1">
                Atletas, academias, aulas e mais
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => {
                const Icon = result.icon
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      router.push(result.href)
                      setIsOpen(false)
                      setQuery('')
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-500/20 border-l-2 border-blue-500'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      result.type === 'atleta' ? 'bg-green-500/20' :
                      result.type === 'academia' ? 'bg-blue-500/20' :
                      result.type === 'aula' ? 'bg-purple-500/20' :
                      'bg-yellow-500/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        result.type === 'atleta' ? 'text-green-400' :
                        result.type === 'academia' ? 'text-blue-400' :
                        result.type === 'aula' ? 'text-purple-400' :
                        'text-yellow-400'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-slate-400">{result.subtitle}</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded">↓</kbd>
              <span>Navegar</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/10 rounded">↵</kbd>
              <span>Abrir</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {results.length > 0 && `${results.length} resultado${results.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
    </div>
  )
}
