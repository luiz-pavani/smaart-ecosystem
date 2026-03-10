'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, IdCard, Loader2 } from 'lucide-react'

// Versão beta para teste visual de atualizações
const BETA_VERSION = '21'

interface AtletaDocumentosProps {
  atletaId: string
  showIdentidade?: boolean
  showCertificado?: boolean
}

export default function AtletaDocumentos({
  atletaId,
  showIdentidade = true,
  showCertificado = true,
}: AtletaDocumentosProps) {
  const [loadingIdentidade, setLoadingIdentidade] = useState(false)
  const [loadingCertificado, setLoadingCertificado] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasFontsLoaded = useRef(false)
  const pdfFontDataRef = useRef<
    { name: string; fileName: string; data: string }[] | null
  >(null)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Carrega as fontes personalizadas para uso no canvas
  const loadCanvasFonts = async () => {
    if (canvasFontsLoaded.current) return
    if (typeof document === 'undefined' || !('fonts' in document)) return

    const fonts = [
      { name: 'HighwayGothic-Regular', url: '/fonts/HighwayGothic-Regular.ttf' },
      { name: 'HighwayGothic-Condensed', url: '/fonts/HighwayGothic-Condensed-Regular.ttf' },
    ]

    await Promise.all(
      fonts.map(async ({ name, url }) => {
        try {
          const font = new FontFace(name, `url(${url})`)
          await font.load()
          document.fonts.add(font)
        } catch (err) {
          console.warn(`Falha ao carregar fonte ${name} (${url}). Usando fallback.`, err)
        }
      })
    )

    canvasFontsLoaded.current = true
  }

  // Busca e guarda as fontes para o PDF (jsPDF)
  const loadPdfFontData = async () => {
    if (pdfFontDataRef.current) return pdfFontDataRef.current

    const fonts = [
      {
        name: 'HighwayGothic',
        fileName: 'HighwayGothic-Regular.ttf',
        url: '/fonts/HighwayGothic-Regular.ttf',
      },
      {
        name: 'HighwayGothicCondensed',
        fileName: 'HighwayGothic-Condensed-Regular.ttf',
        url: '/fonts/HighwayGothic-Condensed-Regular.ttf',
      },
    ]

    const fontEntries: { name: string; fileName: string; data: string }[] = []

    for (const font of fonts) {
      try {
        const res = await fetch(font.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = await res.arrayBuffer()
        const uint8 = new Uint8Array(buffer)
        let binary = ''
        uint8.forEach((b) => {
          binary += String.fromCharCode(b)
        })
        const base64 = btoa(binary)
        fontEntries.push({ name: font.name, fileName: font.fileName, data: base64 })
      } catch (err) {
        console.warn(`Falha ao buscar fonte ${font.name} (${font.url}). Usando helvetica.`, err)
      }
    }

    pdfFontDataRef.current = fontEntries
    return fontEntries
  }

  const registerPdfFonts = async (doc: any) => {
    const fonts = await loadPdfFontData()
    fonts.forEach(({ name, fileName, data }) => {
      doc.addFileToVFS(fileName, data)
      doc.addFont(fileName, name, 'normal')
    })

    return fonts
  }

  const resolveAssetUrl = (asset?: string | null) => {
    if (!asset) return ''
    if (/^https?:\/\//i.test(asset)) return asset

    const normalized = asset.replace(/^\/+/, '')
    if (normalized.startsWith('storage/v1/object/')) {
      return supabaseUrl ? `${supabaseUrl}/${normalized}` : `/${normalized}`
    }

    return supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${normalized}`
      : `/${normalized}`
  }

  const fitImageInBox = (
    imageWidth: number,
    imageHeight: number,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number
  ) => {
    const safeBoxWidth = Math.max(1, boxWidth)
    const safeBoxHeight = Math.max(1, boxHeight)
    const scale = Math.min(safeBoxWidth / imageWidth, safeBoxHeight / imageHeight)
    const drawWidth = imageWidth * scale
    const drawHeight = imageHeight * scale
    const drawX = boxX + (safeBoxWidth - drawWidth) / 2
    const drawY = boxY + (safeBoxHeight - drawHeight) / 2

    return { drawX, drawY, drawWidth, drawHeight }
  }

  const gerarIdentidade = async () => {
    try {
      setLoadingIdentidade(true)

      // 1. Buscar dados do atleta
      const response = await fetch(`/api/atletas/${atletaId}/identidade`)
      if (!response.ok) throw new Error('Erro ao buscar dados')
      
      const data = await response.json()
      const { atleta, academiaLogo, template } = data

      await loadCanvasFonts()

      // 2. Criar canvas
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Dimensões conforme template (3000x4782px)
      const width = template.field_config?.width || 3000
      const height = template.field_config?.height || 4782
      canvas.width = width
      canvas.height = height

      // 3. Carregar e desenhar fundo
      try {
        const background = new Image()
        background.crossOrigin = 'anonymous'
        
        await new Promise((resolve) => {
          background.onload = resolve
          background.onerror = () => resolve(null) // Ignorar erro de fundo
          background.src = resolveAssetUrl(template.background_url) || '/identidade-fundo.png'
        })

        if (background.complete && background.naturalWidth) {
          ctx.drawImage(background, 0, 0, width, height)
        }
      } catch (err) {
        console.warn('Erro ao carregar fundo da identidade:', err)
        // Continua mesmo sem fundo - desenhar fundo branco como fallback
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }

      // 4. Configurar fonte e cores
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#FFFFFF'

      // Helper para desenhar texto com rotação, alinhamento e letterSpacing
      const drawText = (text: string, fieldConfig: any) => {
        if (!fieldConfig) return
        
        ctx.save()
        const fontSize = fieldConfig.fontSize || 24
        const fontWeight = fieldConfig.fontWeight || 'normal'
        const fontFamily = fieldConfig.fontFamily || 'HighwayGothic-Regular, Arial'
        const color = fieldConfig.color || '#FFFFFF'
        const align = fieldConfig.align || 'left'
        const rotation = fieldConfig.rotation || 0
        const letterSpacing = fieldConfig.letterSpacing !== undefined ? fieldConfig.letterSpacing : 0
        
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
        ctx.fillStyle = color
        ctx.textAlign = align
        
        // Se tem rotação, usar translate/rotate
        if (rotation) {
          ctx.translate(fieldConfig.x, fieldConfig.y)
          ctx.rotate((rotation * Math.PI) / 180)
          
          // Desenhar com letterSpacing
          if (letterSpacing === 0) {
            // Sem espaçamento extra, desenhar normalmente
            ctx.fillText(text, 0, 0)
          } else {
            // Com letterSpacing, desenhar caractere por caractere
            let xPos = 0
            for (let i = 0; i < text.length; i++) {
              ctx.fillText(text[i], xPos, 0)
              xPos += ctx.measureText(text[i]).width + letterSpacing
            }
          }
        } else {
          // Sem rotação, usar posição direta
          let xPos = fieldConfig.x
          
          if (letterSpacing === 0) {
            // Sem espaçamento extra, desenhar normalmente
            ctx.fillText(text, xPos, fieldConfig.y)
          } else {
            // Com letterSpacing, desenhar caractere por caractere
            for (let i = 0; i < text.length; i++) {
              ctx.fillText(text[i], xPos, fieldConfig.y)
              xPos += ctx.measureText(text[i]).width + letterSpacing
            }
          }
        }
        
        ctx.restore()
      }

      // 5. Desenhar campos dinâmicos
      const config = template.field_config || {}

      // Logo da Academia (desenhar antes dos textos)
      if (academiaLogo && config.logo_academia) {
        const logo = new Image()
        logo.crossOrigin = 'anonymous'
        
        await new Promise((resolve) => {
          logo.onload = resolve
          logo.onerror = () => resolve(null)
          logo.src = resolveAssetUrl(academiaLogo)
        })

        if (logo.complete && logo.naturalWidth) {
          const boxX = config.logo_academia.x || 400
          const boxY = config.logo_academia.y || 300
          const maxArea = config.logo_academia.width || 750
          const { drawX, drawY, drawWidth, drawHeight } = fitImageInBox(
            logo.naturalWidth,
            logo.naturalHeight,
            boxX,
            boxY,
            maxArea,
            maxArea
          )

          ctx.drawImage(
            logo,
            drawX,
            drawY,
            drawWidth,
            drawHeight
          )
        }
      }

      // Desenhar todos os campos de texto
      drawText(
        String(atleta.nome || '').toLocaleUpperCase('pt-BR'),
        {
          ...config.nome,
          fontFamily: 'HighwayGothic-Condensed, HighwayGothic-Regular, Arial',
          align: 'right',
          rotation: -45,
        }
      )
      
      // Labels
      drawText(config.data_nascimento_label?.text || 'DATA DE NASCIMENTO', { ...config.data_nascimento_label, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      drawText(String(atleta.dataNascimento || '').toLocaleUpperCase('pt-BR'), { ...config.data_nascimento, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      
      drawText(config.graduacao_label?.text || 'GRADUAÇÃO', { ...config.graduacao_label, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      drawText(String(atleta.graduacao || '').toLocaleUpperCase('pt-BR'), { ...config.graduacao, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      
      drawText(config.nivel_arbitragem_label?.text || 'NÍVEL DE ARBITRAGEM', { ...config.nivel_arbitragem_label, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      drawText(String(atleta.nivelArbitragem || '').toLocaleUpperCase('pt-BR'), { ...config.nivel_arbitragem, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      
      drawText(config.validade_label?.text || 'VALIDADE', { ...config.validade_label, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })
      drawText(String(atleta.validade || '').toLocaleUpperCase('pt-BR'), { ...config.validade, fontFamily: 'HighwayGothic-Regular, Arial', align: 'right' })

      // 6. Download
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `identidade-${atleta.nome.toLowerCase().replace(/\s+/g, '-')}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')

    } catch (error) {
      console.error('Erro ao gerar identidade:', error)
      alert('Erro ao gerar identidade. Tente novamente.')
    } finally {
      setLoadingIdentidade(false)
    }
  }

  const gerarCertificado = async () => {
    try {
      setLoadingCertificado(true)

      // 1. Buscar dados do atleta
      const response = await fetch(`/api/atletas/${atletaId}/certificado`)
      if (!response.ok) throw new Error('Erro ao buscar dados')
      
      const data = await response.json()
      const { atleta, academiaLogo, template } = data

      // 2. Importar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf')

      // 3. Criar PDF (landscape A4)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      })

      const registeredFonts = await registerPdfFonts(doc)
      const hasRegular = registeredFonts.some((f) => f.name === 'HighwayGothic')
      const hasCondensed = registeredFonts.some((f) => f.name === 'HighwayGothicCondensed')
      const pdfFontRegular = hasRegular ? 'HighwayGothic' : 'helvetica'
      const pdfFontCondensed = hasCondensed ? 'HighwayGothicCondensed' : pdfFontRegular

      const width = doc.internal.pageSize.getWidth()
      const height = doc.internal.pageSize.getHeight()

      // 4. Adicionar imagem de fundo
      try {
        const imgData = await loadImageAsBase64(resolveAssetUrl(template.background_url) || '/certificado-fundo.png')
        doc.addImage(imgData, 'PNG', 0, 0, width, height)
      } catch (err) {
        console.warn('Erro ao carregar fundo:', err)
      }

      // 5. Adicionar textos
      const config = template.field_config || {}

      const fitFontSize = (
        text: string,
        baseSize: number,
        minSize: number,
        maxWidth: number,
        fontName: string
      ) => {
        let currentSize = baseSize
        doc.setFont(fontName, 'normal')
        doc.setFontSize(currentSize)

        while (doc.getTextWidth(text) > maxWidth && currentSize > minSize) {
          currentSize -= 1
          doc.setFontSize(currentSize)
        }

        return currentSize
      }

      doc.setTextColor(255, 255, 255)

      // Nome
      if (config.nome) {
        const nomeX = config.nome.x || width / 2
        const nomeY = 330
        const nomeMaxWidth = config.nome.maxWidth || 760
        const nomeFontSize = fitFontSize(
          atleta.nome,
          Math.min(config.nome.fontSize || 64, 58),
          40,
          nomeMaxWidth,
          pdfFontCondensed
        )

        doc.setFontSize(nomeFontSize)
        doc.setFont(pdfFontCondensed, 'normal')
        doc.text(
          atleta.nome,
          nomeX,
          nomeY,
          { align: config.nome.align || 'center' }
        )
      }

      // Label "GRADUAÇÃO"
      if (config.graduacao_label) {
        doc.setFontSize(config.graduacao_label.fontSize || 24)
        doc.setFont(pdfFontRegular, 'normal')
        doc.setTextColor(255, 255, 255)
        doc.text(
          config.graduacao_label.text || 'GRADUAÇÃO',
          config.graduacao_label.x || width / 2,
          420,
          { align: config.graduacao_label.align || 'center' }
        )
      }

      // Graduação (valor)
      if (config.graduacao) {
        const graduacaoX = config.graduacao.x || 530
        const graduacaoY = 470
        const graduacaoMaxWidth = config.graduacao.maxWidth || 620
        const graduacaoFontSize = fitFontSize(
          atleta.graduacao,
          config.graduacao.fontSize || 52,
          36,
          graduacaoMaxWidth,
          pdfFontRegular
        )

        doc.setFontSize(graduacaoFontSize)
        doc.setFont(pdfFontRegular, 'normal')
        doc.text(
          atleta.graduacao,
          graduacaoX,
          graduacaoY,
          { align: config.graduacao.align || 'center' }
        )
      }

      // Logo da Academia
      if (academiaLogo && config.logo_academia) {
        try {
          const logoData = await loadImageAsBase64(resolveAssetUrl(academiaLogo))
          const boxX = config.logo_academia.x || 860
          const boxY = config.logo_academia.y || 500
          const boxWidth = config.logo_academia.width || 180
          const boxHeight = config.logo_academia.height || 180
          const logoImg = new Image()
          logoImg.src = logoData

          await new Promise((resolve) => {
            logoImg.onload = resolve
            logoImg.onerror = () => resolve(null)
          })

          const naturalWidth = logoImg.naturalWidth || boxWidth
          const naturalHeight = logoImg.naturalHeight || boxHeight
          const { drawX, drawY, drawWidth, drawHeight } = fitImageInBox(
            naturalWidth,
            naturalHeight,
            boxX,
            boxY,
            boxWidth,
            boxHeight
          )

          doc.addImage(
            logoData,
            'PNG',
            drawX,
            drawY,
            drawWidth,
            drawHeight
          )
        } catch (err) {
          console.warn('Erro ao carregar logo academia:', err)
        }
      }

      // Assinatura "PRESIDENTE"
      if (config.presidente) {
        doc.setFontSize(config.presidente.fontSize || 16)
        doc.setFont(pdfFontRegular, 'normal')
        doc.setTextColor(150, 150, 150)
        
        // Linha para assinatura
        const lineY = config.presidente.y - 10
        doc.setDrawColor(200, 200, 200)
        doc.line(config.presidente.x - 100, lineY, config.presidente.x + 100, lineY)
        
        doc.text(
          config.presidente.text || 'PRESIDENTE',
          config.presidente.x || 540,
          config.presidente.y || 640,
          { align: config.presidente.align || 'center' }
        )
        
        // Restaurar cor para branco (caso haja mais textos depois)
        doc.setTextColor(255, 255, 255)
      }

      // 6. Download
      doc.save(`certificado-${atleta.nome.toLowerCase().replace(/\s+/g, '-')}.pdf`)

    } catch (error) {
      console.error('Erro ao gerar certificado:', error)
      alert('Erro ao gerar certificado. Tente novamente.')
    } finally {
      setLoadingCertificado(false)
    }
  }

  // Helper para carregar imagem como base64
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context não disponível'))
          return
        }
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Documentos</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showIdentidade && (
          <button
            onClick={gerarIdentidade}
            disabled={loadingIdentidade}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingIdentidade ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <IdCard className="w-5 h-5" />
                Baixar Identidade Esportiva (v{BETA_VERSION})
              </>
            )}
          </button>
        )}

        {showCertificado && (
          <button
            onClick={gerarCertificado}
            disabled={loadingCertificado}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingCertificado ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Baixar Certificado de Graduação
              </>
            )}
          </button>
        )}
      </div>

      {/* Canvas oculto para geração de imagens */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
