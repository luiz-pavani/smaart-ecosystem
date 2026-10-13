/**
 * Prepara fotos no navegador antes do upload: reduz para até `lado` px e converte para JPEG
 * (inclui HEIC do iPhone quando o navegador decodifica — Safari sim, Chrome não).
 * O servidor não processa imagem e o corpo da requisição na Vercel vai até ~4,5 MB.
 */
const PRONTOS = ['image/jpeg', 'image/png', 'image/webp']

export async function prepararImagemUpload(file: File, lado = 2000): Promise<Blob> {
  if (file.type === 'application/pdf') return file
  if (PRONTOS.includes(file.type) && file.size < 1.5 * 1024 * 1024) return file
  try {
    const bmp = await createImageBitmap(file) // aplica a orientação EXIF
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * k)
    canvas.height = Math.round(bmp.height * k)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.9))
  } catch {
    return file // o servidor recusa com mensagem se o formato não for aceito
  }
}
