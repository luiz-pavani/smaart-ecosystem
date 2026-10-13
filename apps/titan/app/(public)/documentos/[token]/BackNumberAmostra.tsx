'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { ensureFonts, generateBN, loadImg, type BNDados } from '@/lib/backnumber/render'

/** Amostra do back number em resolução de tela, com marca d'água (não serve para impressão). */
export default function BackNumberAmostra({ dados, fundoUrl }: { dados: BNDados; fundoUrl: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let atual: string | null = null
    ;(async () => {
      try {
        await ensureFonts()
        let fundo: HTMLImageElement | null = null
        if (fundoUrl) {
          try { fundo = await loadImg(fundoUrl) } catch { /* sem fundo: desenho padrão */ }
        }
        const blob = await generateBN(dados, fundo, { dimensao: 1000, marcaDagua: 'AMOSTRA' })
        atual = URL.createObjectURL(blob)
        setUrl(atual)
      } catch {
        setErro(true)
      }
    })()
    return () => { if (atual) URL.revokeObjectURL(atual) }
  }, [dados, fundoUrl])

  if (erro) return <p className="text-sm text-slate-500">Não foi possível gerar a amostra neste navegador.</p>
  if (!url) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Amostra do back number de ${dados.nome_patch}`} className="w-full max-w-sm rounded-lg border border-slate-200" />
      <a href={url} download="back-number-amostra.jpg" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        <Download className="h-4 w-4" /> Baixar amostra
      </a>
    </div>
  )
}
