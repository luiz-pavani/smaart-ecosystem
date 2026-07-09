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

export interface IdentidadeAtletaProps {
  atleta: {
    nome: string
    graduacao: string
    dataNascimento: string
    nivelArbitragem: string
    validade: string
  }
  backgroundUrl: string
  academiaLogoUrl?: string | null
  templateWidth?: number
  templateHeight?: number
  fieldConfig?: Record<string, {
    x?: number; y?: number;
    fontSize?: number; color?: string;
    align?: string; rotation?: number;
    fontFamily?: string; fontWeight?: string;
    letterSpacing?: number; text?: string;
    width?: number; height?: number;
  }>
}

// Página em pt — proporções do template LRSJ (3000×4782 ≈ 1:1.594).
// Largura A4 (595.28 pt) mantida; altura calculada pra preservar aspect ratio.
const A4_W = 595.28
const TEMPLATE_ASPECT = 4782 / 3000  // 1.594
const A4_H = Math.round(A4_W * TEMPLATE_ASPECT * 100) / 100  // ~948.85 pt

function autoFit(baseSize: number, text: string, maxChars: number, minSize: number): number {
  if (!text || text.length <= maxChars) return baseSize
  return Math.max(minSize, Math.floor(baseSize * (maxChars / text.length)))
}

export default function IdentidadeAtletaDocument(props: IdentidadeAtletaProps) {
  ensureFontsRegistered()

  const {
    atleta,
    backgroundUrl,
    academiaLogoUrl,
    templateWidth = 9000,
    templateHeight = 14346,
    fieldConfig = {},
  } = props

  const scaleX = A4_W / templateWidth
  const scaleY = A4_H / templateHeight

  const nomeCfg = fieldConfig.nome || { x: 5920, y: 2900, fontSize: 630, rotation: -45 }
  const dnCfg = fieldConfig.data_nascimento || { x: 8235, y: 6350, fontSize: 559 }
  const dnLblCfg = fieldConfig.data_nascimento_label || { x: 8235, y: 5750, fontSize: 316 }
  const gradCfg = fieldConfig.graduacao || { x: 8235, y: 8150, fontSize: 559 }
  const gradLblCfg = fieldConfig.graduacao_label || { x: 8235, y: 7550, fontSize: 316 }
  const arbCfg = fieldConfig.nivel_arbitragem || { x: 8235, y: 9950, fontSize: 559 }
  const arbLblCfg = fieldConfig.nivel_arbitragem_label || { x: 8235, y: 9350, fontSize: 316 }
  const valCfg = fieldConfig.validade || { x: 8235, y: 11750, fontSize: 559 }
  const valLblCfg = fieldConfig.validade_label || { x: 8235, y: 11150, fontSize: 316 }
  const logoCfg = fieldConfig.logo_academia || { x: 1780, y: 1080, width: 2830, height: 2830 }

  const nomeText = (atleta.nome || '').toLocaleUpperCase('pt-BR')
  const dnText = (atleta.dataNascimento || '').toLocaleUpperCase('pt-BR')
  const gradText = sanitize(atleta.graduacao || '').toLocaleUpperCase('pt-BR')
  const arbText = (atleta.nivelArbitragem || '').toLocaleUpperCase('pt-BR')
  const valText = (atleta.validade || '').toLocaleUpperCase('pt-BR')

  // Auto-fit
  const nomeSize = autoFit((nomeCfg.fontSize || 630) * scaleY, nomeText, 20, 30)
  const dnSize = (dnCfg.fontSize || 559) * scaleY
  const dnLblSize = (dnLblCfg.fontSize || 316) * scaleY
  const gradSize = autoFit((gradCfg.fontSize || 559) * scaleY, gradText, 22, 12)
  const gradLblSize = (gradLblCfg.fontSize || 316) * scaleY
  const arbSize = (arbCfg.fontSize || 559) * scaleY
  const arbLblSize = (arbLblCfg.fontSize || 316) * scaleY
  const valSize = (valCfg.fontSize || 559) * scaleY
  const valLblSize = (valLblCfg.fontSize || 316) * scaleY

  const fontFamily = 'HighwayGothicCondensed'
  const fontFamilyLabel = 'HighwayGothic'

  // Right-aligned text: precisa posicionar box com `right`
  const rightAlignedBox = (
    text: string,
    y: number,
    xAnchor: number,
    fontSize: number,
    family: string
  ) => (
    <View
      style={{
        position: 'absolute',
        right: A4_W - (xAnchor * scaleX),
        top: (y * scaleY) - fontSize * 0.15,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize, fontFamily: family, lineHeight: 1 }}>
        {text}
      </Text>
    </View>
  )

  return (
    <Document>
      <Page size={[A4_W, A4_H]} wrap={false} style={{ padding: 0 }}>
        <View
          style={{
            position: 'relative',
            width: A4_W,
            height: A4_H,
            overflow: 'hidden',
          }}
        >
          {/* Background */}
          <Image
            src={backgroundUrl}
            style={{ position: 'absolute', left: 0, top: 0, width: A4_W, height: A4_H }}
          />

          {/* Logo academia */}
          {academiaLogoUrl && (
            <Image
              src={academiaLogoUrl}
              style={{
                position: 'absolute',
                left: (logoCfg.x || 1780) * scaleX,
                top: (logoCfg.y || 1080) * scaleY,
                width: (logoCfg.width || 2830) * scaleX,
                height: (logoCfg.height || 2830) * scaleY,
                objectFit: 'contain',
              }}
            />
          )}

          {/* Nome rotacionado -45° — @react-pdf usa transform via `transform` no style */}
          <View
            style={{
              position: 'absolute',
              // Pivô: usa right-align emulando via container que se ancora em nomeCfg.x
              right: A4_W - ((nomeCfg.x || 5920) * scaleX),
              top: (nomeCfg.y || 2900) * scaleY - nomeSize * 0.5,
              transform: `rotate(-45deg)`,
              transformOrigin: 'top right',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: nomeSize,
                fontFamily,
                lineHeight: 1,
                textAlign: 'right',
              }}
            >
              {nomeText}
            </Text>
          </View>

          {/* Labels + valores (todos right-align) */}
          {rightAlignedBox('DATA DE NASCIMENTO', dnLblCfg.y || 5750, dnLblCfg.x || 8235, dnLblSize, fontFamilyLabel)}
          {dnText && rightAlignedBox(dnText, dnCfg.y || 6350, dnCfg.x || 8235, dnSize, fontFamilyLabel)}

          {rightAlignedBox('GRADUAÇÃO', gradLblCfg.y || 7550, gradLblCfg.x || 8235, gradLblSize, fontFamilyLabel)}
          {gradText && rightAlignedBox(gradText, gradCfg.y || 8150, gradCfg.x || 8235, gradSize, fontFamilyLabel)}

          {arbText && rightAlignedBox('NÍVEL DE ARBITRAGEM', arbLblCfg.y || 9350, arbLblCfg.x || 8235, arbLblSize, fontFamilyLabel)}
          {arbText && rightAlignedBox(arbText, arbCfg.y || 9950, arbCfg.x || 8235, arbSize, fontFamilyLabel)}

          {rightAlignedBox('VALIDADE', valLblCfg.y || 11150, valLblCfg.x || 8235, valLblSize, fontFamilyLabel)}
          {valText && rightAlignedBox(valText, valCfg.y || 11750, valCfg.x || 8235, valSize, fontFamilyLabel)}
        </View>
      </Page>
    </Document>
  )
}
