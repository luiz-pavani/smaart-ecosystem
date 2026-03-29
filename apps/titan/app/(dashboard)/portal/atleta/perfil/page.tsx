'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, User, Mail, Award, CreditCard, Calendar, Clock, X, Camera, Check, Pencil, Building2, ShieldCheck, ExternalLink, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AtletaDocumentos from '@/components/AtletaDocumentos'
import { RatingStars } from '@/components/RatingStars'

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string; icones?: string }

interface TurmaMatriculada {
  id: string
  name: string
  location: string | null
  instructor_name: string | null
  enrolled_at: string
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
}

const dayLabels: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

interface StakeholderPerfil {
  id: string
  nome_completo: string | null
  nome_usuario: string | null
  email: string | null
  telefone: string | null
  funcao: string | null
  academia_id: string | null
  federacao_id: string | null
  kyu_dan_id: number | null
  data_nascimento: string | null
  genero: string | null
  instagram: string | null
}

interface Federacao {
  id: string
  nome: string
  sigla: string
  email: string | null
  site: string | null
}

interface Academia {
  id: string
  nome: string
  endereco_cidade: string
  endereco_estado: string
  federacao_id: string
}

interface AtletaPerfil {
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
  kyu_dan_id: number | null
  academias: string | null
  status_plano: string | null
  status_membro: string | null
  data_expiracao: string | null
  url_foto: string | null
  tamanho_patch: string | null
}

interface EditForm {
  telefone: string
  email: string
  cidade: string
  estado: string
  pais: string
  nome_patch: string
  tamanho_patch: string
}

const statusColor = (s: string | null) => {
  if (s === 'Válido' || s === 'Aceito') return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (s === 'Vencido' || s === 'Rejeitado') return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right">{value || '—'}</span>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '—'}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-colors"
      />
    </div>
  )
}

export default function PerfilAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  interface WaitlistItem {
    class_id: string
    name: string
    position: number
  }

  const [atleta, setAtleta] = useState<AtletaPerfil | null>(null)
  const [stakeholder, setStakeholder] = useState<StakeholderPerfil | null>(null)
  const [federacoes, setFederacoes] = useState<Federacao[]>([])
  const [academias, setAcademias] = useState<Academia[]>([])
  const [kyuDan, setKyuDan] = useState<KyuDan | null>(null)
  const [kyuDans, setKyuDans] = useState<KyuDan[]>([])
  const [turmas, setTurmas] = useState<TurmaMatriculada[]>([])
  const [waitlistItems, setWaitlistItems] = useState<WaitlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingWaitlist, setRemovingWaitlist] = useState<string | null>(null)
  const [selectedAcadId, setSelectedAcadId] = useState<string>('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaveMsg, setProfileSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [stForm, setStForm] = useState<{
    nome_completo: string; nome_usuario: string; email: string; telefone: string
    genero: string; data_nascimento: string; kyu_dan_id: string; instagram: string
  }>({ nome_completo: '', nome_usuario: '', email: '', telefone: '', genero: '', data_nascimento: '', kyu_dan_id: '', instagram: '' })
  const [atletaForm, setAtletaForm] = useState<EditForm>({
    telefone: '', email: '', cidade: '', estado: '', pais: '', nome_patch: '', tamanho_patch: '',
  })
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [savingAcad, setSavingAcad] = useState(false)
  const [acadMsg, setAcadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Usuário não autenticado'); return }

        const [perfilRes, { data: enrollData }, { data: waitData }] = await Promise.all([
          fetch('/api/atletas/self/perfil-dados').then(r => r.json()),
          supabase.from('class_enrollments')
            .select('enrolled_at, class:class_id(id, name, location, instructor_name, class_schedules(day_of_week, start_time, end_time))')
            .eq('athlete_id', user.id)
            .eq('is_active', true)
            .order('enrolled_at', { ascending: false }),
          supabase.from('class_waitlist')
            .select('position, class:class_id(id, name)')
            .eq('athlete_id', user.id)
            .order('position', { ascending: true }),
        ])

        const { stakeholder: stakeholderData, fedLrsj: fedData, federacoes: fedsData, academias: acadData, kyuDans: kdData } = perfilRes

        if (stakeholderData) {
          setStakeholder(stakeholderData as StakeholderPerfil)
          setStForm({
            nome_completo: stakeholderData.nome_completo || '',
            nome_usuario: stakeholderData.nome_usuario || '',
            email: stakeholderData.email || '',
            telefone: stakeholderData.telefone || '',
            genero: stakeholderData.genero || '',
            data_nascimento: stakeholderData.data_nascimento || '',
            kyu_dan_id: stakeholderData.kyu_dan_id ? String(stakeholderData.kyu_dan_id) : '',
            instagram: stakeholderData.instagram || '',
          })
          if (stakeholderData.academia_id) setSelectedAcadId(stakeholderData.academia_id)
        }
        if (fedsData) setFederacoes(fedsData as Federacao[])
        if (acadData) setAcademias(acadData as Academia[])

        const kdList = (kdData || []) as KyuDan[]
        setKyuDans(kdList)

        if (fedData) {
          setAtleta(fedData as AtletaPerfil)
          setAtletaForm({
            telefone: fedData.telefone || '',
            email: fedData.email || '',
            cidade: fedData.cidade || '',
            estado: fedData.estado || '',
            pais: fedData.pais || '',
            nome_patch: fedData.nome_patch || '',
            tamanho_patch: fedData.tamanho_patch || '',
          })
        }

        // Resolve kyu_dan display: prefer stakeholder, fallback to atleta
        const kdId = stakeholderData?.kyu_dan_id ?? fedData?.kyu_dan_id ?? null
        const kd = kdList.find((k: KyuDan) => k.id === kdId)
        setKyuDan(kd || null)

        setTurmas((enrollData || []).map((e: any) => {
          const c = Array.isArray(e.class) ? e.class[0] : e.class
          return {
            id: c?.id || '',
            name: c?.name || '',
            location: c?.location || null,
            instructor_name: c?.instructor_name || null,
            enrolled_at: e.enrolled_at,
            schedules: c?.class_schedules || [],
          }
        }).filter((t: TurmaMatriculada) => t.id))

        setWaitlistItems((waitData || []).map((w: any) => {
          const c = Array.isArray(w.class) ? w.class[0] : w.class
          return { class_id: c?.id || '', name: c?.name || '—', position: w.position }
        }).filter((w: WaitlistItem) => w.class_id))
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar seu perfil')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const startEditing = () => {
    setFotoPreview(null)
    setFotoFile(null)
    setProfileSaveMsg(null)
    setEditingProfile(true)
  }

  const cancelEditing = () => {
    setEditingProfile(false)
    setFotoPreview(null)
    setFotoFile(null)
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileSaveMsg(null)
    try {
      // Always save stakeholder fields
      const stPayload = {
        nome_completo: stForm.nome_completo || null,
        nome_usuario: stForm.nome_usuario || null,
        email: stForm.email || null,
        telefone: stForm.telefone || null,
        genero: stForm.genero || null,
        data_nascimento: stForm.data_nascimento || null,
        kyu_dan_id: stForm.kyu_dan_id ? Number(stForm.kyu_dan_id) : null,
        instagram: stForm.instagram || null,
      }
      const stRes = await fetch('/api/atletas/self/update-stakeholder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stPayload),
      })
      const stJson = await stRes.json()
      if (!stRes.ok) throw new Error(stJson.error || 'Erro ao salvar')
      setStakeholder(stJson.data as StakeholderPerfil)

      // If user has atleta record, also save atleta-specific fields
      if (atleta) {
        const fd = new FormData()
        fd.append('telefone', atletaForm.telefone)
        fd.append('email', atletaForm.email)
        fd.append('cidade', atletaForm.cidade)
        fd.append('estado', atletaForm.estado)
        fd.append('pais', atletaForm.pais)
        fd.append('nome_patch', atletaForm.nome_patch)
        fd.append('tamanho_patch', atletaForm.tamanho_patch)
        if (fotoFile) fd.append('foto', fotoFile)

        const atlRes = await fetch('/api/atletas/self/update-profile', {
          method: 'PATCH',
          body: fd,
        })
        const atlJson = await atlRes.json()
        if (!atlRes.ok) throw new Error(atlJson.error || 'Erro ao salvar dados de filiação')
        setAtleta(atlJson.data as AtletaPerfil)
      }

      // Refresh kyu_dan display
      const kdId = stJson.data?.kyu_dan_id ?? atleta?.kyu_dan_id ?? null
      const kd = kyuDans.find(k => k.id === kdId)
      setKyuDan(kd || null)

      setEditingProfile(false)
      setFotoPreview(null)
      setFotoFile(null)
      setProfileSaveMsg({ type: 'success', text: 'Perfil atualizado com sucesso.' })
      router.refresh()
    } catch (err: any) {
      setProfileSaveMsg({ type: 'error', text: err.message || 'Erro ao salvar perfil.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const saveAcademia = async () => {
    if (!selectedAcadId) return
    setSavingAcad(true); setAcadMsg(null)
    try {
      const res = await fetch('/api/atletas/self/update-stakeholder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academia_id: selectedAcadId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      setStakeholder(json.data as StakeholderPerfil)
      setAcadMsg({ type: 'success', text: 'Academia salva com sucesso.' })
    } catch (err: any) {
      setAcadMsg({ type: 'error', text: err.message || 'Erro ao salvar academia.' })
    } finally { setSavingAcad(false) }
  }

  // Resolved display values (prefer atleta, fallback to stakeholder)
  const displayName = atleta?.nome_completo || stakeholder?.nome_completo || '—'
  const displayUsername = stakeholder?.nome_usuario
  const displayEmail = atleta?.email || stakeholder?.email
  const displayTelefone = atleta?.telefone || stakeholder?.telefone
  const displayGenero = atleta?.genero || stakeholder?.genero
  const displayNascimento = atleta?.data_nascimento || stakeholder?.data_nascimento
  const displayFoto = fotoPreview || atleta?.url_foto || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 mt-1">Dados pessoais e de filiação</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200 mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header card */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Photo */}
                <div className="relative shrink-0">
                  {displayFoto ? (
                    <img
                      src={displayFoto}
                      alt={displayName}
                      className="w-28 h-28 object-cover rounded-xl border-4 border-white/10"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-blue-500/20 rounded-xl border-4 border-white/10 flex items-center justify-center">
                      <User className="w-14 h-14 text-blue-300" />
                    </div>
                  )}
                  {editingProfile && atleta && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        title="Trocar foto"
                      >
                        <Camera className="w-8 h-8 text-white" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFotoChange}
                      />
                    </>
                  )}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white mb-1">{displayName}</h2>
                  {displayUsername && (
                    <p className="text-gray-400 text-sm mb-2">@{displayUsername}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {kyuDan && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {kyuDan.icones ? `${kyuDan.icones} ` : ''}{kyuDan.cor_faixa} | {kyuDan.kyu_dan}
                      </span>
                    )}
                    {atleta?.academias && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-orange-500/20 text-orange-300 border-orange-500/30">
                        🥋 {atleta.academias}
                      </span>
                    )}
                    {atleta?.status_plano && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(atleta.status_plano)}`}>
                        Plano {atleta.status_plano}
                      </span>
                    )}
                    {atleta?.status_membro && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(atleta.status_membro)}`}>
                        {atleta.status_membro}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                {!editingProfile ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar Perfil
                  </button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={cancelEditing}
                      disabled={savingProfile}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-sm font-medium rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Edit form */}
            {editingProfile && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-white mb-2">Editar dados pessoais</h3>

                {profileSaveMsg && (
                  <div className={`rounded-lg px-4 py-3 text-sm ${profileSaveMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                    {profileSaveMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Nome Completo</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.nome_completo}
                      onChange={e => setStForm(f => ({ ...f, nome_completo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Nome de Usuário</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.nome_usuario}
                      placeholder="@seunome"
                      onChange={e => setStForm(f => ({ ...f, nome_usuario: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Email</label>
                    <input type="email"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.email}
                      onChange={e => setStForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Telefone / WhatsApp</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.telefone}
                      placeholder="(DDD) 99999-9999"
                      onChange={e => setStForm(f => ({ ...f, telefone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Instagram</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.instagram}
                      placeholder="@seuperfil"
                      onChange={e => setStForm(f => ({ ...f, instagram: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Gênero</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.genero}
                      onChange={e => setStForm(f => ({ ...f, genero: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Data de Nascimento</label>
                    <input type="date"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.data_nascimento}
                      onChange={e => setStForm(f => ({ ...f, data_nascimento: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Graduação (Faixa)</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                      value={stForm.kyu_dan_id}
                      onChange={e => setStForm(f => ({ ...f, kyu_dan_id: e.target.value }))}
                    >
                      <option value="">Selecione sua faixa</option>
                      {kyuDans.map(k => (
                        <option key={k.id} value={k.id}>{k.cor_faixa} — {k.kyu_dan}</option>
                      ))}
                    </select>
                  </div>

                  {/* Atleta-specific fields (only for users with federation record) */}
                  {atleta && (
                    <>
                      <InputField
                        label="Cidade"
                        value={atletaForm.cidade}
                        onChange={v => setAtletaForm(f => ({ ...f, cidade: v }))}
                      />
                      <InputField
                        label="Estado"
                        value={atletaForm.estado}
                        onChange={v => setAtletaForm(f => ({ ...f, estado: v }))}
                        placeholder="ex: RS"
                      />
                      <InputField
                        label="Nome no Patch"
                        value={atletaForm.nome_patch}
                        onChange={v => setAtletaForm(f => ({ ...f, nome_patch: v }))}
                        placeholder="Apelido ou nome curto"
                      />
                      <InputField
                        label="Tamanho do Patch"
                        value={atletaForm.tamanho_patch}
                        onChange={v => setAtletaForm(f => ({ ...f, tamanho_patch: v }))}
                        placeholder="ex: M, G, GG"
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Save message (outside edit form) */}
            {profileSaveMsg && !editingProfile && (
              <div className={`rounded-lg px-4 py-3 text-sm ${profileSaveMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                {profileSaveMsg.text}
              </div>
            )}

            {/* Renovation banner (only for users with federation plan) */}
            {atleta && (() => {
              const exp = atleta.data_expiracao
              const today = new Date().toISOString().split('T')[0]
              const diffDays = exp
                ? Math.ceil((new Date(exp + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
                : null
              const vencido = atleta.status_plano === 'Vencido' || (diffDays !== null && diffDays < 0)
              const vencendo = !vencido && diffDays !== null && diffDays <= 30

              if (!vencido && !vencendo) return null

              const msgWpp = vencido
                ? encodeURIComponent(`Olá! Sou atleta filiado(a) e meu plano está vencido. Gostaria de renovar minha filiação. Meu nome: ${atleta.nome_completo || ''}`)
                : encodeURIComponent(`Olá! Meu plano vence em ${diffDays} dias. Gostaria de informações para renovação. Meu nome: ${atleta.nome_completo || ''}`)

              return (
                <div className={`rounded-xl border p-5 ${vencido ? 'bg-red-500/10 border-red-500/25' : 'bg-amber-500/10 border-amber-500/25'}`}>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <p className={`font-semibold text-sm ${vencido ? 'text-red-300' : 'text-amber-300'}`}>
                        {vencido ? '⚠️ Plano vencido' : `⏳ Plano vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {vencido
                          ? 'Sua filiação está inativa. Entre em contato com a federação para renovar.'
                          : 'Renove em breve para manter sua filiação ativa.'}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/portal/atleta/renovacao')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                        vencido
                          ? 'bg-red-600/80 hover:bg-red-600 text-white'
                          : 'bg-amber-600/80 hover:bg-amber-600 text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Renovar filiação
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Documentos (only for users with federation record) */}
            {atleta && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <AtletaDocumentos
                  atletaId={atleta.stakeholder_id}
                  statusMembro={atleta.status_membro}
                  kyuDanId={atleta.kyu_dan_id}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados Pessoais */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Dados Pessoais</h3>
                </div>
                <Row label="Gênero" value={displayGenero} />
                <Row label="Data de Nascimento" value={displayNascimento} />
                {atleta?.nacionalidade && <Row label="Nacionalidade" value={atleta.nacionalidade} />}
                {atleta?.tamanho_patch && <Row label="Tamanho do Patch" value={atleta.tamanho_patch} />}
                {atleta?.nome_patch && <Row label="Nome no Patch" value={atleta.nome_patch} />}
              </div>

              {/* Contato */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Contato</h3>
                </div>
                <Row label="Email" value={displayEmail} />
                <Row label="Telefone" value={displayTelefone} />
                {stakeholder?.instagram && <Row label="Instagram" value={stakeholder.instagram} />}
                {atleta?.cidade && <Row label="Cidade" value={atleta.cidade} />}
                {atleta?.estado && <Row label="Estado" value={atleta.estado} />}
                {atleta?.pais && <Row label="País" value={atleta.pais} />}
              </div>

              {/* Graduação */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Graduação</h3>
                </div>
                <Row
                  label="Faixa"
                  value={kyuDan ? `${kyuDan.cor_faixa} | ${kyuDan.kyu_dan}` : '—'}
                />
              </div>

              {/* Filiação */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Filiação</h3>
                </div>
                {atleta ? (
                  <>
                    <Row label="Academia" value={atleta.academias} />
                    <Row label="Status do Plano" value={atleta.status_plano} />
                    <Row label="Status do Membro" value={atleta.status_membro} />
                    <Row label="Validade" value={atleta.data_expiracao} />
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Selecione a academia onde você treina</p>
                      <div className="relative">
                        <select
                          value={selectedAcadId}
                          onChange={e => { setSelectedAcadId(e.target.value); setAcadMsg(null) }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-orange-500/50 transition-colors pr-8"
                        >
                          <option value="">Selecione uma academia...</option>
                          {academias.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.nome} — {a.endereco_cidade}/{a.endereco_estado}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      {acadMsg && (
                        <p className={`text-xs mt-2 ${acadMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{acadMsg.text}</p>
                      )}
                      {selectedAcadId && (
                        <button
                          onClick={saveAcademia}
                          disabled={savingAcad}
                          className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
                        >
                          {savingAcad ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Salvar Academia
                        </button>
                      )}
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs text-gray-400 mb-3">Para se filiar a uma federação, acesse a página de filiação.</p>
                      <a
                        href="/filiacao"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Solicitar Filiação
                      </a>
                      {federacoes.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {federacoes.map(f => f.site ? (
                            <a key={f.id} href={f.site} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors">
                              <ExternalLink className="w-3 h-3" /> {f.sigla} — site oficial
                            </a>
                          ) : null)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Minhas Turmas */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white">Minhas Turmas</h3>
                <span className="ml-auto text-xs text-gray-400">{turmas.length} matriculado{turmas.length !== 1 ? 's' : ''}</span>
              </div>
              {turmas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Nenhuma turma matriculada</p>
              ) : (
                <div className="space-y-3">
                  {turmas.map((t) => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                      <p className="text-white font-medium text-sm">{t.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {t.instructor_name && (
                          <span className="text-xs text-purple-400">👤 {t.instructor_name}</span>
                        )}
                        {t.location && (
                          <span className="text-xs text-gray-400">📍 {t.location}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {t.schedules.map((s, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {dayLabels[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                        {atleta && (
                          <RatingStars classId={t.id} athleteId={atleta.stakeholder_id} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fila de Espera */}
            {waitlistItems.length > 0 && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <h3 className="font-semibold text-white">Fila de Espera</h3>
                  <span className="ml-auto text-xs text-gray-400">{waitlistItems.length} turma{waitlistItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {waitlistItems.map((w) => (
                    <div key={w.class_id} className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {w.position}
                      </span>
                      <p className="text-white font-medium text-sm flex-1">{w.name}</p>
                      <span className="text-orange-300 text-xs">Posição #{w.position}</span>
                      <button
                        onClick={async () => {
                          setRemovingWaitlist(w.class_id)
                          await fetch(`/api/aulas/${w.class_id}/waitlist`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          })
                          setWaitlistItems(prev => prev.filter(x => x.class_id !== w.class_id))
                          setRemovingWaitlist(null)
                        }}
                        disabled={removingWaitlist === w.class_id}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Sair da fila"
                      >
                        {removingWaitlist === w.class_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
