'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Calendar, MapPin, Clock, Users, DollarSign, FileText, Settings, Eye } from 'lucide-react'
import { useState } from 'react'

export default function NovoEventoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    data_evento: '',
    data_evento_fim: '',
    hora_inicio: '',
    hora_fim: '',
    cidade: '',
    local: '',
    endereco_completo: '',
    categoria: '',
    limite_inscritos: '',
    valor_inscricao: '',
    descricao: '',
    status: 'Planejamento',
    tipo_evento: 'Campeonato',
    modalidade: 'Judo',
    regulamento: '',
    banner_url: '',
    inscricao_inicio: '',
    inscricao_fim: '',
    num_areas: '1',
    contato_email: '',
    contato_telefone: '',
    publicado: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.data_evento) { setError('Nome e data de inicio sao obrigatorios'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao criar evento')
      router.push('/portal/eventos')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const ic = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
  const label = "block text-sm font-semibold text-slate-300 mb-1.5"
  const sectionTitle = "text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-white/10"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div>
            <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm mb-2">
              <ArrowLeft className="w-4 h-4" />Voltar
            </button>
            <h1 className="text-3xl font-bold text-white">Criar Novo Evento</h1>
            <p className="text-slate-400 text-sm mt-1">Preencha os dados do evento. Campos marcados com * sao obrigatorios.</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

        <form className="space-y-8" onSubmit={e => { e.preventDefault(); handleSave() }}>

          {/* Dados Basicos */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h2 className={sectionTitle}><FileText className="w-5 h-5 text-cyan-400" />Dados Basicos</h2>
            <div className="space-y-4">
              <div>
                <label className={label}>Nome do Evento *</label>
                <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Campeonato Estadual de Judo 2026" className={ic} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Tipo de Evento</label>
                  <select name="tipo_evento" value={formData.tipo_evento} onChange={handleChange} className={ic}>
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
                  <select name="modalidade" value={formData.modalidade} onChange={handleChange} className={ic}>
                    <option value="Judo">Judo</option>
                    <option value="Jiu-Jitsu">Jiu-Jitsu</option>
                    <option value="Karate">Karate</option>
                    <option value="Wrestling">Wrestling</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Descricao</label>
                <textarea name="descricao" value={formData.descricao} onChange={handleChange}
                  placeholder="Descreva o evento, regras especiais, informacoes importantes..." rows={4} className={`${ic} resize-none`} />
              </div>
            </div>
          </div>

          {/* Datas e Horarios */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h2 className={sectionTitle}><Calendar className="w-5 h-5 text-cyan-400" />Datas e Horarios</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Data de Inicio *</label>
                  <input type="date" name="data_evento" value={formData.data_evento} onChange={handleChange} className={ic} required />
                </div>
                <div>
                  <label className={label}>Data de Termino</label>
                  <input type="date" name="data_evento_fim" value={formData.data_evento_fim} onChange={handleChange} className={ic} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Horario de Inicio</label>
                  <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} className={ic} />
                </div>
                <div>
                  <label className={label}>Horario de Termino</label>
                  <input type="time" name="hora_fim" value={formData.hora_fim} onChange={handleChange} className={ic} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Inscricoes Abrem</label>
                  <input type="date" name="inscricao_inicio" value={formData.inscricao_inicio} onChange={handleChange} className={ic} />
                </div>
                <div>
                  <label className={label}>Inscricoes Encerram</label>
                  <input type="date" name="inscricao_fim" value={formData.inscricao_fim} onChange={handleChange} className={ic} />
                </div>
              </div>
            </div>
          </div>

          {/* Local */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h2 className={sectionTitle}><MapPin className="w-5 h-5 text-cyan-400" />Local</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Cidade</label>
                  <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} placeholder="Porto Alegre" className={ic} />
                </div>
                <div>
                  <label className={label}>Local / Ginasio</label>
                  <input type="text" name="local" value={formData.local} onChange={handleChange} placeholder="Ginasio de Esportes" className={ic} />
                </div>
              </div>
              <div>
                <label className={label}>Endereco Completo</label>
                <input type="text" name="endereco_completo" value={formData.endereco_completo} onChange={handleChange} placeholder="Rua..., nro, Bairro - Cidade/UF" className={ic} />
              </div>
            </div>
          </div>

          {/* Configuracoes */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h2 className={sectionTitle}><Settings className="w-5 h-5 text-cyan-400" />Configuracoes</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={label}>Numero de Areas/Tatames</label>
                  <input type="number" name="num_areas" value={formData.num_areas} onChange={handleChange} min="1" max="20" className={ic} />
                </div>
                <div>
                  <label className={label}>Limite de Inscritos</label>
                  <input type="number" name="limite_inscritos" value={formData.limite_inscritos} onChange={handleChange} placeholder="Sem limite" className={ic} />
                </div>
                <div>
                  <label className={label}>Valor da Inscricao (R$)</label>
                  <input type="number" name="valor_inscricao" value={formData.valor_inscricao} onChange={handleChange} placeholder="0.00 (gratuito)" step="0.01" min="0" className={ic} />
                </div>
              </div>
              <div>
                <label className={label}>Categoria (legado)</label>
                <select name="categoria" value={formData.categoria} onChange={handleChange} className={ic}>
                  <option value="">Todas</option>
                  <option value="infantil">Infantil</option>
                  <option value="juvenil">Juvenil</option>
                  <option value="adulto">Adulto</option>
                  <option value="master">Master</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">O sistema de categorias detalhadas sera configurado apos criar o evento.</p>
              </div>
              <div>
                <label className={label}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={ic}>
                  <option value="Planejamento">Planejamento</option>
                  <option value="Inscrições abertas">Inscricoes abertas</option>
                  <option value="Inscrições encerradas">Inscricoes encerradas</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Encerrado">Encerrado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contato e Regulamento */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h2 className={sectionTitle}><FileText className="w-5 h-5 text-cyan-400" />Contato e Regulamento</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>E-mail de Contato</label>
                  <input type="email" name="contato_email" value={formData.contato_email} onChange={handleChange} placeholder="eventos@federacao.com" className={ic} />
                </div>
                <div>
                  <label className={label}>Telefone de Contato</label>
                  <input type="tel" name="contato_telefone" value={formData.contato_telefone} onChange={handleChange} placeholder="(51) 99999-9999" className={ic} />
                </div>
              </div>
              <div>
                <label className={label}>URL do Banner</label>
                <input type="url" name="banner_url" value={formData.banner_url} onChange={handleChange} placeholder="https://..." className={ic} />
              </div>
              <div>
                <label className={label}>Regulamento</label>
                <textarea name="regulamento" value={formData.regulamento} onChange={handleChange}
                  placeholder="Regras do evento, criterios de pontuacao, regulamento geral..." rows={6} className={`${ic} resize-none`} />
              </div>
            </div>
          </div>

          {/* Publicacao */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
            <h2 className={sectionTitle}><Eye className="w-5 h-5 text-cyan-400" />Publicacao</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="publicado" checked={formData.publicado} onChange={handleChange}
                className="w-5 h-5 rounded bg-white/10 border border-white/20 text-cyan-500 focus:ring-cyan-500" />
              <div>
                <span className="text-white font-medium">Publicar evento</span>
                <p className="text-xs text-slate-400">Eventos publicados ficam visiveis para todos os usuarios.</p>
              </div>
            </label>
          </div>

          {/* Botoes */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'Criando...' : 'Criar Evento'}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold rounded-xl transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
