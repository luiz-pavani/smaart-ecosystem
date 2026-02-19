'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QrCode, Copy, Share2, Mail, MessageCircle, Check } from 'lucide-react'

const QrCodeComponent = dynamic(() => import('@/components/ui/QRCodeComponent'), { ssr: false })

interface Academia {
  id: string
  nome: string
  sigla: string
}

export default function CompartilharRegistroPage() {
  const supabase = createClient()
  const [academia, setAcademia] = useState<Academia | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    carregarAcademia()
  }, [])

  const carregarAcademia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: perfilArray } = await supabase
        .from('user_roles')
        .select('academia_id')
        .eq('user_id', user.id)
        .limit(1)

      const perfil = perfilArray?.[0]

      if (!perfil?.academia_id) {
        setLoading(false)
        return
      }

      const { data: academiaData } = await supabase
        .from('academias')
        .select('id, nome, sigla')
        .eq('id', perfil.academia_id)
        .single()

      setAcademia(academiaData as Academia)
      setLoading(false)
    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>
  }

  if (!academia) {
    return <div className="p-8 text-center">Academia não encontrada</div>
  }

  const linkRegistro = `${process.env.NEXT_PUBLIC_URL}/registro/${academia.sigla}`
  const mensagemCompartilha = `Registre-se na ${academia.nome} (${academia.sigla}) pelo Titan!\n\n${linkRegistro}`

  const copiarLink = () => {
    navigator.clipboard.writeText(linkRegistro)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Compartilhar Registro de Atletas
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Compartilhe este link com seus alunos para que eles se registrem de forma fácil e rápida
      </p>

      {/* Link de Registro */}
      <div className="bg-white border rounded-lg p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Link de Registro</h2>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 flex items-center font-mono text-sm text-gray-700 break-all">
            {linkRegistro}
          </div>
          <button
            onClick={copiarLink}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copiar
              </>
            )}
          </button>
        </div>

        {/* Métodos de Compartilhamento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const waLink = `https://wa.me/?text=${encodeURIComponent(mensagemCompartilha)}`
              window.open(waLink, '_blank')
            }}
            className="p-4 border rounded-lg hover:bg-green-50 text-center"
          >
            <MessageCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-900">WhatsApp</p>
          </button>

          <button
            onClick={() => {
              const mailLink = `mailto:?subject=Registre-se na ${academia.nome}&body=${encodeURIComponent(mensagemCompartilha)}`
              window.location.href = mailLink
            }}
            className="p-4 border rounded-lg hover:bg-blue-50 text-center"
          >
            <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-900">Email</p>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Registre-se na ${academia.nome}`,
                  text: mensagemCompartilha,
                  url: linkRegistro,
                })
              } else {
                alert('Copie e compartilhe o link acima')
              }
            }}
            className="p-4 border rounded-lg hover:bg-purple-50 text-center"
          >
            <Share2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="font-semibold text-gray-900">Compartilhar</p>
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white border rounded-lg p-8">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-6 h-6 text-gray-900" />
          <h2 className="text-xl font-bold text-gray-900">QR Code</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Compartilhe este QR Code com seus alunos
        </p>

        {showQR && (
          <div className="flex justify-center mb-6">
            <QrCodeComponent 
              value={linkRegistro}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
        )}

        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full px-4 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50"
        >
          {showQR ? 'Ocultar' : 'Mostrar'} QR Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600">Registros esta semana</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-600">Registros este mês</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-600">Total de atletas</p>
        </div>
      </div>
    </div>
  )
}
