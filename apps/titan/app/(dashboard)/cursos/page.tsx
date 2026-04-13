'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

const PROFEP_URL = process.env.NEXT_PUBLIC_PROFEP_URL || 'https://www.profepmax.com.br'

export default function CursosPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccess() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/candidato/sso/token')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar acesso')
      window.open(`${PROFEP_URL}/auth/titan?token=${encodeURIComponent(data.token)}`, '_blank')
    } catch (e: any) {
      setError(e.message || 'Erro ao acessar ProfepMax')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cursos</h1>
            <p className="text-muted-foreground mt-2">
              Plataforma de educação e treinamento ProfepMax
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-12 text-center border border-border">
        <ExternalLink className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">
          Acessar Plataforma de Cursos
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Clique no botão abaixo para acessar a plataforma ProfepMax de cursos e treinamentos
        </p>
        {error && (
          <p className="text-red-500 text-sm font-semibold mb-4">{error}</p>
        )}
        <button
          onClick={handleAccess}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Preparando acesso...</>
          ) : (
            <><span>Abrir ProfepMax em nova janela</span><ExternalLink className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  )
}
