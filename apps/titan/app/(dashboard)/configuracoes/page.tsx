'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, User, Mail, Lock, Save, Eye, EyeOff, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FedProfile {
  stakeholder_id: string
  nome_completo: string | null
  nome_patch: string | null
  genero: string | null
  data_nascimento: string | null
  nacionalidade: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  pais: string | null
  tamanho_patch: string | null
  kyu_dan_id: number | null
  academias: string | null
  status_plano: string | null
  status_membro: string | null
}

interface StakeholderProfile {
  id: string
  nome_completo: string | null
  nome_usuario: string | null
  email: string | null
  telefone: string | null
  genero: string | null
  data_nascimento: string | null
  kyu_dan_id: number | null
}

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string }

const GENEROS = ['Masculino', 'Feminino']
const TAMANHOS_PATCH = ['Grande Azul 41cm2', 'Médio Azul 34cm2', 'Pequeno Azul 28cm2', 'Pequeno Rosa 28cm2']
const PAISES_TOP = ['Brasil', 'Uruguai']
const PAISES = [
  'Afeganistão','África do Sul','Albânia','Alemanha','Angola','Argentina','Austrália','Áustria',
  'Bélgica','Bolívia','Brasil','Canadá','Chile','China','Colômbia','Croácia','Cuba',
  'Dinamarca','Equador','Espanha','Estados Unidos','França','Grécia','Guatemala','Honduras',
  'Hungria','Índia','Indonésia','Irlanda','Israel','Itália','Jamaica','Japão','México',
  'Noruega','Nova Zelândia','Países Baixos','Panamá','Paraguai','Peru','Polônia','Portugal',
  'Reino Unido','Rússia','Suécia','Suíça','Tailândia','Turquia','Ucrânia','Uruguai','Venezuela',
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-gray-400 text-sm">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors'
const selectCls = 'w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fedProfile, setFedProfile] = useState<FedProfile | null>(null)
  const [stakeholder, setStakeholder] = useState<StakeholderProfile | null>(null)
  const [form, setForm] = useState<Partial<FedProfile>>({})
  const [stakeholderForm, setStakeholderForm] = useState<Partial<StakeholderProfile>>({})
  const [kyuDans, setKyuDans] = useState<KyuDan[]>([])
  const [displayEmail, setDisplayEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/acesso'); return }

        const [{ data: kdData }, { data: fedData }, { data: stData }] = await Promise.all([
          supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan').order('id'),
          supabase.from('user_fed_lrsj').select('*').eq('stakeholder_id', user.id).maybeSingle(),
          supabase.from('stakeholders').select('id, nome_completo, nome_usuario, email, telefone, genero, data_nascimento, kyu_dan_id').eq('id', user.id).maybeSingle(),
        ])

        setKyuDans((kdData || []) as KyuDan[])

        if (stData) {
          setStakeholder(stData as StakeholderProfile)
          setStakeholderForm(stData as StakeholderProfile)
          // Mostrar email real: se o auth email for fake (whatsapp), usar o do stakeholders
          const authEmail = user.email || ''
          const realEmail = authEmail.includes('@whatsapp.titan.app') ? (stData.email || '') : authEmail
          setDisplayEmail(realEmail)
          setNewEmail(realEmail)
        } else {
          setDisplayEmail(user.email || '')
          setNewEmail(user.email || '')
        }

        if (fedData) {
          setFedProfile(fedData as FedProfile)
          setForm(fedData as FedProfile)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const setField = (field: keyof FedProfile, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const setStField = (field: keyof StakeholderProfile, value: string | number | null) =>
    setStakeholderForm(prev => ({ ...prev, [field]: value }))

  const saveFedProfile = async () => {
    if (!fedProfile) return
    setSaving(true); setMessage(null)
    try {
      const payload = {
        nome_completo: form.nome_completo || null,
        nome_patch: form.nome_patch || null,
        genero: form.genero || null,
        nacionalidade: form.nacionalidade || null,
        email: form.email || null,
        telefone: form.telefone || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        pais: form.pais || null,
        tamanho_patch: form.tamanho_patch || null,
      }
      const res = await fetch('/api/atletas/self/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar perfil')
      setFedProfile(prev => prev ? { ...prev, ...payload } : prev)
      setMessage({ type: 'success', text: 'Perfil salvo com sucesso.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar perfil.' })
    } finally { setSaving(false) }
  }

  const saveStakeholderProfile = async () => {
    setSaving(true); setMessage(null)
    try {
      const payload = {
        nome_completo: stakeholderForm.nome_completo || null,
        nome_usuario: stakeholderForm.nome_usuario || null,
        email: stakeholderForm.email || null,
        telefone: stakeholderForm.telefone || null,
        genero: stakeholderForm.genero || null,
        data_nascimento: stakeholderForm.data_nascimento || null,
        kyu_dan_id: stakeholderForm.kyu_dan_id || null,
      }
      const res = await fetch('/api/atletas/self/update-stakeholder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar perfil')
      setStakeholder(prev => prev ? { ...prev, ...payload } : prev)
      setMessage({ type: 'success', text: 'Perfil salvo com sucesso.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar perfil.' })
    } finally { setSaving(false) }
  }

  const saveEmail = async () => {
    if (!newEmail || newEmail === displayEmail) return
    setSavingEmail(true); setEmailMsg(null)
    try {
      // Atualizar email no auth (só se não for fake)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email?.includes('@whatsapp.titan.app')) {
        const { error } = await supabase.auth.updateUser({ email: newEmail })
        if (error) throw error
        setEmailMsg({ type: 'success', text: 'Confirmação enviada para o novo email.' })
      }
      // Atualizar email no stakeholders também
      await fetch('/api/atletas/self/update-stakeholder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      setDisplayEmail(newEmail)
      setEmailMsg({ type: 'success', text: 'Email atualizado com sucesso.' })
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Erro ao atualizar email.' })
    } finally { setSavingEmail(false) }
  }

  const savePassword = async () => {
    if (!newPassword) return
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'As senhas não coincidem.' }); return }
    if (newPassword.length < 6) { setPasswordMsg({ type: 'error', text: 'Mínimo 6 caracteres.' }); return }
    setSavingPassword(true); setPasswordMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso.' })
      setNewPassword(''); setConfirmPassword('')
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erro ao alterar senha.' })
    } finally { setSavingPassword(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )

  const kyuDanAtual = kyuDans.find(k => k.id === Number(fedProfile?.kyu_dan_id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-3xl mx-auto px-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400 mt-1">Gerencie seu perfil e credenciais de acesso</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Dados da federação (somente leitura) */}
        {fedProfile && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Situação na Federação</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><p className="text-gray-400 text-sm">Graduação</p>
                <p className="text-white text-sm font-medium">{kyuDanAtual ? `${kyuDanAtual.cor_faixa} | ${kyuDanAtual.kyu_dan}` : '—'}</p></div>
              <div><p className="text-gray-400 text-sm">Academia</p>
                <p className="text-white text-sm font-medium">{fedProfile.academias || '—'}</p></div>
              <div><p className="text-gray-400 text-sm">Status do Plano</p>
                <p className="text-white text-sm font-medium">{fedProfile.status_plano || '—'}</p></div>
              <div><p className="text-gray-400 text-sm">Status do Membro</p>
                <p className="text-white text-sm font-medium">{fedProfile.status_membro || '—'}</p></div>
              <div><p className="text-gray-400 text-sm">Data de Nascimento</p>
                <p className="text-white text-sm font-medium">{fedProfile.data_nascimento || '—'}</p></div>
            </div>
          </div>
        )}

        {/* Dados pessoais editáveis */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Dados Pessoais</h2>
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {message.text}
            </div>
          )}

          {fedProfile ? (
            // Usuário filiado — edita user_fed_lrsj
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Nome Completo">
                  <input className={inputCls} value={form.nome_completo || ''} onChange={e => setField('nome_completo', e.target.value)} />
                </Field>
              </div>
              <Field label="Nome no Patch">
                <input className={inputCls} value={form.nome_patch || ''} onChange={e => setField('nome_patch', e.target.value)} />
              </Field>
              <Field label="Gênero">
                <select className={selectCls} value={form.genero || ''} onChange={e => setField('genero', e.target.value)}>
                  <option value="">Selecione</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Telefone">
                <input className={inputCls} value={form.telefone || ''} onChange={e => setField('telefone', e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputCls} value={form.email || ''} onChange={e => setField('email', e.target.value)} />
              </Field>
              <Field label="Cidade">
                <input className={inputCls} value={form.cidade || ''} onChange={e => setField('cidade', e.target.value)} />
              </Field>
              <Field label="Estado">
                <input className={inputCls} value={form.estado || ''} onChange={e => setField('estado', e.target.value)} maxLength={2} />
              </Field>
              <Field label="Nacionalidade">
                <select className={selectCls} value={form.nacionalidade || ''} onChange={e => setField('nacionalidade', e.target.value)}>
                  <option value="">Selecione</option>
                  {PAISES_TOP.map(p => <option key={p} value={p}>{p}</option>)}
                  <option disabled>──────────</option>
                  {PAISES.filter(p => !PAISES_TOP.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="País">
                <select className={selectCls} value={form.pais || ''} onChange={e => setField('pais', e.target.value)}>
                  <option value="">Selecione</option>
                  {PAISES_TOP.map(p => <option key={p} value={p}>{p}</option>)}
                  <option disabled>──────────</option>
                  {PAISES.filter(p => !PAISES_TOP.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Tamanho do Patch">
                <select className={selectCls} value={form.tamanho_patch || ''} onChange={e => setField('tamanho_patch', e.target.value)}>
                  <option value="">Selecione</option>
                  {TAMANHOS_PATCH.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            // Usuário sem filiação — edita stakeholders
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome Completo">
                <input className={inputCls} value={stakeholderForm.nome_completo || ''} onChange={e => setStField('nome_completo', e.target.value)} />
              </Field>
              <Field label="Nome de Usuário">
                <input className={inputCls} value={stakeholderForm.nome_usuario || ''} placeholder="ex: malupavani" onChange={e => setStField('nome_usuario', e.target.value.toLowerCase().replace(/\s+/g, ''))} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={stakeholderForm.email || ''} onChange={e => setStField('email', e.target.value)} />
              </Field>
              <Field label="Telefone">
                <input className={inputCls} value={stakeholderForm.telefone || ''} onChange={e => setStField('telefone', e.target.value)} />
              </Field>
              <Field label="Gênero">
                <select className={selectCls} value={stakeholderForm.genero || ''} onChange={e => setStField('genero', e.target.value)}>
                  <option value="">Selecione</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Data de Nascimento">
                <input className={inputCls} type="date" value={stakeholderForm.data_nascimento || ''} onChange={e => setStField('data_nascimento', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Graduação (Faixa)">
                  <select className={selectCls} value={stakeholderForm.kyu_dan_id || ''} onChange={e => setStField('kyu_dan_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Selecione sua faixa</option>
                    {kyuDans.map(k => <option key={k.id} value={k.id}>{k.cor_faixa} — {k.kyu_dan}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={fedProfile ? saveFedProfile : saveStakeholderProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </div>

        {/* Email de acesso */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <Mail className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Email de Acesso</h2>
          </div>
          <p className="text-gray-400 text-sm">Email atual: <span className="text-white">{displayEmail || '—'}</span></p>

          {emailMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm ${emailMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {emailMsg.text}
            </div>
          )}

          <Field label="Novo email">
            <input type="email" className={inputCls} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="novo@email.com" />
          </Field>
          <div className="flex justify-end">
            <button
              onClick={saveEmail}
              disabled={savingEmail || !newEmail || newEmail === displayEmail}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingEmail ? 'Salvando...' : 'Alterar Email'}
            </button>
          </div>
        </div>

        {/* Senha */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <Lock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Senha de Acesso</h2>
          </div>

          {passwordMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm ${passwordMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {passwordMsg.text}
            </div>
          )}

          <Field label="Nova senha">
            <div className="relative">
              <input type={showNewPw ? 'text' : 'password'} className={inputCls + ' pr-10'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirmar nova senha">
            <div className="relative">
              <input type={showConfirmPw ? 'text' : 'password'} className={inputCls + ' pr-10'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div className="flex justify-end">
            <button
              onClick={savePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {savingPassword ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
