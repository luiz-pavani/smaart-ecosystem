'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, AlertCircle, QrCode } from 'lucide-react'
import Link from 'next/link'

interface AcademiaInfo {
  id: string
  nome: string
  sigla: string
  federacao: {
    nome: string
    sigla: string
  }
}

type RegistroStep = 'info' | 'formulario' | 'sucesso' | 'erro'

export default function RegistroAtetaPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const academia_sigla = (params.academia as string)?.toUpperCase()
  
  const [Academia, setAcademia] = useState<AcademiaInfo | null>(null)
  const [step, setStep] = useState<RegistroStep>('info')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    graduacao: '',
    data_nascimento: '',
    celular: '',
  })
  
  const [erro, setErro] = useState<string | null>(null)
  const [atletaId, setAtletaId] = useState<string | null>(null)

  useEffect(() => {
    buscarAcademia()
  }, [academia_sigla])

  const buscarAcademia = async () => {
    try {
      setLoading(true)
      
      const { data: academiaData, error } = await supabase
        .from('academias')
        .select(`
          id,
          nome,
          sigla,
          federacao:federacao_id (
            id,
            nome,
            sigla
          )
        `)
        .eq('sigla', academia_sigla)
        .single()

      if (error || !academiaData) {
        setErro(`Academia "${academia_sigla}" não encontrada. Verifique o link.`)
        setStep('erro')
        return
      }

      setAcademia(academiaData as unknown as AcademiaInfo)
      setLoading(false)
    } catch (err: any) {
      setErro(err.message)
      setStep('erro')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome_completo || !formData.email || !formData.graduacao) {
      setErro('Preencha todos os campos obrigatórios')
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      // 1. Registrar atleta
      const { data: novoAtleta, error: atleteError } = await supabase
        .from('atletas')
        .insert({
          academia_id: Academia?.id,
          federacao_id: Academia && 'federacao' in Academia ? (Academia.federacao as any).id : null,
          nome_completo: formData.nome_completo,
          email: formData.email,
          cpf: formData.cpf || null,
          graduacao: formData.graduacao,
          data_nascimento: formData.data_nascimento || null,
          celular: formData.celular || null,
          status: 'ativo',
          status_pagamento: 'pendente',
          metadata: {
            registro_via: 'self_service',
            data_registro: new Date().toISOString(),
            fonte: 'link_compartilhado'
          }
        })
        .select()
        .single()

      if (atleteError) throw atleteError

      setAtletaId(novoAtleta.id)
      setStep('sucesso')
    } catch (err: any) {
      console.error('Erro ao registrar:', err)
      setErro(err.message || 'Erro ao registrar atleta')
      setStep('erro')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mb-4 animate-spin mx-auto" />
          <p className="text-gray-600">Buscando academia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              🥋
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Titan Academy</h1>
              <p className="text-sm text-gray-600">
                {Academia?.federacao.nome} ({Academia?.federacao.sigla})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {step === 'info' && (
          <div className="bg-white rounded-lg border shadow-sm p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Bem-vindo à {Academia?.nome}!
              </h2>
              <p className="text-lg text-gray-600">
                Complete seu registro em menos de 2 minutos
              </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 font-bold">
                  1
                </div>
                <p className="text-sm font-semibold text-gray-900">Info</p>
              </div>
              <div className="flex-1 h-1 bg-gray-200 mx-2"></div>
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center mx-auto mb-2 font-bold">
                  2
                </div>
                <p className="text-sm text-gray-600">Sucesso</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleInputChange}
                  placeholder="Ex: João da Silva"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>

              {/* Grad uação */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Graduação (Faixa) *
                </label>
                <select
                  name="graduacao"
                  value={formData.graduacao}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                >
                  <option value="">Selecione sua faixa...</option>
                  <option value="Branca">Branca</option>
                  <option value="Azul">Azul</option>
                  <option value="Roxa">Roxa</option>
                  <option value="Marrom">Marrom</option>
                  <option value="Preta">Preta</option>
                </select>
              </div>

              {/* CPF (opcional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  CPF (opcional)
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar'
                  )}
                </button>
              </div>

              {erro && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              )}
            </form>
          </div>
        )}

        {step === 'sucesso' && (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Parabéns! 🎉
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Seu registro foi concluído com sucesso<br />
              <strong>{formData.nome_completo}</strong>
            </p>

            <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Academia</p>
                  <p className="font-semibold text-gray-900">{Academia?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Faixa</p>
                  <p className="font-semibold text-gray-900">{formData.graduacao}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900 text-sm">{formData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID Atleta</p>
                  <p className="font-semibold text-gray-900 text-xs">{atletaId?.slice(0, 8)}...</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-8">
              Um email de confirmação foi enviado para <strong>{formData.email}</strong>
            </p>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Fazer Login
              </button>
              <button
                onClick={() => {
                  const text = `Registre-se na ${Academia?.nome} (${Academia?.sigla}) pelo Titan!\n\nhttps://titan.app/registro/${academia_sigla}`
                  navigator.clipboard.writeText(text)
                  alert('Link copiado!')
                }}
                className="w-full px-4 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50"
              >
                Copiar Link para Compartilhar
              </button>
            </div>
          </div>
        )}

        {step === 'erro' && (
          <div className="bg-white rounded-lg border shadow-sm p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Algo deu errado
              </h2>
              <p className="text-gray-600 mb-8">{erro}</p>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setStep('info')
                    buscarAcademia()
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Tentar Novamente
                </button>
                <Link
                  href="/login"
                  className="block px-4 py-3 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Voltar para Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t mt-16">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>© 2026 Titan Academy Management. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
