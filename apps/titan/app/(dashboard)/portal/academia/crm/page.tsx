'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Loader2, Phone, Mail, MessageCircle, ChevronRight, ChevronLeft, Trash2, Save } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'

type LeadStatus = 'lead' | 'contato' | 'experimentou' | 'matriculado'

interface Lead {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  origem: string
  status: LeadStatus
  notas: string | null
  created_at: string
  updated_at: string
}

const COLUMNS: { key: LeadStatus; label: string; color: string; bg: string; border: string }[] = [
  { key: 'lead',        label: 'Leads',        color: 'text-gray-300',  bg: 'bg-gray-500/10',   border: 'border-gray-500/30' },
  { key: 'contato',     label: 'Contato',      color: 'text-blue-300',  bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  { key: 'experimentou',label: 'Experimentou', color: 'text-purple-300',bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { key: 'matriculado', label: 'Matriculado',  color: 'text-green-300', bg: 'bg-green-500/10',  border: 'border-green-500/30' },
]

const ORIGINS = ['manual', 'instagram', 'whatsapp', 'indicação', 'site', 'google']

function LeadCard({
  lead, onMove, onDelete, onEdit,
}: {
  lead: Lead
  onMove: (id: string, dir: 1 | -1) => void
  onDelete: (id: string) => void
  onEdit: (lead: Lead) => void
}) {
  const colIdx = COLUMNS.findIndex(c => c.key === lead.status)
  const waLink = lead.telefone
    ? `https://wa.me/55${lead.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${lead.nome}! Tudo bem?`)}`
    : null

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{lead.nome}</p>
          {lead.telefone && (
            <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3" />{lead.telefone}
            </p>
          )}
          {lead.email && (
            <p className="text-gray-400 text-xs flex items-center gap-1 truncate">
              <Mail className="w-3 h-3" />{lead.email}
            </p>
          )}
          {lead.notas && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{lead.notas}</p>
          )}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{lead.origem}</span>
            <span className="text-[10px] text-gray-600">
              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(lead.id)}
          className="p-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div className="flex gap-1">
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer"
              className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => onEdit(lead)}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
            title="Editar notas"
          >
            Notas
          </button>
        </div>
        <div className="flex gap-1">
          {colIdx > 0 && (
            <button
              onClick={() => onMove(lead.id, -1)}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Voltar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {colIdx < COLUMNS.length - 1 && (
            <button
              onClick={() => onMove(lead.id, 1)}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Avançar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CRMPage() {
  const router = useRouter()
  const supabase = createClient()

  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)

  // New lead form
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', origem: 'manual', notas: '' })
  // Edit notes form
  const [editNotas, setEditNotas] = useState('')

  const load = useCallback(async (acadId: string) => {
    const res = await fetch(`/api/academia/leads?academia_id=${acadId}`)
    if (res.ok) {
      const json = await res.json()
      setLeads(json.leads || [])
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const id = await resolveAcademiaId(supabase)
      setAcademiaId(id)
      if (id) await load(id)
      setLoading(false)
    }
    init()
  }, [])

  const addLead = async () => {
    if (!academiaId || !form.nome.trim()) return
    setSaving(true)
    await fetch('/api/academia/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, academia_id: academiaId }),
    })
    await load(academiaId)
    setForm({ nome: '', telefone: '', email: '', origem: 'manual', notas: '' })
    setShowAdd(false)
    setSaving(false)
  }

  const moveLead = async (id: string, dir: 1 | -1) => {
    const lead = leads.find(l => l.id === id)
    if (!lead) return
    const colIdx = COLUMNS.findIndex(c => c.key === lead.status)
    const newStatus = COLUMNS[colIdx + dir]?.key
    if (!newStatus) return
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
    await fetch(`/api/academia/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id))
    await fetch(`/api/academia/leads/${id}`, { method: 'DELETE' })
  }

  const saveNotas = async () => {
    if (!editingLead) return
    setSaving(true)
    setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, notas: editNotas } : l))
    await fetch(`/api/academia/leads/${editingLead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: editNotas }),
    })
    setEditingLead(null)
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">CRM de Leads</h1>
              <p className="text-gray-400 mt-1">Funil de conversão de novos alunos</p>
            </div>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Add form */}
        {showAdd && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Novo Lead</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Origem</label>
                <select
                  value={form.origem}
                  onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <input
                  type="text"
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observações iniciais..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={addLead}
                disabled={saving || !form.nome.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Kanban */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colLeads = leads.filter(l => l.status === col.key)
              return (
                <div key={col.key} className={`rounded-xl border ${col.border} ${col.bg} p-4 min-h-[300px]`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${col.bg} border ${col.border} ${col.color}`}>
                      {colLeads.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {colLeads.length === 0 && (
                      <p className="text-gray-600 text-xs text-center py-4">Nenhum lead aqui</p>
                    )}
                    {colLeads.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onMove={moveLead}
                        onDelete={deleteLead}
                        onEdit={l => { setEditingLead(l); setEditNotas(l.notas || '') }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit notes modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{editingLead.nome}</h3>
              <button onClick={() => setEditingLead(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={editNotas}
              onChange={e => setEditNotas(e.target.value)}
              placeholder="Adicione notas sobre este lead..."
              rows={5}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-gray-300 text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={saveNotas}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
              <button onClick={() => setEditingLead(null)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
