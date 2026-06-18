'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Building2, Plus, Loader2, Check, AlertCircle } from 'lucide-react'

interface Academia {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  federacao_id: string | null
}

interface Federacao {
  id: string
  nome: string
  sigla: string
}

type Modo = 'escolher' | 'criar'

export default function RegistroProfessor() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('escolher')
  const [academias, setAcademias] = useState<Academia[]>([])
  const [federacoes, setFederacoes] = useState<Federacao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', cpf: '', senha: '',
    academia_id: '',
    // Criar nova academia
    novaAcademiaNome: '', novaAcademiaCidade: '', novaAcademiaEstado: '',
    novaAcademiaFederacao: '',
  })

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/academias/listar')
      const data = await res.json()
      if (data.academias) setAcademias(data.academias)
      const fedRes = await fetch('/api/federacoes/listar').catch(() => null)
      if (fedRes?.ok) {
        const fd = await fedRes.json()
        setFederacoes(fd.federacoes || [])
      }
    })()
  }, [])

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    const payload = modo === 'escolher'
      ? {
          modo: 'escolher_academia',
          nome: form.nome, email: form.email, telefone: form.telefone,
          cpf: form.cpf, senha: form.senha,
          academia_id: form.academia_id,
        }
      : {
          modo: 'criar_academia',
          nome: form.nome, email: form.email, telefone: form.telefone,
          cpf: form.cpf, senha: form.senha,
          academia: {
            nome: form.novaAcademiaNome,
            cidade: form.novaAcademiaCidade,
            estado: form.novaAcademiaEstado,
            federacao_id: form.novaAcademiaFederacao || null,
          },
        }

    const res = await fetch('/api/registro/professor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Erro ao cadastrar')
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/login?registered=professor'), 2500)
  }

  const formValido = (() => {
    const base = form.nome.trim() && form.email.includes('@') && form.cpf.replace(/\D/g, '').length === 11 && form.senha.length >= 6
    if (modo === 'escolher') return base && !!form.academia_id
    return base && form.novaAcademiaNome.trim() && form.novaAcademiaCidade.trim() && form.novaAcademiaEstado
  })()

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
          <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-emerald-300 text-xl font-bold mb-2">Cadastro recebido</h2>
          <p className="text-emerald-200/80 text-sm">
            {modo === 'escolher'
              ? 'Sua solicitação foi enviada à academia escolhida. Você receberá um email quando for aprovado.'
              : 'Sua academia foi cadastrada e está em validação pela federação. Você já pode logar e cadastrar seus alunos.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <GraduationCap className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">Cadastro de Professor</h1>
          <p className="text-slate-400 text-sm mt-1">Você é treinador? Cadastre-se aqui.</p>
        </div>

        {/* Toggle A/B */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 flex gap-2">
          <button
            onClick={() => setModo('escolher')}
            className={`flex-1 px-3 py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${
              modo === 'escolher'
                ? 'bg-cyan-500 text-white font-medium'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Tenho equipe cadastrada
          </button>
          <button
            onClick={() => setModo('criar')}
            className={`flex-1 px-3 py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${
              modo === 'criar'
                ? 'bg-cyan-500 text-white font-medium'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            Vou criar minha equipe
          </button>
        </div>

        {/* Form pessoal */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3 mb-3">
          <h3 className="text-sm font-semibold text-white mb-1">Seus dados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="Nome completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
            <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="Telefone (ex: 55991279090)" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
            <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono" placeholder="CPF (11 dígitos)" value={form.cpf} maxLength={11} onChange={e => setForm({...form, cpf: e.target.value.replace(/\D/g, '')})} />
            <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white md:col-span-2" placeholder="Senha (mín. 6 caracteres)" type="password" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} />
          </div>
        </div>

        {/* Form específico */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3 mb-3">
          {modo === 'escolher' ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-1">Escolha sua equipe</h3>
              <select
                value={form.academia_id}
                onChange={e => setForm({...form, academia_id: e.target.value})}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">— selecione —</option>
                {academias.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nome} {a.endereco_cidade ? `· ${a.endereco_cidade}/${a.endereco_estado || ''}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Um admin da equipe receberá sua solicitação. Você poderá entrar quando aprovado.</p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-white mb-1">Dados da nova equipe</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white md:col-span-2" placeholder="Nome da equipe / academia" value={form.novaAcademiaNome} onChange={e => setForm({...form, novaAcademiaNome: e.target.value})} />
                <input className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="Cidade" value={form.novaAcademiaCidade} onChange={e => setForm({...form, novaAcademiaCidade: e.target.value})} />
                <select className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={form.novaAcademiaEstado} onChange={e => setForm({...form, novaAcademiaEstado: e.target.value})}>
                  <option value="">— UF —</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                <select className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white md:col-span-2" value={form.novaAcademiaFederacao} onChange={e => setForm({...form, novaAcademiaFederacao: e.target.value})}>
                  <option value="">Federação (opcional)</option>
                  {federacoes.map(f => <option key={f.id} value={f.id}>{f.sigla} — {f.nome}</option>)}
                </select>
              </div>
              <p className="text-xs text-slate-500">Sua equipe entrará em validação pela federação. Você já poderá cadastrar alunos e operar normalmente.</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3 flex items-center gap-2 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!formValido || loading}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {modo === 'escolher' ? 'Solicitar entrada na equipe' : 'Criar minha equipe e cadastrar'}
        </button>

        <div className="mt-4 text-center text-xs text-slate-500">
          Já tem conta? <a href="/login" className="text-cyan-400 hover:underline">Entrar</a>
        </div>
      </div>
    </div>
  )
}
