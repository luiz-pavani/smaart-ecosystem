'use client'

import { useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import { useAddressByCep } from '@/lib/hooks/useAddressByCep'

interface CepInputProps {
  value: string
  onChange: (value: string) => void
  onAddressFound?: (address: {
    rua: string
    bairro: string
    cidade: string
    estado: string
  }) => void
  required?: boolean
  className?: string
}

export function CepInput({ 
  value, 
  onChange, 
  onAddressFound, 
  required = false,
  className = ''
}: CepInputProps) {
  const { fetchAddress, loading, error } = useAddressByCep()
  const [success, setSuccess] = useState(false)

  const handleSearch = async () => {
    setSuccess(false)
    const address = await fetchAddress(value)
    
    if (address && onAddressFound) {
      onAddressFound(address)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  const handleBlur = () => {
    if (value.replace(/\D/g, '').length === 8) {
      handleSearch()
    }
  }

  const formatCep = (cep: string) => {
    const onlyNumbers = cep.replace(/\D/g, '')
    if (onlyNumbers.length <= 5) return onlyNumbers
    return `${onlyNumbers.slice(0, 5)}-${onlyNumbers.slice(5, 8)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value)
    onChange(formatted)
  }

  const isValid = value.replace(/\D/g, '').length === 8

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-2">
        CEP {required && '*'}
      </label>
      <div className="relative flex gap-2">
        <input
          type="text"
          required={required}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          placeholder="00000-000"
          maxLength={9}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !isValid}
          className="px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          title="Buscar endereço"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : success ? (
            <Check className="w-4 h-4" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground mt-1">Buscando endereço...</p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Endereço encontrado!
        </p>
      )}
    </div>
  )
}
