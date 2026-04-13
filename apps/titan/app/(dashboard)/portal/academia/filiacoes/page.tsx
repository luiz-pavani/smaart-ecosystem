'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, Check, X, Upload, FileImage,
  CheckSquare, Square, Copy, AlertTriangle, Clock,
  ShieldCheck, ShieldX, ShieldAlert, Users, Zap,
} from 'lucide-react'
import CheckoutModal from '@/components/checkout/CheckoutModal'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId, saveSelectedAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { Building2 } from 'lucide-react'

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string }

interface AtletaItem {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  kyu_dan_id: number | null
  kyu_dan: KyuDan | null
  data_nascimento: string | null
  situacao: 'sem_filiacao' | 'valido' | 'vencido' | 'vencendo' | 'pendente'
  data_expiracao: string | null
}

interface SelectedAtleta {
  id: string
  kyu_dan_id: number | null
  projeto_social: boolean
  valor: number | null
}

// Pricing (Regimento LRSJ 2026)
function calcValor(kyuDanId: number | null, projetoSocial: boolean): number | null {
  if (!kyuDanId) return null
  if (kyuDanId <= 12) return projetoSocial ? 95 : 105
  if (kyuDanId === 13) return 140
  if (kyuDanId <= 15) return 120
  if (kyuDanId <= 17) return 100
  return 80
}

const SITUACAO_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  sem_filiacao: { label: 'Sem filiação', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: ShieldX },
  valido:        { label: 'Válido', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: ShieldCheck },
  vencendo:      { label: 'Vencendo em breve', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: ShieldAlert },
  vencido:       { label: 'Vencido', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: ShieldX },
  pendente:      { label: 'Aguardando aprovação', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Clock },
}

const PIX_KEY = 'secretaria@lrsj.com.br'

const DEFAULT_TABS = ['Pendentes', 'Vencidos/Vencendo', 'Todos'] as const
type TabKey = typeof DEFAULT_TABS[number]

export default function BulkFiliacoesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [atletas, setAtletas] = useState<AtletaItem[]>([])
  const [tab, setTab] = useState<TabKey>('Pendentes')
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<Record<string, SelectedAtleta>>({})
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Checkout online
  const [cpfProfessor, setCpfProfessor] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPedidoIds, setCheckoutPedidoIds] = useState<string[]>([])
  const [showManualPix, setShowManualPix] = useState(false)
  const [professorInfo, setProfessorInfo] = useState<{ nome: string; email: string; telefone: string } | null>(null)
  const [academias, setAcademias] = useState<{ id: string; nome: string }[]>([])
  const [selectedAcademiaId, setSelectedAcademiaId] = useState<string | null>(null)

  const loadAtletas = async (academiaId: string) => {
    setLoading(true)
    const params = `?academia_id=${academiaId}`
    const [bulkData, perfilData] = await Promise.all([
      fetch(`/api/academia/bulk-filiacao${params}`).then(r => r.json()),
      fetch('/api/atletas/self/perfil-dados').then(r => r.json()),
    ])
    const atletasList: AtletaItem[] = bulkData.atletas || []
    setAtletas(atletasList)
    if (perfilData.stakeholder) {
      setProfessorInfo({
        nome: perfilData.stakeholder.nome_completo || '',
        email: perfilData.stakeholder.email || '',
        telefone: perfilData.stakeholder.telefone || '',
      })
    }
    const renovarId = searchParams.get('renovar')
    if (renovarId) {
      const a = atletasList.find(x => x.id === renovarId)
      if (a && a.situacao !== 'pendente') {
        setSelected({ [a.id]: { id: a.id, kyu_dan_id: a.kyu_dan_id, projeto_social: false, valor: calcValor(a.kyu_dan_id, false) } })
        setTab('Todos')
      }
    }
    setLoading(false)
  }

  const handleAcademiaChange = (id: string) => {
    setSelectedAcademiaId(id)
    saveSelectedAcademiaId(id)
    loadAtletas(id)
  }

  useEffect(() => {
    const supabase = createClient()
    resolveAcademiaId(supabase).then(async academiaId => {
      if (academiaId) {
        setSelectedAcademiaId(academiaId)
        await loadAtletas(academiaId)
      } else {
        // master_access sem sessão: buscar lista de academias
        const res = await fetch('/api/academia/list')
        const json = await res.json()
        if (json.academias?.length) {
          setAcademias(json.academias)
          const firstId = json.academias[0].id
          setSelectedAcademiaId(firstId)
          saveSelectedAcademiaId(firstId)
          await loadAtletas(firstId)
        } else {
          setLoading(false)
        }
      }
    })
  }, [])

  const formatCpf = (v: string) =>
    v.replace(/\D/g, '')
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .slice(0, 14)

  const filteredAtletas = atletas.filter(a => {
    const matchSearch = !search || a.nome_completo.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (tab === 'Pendentes') return a.situacao === 'sem_filiacao' || a.situacao === 'vencido' || a.situacao === 'vencendo'
    if (tab === 'Vencidos/Vencendo') return a.situacao === 'vencido' || a.situacao === 'vencendo'
    return true
  })

  const toggleSelect = (a: AtletaItem) => {
    if (a.situacao === 'pendente') return
    setSelected(prev => {
      if (prev[a.id]) {
        const next = { ...prev }
        delete next[a.id]
        return next
      }
      const val = calcValor(a.kyu_dan_id, false)
      return { ...prev, [a.id]: { id: a.id, kyu_dan_id: a.kyu_dan_id, projeto_social: false, valor: val } }
    })
  }

  const selectAll = () => {
    const eligible = filteredAtletas.filter(a => a.situacao !== 'pendente' && a.situacao !== 'valido')
    const newSel = { ...selected }
    for (const a of eligible) {
      if (!newSel[a.id]) newSel[a.id] = { id: a.id, kyu_dan_id: a.kyu_dan_id, projeto_social: false, valor: calcValor(a.kyu_dan_id, false) }
    }
    setSelected(newSel)
  }

  const clearAll = () => setSelected({})

  const updateProjetoSocial = (id: string, val: boolean) => {
    setSelected(prev => {
      const a = atletas.find(x => x.id === id)
      const kyd = prev[id]?.kyu_dan_id ?? null
      return { ...prev, [id]: { ...prev[id], projeto_social: val, valor: calcValor(kyd, val) } }
    })
  }

  const totalSelecionados = Object.keys(selected).length
  const totalValor = Object.values(selected).reduce((s, a) => s + (a.valor || 0), 0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setComprovanteFile(file)
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', 'comprovante_bulk')
      const r = await fetch('/api/atletas/self/upload-doc', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      setComprovanteUrl(j.url)
    } catch (err: any) {
      alert(err.message)
      setComprovanteFile(null)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const criarPedidosBulk = async (comprovantePayload?: string) => {
    const atletasPayload = Object.values(selected)
    const tipo = atletasPayload.every(a => {
      const at = atletas.find(x => x.id === a.id)
      return at?.situacao === 'sem_filiacao'
    }) ? 'FILIACAO' : 'RENOVACAO'

    const res = await fetch('/api/academia/bulk-filiacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atletas: atletasPayload,
        url_comprovante_pagamento: comprovantePayload || null,
        tipo,
        academia_id: selectedAcademiaId,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    return json.ids as string[]
  }

  const handlePagarOnline = async () => {
    if (!totalSelecionados) { alert('Selecione pelo menos um atleta.'); return }
    try {
      const ids = await criarPedidosBulk()
      setCheckoutPedidoIds(ids)
      setCheckoutOpen(true)
    } catch (err: any) {
      setSubmitError(err.message)
    }
  }

  const handleSubmit = async () => {
    if (!comprovanteUrl) { alert('Anexe o comprovante de pagamento.'); return }
    if (!totalSelecionados) { alert('Selecione pelo menos um atleta.'); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      await criarPedidosBulk(comprovanteUrl)
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Solicitações enviadas!</h2>
          <p className="text-gray-400">{totalSelecionados} atleta{totalSelecionados !== 1 ? 's' : ''} submetido{totalSelecionados !== 1 ? 's' : ''} para análise da federação.</p>
          <button
            onClick={() => router.push('/portal/academia')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-all"
          >
            Voltar ao portal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Filiação em Grupo</h1>
          <p className="text-gray-400 mt-1">Filiar ou renovar múltiplos atletas de uma vez</p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>

      {/* Seletor de academia (master_access) */}
      {academias.length > 1 && (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAcademiaId ?? ''}
            onChange={e => handleAcademiaChange(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
          >
            {academias.map(a => (
              <option key={a.id} value={a.id} className="bg-slate-900">{a.nome}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Lista de atletas ── */}
        <div className="flex-1 space-y-4">
          {/* Tabs + search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
              {DEFAULT_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-all"
            >
              <CheckSquare className="w-4 h-4" /> Selecionar elegíveis
            </button>
            {totalSelecionados > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 transition-all"
              >
                <X className="w-4 h-4" /> Limpar ({totalSelecionados})
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : filteredAtletas.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum atleta encontrado para este filtro.</p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Atleta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Graduação</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Situação</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAtletas.map(a => {
                    const isSelected = !!selected[a.id]
                    const isPendente = a.situacao === 'pendente'
                    const isValido = a.situacao === 'valido'
                    const sit = SITUACAO_LABEL[a.situacao]
                    const SitIcon = sit.icon
                    const sel = selected[a.id]
                    const kyd = sel?.kyu_dan_id ?? a.kyu_dan_id

                    return (
                      <tr
                        key={a.id}
                        onClick={() => !isPendente && toggleSelect(a)}
                        className={`transition-colors ${isPendente || isValido ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'} ${isSelected ? 'bg-blue-500/10' : ''}`}
                      >
                        <td className="px-4 py-3 text-center">
                          {isPendente || isValido ? (
                            <Square className="w-4 h-4 text-gray-600 mx-auto" />
                          ) : isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400 mx-auto" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium">{a.nome_completo}</p>
                          <p className="text-gray-500 text-xs">{a.email}</p>
                          {isSelected && (kyd ?? 0) <= 12 && (
                            <label className="flex items-center gap-1.5 mt-1 cursor-pointer" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={sel?.projeto_social ?? false}
                                onChange={e => updateProjetoSocial(a.id, e.target.checked)}
                                className="w-3 h-3"
                              />
                              <span className="text-xs text-gray-400">Projeto social (SUB-18)</span>
                            </label>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-300">
                            {a.kyu_dan ? `${a.kyu_dan.cor_faixa} — ${a.kyu_dan.kyu_dan}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${sit.color}`}>
                            <SitIcon className="w-3 h-3" />
                            {sit.label}
                          </span>
                          {a.data_expiracao && (
                            <p className="text-gray-600 text-xs mt-0.5">
                              {a.situacao === 'vencido' ? 'Venceu' : 'Vence'} {new Date(a.data_expiracao).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          {isSelected && sel?.valor ? (
                            <span className="text-white font-bold text-sm">R${sel.valor}</span>
                          ) : (
                            <span className="text-gray-600 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Painel lateral ── */}
        <div className="lg:w-80 space-y-5 shrink-0">

          {/* Resumo */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <h2 className="text-white font-semibold">Resumo do lote</h2>
            {totalSelecionados === 0 ? (
              <p className="text-gray-500 text-sm">Selecione atletas na lista.</p>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Atletas selecionados</span>
                  <span className="text-white font-bold">{totalSelecionados}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                  <span className="text-gray-400">Total a pagar</span>
                  <span className="text-white font-black text-lg">R${totalValor}</span>
                </div>
                <p className="text-gray-600 text-xs">Valores conforme Regimento de Custas LRSJ 2026</p>
              </>
            )}
          </div>

          {/* CPF + Pagar Online */}
          {totalSelecionados > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">Pagar Online</h2>
              <p className="text-gray-400 text-xs">Pix ou cartão — aprovação automática.</p>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Seu CPF</label>
                <input
                  value={cpfProfessor}
                  onChange={e => setCpfProfessor(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={handlePagarOnline}
                disabled={cpfProfessor.length < 14}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm"
              >
                <Zap className="w-4 h-4" />
                Pagar R${totalValor} online
              </button>
              {cpfProfessor.length < 14 && (
                <p className="text-[10px] text-amber-400/80 text-center">Digite seu CPF para continuar.</p>
              )}
            </div>
          )}

          {/* Separador Pix manual */}
          {totalSelecionados > 0 && (
            <div className="text-center">
              <button
                onClick={() => setShowManualPix(p => !p)}
                className="text-[11px] text-gray-600 hover:text-gray-400 underline underline-offset-2 transition-colors"
              >
                {showManualPix ? 'Ocultar Pix manual' : 'Prefere Pix manual?'}
              </button>
            </div>
          )}

          {/* PIX manual */}
          {showManualPix && totalSelecionados > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">Pagamento via Pix manual</h2>
              <p className="text-gray-400 text-xs">Transfira <strong className="text-white">R${totalValor}</strong> para a chave abaixo.</p>
              <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Chave Pix (e-mail)</p>
                  <p className="text-white font-mono text-xs font-semibold">{PIX_KEY}</p>
                </div>
                <button
                  onClick={handleCopyPix}
                  className="flex items-center gap-1 px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white transition-all"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Ok!' : 'Copiar'}
                </button>
              </div>
              <p className="text-gray-600 text-[10px]">Ou depósito: Conta 06.852539.0-6 / Ag. 0924 – Banrisul</p>
            </div>
          )}

          {/* Comprovante manual */}
          {showManualPix && totalSelecionados > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-semibold">Comprovante</h2>
              <p className="text-gray-400 text-xs">Um comprovante para todo o lote.</p>
              {comprovanteFile ? (
                <div className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-lg px-3 py-2">
                  <FileImage className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs text-gray-200 flex-1 truncate">{comprovanteFile.name}</span>
                  {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> : comprovanteUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : null}
                  <button onClick={() => { setComprovanteFile(null); setComprovanteUrl(null) }}><X className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" /></button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl py-6 flex flex-col items-center gap-1.5 transition-all text-gray-400 hover:text-gray-200"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-medium">Anexar comprovante</span>
                  <span className="text-[10px]">JPG, PNG ou PDF</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />

              {submitError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-xs">{submitError}</p>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !comprovanteUrl || uploadingFile}
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {submitting ? 'Enviando...' : `Enviar ${totalSelecionados} solicitaç${totalSelecionados !== 1 ? 'ões' : 'ão'}`}
              </button>
              {!comprovanteUrl && (
                <p className="text-center text-[10px] text-amber-400/80">Anexe o comprovante para enviar.</p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && professorInfo && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          produto={{
            produto: 'filiacao_bulk',
            referencia_ids: checkoutPedidoIds,
            valor: totalValor,
            descricao: 'Anuidade LRSJ 2026 — Lote',
            subtitulo: `${totalSelecionados} atleta${totalSelecionados !== 1 ? 's' : ''}`,
          }}
          customer={{
            name: professorInfo.nome,
            identity: cpfProfessor.replace(/\D/g, ''),
            email: professorInfo.email,
            phone: professorInfo.telefone,
          }}
          onSuccess={() => {
            setCheckoutOpen(false)
            setSubmitted(true)
          }}
        />
      )}
    </div>
  )
}
