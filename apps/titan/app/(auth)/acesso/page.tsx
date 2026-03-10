'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, UserPlus, Loader2 } from 'lucide-react'

type FuncaoStakeholder = 'FEDERACAO' | 'ACADEMIA' | 'ATLETA'
type ModoTela = 'login' | 'cadastro'

interface StakeholderDraft {
  funcao: FuncaoStakeholder
  nomeCompleto: string
  nomeUsuario: string
  email?: string
}

const GOOGLE_DRAFT_KEY = 'stakeholder_google_draft'

function AcessoUniversalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [modo, setModo] = useState<ModoTela>('login')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [identifier, setIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [funcao, setFuncao] = useState<FuncaoStakeholder>('ATLETA')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [cadastroEmail, setCadastroEmail] = useState('')
  const [cadastroSenha, setCadastroSenha] = useState('')

  const [precisaCompletarCadastro, setPrecisaCompletarCadastro] = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'cadastro') setModo('cadastro')

    const oauth = searchParams.get('oauth')
    if (oauth === 'success') {
      setMensagem('Login Google concluído. Finalizando cadastro...')
    }

    void checkSessionAndContinue()
  }, [searchParams])

  const checkSessionAndContinue = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const oauthSuccess = searchParams.get('oauth') === 'success'
    if (oauthSuccess) {
      const done = await finalizeGoogleCadastro(user.id, user.email ?? null)
      if (done) {
        router.replace('/portal')
        return
      }
    }

    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, nome_completo, nome_usuario, funcao')
      .eq('id', user.id)
      .maybeSingle()

    if (stakeholder) {
      router.replace('/portal')
      return
    }

    setPrecisaCompletarCadastro(true)
    setModo('cadastro')
    setNomeCompleto((prev) => prev || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || '')
    setCadastroEmail((prev) => prev || user.email || '')
    setMensagem('Complete os dados restantes para ativar seu acesso universal.')
  }

  const finalizeGoogleCadastro = async (userId: string, userEmail: string | null) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(GOOGLE_DRAFT_KEY) : null
      if (!raw) return false

      const draft = JSON.parse(raw) as StakeholderDraft
      if (!draft?.funcao || !draft?.nomeCompleto || !draft?.nomeUsuario) return false

      const sanitizedUsername = sanitizeUsername(draft.nomeUsuario)

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: draft.nomeCompleto,
          username: sanitizedUsername,
          stakeholder_role: draft.funcao,
        },
      })

      if (metadataError) throw metadataError

      const { error: upsertError } = await supabase
        .from('stakeholders')
        .upsert(
          {
            id: userId,
            funcao: draft.funcao,
            nome_completo: draft.nomeCompleto,
            nome_usuario: sanitizedUsername,
            email: userEmail ?? draft.email ?? null,
            senha: null,
          },
          { onConflict: 'id' }
        )

      if (upsertError) throw upsertError

      localStorage.removeItem(GOOGLE_DRAFT_KEY)
      return true
    } catch (err: any) {
      setErro(err.message || 'Falha ao finalizar cadastro com Google')
      return false
    }
  }

  const sanitizeUsername = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '')

  const resolveEmailFromIdentifier = async (value: string) => {
    const normalized = value.trim()
    if (normalized.includes('@')) return normalized

    const { data, error } = await supabase
      .from('stakeholders')
      .select('email')
      .eq('nome_usuario', sanitizeUsername(normalized))
      .maybeSingle()

    if (error) throw error
    if (!data?.email) throw new Error('Usuário sem email/senha. Use login com Google para esta conta.')

    return data.email
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    setMensagem(null)
    setLoading(true)

    try {
      const email = await resolveEmailFromIdentifier(identifier)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      })

      if (error) throw error

      router.push('/portal')
      router.refresh()
    } catch (err: any) {
      setErro(err.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  const validarBaseCadastro = () => {
    if (!funcao || !nomeCompleto.trim() || !nomeUsuario.trim()) {
      throw new Error('Preencha função, nome completo e nome de usuário.')
    }
  }

  const handleCadastroComEmail = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    setMensagem(null)
    setLoading(true)

    try {
      validarBaseCadastro()

      if (!cadastroEmail.trim() || !cadastroSenha.trim()) {
        throw new Error('Para cadastro com senha, email e senha são obrigatórios.')
      }

      const username = sanitizeUsername(nomeUsuario)

      const { data, error } = await supabase.auth.signUp({
        email: cadastroEmail.trim(),
        password: cadastroSenha,
        options: {
          data: {
            full_name: nomeCompleto.trim(),
            username,
            stakeholder_role: funcao,
          },
        },
      })

      if (error) throw error

      if (data.user && data.session) {
        router.push('/portal')
        router.refresh()
        return
      }

      setMensagem('Cadastro criado. Verifique seu email para confirmação e depois faça login.')
      setModo('login')
      setIdentifier(cadastroEmail.trim())
      setLoginPassword('')
    } catch (err: any) {
      setErro(err.message || 'Falha ao criar cadastro')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setErro(null)
    setMensagem(null)
    setLoading(true)

    try {
      if (modo === 'cadastro' || precisaCompletarCadastro) {
        validarBaseCadastro()
        const draft: StakeholderDraft = {
          funcao,
          nomeCompleto: nomeCompleto.trim(),
          nomeUsuario: sanitizeUsername(nomeUsuario),
          email: cadastroEmail.trim() || undefined,
        }
        localStorage.setItem(GOOGLE_DRAFT_KEY, JSON.stringify(draft))
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setLoading(false)
      setErro(err.message || 'Falha no login com Google')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
          {modo === 'login' ? <LogIn className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso Universal Titan</h1>
        <p className="text-muted-foreground mt-2">Entrada única para Federação, Academia e Atleta</p>
      </div>

      <div className="flex rounded-lg bg-muted p-1 mb-6">
        <button
          type="button"
          onClick={() => setModo('login')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${modo === 'login' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setModo('cadastro')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${modo === 'cadastro' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
        >
          Cadastro
        </button>
      </div>

      {erro && <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">{erro}</div>}
      {mensagem && <div className="mb-4 bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-lg text-sm">{mensagem}</div>}

      {modo === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-foreground mb-2">
              Usuário ou Email
            </label>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="seu.usuario ou email"
            />
          </div>

          <div>
            <label htmlFor="loginPassword" className="block text-sm font-medium text-foreground mb-2">
              Senha
            </label>
            <input
              id="loginPassword"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCadastroComEmail} className="space-y-4">
          <div>
            <label htmlFor="funcao" className="block text-sm font-medium text-foreground mb-2">
              Função
            </label>
            <select
              id="funcao"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value as FuncaoStakeholder)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="FEDERACAO">Federação</option>
              <option value="ACADEMIA">Academia</option>
              <option value="ATLETA">Atleta</option>
            </select>
          </div>

          <div>
            <label htmlFor="nomeCompleto" className="block text-sm font-medium text-foreground mb-2">
              Nome completo
            </label>
            <input
              id="nomeCompleto"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label htmlFor="nomeUsuario" className="block text-sm font-medium text-foreground mb-2">
              Nome de usuário (único)
            </label>
            <input
              id="nomeUsuario"
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="usuario_unico"
            />
          </div>

          <div>
            <label htmlFor="cadastroEmail" className="block text-sm font-medium text-foreground mb-2">
              Email (opcional para Google)
            </label>
            <input
              id="cadastroEmail"
              type="email"
              value={cadastroEmail}
              onChange={(e) => setCadastroEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="email@dominio.com"
            />
          </div>

          <div>
            <label htmlFor="cadastroSenha" className="block text-sm font-medium text-foreground mb-2">
              Senha (opcional para Google)
            </label>
            <input
              id="cadastroSenha"
              type="password"
              value={cadastroSenha}
              onChange={(e) => setCadastroSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : 'Cadastrar com Email/Senha'}
          </button>
        </form>
      )}

      <div className="my-5 flex items-center gap-3">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full border border-input hover:bg-accent text-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Continuar com Google
      </button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        O sistema usa cadastro universal de stakeholders para gerar ID único de referência.
      </p>
    </div>

  )
}

export default function AcessoUniversalPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      }
    >
      <AcessoUniversalContent />
    </Suspense>
  )
}
