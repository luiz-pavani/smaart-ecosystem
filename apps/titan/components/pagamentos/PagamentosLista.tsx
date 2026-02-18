'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

interface Pedido {
  pedido_id: string
  academia_sigla: string
  atleta_nome: string
  valor: number
  status: 'pendente' | 'aprovado' | 'recusado'
  metodo_pagamento: string
  data_criacao: string
}

export function PagamentosLista() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  const carregarPedidos = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pagamentos/listar')
      if (res.ok) {
        const data = await res.json()
        setPedidos(data.pedidos)
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPedidos()
  }, [])

  const formatarData = (d: string) => new Date(d).toLocaleDateString('pt-BR')
  const formatarMoeda = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const statusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-700'
      case 'pendente':
        return 'bg-yellow-100 text-yellow-700'
      case 'recusado':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Pedidos de Pagamento</h3>
        <button
          onClick={carregarPedidos}
          className="p-2 hover:bg-gray-100 rounded text-gray-600"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        {pedidos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum pedido encontrado
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Academia</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Atleta</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Valor</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Método</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedidos.map((p) => (
                <tr key={p.pedido_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{p.academia_sigla}</td>
                  <td className="px-6 py-3 text-gray-700">{p.atleta_nome}</td>
                  <td className="px-6 py-3 font-semibold">{formatarMoeda(p.valor)}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {p.metodo_pagamento.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{formatarData(p.data_criacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
