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
  doc.setFontSize(18)
  doc.text(federacao.nome_completo, 105, 52, { align: 'center' })

  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
  doc.setLineWidth(0.4)
  doc.line(25, 58, 185, 58)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(corSecundaria[0], corSecundaria[1], corSecundaria[2])
  doc.setFontSize(18)
  doc.text('CERTIFICADO DE FILIAÇÃO', 105, 70, { align: 'center' })
  doc.text('E AUTORIZAÇÃO DE FUNCIONAMENTO', 105, 78, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(corTexto[0], corTexto[1], corTexto[2])
  doc.setFontSize(11)

  const texto1 = `A ${federacao.nome_completo}, no uso de suas atribuições legais e estatutárias, CERTIFICA que a academia abaixo descrita encontra-se devidamente filiada e autorizada a funcionar e a promover a prática do judô.`
  const texto2 = `Academia: ${academia.nome}${academia.sigla ? ` (${academia.sigla})` : ''}`
  const texto3 = `Responsável: ${academia.responsavel_nome || 'Não informado'}`
  const texto4 = `Localidade: ${localidade || 'Não informada'}`
  const texto5 = `Este certificado atesta a regularidade cadastral e estatutária da academia perante esta entidade oficial de regulação do esporte e possui validade até ${validadeFormatada}.`
  const texto6 = `Emitido em ${dataFormatada}.`

  const bloco = [texto1, '', '', texto3, '', texto4, '', texto5, '', texto6].filter(Boolean)

  let y = 94
  bloco.forEach((linha, index) => {
    if (index === 2) {
      doc.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
      doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2])
      doc.roundedRect(24, y - 5, 162, 13, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(texto2, 105, y + 3, { align: 'center' })
      doc.setTextColor(corTexto[0], corTexto[1], corTexto[2])
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      y += 16
      return
    }

    const linhas = doc.splitTextToSize(linha, 155)
    doc.text(linhas, 27, y)
    y += linhas.length * 6
  })

  doc.setDrawColor(corSecundaria[0], corSecundaria[1], corSecundaria[2])
  doc.line(70, 238, 140, 238)
  doc.setFontSize(10)
  doc.text(federacao.nome_completo, 105, 244, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Registro: ${numeroRegistro}`, 105, 250, { align: 'center' })

  // Dados cadastrais da federação no rodapé
  const linhaCnpj = federacao.cnpj ? `CNPJ: ${federacao.cnpj}` : 'CNPJ: Não informado'
  const linhaFundacao = `Data de Fundação: ${fundacaoFormatada}`
  const linhaEndereco = enderecoFederacaoSemCidade ? `Endereço: ${enderecoFederacaoSemCidade}` : 'Endereço: Não informado'

  const rodapeLinhas: string[] = [
    linhaCnpj,
    linhaFundacao,
    linhaEndereco,
    'Documento gerado eletronicamente pela plataforma SMAART.',
  ].filter((linha): linha is string => Boolean(linha))

  let rodapeY = 257
  rodapeLinhas.forEach((linha) => {
    const partes = doc.splitTextToSize(linha, 170)
    doc.text(partes, 105, rodapeY, { align: 'center' })
    rodapeY += partes.length * 4.5
  })

  const nomeArquivo = `Certificado_Filiacao_${academia.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(nomeArquivo)
}
