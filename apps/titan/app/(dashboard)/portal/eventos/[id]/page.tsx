'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Calendar, MapPin, Clock, Users, Trash2, Eye, EyeOff, Settings, FileText, Edit3, AlertTriangle, Scale, Swords, Trophy, ListOrdered, Play, Tv } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface AreaMatch {
  id: string
  label: string
  seq: number
  bracket_id: string
  categoria: string
  tipo: string
  status: string
  match_tipo: string
  athlete1_nome: string
  athlete1_academia: string
  athlete2_nome: string
  athlete2_academia: string
  winner_registration_id: string | null
  resultado: string | null
}

interface AreaGroup {
  area_id: number
  matches: AreaMatch[]
}

interface Evento {
  id: string
  nome: string
  data_evento: string
  data_evento_fim: string | null
  hora_inicio: string | null
  hora_fim: string | null
  local: string | null
  cidade: string | null
  endereco_completo: string | null
  descricao: string | null
  status: string
  categoria: string | null
  limite_inscritos: number | null
  valor_inscricao: number | null
  tipo_evento: string | null
  modalidade: string | null
  regulamento: string | null
  banner_url: string | null
  inscricao_inicio: string | null
  inscricao_fim: string | null
  num_areas: number | null
  contato_email: string | null
  contato_telefone: string | null
  publicado: boolean
  criado_por: string | null
  federacao_id: string | null
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export default function EventoDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [totalInscritos, setTotalInscritos] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [schedule, setSchedule] = useState<AreaGroup[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [selectedArea, setSelectedArea] = useState<number>(1)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventos/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEvento(json.evento)
      setTotalInscritos(json.total_inscritos)
      setFormData({ ...json.evento })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true)
    try {
      const res = await fetch(`/api/eventos/${id}/schedule`)
      const json = await res.json()
      if (res.ok && json.areas) {
        setSchedule(json.areas)
      }
    } catch { /* silent */ } finally { setScheduleLoading(false) }
  }, [id])

  useEffect(() => { load(); loadSchedule() }, [load, loadSchedule])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData((prev: Record<string, any>) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData((prev: Record<string, any>) => ({ ...prev, [name]: value }))
    }
  }

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      const res = await fetch(`/api/eventos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      setEvento(json.data)
      setFormData({ ...json.data })
      setEditing(false)
      setSuccess('Evento atualizado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir/cancelar este evento?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (json.cancelado) {
        setSuccess('Evento cancelado (possui inscricoes confirmadas).')
        await load()
      } else {
        router.push('/portal/eventos')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const ic = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
  const icReadonly = "w-full px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-lg text-slate-300 text-sm cursor-default"
  const label = "block text-sm font-semibold text-slate-300 mb-1.5"

  const statusColors: Record<string, string> = {
    'Planejamento': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Inscrições abertas': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Inscrições encerradas': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Em andamento': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Encerrado': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    'Cancelado': 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Evento nao encontrado</h2>
          <p className="text-slate-400 mb-4">{error || 'O evento pode ter sido removido.'}</p>
          <button onClick={() => router.push('/portal/eventos')} className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors">
            Voltar ao Portal de Eventos
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-'
  const formatTime = (t: string | null) => t ? t.substring(0, 5) : '-'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4">
          <button onClick={() => router.push('/portal/eventos')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />Voltar
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white">{evento.nome}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[evento.status] || 'bg-slate-500/20 text-slate-300'}`}>
                  {evento.status}
                </span>
                {evento.publicado ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                    <Eye className="w-3 h-3" />Publicado
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />Rascunho
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {evento.tipo_evento} {evento.modalidade && `| ${evento.modalidade}`}
                {evento.cidade && ` | ${evento.cidade}`}
              </p>
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">
                  <Edit3 className="w-4 h-4" />Editar
                </button>
              ) : (
                <button onClick={() => { setEditing(false); setFormData({ ...evento }) }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                  Cancelar Edicao
                </button>
              )}
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">{success}</div>}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Users className="w-4 h-4" />Inscritos</div>
            <div className="text-2xl font-bold text-white">{totalInscritos}{evento.limite_inscritos ? `/${evento.limite_inscritos}` : ''}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Calendar className="w-4 h-4" />Data</div>
            <div className="text-lg font-bold text-white">{formatDate(evento.data_evento)}{evento.data_evento_fim ? ` - ${formatDate(evento.data_evento_fim)}` : ''}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><Clock className="w-4 h-4" />Horario</div>
            <div className="text-lg font-bold text-white">{formatTime(evento.hora_inicio)}{evento.hora_fim ? ` - ${formatTime(evento.hora_fim)}` : ''}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1"><MapPin className="w-4 h-4" />Areas</div>
            <div className="text-2xl font-bold text-white">{evento.num_areas || 1} tatame{(evento.num_areas || 1) > 1 ? 's' : ''}</div>
          </div>
        </div>

        {editing ? (
          /* Edit Form */
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave() }}>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400" />Dados Basicos</h3>
              <div className="space-y-4">
                <div>
                  <label className={label}>Nome *</label>
                  <input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} className={ic} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={label}>Tipo</label>
                    <select name="tipo_evento" value={formData.tipo_evento || 'Campeonato'} onChange={handleChange} className={ic}>
                      <option value="Campeonato">Campeonato</option>
                      <option value="Torneio">Torneio</option>
                      <option value="Seminário">Seminario</option>
                      <option value="Exame de Faixa">Exame de Faixa</option>
                      <option value="Festival">Festival</option>
                      <option value="Treino Coletivo">Treino Coletivo</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Modalidade</label>
                    <select name="modalidade" value={formData.modalidade || 'Judo'} onChange={handleChange} className={ic}>
                      <option value="Judo">Judo</option>
                      <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                      <option value="Karate">Karate</option>
                      <option value="Wrestling">Wrestling</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Status</label>
                    <select name="status" value={formData.status || 'Planejamento'} onChange={handleChange} className={ic}>
                      <option value="Planejamento">Planejamento</option>
                      <option value="Inscrições abertas">Inscricoes abertas</option>
                      <option value="Inscrições encerradas">Inscricoes encerradas</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Encerrado">Encerrado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={label}>Descricao</label>
                  <textarea name="descricao" value={formData.descricao || ''} onChange={handleChange} rows={3} className={`${ic} resize-none`} />
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-cyan-400" />Datas e Horarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={label}>Data Inicio *</label><input type="date" name="data_evento" value={formData.data_evento || ''} onChange={handleChange} className={ic} required /></div>
                <div><label className={label}>Data Fim</label><input type="date" name="data_evento_fim" value={formData.data_evento_fim || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Hora Inicio</label><input type="time" name="hora_inicio" value={formData.hora_inicio || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Hora Fim</label><input type="time" name="hora_fim" value={formData.hora_fim || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Inscricoes Abrem</label><input type="date" name="inscricao_inicio" value={formData.inscricao_inicio || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Inscricoes Encerram</label><input type="date" name="inscricao_fim" value={formData.inscricao_fim || ''} onChange={handleChange} className={ic} /></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-cyan-400" />Local</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className={label}>Cidade</label><input type="text" name="cidade" value={formData.cidade || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Local</label><input type="text" name="local" value={formData.local || ''} onChange={handleChange} className={ic} /></div>
              </div>
              <div><label className={label}>Endereco Completo</label><input type="text" name="endereco_completo" value={formData.endereco_completo || ''} onChange={handleChange} className={ic} /></div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-cyan-400" />Configuracoes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className={label}>Num. Areas</label><input type="number" name="num_areas" value={formData.num_areas || 1} onChange={handleChange} min="1" max="20" className={ic} /></div>
                <div><label className={label}>Limite Inscritos</label><input type="number" name="limite_inscritos" value={formData.limite_inscritos || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Valor Inscricao (R$)</label><input type="number" name="valor_inscricao" value={formData.valor_inscricao || ''} onChange={handleChange} step="0.01" className={ic} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className={label}>E-mail Contato</label><input type="email" name="contato_email" value={formData.contato_email || ''} onChange={handleChange} className={ic} /></div>
                <div><label className={label}>Telefone Contato</label><input type="tel" name="contato_telefone" value={formData.contato_telefone || ''} onChange={handleChange} className={ic} /></div>
              </div>
              <div className="mb-4"><label className={label}>Banner URL</label><input type="url" name="banner_url" value={formData.banner_url || ''} onChange={handleChange} className={ic} /></div>
              <div><label className={label}>Regulamento</label><textarea name="regulamento" value={formData.regulamento || ''} onChange={handleChange} rows={5} className={`${ic} resize-none`} /></div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="publicado" checked={formData.publicado || false} onChange={handleChange}
                  className="w-5 h-5 rounded bg-white/10 border border-white/20 text-cyan-500 focus:ring-cyan-500" />
                <div>
                  <span className="text-white font-medium">Publicar evento</span>
                  <p className="text-xs text-slate-400">Eventos publicados ficam visiveis para todos os usuarios.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Salvando...' : 'Salvar Alteracoes'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setFormData({ ...evento }) }}
                className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-all">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Banner */}
            {evento.banner_url && (
              <div className="rounded-xl overflow-hidden border border-white/10">
                <img src={evento.banner_url} alt={evento.nome} className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400" />Descricao</h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{evento.descricao || 'Sem descricao.'}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-cyan-400" />Local</h3>
                <div className="space-y-2 text-sm">
                  {evento.local && <p className="text-white font-medium">{evento.local}</p>}
                  {evento.endereco_completo && <p className="text-slate-400">{evento.endereco_completo}</p>}
                  {evento.cidade && <p className="text-slate-400">{evento.cidade}</p>}
                  {!evento.local && !evento.cidade && <p className="text-slate-500">Local nao informado.</p>}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-cyan-400" />Inscricoes</h3>
                <div className="space-y-2 text-sm">
                  {evento.inscricao_inicio && <p className="text-slate-300">Abertura: <span className="text-white font-medium">{formatDate(evento.inscricao_inicio)}</span></p>}
                  {evento.inscricao_fim && <p className="text-slate-300">Encerramento: <span className="text-white font-medium">{formatDate(evento.inscricao_fim)}</span></p>}
                  {evento.valor_inscricao && evento.valor_inscricao > 0 ? (
                    <p className="text-slate-300">Valor: <span className="text-green-400 font-bold">R$ {Number(evento.valor_inscricao).toFixed(2)}</span></p>
                  ) : (
                    <p className="text-green-400 font-medium">Inscricao gratuita</p>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-cyan-400" />Contato</h3>
                <div className="space-y-2 text-sm">
                  {evento.contato_email && <p className="text-slate-300">E-mail: <span className="text-white">{evento.contato_email}</span></p>}
                  {evento.contato_telefone && <p className="text-slate-300">Telefone: <span className="text-white">{evento.contato_telefone}</span></p>}
                  {!evento.contato_email && !evento.contato_telefone && <p className="text-slate-500">Contato nao informado.</p>}
                </div>
              </div>
            </div>

            {/* Regulamento */}
            {evento.regulamento && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Regulamento</h3>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{evento.regulamento}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Acoes Rapidas</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => router.push(`/portal/eventos/${id}/categorias`)}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors border border-green-500/30 text-sm">
                  <Scale className="w-4 h-4 inline mr-1" />Categorias
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/chaves`)}
                  className="px-4 py-2 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors border border-orange-500/30 text-sm">
                  <Swords className="w-4 h-4 inline mr-1" />Chaves & Lutas
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/bracket-rules`)}
                  className="px-4 py-2 bg-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-colors border border-violet-500/30 text-sm">
                  <Settings className="w-4 h-4 inline mr-1" />Regras de Chaves
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/cronograma`)}
                  className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-colors border border-indigo-500/30 text-sm">
                  <ListOrdered className="w-4 h-4 inline mr-1" />Cronograma
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/pesagem`)}
                  className="px-4 py-2 bg-teal-500/20 text-teal-300 rounded-lg hover:bg-teal-500/30 transition-colors border border-teal-500/30 text-sm">
                  <Scale className="w-4 h-4 inline mr-1" />Pesagem
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/tatames`)}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors border border-emerald-500/30 text-sm">
                  <Play className="w-4 h-4 inline mr-1" />Tatames
                </button>
                <button onClick={() => router.push('/portal/eventos/inscricoes')}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 text-sm">
                  <Users className="w-4 h-4 inline mr-1" />Ver Inscricoes
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/resultados`)}
                  className="px-4 py-2 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors border border-amber-500/30 text-sm">
                  <Trophy className="w-4 h-4 inline mr-1" />Resultados & Medalhas
                </button>
                <button onClick={() => window.open(`/eventos/${id}/placar`, '_blank')}
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30 text-sm">
                  Placar Espectador
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/transmissao`)}
                  className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-colors border border-rose-500/30 text-sm">
                  <Tv className="w-4 h-4 inline mr-1" />Titan TV
                </button>
                <button onClick={() => router.push('/portal/eventos/comunicados')}
                  className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors border border-purple-500/30 text-sm">
                  Comunicados
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/termos`)}
                  className="px-4 py-2 bg-fuchsia-500/20 text-fuchsia-300 rounded-lg hover:bg-fuchsia-500/30 transition-colors border border-fuchsia-500/30 text-sm">
                  <FileText className="w-4 h-4 inline mr-1" />Termos & Waivers
                </button>
                <button onClick={() => router.push(`/portal/eventos/${id}/notificacoes`)}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors border border-green-500/30 text-sm">
                  WhatsApp Atletas
                </button>
              </div>
            </div>

            {/* Match List by Area */}
            {schedule.length > 0 && schedule.some(a => a.matches.length > 0) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-cyan-400" />Combates por Area
                  </h3>
                  <div className="flex gap-1">
                    {schedule.filter(a => a.matches.length > 0).map(area => (
                      <button
                        key={area.area_id}
                        onClick={() => setSelectedArea(area.area_id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedArea === area.area_id
                            ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {area.area_id === 0 ? 'S/Area' : `Area ${area.area_id}`}
                      </button>
                    ))}
                  </div>
                </div>

                {scheduleLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
                ) : (
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                    {(schedule.find(a => a.area_id === selectedArea)?.matches || []).map(m => {
                      const statusColor = m.status === 'finished' ? 'text-green-400' :
                        m.status === 'in_progress' ? 'text-yellow-300' :
                        m.status === 'ready' ? 'text-cyan-300' : 'text-slate-500'
                      const statusIcon = m.status === 'finished' ? '✓' :
                        m.status === 'in_progress' ? '▶' :
                        m.status === 'ready' ? '●' : '○'
                      return (
                        <div
                          key={m.id}
                          onClick={() => router.push(`/portal/eventos/${id}/scoring/${m.id}`)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all bg-white/[0.04] border-white/10 hover:bg-white/[0.08] cursor-pointer"
                        >
                          {/* Label */}
                          <span className="text-xs font-mono font-bold text-cyan-400 w-12 shrink-0">{m.label}</span>
                          {/* Status dot */}
                          <span className={`text-xs ${statusColor} w-4 shrink-0`}>{statusIcon}</span>
                          {/* Category */}
                          <span className="text-[10px] text-slate-500 w-32 shrink-0 truncate">{m.categoria}</span>
                          {/* Match type badge */}
                          {m.match_tipo !== 'main' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 shrink-0">
                              {m.match_tipo === 'semifinal' ? 'Semi' : m.match_tipo === 'final' ? 'Final' :
                               m.match_tipo === 'bronze' ? 'Bronze' : m.match_tipo === 'repechage' ? 'Rep.' : m.match_tipo}
                            </span>
                          )}
                          {/* Athletes */}
                          <div className="flex-1 min-w-0 flex items-center gap-1 text-xs">
                            <span className={`truncate ${m.winner_registration_id && m.athlete1_nome ? 'text-white font-medium' : 'text-slate-300'}`}>
                              {m.athlete1_nome || 'TBD'}
                            </span>
                            <span className="text-slate-600 shrink-0">vs</span>
                            <span className={`truncate ${m.winner_registration_id && m.athlete2_nome ? 'text-white font-medium' : 'text-slate-300'}`}>
                              {m.athlete2_nome || 'TBD'}
                            </span>
                          </div>
                          {/* Result */}
                          {m.resultado && (
                            <span className="text-[10px] text-green-400 shrink-0">{m.resultado}</span>
                          )}
                          {/* Play/open button */}
                          <Play className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
