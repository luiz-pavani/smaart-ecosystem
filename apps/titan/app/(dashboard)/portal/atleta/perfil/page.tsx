'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Award } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [atleta, setAtleta] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAtleta = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('atletas')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        setAtleta(data)
      } catch (error) {
        console.error('Erro ao buscar perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAtleta()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Carregando...</div>
          </div>
        ) : atleta ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8">
            {/* Profile Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{atleta.nome}</h2>
                <p className="text-gray-400">CPF: {atleta.cpf}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-xl flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {atleta.nome?.[0].toUpperCase()}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Contato</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="w-5 h-5" />
                    <span>{atleta.email || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="w-5 h-5" />
                    <span>{atleta.celular || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Localização</h3>
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 mt-1" />
                  <div>
                    <p>{atleta.cidade || 'Não informado'}</p>
                    <p className="text-sm">{atleta.estado || ''}</p>
                  </div>
                </div>
              </div>

              {/* Birth */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Nascimento</h3>
                <p className="text-gray-300">{atleta.data_nascimento || 'Não informado'}</p>
              </div>

              {/* Graduação */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Graduação</h3>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-300">{atleta.nivel || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="mt-8 flex gap-3">
              <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all">
                Editar Perfil
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">Nenhum perfil encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}
