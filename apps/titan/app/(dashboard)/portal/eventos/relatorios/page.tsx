'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3, Download } from 'lucide-react'

export default function RelatoriosEventosPage() {
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
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Total de Eventos</p>
            <p className="text-3xl font-bold text-blue-400">12</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Total de Inscritos</p>
            <p className="text-3xl font-bold text-green-400">245</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Taxa de Comparecimento</p>
            <p className="text-3xl font-bold text-yellow-400">87%</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Receita Total</p>
            <p className="text-3xl font-bold text-purple-400">R$ 12.2K</p>
          </div>
        </div>

        {/* Relatórios */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Relatórios Disponíveis</h2>
          
          {[
            { titulo: 'Resumo Executivo - Fevereiro 2026', tipo: 'PDF', tamanho: '2.4 MB' },
            { titulo: 'Análise de Participação por Categoria', tipo: 'PDF', tamanho: '1.8 MB' },
            { titulo: 'Relatório Financeiro Completo', tipo: 'XLSX', tamanho: '512 KB' },
            { titulo: 'Estatísticas de Desempenho por Academia', tipo: 'PDF', tamanho: '3.1 MB' },
          ].map((rel, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-pink-500/30 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{rel.titulo}</h3>
                  <p className="text-gray-400 text-sm">{rel.tipo} • {rel.tamanho}</p>
                </div>
              </div>
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-6">Inscritos por Mês</h3>
            <div className="space-y-4">
              {[
                { mes: 'Dezembro', count: 34 },
                { mes: 'Janeiro', count: 78 },
                { mes: 'Fevereiro', count: 133 },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.mes}</span>
                    <span className="text-gray-400">{item.count}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${(item.count / 133) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-6">Faixa Etária dos Participantes</h3>
            <div className="space-y-4">
              {[
                { faixa: 'Infantil (6-11)', percent: 35 },
                { faixa: 'Juvenil (12-17)', percent: 40 },
                { faixa: 'Adulto (18+)', percent: 25 },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.faixa}</span>
                    <span className="text-gray-400">{item.percent}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${item.percent}%` }}></div>
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
