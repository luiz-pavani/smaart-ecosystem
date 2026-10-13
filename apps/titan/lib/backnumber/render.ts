/**
 * Back number (patch das costas) desenhado em canvas no navegador.
 * Usado pela geração em lote da federação e pela amostra na página de entrega de documentos.
 * Só roda no browser (canvas, FontFace, Image).
 */

/** Dados mínimos para desenhar um back number. */
export interface BNDados {
  nome_completo: string
  nome_patch: string
  academia: string
  sigla: string
  tamanho: 'P' | 'M' | 'G'
  cor: 'AZUL' | 'ROSA'
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE IMPRESSÃO
// Template base: quadrado a 300 DPI — fundo master = G (4843×4843px)
//   G = 41×41cm = 4843×4843px  (fundo master)
//   M = 37×37cm = 4370×4370px  (escala do G)
//   P = 30×30cm = 3543×3543px  (escala do G)
//
// FONTES: faça upload dos arquivos .ttf para o Supabase Storage e preencha:
export const FONT_CONDENSED_URL = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/fonts/highway-gothic-condensed.ttf'
export const FONT_EXPANDED_URL  = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/fundos/fonts/highway-gothic-expanded.ttf'
// ─────────────────────────────────────────────────────────────────────────────

const PX_PER_CM = 300 / 2.54   // ≈ 118.11px/cm  (300 DPI)
const PX_PER_MM = 300 / 25.4   // ≈ 11.811px/mm

// G é o fundo master (4843px). M e P escalam proporcionalmente.
const SIZE_PX: Record<string, number> = {
  G: 4843,                         // 41cm @ 300DPI (fundo master)
  M: Math.round(37 * PX_PER_CM),  // 4370px
  P: Math.round(30 * PX_PER_CM),  // 3543px
}

export const TOP_COLORS: Record<string, string> = {
  AZUL: '#0030a4',
  ROSA: '#ca44cb',
}

const F_CONDENSED = `'Highway Gothic Condensed', 'Arial Narrow', Arial, sans-serif`
const F_EXPANDED  = `'Highway Gothic Expanded', Arial, 'Helvetica Neue', sans-serif`

// Posições e fontes calibradas no fundo master G (4843×4843px)
// Todos os valores escalam proporcionalmente para M e P.
const G_LAYOUT = {
  nome:     { x: 2430, y: 610,  fontMM: 55,  font: F_CONDENSED, color: '#ffffff' as const },
  sigla:    { x: 2430, y: 2000, fontMM: 110, font: F_EXPANDED,  color: null /* accent */ },
  academia: { x: 2430, y: 2700, fontMM: 11,  font: F_EXPANDED,  color: null /* accent */ },
}

function buildLayout(size: string, cor: string) {
  const dim    = SIZE_PX[size] ?? SIZE_PX.G
  const s      = dim / SIZE_PX.G          // escala relativa ao fundo master G
  const accent = TOP_COLORS[cor] ?? TOP_COLORS.AZUL

  const field = (key: keyof typeof G_LAYOUT) => {
    const g = G_LAYOUT[key]
    const fPx = Math.round(g.fontMM * PX_PER_MM * s)
    return {
      x:           Math.round(g.x * s),
      y:           Math.round(g.y * s),
      font:        `${fPx}px ${g.font}`,
      color:       g.color ?? accent,
      letterSpacing: '0px',
      maxWidth:    Math.round(dim * 0.92),
    }
  }

  return { dim, nome: field('nome'), sigla: field('sigla'), academia: field('academia') }
}


// ─── Cache de imagens / fontes ────────────────────────────────────────────────
const imgCache: Record<string, HTMLImageElement> = {}

export async function loadImg(url: string): Promise<HTMLImageElement> {
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
export async function ensureFonts() {
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
export async function generateBN(
  atleta: BNDados,
  bgImage: HTMLImageElement | null,
  opcoes: { dimensao?: number; marcaDagua?: string } = {},
): Promise<Blob> {
  const layout = buildLayout(atleta.tamanho, atleta.cor)
  const { dim } = layout

  // Amostra: desenha direto no tamanho pedido (evita um canvas de 23 MP no celular).
  const lado = opcoes.dimensao ?? dim
  const canvas = document.createElement('canvas')
  canvas.width  = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')!
  ctx.scale(lado / dim, lado / dim)

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

  if (opcoes.marcaDagua) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.save()
    ctx.translate(lado / 2, lado / 2)
    ctx.rotate(-Math.PI / 6)
    ctx.font = `bold ${Math.round(lado / 9)}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
    ctx.lineWidth = Math.max(2, Math.round(lado / 300))
    ctx.strokeText(opcoes.marcaDagua, 0, 0)
    ctx.fillText(opcoes.marcaDagua, 0, 0)
    ctx.restore()
  }

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob falhou')), 'image/jpeg', 0.92),
  )
}
