'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, User, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Diretor {
  id: string; nome: string; cargo: string
  email: string | null; telefone: string | null; url_foto: string | null; role: string
}

const ROLE_COLORS: Record<string, string> = {
  master_access:    'text-yellow-400',
  federacao_admin:  'text-indigo-400',
  federacao_gestor: 'text-blue-400',
}

export default function DiretoriaFederacaoPage() {
  const router = useRouter()
  const [diretoria, setDiretoria] = useState<Diretor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/federacao/diretoria')
      if (res.ok) setDiretoria((await res.json()).diretoria || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-5 h-5" />Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Diretoria</h1>
              <p className="text-gray-400 mt-1">Administradores e gestores da federação</p>
            </div>
            <button onClick={load} disabled={loading} className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : diretoria.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-gray-400">
            <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            Nenhum membro da diretoria cadastrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {diretoria.map(d => (
              <div key={d.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 hover:border-indigo-500/30 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-indigo-500/20 flex items-center justify-center">
                    {d.url_foto ? (
                      <img src={d.url_foto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{d.nome}</h3>
                    <p className={`text-sm font-semibold ${ROLE_COLORS[d.role] || 'text-gray-400'}`}>{d.cargo}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {d.email && (
                    <a href={`mailto:${d.email}`} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                      <Mail className="w-4 h-4 shrink-0" />{d.email}
                    </a>
                  )}
                  {d.telefone && (
                    <a href={`tel:${d.telefone}`} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
                      <Phone className="w-4 h-4 shrink-0" />{d.telefone}
                    </a>
                  )}
                  {!d.email && !d.telefone && <p className="text-gray-600 italic">Sem contato cadastrado</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
