'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, BarChart3, Calendar, Award, Settings } from 'lucide-react'

export default function PortalAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [athleteData, setAthleteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAthleteData()
  }, [])

  const loadAthleteData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // TODO: Fetch athlete data from atletas table
      setLoading(false)
    } catch (err) {
      console.error('Error loading athlete data:', err)
      setLoading(false)
    }
  }

  const menuItems = [
    {
      title: 'Meu Perfil',
      description: 'Dados pessoais e documentação',
      icon: <Award className="w-6 h-6" />,
      href: '/portal/atleta/perfil',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Minha Academia',
      description: 'Informações da academia e contatos',
      icon: <Award className="w-6 h-6" />,
      href: '/portal/atleta/academia',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Frequência',
      description: 'Histórico de presença e aulas',
      icon: <Calendar className="w-6 h-6" />,
      href: '/portal/atleta/frequencia',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Desempenho',
      description: 'Estatísticas e progressão',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/portal/atleta/desempenho',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Eventos',
      description: 'Competições e treinamentos',
      icon: <Calendar className="w-6 h-6" />,
      href: '/portal/atleta/eventos',
      color: 'from-pink-500 to-pink-600'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/portais')}
              className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            <h1 className="text-3xl font-bold text-white">Portal do Atleta</h1>
            <p className="text-gray-400 mt-1">Gerencie seu perfil e desempenho</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => router.push(item.href)}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${item.color} p-6 hover:shadow-lg transition-all transform hover:scale-105`}
            >
              <div className="relative z-10">
                <div className="text-white mb-3 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="font-bold text-white text-left mb-1">{item.title}</h3>
                <p className="text-white/80 text-sm text-left">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
