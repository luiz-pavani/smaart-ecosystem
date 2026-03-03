'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, IdCard, Loader2 } from 'lucide-react'

interface AtletaDocumentosProps {
  atletaId: number
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

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

  const gerarIdentidade = async () => {
    try {
      setLoadingIdentidade(true)

      // 1. Buscar dados do atleta
      const response = await fetch(`/api/atletas/${atletaId}/identidade`)
      if (!response.ok) throw new Error('Erro ao buscar dados')
      
      const data = await response.json()
      const { atleta, academiaLogo, template } = data

      // 2. Criar canvas
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Dimensões padrão (ajustar conforme template real)
      const width = template.width || 768
      const height = template.height || 1280
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

      // Helper para desenhar texto com rotação
      const drawText = (text: string, fieldConfig: any) => {
        if (!fieldConfig) return
        
        ctx.save()
        ctx.font = `${fieldConfig.fontWeight || 'normal'} ${fieldConfig.fontSize || 24}px ${fieldConfig.fontFamily || 'Arial'}`
        ctx.fillStyle = fieldConfig.color || '#FFFFFF'
        ctx.textAlign = fieldConfig.align || 'left'
        
        if (fieldConfig.rotation) {
          ctx.translate(fieldConfig.x, fieldConfig.y)
          ctx.rotate((fieldConfig.rotation * Math.PI) / 180)
          ctx.fillText(text, 0, 0, fieldConfig.maxWidth)
        } else {
          ctx.fillText(text, fieldConfig.x, fieldConfig.y, fieldConfig.maxWidth)
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
          ctx.drawImage(
            logo,
            config.logo_academia.x || 150,
            config.logo_academia.y || 130,
            config.logo_academia.width || 200,
            config.logo_academia.height || 200
          )
        }
      }

      // Desenhar todos os campos de texto
      drawText(atleta.nome, config.nome)
      drawText(atleta.academia, config.academia)
      drawText(atleta.dataNascimento, config.data_nascimento)
      drawText(atleta.graduacao, config.graduacao)
      drawText(atleta.nivelArbitragem, config.nivel_arbitragem)
      drawText(atleta.validade, config.validade)

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
        style: 'normal' | 'bold' | 'italic' = 'normal'
      ) => {
        let currentSize = baseSize
        doc.setFont('helvetica', style)
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
          'bold'
        )

        doc.setFontSize(nomeFontSize)
        doc.setFont('helvetica', 'bold')
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
        doc.setFont('helvetica', 'italic')
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
          'bold'
        )

        doc.setFontSize(graduacaoFontSize)
        doc.setFont('helvetica', 'bold')
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
          doc.addImage(
            logoData,
            'PNG',
            config.logo_academia.x || 860,
            config.logo_academia.y || 500,
            config.logo_academia.width || 180,
            config.logo_academia.height || 180
          )
        } catch (err) {
          console.warn('Erro ao carregar logo academia:', err)
        }
      }

      // Assinatura "PRESIDENTE"
      if (config.presidente) {
        doc.setFontSize(config.presidente.fontSize || 16)
        doc.setFont('helvetica', 'italic')
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
                Baixar Identidade Esportiva
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
