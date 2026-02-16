import QRCode from 'qrcode'

/**
 * Gera QR code como data URL para ser usado em PDFs
 */
export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrDataURL
  } catch (error) {
    console.error('Erro ao gerar QR code:', error)
    throw error
  }
}

/**
 * Formata data no padrão brasileiro
 */
export function formatDateBR(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return ''
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
