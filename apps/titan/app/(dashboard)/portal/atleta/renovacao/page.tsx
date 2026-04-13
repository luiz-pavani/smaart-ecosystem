'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, AlertCircle, CreditCard, Award,
  Check, ChevronDown, Copy, Upload, X, FileImage, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CheckoutModal from '@/components/checkout/CheckoutModal'

interface KyuDan {
  id: number
  cor_faixa: string
  kyu_dan: string
}

interface AtletaInfo {
  nome_completo: string | null
  email: string | null
  telefone: string | null
  academias: string | null
  status_plano: string | null
  data_expiracao: string | null
  kyu_dan_id: number | null
  data_nascimento: string | null
}

// LRSJ Regimento de Custas 2026
function calcularValor(kyuDanId: number | null, projetoSocial: boolean): number | null {
  if (!kyuDanId) return null
  if (kyuDanId <= 12) return projetoSocial ? 95 : 105
  if (kyuDanId === 13) return 140
  if (kyuDanId <= 15) return 120
  if (kyuDanId <= 17) return 100
  return 80
}

function descricaoValor(kyuDanId: number | null, projetoSocial: boolean): string {
  if (!kyuDanId) return '—'
  if (kyuDanId <= 12) return projetoSocial ? 'Projeto social (até SUB-18)' : 'Atleta — faixa branca a marrom'
  if (kyuDanId === 13) return 'Professor — faixa preta (sho-dan)'
  if (kyuDanId <= 15) return 'Professor — faixa preta (ni-dan / san-dan)'
  if (kyuDanId <= 17) return 'Professor — faixa preta (yon-dan / go-dan)'
  return 'Professor — kōdansha'
}

const PIX_KEY = 'secretaria@lrsj.com.br'

export default function RenovacaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [atleta, setAtleta] = useState<AtletaInfo | null>(null)
  const [kyuDans, setKyuDans] = useState<KyuDan[]>([])
  const [selectedKyuDan, setSelectedKyuDan] = useState<string>('')
  const [projetoSocial, setProjetoSocial] = useState(false)
  const [cpf, setCpf] = useState('')

  // Manual Pix (fallback)
  const [comprovante, setComprovante] = useState<File | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showManualPix, setShowManualPix] = useState(false)

  // Checkout modal
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [pedidoId, setPedidoId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/atletas/self/perfil-dados')
        const json = await res.json()
        if (json.stakeholder) {
          setAtleta({
            nome_completo: json.stakeholder.nome_completo,
            email: json.stakeholder.email,
            telefone: json.stakeholder.telefone,
            academias: json.fedLrsj?.academias || null,
            status_plano: json.fedLrsj?.status_plano || null,
            data_expiracao: json.fedLrsj?.data_expiracao || null,
            kyu_dan_id: json.fedLrsj?.kyu_dan_id || json.stakeholder?.kyu_dan_id || null,
            data_nascimento: json.stakeholder?.data_nascimento || null,
          })
          setSelectedKyuDan(
            json.fedLrsj?.kyu_dan_id
              ? String(json.fedLrsj.kyu_dan_id)
              : json.stakeholder?.kyu_dan_id
              ? String(json.stakeholder.kyu_dan_id)
              : ''
          )
        }
        setKyuDans((json.kyuDans || []) as KyuDan[])
      } catch {
        setError('Não foi possível carregar seus dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kyuDanId = selectedKyuDan ? Number(selectedKyuDan) : null
  const valor = calcularValor(kyuDanId, projetoSocial)
  const currentKd = kyuDans.find(k => k.id === atleta?.kyu_dan_id)

  // ── Criar pedido no banco (necessário antes do checkout online) ─────────────
  const criarPedido = async (): Promise<string | null> => {
    const res = await fetch('/api/atletas/self/solicitar-renovacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kyu_dan_id: kyuDanId,
        projeto_social: projetoSocial,
        valor,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar pedido')
    return json.id || null
  }

  const handleAbrirCheckout = async () => {
    try {
      const id = await criarPedido()
      setPedidoId(id)
      setCheckoutOpen(true)
    } catch (err: any) {
      alert(err.message)
    }
  }

  // ── Manual Pix flow ─────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setComprovante(file)
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', 'comprovante_renovacao')
      const r = await fetch('/api/atletas/self/upload-doc', { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Erro ao enviar arquivo')
      setComprovanteUrl(j.url)
    } catch (err: any) {
      alert(err.message)
      setComprovante(null)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRenovarManual = async () => {
    if (!comprovanteUrl) { alert('Anexe o comprovante de pagamento antes de solicitar.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/atletas/self/solicitar-renovacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyu_dan_id: kyuDanId,
          projeto_social: projetoSocial,
          url_comprovante_pagamento: comprovanteUrl,
          valor,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao registrar solicitação')

      const kd = kyuDans.find(k => k.id === Number(selectedKyuDan))
      const msg = encodeURIComponent(
        `Olá! Solicito renovação de filiação na Liga Riograndense de Judô.\n` +
        `Nome: ${atleta?.nome_completo || ''}\n` +
        `Academia: ${atleta?.academias || ''}\n` +
        `Graduação: ${kd ? `${kd.cor_faixa} — ${kd.kyu_dan}` : ''}\n` +
        `Valor pago: R$${valor}\n` +
        `Comprovante: ${comprovanteUrl}`
      )
      window.open(`https://wa.me/5555984085000?text=${msg}`, '_blank')
      setSubmitted(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCpf = (v: string) =>
    v.replace(/\D/g, '')
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .slice(0, 14)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          <button
            onClick={() => router.push('/portal/atleta/perfil')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Renovar Filiação</h1>
          <p className="text-gray-400 mt-1">Renove sua anuidade na Liga Riograndense de Judô</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
          </div>
        ) : submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Solicitação enviada!</h2>
            <p className="text-gray-400 mb-6">Em breve nossa equipe confirmará a renovação.</p>
            <button
              onClick={() => router.push('/portal/atleta/perfil')}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-all text-sm font-medium"
            >
              Voltar ao perfil
            </button>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Resumo atual */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Sua filiação atual</h2>
              <div className="space-y-2">
                {[
                  ['Atleta', atleta?.nome_completo],
                  ['Academia', atleta?.academias],
                  ['Graduação atual', currentKd ? `${currentKd.cor_faixa} — ${currentKd.kyu_dan}` : '—'],
                  ['Validade atual', atleta?.data_expiracao || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-gray-200 text-sm font-medium">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graduação */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-blue-400" />
                <h2 className="font-semibold text-white">Confirmar graduação</h2>
              </div>
              <p className="text-gray-400 text-xs mb-3">Se sua graduação mudou desde a última filiação, atualize aqui.</p>
              <div className="relative mb-4">
                <select
                  value={selectedKyuDan}
                  onChange={e => setSelectedKyuDan(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors pr-8"
                >
                  <option value="">Selecione sua faixa</option>
                  {kyuDans.map(k => (
                    <option key={k.id} value={k.id}>{k.cor_faixa} — {k.kyu_dan}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {kyuDanId && kyuDanId <= 12 && (
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setProjetoSocial(p => !p)}
                    className={`w-10 h-5 rounded-full transition-colors ${projetoSocial ? 'bg-blue-600' : 'bg-white/20'} relative`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${projetoSocial ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-300">Projeto social (até classe SUB-18)</span>
                </label>
              )}
            </div>

            {/* Valor calculado */}
            {kyuDanId && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-green-400" />
                  <h2 className="font-semibold text-white">Valor da anuidade</h2>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-sm">{descricaoValor(kyuDanId, projetoSocial)}</span>
                  <span className="text-3xl font-black text-white">R${valor}</span>
                </div>
                <p className="text-gray-500 text-xs">Válido por 12 meses · inclui identidade esportiva digital, certificado de graduação e patch oficial</p>
              </div>
            )}

            {/* CPF (necessário para pagamento online) */}
            {kyuDanId && valor && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <h2 className="font-semibold text-white mb-1">CPF</h2>
                <p className="text-gray-400 text-xs mb-3">Necessário para emissão do recibo de pagamento.</p>
                <input
                  value={cpf}
                  onChange={e => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            )}

            {/* CTA Principal — Pagar Online */}
            {kyuDanId && valor && (
              <button
                onClick={handleAbrirCheckout}
                disabled={!cpf || cpf.length < 14}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-base"
              >
                <Zap className="w-5 h-5" />
                Pagar online — R${valor}
              </button>
            )}
            {kyuDanId && valor && (!cpf || cpf.length < 14) && (
              <p className="text-center text-xs text-amber-400/80">Digite seu CPF para continuar com o pagamento online.</p>
            )}

            {/* Separador — Pix manual */}
            {kyuDanId && valor && (
              <div className="text-center">
                <button
                  onClick={() => setShowManualPix(p => !p)}
                  className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
                >
                  {showManualPix ? 'Ocultar Pix manual' : 'Prefere pagar Pix manualmente? Clique aqui'}
                </button>
              </div>
            )}

            {/* PIX manual */}
            {showManualPix && kyuDanId && valor && (
              <>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                  <h2 className="font-semibold text-white mb-1">Pagamento via Pix manual</h2>
                  <p className="text-gray-400 text-xs mb-4">Transfira <strong className="text-white">R${valor}</strong> para a chave abaixo e anexe o comprovante.</p>
                  <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Chave Pix (e-mail)</p>
                      <p className="text-white font-mono text-sm font-semibold">{PIX_KEY}</p>
                    </div>
                    <button
                      onClick={handleCopyPix}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-gray-500 text-[10px]">Depósito bancário também aceito: Conta 06.852539.0-6 / Agência 0924 – Banrisul</p>
                </div>

                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                  <h2 className="font-semibold text-white mb-1">Comprovante de pagamento</h2>
                  <p className="text-gray-400 text-xs mb-4">Anexe o comprovante do Pix ou depósito bancário.</p>
                  {comprovante ? (
                    <div className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-lg px-4 py-3">
                      <FileImage className="w-5 h-5 text-blue-400 shrink-0" />
                      <span className="text-sm text-gray-200 flex-1 truncate">{comprovante.name}</span>
                      {uploadingFile ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : comprovanteUrl ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : null}
                      <button onClick={() => { setComprovante(null); setComprovanteUrl(null) }} className="text-gray-500 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/15 hover:border-white/30 rounded-xl py-8 flex flex-col items-center gap-2 transition-all text-gray-400 hover:text-gray-200"
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">Clique para anexar o comprovante</span>
                      <span className="text-xs">JPG, PNG ou PDF</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <button
                  onClick={handleRenovarManual}
                  disabled={submitting || !selectedKyuDan || !comprovanteUrl || uploadingFile}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-base"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  {submitting ? 'Enviando...' : 'Enviar comprovante e solicitar'}
                </button>
                {!comprovanteUrl && (
                  <p className="text-center text-xs text-amber-400/80">Anexe o comprovante para continuar.</p>
                )}
              </>
            )}

            <p className="text-center text-xs text-gray-500">
              Após o pagamento, sua filiação é confirmada automaticamente. Em caso de dúvidas, entre em contato via WhatsApp.
            </p>

          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && kyuDanId && valor && atleta && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          produto={{
            produto: 'filiacao_atleta',
            referencia_id: pedidoId || undefined,
            valor,
            descricao: 'Anuidade LRSJ 2026',
            subtitulo: descricaoValor(kyuDanId, projetoSocial),
          }}
          customer={{
            name: atleta.nome_completo || '',
            identity: cpf.replace(/\D/g, ''),
            email: atleta.email || '',
            phone: atleta.telefone || '',
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
