import { createClient } from './client'

const BUCKET_NAME = 'academias-logos'

/**
 * Upload de logo de academia para Supabase Storage
 */
export async function uploadAcademiaLogo(file: File, academiaId?: string): Promise<string> {
  const supabase = createClient()

  // Gerar nome único do arquivo
  const fileExt = file.name.split('.').pop()
  const fileName = `${academiaId || Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `logos/${fileName}`

  // Upload do arquivo
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Erro no upload: ${error.message}`)
  }

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return publicUrl
}

/**
 * Deletar logo antiga ao atualizar
 */
export async function deleteAcademiaLogo(logoUrl: string): Promise<void> {
  if (!logoUrl.includes(BUCKET_NAME)) return // Não é do nosso storage

  const supabase = createClient()
  
  // Extrair caminho do arquivo da URL
  const urlParts = logoUrl.split(`${BUCKET_NAME}/`)
  if (urlParts.length < 2) return

  const filePath = urlParts[1]

  await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])
}

/**
 * Verificar se bucket existe, caso contrário instrui a criação
 */
export async function ensureBucketExists(): Promise<boolean> {
  const supabase = createClient()
  
  const { data: buckets } = await supabase.storage.listBuckets()
  
  const exists = buckets?.some(b => b.name === BUCKET_NAME)
  
  if (!exists) {
    console.warn(`⚠️  Bucket "${BUCKET_NAME}" não existe.`)
    console.warn('Execute o script de setup: node setup-storage.js')
    return false
  }
  
  return true
}
