'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface BracketRef {
  id: string
  category_nome: string
  area_id: number | null
  status: string
}

/**
 * TV Mode — rotaciona entre as views públicas do evento em intervalos
 * configuráveis. URL: /eventos/[id]/tv?interval=30
 *
 * Sequência padrão:
 *   1. Cronograma (todos os tatames)
 *   2. Placar (todos os tatames ao vivo)
 *   3. Cada bracket publicado (1 por vez)
 * Volta pro topo. Tempo padrão = 30s por view.
 *
 * Renderiza as outras páginas via iframe para reaproveitar UI (zero
 * duplicação de código).
 *
 * Query params:
 *   ?interval=N → segundos por view (default 30)
 *   ?skip_brackets=1 → só mostra cronograma + placar (mais leve)
 */
export default function TvModePage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const intervalSec = Math.max(5, Math.min(300, Number(searchParams.get('interval')) || 30))
  const skipBrackets = searchParams.get('skip_brackets') === '1'

  const [brackets, setBrackets] = useState<BracketRef[]>([])
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)

  // Carrega lista de brackets publicados (pra incluir na rotação)
  const loadBrackets = useCallback(async () => {
    if (skipBrackets) return
    try {
      const res = await fetch(`/api/eventos/${id}/brackets/public`)
      const json = await res.json()
      const list = (json.brackets || [])
        .filter((b: any) => b.status === 'published' || b.status === 'finished')
        .map((b: any) => ({
          id: b.id,
          category_nome: b.category?.nome_display ?? '',
          area_id: b.area_id,
          status: b.status,
        }))
      setBrackets(list)
    } catch { /* sem brackets, rotaciona só nas 2 fixas */ }
  }, [id, skipBrackets])

  useEffect(() => {
    loadBrackets()
    // Refresca lista de brackets a cada 60s pra pegar novas categorias publicadas
    const t = setInterval(loadBrackets, 60000)
    return () => clearInterval(t)
  }, [loadBrackets])

  // Monta a sequência de URLs
  const sequence = useMemo(() => {
    const list: { url: string; label: string }[] = [
      { url: `/eventos/${id}/cronograma-tv`, label: 'Cronograma' },
      { url: `/eventos/${id}/placar`, label: 'Placar ao vivo' },
    ]
    for (const b of brackets) {
      list.push({
        url: `/eventos/${id}/chaves/${b.id}`,
        label: b.category_nome || 'Chave',
      })
    }
    return list
  }, [id, brackets])

  // Avança o step automaticamente
  useEffect(() => {
    if (paused || sequence.length === 0) return
    const t = setTimeout(() => {
      setStep((s) => (s + 1) % sequence.length)
    }, intervalSec * 1000)
    return () => clearTimeout(t)
  }, [step, intervalSec, paused, sequence.length])

  // Reset step se step >= sequence.length (brackets recarregou)
  useEffect(() => {
    if (step >= sequence.length && sequence.length > 0) setStep(0)
  }, [step, sequence.length])

  // Keyboard controls — pra organizador na TV
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'p') { setPaused(p => !p); e.preventDefault() }
      else if (e.key === 'ArrowRight' || e.key === 'n') setStep(s => (s + 1) % sequence.length)
      else if (e.key === 'ArrowLeft') setStep(s => (s - 1 + sequence.length) % sequence.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sequence.length])

  if (sequence.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60 text-2xl">
        Carregando TV mode…
      </div>
    )
  }

  const current = sequence[step]

  return (
    <div className="fixed inset-0 bg-black">
      {/* Iframe ocupa quase tudo */}
      <iframe
        key={`${current.url}-${step}`}
        src={current.url}
        className="w-full h-full border-0"
        title={current.label}
      />

      {/* Strip inferior — sutil, info do step atual + status */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-cyan-500/30 px-4 py-2 flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold">TV MODE</span>
          <span>{step + 1}/{sequence.length}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/80">{current.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {paused ? (
            <span className="text-amber-400 font-bold">PAUSADO</span>
          ) : (
            <span className="text-white/40">próxima em {intervalSec}s · espaço pausa · ← → navega</span>
          )}
        </div>
      </div>
    </div>
  )
}
