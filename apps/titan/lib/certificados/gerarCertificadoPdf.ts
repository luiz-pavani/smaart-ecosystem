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

async function carregarImagemComoDataURL(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()

    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
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
  const enderecoFederacao = [
    federacao.endereco_rua,
    federacao.endereco_numero,
    federacao.endereco_bairro,
    federacao.endereco_cidade,
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

  doc.setFillColor(248, 250, 252)
  doc.rect(10, 10, 190, 277, 'F')

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.8)
  doc.rect(15, 15, 180, 267)

  // Logo da federação no topo, centralizado horizontalmente
  if (federacao.logo_url) {
    const logoDataUrl = await carregarImagemComoDataURL(federacao.logo_url)
    if (logoDataUrl) {
      const logoWidth = 24
      const logoHeight = 24
      const logoX = (210 - logoWidth) / 2
      const logoY = 20
      const format = logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logoDataUrl, format, logoX, logoY, logoWidth, logoHeight)
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(18)
  const tituloFederacao = federacao.sigla
    ? `${federacao.nome_completo} (${federacao.sigla})`
    : federacao.nome_completo
  doc.text(tituloFederacao, 105, 52, { align: 'center' })

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.4)
  doc.line(25, 58, 185, 58)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(19)
  doc.text('CERTIFICADO DE FILIAÇÃO E AUTORIZAÇÃO DE FUNCIONAMENTO', 105, 72, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(11)

  const texto1 = `A ${federacao.nome_completo}, no uso de suas atribuições legais e estatutárias, CERTIFICA que a academia abaixo descrita encontra-se devidamente filiada e autorizada a funcionar e a promover a prática do judô.`
  const texto2 = `Academia: ${academia.nome}${academia.sigla ? ` (${academia.sigla})` : ''}`
  const texto3 = `Responsável: ${academia.responsavel_nome || 'Não informado'}`
  const texto4 = `Localidade: ${localidade || 'Não informada'}`
  const texto5 = `Este certificado atesta a regularidade cadastral e estatutária da academia perante esta entidade oficial de regulação do esporte e possui validade até ${validadeFormatada}.`
  const texto6 = `Emitido em ${dataFormatada}.`

  const bloco = [texto1, '', texto2, '', texto3, '', texto4, '', texto5, '', texto6].filter(Boolean)

  let y = 88
  bloco.forEach((linha) => {
    const linhas = doc.splitTextToSize(linha, 155)
    doc.text(linhas, 27, y)
    y += linhas.length * 6
  })

  doc.setDrawColor(15, 23, 42)
  doc.line(70, 238, 140, 238)
  doc.setFontSize(10)
  doc.text(federacao.nome_completo, 105, 244, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Registro: ${numeroRegistro}`, 105, 250, { align: 'center' })

  // Dados cadastrais da federação no rodapé
  const linhaCnpj = federacao.cnpj ? `CNPJ: ${federacao.cnpj}` : null
  const linhaContato = [
    federacao.telefone ? `Tel: ${federacao.telefone}` : null,
    federacao.email ? `E-mail: ${federacao.email}` : null,
    federacao.site ? `Site: ${federacao.site}` : null,
  ].filter(Boolean).join(' • ')

  const rodapeLinhas = [
    linhaCnpj,
    enderecoFederacao || null,
    linhaContato || null,
    'Documento gerado eletronicamente pela plataforma SMAART.',
  ].filter(Boolean)

  let rodapeY = 257
  rodapeLinhas.forEach((linha) => {
    const partes = doc.splitTextToSize(linha, 170)
    doc.text(partes, 105, rodapeY, { align: 'center' })
    rodapeY += partes.length * 4.5
  })

  const nomeArquivo = `Certificado_Filiacao_${academia.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(nomeArquivo)
}
