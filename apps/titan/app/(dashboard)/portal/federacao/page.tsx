'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Users, Trophy, DollarSign, FileText, Shield, Settings } from 'lucide-react'

export default function PortalFederacaoPage() {
  const router = useRouter()

  const menuItems = [
    {
      title: 'Academias Filiadas',
      description: 'Gerencie as academias filiadas',
      icon: <Building2 className="w-6 h-6" />,
      href: '/academias',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Atletas (Todos)',
      description: 'Visualize todos os atletas da federação',
      icon: <Users className="w-6 h-6" />,
      href: '/portal/federacao/atletas',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Eventos & Competições',
      description: 'Crie e gerencie competições e eventos',
      icon: <Trophy className="w-6 h-6" />,
      href: '/eventos',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Financeiro',
      description: 'Controle de receitas e despesas',
      icon: <DollarSign className="w-6 h-6" />,
      href: '/portal/federacao/financeiro',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Regulamentações',
      description: 'Documentos e regras da federação',
      icon: <FileText className="w-6 h-6" />,
      href: '/portal/federacao/regulamento',
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Diretoria',
      description: 'Gestão de membros da diretoria',
      icon: <Shield className="w-6 h-6" />,
      href: '/portal/federacao/diretoria',
      color: 'from-indigo-500 to-indigo-600'
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
            <h1 className="text-3xl font-bold text-white">Portal da Federação</h1>
            <p className="text-gray-400 mt-1">Administre a federação, academias e competições</p>
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
