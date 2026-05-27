'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/**
 * Página de destino do link enviado por email. Quando o Supabase processa o
 * token de recovery no /auth/callback, ele cria uma sessão temporária. Aqui o
 * usuário pode então chamar updateUser({ password }).
 */
export default function RedefinirSenhaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // @supabase/ssr (createBrowserClient) NÃO ativa detectSessionInUrl=true por default
    // — o hash fragment (#access_token=…&refresh_token=…&type=recovery) precisa ser
    // processado manualmente via setSession().
    (async () => {
      // Se já tem sessão ativa (refresh em página recém-aberta), apenas libera o form.
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) { setReady(true); return }

      // Parser do hash fragment
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setError('Link inválido ou expirado. Solicite um novo link.')
        return
      }

      const { error: err } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (err) {
        setError('Link inválido ou expirado. Solicite um novo link.')
        return
      }
      // Limpa o hash da URL para não vazar tokens em logs/screenshots subsequentes
      window.history.replaceState(null, '', window.location.pathname)
      setReady(true)
    })()
  }, [supabase])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setError('As senhas não conferem.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: novaSenha })
      if (err) throw err
      setMessage('Senha redefinida! Redirecionando…')
      setTimeout(() => router.push('/portal'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold mb-2">Definir nova senha</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Escolha uma nova senha para sua conta no Titan.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
          {error.includes('Link inválido') && (
            <p className="mt-2">
              <Link href="/recuperar-senha" className="underline">Solicitar novo link</Link>
            </p>
          )}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          {message}
        </div>
      )}

      {ready && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="novaSenha" className="block text-sm font-medium mb-1">Nova senha</label>
            <input
              id="novaSenha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label htmlFor="confirmar" className="block text-sm font-medium mb-1">Confirmar nova senha</label>
            <input
              id="confirmar"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </div>
  )
}
