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
  dataEmissao: string
  numeroRegistro: string
}

export function gerarCertificadoPdf(certificadoData: CertificadoData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const { academia, federacao, dataEmissao, numeroRegistro } = certificadoData

  const endereco = [
    academia.endereco_rua,
    academia.endereco_numero,
    academia.endereco_bairro,
    academia.endereco_cidade,
    academia.endereco_estado,
    academia.endereco_cep,
  ]
    .filter(Boolean)
    .join(', ')

  const dataFormatada = new Date(dataEmissao).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  doc.setFillColor(248, 250, 252)
  doc.rect(10, 10, 190, 277, 'F')

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.8)
  doc.rect(15, 15, 180, 267)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(18)
  doc.text(federacao.nome_completo, 105, 32, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(10)
  const fedInfo = [
    federacao.sigla ? `${federacao.sigla}` : null,
    federacao.cnpj ? `CNPJ: ${federacao.cnpj}` : null,
  ]
    .filter(Boolean)
    .join(' • ')
  doc.text(fedInfo || 'Federação', 105, 39, { align: 'center' })

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.4)
  doc.line(25, 45, 185, 45)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22)
  doc.text('CERTIFICADO DE FILIAÇÃO', 105, 62, { align: 'center' })
  doc.setFontSize(14)
  doc.text('e Autorização de Funcionamento', 105, 70, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(11)

  const texto1 = `A ${federacao.nome_completo}, no uso de suas atribuições legais e regulamentares, CERTIFICA que a academia abaixo encontra-se devidamente filiada e autorizada a funcionar.`
  const texto2 = `Academia: ${academia.nome}${academia.sigla ? ` (${academia.sigla})` : ''}`
  const texto3 = academia.cnpj ? `CNPJ: ${academia.cnpj}` : ''
  const texto4 = academia.responsavel_nome ? `Responsável: ${academia.responsavel_nome}` : ''
  const texto5 = endereco ? `Endereço: ${endereco}` : ''
  const texto6 = 'Este certificado é válido enquanto perdurar a regularidade cadastral e estatutária da academia perante a federação.'

  const bloco = [texto1, '', texto2, texto3, texto4, texto5, '', texto6].filter(Boolean)

  let y = 86
  bloco.forEach((linha) => {
    const linhas = doc.splitTextToSize(linha, 155)
    doc.text(linhas, 27, y)
    y += linhas.length * 5.5
  })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(10)
  doc.text(`Emitido em ${dataFormatada}`, 105, 225, { align: 'center' })

  doc.setDrawColor(15, 23, 42)
  doc.line(70, 245, 140, 245)
  doc.setFontSize(10)
  doc.text(federacao.nome_completo, 105, 251, { align: 'center' })
  doc.text('Presidência da Federação', 105, 256, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Registro: ${numeroRegistro}`, 105, 266, { align: 'center' })
  doc.text('Documento gerado eletronicamente pela plataforma SMAART', 105, 273, { align: 'center' })

  const nomeArquivo = `Certificado_Filiacao_${academia.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  doc.save(nomeArquivo)
}
