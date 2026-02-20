'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Users, Clock, Award } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AcademiaAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [academia, setAcademia] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAcademia = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: atletaData } = await supabase
          .from('atletas')
          .select('academia_id')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (atletaData?.academia_id) {
          const { data } = await supabase
            .from('academias')
            .select('*')
            .eq('id', atletaData.academia_id)
            .limit(1)
            .single()
          setAcademia(data)
        }
      } catch (error) {
        console.error('Erro ao buscar academia:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAcademia()
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
          <h1 className="text-3xl font-bold text-white">Minha Academia</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Carregando...</div>
          </div>
        ) : academia ? (
          <div className="space-y-6">
            {/* Main Card */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">{academia.nome}</h2>
              <p className="text-purple-100">{academia.sigla}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold text-white">Localização</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  {academia.endereco}, {academia.numero}
                </p>
                <p className="text-gray-400 text-sm">
                  {academia.cidade}, {academia.estado} - {academia.cep}
                </p>
              </div>

              {/* Contact */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold text-white">Contato</h3>
                </div>
                <p className="text-gray-300 text-sm">{academia.email}</p>
                <p className="text-gray-300 text-sm">{academia.telefone}</p>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-purple-400" />
                <h3 className="font-semibold text-white">Horários de Aulas</h3>
              </div>
              <div className="text-gray-400 text-sm">
                <p>Segunda a Sexta: 18:00 - 22:00</p>
                <p>Sábado: 09:00 - 13:00</p>
              </div>
            </div>

            {/* Instructor */}
            {academia.responsavel_nome && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold text-white">Responsável</h3>
                </div>
                <p className="text-gray-300 font-semibold">{academia.responsavel_nome}</p>
                <p className="text-gray-400 text-sm">{academia.responsavel_email}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">Você não está vinculado a nenhuma academia</p>
          </div>
        )}
      </div>
    </div>
  )
}
