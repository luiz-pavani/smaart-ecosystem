'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

export default function FinanceiroFedaracaoPage() {
  const router = useRouter()

  const transactions = [
    { id: 1, tipo: 'receita', descricao: 'Filiações (Academia Master)', valor: 5000, data: '15/02' },
    { id: 2, tipo: 'despesa', descricao: 'Manutenção servidor', valor: 500, data: '14/02' },
    { id: 3, tipo: 'receita', descricao: 'Taxa de inscrição evento', valor: 3500, data: '10/02' },
    { id: 4, tipo: 'despesa', descricao: 'Materiais e equipamento', valor: 1200, data: '08/02' },
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
          <h1 className="text-3xl font-bold text-white">Financeiro</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h3 className="font-semibold text-white">Receitas</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">R$ 8.500</p>
            <p className="text-gray-400 text-sm mt-2">Por mês</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown className="w-6 h-6 text-red-400" />
              <h3 className="font-semibold text-white">Despesas</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">R$ 1.700</p>
            <p className="text-gray-400 text-sm mt-2">Por mês</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-blue-400" />
              <h3 className="font-semibold text-white">Saldo</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">R$ 6.800</p>
            <p className="text-gray-400 text-sm mt-2">Disponível</p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
          <div className="px-6 py-3 border-b border-white/10 bg-white/5">
            <h3 className="font-semibold text-white">Transações Recentes</h3>
          </div>
          <table className="w-full">
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-gray-300">{tx.descricao}</p>
                    <p className="text-gray-400 text-sm">{tx.data}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold ${tx.tipo === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.tipo === 'receita' ? '+' : '-'} R$ {tx.valor.toLocaleString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
