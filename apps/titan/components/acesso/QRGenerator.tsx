'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

interface QRData {
  qr_token: string
  qr_image: string
  atleta_id: string
  academia_id: string
  validade_ate: string
}

export function QRGenerator() {
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hardcoded para teste (Dev 2 vai adicionar seletor de academia)
  const atleta_id = 'test-atleta-123'
  const academia_id = 'test-academia-123'

  const gerarQR = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/acesso/gerar-qr?atleta_id=${atleta_id}&academia_id=${academia_id}`
      )
      if (res.ok) {
        const data = await res.json()
        setQrData(data)
      } else {
        setError('Erro ao gerar QR')
      }
    } catch (err) {
      setError('Erro na requisição')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    gerarQR()
  }, [])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md">
      <h3 className="font-semibold text-gray-900 mb-4">Seu QR de Acesso</h3>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : qrData ? (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded flex justify-center">
            <img
              src={qrData.qr_image}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-3 flex gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-900">Válido até</p>
              <p className="text-green-700">
                {new Date(qrData.validade_ate).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center">
            Use este QR para fazer check-in na academia
          </p>

          <button
            onClick={gerarQR}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Gerar Novo QR
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-500">Nenhum QR</div>
      )}
    </div>
  )
}
