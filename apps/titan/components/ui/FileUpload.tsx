'use client'

import { useRef, useState } from 'react'
import { Upload, X, CheckCircle } from 'lucide-react'
import Image from 'next/image'

interface FileUploadProps {
  label?: string
  accept?: string
  maxSize?: number // in MB
  onFileSelect: (file: File) => void
  preview?: string | null
  isLoading?: boolean
  disabled?: boolean
  showPreview?: boolean
  previewAlt?: string
}

export default function FileUpload({
  label = 'Selecione um arquivo',
  accept = 'image/*',
  maxSize = 10,
  onFileSelect,
  preview,
  isLoading = false,
  disabled = false,
  showPreview = true,
  previewAlt = 'Preview',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isLoading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const validateFile = (file: File): boolean => {
    setError(null)
    setSuccess(false)

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Arquivo muito grande (máximo ${maxSize}MB)`)
      return false
    }

    // Check file type
    const acceptTypes = accept.split(',').map(t => t.trim())
    const isAccepted = acceptTypes.some(type => {
      if (type === 'image/*') {
        return file.type.startsWith('image/')
      }
      if (type === 'application/pdf') {
        return file.type === 'application/pdf'
      }
      return file.type === type
    })

    if (!isAccepted) {
      setError(`Tipo de arquivo não permitido`)
      return false
    }

    return true
  }

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSuccess(true)
      onFileSelect(file)
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || isLoading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isLoading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        } ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || isLoading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isDragging ? 'bg-primary/20' : 'bg-muted'
          }`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">
              ou arraste um arquivo aqui
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Máximo {maxSize}MB
          </p>
        </div>

        {isLoading && (
          <div className="mt-4">
            <div className="inline-block">
              <div className="w-5 h-5 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Enviando...</p>
          </div>
        )}

        {success && (
          <div className="absolute inset-0 bg-green-500/10 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-200 dark:border-red-900 rounded-lg">
          <X className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Preview */}
      {showPreview && preview && (
        <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden bg-muted">
          <Image
            src={preview}
            alt={previewAlt}
            fill
            className="object-cover"
            unoptimized // Allow external URLs
          />
        </div>
      )}
    </div>
  )
}
