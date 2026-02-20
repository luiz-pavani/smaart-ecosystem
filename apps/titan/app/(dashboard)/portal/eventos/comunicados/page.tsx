'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function ComunicadosEventosPage() {
  const router = useRouter()
  const [comunicados, setComunicados] = useState([
    { id: 1, evento: 'Campeonato Estadual', titulo: 'Inscrições Abertas!', data: '20/02', enviado: true },
    { id: 2, evento: 'Open Judo Brasil', titulo: 'Confirmação de Participação', data: '15/02', enviado: false },
    { id: 3, evento: 'Campeonato Municipal', titulo: 'Resultado do Sorteio de Chaves', data: '10/02', enviado: true },
  ])

  const [novoComunicado, setNovoComunicado] = useState({
    evento: '',
    titulo: '',
    mensagem: '',
  })

  const handleSend = () => {
    if (novoComunicado.evento && novoComunicado.titulo && novoComunicado.mensagem) {
      const novoComun = {
        id: comunicados.length + 1,
        evento: novoComunicado.evento,
        titulo: novoComunicado.titulo,
        data: new Date().toLocaleDateString('pt-BR'),
        enviado: true,
      }
      setComunicados([novoComun, ...comunicados])
      setNovoComunicado({ evento: '', titulo: '', mensagem: '' })
      alert('Comunicado enviado com sucesso!')
    }
  }

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
          <h1 className="text-3xl font-bold text-white">Comunicados</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Form to Create */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Novo Comunicado</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Evento</label>
              <select
                value={novoComunicado.evento}
                onChange={(e) => setNovoComunicado({...novoComunicado, evento: e.target.value})}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Selecione um evento...</option>
                <option value="Campeonato Estadual">Campeonato Estadual</option>
                <option value="Open Judo Brasil">Open Judo Brasil</option>
                <option value="Campeonato Municipal">Campeonato Municipal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Título</label>
              <input
                type="text"
                value={novoComunicado.titulo}
                onChange={(e) => setNovoComunicado({...novoComunicado, titulo: e.target.value})}
                placeholder="Ex: Inscrições Abertas"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Mensagem</label>
              <textarea
                value={novoComunicado.mensagem}
                onChange={(e) => setNovoComunicado({...novoComunicado, mensagem: e.target.value})}
                placeholder="Digite a mensagem para os inscritos..."
                rows={4}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              <Send className="w-4 h-4" />
              Enviar Comunicado
            </button>
          </div>
        </div>

        {/* Lista de Comunicados */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">Histórico de Comunicados</h2>
          <div className="space-y-4">
            {comunicados.map(comun => (
              <div key={comun.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:border-blue-500/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{comun.titulo}</h3>
                      {comun.enviado ? (
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-semibold">
                          Enviado
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs font-semibold">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{comun.evento}</p>
                    <p className="text-gray-500 text-xs">{comun.data}</p>
                  </div>
                  <button className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
