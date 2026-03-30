'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Clock, AlertCircle, Edit2, X, ChevronDown } from 'lucide-react'

interface CandidatoData {
  stakeholder: {
    id: string
    nome_completo: string
    data_nascimento: string
    email: string
    telefone: string
    candidato: boolean
    kyu_dan: { id: number; kyu_dan: string; cor_faixa: string } | null
    data_ultima_graduacao: string | null
  }
  inscricao: {
    id: string
    graduacao_pretendida: string
    status_inscricao: string
    status_pagamento: string
    progresso: Record<string, unknown>
    created_at: string
  } | null
  kyu_dan_list: { id: number; kyu_dan: string; cor_faixa: string }[]
}

const GRADUACOES = [
  'Shodan (1º Dan)',
  'Nidan (2º Dan)',
  'Sandan (3º Dan)',
  'Yondan (4º Dan)',
]

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR')
}

function getStatusInfo(inscricao: CandidatoData['inscricao']) {
  if (!inscricao) return { label: 'REALIZAR INSCRIÇÃO', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: AlertCircle }
  if (inscricao.status_pagamento === 'APROVADO' && inscricao.status_inscricao === 'CONFIRMADO') {
    return { label: 'CONFIRMADO', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: CheckCircle2 }
  }
  if (inscricao.status_inscricao === 'PENDENTE' || inscricao.status_pagamento === 'PENDENTE') {
    return { label: 'EM ANÁLISE', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Clock }
  }
  return { label: inscricao.status_inscricao, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', icon: Clock }
}

export default function VisaoGeralPage() {
  const [data, setData] = useState<CandidatoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editGraduacao, setEditGraduacao] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/candidato/dados')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setEditGraduacao(d.inscricao?.graduacao_pretendida || 'Shodan (1º Dan)')
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveGraduacao = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/candidato/inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graduacao_pretendida: editGraduacao }),
      })
      const result = await res.json()
      if (result.inscricao) {
        setData(prev => prev ? { ...prev, inscricao: result.inscricao } : prev)
        setShowEditModal(false)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-red-400">{error || 'Erro desconhecido'}</p>
      </div>
    )
  }

  const { stakeholder, inscricao } = data
  const firstName = stakeholder.nome_completo?.split(' ')[0] || 'Candidato'
  const statusInfo = getStatusInfo(inscricao)
  const StatusIcon = statusInfo.icon

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-4xl font-black text-red-600 tracking-tight">
          Bem-vindo, {firstName}.
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Programa de Formação de Faixas Pretas — Liga Riograndense de Judô
        </p>
      </div>

      {/* Dados do Candidato */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Dados do Candidato</h2>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg"
          >
            <Edit2 className="w-3 h-3" />
            Preencher Cadastro
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Nome Completo</p>
            <p className="text-white text-sm font-medium">{stakeholder.nome_completo || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Nascimento</p>
            <p className="text-white text-sm">{formatDate(stakeholder.data_nascimento)}</p>
          </div>
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Graduação Atual</p>
            <p className="text-white text-sm">{stakeholder.kyu_dan?.kyu_dan || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Última Promoção</p>
            <p className="text-white text-sm">{formatDate(stakeholder.data_ultima_graduacao)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800">
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Email</p>
            <p className="text-white text-sm truncate">{stakeholder.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Telefone</p>
            <p className="text-white text-sm">{stakeholder.telefone || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-1">Início no Programa</p>
            <p className="text-white text-sm">{formatDate(inscricao?.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Objetivo */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3">Objetivo</p>
          <p className="text-white font-bold text-lg">{inscricao?.graduacao_pretendida || 'Shodan (1º Dan)'}</p>
          <p className="text-slate-500 text-xs mt-1">Graduação Pretendida</p>
        </div>

        {/* Coordenação */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3">Coordenação</p>
          <p className="text-white font-semibold text-sm">Luiz Pavani</p>
          <p className="text-white font-semibold text-sm">Bruno Chalar</p>
          <p className="text-slate-500 text-xs mt-1">Liga Riograndense de Judô</p>
        </div>

        {/* Status */}
        <div className={`${statusInfo.bg} border ${statusInfo.border} rounded-xl p-5`}>
          <p className="text-xs font-black tracking-widest text-slate-500 uppercase mb-3">Status</p>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            <p className={`font-black text-sm ${statusInfo.color}`}>{statusInfo.label}</p>
          </div>
          {inscricao && (
            <p className="text-slate-500 text-xs mt-2">
              Pagamento: {inscricao.status_pagamento}
            </p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-lg">Preencher Cadastro</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black tracking-widest text-slate-400 uppercase block mb-2">
                  Graduação Pretendida
                </label>
                <div className="relative">
                  <select
                    value={editGraduacao}
                    onChange={e => setEditGraduacao(e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-red-600"
                  >
                    {GRADUACOES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGraduacao}
                disabled={saving}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white font-bold transition-colors text-sm flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
