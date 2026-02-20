'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Zap, TrendingUp } from 'lucide-react'

export default function DesempenhoAtletaPage() {
  const router = useRouter()

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
          <h1 className="text-3xl font-bold text-white">Desempenho</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h3 className="font-semibold text-white">Vitórias</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">24</p>
            <p className="text-gray-400 text-sm mt-2">Total em competições</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
              <h3 className="font-semibold text-white">Taxa Vitória</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">68%</p>
            <p className="text-gray-400 text-sm mt-2">Últimos 30 dias</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h3 className="font-semibold text-white">Progresso</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">+15%</p>
            <p className="text-gray-400 text-sm mt-2">Comparado ao mês anterior</p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-white mb-4">Estatísticas por Categoria</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Judo Infantil</span>
                  <span className="text-gray-400">12 vitórias</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Judo Juvenil</span>
                  <span className="text-gray-400">8 vitórias</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '53%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Judo Adulto</span>
                  <span className="text-gray-400">4 vitórias</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style={{ width: '27%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="font-semibold text-white mb-4">Técnicas Favoritas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['O Goshi', 'Uchi Mata', 'Seoi Nage', 'Ko Uchi Gari'].map(technique => (
                <div key={technique} className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-300">{technique}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
