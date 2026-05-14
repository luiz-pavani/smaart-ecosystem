'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Search, X, ChevronDown, DollarSign, CheckCircle2, Clock, XCircle, Plus, CalendarDays,
  User, FileText, ListChecks, ShieldCheck, AlertTriangle, Lock, Unlock, Check, History,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Candidato {
  id: string
  nome_completo: string
  email: string
  telefone: string
  data_nascimento: string
  kyu_dan: { id: number; kyu_dan: string; cor_faixa: string } | null
  inscricao: {
    id: string
    graduacao_pretendida: string
    status_inscricao: string
    status_pagamento: string
    created_at: string
    observacoes?: string
    dados_verificados_em?: string | null
    dados_verificados_por?: string | null
  } | null
  requisitos_total: number
  requisitos_confirmados: number
  dados_verificados: boolean
  mudancas_pendentes: number
}

interface KyuDan { id: number; kyu_dan: string; cor_faixa: string }
interface Federacao { id: string; nome: string }
interface Academia { id: string; nome: string }

const STATUS_INSCRICAO = ['PENDENTE', 'EM_ANALISE', 'CONFIRMADO', 'REPROVADO', 'CANCELADO']
const STATUS_PAGAMENTO = ['PENDENTE', 'APROVADO', 'RECUSADO', 'REEMBOLSADO']
const GRADUACOES = [
  'Shodan (1º Dan)', 'Nidan (2º Dan)', 'Sandan (3º Dan)', 'Yondan (4º Dan)',
  'Godan (5º Dan)', 'Rokudan (6º Dan)', 'Shichidan (7º Dan)', 'Hachidan (8º Dan)',
  'Kudan (9º Dan)', 'Judan (10º Dan)',
]

const CAMPOS_PESSOAIS = [
  { key: 'nome_completo', label: 'Nome completo', critico: true },
  { key: 'email', label: 'Email', critico: false },
  { key: 'telefone', label: 'Telefone', critico: false },
  { key: 'data_nascimento', label: 'Data de nascimento', critico: false },
  { key: 'genero', label: 'Gênero', critico: false },
  { key: 'kyu_dan_id', label: 'Faixa atual', critico: true },
  { key: 'federacao_id', label: 'Federação', critico: true },
  { key: 'academia_id', label: 'Academia', critico: false },
  { key: 'instagram', label: 'Instagram', critico: false },
  { key: 'peso_atual', label: 'Peso (kg)', critico: false },
] as const

// Catálogo simplificado dos req_keys por graduação (espelha /candidato/requisitos)
const REQ_CATALOG: Record<string, { key: string; label: string; type: 'check' | 'hours' | 'grade' }[]> = {
  shodan: [
    { key: 'shodan.presential.0', label: 'Nage-no-Kata', type: 'check' },
    { key: 'shodan.presential.1', label: 'Arbitragem (prática)', type: 'check' },
    { key: 'shodan.presential.2', label: 'Waza', type: 'check' },
    { key: 'shodan.internships.0', label: 'Estágio: Oficial de Competição', type: 'hours' },
    { key: 'shodan.internships.1', label: 'Estágio: Árbitro', type: 'hours' },
    { key: 'shodan.theory.0', label: 'Artigo ou Poster', type: 'grade' },
    { key: 'shodan.theory.1', label: 'Exame Teórico Geral', type: 'grade' },
    { key: 'shodan.theory.2', label: 'Exame Teórico de Arbitragem', type: 'grade' },
    { key: 'shodan.practical_exams.0', label: 'Kodomo-no-Kata (vídeo)', type: 'grade' },
    { key: 'shodan.practical_exams.1', label: 'Seiryoku-Zen\'yo-Kokumin-Taiiku-no-Kata (vídeo)', type: 'grade' },
    { key: 'shodan.practical_exams.2', label: 'Arbitragem (prática)', type: 'grade' },
    { key: 'shodan.practical_exams.3', label: 'Nage-no-Kata', type: 'grade' },
    { key: 'shodan.practical_exams.4', label: 'Waza', type: 'grade' },
  ],
  nidan: [
    { key: 'nidan.presential.0', label: 'Katame-no-Kata', type: 'check' },
    { key: 'nidan.presential.1', label: 'Arbitragem', type: 'check' },
    { key: 'nidan.presential.2', label: 'Waza', type: 'check' },
    { key: 'nidan.internships.0', label: 'Estágio: Árbitro', type: 'hours' },
    { key: 'nidan.theory.0', label: 'Artigo ou Poster', type: 'grade' },
    { key: 'nidan.theory.1', label: 'Exame Teórico Geral', type: 'grade' },
    { key: 'nidan.theory.2', label: 'Exame Teórico de Arbitragem', type: 'grade' },
    { key: 'nidan.practical_exams.0', label: 'Kodomo-no-Kata (vídeo)', type: 'grade' },
    { key: 'nidan.practical_exams.1', label: 'Seiryoku-Zen\'yo-Kokumin-Taiiku-no-Kata (vídeo)', type: 'grade' },
    { key: 'nidan.practical_exams.2', label: 'Arbitragem', type: 'grade' },
    { key: 'nidan.practical_exams.3', label: 'Katame-no-Kata', type: 'grade' },
    { key: 'nidan.practical_exams.4', label: 'Waza', type: 'grade' },
  ],
  sandan: [
    { key: 'sandan.presential.0', label: 'Kōdōkan Goshin-jutsu', type: 'check' },
    { key: 'sandan.presential.1', label: 'Waza (Aula Magna)', type: 'check' },
    { key: 'sandan.theory.0', label: 'Artigo', type: 'grade' },
    { key: 'sandan.practical_exams.0', label: 'Goshin-jutsu', type: 'grade' },
  ],
  yondan: [
    { key: 'yondan.presential.0', label: 'Kime-no-Kata', type: 'check' },
    { key: 'yondan.presential.1', label: 'Waza (Aula Magna)', type: 'check' },
    { key: 'yondan.theory.0', label: 'Artigo', type: 'grade' },
    { key: 'yondan.practical_exams.0', label: 'Kime-no-Kata', type: 'grade' },
  ],
}

function gradKey(graduacao: string): string {
  const m = graduacao.match(/^(\w+)/)
  return m ? m[1].toLowerCase() : 'shodan'
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMADO: 'bg-green-600/20 text-green-400 border-green-600/30',
  APROVADO: 'bg-green-600/20 text-green-400 border-green-600/30',
  PENDENTE: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  EM_ANALISE: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  REPROVADO: 'bg-red-600/20 text-red-400 border-red-600/30',
  RECUSADO: 'bg-red-600/20 text-red-400 border-red-600/30',
  CANCELADO: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  REEMBOLSADO: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
}

function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_COLORS[value] || 'bg-slate-600/20 text-slate-400 border-slate-600/30'
  return <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${cls}`}>{value}</span>
}

const selectCls = "w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500"
const inputCls = "w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5"

// ─── EditModal com abas ───────────────────────────────────────────────────────

type Tab = 'dados' | 'inscricao' | 'requisitos' | 'verificacoes' | 'pendencias' | 'historico'

function EditModal({
  candidato,
  onClose,
  onUpdated,
  kyuDanList,
  federacoes,
  academias,
}: {
  candidato: Candidato
  onClose: () => void
  onUpdated: () => void
  kyuDanList: KyuDan[]
  federacoes: Federacao[]
  academias: Academia[]
}) {
  const [tab, setTab] = useState<Tab>('dados')
  const [mudancasCount, setMudancasCount] = useState(candidato.mudancas_pendentes)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="text-white font-black text-lg truncate">{candidato.nome_completo}</h3>
            <p className="text-slate-500 text-xs truncate">{candidato.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto">
          <TabButton active={tab === 'dados'} onClick={() => setTab('dados')} icon={<User className="w-3.5 h-3.5" />} label="Dados" />
          <TabButton active={tab === 'inscricao'} onClick={() => setTab('inscricao')} icon={<FileText className="w-3.5 h-3.5" />} label="Inscrição" />
          <TabButton active={tab === 'requisitos'} onClick={() => setTab('requisitos')} icon={<ListChecks className="w-3.5 h-3.5" />} label="Requisitos & Notas" />
          <TabButton active={tab === 'verificacoes'} onClick={() => setTab('verificacoes')} icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Verificações" />
          <TabButton
            active={tab === 'pendencias'}
            onClick={() => setTab('pendencias')}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Pendências"
            badge={mudancasCount > 0 ? mudancasCount : undefined}
          />
          <TabButton active={tab === 'historico'} onClick={() => setTab('historico')} icon={<History className="w-3.5 h-3.5" />} label="Histórico" />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'dados' && (
            <TabDados
              candidato={candidato}
              kyuDanList={kyuDanList}
              federacoes={federacoes}
              academias={academias}
              onSaved={onUpdated}
            />
          )}
          {tab === 'inscricao' && <TabInscricao candidato={candidato} onSaved={onUpdated} />}
          {tab === 'requisitos' && <TabRequisitos candidato={candidato} />}
          {tab === 'verificacoes' && (
            <TabVerificacoes
              candidato={candidato}
              kyuDanList={kyuDanList}
              federacoes={federacoes}
              academias={academias}
              onSaved={onUpdated}
            />
          )}
          {tab === 'pendencias' && (
            <TabPendencias candidato={candidato} onCountChange={setMudancasCount} onSaved={onUpdated} />
          )}
          {tab === 'historico' && <TabHistorico candidato={candidato} kyuDanList={kyuDanList} federacoes={federacoes} />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
        active ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}

// ─── Tab: Dados Pessoais ─────────────────────────────────────────────────────

function TabDados({
  candidato, kyuDanList, federacoes, academias, onSaved,
}: {
  candidato: Candidato
  kyuDanList: KyuDan[]
  federacoes: Federacao[]
  academias: Academia[]
  onSaved: () => void
}) {
  const [form, setForm] = useState<any>({
    nome_completo: candidato.nome_completo || '',
    email: candidato.email || '',
    telefone: candidato.telefone || '',
    data_nascimento: candidato.data_nascimento || '',
    genero: '',
    kyu_dan_id: candidato.kyu_dan?.id || '',
    federacao_id: '',
    academia_id: '',
    instagram: '',
    peso_atual: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    fetch(`/api/candidato/admin/stakeholder?stakeholder_id=${candidato.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.stakeholder) {
          setForm({
            nome_completo: d.stakeholder.nome_completo || '',
            email: d.stakeholder.email || '',
            telefone: d.stakeholder.telefone || '',
            data_nascimento: d.stakeholder.data_nascimento || '',
            genero: d.stakeholder.genero || '',
            kyu_dan_id: d.stakeholder.kyu_dan_id || '',
            federacao_id: d.stakeholder.federacao_id || '',
            academia_id: d.stakeholder.academia_id || '',
            instagram: d.stakeholder.instagram || '',
            peso_atual: d.stakeholder.peso_atual ?? '',
          })
        }
      })
      .catch(() => { /* graceful */ })
      .finally(() => setLoading(false))
  }, [candidato.id])

  const handleSave = async () => {
    setSaving(true); setErro(''); setOk(false)
    try {
      const payload: any = { stakeholder_id: candidato.id }
      for (const k of Object.keys(form)) {
        const v = form[k]
        if (v === '' || v === null || v === undefined) continue
        payload[k] = (k === 'kyu_dan_id' || k === 'peso_atual') ? Number(v) : v
      }
      const res = await fetch('/api/candidato/admin/stakeholder', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Erro ao salvar')
      }
      setOk(true)
      onSaved()
    } catch (e: any) {
      setErro(e.message || 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  return (
    <div className="space-y-4">
      <div className="px-3 py-2 bg-yellow-900/20 border border-yellow-800/30 rounded-lg">
        <p className="text-yellow-300 text-xs font-semibold">Campos críticos marcados com 🔒 (Nome, Faixa, Federação): editar como admin invalida verificação prévia daquele campo.</p>
      </div>

      <Field label="Nome completo 🔒">
        <input className={inputCls} value={form.nome_completo} onChange={e => setForm({ ...form, nome_completo: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Telefone">
          <input className={inputCls} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data de nascimento">
          <input className={inputCls} type="date" value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} />
        </Field>
        <Field label="Gênero">
          <div className="relative">
            <select className={selectCls} value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </Field>
      </div>

      <Field label="Faixa atual (Kyu/Dan) 🔒">
        <div className="relative">
          <select className={selectCls} value={form.kyu_dan_id} onChange={e => setForm({ ...form, kyu_dan_id: e.target.value })}>
            <option value="">—</option>
            {kyuDanList.map(k => <option key={k.id} value={k.id}>{k.kyu_dan} — {k.cor_faixa}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Federação 🔒">
          <div className="relative">
            <select className={selectCls} value={form.federacao_id} onChange={e => setForm({ ...form, federacao_id: e.target.value })}>
              <option value="">—</option>
              {federacoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </Field>
        <Field label="Academia">
          <div className="relative">
            <select className={selectCls} value={form.academia_id} onChange={e => setForm({ ...form, academia_id: e.target.value })}>
              <option value="">—</option>
              {academias.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Instagram">
          <input className={inputCls} value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" />
        </Field>
        <Field label="Peso atual (kg)">
          <input className={inputCls} type="number" step="0.1" value={form.peso_atual} onChange={e => setForm({ ...form, peso_atual: e.target.value })} />
        </Field>
      </div>

      {erro && <p className="text-red-400 text-xs font-semibold">{erro}</p>}
      {ok && <p className="text-green-400 text-xs font-semibold">✓ Dados salvos.</p>}

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Dados Pessoais
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

// ─── Tab: Inscrição (original) ───────────────────────────────────────────────

function TabInscricao({ candidato, onSaved }: { candidato: Candidato; onSaved: () => void }) {
  const [graduacao, setGraduacao] = useState(candidato.inscricao?.graduacao_pretendida || 'Shodan (1º Dan)')
  const [statusInscricao, setStatusInscricao] = useState(candidato.inscricao?.status_inscricao || 'PENDENTE')
  const [statusPagamento, setStatusPagamento] = useState(candidato.inscricao?.status_pagamento || 'PENDENTE')
  const [observacoes, setObservacoes] = useState(candidato.inscricao?.observacoes || '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  const handleSave = async () => {
    setSaving(true); setErro(''); setOk(false)
    try {
      const res = await fetch('/api/candidato/admin/inscricao', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscricao_id: candidato.inscricao?.id,
          stakeholder_id: candidato.id,
          graduacao_pretendida: graduacao,
          status_inscricao: statusInscricao,
          status_pagamento: statusPagamento,
          observacoes,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro') }
      setOk(true)
      onSaved()
    } catch (e: any) { setErro(e.message || 'Erro') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {!candidato.inscricao && (
        <div className="px-3 py-2 bg-indigo-900/20 border border-indigo-800/30 rounded-lg">
          <p className="text-indigo-300 text-xs font-semibold">Sem inscrição registrada. Ao salvar, uma inscrição será criada pelo admin.</p>
        </div>
      )}

      <Field label="Graduação Pretendida">
        <div className="relative">
          <select value={graduacao} onChange={e => setGraduacao(e.target.value)} className={selectCls}>
            {GRADUACOES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="Status da Inscrição">
        <div className="relative">
          <select value={statusInscricao} onChange={e => setStatusInscricao(e.target.value)} className={selectCls}>
            {STATUS_INSCRICAO.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="Status do Pagamento">
        <div className="relative">
          <select value={statusPagamento} onChange={e => setStatusPagamento(e.target.value)} className={selectCls}>
            {STATUS_PAGAMENTO.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </Field>

      <Field label="Observações (anotações livres do gestor)">
        <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={5}
          className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
      </Field>

      {erro && <p className="text-red-400 text-xs font-semibold">{erro}</p>}
      {ok && <p className="text-green-400 text-xs font-semibold">✓ Inscrição atualizada.</p>}

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Inscrição
      </button>
    </div>
  )
}

// ─── Tab: Requisitos & Notas ─────────────────────────────────────────────────

interface ReqStatusRow {
  user_completed: boolean
  admin_confirmed: boolean
  admin_nota: string | null
  admin_grade: number | null
  confirmed_at: string | null
}

function TabRequisitos({ candidato }: { candidato: Candidato }) {
  const grad = gradKey(candidato.inscricao?.graduacao_pretendida || 'Shodan')
  const catalog = REQ_CATALOG[grad] || REQ_CATALOG.shodan
  const [statuses, setStatuses] = useState<Record<string, ReqStatusRow>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/candidato/requisitos/status?stakeholder_id=${candidato.id}`)
      const d = await r.json()
      setStatuses(d.status || {})
    } finally { setLoading(false) }
  }, [candidato.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  const total = catalog.length
  const confirmados = catalog.filter(r => statuses[r.key]?.admin_confirmed).length
  const grades = catalog
    .filter(r => r.type === 'grade')
    .map(r => statuses[r.key]?.admin_grade)
    .filter((g): g is number => typeof g === 'number')
  const media = grades.length ? (grades.reduce((s, n) => s + n, 0) / grades.length) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <Stat label="Confirmados" value={`${confirmados}/${total}`} color="text-green-400" />
        <Stat label="% Concluído" value={`${total ? Math.round(confirmados / total * 100) : 0}%`} color="text-indigo-400" />
        <Stat label="Média de Notas" value={media !== null ? media.toFixed(2) : '—'} color="text-yellow-400" />
      </div>

      <div className="space-y-2">
        {catalog.map(r => (
          <ReqRow
            key={r.key}
            stakeholderId={candidato.id}
            reqKey={r.key}
            label={r.label}
            type={r.type}
            status={statuses[r.key]}
            onUpdated={load}
          />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-black/40 border border-slate-800 rounded-lg p-3 text-center">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  )
}

function ReqRow({
  stakeholderId, reqKey, label, type, status, onUpdated,
}: {
  stakeholderId: string
  reqKey: string
  label: string
  type: 'check' | 'hours' | 'grade'
  status?: ReqStatusRow
  onUpdated: () => Promise<void> | void
}) {
  const [editing, setEditing] = useState(false)
  const [grade, setGrade] = useState(status?.admin_grade?.toString() || '')
  const [nota, setNota] = useState(status?.admin_nota || '')
  const [saving, setSaving] = useState(false)

  const confirmed = status?.admin_confirmed
  const userDone = status?.user_completed

  const save = async (patch: any) => {
    setSaving(true)
    try {
      await fetch('/api/candidato/requisitos/status', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_id: stakeholderId, req_key: reqKey, ...patch }),
      })
      await onUpdated()
    } finally { setSaving(false) }
  }

  const toggleConfirm = () => save({ admin_confirmed: !confirmed })

  const saveDetails = async () => {
    const payload: any = { admin_nota: nota || null }
    if (type === 'grade') {
      const g = grade.trim() === '' ? null : Number(grade)
      if (g !== null && (isNaN(g) || g < 0 || g > 10)) {
        alert('Nota deve estar entre 0 e 10')
        return
      }
      payload.admin_grade = g
    }
    await save(payload)
    setEditing(false)
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${confirmed ? 'bg-green-900/10 border-green-800/30' : 'bg-black/40 border-slate-800'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-semibold">{label}</p>
            <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded border bg-slate-700/30 text-slate-400 border-slate-700">{type}</span>
            {userDone && !confirmed && <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/30">candidato marcou</span>}
          </div>

          {type === 'grade' && status?.admin_grade !== null && status?.admin_grade !== undefined && (
            <p className="text-yellow-400 text-xs font-bold mt-1">Nota: {Number(status.admin_grade).toFixed(2)}</p>
          )}
          {status?.admin_nota && !editing && (
            <p className="text-slate-400 text-xs italic mt-1">"{status.admin_nota}"</p>
          )}
        </div>

        <button
          onClick={toggleConfirm}
          disabled={saving}
          title={confirmed ? 'Desconfirmar' : 'Confirmar'}
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
            confirmed
              ? 'bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600/30'
              : 'bg-slate-700/30 border-slate-700 text-slate-500 hover:text-white'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          {type === 'grade' && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nota (0–10)</label>
              <input type="number" step="0.01" min="0" max="10" value={grade} onChange={e => setGrade(e.target.value)}
                className="w-24 bg-black border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
            </div>
          )}
          <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Anotação do gestor..."
            className="w-full bg-black border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-1.5 border border-slate-700 rounded text-slate-400 text-xs">Cancelar</button>
            <button onClick={saveDetails} disabled={saving}
              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded text-white font-bold text-xs flex items-center justify-center gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
          {type === 'grade' ? 'Definir nota / anotação' : 'Adicionar anotação'}
        </button>
      )}
    </div>
  )
}

// ─── Tab: Verificações ───────────────────────────────────────────────────────

function TabVerificacoes({
  candidato, kyuDanList, federacoes, academias, onSaved,
}: {
  candidato: Candidato
  kyuDanList: KyuDan[]
  federacoes: Federacao[]
  academias: Academia[]
  onSaved: () => void
}) {
  const [campos, setCampos] = useState<Record<string, { verified: boolean; verified_at: string | null; nota: string | null }>>({})
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [erro, setErro] = useState('')

  const conferidoGlobal = !!candidato.inscricao?.dados_verificados_em

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, d] = await Promise.all([
        fetch(`/api/candidato/admin/campo-verificado?stakeholder_id=${candidato.id}`).then(r => r.json()),
        fetch(`/api/candidato/dados?stakeholder_id=${candidato.id}`).then(r => r.ok ? r.json() : null),
      ])
      setCampos(c.campos || {})
      setDados(d?.stakeholder || null)
    } finally { setLoading(false) }
  }, [candidato.id])

  useEffect(() => { load() }, [load])

  const toggleCampo = async (campo: string) => {
    const v = !campos[campo]?.verified
    const res = await fetch('/api/candidato/admin/campo-verificado', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stakeholder_id: candidato.id, campo, verified: v }),
    })
    if (res.ok) await load()
  }

  const conferenciaGlobal = async () => {
    if (!candidato.inscricao?.id) {
      setErro('Candidato precisa de inscrição antes da conferência global')
      return
    }
    setSavingGlobal(true); setErro('')
    try {
      const res = await fetch('/api/candidato/admin/conferencia-global', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscricao_id: candidato.inscricao.id, conferir: !conferidoGlobal }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      onSaved()
    } catch (e: any) { setErro(e.message || 'Erro') }
    finally { setSavingGlobal(false) }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  const valorParaExibir = (key: string): string => {
    if (!dados) return '—'
    const v = dados[key]
    if (v === null || v === undefined || v === '') return '—'
    if (key === 'kyu_dan_id') return kyuDanList.find(k => k.id === v)?.kyu_dan || `#${v}`
    if (key === 'federacao_id') return federacoes.find(f => f.id === v)?.nome || `#${v}`
    if (key === 'academia_id') return academias.find(a => a.id === v)?.nome || `#${v}`
    return String(v)
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${conferidoGlobal ? 'bg-green-900/20 border-green-700/40' : 'bg-yellow-900/10 border-yellow-800/30'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {conferidoGlobal ? <Lock className="w-5 h-5 text-green-400" /> : <Unlock className="w-5 h-5 text-yellow-400" />}
            <div>
              <p className={`font-black text-sm ${conferidoGlobal ? 'text-green-300' : 'text-yellow-300'}`}>
                {conferidoGlobal ? 'Dados conferidos globalmente' : 'Conferência global pendente'}
              </p>
              {conferidoGlobal && candidato.inscricao?.dados_verificados_em && (
                <p className="text-[10px] text-green-500/70 mt-0.5">
                  em {new Date(candidato.inscricao.dados_verificados_em).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
          <button onClick={conferenciaGlobal} disabled={savingGlobal}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              conferidoGlobal
                ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 border border-yellow-700/40'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}>
            {savingGlobal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {conferidoGlobal ? 'Destravar' : 'Travar (Conferir tudo)'}
          </button>
        </div>
        {erro && <p className="text-red-400 text-xs mt-2">{erro}</p>}
      </div>

      <div className="text-xs text-slate-500">
        Travar a conferência global faz com que toda edição em campo crítico (🔒) do candidato passe a exigir aprovação na aba Pendências.
      </div>

      <div className="space-y-1.5">
        {CAMPOS_PESSOAIS.map(c => {
          const st = campos[c.key]
          const v = st?.verified
          return (
            <button
              key={c.key}
              onClick={() => toggleCampo(c.key)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                v ? 'bg-green-900/10 border-green-800/30 hover:bg-green-900/20' : 'bg-black/40 border-slate-800 hover:bg-black/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border ${
                  v ? 'bg-green-600 border-green-500' : 'bg-transparent border-slate-600'
                }`}>
                  {v && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-bold flex items-center gap-1">
                    {c.label} {c.critico && <span className="text-yellow-400">🔒</span>}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">{valorParaExibir(c.key)}</p>
                </div>
              </div>
              {st?.verified_at && (
                <span className="text-[9px] text-green-500/70">
                  {new Date(st.verified_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: Pendências ─────────────────────────────────────────────────────────

interface Mudanca {
  id: string
  campo: string
  valor_antigo: string | null
  valor_novo: string | null
  solicitado_em: string
  status: string
  motivo_rejeicao?: string
}

function TabPendencias({
  candidato, onCountChange, onSaved,
}: {
  candidato: Candidato
  onCountChange: (n: number) => void
  onSaved: () => void
}) {
  const [mudancas, setMudancas] = useState<Mudanca[]>([])
  const [loading, setLoading] = useState(true)
  const [decidindo, setDecidindo] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/candidato/admin/mudancas?stakeholder_id=${candidato.id}&status=pendente`)
      const d = await r.json()
      const arr = d.mudancas || []
      setMudancas(arr)
      onCountChange(arr.length)
    } finally { setLoading(false) }
  }, [candidato.id, onCountChange])

  useEffect(() => { load() }, [load])

  const decidir = async (id: string, decisao: 'aprovado' | 'rejeitado', motivoRej?: string) => {
    setDecidindo(id)
    try {
      const res = await fetch('/api/candidato/admin/mudancas', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decisao, motivo_rejeicao: motivoRej }),
      })
      if (res.ok) { await load(); onSaved(); setMotivo('') }
    } finally { setDecidindo(null) }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  if (mudancas.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Sem mudanças pendentes</p>
        <p className="text-slate-600 text-xs mt-1">Aprovações de campos críticos (Nome, Faixa, Federação) aparecem aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {mudancas.map(m => (
        <div key={m.id} className="bg-yellow-900/10 border border-yellow-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-yellow-300 text-xs font-black tracking-widest uppercase">{m.campo}</p>
            <p className="text-slate-500 text-[10px]">
              {new Date(m.solicitado_em).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-0.5">De</p>
              <p className="text-slate-300 font-mono break-all">{m.valor_antigo || '—'}</p>
            </div>
            <div>
              <p className="text-green-400 text-[10px] uppercase tracking-widest mb-0.5">Para</p>
              <p className="text-green-300 font-mono break-all">{m.valor_novo || '—'}</p>
            </div>
          </div>
          <input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo da rejeição (opcional)"
            className="w-full bg-black border border-slate-700 rounded px-2 py-1.5 text-white text-xs mb-2 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button onClick={() => decidir(m.id, 'rejeitado', motivo)} disabled={decidindo === m.id}
              className="flex-1 py-2 bg-red-600/20 border border-red-700/40 hover:bg-red-600/30 disabled:opacity-50 rounded-lg text-red-300 text-xs font-bold flex items-center justify-center gap-1">
              {decidindo === m.id && <Loader2 className="w-3 h-3 animate-spin" />} Rejeitar
            </button>
            <button onClick={() => decidir(m.id, 'aprovado')} disabled={decidindo === m.id}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1">
              {decidindo === m.id && <Loader2 className="w-3 h-3 animate-spin" />} Aprovar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Histórico ──────────────────────────────────────────────────────────

const CAMPO_LABEL: Record<string, string> = {
  nome_completo: 'Nome completo',
  kyu_dan_id: 'Faixa',
  federacao_id: 'Federação',
}

function TabHistorico({
  candidato, kyuDanList, federacoes,
}: {
  candidato: Candidato
  kyuDanList: KyuDan[]
  federacoes: Federacao[]
}) {
  const [filtro, setFiltro] = useState<'todos' | 'aprovado' | 'rejeitado'>('todos')
  const [aprovados, setAprovados] = useState<Mudanca[]>([])
  const [rejeitados, setRejeitados] = useState<Mudanca[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/candidato/admin/mudancas?stakeholder_id=${candidato.id}&status=aprovado`).then(r => r.json()),
      fetch(`/api/candidato/admin/mudancas?stakeholder_id=${candidato.id}&status=rejeitado`).then(r => r.json()),
    ]).then(([a, r]) => {
      setAprovados(a.mudancas || [])
      setRejeitados(r.mudancas || [])
    }).finally(() => setLoading(false))
  }, [candidato.id])

  const renderValor = (campo: string, valor: string | null): string => {
    if (!valor) return '—'
    if (campo === 'kyu_dan_id') return kyuDanList.find(k => k.id === Number(valor))?.kyu_dan || valor
    if (campo === 'federacao_id') return federacoes.find(f => f.id === valor)?.nome || valor
    return valor
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  const lista = filtro === 'aprovado' ? aprovados
    : filtro === 'rejeitado' ? rejeitados
    : [...aprovados, ...rejeitados].sort((a, b) => (b.solicitado_em).localeCompare(a.solicitado_em))

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 bg-black/40 rounded-lg">
        {(['todos', 'aprovado', 'rejeitado'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
              filtro === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'
            }`}>
            {f === 'todos' ? `Todos (${aprovados.length + rejeitados.length})` : f === 'aprovado' ? `Aprovadas (${aprovados.length})` : `Rejeitadas (${rejeitados.length})`}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">Sem registros nesta categoria.</div>
      ) : (
        lista.map(m => (
          <div key={m.id} className={`rounded-xl border p-3 ${m.status === 'aprovado' ? 'bg-green-900/10 border-green-800/30' : 'bg-red-900/10 border-red-800/30'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                  m.status === 'aprovado' ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-red-600/20 text-red-400 border-red-600/30'
                }`}>{m.status}</span>
                <span className="text-slate-300 text-xs font-bold">{CAMPO_LABEL[m.campo] || m.campo}</span>
              </div>
              <span className="text-slate-500 text-[10px]">
                {new Date(m.solicitado_em).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="text-xs flex flex-wrap items-center gap-2">
              <span className="text-slate-500 line-through">{renderValor(m.campo, m.valor_antigo)}</span>
              <span className="text-slate-600">→</span>
              <span className={m.status === 'aprovado' ? 'text-green-300 font-semibold' : 'text-slate-400'}>
                {renderValor(m.campo, m.valor_novo)}
              </span>
            </div>
            {m.motivo_rejeicao && (
              <p className="text-red-400 text-[11px] italic mt-1.5">Motivo: {m.motivo_rejeicao}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Pagamentos Modal (original, preservado) ─────────────────────────────────

interface PagamentoRow {
  id: string; tipo: string; valor: number; status: string; safe2pay_id: string | null
  metadata: any; created_at: string
}

function PagStatusIcon({ s }: { s: string }) {
  if (s === 'pago') return <CheckCircle2 className="w-4 h-4 text-green-400" />
  if (s === 'pendente') return <Clock className="w-4 h-4 text-yellow-400" />
  return <XCircle className="w-4 h-4 text-slate-500" />
}

const PAG_STATUS_CLS: Record<string, string> = {
  pago: 'bg-green-600/20 text-green-400 border-green-600/30',
  pendente: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  cancelado: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  falhou: 'bg-red-600/20 text-red-400 border-red-600/30',
}

function PagamentosModal({ candidato, onClose }: { candidato: Candidato; onClose: () => void }) {
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [valor, setValor] = useState('2200')
  const [tipo, setTipo] = useState('pix')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [changingId, setChangingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  async function load() {
    try {
      const res = await fetch(`/api/candidato/pagamentos?stakeholder_id=${candidato.id}`)
      const d = await res.json()
      setPagamentos(d.pagamentos || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [candidato.id])

  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleRegister = async () => {
    setSaving(true); setErro('')
    try {
      const res = await fetch('/api/candidato/pagamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_id: candidato.id, valor: Number(valor), tipo, observacao: obs }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setShowForm(false); setObs(''); await load()
    } catch (e: any) { setErro(e.message || 'Erro') }
    finally { setSaving(false) }
  }

  const handleChangeStatus = async (pagId: string, status: string) => {
    try {
      const res = await fetch('/api/candidato/pagamentos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagamento_id: pagId, status }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setChangingId(null); await load()
    } catch { /* silent */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-black text-lg">{candidato.nome_completo}</h3>
            <p className="text-slate-500 text-xs">Pagamentos · Total pago: <span className="text-green-400 font-bold">{fmt(totalPago)}</span></p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : (
          <>
            {pagamentos.length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-sm">Nenhum pagamento registrado</div>
            ) : (
              <div className="space-y-2 mb-4">
                {pagamentos.map(p => (
                  <div key={p.id} className="bg-black/40 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <PagStatusIcon s={p.status} />
                      <span className="text-white font-bold text-sm">{fmt(p.valor)}</span>
                      <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${PAG_STATUS_CLS[p.status] || PAG_STATUS_CLS.pendente}`}>{p.status}</span>
                      <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${p.tipo === 'pix' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>{p.tipo}</span>
                      {p.metadata?.manual && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">MANUAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-slate-600 text-xs flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {p.safe2pay_id && <span className="text-slate-700 text-xs font-mono">#{p.safe2pay_id}</span>}
                    </div>
                    {p.metadata?.observacao && <p className="text-slate-500 text-xs italic mt-1">{p.metadata.observacao}</p>}

                    {changingId === p.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                          className="bg-black border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs appearance-none focus:outline-none">
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                        <button onClick={() => handleChangeStatus(p.id, newStatus)}
                          className="text-xs text-green-400 hover:text-green-300 font-bold px-2 py-1 rounded bg-green-600/10">OK</button>
                        <button onClick={() => setChangingId(null)} className="text-xs text-slate-500 hover:text-white px-2 py-1">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setChangingId(p.id); setNewStatus(p.status) }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold mt-2">
                        Alterar status
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!showForm ? (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-green-500/30 rounded-xl text-green-400 hover:text-green-300 hover:border-green-500/50 text-xs font-bold transition-colors">
                <Plus className="w-4 h-4" /> Registrar Pagamento Manual
              </button>
            ) : (
              <div className="bg-black/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-black tracking-widest text-slate-400 uppercase">Novo pagamento (manual)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-white text-sm appearance-none focus:outline-none">
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Observação</label>
                  <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Depósito bancário, transferência..."
                    className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none" />
                </div>
                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-700 rounded-lg text-slate-400 text-xs">Cancelar</button>
                  <button onClick={handleRegister} disabled={saving || !valor}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Confirmar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AdminCandidatosPage() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Candidato | null>(null)
  const [viewingPagamentos, setViewingPagamentos] = useState<Candidato | null>(null)
  const [kyuDanList, setKyuDanList] = useState<KyuDan[]>([])
  const [federacoes, setFederacoes] = useState<Federacao[]>([])
  const [academias, setAcademias] = useState<Academia[]>([])

  const loadList = useCallback(() => {
    fetch('/api/candidato/admin/lista')
      .then(r => r.json())
      .then(d => setCandidatos(d.candidatos || []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    Promise.all([
      fetch('/api/kyu-dan').then(r => r.ok ? r.json() : { kyu_dan: [] }).catch(() => ({ kyu_dan: [] })),
      fetch('/api/federacoes').then(r => r.ok ? r.json() : { federacoes: [] }).catch(() => ({ federacoes: [] })),
      fetch('/api/academias').then(r => r.ok ? r.json() : { academias: [] }).catch(() => ({ academias: [] })),
    ]).then(([k, f, a]) => {
      setKyuDanList(k.kyu_dan || k.data || [])
      setFederacoes(f.federacoes || f.data || [])
      setAcademias(a.academias || a.data || [])
    })
  }, [])

  const filtered = candidatos.filter(c =>
    c.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: candidatos.length,
    confirmados: candidatos.filter(c => c.inscricao?.status_inscricao === 'CONFIRMADO').length,
    pendentes: candidatos.filter(c => c.inscricao?.status_inscricao === 'PENDENTE' || c.inscricao?.status_inscricao === 'EM_ANALISE').length,
    semInscricao: candidatos.filter(c => !c.inscricao).length,
  }

  // Refresca o candidato editado depois de salvar
  const refreshEditing = useCallback(async () => {
    if (!editing) return
    const r = await fetch('/api/candidato/admin/lista')
    const d = await r.json()
    const list: Candidato[] = d.candidatos || []
    setCandidatos(list)
    const next = list.find(c => c.id === editing.id)
    if (next) setEditing(next)
  }, [editing])

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Gerenciar Candidatos</h1>
        <p className="text-slate-400 mt-1">Programa de Formação de Faixas Pretas — Liga Riograndense de Judô</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Confirmados', value: stats.confirmados, color: 'text-green-400' },
          { label: 'Em Análise', value: stats.pendentes, color: 'text-yellow-400' },
          { label: 'Sem Inscrição', value: stats.semInscricao, color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full bg-[#111827] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-px">
          <div className="col-span-6 grid grid-cols-[1fr_auto_auto_auto_auto_auto] bg-[#0d1420] px-5 py-3">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Candidato</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-24">Faixa</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-28">Objetivo</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-28">Requisitos</span>
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase text-center w-28">Status</span>
            <span className="w-24" />
          </div>

          {filtered.length === 0 ? (
            <div className="col-span-6 py-12 text-center text-slate-500 text-sm">
              {search ? 'Nenhum candidato encontrado.' : 'Nenhum candidato cadastrado.'}
            </div>
          ) : (
            filtered.map(c => {
              const pct = c.requisitos_total ? Math.round(c.requisitos_confirmados / c.requisitos_total * 100) : 0
              return (
                <div key={c.id} className="col-span-6 grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center px-5 py-4 border-t border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0 flex items-center gap-2">
                    {c.dados_verificados && (
                      <span title="Dados conferidos pelo gestor" className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-semibold text-sm truncate">{c.nome_completo}</p>
                        {c.mudancas_pendentes > 0 && (
                          <span title={`${c.mudancas_pendentes} mudança(s) aguardando aprovação`}
                            className="shrink-0 bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">
                            {c.mudancas_pendentes}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">{c.email}</p>
                    </div>
                  </div>
                  <div className="text-center w-24">
                    <p className="text-slate-300 text-xs">{c.kyu_dan?.cor_faixa || '—'}</p>
                  </div>
                  <div className="text-center w-28">
                    <p className="text-slate-300 text-xs">{c.inscricao?.graduacao_pretendida || '—'}</p>
                  </div>
                  <div className="w-28 px-2">
                    {c.requisitos_total > 0 ? (
                      <>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 text-center mt-1">{c.requisitos_confirmados}/{c.requisitos_total}</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-700 text-center">—</p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 w-28">
                    {c.inscricao ? (
                      <>
                        <StatusBadge value={c.inscricao.status_inscricao} />
                        <StatusBadge value={c.inscricao.status_pagamento} />
                      </>
                    ) : (
                      <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">sem inscrição</span>
                    )}
                  </div>
                  <div className="w-24 flex justify-end gap-1.5">
                    <button
                      onClick={() => setViewingPagamentos(c)}
                      className="text-xs text-green-400 hover:text-green-300 font-semibold px-2 py-1.5 rounded-lg bg-green-600/10 hover:bg-green-600/20 transition-colors"
                      title="Pagamentos"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditing(c)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {editing && (
        <EditModal
          candidato={editing}
          onClose={() => setEditing(null)}
          onUpdated={refreshEditing}
          kyuDanList={kyuDanList}
          federacoes={federacoes}
          academias={academias}
        />
      )}

      {viewingPagamentos && (
        <PagamentosModal
          candidato={viewingPagamentos}
          onClose={() => setViewingPagamentos(null)}
        />
      )}
    </div>
  )
}
