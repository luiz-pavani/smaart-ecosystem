'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Download } from 'lucide-react'

export default function RegulamentoFedaracaoPage() {
  const router = useRouter()

  const documentos = [
    { id: 1, titulo: 'Regulamento Geral da Federação', ano: 2026, status: 'Ativo' },
    { id: 2, titulo: 'Código de Conduta do Atleta', ano: 2025, status: 'Ativo' },
    { id: 3, titulo: 'Normas de Segurança em Competições', ano: 2025, status: 'Ativo' },
    { id: 4, titulo: 'Regras de Categorização de Atletas', ano: 2026, status: 'Ativo' },
    { id: 5, titulo: 'Politica de Antidoping', ano: 2025, status: 'Ativo' },
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
          <h1 className="text-3xl font-bold text-white">Regulamentações</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {documentos.map(doc => (
            <div key={doc.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-red-500/30 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{doc.titulo}</h3>
                  <p className="text-gray-400 text-sm">Atualizado: {doc.ano}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold">
                  {doc.status}
                </span>
                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-white mb-4">Informações Importantes</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold mt-1">•</span>
              <span>Todos os atletas devem estar familiarizados com o Código de Conduta</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold mt-1">•</span>
              <span>As normas de segurança são obrigatórias em todos os eventos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-bold mt-1">•</span>
              <span>Qualquer dúvida sobre regulamentos, contate a administração</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
