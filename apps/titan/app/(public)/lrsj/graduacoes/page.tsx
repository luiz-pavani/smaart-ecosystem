'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, ArrowDownAZ, Layers, RefreshCw } from 'lucide-react'

interface Atleta {
  id: string
  nome: string
  academia: string | null
  kyu_dan_id: number
  cor_faixa: string | null
  kyu_dan: string | null
  ordem: number
  validade: string | null
  em_dia: boolean
}

type GroupBy = 'graduacao' | 'nome'

const BELT_BG: Record<string, string> = {
  'Branca': 'bg-zinc-100 text-zinc-900 border-zinc-300',
  'Branca e Cinza': 'bg-gradient-to-r from-zinc-100 to-zinc-400 text-zinc-900 border-zinc-300',
  'Cinza': 'bg-zinc-400 text-zinc-900 border-zinc-500',
  'Cinza e Azul': 'bg-gradient-to-r from-zinc-400 to-blue-500 text-white border-zinc-500',
  'Azul': 'bg-blue-600 text-white border-blue-700',
  'Azul e Amarela': 'bg-gradient-to-r from-blue-600 to-yellow-400 text-white border-blue-700',
  'Amarela': 'bg-yellow-400 text-zinc-900 border-yellow-600',
  'Amarela e Laranja': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 border-orange-500',
  'Laranja': 'bg-orange-500 text-white border-orange-600',
  'Verde': 'bg-green-600 text-white border-green-700',
  'Roxa': 'bg-purple-700 text-white border-purple-800',
  'Marrom': 'bg-amber-800 text-white border-amber-900',
  'Preta': 'bg-black text-white border-zinc-700',
  'Vermelha e Branca': 'bg-gradient-to-r from-red-600 to-white text-zinc-900 border-red-700',
  'Vermelha': 'bg-red-600 text-white border-red-700',
}

function beltClass(cor: string | null) {
  if (!cor) return 'bg-zinc-200 text-zinc-700 border-zinc-300'
  return BELT_BG[cor] || 'bg-zinc-200 text-zinc-700 border-zinc-300'
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function GraduacoesPublicasPage() {
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('graduacao')
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const reload = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const r = await fetch('/api/publico/lrsj/graduacoes', { cache: 'no-store' })
      const d = await r.json()
      setAtletas(d.atletas || [])
      setGeneratedAt(d.generated_at || null)
    } catch {
      // silent retry on next tick
    } finally {
      setLoading(false)
      if (showSpinner) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    reload()
    // Refetch quando a aba volta a ficar visível (terceiro reabre, dados frescos)
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    // Polling de fundo a cada 60s (barato; endpoint usa supabaseAdmin, sem cache)
    const interval = setInterval(() => reload(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [reload])

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return atletas
    return atletas.filter(
      (a) =>
        normalize(a.nome).includes(q) ||
        normalize(a.academia || '').includes(q) ||
        normalize(`${a.cor_faixa || ''} ${a.kyu_dan || ''}`).includes(q)
    )
  }, [atletas, search])

  const grouped = useMemo(() => {
    if (groupBy === 'nome') {
      return [
        {
          key: 'todos',
          label: 'Por nome (A → Z)',
          ordem: 0,
          cor: null as string | null,
          rows: [...filtered].sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR')
          ),
        },
      ]
    }
    const buckets = new Map<
      number,
      { key: string; label: string; ordem: number; cor: string | null; rows: Atleta[] }
    >()
    for (const a of filtered) {
      const key = a.kyu_dan_id
      if (!buckets.has(key)) {
        buckets.set(key, {
          key: String(key),
          label: `${a.cor_faixa ?? '—'}${a.kyu_dan ? ` · ${a.kyu_dan}` : ''}`,
          ordem: a.ordem,
          cor: a.cor_faixa,
          rows: [],
        })
      }
      buckets.get(key)!.rows.push(a)
    }
    return Array.from(buckets.values())
      .sort((a, b) => b.ordem - a.ordem) // graduações mais altas primeiro
      .map((g) => ({
        ...g,
        rows: g.rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }))
  }, [filtered, groupBy])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header oficial */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-600/15 border border-red-500/30 flex-shrink-0">
              <ShieldCheck className="w-7 h-7 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black tracking-widest uppercase text-red-400">
                Verificação Oficial · Graduações
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
                Liga Riograndense de Judô
              </h1>
              <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                A LRSJ é a entidade estadual de administração do Judô filiada à
                Liga Nacional de Judô (LNJ). Conforme a{' '}
                <strong className="text-white">Lei Geral do Esporte</strong>{' '}
                (Lei nº 14.597/2023), as graduações emitidas pela entidade aqui
                listadas têm <strong className="text-white">validade oficial em todo o
                Sistema Nacional do Desporto</strong>. Este é um registro público
                para verificação por terceiros.
              </p>
              {generatedAt && (
                <p className="text-[11px] text-slate-500 mt-3">
                  Atualizado em{' '}
                  {new Date(generatedAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, academia ou graduação…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
            />
          </div>
          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setGroupBy('graduacao')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition inline-flex items-center gap-1.5 ${
                groupBy === 'graduacao'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Por graduação
            </button>
            <button
              onClick={() => setGroupBy('nome')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition inline-flex items-center gap-1.5 ${
                groupBy === 'nome'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowDownAZ className="w-3.5 h-3.5" /> Por nome
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              {filtered.length} atletas filiados
              {search && ` para "${search}"`}
            </span>
            <button
              type="button"
              onClick={() => reload(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50"
              title="Forçar atualização"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          <span className="text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1 align-middle" />
            Em dia ·
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mx-1 align-middle" />
            Anuidade vencida
          </span>
        </div>

        {/* Listing */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">Carregando registro público…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-xl text-slate-400">
            Nenhum atleta encontrado.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.key} className="space-y-2">
                {groupBy === 'graduacao' && (
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${beltClass(group.cor)}`}
                    >
                      {group.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {group.rows.length}{' '}
                      {group.rows.length === 1 ? 'atleta' : 'atletas'}
                    </span>
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[40%]" />
                      {groupBy === 'nome' && <col className="w-[20%]" />}
                      <col className={groupBy === 'nome' ? 'w-[25%]' : 'w-[40%]'} />
                      <col className={groupBy === 'nome' ? 'w-[15%]' : 'w-[20%]'} />
                    </colgroup>
                    <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Nome</th>
                        {groupBy === 'nome' && (
                          <th className="text-left px-4 py-2 font-semibold">Graduação</th>
                        )}
                        <th className="text-left px-4 py-2 font-semibold">Academia</th>
                        <th className="text-left px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {group.rows.map((a) => (
                        <tr key={a.id} className="hover:bg-white/5 transition">
                          <td className="px-4 py-2 text-slate-100 truncate" title={a.nome}>
                            {a.nome}
                          </td>
                          {groupBy === 'nome' && (
                            <td className="px-4 py-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${beltClass(a.cor_faixa)}`}
                              >
                                {a.cor_faixa}
                                {a.kyu_dan ? ` · ${a.kyu_dan}` : ''}
                              </span>
                            </td>
                          )}
                          <td
                            className="px-4 py-2 text-slate-400 truncate"
                            title={a.academia || ''}
                          >
                            {a.academia || '—'}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                                a.em_dia
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  a.em_dia ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}
                              />
                              {a.em_dia ? 'Em dia' : 'Anuidade vencida'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-white/5 py-8 mt-12 text-center text-xs text-slate-500">
        <p>
          Liga Riograndense de Judô · Registro público de graduações ·{' '}
          <span className="text-slate-400">titan.smaartpro.com</span>
        </p>
      </footer>
    </div>
  )
}
