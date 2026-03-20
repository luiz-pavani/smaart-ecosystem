'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { ArrowLeft, Loader2, AlertTriangle, XCircle, HelpCircle, RefreshCw } from 'lucide-react'

interface Atleta {
  id: string
  nome_completo: string
  telefone: string | null
  status_plano: string | null
  data_expiracao: string | null
  graduacao: string | null
  cor_faixa: string | null
  dias: number | null
}

interface Data {
  vencendo: Atleta[]
  vencidas: Atleta[]
  sem_data: Atleta[]
  total: number
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function waLink(telefone: string, nome: string, msg: string) {
  const num = telefone.replace(/\D/g, '')
  const phone = num.startsWith('55') ? num : `55${num}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

const WA_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

function AtletaRow({ a, msgFn }: { a: Atleta; msgFn: (nome: string, dias: number | null, exp: string | null) => string }) {
  const firstName = a.nome_completo.split(' ')[0]
  const expFormatted = fmtDate(a.data_expiracao)

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{a.nome_completo}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {a.graduacao && (
            <span className="text-xs text-gray-500">{a.graduacao}</span>
          )}
          {expFormatted && (
            <span className="text-xs text-gray-400">
              {a.dias !== null && a.dias < 0
                ? `Venceu há ${Math.abs(a.dias)} dias (${expFormatted})`
                : a.dias !== null && a.dias === 0
                ? `Vence hoje (${expFormatted})`
                : a.dias !== null
                ? `Vence em ${a.dias} dias (${expFormatted})`
                : `Venceu em ${expFormatted}`}
            </span>
          )}
          {!expFormatted && (
            <span className="text-xs text-gray-600 italic">sem data registrada</span>
          )}
        </div>
      </div>
      {a.telefone ? (
        <a
          href={waLink(a.telefone, firstName, msgFn(firstName, a.dias, expFormatted))}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30
                     text-green-400 hover:bg-green-500/30 text-xs font-medium transition-colors"
        >
          {WA_ICON}
          Avisar
        </a>
      ) : (
        <span className="shrink-0 text-xs text-gray-700 px-3">sem telefone</span>
      )}
    </div>
  )
}

type Tab = 'vencendo' | 'vencidas' | 'sem_data'

export default function AnuidadesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('vencendo')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    const academiaId = await resolveAcademiaId(supabase)
    const params = academiaId ? `?academia_id=${academiaId}` : ''
    const res = await fetch(`/api/academia/anuidades${params}`)
    const json = await res.json()
    if (json.error) { setError(json.error) }
    else { setData(json) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const MSG_VENCENDO = (nome: string, dias: number | null, exp: string | null) =>
    `Olá, ${nome}! 👋\n\nSua anuidade na LRSJ vence${dias === 0 ? ' hoje' : dias === 1 ? ' amanhã' : ` em ${dias} dias`} (${exp}). Renove para manter sua filiação ativa! 🥋`

  const MSG_VENCIDA = (nome: string, _dias: number | null, exp: string | null) =>
    `Olá, ${nome}! 👋\n\nSua anuidade na LRSJ venceu${exp ? ` em ${exp}` : ''}. Regularize sua situação para continuar competindo e participando de eventos. 🥋`

  const MSG_SEM_DATA = (nome: string) =>
    `Olá, ${nome}! 👋\n\nNão encontramos data de vencimento da sua anuidade na LRSJ. Por favor, entre em contato para regularizar sua filiação. 🥋`

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    {
      key: 'vencendo',
      label: 'Vencendo em breve',
      icon: <AlertTriangle className="w-4 h-4" />,
      count: data?.vencendo.length ?? 0,
      color: 'text-amber-400 border-amber-400',
    },
    {
      key: 'vencidas',
      label: 'Vencidas',
      icon: <XCircle className="w-4 h-4" />,
      count: data?.vencidas.length ?? 0,
      color: 'text-red-400 border-red-400',
    },
    {
      key: 'sem_data',
      label: 'Sem data',
      icon: <HelpCircle className="w-4 h-4" />,
      count: data?.sem_data.length ?? 0,
      color: 'text-gray-400 border-gray-400',
    },
  ]

  const currentList = data
    ? (tab === 'vencendo' ? data.vencendo : tab === 'vencidas' ? data.vencidas : data.sem_data)
    : []

  const filtered = search.trim()
    ? currentList.filter(a => a.nome_completo.toLowerCase().includes(search.toLowerCase()))
    : currentList

  const msgFn: (nome: string, dias: number | null, exp: string | null) => string =
    tab === 'vencendo' ? MSG_VENCENDO
    : tab === 'vencidas' ? MSG_VENCIDA
    : (nome) => MSG_SEM_DATA(nome)

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
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10
                       text-slate-400 hover:text-white transition-all border border-white/10"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10
                       text-slate-300 hover:text-white transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300 text-sm">{error}</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{data.vencendo.length}</p>
              <p className="text-xs text-amber-300/70 mt-1">Vencendo em 30 dias</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{data.vencidas.length}</p>
              <p className="text-xs text-red-300/70 mt-1">Anuidades vencidas</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-400">{data.sem_data.length}</p>
              <p className="text-xs text-gray-500 mt-1">Sem data registrada</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? `bg-white/10 ${t.color}`
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? 'bg-white/10' : 'bg-white/5'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          {currentList.length > 5 && (
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-xs px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm
                         text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/20"
            />
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
              {tab === 'vencendo' && data.vencendo.length === 0 ? (
                <>
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-white font-semibold">Nenhuma anuidade vencendo nos próximos 30 dias</p>
                  <p className="text-gray-400 text-sm mt-1">Todos os atletas estão com a filiação em dia.</p>
                </>
              ) : search ? (
                <p className="text-gray-500 text-sm">Nenhum resultado para "{search}"</p>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum atleta nesta categoria</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(a => (
                <AtletaRow key={a.id} a={a} msgFn={msgFn} />
              ))}
              {filtered.length < currentList.length && (
                <p className="text-xs text-gray-600 text-center pt-1">
                  Mostrando {filtered.length} de {currentList.length}
                </p>
              )}
            </div>
          )}

          {/* Tip */}
          {tab !== 'sem_data' && filtered.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-xs text-gray-500">
              💡 O botão "Avisar" abre o WhatsApp com uma mensagem pré-preenchida. O envio é manual — você pode editar o texto antes de enviar.
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
