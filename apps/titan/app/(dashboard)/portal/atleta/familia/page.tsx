'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Users, Plus, X, Save, User } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface KyuDan { id: number; kyu_dan: string; cor_faixa: string }
interface Membro {
  id: string
  nome: string
  data_nascimento: string | null
  genero: string | null
  kyu_dan_id: number | null
  graduacao: KyuDan | null
  created_at: string
}

const GENEROS = ['Masculino', 'Feminino', 'Outro']

export default function FamiliaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [membros, setMembros] = useState<Membro[]>([])
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [kyuDanList, setKyuDanList] = useState<KyuDan[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', data_nascimento: '', genero: '', kyu_dan_id: '' })

  const load = useCallback(async () => {
    const [res, kdRes] = await Promise.all([
      fetch('/api/atleta/familia'),
      supabase.from('kyu_dan').select('id, kyu_dan, cor_faixa').order('id'),
    ])
    if (res.ok) {
      const json = await res.json()
      setMembros(json.membros || [])
      setAcademiaId(json.academiaId || null)
    }
    if (!kdRes.error) setKyuDanList((kdRes.data || []) as KyuDan[])
  }, [])

  useEffect(() => {
    load().then(() => setLoading(false))
  }, [load])

  const addMembro = async () => {
    if (!form.nome.trim() || !academiaId) return
    setSaving(true)
    await fetch('/api/atleta/familia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        data_nascimento: form.data_nascimento || null,
        genero: form.genero || null,
        kyu_dan_id: form.kyu_dan_id ? Number(form.kyu_dan_id) : null,
        academia_id: academiaId,
      }),
    })
    await load()
    setForm({ nome: '', data_nascimento: '', genero: '', kyu_dan_id: '' })
    setShowAdd(false)
    setSaving(false)
  }

  const removeMembro = async (id: string) => {
    setMembros(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/atleta/familia/${id}`, { method: 'DELETE' })
  }

  const calcIdade = (dob: string | null) => {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
    return age
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Conta Família</h1>
              <p className="text-gray-400 mt-1">Gerencie os membros da sua família na academia</p>
            </div>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Info banner */}
        {!academiaId && !loading && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-300 text-sm">
            Você precisa estar vinculado a uma academia para usar a Conta Família.
          </div>
        )}

        {/* Add form */}
        {showAdd && academiaId && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Novo Membro</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome do dependente"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Gênero</label>
                <select
                  value={form.genero}
                  onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Selecionar</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Graduação</label>
                <select
                  value={form.kyu_dan_id}
                  onChange={e => setForm(f => ({ ...f, kyu_dan_id: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Sem graduação</option>
                  {kyuDanList.map(k => (
                    <option key={k.id} value={k.id}>{k.cor_faixa} — {k.kyu_dan}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={addMembro}
                disabled={saving || !form.nome.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Members list */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : membros.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-300 font-semibold">Nenhum membro cadastrado</p>
            <p className="text-gray-500 text-sm mt-1">Adicione os membros da sua família para gerenciá-los juntos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {membros.map(m => {
              const idade = calcIdade(m.data_nascimento)
              return (
                <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{m.nome}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {m.genero && (
                        <span className="text-xs text-gray-400">{m.genero}</span>
                      )}
                      {idade !== null && (
                        <span className="text-xs text-gray-400">{idade} anos</span>
                      )}
                      {m.graduacao && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                          {m.graduacao.cor_faixa} · {m.graduacao.kyu_dan}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMembro(m.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
