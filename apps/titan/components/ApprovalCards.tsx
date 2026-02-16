'use client'

import { useState } from 'react'
import { Shield, Award, Check, X, AlertCircle } from 'lucide-react'

interface ApprovalCardsProps {
  atletaId: string
  graduacao: string
  graduacaoAprovada: boolean | null
  nivelArbitragem: string | null
  arbitragemAprovada: boolean | null
  isFederacaoAdmin: boolean
  onApprovalChange: () => void
}

export default function ApprovalCards({
  atletaId,
  graduacao,
  graduacaoAprovada,
  nivelArbitragem,
  arbitragemAprovada,
  isFederacaoAdmin,
  onApprovalChange,
}: ApprovalCardsProps) {
  const [loadingGrad, setLoadingGrad] = useState(false)
  const [loadingArb, setLoadingArb] = useState(false)

  const requiresGraduacaoApproval = graduacao.includes('FAIXA PRETA') || graduacao.includes('KODANSHA')
  const requiresArbitragemApproval = nivelArbitragem !== null && nivelArbitragem !== ''

  const handleApproveGraduacao = async () => {
    if (!confirm('Deseja aprovar esta graduação?')) return

    setLoadingGrad(true)
    try {
      const response = await fetch(`/api/atletas/${atletaId}/aprovar-graduacao`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao aprovar graduação')
        return
      }

      alert('Graduação aprovada com sucesso!')
      onApprovalChange()
    } catch (error) {
      console.error('Error approving graduacao:', error)
      alert('Erro ao aprovar graduação')
    } finally {
      setLoadingGrad(false)
    }
  }

  const handleRejectGraduacao = async () => {
    if (!confirm('Deseja rejeitar esta graduação?')) return

    setLoadingGrad(true)
    try {
      const response = await fetch(`/api/atletas/${atletaId}/aprovar-graduacao`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao rejeitar graduação')
        return
      }

      alert('Graduação rejeitada')
      onApprovalChange()
    } catch (error) {
      console.error('Error rejecting graduacao:', error)
      alert('Erro ao rejeitar graduação')
    } finally {
      setLoadingGrad(false)
    }
  }

  const handleApproveArbitragem = async () => {
    if (!confirm('Deseja aprovar este nível de arbitragem?')) return

    setLoadingArb(true)
    try {
      const response = await fetch(`/api/atletas/${atletaId}/aprovar-arbitragem`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao aprovar nível de arbitragem')
        return
      }

      alert('Nível de arbitragem aprovado com sucesso!')
      onApprovalChange()
    } catch (error) {
      console.error('Error approving arbitragem:', error)
      alert('Erro ao aprovar nível de arbitragem')
    } finally {
      setLoadingArb(false)
    }
  }

  const handleRejectArbitragem = async () => {
    if (!confirm('Deseja rejeitar este nível de arbitragem?')) return

    setLoadingArb(true)
    try {
      const response = await fetch(`/api/atletas/${atletaId}/aprovar-arbitragem`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao rejeitar nível de arbitragem')
        return
      }

      alert('Nível de arbitragem rejeitado')
      onApprovalChange()
    } catch (error) {
      console.error('Error rejecting arbitragem:', error)
      alert('Erro ao rejeitar nível de arbitragem')
    } finally {
      setLoadingArb(false)
    }
  }

  if (!requiresGraduacaoApproval && !requiresArbitragemApproval) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Graduação Approval Card */}
      {requiresGraduacaoApproval && (
        <div className={`rounded-lg shadow border p-6 ${
          graduacaoAprovada 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {graduacaoAprovada ? (
                <Check className="w-6 h-6 text-green-600 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
              )}
              <div>
                <h5 className={`font-semibold flex items-center gap-2 ${
                  graduacaoAprovada ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  <Award className="w-5 h-5" />
                  Aprovação de Graduação
                </h5>
                <p className={`text-sm mt-1 ${
                  graduacaoAprovada ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {graduacaoAprovada 
                    ? 'Esta graduação foi aprovada pela federação.' 
                    : 'Esta graduação requer aprovação da federação.'}
                </p>
                <div className="mt-2">
                  <span className={`text-sm font-medium ${
                    graduacaoAprovada ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    Graduação: {graduacao.split('|')[0].trim()}
                  </span>
                </div>
              </div>
            </div>

            {isFederacaoAdmin && !graduacaoAprovada && (
              <div className="flex gap-2">
                <button
                  onClick={handleApproveGraduacao}
                  disabled={loadingGrad}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {loadingGrad ? 'Aprovando...' : 'Aprovar'}
                </button>
                <button
                  onClick={handleRejectGraduacao}
                  disabled={loadingGrad}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
            )}

            {isFederacaoAdmin && graduacaoAprovada && (
              <button
                onClick={handleRejectGraduacao}
                disabled={loadingGrad}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {loadingGrad ? 'Removendo...' : 'Remover Aprovação'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Arbitragem Approval Card */}
      {requiresArbitragemApproval && (
        <div className={`rounded-lg shadow border p-6 ${
          arbitragemAprovada 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {arbitragemAprovada ? (
                <Check className="w-6 h-6 text-green-600 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
              )}
              <div>
                <h5 className={`font-semibold flex items-center gap-2 ${
                  arbitragemAprovada ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  <Shield className="w-5 h-5" />
                  Aprovação de Nível de Arbitragem
                </h5>
                <p className={`text-sm mt-1 ${
                  arbitragemAprovada ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {arbitragemAprovada 
                    ? 'Este nível de arbitragem foi aprovado pela federação.' 
                    : 'Este nível de arbitragem requer aprovação da federação.'}
                </p>
                <div className="mt-2">
                  <span className={`text-sm font-medium ${
                    arbitragemAprovada ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    Nível: {nivelArbitragem}
                  </span>
                </div>
              </div>
            </div>

            {isFederacaoAdmin && !arbitragemAprovada && (
              <div className="flex gap-2">
                <button
                  onClick={handleApproveArbitragem}
                  disabled={loadingArb}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {loadingArb ? 'Aprovando...' : 'Aprovar'}
                </button>
                <button
                  onClick={handleRejectArbitragem}
                  disabled={loadingArb}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Rejeitar
                </button>
              </div>
            )}

            {isFederacaoAdmin && arbitragemAprovada && (
              <button
                onClick={handleRejectArbitragem}
                disabled={loadingArb}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {loadingArb ? 'Removendo...' : 'Remover Aprovação'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
