'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, Filter } from 'lucide-react'
import { useState } from 'react'

export default function AtletasAcademiaPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const atletas = [
    { id: 1, nome: 'João Silva', cpf: '123.456.789-00', nivel: 'Faixa Azul', status: 'Ativo' },
    { id: 2, nome: 'Maria Santos', cpf: '987.654.321-00', nivel: 'Faixa Marrom', status: 'Ativo' },
    { id: 3, nome: 'Pedro Oliveira', cpf: '456.123.789-00', nivel: 'Faixa Branca', status: 'Inativo' },
    { id: 4, nome: 'Ana Costa', cpf: '789.456.123-00', nivel: 'Faixa Preta', status: 'Ativo' },
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
          <h1 className="text-3xl font-bold text-white">Meus Atletas</h1>
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
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all">
            <Plus className="w-4 h-4" />
            Novo Atleta
          </button>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">CPF</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Nível</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Ações</th>
              </tr>
            </thead>
            <tbody>
              {atletas.map((atleta) => (
                <tr key={atleta.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-300">{atleta.nome}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono text-sm">{atleta.cpf}</td>
                  <td className="px-6 py-4 text-gray-300">{atleta.nivel}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      atleta.status === 'Ativo'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {atleta.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
                      Editar
                    </button>
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
