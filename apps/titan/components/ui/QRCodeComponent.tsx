'use client'

import { useEffect, useRef } from 'react'

interface QRCodeComponentProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  includeMargin?: boolean
  color?: string
  bgColor?: string
}

export default function QrCodeComponent({
  value,
  size = 256,
  level = 'H',
  includeMargin = true,
  color = '#000000',
  bgColor = '#ffffff',
}: QRCodeComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const generateQRCode = async () => {
      // @ts-ignore - Dynamic import
      const QRCode = (await import('qrcode')).default
      
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          errorCorrectionLevel: level,
          margin: includeMargin ? 4 : 0,
          color: {
            dark: color,
            light: bgColor
          }
        })
      }
    }

    generateQRCode()
  }, [value, size, level, includeMargin, color, bgColor])

  return <canvas ref={canvasRef} />
}
