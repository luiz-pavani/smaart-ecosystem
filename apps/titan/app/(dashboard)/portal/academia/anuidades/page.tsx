'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId, saveSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { ArrowLeft, Loader2, AlertTriangle, XCircle, HelpCircle, RefreshCw, CheckCircle2, Users, ArrowRight, Building2 } from 'lucide-react'

interface Atleta {
  id: string
  nome_completo: string
  telefone: string | null
  status_plano: string | null
  data_expiracao: string | null
  graduacao: string | null
  cor_faixa: string | null
  dias: number | null
  _grupo?: string
}

interface Data {
  vencendo: Atleta[]
  vencidas: Atleta[]
  sem_data: Atleta[]
  todos: Atleta[]
  total: number
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function waLink(telefone: string, msg: string) {
  const num = telefone.replace(/\D/g, '')
  const phone = num.startsWith('55') ? num : `55${num}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

const WA_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

function grupoBadge(grupo: string | undefined) {
  if (grupo === 'valido') return <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">Válido</span>
  if (grupo === 'vencendo') return <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">Vencendo</span>
  if (grupo === 'vencida') return <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">Vencido</span>
  return <span className="text-[10px] text-slate-400 bg-slate-400/10 border border-slate-400/20 px-2 py-0.5 rounded-full">Sem data</span>
}

function AtletaRow({
  a, msgFn, onRenovar,
}: {
  a: Atleta
  msgFn: (nome: string, dias: number | null, exp: string | null) => string
  onRenovar?: (id: string) => void
}) {
  const firstName = a.nome_completo.split(' ')[0]
  const expFormatted = fmtDate(a.data_expiracao)
  const needsRenovation = a._grupo === 'vencida' || a._grupo === 'vencendo' || a._grupo === 'sem_data' || !a._grupo

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium text-sm truncate">{a.nome_completo}</p>
          {a._grupo && grupoBadge(a._grupo)}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {a.graduacao && <span className="text-xs text-gray-500">{a.graduacao}</span>}
          {expFormatted && (
            <span className="text-xs text-gray-400">
              {a.dias !== null && a.dias < 0
                ? `Venceu há ${Math.abs(a.dias)} dias (${expFormatted})`
                : a.dias !== null && a.dias === 0
                ? `Vence hoje (${expFormatted})`
                : a.dias !== null && a.dias <= 30
                ? `Vence em ${a.dias} dias (${expFormatted})`
                : `Vence em ${expFormatted}`}
            </span>
          )}
          {!expFormatted && <span className="text-xs text-gray-600 italic">sem data registrada</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {needsRenovation && onRenovar && (
          <button
            onClick={() => onRenovar(a.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-xs font-medium transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Renovar
          </button>
        )}
        {a.telefone ? (
          <a
            href={waLink(a.telefone, msgFn(firstName, a.dias, expFormatted))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors"
          >
            {WA_ICON}
            Avisar
          </a>
        ) : (
          <span className="text-xs text-gray-700 px-2">sem tel.</span>
        )}
      </div>
    </div>
  )
}

type Tab = 'vencendo' | 'vencidas' | 'sem_data' | 'todos'

export default function AnuidadesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('todos')
  const [search, setSearch] = useState('')
  const [academias, setAcademias] = useState<{ id: string; nome: string }[]>([])
  const [selectedAcademiaId, setSelectedAcademiaId] = useState<string | null>(null)

  const load = async (overrideId?: string) => {
    setLoading(true)
    setError(null)
    let academiaId = overrideId || await resolveAcademiaId(supabase)

    // master_access sem academia: buscar lista de academias para seletor
    if (!academiaId) {
      const res = await fetch('/api/academia/list')
      const json = await res.json()
      if (json.academias?.length) {
        setAcademias(json.academias)
        academiaId = json.academias[0].id
        setSelectedAcademiaId(academiaId)
        saveSelectedAcademiaId(academiaId!)
      }
    }

    const params = academiaId ? `?academia_id=${academiaId}` : ''
    const res = await fetch(`/api/academia/anuidades${params}`)
    const json = await res.json()
    if (json.error) setError(json.error)
    else setData(json)
    setLoading(false)
  }

  const handleAcademiaChange = (id: string) => {
    setSelectedAcademiaId(id)
    saveSelectedAcademiaId(id)
    load(id)
  }

  useEffect(() => { load() }, [])

  const MSG_VENCENDO = (nome: string, dias: number | null, exp: string | null) =>
    `Olá, ${nome}! 👋\n\nSua anuidade na LRSJ vence${dias === 0 ? ' hoje' : dias === 1 ? ' amanhã' : ` em ${dias} dias`} (${exp}). Renove para manter sua filiação ativa! 🥋`

  const MSG_VENCIDA = (nome: string, _dias: number | null, exp: string | null) =>
    `Olá, ${nome}! 👋\n\nSua anuidade na LRSJ venceu${exp ? ` em ${exp}` : ''}. Regularize sua situação para continuar competindo e participando de eventos. 🥋`

  const MSG_SEM_DATA = (nome: string) =>
    `Olá, ${nome}! 👋\n\nNão encontramos data de vencimento da sua anuidade na LRSJ. Por favor, entre em contato para regularizar sua filiação. 🥋`

  const MSG_VALIDO = (nome: string, _dias: number | null, exp: string | null) =>
    `Olá, ${nome}! 👋\n\nSua anuidade na LRSJ está válida${exp ? ` até ${exp}` : ''}. 🥋`

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: 'todos',    label: 'Todos',            icon: <Users className="w-4 h-4" />,         count: data?.total ?? 0,           color: 'text-white border-white' },
    { key: 'vencendo', label: 'Vencendo em breve', icon: <AlertTriangle className="w-4 h-4" />, count: data?.vencendo.length ?? 0, color: 'text-amber-400 border-amber-400' },
    { key: 'vencidas', label: 'Vencidas',          icon: <XCircle className="w-4 h-4" />,       count: data?.vencidas.length ?? 0, color: 'text-red-400 border-red-400' },
    { key: 'sem_data', label: 'Sem data',          icon: <HelpCircle className="w-4 h-4" />,    count: data?.sem_data.length ?? 0, color: 'text-gray-400 border-gray-400' },
  ]

  const currentList = data
    ? tab === 'vencendo' ? data.vencendo
    : tab === 'vencidas' ? data.vencidas
    : tab === 'sem_data' ? data.sem_data
    : data.todos
    : []

  const filtered = search.trim()
    ? currentList.filter(a => a.nome_completo.toLowerCase().includes(search.toLowerCase()))
    : currentList

  const msgFn = (nome: string, dias: number | null, exp: string | null) => {
    if (tab === 'vencendo') return MSG_VENCENDO(nome, dias, exp)
    if (tab === 'vencidas') return MSG_VENCIDA(nome, dias, exp)
    if (tab === 'sem_data') return MSG_SEM_DATA(nome)
    // todos — derive from _grupo
    return MSG_VALIDO(nome, dias, exp)
  }

  const handleRenovar = (id: string) => {
    router.push(`/portal/academia/filiacoes?renovar=${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Anuidades da Federação</h1>
          <p className="text-slate-400">Controle de filiações e vencimentos na LRSJ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(selectedAcademiaId ?? undefined)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>

      {/* Seletor de academia (master_access) */}
      {academias.length > 1 && (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAcademiaId ?? ''}
            onChange={e => handleAcademiaChange(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
          >
            {academias.map(a => (
              <option key={a.id} value={a.id} className="bg-slate-900">{a.nome}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{data.total}</p>
              <p className="text-xs text-gray-400 mt-1">Total de atletas</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">
                {data.todos.filter(a => a._grupo === 'valido').length}
              </p>
              <p className="text-xs text-green-300/70 mt-1">Filiação válida</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{data.vencendo.length}</p>
              <p className="text-xs text-amber-300/70 mt-1">Vencendo em 30 dias</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{data.vencidas.length}</p>
              <p className="text-xs text-red-300/70 mt-1">Anuidades vencidas</p>
            </div>
          </div>

          {/* Atalho para filiações em lote */}
          {(data.vencidas.length > 0 || data.vencendo.length > 0) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-blue-300 font-semibold text-sm">
                  {data.vencidas.length + data.vencendo.length} atleta{data.vencidas.length + data.vencendo.length !== 1 ? 's' : ''} precisam renovar
                </p>
                <p className="text-blue-300/60 text-xs mt-0.5">Renove múltiplos de uma vez na página de Filiação em Grupo.</p>
              </div>
              <button
                onClick={() => router.push('/portal/academia/filiacoes')}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Filiação em Grupo
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit flex-wrap">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key ? `bg-white/10 ${t.color}` : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/10' : 'bg-white/5'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-xs px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/20"
          />

          {/* List */}
          {filtered.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
              {tab === 'vencendo' && data.vencendo.length === 0 ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">Nenhuma anuidade vencendo nos próximos 30 dias</p>
                  <p className="text-gray-400 text-sm mt-1">Todos os atletas estão com a filiação em dia.</p>
                </>
              ) : search ? (
                <p className="text-gray-500 text-sm">Nenhum resultado para &quot;{search}&quot;</p>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum atleta nesta categoria</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(a => (
                <AtletaRow
                  key={a.id}
                  a={a}
                  msgFn={(nome, dias, exp) => {
                    const g = a._grupo
                    if (g === 'vencendo') return MSG_VENCENDO(nome, dias, exp)
                    if (g === 'vencida') return MSG_VENCIDA(nome, dias, exp)
                    if (g === 'sem_data') return MSG_SEM_DATA(nome)
                    return MSG_VALIDO(nome, dias, exp)
                  }}
                  onRenovar={handleRenovar}
                />
              ))}
              {filtered.length < currentList.length && (
                <p className="text-xs text-gray-600 text-center pt-1">
                  Mostrando {filtered.length} de {currentList.length}
                </p>
              )}
            </div>
          )}

          {/* Tip */}
          {filtered.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-xs text-gray-500">
              💡 O botão &quot;Avisar&quot; abre o WhatsApp com mensagem pré-preenchida. O botão &quot;Renovar&quot; abre a filiação em grupo com o atleta pré-selecionado.
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
