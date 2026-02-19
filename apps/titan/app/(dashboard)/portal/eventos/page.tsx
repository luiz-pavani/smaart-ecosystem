'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Plus, BarChart3, Trophy, FileText, Mail } from 'lucide-react'

export default function PortalEventosPage() {
  const router = useRouter()

  const menuItems = [
    {
      title: 'Meus Eventos',
      description: 'Evento que você está organizando',
      icon: <Calendar className="w-6 h-6" />,
      href: '/eventos',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Criar Evento',
      description: 'Crie um novo evento ou competição',
      icon: <Plus className="w-6 h-6" />,
      href: '/portal/eventos/novo',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Inscrições',
      description: 'Gerencie inscrições de atletas',
      icon: <FileText className="w-6 h-6" />,
      href: '/portal/eventos/inscricoes',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Resultados',
      description: 'Insira e publique resultados',
      icon: <Trophy className="w-6 h-6" />,
      href: '/portal/eventos/resultados',
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Relatórios',
      description: 'Análise e estatísticas de eventos',
      icon: <BarChart3 className="w-6 h-6" />,
      href: '/portal/eventos/relatorios',
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Comunicados',
      description: 'Envie mensagens aos inscritos',
      icon: <Mail className="w-6 h-6" />,
      href: '/portal/eventos/comunicados',
      color: 'from-cyan-500 to-cyan-600'
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
            <h1 className="text-3xl font-bold text-white">Portal de Eventos</h1>
            <p className="text-gray-400 mt-1">Organize e gerencie seus eventos e competições</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => router.push(item.href)}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${item.color} p-6 hover:shadow-lg transition-all transform hover:scale-105 h-40 flex flex-col justify-between`}
            >
              <div className="relative z-10 text-left">
                <div className="text-white mb-3 group-hover:scale-110 transition-transform w-fit">
                  {item.icon}
                </div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p className="text-white/80 text-sm">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
