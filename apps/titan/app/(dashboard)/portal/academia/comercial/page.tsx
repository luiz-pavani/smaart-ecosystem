'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Pencil, Trash2, Tag, CreditCard, Settings,
  DollarSign, Percent, ToggleLeft, ToggleRight, Star, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle, Copy, Package, Ticket, Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId, getSelectedAcademiaId, saveSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Plano {
  id: string
  academia_id: string
  nome: string
  descricao: string | null
  valor: number
  valor_original: number | null
  periodicidade: string
  duracao_meses: number | null
  max_aulas_semana: number | null
  beneficios: string[]
  ativo: boolean
  destaque: boolean
  ordem: number
  safe2pay_plan_id: string | null
  created_at: string
}

interface Cupom {
  id: string
  academia_id: string
  codigo: string
  descricao: string | null
  tipo_desconto: 'percentual' | 'fixo'
  valor_desconto: number
  valor_minimo: number | null
  plano_ids: string[] | null
  uso_maximo: number | null
  uso_atual: number
  validade_inicio: string | null
  validade_fim: string | null
  ativo: boolean
  created_at: string
}

interface PayConfig {
  id: string
  nome: string
  safe2pay_api_key: string | null
  safe2pay_api_secret: string | null
  safe2pay_webhook_url: string | null
  pagamento_habilitado: boolean
  has_api_key: boolean
  has_api_secret: boolean
}

type Tab = 'planos' | 'cupons' | 'config'

const PERIODICIDADES = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'avulso', label: 'Avulso (pgto único)' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function ComercialPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('planos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Master access
  const [isMaster, setIsMaster] = useState(false)
  const [academias, setAcademias] = useState<{ id: string; nome: string }[]>([])
  const [selectedAcademiaId, setSelectedAcademiaId] = useState<string | null>(null)

  // Data
  const [planos, setPlanos] = useState<Plano[]>([])
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [config, setConfig] = useState<PayConfig | null>(null)

  // Edit modals
  const [editPlano, setEditPlano] = useState<Partial<Plano> | null>(null)
  const [editCupom, setEditCupom] = useState<Partial<Cupom> | null>(null)
  const [editConfig, setEditConfig] = useState<{
    safe2pay_api_key: string
    safe2pay_api_secret: string
    safe2pay_webhook_url: string
    pagamento_habilitado: boolean
  } | null>(null)

  // ─── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/acesso'); return }

      const { data: perfil } = await supabase
        .from('stakeholders')
        .select('role, academia_id')
        .eq('id', user.id)
        .maybeSingle()

      const master = perfil?.role === 'master_access'
      setIsMaster(master)

      if (master) {
        const res = await fetch('/api/academia/list')
        const json = await res.json()
        setAcademias(json.academias || [])
        const saved = getSelectedAcademiaId()
        if (saved) setSelectedAcademiaId(saved)
      } else if (perfil?.academia_id) {
        setSelectedAcademiaId(perfil.academia_id)
      }
    }
    init()
  }, [router])

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async (acadId?: string) => {
    const id = acadId || selectedAcademiaId
    if (!id) { setLoading(false); return }

    setLoading(true)
    const qs = `academia_id=${id}`

    const [pRes, cRes, cfRes] = await Promise.all([
      fetch(`/api/academia/comercial/planos?${qs}`),
      fetch(`/api/academia/comercial/cupons?${qs}`),
      fetch(`/api/academia/comercial/config?${qs}`),
    ])

    const [pJson, cJson, cfJson] = await Promise.all([pRes.json(), cRes.json(), cfRes.json()])

    setPlanos(pJson.planos || [])
    setCupons(cJson.cupons || [])
    setConfig(cfJson.config || null)
    setLoading(false)
  }, [selectedAcademiaId])

  useEffect(() => {
    if (selectedAcademiaId) loadData(selectedAcademiaId)
  }, [selectedAcademiaId, loadData])

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  function handleSelectAcademia(id: string) {
    setSelectedAcademiaId(id)
    saveSelectedAcademiaId(id)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // ─── Plano CRUD ─────────────────────────────────────────────────────────────

  async function savePlano() {
    if (!editPlano || !editPlano.nome || editPlano.valor == null) return
    setSaving(true)

    const isNew = !editPlano.id
    const method = isNew ? 'POST' : 'PUT'
    const body = { ...editPlano, academia_id: selectedAcademiaId }

    const res = await fetch('/api/academia/comercial/planos', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()

    if (!res.ok) { flash('err', json.error || 'Erro'); setSaving(false); return }

    flash('ok', isNew ? 'Plano criado!' : 'Plano atualizado!')
    setEditPlano(null)
    setSaving(false)
    loadData()
  }

  async function deletePlano(id: string) {
    if (!confirm('Excluir este plano permanentemente?')) return
    const res = await fetch(`/api/academia/comercial/planos?id=${id}`, { method: 'DELETE' })
    if (res.ok) { flash('ok', 'Plano excluído'); loadData() }
    else flash('err', 'Erro ao excluir')
  }

  async function togglePlanoAtivo(plano: Plano) {
    await fetch('/api/academia/comercial/planos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plano.id, ativo: !plano.ativo }),
    })
    loadData()
  }

  async function togglePlanoDestaque(plano: Plano) {
    await fetch('/api/academia/comercial/planos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plano.id, destaque: !plano.destaque }),
    })
    loadData()
  }

  // ─── Cupom CRUD ─────────────────────────────────────────────────────────────

  async function saveCupom() {
    if (!editCupom || !editCupom.codigo || editCupom.valor_desconto == null) return
    setSaving(true)

    const isNew = !editCupom.id
    const method = isNew ? 'POST' : 'PUT'
    const body = { ...editCupom, academia_id: selectedAcademiaId }

    const res = await fetch('/api/academia/comercial/cupons', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()

    if (!res.ok) { flash('err', json.error || 'Erro'); setSaving(false); return }

    flash('ok', isNew ? 'Cupom criado!' : 'Cupom atualizado!')
    setEditCupom(null)
    setSaving(false)
    loadData()
  }

  async function deleteCupom(id: string) {
    if (!confirm('Excluir este cupom permanentemente?')) return
    const res = await fetch(`/api/academia/comercial/cupons?id=${id}`, { method: 'DELETE' })
    if (res.ok) { flash('ok', 'Cupom excluído'); loadData() }
    else flash('err', 'Erro ao excluir')
  }

  async function toggleCupomAtivo(cupom: Cupom) {
    await fetch('/api/academia/comercial/cupons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cupom.id, ativo: !cupom.ativo }),
    })
    loadData()
  }

  // ─── Config Save ────────────────────────────────────────────────────────────

  async function saveConfig() {
    if (!editConfig) return
    setSaving(true)

    const res = await fetch('/api/academia/comercial/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editConfig, academia_id: selectedAcademiaId }),
    })
    const json = await res.json()

    if (!res.ok) { flash('err', json.error || 'Erro'); setSaving(false); return }

    flash('ok', 'Configuração salva!')
    setEditConfig(null)
    setSaving(false)
    loadData()
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'planos', label: 'Planos', icon: Package },
    { id: 'cupons', label: 'Cupons', icon: Ticket },
    { id: 'config', label: 'Pagamento', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/portal/academia')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Area Comercial</h1>
          <p className="text-sm text-zinc-400">Planos, cupons e pagamentos da academia</p>
        </div>
      </div>

      {/* Master academia selector */}
      {isMaster && academias.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <select
            value={selectedAcademiaId || ''}
            onChange={e => handleSelectAcademia(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">Selecione a academia...</option>
            {academias.map(a => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* No academia selected */}
      {!selectedAcademiaId && !loading && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Selecione uma academia para gerenciar a area comercial.</p>
        </div>
      )}

      {/* Flash message */}
      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          msg.type === 'ok' ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {selectedAcademiaId && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              {/* ─── TAB: Planos ──────────────────────────────────────────────── */}
              {tab === 'planos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">{planos.length} plano(s) cadastrado(s)</p>
                    <button
                      onClick={() => setEditPlano({ nome: '', valor: 0, periodicidade: 'mensal', beneficios: [], ativo: true, destaque: false, ordem: planos.length })}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Novo Plano
                    </button>
                  </div>

                  {planos.length === 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-10 text-center">
                      <Package className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-400">Nenhum plano criado ainda.</p>
                      <p className="text-zinc-500 text-sm mt-1">Crie planos e mensalidades para seus alunos.</p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {planos.map(p => (
                      <div
                        key={p.id}
                        className={`bg-zinc-900/50 border rounded-xl overflow-hidden transition-all ${
                          p.destaque ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-zinc-800'
                        } ${!p.ativo ? 'opacity-50' : ''}`}
                      >
                        {p.destaque && (
                          <div className="bg-amber-500/20 text-amber-300 text-xs font-semibold text-center py-1">
                            DESTAQUE
                          </div>
                        )}
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-white">{p.nome}</h3>
                              {p.descricao && <p className="text-sm text-zinc-400 mt-0.5">{p.descricao}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-500/20 text-green-300' : 'bg-zinc-700 text-zinc-400'}`}>
                              {p.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>

                          <div>
                            {p.valor_original && p.valor_original > p.valor && (
                              <span className="text-sm text-zinc-500 line-through mr-2">{fmt(p.valor_original)}</span>
                            )}
                            <span className="text-2xl font-bold text-green-400">{fmt(p.valor)}</span>
                            <span className="text-sm text-zinc-400">/{p.periodicidade}</span>
                          </div>

                          {p.beneficios?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {p.beneficios.map((b, i) => (
                                <span key={i} className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-zinc-300">{b}</span>
                              ))}
                            </div>
                          )}

                          <div className="text-xs text-zinc-500 space-y-0.5">
                            {p.duracao_meses && <p>Duracao: {p.duracao_meses} meses</p>}
                            {p.max_aulas_semana && <p>Max aulas/semana: {p.max_aulas_semana}</p>}
                          </div>

                          <div className="flex gap-1.5 pt-2 border-t border-zinc-800">
                            <button onClick={() => setEditPlano(p)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-zinc-300 transition-colors">
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button onClick={() => togglePlanoDestaque(p)} className={`p-1.5 rounded-lg transition-colors ${p.destaque ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => togglePlanoAtivo(p)} className={`p-1.5 rounded-lg transition-colors ${p.ativo ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                              {p.ativo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => deletePlano(p.id)} className="p-1.5 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB: Cupons ──────────────────────────────────────────────── */}
              {tab === 'cupons' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">{cupons.length} cupom(ns) cadastrado(s)</p>
                    <button
                      onClick={() => setEditCupom({ codigo: '', tipo_desconto: 'percentual', valor_desconto: 0, ativo: true })}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Novo Cupom
                    </button>
                  </div>

                  {cupons.length === 0 && (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-10 text-center">
                      <Ticket className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-400">Nenhum cupom criado ainda.</p>
                      <p className="text-zinc-500 text-sm mt-1">Crie cupons de desconto para seus alunos.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {cupons.map(c => (
                      <div key={c.id} className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 ${!c.ativo ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-500/20 text-purple-300 font-mono font-bold text-sm px-3 py-1.5 rounded-lg">
                              {c.codigo}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {c.tipo_desconto === 'percentual' ? `${c.valor_desconto}%` : fmt(c.valor_desconto)} de desconto
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${c.ativo ? 'bg-green-500/20 text-green-300' : 'bg-zinc-700 text-zinc-400'}`}>
                                  {c.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              {c.descricao && <p className="text-sm text-zinc-400">{c.descricao}</p>}
                              <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                                {c.uso_maximo && <span>Usos: {c.uso_atual}/{c.uso_maximo}</span>}
                                {!c.uso_maximo && <span>Usos: {c.uso_atual} (ilimitado)</span>}
                                {c.validade_fim && <span>Validade: {new Date(c.validade_fim).toLocaleDateString('pt-BR')}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => setEditCupom(c)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleCupomAtivo(c)} className={`p-2 rounded-lg transition-colors ${c.ativo ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                              {c.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button onClick={() => deleteCupom(c.id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB: Config Pagamento ────────────────────────────────────── */}
              {tab === 'config' && config && (
                <div className="space-y-6">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-blue-400" />
                        <div>
                          <h3 className="font-semibold text-white">Credenciais Safe2Pay</h3>
                          <p className="text-sm text-zinc-400">Configure as chaves de API da sua conta Safe2Pay</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        config.pagamento_habilitado ? 'bg-green-500/20 text-green-300' : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {config.pagamento_habilitado ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {config.pagamento_habilitado ? 'Habilitado' : 'Desabilitado'}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-xs text-zinc-400">API Key</p>
                          <p className="text-sm text-zinc-200 font-mono">
                            {config.has_api_key ? config.safe2pay_api_key : 'Nao configurada'}
                          </p>
                        </div>
                        {config.has_api_key ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-xs text-zinc-400">API Secret</p>
                          <p className="text-sm text-zinc-200 font-mono">
                            {config.has_api_secret ? config.safe2pay_api_secret : 'Nao configurado'}
                          </p>
                        </div>
                        {config.has_api_secret ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      {config.safe2pay_webhook_url && (
                        <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-xs text-zinc-400">Webhook URL</p>
                            <p className="text-sm text-zinc-200 font-mono truncate max-w-xs">{config.safe2pay_webhook_url}</p>
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(config.safe2pay_webhook_url || ''); flash('ok', 'Copiado!') }}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setEditConfig({
                        safe2pay_api_key: '',
                        safe2pay_api_secret: '',
                        safe2pay_webhook_url: config.safe2pay_webhook_url || `https://titan.smaartpro.com/api/webhooks/safe2pay`,
                        pagamento_habilitado: config.pagamento_habilitado,
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Editar Credenciais
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-white">{planos.filter(p => p.ativo).length}</p>
                      <p className="text-xs text-zinc-400">Planos ativos</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-white">{cupons.filter(c => c.ativo).length}</p>
                      <p className="text-xs text-zinc-400">Cupons ativos</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-white">{config.pagamento_habilitado ? 'Sim' : 'Nao'}</p>
                      <p className="text-xs text-zinc-400">Pagamento online</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── MODAL: Editar Plano ─────────────────────────────────────────────── */}
      {editPlano && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">{editPlano.id ? 'Editar Plano' : 'Novo Plano'}</h2>
              <button onClick={() => setEditPlano(null)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nome do plano *</label>
                <input
                  value={editPlano.nome || ''}
                  onChange={e => setEditPlano(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Mensal Adulto"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Descricao</label>
                <input
                  value={editPlano.descricao || ''}
                  onChange={e => setEditPlano(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descricao opcional"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPlano.valor ?? ''}
                    onChange={e => setEditPlano(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Valor original (de/por)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPlano.valor_original ?? ''}
                    onChange={e => setEditPlano(p => ({ ...p, valor_original: parseFloat(e.target.value) || null }))}
                    placeholder="Opcional"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Periodicidade</label>
                  <select
                    value={editPlano.periodicidade || 'mensal'}
                    onChange={e => setEditPlano(p => ({ ...p, periodicidade: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {PERIODICIDADES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Duracao (meses)</label>
                  <input
                    type="number"
                    value={editPlano.duracao_meses ?? ''}
                    onChange={e => setEditPlano(p => ({ ...p, duracao_meses: parseInt(e.target.value) || null }))}
                    placeholder="Vazio = infinito"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Max aulas/semana</label>
                <input
                  type="number"
                  value={editPlano.max_aulas_semana ?? ''}
                  onChange={e => setEditPlano(p => ({ ...p, max_aulas_semana: parseInt(e.target.value) || null }))}
                  placeholder="Vazio = ilimitado"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Beneficios (separados por virgula)</label>
                <input
                  value={(editPlano.beneficios || []).join(', ')}
                  onChange={e => setEditPlano(p => ({ ...p, beneficios: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Judo, Musculacao, Luta Livre"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPlano.destaque ?? false}
                    onChange={e => setEditPlano(p => ({ ...p, destaque: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-zinc-300">Plano em destaque</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPlano.ativo ?? true}
                    onChange={e => setEditPlano(p => ({ ...p, ativo: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-zinc-300">Ativo</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditPlano(null)} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={savePlano}
                  disabled={saving || !editPlano.nome}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editPlano.id ? 'Salvar' : 'Criar Plano'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Editar Cupom ─────────────────────────────────────────────── */}
      {editCupom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">{editCupom.id ? 'Editar Cupom' : 'Novo Cupom'}</h2>
              <button onClick={() => setEditCupom(null)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Codigo do cupom *</label>
                <input
                  value={editCupom.codigo || ''}
                  onChange={e => setEditCupom(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  placeholder="Ex: PROMO10"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Descricao</label>
                <input
                  value={editCupom.descricao || ''}
                  onChange={e => setEditCupom(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descricao opcional"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Tipo de desconto</label>
                  <select
                    value={editCupom.tipo_desconto || 'percentual'}
                    onChange={e => setEditCupom(p => ({ ...p, tipo_desconto: e.target.value as 'percentual' | 'fixo' }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">
                    Valor do desconto {editCupom.tipo_desconto === 'percentual' ? '(%)' : '(R$)'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCupom.valor_desconto ?? ''}
                    onChange={e => setEditCupom(p => ({ ...p, valor_desconto: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Valor minimo do plano</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCupom.valor_minimo ?? ''}
                    onChange={e => setEditCupom(p => ({ ...p, valor_minimo: parseFloat(e.target.value) || null }))}
                    placeholder="Opcional"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Limite de usos</label>
                  <input
                    type="number"
                    value={editCupom.uso_maximo ?? ''}
                    onChange={e => setEditCupom(p => ({ ...p, uso_maximo: parseInt(e.target.value) || null }))}
                    placeholder="Vazio = ilimitado"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Validade inicio</label>
                  <input
                    type="date"
                    value={editCupom.validade_inicio ? editCupom.validade_inicio.slice(0, 10) : ''}
                    onChange={e => setEditCupom(p => ({ ...p, validade_inicio: e.target.value || null }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Validade fim</label>
                  <input
                    type="date"
                    value={editCupom.validade_fim ? editCupom.validade_fim.slice(0, 10) : ''}
                    onChange={e => setEditCupom(p => ({ ...p, validade_fim: e.target.value || null }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editCupom.ativo ?? true}
                  onChange={e => setEditCupom(p => ({ ...p, ativo: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-zinc-300">Ativo</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditCupom(null)} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={saveCupom}
                  disabled={saving || !editCupom.codigo}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editCupom.id ? 'Salvar' : 'Criar Cupom'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Editar Config ────────────────────────────────────────────── */}
      {editConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Configurar Pagamento</h2>
              <p className="text-sm text-zinc-400 mt-1">As credenciais sao armazenadas de forma segura.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">API Key Safe2Pay</label>
                <input
                  value={editConfig.safe2pay_api_key}
                  onChange={e => setEditConfig(p => p ? { ...p, safe2pay_api_key: e.target.value } : p)}
                  placeholder="Cole sua API Key aqui"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">API Secret Safe2Pay</label>
                <input
                  value={editConfig.safe2pay_api_secret}
                  onChange={e => setEditConfig(p => p ? { ...p, safe2pay_api_secret: e.target.value } : p)}
                  placeholder="Cole seu API Secret aqui"
                  type="password"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Webhook URL</label>
                <input
                  value={editConfig.safe2pay_webhook_url}
                  onChange={e => setEditConfig(p => p ? { ...p, safe2pay_webhook_url: e.target.value } : p)}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editConfig.pagamento_habilitado}
                  onChange={e => setEditConfig(p => p ? { ...p, pagamento_habilitado: e.target.checked } : p)}
                  className="rounded"
                />
                <span className="text-sm text-zinc-300">Habilitar pagamento online</span>
              </label>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
                Deixe os campos em branco para manter as credenciais atuais. Somente preencha se quiser substituir.
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditConfig(null)} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar Configuracao
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
