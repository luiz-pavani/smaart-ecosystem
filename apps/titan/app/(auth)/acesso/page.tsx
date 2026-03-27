'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, UserPlus, Loader2, MessageSquare, Phone } from 'lucide-react'

type FuncaoStakeholder = 'FEDERACAO' | 'ACADEMIA' | 'ATLETA'
type ModoTela = 'login' | 'cadastro'
type OtpStep = 'idle' | 'sending' | 'sent' | 'verifying'

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

  // WhatsApp OTP state
  const [cadastroTelefone, setCadastroTelefone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  const [otpPhone, setOtpPhone] = useState('')

  // Login via WhatsApp state
  const [loginTelefone, setLoginTelefone] = useState('')
  const [loginOtpCode, setLoginOtpCode] = useState('')
  const [loginOtpStep, setLoginOtpStep] = useState<OtpStep>('idle')
  const [loginOtpPhone, setLoginOtpPhone] = useState('')

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
    if (!data?.email) throw new Error('Usuário sem email/senha. Use login com Google ou WhatsApp para esta conta.')

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

  // --- Login via WhatsApp OTP ---
  const handleLoginSendOtp = async () => {
    setErro(null)
    setMensagem(null)
    if (!loginTelefone.trim()) {
      setErro('Informe seu número de WhatsApp')
      return
    }
    setLoginOtpStep('sending')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: loginTelefone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLoginOtpPhone(data.telefone)
      setLoginOtpStep('sent')
      setMensagem('Código enviado para seu WhatsApp!')
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar código')
      setLoginOtpStep('idle')
    }
  }

  const handleLoginVerifyOtp = async () => {
    setErro(null)
    setMensagem(null)
    if (!loginOtpCode.trim()) {
      setErro('Digite o código recebido')
      return
    }
    setLoginOtpStep('verifying')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: loginOtpPhone, code: loginOtpCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        router.push('/portal')
        router.refresh()
      } else {
        throw new Error('Conta não encontrada. Faça o cadastro primeiro.')
      }
    } catch (err: any) {
      setErro(err.message || 'Código inválido')
      setLoginOtpStep('sent')
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

  // --- Cadastro via WhatsApp OTP ---
  const handleCadastroSendOtp = async () => {
    setErro(null)
    setMensagem(null)
    try {
      validarBaseCadastro()
      if (!cadastroTelefone.trim()) {
        throw new Error('Informe seu número de WhatsApp')
      }
    } catch (err: any) {
      setErro(err.message)
      return
    }
    setOtpStep('sending')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: cadastroTelefone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOtpPhone(data.telefone)
      setOtpStep('sent')
      setMensagem('Código enviado para seu WhatsApp!')
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar código')
      setOtpStep('idle')
    }
  }

  const handleCadastroVerifyOtp = async () => {
    setErro(null)
    setMensagem(null)
    if (!otpCode.trim()) {
      setErro('Digite o código recebido')
      return
    }
    setOtpStep('verifying')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: otpPhone,
          code: otpCode,
          nomeCompleto: nomeCompleto.trim(),
          nomeUsuario: sanitizeUsername(nomeUsuario),
          funcao,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        router.push('/portal')
        router.refresh()
      }
    } catch (err: any) {
      setErro(err.message || 'Código inválido')
      setOtpStep('sent')
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

  const inputClass = 'w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all'
  const labelClass = 'block text-sm font-medium text-foreground mb-2'

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
        <>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="identifier" className={labelClass}>Usuário ou Email</label>
              <input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className={inputClass}
                placeholder="seu.usuario ou email"
              />
            </div>

            <div>
              <label htmlFor="loginPassword" className={labelClass}>Senha</label>
              <input
                id="loginPassword"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className={inputClass}
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

          {/* Login via WhatsApp */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">ou entre via WhatsApp</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="space-y-3">
            {loginOtpStep === 'idle' || loginOtpStep === 'sending' ? (
              <>
                <div>
                  <label htmlFor="loginTelefone" className={labelClass}>WhatsApp</label>
                  <input
                    id="loginTelefone"
                    type="tel"
                    value={loginTelefone}
                    onChange={(e) => setLoginTelefone(e.target.value)}
                    className={inputClass}
                    placeholder="DDD + número (ex: 55984085000)"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLoginSendOtp}
                  disabled={loginOtpStep === 'sending'}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {loginOtpStep === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  {loginOtpStep === 'sending' ? 'Enviando...' : 'Receber código via WhatsApp'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Código enviado para seu WhatsApp. Digite abaixo:</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={loginOtpCode}
                  onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                  placeholder="000000"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleLoginVerifyOtp}
                  disabled={loginOtpStep === 'verifying' || loginOtpCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {loginOtpStep === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {loginOtpStep === 'verifying' ? 'Verificando...' : 'Verificar e entrar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginOtpStep('idle'); setLoginOtpCode('') }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reenviar código
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <form onSubmit={handleCadastroComEmail} className="space-y-4">
            <div>
              <label htmlFor="funcao" className={labelClass}>Função</label>
              <select
                id="funcao"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value as FuncaoStakeholder)}
                className={inputClass}
              >
                <option value="FEDERACAO">Federação</option>
                <option value="ACADEMIA">Academia</option>
                <option value="ATLETA">Atleta</option>
              </select>
            </div>

            <div>
              <label htmlFor="nomeCompleto" className={labelClass}>Nome completo</label>
              <input
                id="nomeCompleto"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                required
                className={inputClass}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label htmlFor="nomeUsuario" className={labelClass}>Nome de usuário (único)</label>
              <input
                id="nomeUsuario"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                required
                className={inputClass}
                placeholder="usuario_unico"
              />
            </div>

            <div>
              <label htmlFor="cadastroEmail" className={labelClass}>Email (opcional)</label>
              <input
                id="cadastroEmail"
                type="email"
                value={cadastroEmail}
                onChange={(e) => setCadastroEmail(e.target.value)}
                className={inputClass}
                placeholder="email@dominio.com"
              />
            </div>

            <div>
              <label htmlFor="cadastroSenha" className={labelClass}>Senha (opcional)</label>
              <input
                id="cadastroSenha"
                type="password"
                value={cadastroSenha}
                onChange={(e) => setCadastroSenha(e.target.value)}
                className={inputClass}
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

          {/* Cadastro via WhatsApp */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">ou cadastre via WhatsApp</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="space-y-3">
            {otpStep === 'idle' || otpStep === 'sending' ? (
              <>
                <div>
                  <label htmlFor="cadastroTelefone" className={labelClass}>WhatsApp</label>
                  <input
                    id="cadastroTelefone"
                    type="tel"
                    value={cadastroTelefone}
                    onChange={(e) => setCadastroTelefone(e.target.value)}
                    className={inputClass}
                    placeholder="DDD + número (ex: 55984085000)"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCadastroSendOtp}
                  disabled={otpStep === 'sending'}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {otpStep === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  {otpStep === 'sending' ? 'Enviando...' : 'Cadastrar via WhatsApp'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Código enviado para seu WhatsApp. Digite abaixo:</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                  placeholder="000000"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCadastroVerifyOtp}
                  disabled={otpStep === 'verifying' || otpCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                >
                  {otpStep === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {otpStep === 'verifying' ? 'Verificando...' : 'Verificar e criar conta'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpStep('idle'); setOtpCode('') }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reenviar código
                </button>
              </>
            )}
          </div>
        </>
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

      <div className="mt-5 pt-5 border-t border-border text-center">
        <p className="text-sm text-muted-foreground mb-2">Novo atleta? Ainda não é filiado?</p>
        <a
          href="/filiacao"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Solicitar filiação à LRSJ
        </a>
      </div>
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
