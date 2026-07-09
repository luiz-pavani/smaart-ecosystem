/* eslint-disable jsx-a11y/alt-text */
import React from 'react'
import { Document, Page, View, Text, Image, Font } from '@react-pdf/renderer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

let fontsRegistered = false
export function ensureFontsRegistered() {
  if (fontsRegistered) return
  try {
    Font.register({
      family: 'HighwayGothic',
      src: `${APP_URL}/fonts/HighwayGothic-Regular.ttf`,
    })
    Font.register({
      family: 'HighwayGothicCondensed',
      src: `${APP_URL}/fonts/HighwayGothic-Condensed-Regular.ttf`,
    })
    fontsRegistered = true
  } catch { /* ignore */ }
}

const sanitize = (s: string) => (s || '').replace(/ū/g, 'u').replace(/Ū/g, 'U')

export interface CertificadoProps {
  atleta: {
    nome: string
    graduacao: string
    ano: string
  }
  backgroundUrl: string
  academiaLogoUrl?: string | null
  templateWidth?: number
  templateHeight?: number
  fieldConfig?: Record<string, {
    x?: number; y?: number;
    fontSize?: number; maxWidth?: number;
    width?: number; height?: number;
  }>
}

// A4 landscape em pt
const A4_LANDSCAPE_W = 841.89
const A4_LANDSCAPE_H = 595.28

function autoFit(baseSize: number, text: string, maxChars: number, minSize: number): number {
  if (!text || text.length <= maxChars) return baseSize
  return Math.max(minSize, Math.floor(baseSize * (maxChars / text.length)))
}

export default function CertificadoAtletaDocument(props: CertificadoProps) {
  ensureFontsRegistered()

  const {
    atleta,
    backgroundUrl,
    academiaLogoUrl,
    templateWidth = 1058,
    templateHeight = 794,
    fieldConfig = {},
  } = props

  const scaleX = A4_LANDSCAPE_W / templateWidth
  const scaleY = A4_LANDSCAPE_H / templateHeight

  const nomeCfg = fieldConfig.nome || { x: 529, y: 345, fontSize: 64 }
  const gradCfg = fieldConfig.graduacao || { x: 529, y: 525, fontSize: 44 }
  const logoCfg = fieldConfig.logo_academia || { x: 810, y: 570, width: 180, height: 180 }

  const nomeUpper = (atleta.nome || '').toUpperCase()
  const gradText = sanitize(atleta.graduacao || '')

  const nomeFontSize = autoFit(Math.min(nomeCfg.fontSize || 64, 58), nomeUpper, 22, 30)
  const gradFontSize = autoFit(gradCfg.fontSize || 44, gradText, 30, 24)

  const nomeBaselineY = (nomeCfg.y || 345) * scaleY
  const gradBaselineY = (gradCfg.y || 525) * scaleY

  const fontFamily = 'HighwayGothicCondensed'

  return (
    <Document>
      <Page size={[A4_LANDSCAPE_W, A4_LANDSCAPE_H]} wrap={false} style={{ padding: 0 }}>
        {/* Container fixo do tamanho da página. Todos elementos absolute vivem AQUI DENTRO
            — assim o engine sabe que fazem parte da mesma superfície. */}
        <View
          style={{
            position: 'relative',
            width: A4_LANDSCAPE_W,
            height: A4_LANDSCAPE_H,
            overflow: 'hidden',
          }}
        >
          {/* Background */}
          <Image
            src={backgroundUrl}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: A4_LANDSCAPE_W,
              height: A4_LANDSCAPE_H,
            }}
          />

          {/* Nome */}
          <Text
            style={{
              position: 'absolute',
              left: 0,
              top: nomeBaselineY - nomeFontSize * 0.85,
              width: A4_LANDSCAPE_W,
              textAlign: 'center',
              color: '#FFFFFF',
              fontSize: nomeFontSize,
              fontFamily,
              lineHeight: 1,
            }}
          >
            {nomeUpper}
          </Text>

          {/* Graduação */}
          <Text
            style={{
              position: 'absolute',
              left: 0,
              top: gradBaselineY - gradFontSize * 0.85,
              width: A4_LANDSCAPE_W,
              textAlign: 'center',
              color: '#FFFFFF',
              fontSize: gradFontSize,
              fontFamily,
              lineHeight: 1,
            }}
          >
            {gradText}
          </Text>

          {/* Logo academia */}
          {academiaLogoUrl && (
            <Image
              src={academiaLogoUrl}
              style={{
                position: 'absolute',
                left: (logoCfg.x || 810) * scaleX,
                top: (logoCfg.y || 570) * scaleY,
                width: (logoCfg.width || 180) * scaleX,
                height: (logoCfg.height || 180) * scaleY,
                objectFit: 'contain',
              }}
            />
          )}
        </View>
      </Page>
    </Document>
  )
}
