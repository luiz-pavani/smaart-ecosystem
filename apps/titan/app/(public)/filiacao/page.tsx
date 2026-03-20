'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'

interface Academia { id: string; nome: string; sigla: string | null }

type Step = 'form' | 'sending' | 'success' | 'error'

const GENEROS = ['Masculino', 'Feminino']
const PAISES_TOP = ['Brasil', 'Uruguai', 'Argentina']

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const cls = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-colors"

export default function FiliacaoPage() {
  const [step, setStep] = useState<Step>('form')
  const [academias, setAcademias] = useState<Academia[]>([])
  const [erro, setErro] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    genero: '',
    pais: 'Brasil',
    academia_id: '',
  })

  useEffect(() => {
    fetch('/api/academias/listar')
      .then(r => r.json())
      .then(j => setAcademias((j.academias || []).filter((a: Academia) => a.nome)))
      .catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.nome_completo.trim()) { setErro('Nome completo é obrigatório'); return }
    if (!form.email.trim() && !form.telefone.trim()) { setErro('Informe e-mail ou telefone'); return }

    setErro(null)
    setStep('sending')

    const academia = academias.find(a => a.id === form.academia_id)

    const res = await fetch('/api/filiacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        academias: academia?.nome || null,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setErro(json.error || 'Erro ao enviar solicitação')
      if (res.status === 409) {
        // Already registered
        setStep('success')
        return
      }
      setStep('error')
      return
    }

    setStep('success')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🥋</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Solicitar Filiação</h1>
          <p className="text-gray-400 text-sm">Liga Regional de Subúrbio de Jiu-Jitsu</p>
        </div>

        {step === 'success' ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Solicitação enviada!</h2>
            {erro ? (
              <p className="text-yellow-300 text-sm mb-4">{erro}</p>
            ) : (
              <p className="text-gray-400 text-sm mb-6">
                Sua solicitação foi recebida e está em análise. A federação entrará em contato pelo e-mail ou telefone informado.
              </p>
            )}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximos passos</p>
              <p className="text-sm text-gray-300">1. A federação analisará seus dados</p>
              <p className="text-sm text-gray-300">2. Você receberá confirmação por WhatsApp ou e-mail</p>
              <p className="text-sm text-gray-300">3. Após aprovação, acesse o portal com seu e-mail</p>
            </div>
          </div>
        ) : step === 'error' ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Erro ao enviar</h2>
            <p className="text-red-300 text-sm mb-6">{erro}</p>
            <button
              onClick={() => { setStep('form'); setErro(null) }}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5">
            <Field label="Nome completo" required>
              <input
                type="text"
                value={form.nome_completo}
                onChange={set('nome_completo')}
                placeholder="Seu nome como aparece nos documentos"
                className={cls}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="E-mail">
                <input type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" className={cls} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input type="tel" value={form.telefone} onChange={set('telefone')} placeholder="(99) 99999-9999" className={cls} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Data de nascimento">
                <input type="date" value={form.data_nascimento} onChange={set('data_nascimento')} className={cls} />
              </Field>
              <Field label="Gênero">
                <select value={form.genero} onChange={set('genero')} className={cls}>
                  <option value="">Selecione</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
            </div>

            <Field label="País">
              <select value={form.pais} onChange={set('pais')} className={cls}>
                {PAISES_TOP.map(p => <option key={p} value={p}>{p}</option>)}
                <option disabled>──────────</option>
                {['Alemanha','Argentina','Austrália','Bélgica','Bolívia','Canadá','Chile','China','Colômbia',
                  'Coreia do Sul','Espanha','Estados Unidos','França','Grécia','Holanda','Itália','Japão',
                  'México','Paraguai','Peru','Portugal','Reino Unido','Rússia','Suécia','Suíça','Venezuela',
                ].filter(p => !PAISES_TOP.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Academia">
              <select value={form.academia_id} onChange={set('academia_id')} className={cls}>
                <option value="">Selecione sua academia (opcional)</option>
                {academias.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}{a.sigla ? ` (${a.sigla})` : ''}</option>
                ))}
              </select>
            </Field>

            {erro && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}

            <p className="text-xs text-gray-600">
              * E-mail ou telefone obrigatório · Os demais campos são opcionais mas facilitam a análise pela federação
            </p>

            <button
              onClick={submit}
              disabled={step === 'sending'}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {step === 'sending' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <>Solicitar filiação <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-gray-600">
              Já é filiado?{' '}
              <a href="/login" className="text-blue-400 hover:text-blue-300 underline">Acessar o portal</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
