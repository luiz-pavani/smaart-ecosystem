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
      const background = new Image()
      background.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        background.onload = resolve
        background.onerror = reject
        background.src = template.background_url || '/identidade-fundo.png'
      })

      ctx.drawImage(background, 0, 0, width, height)

      // 4. Configurar fonte e cores
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#FFFFFF'

      // 5. Desenhar campos dinâmicos
      const config = template.field_config || {}

      // Nome
      if (config.nome) {
        ctx.font = `${config.nome.fontWeight || 'bold'} ${config.nome.fontSize || 40}px ${config.nome.fontFamily || 'Arial'}`
        ctx.fillStyle = config.nome.color || '#FFFFFF'
        ctx.textAlign = config.nome.align || 'center'
        ctx.fillText(atleta.nome, config.nome.x || width / 2, config.nome.y || 340, config.nome.maxWidth || 500)
      }

      // Academia
      if (config.academia) {
        ctx.font = `${config.academia.fontSize || 24}px ${config.academia.fontFamily || 'Arial'}`
        ctx.fillStyle = config.academia.color || '#FFFFFF'
        ctx.textAlign = config.academia.align || 'center'
        ctx.fillText(atleta.academia, config.academia.x || width / 2, config.academia.y || 420, config.academia.maxWidth || 500)
      }

      // Data de Nascimento
      if (config.data_nascimento) {
        ctx.font = `${config.data_nascimento.fontWeight || 'bold'} ${config.data_nascimento.fontSize || 28}px ${config.data_nascimento.fontFamily || 'Arial'}`
        ctx.fillStyle = config.data_nascimento.color || '#FFFFFF'
        ctx.textAlign = config.data_nascimento.align || 'left'
        ctx.fillText(atleta.dataNascimento, config.data_nascimento.x || 545, config.data_nascimento.y || 640)
      }

      // Graduação
      if (config.graduacao) {
        ctx.font = `${config.graduacao.fontWeight || 'bold'} ${config.graduacao.fontSize || 28}px ${config.graduacao.fontFamily || 'Arial'}`
        ctx.fillStyle = config.graduacao.color || '#FFFFFF'
        ctx.textAlign = config.graduacao.align || 'left'
        ctx.fillText(atleta.graduacao, config.graduacao.x || 545, config.graduacao.y || 770)
      }

      // Nível de Arbitragem
      if (config.nivel_arbitragem) {
        ctx.font = `${config.nivel_arbitragem.fontWeight || 'bold'} ${config.nivel_arbitragem.fontSize || 32}px ${config.nivel_arbitragem.fontFamily || 'Arial'}`
        ctx.fillStyle = config.nivel_arbitragem.color || '#FFFFFF'
        ctx.textAlign = config.nivel_arbitragem.align || 'center'
        ctx.fillText(atleta.nivelArbitragem, config.nivel_arbitragem.x || 545, config.nivel_arbitragem.y || 905)
      }

      // Validade
      if (config.validade) {
        ctx.font = `${config.validade.fontWeight || 'bold'} ${config.validade.fontSize || 28}px ${config.validade.fontFamily || 'Arial'}`
        ctx.fillStyle = config.validade.color || '#FFFFFF'
        ctx.textAlign = config.validade.align || 'left'
        ctx.fillText(atleta.validade, config.validade.x || 545, config.validade.y || 1140)
      }

      // Logo da Academia (se houver)
      if (academiaLogo && config.logo_academia) {
        const logo = new Image()
        logo.crossOrigin = 'anonymous'
        
        await new Promise((resolve, reject) => {
          logo.onload = resolve
          logo.onerror = () => resolve(null) // Ignorar erro de logo
          logo.src = academiaLogo
        })

        if (logo.complete) {
          ctx.drawImage(
            logo,
            config.logo_academia.x || 230,
            config.logo_academia.y || 180,
            config.logo_academia.width || 120,
            config.logo_academia.height || 120
          )
        }
      }

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
        const imgData = await loadImageAsBase64(template.background_url || '/certificado-fundo.png')
        doc.addImage(imgData, 'PNG', 0, 0, width, height)
      } catch (err) {
        console.warn('Erro ao carregar fundo:', err)
      }

      // 5. Adicionar textos
      const config = template.field_config || {}

      doc.setTextColor(255, 255, 255)

      // Nome
      if (config.nome) {
        doc.setFontSize(config.nome.fontSize || 48)
        doc.setFont('helvetica', 'bold')
        doc.text(
          atleta.nome,
          config.nome.x || width / 2,
          config.nome.y || 345,
          { align: config.nome.align || 'center', maxWidth: config.nome.maxWidth || 700 }
        )
      }

      // Graduação
      if (config.graduacao) {
        doc.setFontSize(config.graduacao.fontSize || 36)
        doc.setFont('helvetica', 'normal')
        doc.text(
          atleta.graduacao,
          config.graduacao.x || width / 2,
          config.graduacao.y || 480,
          { align: config.graduacao.align || 'center' }
        )
      }

      // Ano
      if (config.ano) {
        doc.setFontSize(config.ano.fontSize || 64)
        doc.setFont('helvetica', 'normal')
        doc.text(
          atleta.ano,
          config.ano.x || width - 100,
          config.ano.y || 130,
          { align: config.ano.align || 'right' }
        )
      }

      // Logo da Academia
      if (academiaLogo && config.logo_academia) {
        try {
          const logoData = await loadImageAsBase64(academiaLogo)
          doc.addImage(
            logoData,
            'PNG',
            config.logo_academia.x || 880,
            config.logo_academia.y || 520,
            config.logo_academia.width || 140,
            config.logo_academia.height || 140
          )
        } catch (err) {
          console.warn('Erro ao carregar logo:', err)
        }
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
