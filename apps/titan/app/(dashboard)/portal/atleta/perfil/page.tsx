'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Award, Loader2, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [atleta, setAtleta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAtleta = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Usuário não autenticado')
          return
        }

        const { data: role } = await supabase
          .from('user_roles')
          .select('atleta_id')
          .eq('user_id', user.id)
          .not('atleta_id', 'is', null)
          .limit(1)
          .single()

        if (!role?.atleta_id) {
          setError('Atleta não vinculado a este usuário')
          return
        }

        const { data, error: atletaError } = await supabase
          .from('atletas')
          .select('*')
          .eq('id', role.atleta_id)
          .limit(1)
          .single()

        if (atletaError) {
          throw atletaError
        }

        setAtleta(data)
      } catch (err) {
        console.error('Erro ao buscar perfil:', err)
        setError('Não foi possível carregar seu perfil')
      } finally {
        setLoading(false)
      }
    }

    fetchAtleta()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 mt-1">Dados pessoais e de graduação</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200 mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : atleta ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{atleta.nome || 'Sem nome'}</h2>
                <p className="text-gray-400">CPF: {atleta.cpf || 'Não informado'}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-xl flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {atleta.nome?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Localização</h3>
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 mt-1" />
                  <div>
                    <p>{atleta.cidade || 'Não informado'}</p>
                    <p className="text-sm text-gray-400">{atleta.estado || ''}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Nascimento</h3>
                <p className="text-gray-300">{atleta.data_nascimento || 'Não informado'}</p>
              </div>

              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Graduação</h3>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-300">{atleta.nivel || atleta.graduacao || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {atleta?.id && (
              <div className="flex justify-end mt-8 pt-6 border-t border-white/10">
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                  onClick={() => router.push(`/atletas/${atleta.id}/editar`)}
                >
                  Editar Perfil
                </button>
              </div>
            )}
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
