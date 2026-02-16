'use client'

import { useState } from 'react'
import { X, Shield, Download, ExternalLink, CheckCircle2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { CertificadoPDF } from '@/components/pdf/CertificadoPDF'
import { generateQRCodeDataURL } from '@/lib/utils/certificado'

interface CertificadoModalProps {
  isOpen: boolean
  onClose: () => void
  academia: {
    id: string
    nome: string
    sigla?: string | null
    cnpj?: string
    anualidade_status: string
  }
}

export default function CertificadoModal({ isOpen, onClose, academia }: CertificadoModalProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [certificadoData, setCertificadoData] = useState<any>(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  if (!isOpen) return null

  const handleGerarCertificado = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/certificados/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academia_id: academia.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar certificado')
      }

      setCertificadoData(data.certificado)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar certificado')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!certificadoData) return

    setDownloadingPDF(true)
    try {
      // Gerar QR code
      const qrCodeDataURL = await generateQRCodeDataURL(certificadoData.url_validacao)

      // Gerar PDF
      const blob = await pdf(
        <CertificadoPDF 
          certificado={certificadoData} 
          qrCodeDataURL={qrCodeDataURL}
        />
      ).toBlob()

      // Download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Certificado-${certificadoData.numero_certificado}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setError('Erro ao gerar PDF do certificado')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleOpenValidacao = () => {
    if (certificadoData) {
      window.open(certificadoData.url_validacao, '_blank')
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setError(null)
    setCertificadoData(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gerar Certificado</h2>
              <p className="text-green-100 text-sm">Autorização de Funcionamento 2026</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!success ? (
            <>
              {/* Informações da Academia */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Academia</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Nome</p>
                    <p className="font-medium text-gray-900">{academia.nome}</p>
                  </div>
                  {academia.sigla && (
                    <div>
                      <p className="text-sm text-gray-600">Sigla</p>
                      <p className="font-medium text-gray-900">{academia.sigla}</p>
                    </div>
                  )}
                  {academia.cnpj && (
                    <div>
                      <p className="text-sm text-gray-600">CNPJ</p>
                      <p className="font-medium text-gray-900">{academia.cnpj}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações do Certificado */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">O que é o Certificado?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Documento oficial de autorização de funcionamento</li>
                  <li>• Válido para o ano de 2026</li>
                  <li>• Contém QR Code para validação pública</li>
                  <li>• Pode ser impresso ou compartilhado digitalmente</li>
                </ul>
              </div>

              {/* Verificações */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Academia filiada e ativa</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 
                    className={`w-5 h-5 ${
                      academia.anualidade_status === 'paga' 
                        ? 'text-green-600' 
                        : 'text-gray-300'
                    }`} 
                  />
                  <span className={
                    academia.anualidade_status === 'paga'
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }>
                    Anuidade 2026 paga
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGerarCertificado}
                  disabled={loading || academia.anualidade_status !== 'paga'}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Gerar Certificado
                    </>
                  )}
                </button>
              </div>

              {academia.anualidade_status !== 'paga' && (
                <p className="text-sm text-amber-600 text-center">
                  ⚠️ A anuidade deve estar paga para gerar o certificado
                </p>
              )}
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center py-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Certificado Gerado!
                </h3>
                <p className="text-gray-600 mb-6">
                  O certificado foi emitido com sucesso
                </p>

                {/* Certificado Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Número</p>
                      <p className="font-bold text-red-600">{certificadoData?.numero_certificado}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ano</p>
                      <p className="font-bold text-gray-900">{certificadoData?.ano_validade}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Emissão</p>
                      <p className="font-medium text-gray-900">
                        {new Date(certificadoData?.data_emissao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Validade</p>
                      <p className="font-medium text-gray-900">
                        {new Date(certificadoData?.data_validade).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {downloadingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Baixar PDF
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenValidacao}
                    className="w-full px-4 py-3 border border-green-300 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Página de Validação
                  </button>

                  <button
                    onClick={handleClose}
                    className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Fechar
                  </button>
                </div>

                {/* QR Code Info */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    O certificado contém um QR Code que pode ser<br />
                    escaneado para validação pública a qualquer momento
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
