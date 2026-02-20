'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3 } from 'lucide-react'

export default function DesempenhoAcademiaPage() {
  const router = useRouter()

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
          <h1 className="text-3xl font-bold text-white">Desempenho</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Total de Atletas</p>
            <p className="text-3xl font-bold text-blue-400">45</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Frequência Média</p>
            <p className="text-3xl font-bold text-green-400">85%</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Aulas/Mês</p>
            <p className="text-3xl font-bold text-purple-400">24</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Taxa Retenção</p>
            <p className="text-3xl font-bold text-yellow-400">92%</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Atletas por Nível
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Faixa Branca', count: 12, color: 'bg-blue-500' },
                { label: 'Faixa Azul', count: 15, color: 'bg-cyan-500' },
                { label: 'Faixa Marrom', count: 12, color: 'bg-yellow-600' },
                { label: 'Faixa Preta', count: 6, color: 'bg-gray-700' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.label}</span>
                    <span className="text-gray-400">{item.count}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.count / 45) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Crescimento Mensal
            </h3>
            <div className="space-y-4">
              {[
                { mes: 'Dezembro', taxa: 36 },
                { mes: 'Janeiro', taxa: 42 },
                { mes: 'Fevereiro', taxa: 45 },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.mes}</span>
                    <span className="text-gray-400">{item.taxa} atletas</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(item.taxa / 50) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
