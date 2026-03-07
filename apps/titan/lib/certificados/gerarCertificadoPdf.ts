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
  }
  validade: string | null
  dataEmissao: string
  numeroRegistro: string
}

export function gerarCertificadoPdf(certificadoData: CertificadoData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const { academia, federacao, validade, dataEmissao, numeroRegistro } = certificadoData

  const localidade = [academia.endereco_cidade, academia.endereco_estado].filter(Boolean).join(', ')

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

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(18)
  const tituloFederacao = federacao.sigla
    ? `${federacao.nome_completo} (${federacao.sigla})`
    : federacao.nome_completo
  doc.text(tituloFederacao, 105, 32, { align: 'center' })

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.4)
  doc.line(25, 40, 185, 40)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(19)
  doc.text('CERTIFICADO DE FILIAÇÃO E AUTORIZAÇÃO DE FUNCIONAMENTO', 105, 58, { align: 'center' })

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

  let y = 76
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
  doc.text(`Registro: ${numeroRegistro}`, 105, 254, { align: 'center' })
  doc.text('Documento gerado eletronicamente pela plataforma SMAART.', 105, 261, { align: 'center' })

  const nomeArquivo = `Certificado_Filiacao_${academia.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(nomeArquivo)
}
