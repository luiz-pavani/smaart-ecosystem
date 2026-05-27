'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function RecuperarSenhaPage() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar redefinição')
      setMessage(data.message || 'Se houver conta, enviaremos as instruções por email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha desconhecida')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold mb-2">Recuperar acesso</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Informe o email, telefone ou nome de usuário associado à sua conta.
        Enviaremos um link de redefinição de senha para o email cadastrado.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium mb-1">
            Email, telefone ou usuário
          </label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="seu@email.com ou (51) 9..."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Enviar link de redefinição'}
        </button>
      </form>

      {message && (
        <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Lembrou da senha? <Link href="/acesso" className="text-primary underline">Voltar ao login</Link>
      </p>
    </div>
  )
}
