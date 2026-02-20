'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Filter } from 'lucide-react'
import { useState } from 'react'

export default function AtletasFedaracaoPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const atletas = [
    { id: 1, nome: 'João Silva', academia: 'Academia Master', nivel: 'Faixa Preta', federacao: 'Cotia' },
    { id: 2, nome: 'Maria Santos', academia: 'Judo Center', nivel: 'Faixa Marrom', federacao: 'Campinas' },
    { id: 3, nome: 'Ana Costa', academia: 'Elite Judo', nivel: 'Faixa Preta', federacao: 'Santos' },
    { id: 4, nome: 'Pedro Oliveira', academia: 'Academia Master', nivel: 'Faixa Azul', federacao: 'Cotia' },
    { id: 5, nome: 'Lucas Mendes', academia: 'Iniciantes Judo', nivel: 'Faixa Branca', federacao: 'Sorocaba' },
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
          <h1 className="text-3xl font-bold text-white">Todos os Atletas</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Toolbar */}
        <div className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Academia</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nível</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Federação</th>
              </tr>
            </thead>
            <tbody>
              {atletas.map((atleta) => (
                <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-300">{atleta.nome}</td>
                  <td className="px-6 py-4 text-gray-300">{atleta.academia}</td>
                  <td className="px-6 py-4 text-gray-300">{atleta.nivel}</td>
                  <td className="px-6 py-4 text-gray-400">{atleta.federacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-gray-400 text-sm mt-4">Total: {atletas.length} atletas</p>
      </div>
    </div>
  )
}
