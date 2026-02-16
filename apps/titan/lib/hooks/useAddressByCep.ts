'use client'

import { useState } from 'react'

interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

interface AddressData {
  rua: string
  bairro: string
  cidade: string
  estado: string
}

export function useAddressByCep() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAddress = async (cep: string): Promise<AddressData | null> => {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '')

    // Validate CEP format
    if (cleanCep.length !== 8) {
      setError('CEP deve ter 8 dígitos')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP')
      }

      const data: ViaCepResponse = await response.json()

      if (data.erro) {
        setError('CEP não encontrado')
        return null
      }

      return {
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf,
      }
    } catch (err) {
      setError('Erro ao buscar CEP. Verifique sua conexão.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    fetchAddress,
    loading,
    error,
  }
}
