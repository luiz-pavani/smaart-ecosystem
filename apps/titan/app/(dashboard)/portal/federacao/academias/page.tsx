'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Building2 } from 'lucide-react'

export default function AcademiasFedaracaoPage() {
  const router = useRouter()

  const academias = [
    { id: 1, nome: 'Academia Master', sigla: 'AM', cidade: 'São Paulo', atletas: 45, status: 'Ativa' },
    { id: 2, nome: 'Judo Center', sigla: 'JC', cidade: 'Campinas', atletas: 32, status: 'Ativa' },
    { id: 3, nome: 'Elite Judo', sigla: 'EJ', cidade: 'Santos', atletas: 28, status: 'Ativa' },
    { id: 4, nome: 'Iniciantes Judo', sigla: 'IJ', cidade: 'Sorocaba', atletas: 15, status: 'Ativa' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Academias Filiadas</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Add Button */}
        <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all mb-8">
          <Plus className="w-5 h-5" />
          Nova Academia
        </button>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {academias.map(academia => (
            <div key={academia.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{academia.nome}</h3>
                    <p className="text-gray-400 text-sm">{academia.sigla}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold">
                  {academia.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm mb-4">
                <p className="text-gray-400"><span className="text-gray-300 font-semibold">{academia.cidade}</span></p>
                <p className="text-gray-400"><span className="text-gray-300 font-semibold">{academia.atletas}</span> atletas</p>
              </div>

              <button className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg border border-white/10 transition-all">
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
