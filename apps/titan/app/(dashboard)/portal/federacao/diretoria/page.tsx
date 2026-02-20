'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Briefcase } from 'lucide-react'

export default function DiretoriaFedaracaoPage() {
  const router = useRouter()

  const diretores = [
    { id: 1, nome: 'Carlos Silva', cargo: 'Presidente', email: 'carlos@federacao.com', telefone: '(11) 98765-4321' },
    { id: 2, nome: 'Ana Costa', cargo: 'Vice-Presidente', email: 'ana@federacao.com', telefone: '(11) 98765-4322' },
    { id: 3, nome: 'Roberto Mendes', cargo: 'Tesoureiro', email: 'roberto@federacao.com', telefone: '(11) 98765-4323' },
    { id: 4, nome: 'Mariana Santos', cargo: 'Secretária', email: 'mariana@federacao.com', telefone: '(11) 98765-4324' },
    { id: 5, nome: 'Pedro Oliveira', cargo: 'Diretor de Competições', email: 'pedro@federacao.com', telefone: '(11) 98765-4325' },
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
          <h1 className="text-3xl font-bold text-white">Diretoria</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {diretores.map(diretor => (
            <div key={diretor.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{diretor.nome}</h3>
                  <p className="text-indigo-400 text-sm font-semibold">{diretor.cargo}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300 hover:text-blue-400 cursor-pointer transition-colors">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${diretor.email}`}>{diretor.email}</a>
                </div>
                <div className="flex items-center gap-2 text-gray-300 hover:text-blue-400 cursor-pointer transition-colors">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${diretor.telefone}`}>{diretor.telefone}</a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reuniões */}
        <div className="mt-12 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-white mb-6">Próximas Reuniões</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="font-semibold text-white">Reunião Ordinária da Diretoria</p>
                <p className="text-gray-400 text-sm">25 de Fevereiro, 18:00</p>
              </div>
              <a href="#" className="text-blue-400 hover:text-blue-300">Participar</a>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="font-semibold text-white">Assembleia Geral</p>
                <p className="text-gray-400 text-sm">15 de Março, 19:00</p>
              </div>
              <a href="#" className="text-blue-400 hover:text-blue-300">Participar</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
