'use client'

import { use, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Shield } from 'lucide-react'
import Image from 'next/image'

interface CertificadoData {
  valid: boolean
  status: string
  mensagem: string
  certificado?: {
    numero: string
    ano: number
    dataEmissao: string
    dataValidade: string
    status: string
    observacoes?: string
    academia: {
      nome: string
      sigla?: string
      cnpj?: string
      logo_url?: string
      endereco_cidade?: string
      endereco_estado?: string
      responsavel_nome?: string
    }
    federacao: {
      nome: string
      sigla: string
      logo_url?: string
      endereco_cidade?: string
      endereco_estado?: string
    }
  }
}

export default function ValidarCertificadoPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CertificadoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function validarCertificado() {
      try {
        const response = await fetch(`/api/certificados/validar/${hash}`)
        const result = await response.json()
        
        if (response.ok) {
          setData(result)
        } else {
          setError(result.error || 'Erro ao validar certificado')
        }
      } catch (err) {
        setError('Erro ao conectar com o servidor')
      } finally {
        setLoading(false)
      }
    }

    validarCertificado()
  }, [hash])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando certificado...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-t-4 border-red-500">
          <div className="text-center">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Certificado Inválido
            </h1>
            <p className="text-gray-600 mb-6">
              {error || 'Não foi possível validar este certificado'}
            </p>
            <div className="bg-red-50 rounded-lg p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">Possíveis causas:</p>
              <ul className="text-left space-y-1 ml-4">
                <li>• Certificado não encontrado</li>
                <li>• Link inválido ou expirado</li>
                <li>• Certificado cancelado</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const StatusIcon = data.valid ? CheckCircle2 : data.status === 'expirado' ? AlertCircle : XCircle
  const statusColor = data.valid ? 'green' : data.status === 'expirado' ? 'yellow' : 'red'
  const bgGradient = data.valid 
    ? 'from-green-50 to-emerald-50' 
    : data.status === 'expirado'
    ? 'from-yellow-50 to-amber-50'
    : 'from-red-50 to-rose-50'

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-4xl mx-auto">
        {/* Header com status */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
          <div className={`bg-gradient-to-r from-${statusColor}-500 to-${statusColor}-600 p-6 text-white text-center`}>
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-3xl font-bold mb-2">
              Validação de Certificado
            </h1>
            <p className="text-${statusColor}-100">
              Sistema de Verificação Oficial
            </p>
          </div>

          {/* Status do certificado */}
          <div className={`bg-${statusColor}-50 border-b-4 border-${statusColor}-200 p-6`}>
            <div className="flex items-center justify-center gap-3">
              <StatusIcon className={`w-10 h-10 text-${statusColor}-600`} />
              <div className="text-center">
                <p className={`text-2xl font-bold text-${statusColor}-900`}>
                  {data.mensagem}
                </p>
                <p className={`text-sm text-${statusColor}-700 mt-1`}>
                  Status: {data.status.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dados do certificado */}
        {data.certificado && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header com logos */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                {data.certificado.federacao.logo_url && (
                  <div className="relative w-20 h-20 bg-white rounded-lg p-2">
                    <Image
                      src={data.certificado.federacao.logo_url}
                      alt="Logo Federação"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="text-white text-right flex-1 ml-4">
                  <h2 className="text-xl font-bold">{data.certificado.federacao.nome}</h2>
                  <p className="text-green-100">
                    {data.certificado.federacao.endereco_cidade}/{data.certificado.federacao.endereco_estado}
                  </p>
                </div>
              </div>
            </div>

            {/* Número do certificado */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 text-center">
              <p className="text-sm font-semibold mb-1">CERTIFICADO Nº</p>
              <p className="text-2xl font-bold tracking-wider">
                {data.certificado.numero}
              </p>
            </div>

            {/* Conteúdo */}
            <div className="p-8 space-y-6">
              {/* Academia */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
                  ACADEMIA AUTORIZADA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Nome</p>
                    <p className="text-lg text-gray-900">{data.certificado.academia.nome}</p>
                  </div>
                  {data.certificado.academia.sigla && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Sigla</p>
                      <p className="text-lg text-gray-900">{data.certificado.academia.sigla}</p>
                    </div>
                  )}
                  {data.certificado.academia.cnpj && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">CNPJ</p>
                      <p className="text-lg text-gray-900">{formatCNPJ(data.certificado.academia.cnpj)}</p>
                    </div>
                  )}
                  {data.certificado.academia.endereco_cidade && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Localidade</p>
                      <p className="text-lg text-gray-900">
                        {data.certificado.academia.endereco_cidade}/{data.certificado.academia.endereco_estado}
                      </p>
                    </div>
                  )}
                  {data.certificado.academia.responsavel_nome && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Responsável</p>
                      <p className="text-lg text-gray-900">{data.certificado.academia.responsavel_nome}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados do certificado */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
                  DADOS DO CERTIFICADO
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Ano de Validade</p>
                    <p className="text-2xl font-bold text-green-600">{data.certificado.ano}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Data de Emissão</p>
                    <p className="text-lg text-gray-900">{formatDate(data.certificado.dataEmissao)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Válido até</p>
                    <p className="text-lg text-gray-900">{formatDate(data.certificado.dataValidade)}</p>
                  </div>
                </div>
              </div>

              {/* Declaração */}
              <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-green-500">
                <p className="text-sm text-gray-700 leading-relaxed text-justify">
                  Este certificado atesta que a academia acima identificada está devidamente <span className="font-bold">FILIADA</span> 
                  {' '}e <span className="font-bold">AUTORIZADA</span> pela {data.certificado.federacao.nome} ({data.certificado.federacao.sigla}) 
                  a funcionar como entidade de prática de Judô durante o ano de {data.certificado.ano}, estando em dia com 
                  todas as obrigações estatutárias e financeiras.
                </p>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  Documento verificado eletronicamente em {formatDate(new Date().toISOString())}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Sistema de Gestão Titan • Certificado Digital com QR Code
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Este certificado pode ser validado a qualquer momento através do QR Code
          </p>
        </div>
      </div>
    </div>
  )
}
