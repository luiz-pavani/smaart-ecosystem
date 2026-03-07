import { jsPDF } from 'jspdf'

interface CertificadoData {
  academia: {
    nome: string
    sigla: string | null
    cnpj: string | null
    endereco_rua: string | null
    endereco_numero: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
    responsavel_nome: string | null
  }
  federacao: {
    nome_completo: string
    sigla: string | null
    cnpj: string | null
    data_fundacao: string | null
    cor_primaria: string | null
    cor_secundaria: string | null
    email: string | null
    telefone: string | null
    site: string | null
    logo_url: string | null
    endereco_rua: string | null
    endereco_numero: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
  }
  validade: string | null
  dataEmissao: string
  numeroRegistro: string
}

interface ImagemCarregada {
  dataUrl: string
  width: number
  height: number
}

function hexParaRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const valor = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(valor)) {
    return fallback
  }

  const r = parseInt(valor.slice(0, 2), 16)
  const g = parseInt(valor.slice(2, 4), 16)
  const b = parseInt(valor.slice(4, 6), 16)
  return [r, g, b]
}

async function carregarImagemComoDataURL(url: string): Promise<ImagemCarregada | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    const dimensoes = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const image = new Image()
      image.onload = () => {
        resolve({
          width: image.naturalWidth || 1,
          height: image.naturalHeight || 1,
        })
      }
      image.onerror = () => resolve(null)
      image.src = objectUrl
    })

    URL.revokeObjectURL(objectUrl)
    if (!dimensoes) return null

    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve({
            dataUrl: reader.result,
            width: dimensoes.width,
            height: dimensoes.height,
          })
          return
        }
        resolve(null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function gerarCertificadoPdf(certificadoData: CertificadoData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const { academia, federacao, validade, dataEmissao, numeroRegistro } = certificadoData

  const localidade = [academia.endereco_cidade, academia.endereco_estado].filter(Boolean).join(', ')
  const enderecoFederacaoSemCidade = [
    federacao.endereco_rua,
    federacao.endereco_numero,
    federacao.endereco_bairro,
    federacao.endereco_estado,
    federacao.endereco_cep,
  ].filter(Boolean).join(', ')

  const dataFormatada = new Date(dataEmissao).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const validadeFormatada = validade
    ? new Date(validade).toLocaleDateString('pt-BR')
    : 'Não informada'

  const fundacaoFormatada = federacao.data_fundacao
    ? new Date(federacao.data_fundacao).toLocaleDateString('pt-BR')
    : 'Não informada'

  const LRSJ_LOGO_URL = 'https://risvafrrbnozyjquxvzi.supabase.co/storage/v1/object/public/academias-logos/LRSJ.png'
  const logoUrlFinal = federacao.logo_url || LRSJ_LOGO_URL
  const corPrimaria = hexParaRgb(federacao.cor_primaria || '#1E40AF', [30, 64, 175])
  const corSecundaria = hexParaRgb(federacao.cor_secundaria || '#0F172A', [15, 23, 42])
  const corTexto = [51, 65, 85] as [number, number, number]

  doc.setFillColor(248, 250, 252)
  doc.rect(10, 10, 190, 277, 'F')

  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
  doc.setLineWidth(0.8)
  doc.rect(15, 15, 180, 267)

  // Logo da federação no topo, centralizado horizontalmente
  if (logoUrlFinal) {
    const logo = await carregarImagemComoDataURL(logoUrlFinal)
    if (logo) {
      const maxWidth = 34
      const maxHeight = 26
      const proporcao = logo.width / logo.height

      let logoWidth = maxWidth
      let logoHeight = logoWidth / proporcao

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight
        logoWidth = logoHeight * proporcao
      }

      const logoX = (210 - logoWidth) / 2
      const logoY = 18
      const format = logo.dataUrl.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logo.dataUrl, format, logoX, logoY, logoWidth, logoHeight)
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
  doc.setFontSize(17)
  doc.text(federacao.nome_completo, 105, 52, { align: 'center' })

  // Cabeçalho cadastral institucional (LRSJ)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9.5)
  const linhasCabecalho = [
    'CNPJ: 05.503.443/0001-19',
    'Fundada em 5 de outubro de 2001.',
    'Rua Roberto Romano, 430 - S.Maria/RS - www.lrsj.com.br'
  ]
  let yCabecalho = 58
  linhasCabecalho.forEach((linha) => {
    const partes = doc.splitTextToSize(linha, 170)
    doc.text(partes, 105, yCabecalho, { align: 'center' })
    yCabecalho += partes.length * 4.2
  })

  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
  doc.setLineWidth(0.4)
  doc.line(25, 71, 185, 71)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(18)
  doc.text('CERTIFICADO DE FILIAÇÃO', 105, 82, { align: 'center' })
  doc.setFontSize(13)
  doc.text('E AUTORIZAÇÃO DE FUNCIONAMENTO', 105, 90, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)

  const texto1 = `A ${federacao.nome_completo}, no uso de suas atribuições legais e estatutárias, CERTIFICA que a academia abaixo descrita encontra-se devidamente filiada e autorizada a funcionar e a promover a prática do judô.`
  const texto2 = academia.nome
  const texto3 = academia.responsavel_nome || 'Não informado'
  const texto4 = `Localidade: ${localidade || 'Não informada'}`
  const texto5 = `Este certificado atesta a regularidade cadastral e estatutária da academia perante esta entidade oficial de regulação do esporte e possui validade até `
  const texto6 = `Emitido em ${dataFormatada}.`

  let y = 104
  
  // Texto de certificação - justificado
  doc.setFont('helvetica', 'normal')
  const textoCert = doc.splitTextToSize(texto1, 155) as string[]
  textoCert.forEach((linha: string, idx: number) => {
    if (idx === textoCert.length - 1) {
      doc.text(linha, 27, y, { align: 'left' })
    } else {
      doc.text(linha, 27, y, { align: 'justify' })
    }
    y += 6
  })
  
  y += 4
  
  // Nome da academia em box
  doc.setFillColor(241, 245, 249)
  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
  doc.roundedRect(24, y - 5, 162, 13, 2, 2, 'FD')
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(texto2, 105, y + 3, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y += 16
  
  // Registro logo abaixo do box
  doc.setFontSize(9)
  doc.text(`Registro: ${numeroRegistro}`, 105, y, { align: 'center' })
  y += 8
  
  // Responsável em negrito
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Responsável: ${texto3}`, 27, y)
  doc.setFont('helvetica', 'normal')
  y += 6
  
  // Localidade
  doc.setFontSize(10)
  doc.text(texto4, 27, y)
  y += 8
  
  // Validade - texto com validade em negrito
  doc.setFontSize(10)
  const textoValidade = doc.splitTextToSize(texto5, 155) as string[]
  textoValidade.forEach((linha: string, idx: number) => {
    doc.text(linha, 27, y)
    y += 6
  })
  doc.setFont('helvetica', 'bold')
  doc.text(validadeFormatada, 27, y - 6)
  doc.setFont('helvetica', 'normal')
  y += 6
  
  // Emitido em
  doc.setFontSize(10)
  doc.text(texto6, 27, y)

  // Linha antes do rodapé
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.line(25, 250, 185, 250)

  // Rodapé institucional
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  const rodapeLinhas: string[] = [
    'Entidade oficial, reconhecida pela Lei Geral do Esportes e filiada a',
    'Liga Nacional de Judô • Confederação Sul-Americana de Judô',
    'União Panamericana de Judô • Federação Mundial de Judô',
  ].filter((linha): linha is string => Boolean(linha))

  let rodapeY = 257
  rodapeLinhas.forEach((linha) => {
    doc.text(linha, 105, rodapeY, { align: 'center' })
    rodapeY += 4.5
  })

  const nomeArquivo = `Certificado_Filiacao_${academia.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(nomeArquivo)
}
