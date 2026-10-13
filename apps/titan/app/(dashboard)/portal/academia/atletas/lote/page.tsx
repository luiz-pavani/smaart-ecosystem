'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import * as XLSX from 'xlsx'
import {
  AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2, CreditCard, Download, FileSpreadsheet,
  Keyboard, Loader2, Plus, ShieldCheck, Trash2, Upload, Users, XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import { isMenorDeIdade } from '@/lib/registro/atleta'
import {
  COLUNAS_MODELO, LINHA_VAZIA, MAX_LINHAS_LOTE, linhasDaPlanilha, montarLinha, validarLinha,
  type GraduacaoOpcao, type LinhaLote,
} from '@/lib/registro/lote'
import CheckoutModal, { type CheckoutCustomer } from '@/components/checkout/CheckoutModal'
import { Secao, inputCls } from '../novo/ui'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Etapa = 'entrada' | 'revisao' | 'criando' | 'documentos' | 'pagamento' | 'fim'
type Origem = 'planilha' | 'foto' | 'manual'

interface Taxa { valor: number; descricao: string }
interface LinhaServidor {
  ficha_id: string
  stakeholder_id: string
  nome: string
  menor: boolean
  genero: string | null
  contato: string | null
  canal: 'email' | 'whatsapp' | null
  ativacao_enviada: boolean
  graduacao: string | null
  verificacao_status: 'aprovado' | 'divergente' | 'revisao_manual' | null
  verificacao_motivo: string | null
  federacao_id: string | null
  taxa: Taxa | null
  taxa_projeto_social: Taxa | null
  pedido: { id: string; status: string; pago: boolean; valor: number | null } | null
}
interface ResultadoCriacao { idx: number; nome: string; ok: boolean; msg: string }
interface Patch { incluir: boolean; nome_patch: string; tamanho_patch: string; cor_patch: string; projeto_social: boolean; enviar_para_revisao: boolean; genero: string }

const ETAPAS: { id: Etapa; titulo: string }[] = [
  { id: 'entrada', titulo: 'Planilha' },
  { id: 'revisao', titulo: 'Revisão' },
  { id: 'criando', titulo: 'Criação' },
  { id: 'documentos', titulo: 'Documentos' },
  { id: 'pagamento', titulo: 'Pagamento' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const cell = 'bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500'

async function reduzirImagem(file: File, lado = 2400): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.9))
  } catch {
    return file
  }
}

function sugestaoNomePatch(nome: string) {
  const p = nome.trim().toUpperCase().split(/\s+/)
  return (p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] ?? '').slice(0, 24)
}

function StatusDoc({ s, motivo }: { s: LinhaServidor['verificacao_status']; motivo: string | null }) {
  if (!s) return <span className="text-xs text-slate-500">sem documento</span>
  const cfg = {
    aprovado: ['text-green-300', <ShieldCheck key="i" className="w-4 h-4" />, 'Verificado'],
    divergente: ['text-red-300', <XCircle key="i" className="w-4 h-4" />, 'Não confere'],
    revisao_manual: ['text-amber-300', <AlertTriangle key="i" className="w-4 h-4" />, 'Revisão'],
  }[s] as [string, React.ReactNode, string]
  return <span title={motivo ?? ''} className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg[0]}`}>{cfg[1]}{cfg[2]}</span>
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function RegistroLotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <RegistroLote />
    </Suspense>
  )
}

function RegistroLote() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [graduacoes, setGraduacoes] = useState<GraduacaoOpcao[]>([])
  const [lotesAnteriores, setLotesAnteriores] = useState<{ id: string; origem: string; total_linhas: number; created_at: string }[]>([])
  const [etapa, setEtapa] = useState<Etapa>('entrada')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const [origem, setOrigem] = useState<Origem>('planilha')
  const [linhas, setLinhas] = useState<LinhaLote[]>([])
  const [avisosLeitura, setAvisosLeitura] = useState<string[]>([])
  const [loteId, setLoteId] = useState<string | null>(searchParams.get('lote'))
  const [criacao, setCriacao] = useState<ResultadoCriacao[]>([])

  const [servidor, setServidor] = useState<LinhaServidor[]>([])
  const [docsLote, setDocsLote] = useState<{ arquivo: string; msg: string; ok: boolean }[]>([])
  const [patches, setPatches] = useState<Record<string, Patch>>({})
  const [cobranca, setCobranca] = useState<{ pedido_ids: string[]; total: number; falhas: { nome: string; error: string }[] } | null>(null)
  const [pagador, setPagador] = useState<CheckoutCustomer>({ name: '', identity: '', email: '', phone: '' })
  const [checkoutAberto, setCheckoutAberto] = useState(false)

  const planilhaRef = useRef<HTMLInputElement>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const docsRef = useRef<HTMLInputElement>(null)
  const docLinhaRef = useRef<HTMLInputElement>(null)
  const docLinhaAlvo = useRef<string | null>(null)

  // ── Carga inicial ──
  useEffect(() => {
    (async () => {
      const id = await resolveAcademiaId(supabase)
      setAcademiaId(id)
      const q = id ? `?academia_id=${id}` : ''
      const [opc, lotes] = await Promise.all([
        fetch(`/api/academia/registro-atleta${q}`).then((r) => r.json()),
        fetch(`/api/academia/registro-atleta/lote${q}`).then((r) => r.json()),
      ])
      setGraduacoes((opc.graduacoes ?? []).filter((g: GraduacaoOpcao) => g.id !== 24))
      setLotesAnteriores(lotes.lotes ?? [])
      if (loteId) await carregarLote(loteId, 'documentos')
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const carregarLote = useCallback(async (id: string, ir?: Etapa) => {
    const res = await fetch(`/api/academia/registro-atleta/lote/${id}`)
    const json = await res.json()
    if (!res.ok) { setErro(json.error || 'Lote não encontrado'); return }
    setServidor(json.linhas)
    setPatches((atual) => {
      const novo = { ...atual }
      for (const l of json.linhas as LinhaServidor[]) {
        if (!novo[l.ficha_id]) {
          novo[l.ficha_id] = {
            incluir: !!l.federacao_id && !l.pedido?.pago && l.pedido?.status !== 'APROVADO',
            nome_patch: sugestaoNomePatch(l.nome),
            tamanho_patch: l.menor ? 'M' : 'G',
            cor_patch: l.genero === 'Feminino' ? 'ROSA' : 'AZUL',
            projeto_social: false,
            enviar_para_revisao: false,
            genero: l.genero ?? '',
          }
        }
      }
      return novo
    })
    if (ir) setEtapa(ir)
  }, [])

  // ── Entrada ──
  const lerPlanilha = async (file: File | undefined) => {
    if (!file) return
    setErro(null)
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const registros = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true })
      const novas = linhasDaPlanilha(registros, graduacoes)
      if (!novas.length) throw new Error('Nenhum atleta encontrado. Confira se a primeira linha tem os títulos das colunas (baixe o modelo).')
      if (novas.length > MAX_LINHAS_LOTE) throw new Error(`Máximo de ${MAX_LINHAS_LOTE} atletas por lote.`)
      setOrigem('planilha')
      setLinhas(novas)
      setAvisosLeitura([])
      setEtapa('revisao')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha')
    } finally {
      if (planilhaRef.current) planilhaRef.current.value = ''
    }
  }

  const lerFotos = async (files: FileList | null) => {
    if (!files?.length) return
    setErro(null)
    const novas: LinhaLote[] = []
    const avisos: string[] = []
    try {
      for (const [i, f] of Array.from(files).entries()) {
        setOcupado(`Lendo foto ${i + 1} de ${files.length}…`)
        const corpo = new FormData()
        corpo.append('file', f.type === 'application/pdf' ? f : await reduzirImagem(f), f.name)
        const res = await fetch('/api/academia/registro-atleta/lote/extrair', { method: 'POST', body: corpo })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) { avisos.push(`${f.name}: ${json.error || 'falha na leitura'}`); continue }
        for (const l of json.linhas as Record<string, unknown>[]) {
          novas.push(montarLinha(l, graduacoes))
          const duvidas = (l.duvidas as string[] | undefined) ?? []
          if (duvidas.length) avisos.push(`${l.nome_completo}: ${duvidas.join('; ')}`)
        }
      }
      if (!novas.length) throw new Error(avisos[0] ?? 'Nenhum atleta encontrado nas fotos.')
      setOrigem('foto')
      setLinhas(novas.slice(0, MAX_LINHAS_LOTE))
      setAvisosLeitura(avisos)
      setEtapa('revisao')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha na leitura')
    } finally {
      setOcupado(null)
      if (fotoRef.current) fotoRef.current.value = ''
    }
  }

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [...COLUNAS_MODELO],
      ['Ana Souza Lima', '10/05/2014', '(51) 98888-7777', '', 'F', '', '1234567890', 'Azul', 'Maria Souza', '123.456.789-09', '(51) 97777-6666', 'maria@email.com', 'sim'],
      ['Carlos Pereira', '22/03/1995', '', 'carlos@email.com', 'M', '987.654.321-00', '', 'Preta 1º dan', '', '', '', '', 'sim'],
    ])
    ws['!cols'] = COLUNAS_MODELO.map((c) => ({ wch: Math.max(14, c.length + 2) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Atletas')
    XLSX.writeFile(wb, 'modelo-registro-atletas.xlsx')
  }

  // ── Revisão ──
  const errosPorLinha = useMemo(() => linhas.map(validarLinha), [linhas])
  const validas = errosPorLinha.filter((e) => !e.length).length
  const setLinha = (i: number, patch: Partial<LinhaLote>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  // ── Criação ──
  const criar = async () => {
    const alvo = linhas.map((l, idx) => ({ l, idx })).filter(({ idx }) => !errosPorLinha[idx].length)
    if (!alvo.length) return
    setErro(null)
    const res = await fetch('/api/academia/registro-atleta/lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origem, total_linhas: alvo.length, academia_id: academiaId }),
    })
    const json = await res.json()
    if (!res.ok) { setErro(json.error || 'Erro ao abrir o lote'); return }
    const id = json.lote_id as string
    setLoteId(id)
    router.replace(`/portal/academia/atletas/lote?lote=${id}`, { scroll: false })
    setEtapa('criando')
    const resultados: ResultadoCriacao[] = []
    for (const { l, idx } of alvo) {
      const r = await fetch(`/api/academia/registro-atleta/lote/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linha: l }),
      })
      const j = await r.json().catch(() => ({}))
      resultados.push({
        idx,
        nome: l.nome_completo,
        ok: r.ok,
        msg: r.ok
          ? [j.ativacao?.enviado ? `acesso enviado por ${l.canal === 'email' ? 'email' : 'WhatsApp'}` : 'criado (ativação não enviada)', ...(j.avisos ?? [])].join(' · ')
          : j.error || 'erro',
      })
      setCriacao([...resultados])
    }
    // Linhas com erro ficam na revisão para correção.
    setLinhas((ls) => ls.filter((_, idx) => errosPorLinha[idx].length || !resultados.find((r) => r.idx === idx && r.ok)))
    await carregarLote(id)
  }

  // ── Documentos ──
  const enviarDocs = async (files: FileList | null, fichaId?: string) => {
    if (!files?.length || !loteId) return
    setErro(null)
    const log: typeof docsLote = []
    for (const [i, f] of Array.from(files).entries()) {
      setOcupado(fichaId ? 'Verificando o documento…' : `Verificando documento ${i + 1} de ${files.length}…`)
      const corpo = new FormData()
      corpo.append('file', f.type === 'application/pdf' ? f : await reduzirImagem(f, 2000), f.name)
      if (fichaId) corpo.append('ficha_id', fichaId)
      const res = await fetch(`/api/academia/registro-atleta/lote/${loteId}/documentos`, { method: 'POST', body: corpo })
      const j = await res.json().catch(() => ({}))
      log.push(res.ok
        ? { arquivo: f.name, ok: j.verificacao_status === 'aprovado', msg: `${j.nome ?? servidor.find((s) => s.ficha_id === j.ficha_id)?.nome ?? ''}: ${j.motivo}` }
        : { arquivo: f.name, ok: false, msg: j.error || 'falha' })
      setDocsLote([...log])
    }
    setOcupado(null)
    if (docsRef.current) docsRef.current.value = ''
    if (docLinhaRef.current) docLinhaRef.current.value = ''
    await carregarLote(loteId)
  }

  // ── Pagamento ──
  const filiaveis = servidor.filter((s) => s.federacao_id && s.pedido?.status !== 'APROVADO' && !s.pedido?.pago)
  const selecionados = filiaveis.filter((s) => patches[s.ficha_id]?.incluir)
  const prontos = selecionados.filter((s) => s.verificacao_status && (s.verificacao_status !== 'divergente' || patches[s.ficha_id]?.enviar_para_revisao))
  const totalPrevisto = prontos.reduce((t, s) => {
    const p = patches[s.ficha_id]
    const taxa = p?.projeto_social && s.taxa_projeto_social ? s.taxa_projeto_social : s.taxa
    return t + (taxa?.valor ?? 0)
  }, 0)
  const setPatch = (id: string, p: Partial<Patch>) => setPatches((ps) => ({ ...ps, [id]: { ...ps[id], ...p } }))

  const gerarCobranca = async () => {
    if (!loteId || !prontos.length) return
    setOcupado('Gerando a cobrança…')
    setErro(null)
    try {
      const res = await fetch(`/api/academia/registro-atleta/lote/${loteId}/cobranca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: prontos.map((s) => ({ ficha_id: s.ficha_id, ...patches[s.ficha_id] })) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erro ao gerar a cobrança')
      const falhas = (j.resultados as { ficha_id: string; ok: boolean; error?: string }[])
        .filter((r) => !r.ok)
        .map((r) => ({ nome: servidor.find((s) => s.ficha_id === r.ficha_id)?.nome ?? '', error: r.error ?? '' }))
      setCobranca({ pedido_ids: j.pedido_ids, total: j.total, falhas })
      setPagador(j.pagador)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar a cobrança')
    } finally {
      setOcupado(null)
    }
  }

  const pagamentoConfirmado = async () => {
    setCheckoutAberto(false)
    setCobranca(null)
    if (loteId) await carregarLote(loteId, 'fim')
  }

  // ── Render ──
  const idxEtapa = ETAPAS.findIndex((e) => e.id === etapa)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <button onClick={() => router.push('/portal/academia/atletas')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-sm">
            <ArrowLeft className="w-4 h-4" /> Meus atletas
          </button>
          <h1 className="text-3xl font-bold text-white">Registro de atletas em bloco</h1>
          <ol className="flex gap-2 overflow-x-auto pt-1">
            {ETAPAS.map((e, i) => {
              const feito = etapa === 'fim' || i < idxEtapa
              return (
                <li key={e.id} className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  e.id === etapa ? 'border-blue-500 bg-blue-500/20 text-white' : feito ? 'border-green-600/40 bg-green-600/10 text-green-300' : 'border-white/10 text-slate-500'}`}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10">{feito ? <Check className="w-3 h-3" /> : i + 1}</span>
                  {e.titulo}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">{erro}</div>}
        {ocupado && <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 text-blue-200 text-sm"><Loader2 className="w-4 h-4 animate-spin" />{ocupado}</div>}

        {/* ── Entrada ── */}
        {etapa === 'entrada' && (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Secao titulo="Planilha" descricao="Excel ou CSV com uma linha por atleta.">
                <input ref={planilhaRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => lerPlanilha(e.target.files?.[0])} />
                <button onClick={() => planilhaRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  <FileSpreadsheet className="w-4 h-4" /> Enviar planilha
                </button>
                <button onClick={baixarModelo} className="w-full flex items-center justify-center gap-2 text-sm text-blue-300 hover:text-blue-200">
                  <Download className="w-4 h-4" /> Baixar modelo
                </button>
              </Secao>
              <Secao titulo="Foto da lista" descricao="Lista escrita à mão ou impressa. Uma foto por página; a IA transcreve.">
                <input ref={fotoRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => lerFotos(e.target.files)} />
                <button onClick={() => fotoRef.current?.click()} disabled={!!ocupado} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                  <Camera className="w-4 h-4" /> Fotografar ou enviar
                </button>
              </Secao>
              <Secao titulo="Digitar" descricao="Preencha a tabela direto na tela.">
                <button onClick={() => { setOrigem('manual'); setLinhas([{ ...LINHA_VAZIA }, { ...LINHA_VAZIA }, { ...LINHA_VAZIA }]); setEtapa('revisao') }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-200 hover:bg-white/5">
                  <Keyboard className="w-4 h-4" /> Começar a digitar
                </button>
              </Secao>
            </div>
            {lotesAnteriores.length > 0 && (
              <Secao titulo="Lotes anteriores" descricao="Retome o envio de documentos ou o pagamento.">
                <ul className="divide-y divide-white/5">
                  {lotesAnteriores.map((l) => (
                    <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-slate-300">{new Date(l.created_at).toLocaleString('pt-BR')} · {l.total_linhas} atletas · {l.origem}</span>
                      <button onClick={() => { setLoteId(l.id); router.replace(`/portal/academia/atletas/lote?lote=${l.id}`, { scroll: false }); carregarLote(l.id, 'documentos') }} className="text-blue-300 hover:text-blue-200">Abrir</button>
                    </li>
                  ))}
                </ul>
              </Secao>
            )}
          </>
        )}

        {/* ── Revisão ── */}
        {etapa === 'revisao' && (
          <>
            {avisosLeitura.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-200 text-sm space-y-1">
                <p className="font-semibold">Confira estes pontos da leitura:</p>
                {avisosLeitura.slice(0, 12).map((a, i) => <p key={i}>• {a}</p>)}
              </div>
            )}
            <Secao titulo={`${linhas.length} atletas`} descricao="Corrija o que estiver em vermelho. Menores de idade precisam de responsável. O contato (WhatsApp ou email) é o login do atleta.">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-2">Nome completo</th><th className="pr-2">Nascimento</th><th className="pr-2">Acesso</th>
                      <th className="pr-2">Gênero</th><th className="pr-2">CPF / RG</th><th className="pr-2">Faixa</th>
                      <th className="pr-2">Responsável (menor)</th><th className="pr-2">Filiar</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l, i) => {
                      const erros = errosPorLinha[i]
                      const menor = isMenorDeIdade(l.data_nascimento)
                      return (
                        <tr key={i} className={`align-top border-t border-white/5 ${erros.length ? 'bg-red-500/5' : ''}`}>
                          <td className="py-2 pr-2">
                            <input className={`${cell} w-48`} value={l.nome_completo} onChange={(e) => setLinha(i, { nome_completo: e.target.value })} />
                            {erros.length > 0 && <p className="text-[11px] text-red-300 mt-1">Falta: {erros.join(', ')}</p>}
                          </td>
                          <td className="py-2 pr-2"><input type="date" className={`${cell} w-36`} value={l.data_nascimento} onChange={(e) => setLinha(i, { data_nascimento: e.target.value })} /></td>
                          <td className="py-2 pr-2">
                            <div className="flex gap-1">
                              <select className={`${cell} w-24`} value={l.canal} onChange={(e) => setLinha(i, { canal: e.target.value as LinhaLote['canal'] })}>
                                <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
                              </select>
                              <input className={`${cell} w-40`} value={l.contato} onChange={(e) => setLinha(i, { contato: e.target.value })} placeholder={l.canal === 'email' ? 'email' : '(51) 9…'} />
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <select className={`${cell} w-24`} value={l.genero} onChange={(e) => setLinha(i, { genero: e.target.value })}>
                              <option value="">—</option><option value="Masculino">Masc.</option><option value="Feminino">Fem.</option>
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex gap-1">
                              <select className={`${cell} w-16`} value={l.documento_tipo} onChange={(e) => setLinha(i, { documento_tipo: e.target.value as LinhaLote['documento_tipo'] })}>
                                <option value="cpf">CPF</option><option value="rg">RG</option>
                              </select>
                              <input className={`${cell} w-32`} value={l.documento} onChange={(e) => setLinha(i, { documento: e.target.value })} />
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <select className={`${cell} w-40`} value={l.kyu_dan_id ?? ''} onChange={(e) => setLinha(i, { kyu_dan_id: e.target.value ? Number(e.target.value) : null })}>
                              <option value="">—</option>
                              {graduacoes.map((g) => <option key={g.id} value={g.id}>{g.cor_faixa} | {g.kyu_dan}</option>)}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            {menor ? (
                              <div className="flex flex-col gap-1">
                                <input className={`${cell} w-40`} placeholder="Nome" value={l.responsavel_nome} onChange={(e) => setLinha(i, { responsavel_nome: e.target.value })} />
                                <input className={`${cell} w-40`} placeholder="Telefone" value={l.responsavel_telefone} onChange={(e) => setLinha(i, { responsavel_telefone: e.target.value })} />
                                <input className={`${cell} w-40`} placeholder="CPF (opcional)" value={l.responsavel_cpf} onChange={(e) => setLinha(i, { responsavel_cpf: e.target.value })} />
                              </div>
                            ) : <span className="text-xs text-slate-500">adulto</span>}
                          </td>
                          <td className="py-2 pr-2 text-center"><input type="checkbox" className="w-4 h-4 mt-1.5" checked={l.filiar} onChange={(e) => setLinha(i, { filiar: e.target.checked })} /></td>
                          <td className="py-2"><button aria-label="Remover atleta" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setLinhas((ls) => [...ls, { ...LINHA_VAZIA }])} className="flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200"><Plus className="w-4 h-4" /> Adicionar atleta</button>
            </Secao>
            <div className="flex justify-between gap-3">
              <button onClick={() => { setLinhas([]); setEtapa('entrada') }} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">Voltar</button>
              <button onClick={criar} disabled={!validas} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                <Users className="w-4 h-4" /> Criar {validas} atleta{validas === 1 ? '' : 's'}{validas < linhas.length ? ` (${linhas.length - validas} com pendência ficam para depois)` : ''}
              </button>
            </div>
          </>
        )}

        {/* ── Criação ── */}
        {etapa === 'criando' && (
          <Secao titulo="Criando atletas" descricao="Cada atleta recebe o acesso no contato informado.">
            <ul className="space-y-1.5 text-sm">
              {criacao.map((r) => (
                <li key={r.idx} className="flex items-start gap-2">
                  {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                  <span className="text-white">{r.nome}</span><span className="text-slate-400">— {r.msg}</span>
                </li>
              ))}
            </ul>
            {criacao.length > 0 && (
              <div className="flex justify-between gap-3 pt-2">
                {linhas.length > 0
                  ? <button onClick={() => setEtapa('revisao')} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5">Corrigir {linhas.length} com pendência</button>
                  : <span />}
                <button onClick={() => setEtapa('documentos')} className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold">Continuar para documentos</button>
              </div>
            )}
          </Secao>
        )}

        {/* ── Documentos ── */}
        {etapa === 'documentos' && (
          <>
            <Secao titulo="Documentos de identidade" descricao="Envie vários de uma vez: a IA lê cada documento, descobre de qual atleta é e confere com o cadastro. Também dá para enviar pela linha do atleta.">
              <input ref={docsRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => enviarDocs(e.target.files)} />
              <input ref={docLinhaRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => enviarDocs(e.target.files, docLinhaAlvo.current ?? undefined)} />
              <button onClick={() => docsRef.current?.click()} disabled={!!ocupado} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                <Upload className="w-4 h-4" /> Enviar documentos em lote
              </button>
              {docsLote.length > 0 && (
                <ul className="text-sm space-y-1">
                  {docsLote.map((d, i) => (
                    <li key={i} className={d.ok ? 'text-green-300' : 'text-amber-300'}>{d.ok ? '✓' : '!'} {d.arquivo} — {d.msg}</li>
                  ))}
                </ul>
              )}
            </Secao>
            <Secao titulo={`${servidor.length} atletas no lote`}>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-2">Atleta</th><th>Faixa</th><th>Acesso</th><th>Documento</th><th>Filiação</th><th /></tr>
                  </thead>
                  <tbody>
                    {servidor.map((s) => (
                      <tr key={s.ficha_id} className="border-t border-white/5">
                        <td className="py-2 text-white">{s.nome}{s.menor && <span className="ml-1 text-[10px] text-amber-300">menor</span>}</td>
                        <td className="text-slate-300">{s.graduacao ?? '—'}</td>
                        <td className="text-slate-400 text-xs">{s.contato}{!s.ativacao_enviada && <span className="block text-amber-300">ativação não enviada</span>}</td>
                        <td><StatusDoc s={s.verificacao_status} motivo={s.verificacao_motivo} /></td>
                        <td className="text-xs text-slate-400">
                          {s.pedido?.status === 'APROVADO' ? <span className="text-green-300">ativa</span> : s.pedido?.pago ? <span className="text-amber-300">paga, em revisão</span> : s.federacao_id ? 'a pagar' : 'sem federação'}
                        </td>
                        <td className="text-right">
                          <button onClick={() => { docLinhaAlvo.current = s.ficha_id; docLinhaRef.current?.click() }} disabled={!!ocupado} className="text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50">
                            {s.verificacao_status ? 'Trocar documento' : 'Enviar documento'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Secao>
            <div className="flex justify-between gap-3">
              <button onClick={() => setEtapa('fim')} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">Terminar sem filiar</button>
              <button onClick={() => setEtapa('pagamento')} disabled={!filiaveis.length} className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">Continuar para pagamento</button>
            </div>
          </>
        )}

        {/* ── Pagamento ── */}
        {etapa === 'pagamento' && !cobranca && (
          <>
            <Secao titulo="Filiações a pagar" descricao="Confira o back number de cada atleta. Quem ainda não tem documento enviado fica de fora até enviar.">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-2" /><th>Atleta</th><th>Documento</th><th>Nome nas costas</th><th>Tam.</th><th>Cor</th><th>Gênero</th><th>Proj. social</th><th className="text-right">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filiaveis.map((s) => {
                      const p = patches[s.ficha_id]
                      if (!p) return null
                      const semDoc = !s.verificacao_status
                      const taxa = p.projeto_social && s.taxa_projeto_social ? s.taxa_projeto_social : s.taxa
                      return (
                        <tr key={s.ficha_id} className={`border-t border-white/5 ${semDoc ? 'opacity-50' : ''}`}>
                          <td className="py-2 pr-2"><input type="checkbox" className="w-4 h-4" disabled={semDoc} checked={p.incluir && !semDoc} onChange={(e) => setPatch(s.ficha_id, { incluir: e.target.checked })} /></td>
                          <td className="text-white pr-2">{s.nome}</td>
                          <td className="pr-2">
                            <StatusDoc s={s.verificacao_status} motivo={s.verificacao_motivo} />
                            {s.verificacao_status === 'divergente' && (
                              <label className="flex items-center gap-1 text-[11px] text-slate-300 mt-1">
                                <input type="checkbox" checked={p.enviar_para_revisao} onChange={(e) => setPatch(s.ficha_id, { enviar_para_revisao: e.target.checked })} /> enviar p/ revisão
                              </label>
                            )}
                          </td>
                          <td className="pr-2"><input className={`${cell} w-40`} maxLength={24} value={p.nome_patch} onChange={(e) => setPatch(s.ficha_id, { nome_patch: e.target.value.toUpperCase() })} /></td>
                          <td className="pr-2">
                            <select className={`${cell} w-16`} value={p.tamanho_patch} onChange={(e) => setPatch(s.ficha_id, { tamanho_patch: e.target.value })}>
                              <option>P</option><option>M</option><option>G</option>
                            </select>
                          </td>
                          <td className="pr-2">
                            <select className={`${cell} w-20`} value={p.cor_patch} onChange={(e) => setPatch(s.ficha_id, { cor_patch: e.target.value })}>
                              <option value="AZUL">Azul</option><option value="ROSA">Rosa</option>
                            </select>
                          </td>
                          <td className="pr-2">
                            {s.genero ? <span className="text-xs text-slate-400">{s.genero}</span> : (
                              <select className={`${cell} w-24`} value={p.genero} onChange={(e) => setPatch(s.ficha_id, { genero: e.target.value })}>
                                <option value="">—</option><option value="Masculino">Masc.</option><option value="Feminino">Fem.</option>
                              </select>
                            )}
                          </td>
                          <td className="pr-2 text-center">
                            {s.taxa_projeto_social && s.taxa_projeto_social.valor !== s.taxa?.valor
                              ? <input type="checkbox" checked={p.projeto_social} onChange={(e) => setPatch(s.ficha_id, { projeto_social: e.target.checked })} />
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="text-right text-slate-200">{taxa ? brl(taxa.valor) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-slate-400">{prontos.length} filiação{prontos.length === 1 ? '' : 'ões'}</span>
                <span className="text-2xl font-bold text-white">{brl(totalPrevisto)}</span>
              </div>
            </Secao>
            <div className="flex justify-between gap-3">
              <button onClick={() => setEtapa('documentos')} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">Voltar</button>
              <button onClick={gerarCobranca} disabled={!prontos.length || !!ocupado} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                Gerar cobrança de {brl(totalPrevisto)}
              </button>
            </div>
          </>
        )}

        {etapa === 'pagamento' && cobranca && (
          <>
            {cobranca.falhas.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-200 text-sm space-y-1">
                <p className="font-semibold">Ficaram fora da cobrança:</p>
                {cobranca.falhas.map((f, i) => <p key={i}>• {f.nome}: {f.error}</p>)}
              </div>
            )}
            <Secao titulo="Checkout" descricao="Um único pagamento para todas as filiações. Quem paga é a academia.">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-300">{cobranca.pedido_ids.length} filiação{cobranca.pedido_ids.length === 1 ? '' : 'ões'}</span>
                <span className="text-2xl font-bold text-white">{brl(cobranca.total)}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Nome de quem paga" value={pagador.name} onChange={(e) => setPagador({ ...pagador, name: e.target.value })} />
                <input className={inputCls} placeholder="CPF" inputMode="numeric" value={pagador.identity} onChange={(e) => setPagador({ ...pagador, identity: e.target.value })} />
                <input className={inputCls} placeholder="Email" type="email" value={pagador.email} onChange={(e) => setPagador({ ...pagador, email: e.target.value })} />
                <input className={inputCls} placeholder="Telefone" value={pagador.phone ?? ''} onChange={(e) => setPagador({ ...pagador, phone: e.target.value })} />
              </div>
            </Secao>
            <div className="flex justify-between gap-3">
              <button onClick={() => { setCobranca(null); setEtapa('fim') }} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">Pagar depois</button>
              <button
                disabled={!cobranca.pedido_ids.length}
                onClick={() => {
                  if (!pagador.name.trim() || pagador.identity.replace(/\D/g, '').length !== 11) { setErro('Informe nome e CPF de quem paga'); return }
                  setErro(null)
                  setCheckoutAberto(true)
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" /> Pagar {brl(cobranca.total)}
              </button>
            </div>
            <CheckoutModal
              isOpen={checkoutAberto}
              onClose={() => setCheckoutAberto(false)}
              produto={{ produto: 'filiacao_bulk', referencia_ids: cobranca.pedido_ids, valor: cobranca.total, descricao: 'Filiações em lote', subtitulo: `${cobranca.pedido_ids.length} atletas` }}
              customer={{ ...pagador, identity: pagador.identity.replace(/\D/g, '') }}
              onSuccess={pagamentoConfirmado}
            />
          </>
        )}

        {/* ── Fim ── */}
        {etapa === 'fim' && (
          <Secao titulo="Lote registrado">
            {(() => {
              const ativos = servidor.filter((s) => s.pedido?.status === 'APROVADO').length
              const revisao = servidor.filter((s) => s.pedido?.pago && s.pedido.status !== 'APROVADO').length
              const aPagar = servidor.filter((s) => s.federacao_id && !s.pedido?.pago && s.pedido?.status !== 'APROVADO').length
              return (
                <ul className="text-slate-300 space-y-1">
                  <li><strong className="text-white">{servidor.length}</strong> atletas registrados na academia, com acesso enviado ao contato de cada um.</li>
                  {ativos > 0 && <li><strong className="text-green-300">{ativos}</strong> filiações ativas — certificado, carteira e amostra do back number enviados por email e disponíveis na conta de aluno.</li>}
                  {revisao > 0 && <li><strong className="text-amber-300">{revisao}</strong> filiações pagas aguardando revisão do documento pela federação.</li>}
                  {aPagar > 0 && <li><strong className="text-slate-100">{aPagar}</strong> filiações ainda a pagar — abra este lote de novo em “Lotes anteriores”.</li>}
                </ul>
              )
            })()}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/portal/academia/atletas')} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-200 hover:bg-white/5">Meus atletas</button>
              <button onClick={() => { window.location.href = '/portal/academia/atletas/lote' }} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold">Novo lote</button>
            </div>
          </Secao>
        )}
      </div>
    </div>
  )
}
