'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, UserPlus, Loader2, MessageSquare, Phone, Mail } from 'lucide-react'

type FuncaoStakeholder = 'FEDERACAO' | 'ACADEMIA' | 'ATLETA'
type ModoTela = 'login' | 'cadastro'
type OtpStep = 'idle' | 'sending' | 'sent' | 'verifying'
type CadastroConfirmMethod = null | 'email' | 'whatsapp'

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

  // Login
  const [identifier, setIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Cadastro base
  const [funcao, setFuncao] = useState<FuncaoStakeholder>('ATLETA')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [cadastroSenha, setCadastroSenha] = useState('')

  // Cadastro confirmation
  const [confirmMethod, setConfirmMethod] = useState<CadastroConfirmMethod>(null)
  const [cadastroEmail, setCadastroEmail] = useState('')
  const [cadastroTelefone, setCadastroTelefone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpStep, setOtpStep] = useState<OtpStep>('idle')
  const [otpPhone, setOtpPhone] = useState('')

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
      if (done) { router.replace('/portal'); return }
    }

    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, nome_completo, nome_usuario, funcao')
      .eq('id', user.id)
      .maybeSingle()

    if (stakeholder) { router.replace('/portal'); return }

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
        data: { full_name: draft.nomeCompleto, username: sanitizedUsername, stakeholder_role: draft.funcao },
      })
      if (metadataError) throw metadataError

      const { error: upsertError } = await supabase.from('stakeholders').upsert({
        id: userId, funcao: draft.funcao, nome_completo: draft.nomeCompleto,
        nome_usuario: sanitizedUsername, email: userEmail ?? draft.email ?? null, senha: null,
      }, { onConflict: 'id' })
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

    const digits = normalized.replace(/\D/g, '')
    if (digits.length >= 10) {
      const phone = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
      const { data } = await supabase.from('stakeholders').select('email, telefone').eq('telefone', phone).maybeSingle()
      if (data?.email) return data.email
      if (data) return `${phone}@whatsapp.titan.app`
      throw new Error('Telefone não encontrado. Verifique o número ou faça o cadastro.')
    }

    const { data, error } = await supabase.from('stakeholders').select('email, telefone').eq('nome_usuario', sanitizeUsername(normalized)).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Usuário não encontrado.')
    if (data.email) return data.email
    if (data.telefone) return `${data.telefone}@whatsapp.titan.app`
    throw new Error('Usuário sem email cadastrado. Use login com Google.')
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null); setMensagem(null); setLoading(true)
    try {
      const email = await resolveEmailFromIdentifier(identifier)
      const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword })
      if (error) throw error
      router.push('/portal'); router.refresh()
    } catch (err: any) {
      setErro(err.message || 'Falha no login')
    } finally { setLoading(false) }
  }

  const validarBaseCadastro = () => {
    if (!funcao || !nomeCompleto.trim() || !nomeUsuario.trim() || !cadastroSenha.trim()) {
      throw new Error('Preencha todos os campos: função, nome completo, nome de usuário e senha.')
    }
    if (cadastroSenha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.')
  }

  const handleCadastroComEmail = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null); setMensagem(null); setLoading(true)
    try {
      validarBaseCadastro()
      if (!cadastroEmail.trim()) throw new Error('Informe seu email para confirmação.')
      const username = sanitizeUsername(nomeUsuario)
      const { data, error } = await supabase.auth.signUp({
        email: cadastroEmail.trim(), password: cadastroSenha,
        options: { data: { full_name: nomeCompleto.trim(), username, stakeholder_role: funcao } },
      })
      if (error) throw error
      if (data.user && data.session) { router.push('/portal'); router.refresh(); return }
      setMensagem('Cadastro criado! Verifique seu email para confirmação e depois faça login.')
      setModo('login'); setIdentifier(cadastroEmail.trim()); setLoginPassword('')
    } catch (err: any) {
      setErro(err.message || 'Falha ao criar cadastro')
    } finally { setLoading(false) }
  }

  const handleCadastroSendOtp = async () => {
    setErro(null); setMensagem(null)
    try {
      validarBaseCadastro()
      if (!cadastroTelefone.trim()) throw new Error('Informe seu número de WhatsApp')
    } catch (err: any) { setErro(err.message); return }
    setOtpStep('sending')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: cadastroTelefone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOtpPhone(data.telefone); setOtpStep('sent'); setMensagem('Código enviado para seu WhatsApp!')
    } catch (err: any) { setErro(err.message || 'Erro ao enviar código'); setOtpStep('idle') }
  }

  const handleCadastroVerifyOtp = async () => {
    setErro(null); setMensagem(null)
    if (!otpCode.trim()) { setErro('Digite o código recebido'); return }
    setOtpStep('verifying')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: otpPhone, code: otpCode,
          nomeCompleto: nomeCompleto.trim(), nomeUsuario: sanitizeUsername(nomeUsuario),
          funcao, senha: cadastroSenha,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
        router.push('/portal'); router.refresh()
      }
    } catch (err: any) { setErro(err.message || 'Código inválido'); setOtpStep('sent') }
  }

  const handleGoogleAuth = async () => {
    setErro(null); setMensagem(null); setLoading(true)
    try {
      if (modo === 'cadastro' || precisaCompletarCadastro) {
        validarBaseCadastro()
        localStorage.setItem(GOOGLE_DRAFT_KEY, JSON.stringify({
          funcao, nomeCompleto: nomeCompleto.trim(),
          nomeUsuario: sanitizeUsername(nomeUsuario), email: cadastroEmail.trim() || undefined,
        }))
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err: any) { setLoading(false); setErro(err.message || 'Falha no login com Google') }
  }

  const inputClass = 'w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all'
  const labelClass = 'block text-sm font-medium text-muted-foreground mb-1'
  const btnPrimary = 'w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const btnGreen = 'w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50'

  return (
    <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
          {modo === 'login' ? <LogIn className="w-8 h-8 text-primary-foreground" /> : <UserPlus className="w-8 h-8 text-primary-foreground" />}
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso Universal Titan</h1>
        <p className="text-muted-foreground mt-2">Entrada única para Federação, Academia e Atleta</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1 mb-6">
        <button type="button" onClick={() => { setModo('login'); setErro(null); setMensagem(null) }}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${modo === 'login' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          Login
        </button>
        <button type="button" onClick={() => { setModo('cadastro'); setErro(null); setMensagem(null) }}
          className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${modo === 'cadastro' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          Cadastro
        </button>
      </div>

      {/* Alerts */}
      {erro && <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">{erro}</div>}
      {mensagem && <div className="mb-4 bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm">{mensagem}</div>}

      {/* ====================== LOGIN ====================== */}
      {modo === 'login' && (
        <>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="identifier" className={labelClass}>Email, telefone ou nome de usuário</label>
              <input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                required className={inputClass} placeholder="email, telefone ou usuário" />
            </div>
            <div>
              <label htmlFor="loginPassword" className={labelClass}>Senha</label>
              <input id="loginPassword" type="password" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Entrar'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <button type="button" onClick={handleGoogleAuth} disabled={loading}
            className="w-full border border-border hover:bg-accent text-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            Continuar com Google
          </button>
        </>
      )}

      {/* ====================== CADASTRO ====================== */}
      {modo === 'cadastro' && (
        <>
          {/* Dados base */}
          <div className="space-y-4">
            <div>
              <label htmlFor="funcao" className={labelClass}>Função</label>
              <select id="funcao" value={funcao} onChange={(e) => setFuncao(e.target.value as FuncaoStakeholder)} className={inputClass}>
                <option value="FEDERACAO">Federação</option>
                <option value="ACADEMIA">Academia</option>
                <option value="ATLETA">Atleta</option>
              </select>
            </div>
            <div>
              <label htmlFor="nomeCompleto" className={labelClass}>Nome completo</label>
              <input id="nomeCompleto" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)}
                required className={inputClass} placeholder="Nome completo" />
            </div>
            <div>
              <label htmlFor="nomeUsuario" className={labelClass}>Nome de usuário (único)</label>
              <input id="nomeUsuario" value={nomeUsuario} onChange={(e) => setNomeUsuario(e.target.value)}
                required className={inputClass} placeholder="usuario_unico" />
            </div>
            <div>
              <label htmlFor="cadastroSenha" className={labelClass}>Senha</label>
              <input id="cadastroSenha" type="password" value={cadastroSenha}
                onChange={(e) => setCadastroSenha(e.target.value)} required className={inputClass} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">confirme sua identidade</span>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* Method chooser */}
          {confirmMethod === null && (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmMethod('email')}
                className="flex flex-col items-center gap-2 border border-border rounded-lg py-5 px-3 hover:bg-accent transition-all group">
                <Mail className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-foreground">Email</span>
              </button>
              <button type="button" onClick={() => setConfirmMethod('whatsapp')}
                className="flex flex-col items-center gap-2 border border-green-600/30 rounded-lg py-5 px-3 hover:bg-green-600/10 transition-all group">
                <MessageSquare className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-foreground">WhatsApp</span>
              </button>
            </div>
          )}

          {/* Email confirmation */}
          {confirmMethod === 'email' && (
            <form onSubmit={handleCadastroComEmail} className="space-y-3">
              <div>
                <label htmlFor="cadastroEmail" className={labelClass}>Email</label>
                <input id="cadastroEmail" type="email" value={cadastroEmail}
                  onChange={(e) => setCadastroEmail(e.target.value)} required className={inputClass}
                  placeholder="seu@email.com" autoFocus />
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Cadastrar com Email'}
              </button>
              <button type="button" onClick={() => setConfirmMethod(null)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                Voltar
              </button>
            </form>
          )}

          {/* WhatsApp OTP confirmation */}
          {confirmMethod === 'whatsapp' && (
            <div className="space-y-3">
              {otpStep === 'idle' || otpStep === 'sending' ? (
                <>
                  <div>
                    <label htmlFor="cadastroTelefone" className={labelClass}>WhatsApp</label>
                    <input id="cadastroTelefone" type="tel" value={cadastroTelefone}
                      onChange={(e) => setCadastroTelefone(e.target.value)} className={inputClass}
                      placeholder="DDD + número (ex: 91999999999)" autoFocus />
                  </div>
                  <button type="button" onClick={handleCadastroSendOtp} disabled={otpStep === 'sending'} className={btnGreen}>
                    {otpStep === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    {otpStep === 'sending' ? 'Enviando código...' : 'Enviar código via WhatsApp'}
                  </button>
                  <button type="button" onClick={() => { setConfirmMethod(null); setOtpStep('idle') }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                    Voltar
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Código enviado para seu WhatsApp. Digite abaixo:</p>
                  <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
                    placeholder="000000" autoFocus />
                  <button type="button" onClick={handleCadastroVerifyOtp}
                    disabled={otpStep === 'verifying' || otpCode.length < 6} className={btnGreen}>
                    {otpStep === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                    {otpStep === 'verifying' ? 'Verificando...' : 'Verificar e criar conta'}
                  </button>
                  <button type="button" onClick={() => { setOtpStep('idle'); setOtpCode('') }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                    Reenviar código
                  </button>
                </>
              )}
            </div>
          )}

          {/* Google for cadastro */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <button type="button" onClick={handleGoogleAuth} disabled={loading}
            className="w-full border border-border hover:bg-accent text-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            Continuar com Google
          </button>
        </>
      )}

      <p className="text-xs text-muted-foreground mt-6 text-center">
        Após o cadastro, faça login com email, telefone ou nome de usuário + senha.
      </p>

      <div className="mt-5 pt-5 border-t border-border text-center">
        <p className="text-sm text-muted-foreground mb-2">Novo atleta? Ainda não é filiado?</p>
        <a href="/filiacao" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Solicitar filiação à LRSJ
        </a>
      </div>
    </div>
  )
}

export default function AcessoUniversalPage() {
  return (
    <Suspense fallback={
      <div className="bg-card border border-border rounded-2xl shadow-lg p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    }>
      <AcessoUniversalContent />
    </Suspense>
  )
}
