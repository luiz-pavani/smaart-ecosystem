'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface StatCard {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

export function PagamentosStats() {
  const [stats, setStats] = useState<StatCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/pagamentos/listar')
        const data = await res.json()

        if (!data.pedidos) {
          throw new Error('Dados inválidos')
        }

        const pedidos = data.pedidos
        const total_pedidos = pedidos.length
        const total_valor = pedidos.reduce((sum: number, p: any) => sum + (p.valor || 0), 0)
        const pedidos_aprovados = pedidos.filter((p: any) => p.status === 'aprovado').length
        const pedidos_pendentes = pedidos.filter((p: any) => p.status === 'pendente').length
        const pct_aprovados = total_pedidos > 0 ? Math.round((pedidos_aprovados / total_pedidos) * 100) : 0

        const newStats: StatCard[] = [
          {
            label: 'Total de Pedidos',
            value: total_pedidos.toString(),
            icon: <TrendingUp className="w-6 h-6" />,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            label: 'Valor Total',
            value: `R$ ${total_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <CheckCircle className="w-6 h-6" />,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            label: 'Aprovados',
            value: `${pct_aprovados}%`,
            icon: <CheckCircle className="w-6 h-6" />,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50'
          },
          {
            label: 'Pendentes',
            value: pedidos_pendentes.toString(),
            icon: <Clock className="w-6 h-6" />,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          }
        ]

        setStats(newStats)
      } catch (err) {
        console.error('Erro ao carregar stats:', err)
        setError('Erro ao carregar estatísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-8 flex gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className={`${stat.bgColor} p-6 rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-default`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
            <div className={stat.color}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}