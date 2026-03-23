'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Download, Loader2, Search, CheckSquare, Square,
  Tag, Filter, RefreshCw, Image, AlertTriangle, ChevronDown,
  Users,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// BN Layout Configuration
// Atualizar quando o template for fornecido.
// Coordenadas relativas à dimensão do canvas (BN_W × BN_H).
// ─────────────────────────────────────────────────────────────────────────────
const BN_W = 800   // largura do canvas (px) — ajustar ao template
const BN_H = 1000  // altura do canvas (px) — ajustar ao template

interface TextField {
  x: number
  y: number
  maxWidth?: number
  fontSize: number
  fontFamily?: string
  fontWeight?: string
  color: string
  align: CanvasTextAlign
  text: (a: BNAtleta) => string
}

// Campos sobrepostos no BN — TODOS os valores são placeholder até o template chegar
const BN_FIELDS: TextField[] = [
  {
    // Número de filiação (grande, no centro-superior)
    x: BN_W / 2,
    y: 320,
    fontSize: 130,
    fontWeight: 'bold',
    fontFamily: 'Arial',
    color: '#FFFFFF',
    align: 'center',
    text: (a) => String(a.id).padStart(4, '0'),
  },
  {
    // Nome no patch (nome de guerra do atleta)
    x: BN_W / 2,
    y: 590,
    maxWidth: BN_W - 80,
    fontSize: 54,
    fontWeight: 'bold',
    fontFamily: 'Arial',
    color: '#FFFFFF',
    align: 'center',
    text: (a) => (a.nome_patch || a.nome_completo).toUpperCase(),
  },
  {
    // Academia
    x: BN_W / 2,
    y: 660,
    maxWidth: BN_W - 80,
    fontSize: 30,
    fontFamily: 'Arial',
    color: '#CCCCCC',
    align: 'center',
    text: (a) => a.academia.toUpperCase(),
  },
  {
    // Graduação
    x: BN_W / 2,
    y: 710,
    maxWidth: BN_W - 80,
    fontSize: 26,
    fontFamily: 'Arial',
    color: '#BBBBBB',
    align: 'center',
    text: (a) => a.graduacao ? a.graduacao.toUpperCase() : '',
  },
]
// ─────────────────────────────────────────────────────────────────────────────

interface BNAtleta {
  id: number
  stakeholder_id: string
  nome_completo: string
  nome_patch: string
  academia: string
  academia_id: string | null
  genero: string | null
  status_plano: string | null
  status_membro: string | null
  data_expiracao: string | null
  graduacao: string | null
  cor_faixa: string | null
  kyu_dan_id: number | null
}

interface BNTemplate {
  background_url: string
  field_config: Record<string, unknown> | null
}

// Cache de imagens já carregadas para não recarregar a cada BN
const imgCache: Record<string, HTMLImageElement> = {}

async function loadImage(url: string): Promise<HTMLImageElement> {
  if (imgCache[url]) return imgCache[url]
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgCache[url] = img; resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

async function generateBNCanvas(
  atleta: BNAtleta,
  bgImage: HTMLImageElement | null,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = BN_W
  canvas.height = BN_H
  const ctx = canvas.getContext('2d')!

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, BN_W, BN_H)
  } else {
    // Placeholder background quando não há template
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, BN_W, BN_H)
    // Borda
    ctx.strokeStyle = '#3a3a5e'
    ctx.lineWidth = 4
    ctx.strokeRect(8, 8, BN_W - 16, BN_H - 16)
  }

  for (const field of BN_FIELDS) {
    const text = field.text(atleta)
    if (!text) continue
    ctx.save()
    ctx.font = `${field.fontWeight ?? 'normal'} ${field.fontSize}px ${field.fontFamily ?? 'Arial'}`
    ctx.fillStyle = field.color
    ctx.textAlign = field.align
    ctx.textBaseline = 'middle'
    if (field.maxWidth) {
      ctx.fillText(text, field.x, field.y, field.maxWidth)
    } else {
      ctx.fillText(text, field.x, field.y)
    }
    ctx.restore()
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas.toBlob falhou')), 'image/png'),
  )
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'Válido', label: 'Plano válido' },
  { value: 'Vencido', label: 'Plano vencido' },
]

export default function BacknumbersPage() {
  const router = useRouter()

  const [atletas, setAtletas] = useState<BNAtleta[]>([])
  const [template, setTemplate] = useState<BNTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Válido')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  const searchTimer = useRef<NodeJS.Timeout | null>(null)

  const load = useCallback(async (q: string, st: string) => {
    setLoading(true)
    setSelected(new Set())
    try {
      const p = new URLSearchParams()
      if (st) p.set('status', st)
      if (q) p.set('search', q)
      const res = await fetch(`/api/federacao/backnumbers?${p}`)
      const d = await res.json()
      setAtletas(d.atletas ?? [])
      setTemplate(d.template ?? null)
    } catch {
      setAtletas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(search, statusFilter)
  }, [statusFilter])  // eslint-disable-line

  const handleSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(v, statusFilter), 350)
  }

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === atletas.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(atletas.map(a => a.id)))
    }
  }

  const handleGenerate = async () => {
    const toGenerate = atletas.filter(a => selected.has(a.id))
    if (toGenerate.length === 0) return

    setGenerating(true)
    setGenError(null)
    setProgress(0)
    setProgressTotal(toGenerate.length)

    let bgImage: HTMLImageElement | null = null
    if (template?.background_url) {
      try {
        bgImage = await loadImage(template.background_url)
      } catch {
        // Continua sem background — ainda gera com placeholder
      }
    }

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (let i = 0; i < toGenerate.length; i++) {
        const atleta = toGenerate[i]
        try {
          const blob = await generateBNCanvas(atleta, bgImage)
          const filename = `BN_${String(atleta.id).padStart(4, '0')}_${atleta.nome_completo.replace(/[^a-zA-Z0-9]/g, '_')}.png`
          zip.file(filename, blob)
        } catch {
          // Pula atleta com erro, continua os demais
        }
        setProgress(i + 1)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backnumbers_${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setGenError('Erro ao gerar o arquivo ZIP. Tente novamente.')
      console.error(err)
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }

  const handlePreviewOne = async (atleta: BNAtleta) => {
    let bgImage: HTMLImageElement | null = null
    if (template?.background_url) {
      try { bgImage = await loadImage(template.background_url) } catch { /* noop */ }
    }
    const blob = await generateBNCanvas(atleta, bgImage)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const allSelected = atletas.length > 0 && selected.size === atletas.length
  const someSelected = selected.size > 0 && selected.size < atletas.length
  const pct = progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0

  function StatusBadge({ status }: { status: string | null }) {
    if (status === 'Válido') return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/20">Válido</span>
    )
    if (status === 'Vencido') return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">Vencido</span>
    )
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/20">{status ?? '—'}</span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">

      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/federacao')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Tag className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Backnumbers</h1>
                <p className="text-gray-400 mt-0.5">Geração em massa para impressão</p>
              </div>
            </div>

            {selected.size > 0 && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-xl transition-all disabled:opacity-60 shadow-lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progress}/{progressTotal} — {pct}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Baixar {selected.size} BN{selected.size !== 1 ? 's' : ''} (.zip)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">

        {/* Template status */}
        {!template && !loading && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold text-sm">Template de backnumber não configurado</p>
              <p className="text-yellow-400/70 text-xs mt-1">
                Os BNs serão gerados com fundo escuro placeholder. Para usar o template oficial,
                cadastre um registro em <span className="font-mono">document_templates</span> com{' '}
                <span className="font-mono">template_type = &apos;backnumber&apos;</span>.
              </p>
            </div>
          </div>
        )}

        {template && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3">
            <Image className="w-4 h-4 text-green-400" />
            <p className="text-green-300 text-sm font-medium">Template carregado — pronto para geração</p>
          </div>
        )}

        {/* Progress bar */}
        {generating && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Gerando backnumbers...</span>
              <span className="text-white font-semibold">{progress} / {progressTotal}</span>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-purple-500 transition-colors text-sm appearance-none"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={() => load(search, statusFilter)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden">

          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-white/10 bg-white/3">
            <button onClick={toggleAll} className="shrink-0 text-gray-400 hover:text-white transition-colors">
              {allSelected ? (
                <CheckSquare className="w-5 h-5 text-purple-400" />
              ) : someSelected ? (
                <CheckSquare className="w-5 h-5 text-purple-300 opacity-60" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Atleta</span>
              <span className="col-span-3">Academia</span>
              <span className="col-span-2">Graduação</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1 text-right">BN</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando atletas...
            </div>
          ) : atletas.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nenhum atleta encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {atletas.map(atleta => {
                const isSelected = selected.has(atleta.id)
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
                      <div className="col-span-4 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{atleta.nome_completo}</p>
                        {atleta.nome_patch && atleta.nome_patch !== atleta.nome_completo && (
                          <p className="text-purple-400 text-xs truncate">{atleta.nome_patch}</p>
                        )}
                      </div>
                      <p className="col-span-3 text-gray-400 text-xs truncate">{atleta.academia}</p>
                      <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                        {atleta.cor_faixa && (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                            style={{ backgroundColor: atleta.cor_faixa }}
                          />
                        )}
                        <span className="text-gray-400 text-xs truncate">{atleta.graduacao ?? '—'}</span>
                      </div>
                      <div className="col-span-1">
                        <StatusBadge status={atleta.status_plano} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handlePreviewOne(atleta)}
                          title="Prévia individual"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          {atletas.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 text-xs text-gray-500">
              <span>{atletas.length} atleta{atletas.length !== 1 ? 's' : ''} listado{atletas.length !== 1 ? 's' : ''}</span>
              <span>{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <h3 className="text-blue-300 font-semibold text-sm mb-2">Como funciona</h3>
          <ul className="text-gray-400 text-sm space-y-1.5">
            <li>• Selecione os atletas desejados e clique em "Baixar BNs (.zip)"</li>
            <li>• Cada BN é gerado no navegador como PNG ({BN_W}×{BN_H}px)</li>
            <li>• O arquivo ZIP contém um PNG por atleta, nomeado com o número de filiação</li>
            <li>• Para configurar o template de fundo, cadastre em <span className="font-mono text-blue-300">document_templates</span> com <span className="font-mono text-blue-300">template_type = &apos;backnumber&apos;</span></li>
            <li>• O ícone <Tag className="w-3 h-3 inline" /> na linha do atleta gera uma prévia individual</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
