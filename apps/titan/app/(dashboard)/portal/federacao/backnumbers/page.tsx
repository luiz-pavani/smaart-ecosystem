'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Download, Loader2, Search, CheckSquare, Square,
  Tag, Filter, RefreshCw, AlertTriangle, ChevronDown, Users, Eye,
  Lock, Pencil, Check, X,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE IMPRESSÃO
// Template base: quadrado a 300 DPI
//   P = 28×28cm = 3307×3307px
//   M = 34×34cm = 4016×4016px
//   G = 41×41cm = 4844×4844px
//
// FONTES: faça upload dos arquivos .ttf para o Supabase Storage e preencha:
const FONT_CONDENSED_URL = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/fonts/highway-gothic-condensed.ttf'
const FONT_EXPANDED_URL  = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/fonts/highway-gothic-expanded.ttf'
// ─────────────────────────────────────────────────────────────────────────────

const PX_PER_CM = 300 / 2.54   // ≈ 118.11px/cm  (300 DPI)
const PX_PER_MM = 300 / 25.4   // ≈ 11.811px/mm

const SIZE_PX: Record<string, number> = {
  P: Math.round(28 * PX_PER_CM),  // 3307
  M: Math.round(34 * PX_PER_CM),  // 4016
  G: Math.round(41 * PX_PER_CM),  // 4844
}

const TOP_COLORS: Record<string, string> = {
  azul: '#0030a4',
  rosa: '#b751b8',
}

const F_CONDENSED = `'Highway Gothic Condensed', 'Arial Narrow', Arial, sans-serif`
const F_EXPANDED  = `'Highway Gothic Expanded', Arial, 'Helvetica Neue', sans-serif`

function buildLayout(size: string, cor: string) {
  const dim = SIZE_PX[size] ?? SIZE_PX.P
  const s   = dim / SIZE_PX.P
  const cx  = dim / 2
  const accent = TOP_COLORS[cor] ?? TOP_COLORS.azul

  const fNome     = Math.round(41  * PX_PER_MM * s)
  const fSigla    = Math.round(90  * PX_PER_MM * s)
  const fAcademia = Math.round(8   * PX_PER_MM * s)

  const lsNome     = Math.round(-0.025 * fNome)
  const lsAcademia = Math.round( 0.075 * fAcademia)

  return {
    dim,
    nome: {
      x: cx,
      y: Math.round(3.57 * PX_PER_CM * s),
      font: `bold ${fNome}px ${F_CONDENSED}`,
      color: '#ffffff',
      letterSpacing: `${lsNome}px`,
      maxWidth: Math.round(dim * 0.90),
    },
    sigla: {
      x: cx,
      y: Math.round(12 * PX_PER_CM * s),
      font: `bold ${fSigla}px ${F_EXPANDED}`,
      color: accent,
      letterSpacing: '0px',
      maxWidth: Math.round(dim * 0.92),
    },
    academia: {
      x: cx,
      y: Math.round(16.2 * PX_PER_CM * s),
      font: `bold ${fAcademia}px ${F_EXPANDED}`,
      color: accent,
      letterSpacing: `${lsAcademia}px`,
      maxWidth: Math.round(dim * 0.88),
    },
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface BNAtleta {
  id: number
  stakeholder_id: string
  nome_completo: string
  nome_patch: string
  academia: string
  academia_id: string | null
  sigla: string
  tamanho: 'P' | 'M' | 'G'
  cor: 'azul' | 'rosa'
  status_plano: string | null
  data_expiracao: string | null
  lote_id: string | null
}

interface LoteConfig {
  lote_atual: string
  ano: number
  sequencia: number
}

// ─── Cache de imagens / fontes ────────────────────────────────────────────────
const imgCache: Record<string, HTMLImageElement> = {}

async function loadImg(url: string): Promise<HTMLImageElement> {
  if (imgCache[url]) return imgCache[url]
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgCache[url] = img; resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

let fontsLoaded = false
async function ensureFonts() {
  if (fontsLoaded) return
  const loads: Promise<void>[] = []
  if (FONT_CONDENSED_URL) {
    loads.push(
      new FontFace('Highway Gothic Condensed', `url(${FONT_CONDENSED_URL})`).load()
        .then(f => { document.fonts.add(f) })
        .catch(() => { /* fallback to Arial Narrow */ })
    )
  }
  if (FONT_EXPANDED_URL) {
    loads.push(
      new FontFace('Highway Gothic Expanded', `url(${FONT_EXPANDED_URL})`).load()
        .then(f => { document.fonts.add(f) })
        .catch(() => { /* fallback to Arial */ })
    )
  }
  await Promise.allSettled(loads)
  fontsLoaded = true
}

// ─── Geração do canvas ────────────────────────────────────────────────────────
async function generateBN(
  atleta: BNAtleta,
  bgImage: HTMLImageElement | null,
): Promise<Blob> {
  const layout = buildLayout(atleta.tamanho, atleta.cor)
  const { dim } = layout

  const canvas = document.createElement('canvas')
  canvas.width  = dim
  canvas.height = dim
  const ctx = canvas.getContext('2d')!

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, dim, dim)
  } else {
    const accent = TOP_COLORS[atleta.cor] ?? TOP_COLORS.azul
    ctx.fillStyle = accent
    ctx.fillRect(0, 0, dim, Math.round(dim * 0.22))
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, Math.round(dim * 0.18), dim, Math.round(dim * 0.52))
    ctx.fillStyle = '#5e5e5e'
    ctx.fillRect(0, Math.round(dim * 0.68), dim, dim)
  }

  const drawText = (
    text: string,
    field: { x: number; y: number; font: string; color: string; letterSpacing: string; maxWidth: number },
  ) => {
    if (!text) return
    ctx.save()
    ctx.font = field.font
    ctx.fillStyle = field.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = field.letterSpacing
    }
    ctx.fillText(text.toUpperCase(), field.x, field.y, field.maxWidth)
    ctx.restore()
  }

  drawText(atleta.nome_patch || atleta.nome_completo, layout.nome)
  drawText(atleta.sigla, layout.sigla)
  drawText(atleta.academia, layout.academia)

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob falhou')), 'image/jpeg', 0.92),
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: '',       label: 'Todos os status' },
  { value: 'Válido', label: 'Plano válido'    },
  { value: 'Vencido',label: 'Plano vencido'   },
]

const TAMANHO_OPTIONS = [
  { value: '', label: 'Todos os tamanhos' },
  { value: 'P', label: 'P — 28×28cm' },
  { value: 'M', label: 'M — 34×34cm' },
  { value: 'G', label: 'G — 41×41cm' },
]

function StatusBadge({ v }: { v: string | null }) {
  if (v === 'Válido') return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20">Válido</span>
  )
  if (v === 'Vencido') return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">Vencido</span>
  )
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/20">{v ?? '—'}</span>
  )
}

// ─── Edição inline de lote ────────────────────────────────────────────────────
function LoteBadge({
  atleta,
  onSave,
}: {
  atleta: BNAtleta
  onSave: (atletaId: string, novoLote: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(atleta.lote_id ?? '')
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    await onSave(atleta.stakeholder_id, value.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="w-24 px-2 py-0.5 text-xs bg-slate-700 border border-purple-500 rounded text-white focus:outline-none"
        />
        <button onClick={handleSave} disabled={saving} className="text-green-400 hover:text-green-300 disabled:opacity-50">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button onClick={() => setEditing(false)} className="text-red-400 hover:text-red-300">
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
        atleta.lote_id === 'ANT'
          ? 'bg-slate-500/15 border-slate-500/20 text-slate-400'
          : 'bg-purple-500/15 border-purple-500/20 text-purple-300'
      }`}>
        {atleta.lote_id ?? '—'}
      </span>
      <button
        onClick={() => { setValue(atleta.lote_id ?? ''); setEditing(true) }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-purple-400 transition-opacity"
        title="Editar lote"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function BacknumbersPage() {
  const router = useRouter()

  const [atletas, setAtletas]           = useState<BNAtleta[]>([])
  const [templateUrls, setTemplateUrls] = useState<Record<string, string>>({})
  const [loading, setLoading]           = useState(true)

  const [lote, setLote]             = useState<LoteConfig | null>(null)
  const [fechandoLote, setFechando] = useState(false)
  const [confirmarFechar, setConfirmarFechar] = useState(false)

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('Válido')
  const [tamanhoFilter, setTamanhoFilter] = useState('')

  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [progTotal, setProgTotal]   = useState(0)
  const [genError, setGenError]     = useState<string | null>(null)

  const searchTimer = useRef<NodeJS.Timeout | null>(null)

  // ── Carregamento ──────────────────────────────────────────────────────────
  const load = useCallback(async (q: string, st: string) => {
    setLoading(true)
    setSelected(new Set())
    try {
      const params = new URLSearchParams()
      if (st) params.set('status', st)
      if (q)  params.set('search', q)
      const [bnRes, loteRes] = await Promise.all([
        fetch(`/api/federacao/backnumbers?${params}`),
        fetch('/api/federacao/lote'),
      ])
      const d = await bnRes.json()
      const l = await loteRes.json()
      setAtletas(d.atletas ?? [])
      setTemplateUrls(d.templates ?? {})
      setLote(l)
    } catch {
      setAtletas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(search, statusFilter) }, [statusFilter]) // eslint-disable-line

  const handleSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(v, statusFilter), 350)
  }

  // ── Fechar lote ───────────────────────────────────────────────────────────
  const handleFecharLote = async () => {
    setFechando(true)
    try {
      const res = await fetch('/api/federacao/lote', { method: 'POST' })
      const d = await res.json()
      if (d.ok) setLote({ lote_atual: d.novo_lote, ano: d.ano, sequencia: d.sequencia })
    } finally {
      setFechando(false)
      setConfirmarFechar(false)
    }
  }

  // ── Editar lote individual ────────────────────────────────────────────────
  const handleSaveLote = async (atletaId: string, novoLote: string) => {
    await fetch('/api/federacao/lote', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atleta_id: atletaId, lote_id: novoLote }),
    })
    setAtletas(prev => prev.map(a =>
      a.stakeholder_id === atletaId ? { ...a, lote_id: novoLote } : a
    ))
  }

  // ── Seleção ───────────────────────────────────────────────────────────────
  const visibleAtletas = tamanhoFilter
    ? atletas.filter(a => a.tamanho === tamanhoFilter)
    : atletas

  const toggleOne = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const toggleAll = () =>
    setSelected(
      selected.size === visibleAtletas.length
        ? new Set()
        : new Set(visibleAtletas.map(a => a.id))
    )

  const allSelected  = visibleAtletas.length > 0 && selected.size === visibleAtletas.length
  const someSelected = selected.size > 0 && selected.size < visibleAtletas.length

  // ── Geração ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const toGen = visibleAtletas.filter(a => selected.has(a.id))
    if (!toGen.length) return

    setGenerating(true)
    setGenError(null)
    setProgress(0)
    setProgTotal(toGen.length)

    try {
      await ensureFonts()

      const bgMap: Record<string, HTMLImageElement | null> = {}
      for (const cor of ['azul', 'rosa'] as const) {
        const url = templateUrls[cor]
        if (url) {
          try { bgMap[cor] = await loadImg(url) }
          catch { bgMap[cor] = null }
        } else {
          bgMap[cor] = null
        }
      }

      const JSZip = (await import('jszip')).default
      const zip   = new JSZip()

      for (let i = 0; i < toGen.length; i++) {
        const a = toGen[i]
        try {
          const blob = await generateBN(a, bgMap[a.cor])
          const folder = `${a.tamanho}_${a.cor}`
          const fname  = `BN_${folder}_${String(a.id).padStart(4, '0')}_${(a.nome_patch || a.nome_completo).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
          zip.file(`${folder}/${fname}`, blob)
        } catch { /* pula atleta com erro */ }
        setProgress(i + 1)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url     = URL.createObjectURL(zipBlob)
      const a       = document.createElement('a')
      a.href        = url
      a.download    = `backnumbers_${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setGenError('Erro ao gerar ZIP. Verifique o console para detalhes.')
      console.error(err)
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }

  const handlePreviewOne = async (atleta: BNAtleta) => {
    await ensureFonts()
    const url = templateUrls[atleta.cor]
    let bg: HTMLImageElement | null = null
    if (url) { try { bg = await loadImg(url) } catch { /* noop */ } }
    const blob = await generateBN(atleta, bg)
    const objUrl = URL.createObjectURL(blob)
    window.open(objUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(objUrl), 15_000)
  }

  const hasTemplates  = Object.keys(templateUrls).length > 0
  const pct           = progTotal > 0 ? Math.round((progress / progTotal) * 100) : 0
  const selectedCount = visibleAtletas.filter(a => selected.has(a.id)).length

  const countByVariant = visibleAtletas.reduce((acc, a) => {
    const k = `${a.tamanho}_${a.cor}`
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">

      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/federacao')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Tag className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Backnumbers</h1>
                <p className="text-gray-400 mt-0.5">Circuito Sul de Judô 2026 — geração em massa para impressão</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Lote atual + botão fechar */}
              {lote && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <Tag className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-sm font-semibold">Lote ativo: {lote.lote_atual}</span>
                  </div>
                  {!confirmarFechar ? (
                    <button
                      onClick={() => setConfirmarFechar(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-300 font-semibold rounded-xl transition-all text-sm"
                    >
                      <Lock className="w-4 h-4" /> Lote Fechado
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/15 border border-orange-500/30 rounded-xl">
                      <span className="text-orange-300 text-xs">Fechar {lote.lote_atual} e abrir próximo?</span>
                      <button
                        onClick={handleFecharLote}
                        disabled={fechandoLote}
                        className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-semibold disabled:opacity-60"
                      >
                        {fechandoLote ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                      </button>
                      <button onClick={() => setConfirmarFechar(false)} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedCount > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl transition-all disabled:opacity-60 shadow-lg"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{progress}/{progTotal} — {pct}%</>
                  ) : (
                    <><Download className="w-4 h-4" />Baixar {selectedCount} BN{selectedCount !== 1 ? 's' : ''} (.zip)</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">

        {/* Alertas */}
        {!hasTemplates && !loading && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold text-sm">Fundos de template não configurados</p>
              <p className="text-yellow-400/70 text-xs mt-1">
                BNs serão gerados com fundo placeholder. Para usar os fundos oficiais, faça upload para o Supabase Storage
                e registre em <span className="font-mono">document_templates</span> com tipos{' '}
                <span className="font-mono">backnumber_azul</span> e <span className="font-mono">backnumber_rosa</span>.
              </p>
            </div>
          </div>
        )}

        {hasTemplates && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(templateUrls).map(([cor]) => (
              <span key={cor} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOP_COLORS[cor] }} />
                Template {cor} carregado
              </span>
            ))}
          </div>
        )}

        {(!FONT_CONDENSED_URL || !FONT_EXPANDED_URL) && (
          <div className="flex items-center gap-3 bg-blue-500/8 border border-blue-500/15 rounded-xl px-5 py-3">
            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-blue-300/80 text-xs">
              Fontes Highway Gothic não configuradas — usando Arial como fallback.
            </p>
          </div>
        )}

        {/* Barra de progresso */}
        {generating && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Gerando backnumbers (.jpg)...</span>
              <span className="text-white font-semibold">{progress} / {progTotal}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {genError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm">{genError}</div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
            />
          </div>

          {[
            { val: statusFilter, opts: STATUS_OPTIONS,  set: setStatusFilter,  id: 'status' },
            { val: tamanhoFilter, opts: TAMANHO_OPTIONS, set: setTamanhoFilter, id: 'tam' },
          ].map(f => (
            <div key={f.id} className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={f.val}
                onChange={e => { f.set(e.target.value); if (f.id === 'status') setStatusFilter(e.target.value) }}
                className="pl-10 pr-7 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-purple-500 transition-colors text-sm appearance-none"
              >
                {f.opts.map(o => (
                  <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          ))}

          <button
            onClick={() => load(search, statusFilter)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        {/* Contagem por variante */}
        {!loading && visibleAtletas.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(countByVariant).sort().map(([v, n]) => {
              const [tam, cor] = v.split('_')
              return (
                <span key={v} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOP_COLORS[cor] }} />
                  {tam} {cor}: {n} atleta{n !== 1 ? 's' : ''}
                </span>
              )
            })}
          </div>
        )}

        {/* Tabela */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden">

          {/* Cabeçalho */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-white/10 bg-white/3">
            <button onClick={toggleAll} className="shrink-0 text-gray-400 hover:text-white transition-colors">
              {allSelected
                ? <CheckSquare className="w-5 h-5 text-purple-400" />
                : someSelected
                ? <CheckSquare className="w-5 h-5 text-purple-300 opacity-60" />
                : <Square className="w-5 h-5" />
              }
            </button>
            <div className="flex-1 grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="col-span-1">#</span>
              <span className="col-span-2">Nome / Patch</span>
              <span className="col-span-2">Sigla</span>
              <span className="col-span-2">Academia</span>
              <span className="col-span-2">Lote</span>
              <span className="col-span-1 text-center">Tam.</span>
              <span className="col-span-1 text-center">Cor</span>
              <span className="col-span-1 text-right">Ações</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando atletas...
            </div>
          ) : visibleAtletas.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nenhum atleta encontrado.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {visibleAtletas.map(atleta => {
                const isSelected = selected.has(atleta.id)
                const accentColor = TOP_COLORS[atleta.cor] ?? TOP_COLORS.azul
                return (
                  <div
                    key={atleta.id}
                    className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                      isSelected ? 'bg-purple-500/8 hover:bg-purple-500/12' : 'hover:bg-white/4'
                    }`}
                  >
                    <button
                      onClick={() => toggleOne(atleta.id)}
                      className="shrink-0 text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-purple-400" />
                        : <Square className="w-5 h-5" />
                      }
                    </button>

                    <div className="flex-1 grid grid-cols-12 gap-2 items-center min-w-0">
                      <span className="col-span-1 text-gray-500 text-xs font-mono">
                        {String(atleta.id).padStart(4, '0')}
                      </span>
                      <div className="col-span-2 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{atleta.nome_completo}</p>
                        {atleta.nome_patch !== atleta.nome_completo && (
                          <p className="text-purple-400 text-xs truncate">{atleta.nome_patch}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        {atleta.sigla ? (
                          <span className="text-sm font-bold truncate" style={{ color: accentColor }}>
                            {atleta.sigla}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">sem sigla</span>
                        )}
                      </div>
                      <p className="col-span-2 text-gray-400 text-xs truncate">{atleta.academia}</p>
                      <div className="col-span-2">
                        <LoteBadge atleta={atleta} onSave={handleSaveLote} />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <span className="text-xs font-semibold text-white bg-white/10 rounded-full px-2 py-0.5">
                          {atleta.tamanho}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <span
                          className="w-5 h-5 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: accentColor }}
                          title={atleta.cor}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handlePreviewOne(atleta)}
                          title="Prévia individual"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {visibleAtletas.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 text-xs text-gray-500">
              <span>{visibleAtletas.length} atleta{visibleAtletas.length !== 1 ? 's' : ''} listado{visibleAtletas.length !== 1 ? 's' : ''}</span>
              <span>{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Especificações técnicas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
            <h3 className="text-blue-300 font-semibold text-sm mb-3">Especificações de Impressão</h3>
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-500 border-b border-white/10">
                  <th className="text-left pb-1">Tamanho</th>
                  <th className="text-right pb-1">Físico</th>
                  <th className="text-right pb-1">Pixels (300dpi)</th>
                  <th className="text-right pb-1">Cores</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                <tr><td className="py-0.5">P</td><td className="text-right">28×28cm</td><td className="text-right">3307×3307</td><td className="text-right">azul, rosa</td></tr>
                <tr><td className="py-0.5">M</td><td className="text-right">34×34cm</td><td className="text-right">4016×4016</td><td className="text-right">azul</td></tr>
                <tr><td className="py-0.5">G</td><td className="text-right">41×41cm</td><td className="text-right">4844×4844</td><td className="text-right">azul</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
            <h3 className="text-purple-300 font-semibold text-sm mb-3">Lógica de Lotes</h3>
            <ul className="text-gray-400 text-xs space-y-1.5">
              <li>• Registros históricos recebem lote <span className="font-mono text-slate-300">ANT</span></li>
              <li>• Novos cadastros e renovações recebem o lote ativo automaticamente</li>
              <li>• <span className="font-mono text-orange-300">Lote Fechado</span> incrementa a sequência (ex: N2026 1 → N2026 2)</li>
              <li>• Passe o mouse sobre o lote de um atleta para editar individualmente</li>
              <li>• Arquivos exportados em <span className="font-mono">.jpg</span> (qualidade 92%)</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
