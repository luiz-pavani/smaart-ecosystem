'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  value?: string // URL atual da imagem
  onChange?: (url: string) => void
  onFileSelected?: (file: File) => void
  disabled?: boolean
  maxSizeMB?: number
  aspectRatio?: string // ex: '1:1', '16:9'
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onFileSelected,
  disabled = false,
  maxSizeMB = 2,
  aspectRatio = '1:1',
  className = ''
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    setError(null)

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida')
      return false
    }

    // Validar tamanho
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`Imagem muito grande. Máximo: ${maxSizeMB}MB`)
      return false
    }

    return true
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateFile(file)) return

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Notificar componente pai
    onFileSelected?.(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!validateFile(file)) return

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Notificar componente pai
    onFileSelected?.(file)
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onChange?.('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {preview ? (
        // Preview da imagem
        <div className="relative group">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            
            {!disabled && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleRemove}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-3 rounded-full"
                  title="Remover imagem"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={handleClick}
              disabled={disabled}
              className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
            >
              Trocar imagem
            </button>
          </div>
        </div>
      ) : (
        // Upload area
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative w-full h-48 rounded-lg border-2 border-dashed 
            transition-all cursor-pointer
            flex flex-col items-center justify-center gap-3
            ${isDragging
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-green-600" />
          </div>

          <div className="text-center px-4">
            <p className="text-sm font-medium text-gray-900">
              {isDragging ? 'Solte a imagem aqui' : 'Clique ou arraste a logo'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG ou WEBP • Máx {maxSizeMB}MB
            </p>
          </div>

          <Upload className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Recomendado: imagem quadrada (1:1) com fundo transparente
      </p>
    </div>
  )
}
