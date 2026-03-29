'use client'

import { useEffect, useState } from 'react'
import { Loader2, CalendarDays, MapPin, Clock, Plus, Pencil, Trash2, X, ChevronDown, ExternalLink, Monitor, Users } from 'lucide-react'
import { useCandidato } from '../context'

interface ScheduleEvent {
  id: string
  titulo: string
  descricao?: string
  data: string
  hora?: string
  local?: string
  tipo?: string
  graduation_level?: string[]
  link?: string
  modality?: string
}

interface EventForm {
  titulo: string
  descricao: string
  data: string
  hora: string
  local: string
  tipo: string
  graduation_level: string[]
}

const EMPTY_FORM: EventForm = { titulo: '', descricao: '', data: '', hora: '', local: '', tipo: '', graduation_level: [] }

const TIPOS = ['exame', 'treino', 'seminario', 'reuniao', 'curso', 'campeonato']
const GRADUACOES_LEVEL = ['shodan', 'nidan', 'sandan', 'yondan', 'godan', 'rokudan']

function groupByMonth(events: ScheduleEvent[]) {
  const groups: Record<string, ScheduleEvent[]> = {}
  events.forEach(ev => {
    const time = ev.hora || '12:00'
    const d = new Date(`${ev.data}T${time}`)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  })
  return Object.keys(groups).sort().map(key => ({
    key,
    label: new Date(`${key}-02T12:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    items: groups[key],
  }))
}

const TIPO_COLORS: Record<string, string> = {
  exame: 'bg-red-600/20 text-red-400 border-red-600/30',
  treino: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  seminario: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  reuniao: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  curso: 'bg-green-600/20 text-green-400 border-green-600/30',
  campeonato: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  default: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
}

function EventModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: EventForm
  onSave: (f: EventForm) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<EventForm>(initial)
  const set = (k: keyof EventForm, v: any) => setForm(p => ({ ...p, [k]: v }))

  const toggleLevel = (level: string) => {
    set('graduation_level', form.graduation_level.includes(level)
      ? form.graduation_level.filter(l => l !== level)
      : [...form.graduation_level, level])
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-black text-lg">{initial.titulo ? 'Editar Evento' : 'Novo Evento'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Título *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Data *</label>
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Hora</label>
              <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}
                className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Local</label>
            <input value={form.local} onChange={e => set('local', e.target.value)}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Tipo</label>
            <div className="relative">
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-indigo-500">
                <option value="">— selecione —</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-2">Graduações</label>
            <div className="flex flex-wrap gap-2">
              {GRADUACOES_LEVEL.map(g => (
                <button key={g} type="button" onClick={() => toggleLevel(g)}
                  className={`text-xs px-3 py-1 rounded-full border font-bold transition-colors ${form.graduation_level.includes(g) ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                  {g}
                </button>
              ))}
              <button type="button" onClick={() => set('graduation_level', [])}
                className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-500 hover:text-slate-300 font-bold">
                todos
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">Vazio = visível para todos</p>
          </div>
          <div>
            <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-1.5">Descrição</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3}
              className="w-full bg-black border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors text-sm">
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !form.titulo || !form.data}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white font-bold transition-colors text-sm flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CronogramaPage() {
  const { isAdmin } = useCandidato()
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([])
  const [graduacao, setGraduacao] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; editing: (ScheduleEvent & { form: EventForm }) | null }>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/candidato/dados')
      .then(r => r.json())
      .then(d => {
        setAllEvents(d.federation_schedule || [])
        const grad = d.inscricao?.graduacao_pretendida?.toLowerCase().split(' ')[0] || ''
        setGraduacao(grad)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Filter by graduation_level (same logic as profepmax)
  const events = allEvents.filter(ev => {
    if (!ev.graduation_level || ev.graduation_level.length === 0) return true
    if (!graduacao) return true
    return ev.graduation_level.map(l => l.toLowerCase()).includes(graduacao)
  })

  const groups = groupByMonth(events)

  const openCreate = () => setModal({ open: true, editing: null })
  const openEdit = (ev: ScheduleEvent) => setModal({
    open: true,
    editing: {
      ...ev,
      form: {
        titulo: ev.titulo,
        descricao: ev.descricao || '',
        data: ev.data,
        hora: ev.hora || '',
        local: ev.local || '',
        tipo: ev.tipo || '',
        graduation_level: ev.graduation_level || [],
      }
    }
  })

  const handleSave = async (form: EventForm) => {
    setSaving(true)
    try {
      const body = {
        title: form.titulo,
        description: form.descricao,
        date: form.data,
        start_time: form.hora || null,
        location: form.local || null,
        type: form.tipo || null,
        graduation_level: form.graduation_level,
      }
      const id = modal.editing?.id
      const res = await fetch(id ? `/api/candidato/admin/evento/${id}` : '/api/candidato/admin/evento', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.evento) {
        const normalized: ScheduleEvent = {
          id: data.evento.id,
          titulo: data.evento.title || data.evento.titulo || form.titulo,
          descricao: data.evento.description || data.evento.descricao || form.descricao,
          data: data.evento.date || data.evento.data || form.data,
          hora: data.evento.start_time || data.evento.hora || form.hora || undefined,
          local: data.evento.location || data.evento.local || form.local || undefined,
          tipo: data.evento.type || data.evento.tipo || form.tipo || undefined,
          graduation_level: data.evento.graduation_level || form.graduation_level,
        }
        if (id) {
          setAllEvents(prev => prev.map(e => e.id === id ? normalized : e))
        } else {
          setAllEvents(prev => [...prev, normalized])
        }
        setModal({ open: false, editing: null })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este evento?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/candidato/admin/evento/${id}`, { method: 'DELETE' })
      setAllEvents(prev => prev.filter(e => e.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Cronograma Oficial</h1>
          <p className="text-slate-400 mt-1">Liga Riograndense de Judô — Programa de Faixas Pretas</p>
          {graduacao && !isAdmin && (
            <p className="text-xs text-slate-500 mt-1">Filtrando eventos para: <span className="text-slate-300 font-semibold">{graduacao}</span></p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Nenhum evento cadastrado no momento.</p>
          <p className="text-slate-600 text-sm mt-1">O cronograma será atualizado em breve.</p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.key}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase">{group.label}</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="space-y-3">
              {group.items.map(ev => {
                const tipoKey = ev.tipo?.toLowerCase() || 'default'
                const colorClass = TIPO_COLORS[tipoKey] || TIPO_COLORS.default
                return (
                  <div key={ev.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex gap-5 group/card">
                    <div className="flex-shrink-0 w-16 text-center">
                      <p className="text-2xl font-black text-white leading-none">
                        {new Date(`${ev.data}T12:00`).getDate().toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-slate-500 uppercase mt-0.5">
                        {new Date(`${ev.data}T12:00`).toLocaleDateString('pt-BR', { month: 'short' })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-white font-bold text-base">{ev.titulo}</h3>
                          {ev.descricao && <p className="text-slate-400 text-sm mt-1">{ev.descricao}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {ev.tipo && (
                            <span className={`text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${colorClass} flex-shrink-0`}>
                              {ev.tipo}
                            </span>
                          )}
                          {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(ev)}
                                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}
                                className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors">
                                {deletingId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3">
                        {ev.hora && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" />{ev.hora}
                          </div>
                        )}
                        {ev.local && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />{ev.local}
                          </div>
                        )}
                        {ev.modality && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            {ev.modality.includes('Online') ? <Monitor className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                            {ev.modality}
                          </div>
                        )}
                        {ev.link && (
                          <a href={ev.link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />Acessar
                          </a>
                        )}
                        {isAdmin && ev.graduation_level && ev.graduation_level.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-400/70">
                            {ev.graduation_level.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {modal.open && (
        <EventModal
          initial={modal.editing?.form || EMPTY_FORM}
          onSave={handleSave}
          onClose={() => setModal({ open: false, editing: null })}
          saving={saving}
        />
      )}
    </div>
  )
}
