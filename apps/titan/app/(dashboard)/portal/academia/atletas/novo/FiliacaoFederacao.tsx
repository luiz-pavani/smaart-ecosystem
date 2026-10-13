'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, CreditCard, FileSearch, Loader2, ShieldCheck, Upload, XCircle } from 'lucide-react'
import CheckoutModal, { type CheckoutCustomer } from '@/components/checkout/CheckoutModal'
import { Campo, Secao, inputCls } from './ui'

// ── Tipos (espelham GET /api/academia/registro-atleta/[fichaId]/federacao) ───

interface Taxa { valor: number; descricao: string; ano: number }
interface Pedido { id: string; status: string; verificacao_status: string | null; pago_em: string | null }
interface Federacao { id: string; nome: string; sigla: string | null; taxa: Taxa | null; taxa_projeto_social: Taxa | null; pedido: Pedido | null }
interface Comparacao { campo: 'nome' | 'data_nascimento' | 'cpf' | 'rg'; cadastro: string | null; documento: string | null; ok: boolean }
interface Verificacao { status: 'aprovado' | 'divergente' | 'revisao_manual'; motivo: string; comparacao: Comparacao[] }
interface EstadoFederacao {
  federacoes: Federacao[]
  bloqueio: string | null
  atleta: { nome: string; data_nascimento: string | null; genero: string | null; cpf: string | null; rg: string | null; menor: boolean }
  documento: { enviado: boolean; verificacao_status: Verificacao['status'] | null; verificacao: Verificacao | null }
  foto_url: string | null
}

export type ResultadoFederacao =
  | { tipo: 'sem_federacao' }
  | { tipo: 'pago'; federacao: string; aprovado: boolean }
  | { tipo: 'pagamento_pendente'; federacao: string; valor: number }
  | { tipo: 'ja_filiado'; federacao: string }

const ROTULO_CAMPO: Record<Comparacao['campo'], string> = { nome: 'Nome', data_nascimento: 'Nascimento', cpf: 'CPF', rg: 'RG' }
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Reduz fotos grandes no navegador antes do upload (limite de ~4,5 MB por requisição na Vercel). */
async function reduzirImagem(file: File, lado = 2000): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const k = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * k)
    canvas.height = Math.round(bitmap.height * k)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.9))
  } catch {
    return file // formato que o navegador não decodifica (ex.: HEIC no Chrome): o servidor tenta converter
  }
}

function sugestaoNomePatch(nome: string) {
  const partes = nome.trim().toUpperCase().split(/\s+/)
  return (partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0] ?? '').slice(0, 24)
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function FiliacaoFederacao({
  fichaId,
  onEtapa,
  onConcluir,
  onVoltar,
}: {
  fichaId: string
  onEtapa: (n: 4 | 5) => void
  onConcluir: (r: ResultadoFederacao) => void
  onVoltar: () => void
}) {
  const [estado, setEstado] = useState<EstadoFederacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [federacaoId, setFederacaoId] = useState<string | null>(null)
  const [form, setForm] = useState({ genero: '', cpf: '', nome_patch: '', tamanho_patch: 'G', cor_patch: 'AZUL', projeto_social: false, enviar_para_revisao: false })
  const [enviando, setEnviando] = useState<'foto' | 'documento' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [cobranca, setCobranca] = useState<{ pedido_id: string; valor: number; descricao: string } | null>(null)
  const [pagador, setPagador] = useState<CheckoutCustomer>({ name: '', identity: '', email: '', phone: '' })
  const [checkoutAberto, setCheckoutAberto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/academia/registro-atleta/${fichaId}/federacao`)
    const json = await res.json()
    if (!res.ok) { setErro(json.error || 'Erro ao carregar'); return null }
    setEstado(json)
    return json as EstadoFederacao
  }, [fichaId])

  useEffect(() => {
    carregar().then((e) => {
      if (!e) return
      setForm((f) => ({
        ...f,
        genero: e.atleta.genero ?? '',
        nome_patch: sugestaoNomePatch(e.atleta.nome),
        cor_patch: e.atleta.genero === 'Feminino' ? 'ROSA' : 'AZUL',
      }))
    })
  }, [carregar])

  const fed = estado?.federacoes.find((f) => f.id === federacaoId) ?? null
  const taxa = fed ? (form.projeto_social && fed.taxa_projeto_social ? fed.taxa_projeto_social : fed.taxa) : null
  const verif = estado?.documento.verificacao ?? null
  const nomeFed = fed?.sigla || fed?.nome || 'federação'

  const enviarArquivo = async (tipo: 'foto' | 'documento', file: File | undefined) => {
    if (!file) return
    setEnviando(tipo)
    setErro(null)
    try {
      const corpo = new FormData()
      corpo.append('tipo', tipo)
      const blob = file.type === 'application/pdf' ? file : await reduzirImagem(file, tipo === 'foto' ? 1200 : 2000)
      corpo.append('file', blob, file.name)
      const res = await fetch(`/api/academia/registro-atleta/${fichaId}/documento`, { method: 'POST', body: corpo })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro no envio')
      setForm((f) => ({ ...f, enviar_para_revisao: false }))
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no envio')
    } finally {
      setEnviando(null)
      if (fotoRef.current) fotoRef.current.value = ''
      if (docRef.current) docRef.current.value = ''
    }
  }

  const irParaPagamento = async () => {
    if (!fed) return
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/academia/registro-atleta/${fichaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passo: 'federacao', dados: { federacao_id: fed.id, ...form } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      setCobranca({ pedido_id: json.pedido_id, valor: json.valor, descricao: json.descricao })
      setPagador(json.pagador)
      onEtapa(5)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const pagamentoConfirmado = async () => {
    setCheckoutAberto(false)
    // O webhook/checkout já concluiu a filiação; relê o pedido para saber se ficou ativa ou em revisão.
    const e = await carregar()
    const pedido = e?.federacoes.find((f) => f.id === federacaoId)?.pedido
    onConcluir({ tipo: 'pago', federacao: nomeFed, aprovado: pedido?.status === 'APROVADO' })
  }

  if (!estado) {
    return erro
      ? <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">{erro}</div>
      : <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
  }

  // ── Passo 5: pagamento ──
  if (cobranca && fed) {
    const revisao = estado.documento.verificacao_status !== 'aprovado'
    return (
      <>
        {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">{erro}</div>}
        <Secao titulo={`Taxa de filiação — ${nomeFed}`}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-slate-300">{cobranca.descricao}</span>
            <span className="text-2xl font-bold text-white">{brl(cobranca.valor)}</span>
          </div>
          <p className={`text-sm rounded-lg px-3 py-2 ${revisao ? 'bg-amber-500/10 text-amber-300' : 'bg-green-600/10 text-green-300'}`}>
            {revisao
              ? `Depois do pagamento, a ${nomeFed} revisa o documento. Certificado, carteira e back number são enviados quando ela aprovar.`
              : `Documento verificado. Assim que o pagamento for confirmado, a filiação fica ativa e ${estado.atleta.nome.split(' ')[0]} recebe certificado, carteira digital e amostra do back number.`}
          </p>
        </Secao>

        <Secao titulo="Quem paga" descricao={estado.atleta.menor ? 'Atleta menor de idade: dados do responsável.' : 'Dados do atleta. O CPF é exigido pelo meio de pagamento.'}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Nome" obrigatorio>
              <input className={inputCls} value={pagador.name} onChange={(e) => setPagador({ ...pagador, name: e.target.value })} />
            </Campo>
            <Campo label="CPF" obrigatorio>
              <input className={inputCls} inputMode="numeric" value={pagador.identity} onChange={(e) => setPagador({ ...pagador, identity: e.target.value })} />
            </Campo>
            <Campo label="Email">
              <input className={inputCls} type="email" value={pagador.email} onChange={(e) => setPagador({ ...pagador, email: e.target.value })} />
            </Campo>
            <Campo label="Telefone">
              <input className={inputCls} type="tel" value={pagador.phone ?? ''} onChange={(e) => setPagador({ ...pagador, phone: e.target.value })} />
            </Campo>
          </div>
        </Secao>

        <div className="flex justify-between gap-3">
          <button onClick={() => onConcluir({ tipo: 'pagamento_pendente', federacao: nomeFed, valor: cobranca.valor })} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
            Pagar depois
          </button>
          <button
            onClick={() => {
              if (!pagador.name.trim() || pagador.identity.replace(/\D/g, '').length !== 11) { setErro('Informe nome e CPF de quem paga'); return }
              setErro(null)
              setCheckoutAberto(true)
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold"
          >
            <CreditCard className="w-4 h-4" /> Pagar {brl(cobranca.valor)}
          </button>
        </div>

        <CheckoutModal
          isOpen={checkoutAberto}
          onClose={() => setCheckoutAberto(false)}
          produto={{ produto: 'filiacao_atleta', referencia_id: cobranca.pedido_id, descricao: `Filiação ${nomeFed}`, subtitulo: estado.atleta.nome }}
          customer={{ ...pagador, identity: pagador.identity.replace(/\D/g, '') }}
          onSuccess={pagamentoConfirmado}
        />
      </>
    )
  }

  // ── Passo 4: escolha da federação e dados exigidos ──
  const jaFiliado = estado.federacoes.find((f) => f.pedido?.status === 'APROVADO')
  const temCpfOuRg = !!(estado.atleta.cpf || estado.atleta.rg)

  return (
    <>
      {erro && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">{erro}</div>}

      <Secao titulo="Filiar a uma federação agora?" descricao="Opcional. A filiação pode ser feita depois.">
        {estado.bloqueio ? (
          <p className="text-sm text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">{estado.bloqueio}</p>
        ) : jaFiliado ? (
          <p className="text-sm text-green-300 bg-green-600/10 rounded-lg px-3 py-2">Atleta já filiado à {jaFiliado.sigla || jaFiliado.nome}.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {estado.federacoes.map((f) => {
              const pago = !!f.pedido?.pago_em
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={pago || !f.taxa}
                  onClick={() => setFederacaoId(f.id === federacaoId ? null : f.id)}
                  className={`text-left rounded-lg border px-4 py-3 transition-colors disabled:opacity-60 ${f.id === federacaoId ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <span className="block font-semibold text-white">{f.sigla || f.nome}</span>
                  <span className="block text-sm text-slate-400">
                    {pago ? 'Paga, em análise na federação' : f.taxa ? `${f.taxa.descricao} · ${brl(f.taxa.valor)}` : 'Taxa não cadastrada'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Secao>

      {fed && (
        <>
          <Secao titulo={`Dados exigidos pela ${nomeFed}`} descricao="O que já está no cadastro aparece marcado. Complete o que falta.">
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                ['Nome completo', true],
                ['Data de nascimento', !!estado.atleta.data_nascimento],
                ['Graduação de judô', true],
                ['Gênero', !!form.genero],
                ['CPF ou RG', temCpfOuRg || form.cpf.replace(/\D/g, '').length === 11],
                ['Foto do atleta (recomendada)', !!estado.foto_url],
                ['Documento verificado', !!estado.documento.verificacao_status],
              ].map(([rotulo, ok]) => (
                <li key={rotulo as string} className={`flex items-center gap-2 ${ok ? 'text-green-300' : 'text-slate-400'}`}>
                  {ok ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-slate-500" />}
                  {rotulo as string}
                </li>
              ))}
            </ul>
            {(!estado.atleta.genero || !temCpfOuRg) && (
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {!estado.atleta.genero && (
                  <Campo label="Gênero" obrigatorio>
                    <select className={inputCls} value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value, cor_patch: e.target.value === 'Feminino' ? 'ROSA' : 'AZUL' })}>
                      <option value="">—</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </Campo>
                )}
                {!temCpfOuRg && (
                  <Campo label="CPF do atleta" obrigatorio>
                    <input className={inputCls} inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                  </Campo>
                )}
              </div>
            )}
          </Secao>

          <Secao titulo="Back number">
            <div className="grid sm:grid-cols-3 gap-4">
              <Campo label="Nome nas costas" obrigatorio className="sm:col-span-3">
                <input className={inputCls} maxLength={24} value={form.nome_patch} onChange={(e) => setForm({ ...form, nome_patch: e.target.value.toUpperCase() })} />
              </Campo>
              <Campo label="Tamanho" obrigatorio>
                <select className={inputCls} value={form.tamanho_patch} onChange={(e) => setForm({ ...form, tamanho_patch: e.target.value })}>
                  <option value="P">P — 30×30 cm</option>
                  <option value="M">M — 37×37 cm</option>
                  <option value="G">G — 41×41 cm</option>
                </select>
              </Campo>
              <Campo label="Cor" obrigatorio>
                <select className={inputCls} value={form.cor_patch} onChange={(e) => setForm({ ...form, cor_patch: e.target.value })}>
                  <option value="AZUL">Azul</option>
                  <option value="ROSA">Rosa</option>
                </select>
              </Campo>
              {fed.taxa_projeto_social && fed.taxa_projeto_social.valor !== fed.taxa?.valor && (
                <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.projeto_social} onChange={(e) => setForm({ ...form, projeto_social: e.target.checked })} />
                  Atleta de projeto social ({brl(fed.taxa_projeto_social.valor)})
                </label>
              )}
            </div>
          </Secao>

          <Secao titulo="Foto do atleta" descricao="Opcional, mas recomendada: rosto de frente, fundo claro. Vai na carteira digital.">
            <div className="flex items-center gap-4">
              {estado.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={estado.foto_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-slate-500"><Camera className="w-6 h-6" /></div>
              )}
              <input ref={fotoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => enviarArquivo('foto', e.target.files?.[0])} />
              <button type="button" onClick={() => fotoRef.current?.click()} disabled={!!enviando} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-200 hover:bg-white/5 disabled:opacity-50">
                {enviando === 'foto' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {estado.foto_url ? 'Trocar foto' : 'Enviar foto'}
              </button>
            </div>
          </Secao>

          <Secao titulo="Documento de identidade" descricao="Fotografe RG, CIN, CNH ou certidão de nascimento inteiro, sem reflexo. A IA confere nome, nascimento e CPF/RG com o cadastro.">
            <input ref={docRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => enviarArquivo('documento', e.target.files?.[0])} />
            {enviando === 'documento' ? (
              <div className="flex items-center gap-3 text-slate-300 text-sm"><Loader2 className="w-5 h-5 animate-spin" /> Verificando o documento…</div>
            ) : verif ? (
              <div className={`rounded-lg border px-4 py-3 space-y-3 ${verif.status === 'aprovado' ? 'border-green-600/40 bg-green-600/10' : verif.status === 'divergente' ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
                <p className={`flex items-center gap-2 font-semibold ${verif.status === 'aprovado' ? 'text-green-300' : verif.status === 'divergente' ? 'text-red-300' : 'text-amber-300'}`}>
                  {verif.status === 'aprovado' ? <ShieldCheck className="w-5 h-5" /> : verif.status === 'divergente' ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {verif.status === 'aprovado' ? 'Documento verificado' : verif.status === 'divergente' ? 'Documento não confere' : 'Vai para revisão da federação'}
                </p>
                <p className="text-sm text-slate-300">{verif.motivo}</p>
                {verif.comparacao.length > 0 && (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-1">Campo</th><th>Cadastro</th><th>Documento</th><th /></tr></thead>
                    <tbody>
                      {verif.comparacao.map((c) => (
                        <tr key={c.campo} className="border-t border-white/5">
                          <td className="py-1.5 text-slate-400">{ROTULO_CAMPO[c.campo]}</td>
                          <td className="text-slate-200">{c.cadastro ?? '—'}</td>
                          <td className="text-slate-200">{c.documento ?? '—'}</td>
                          <td>{c.ok ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {verif.status === 'divergente' && (
                  <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 mt-0.5" checked={form.enviar_para_revisao} onChange={(e) => setForm({ ...form, enviar_para_revisao: e.target.checked })} />
                    Os dados do cadastro estão certos: enviar para a federação revisar manualmente (a filiação só fica ativa depois da revisão).
                  </label>
                )}
                <button type="button" onClick={() => docRef.current?.click()} className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
                  <FileSearch className="w-4 h-4" /> Enviar outra foto
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => docRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-200 hover:bg-white/5">
                <Camera className="w-4 h-4" /> Fotografar ou enviar documento
              </button>
            )}
          </Secao>
        </>
      )}

      <div className="flex justify-between gap-3">
        <button onClick={onVoltar} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">Voltar</button>
        {fed ? (
          <button onClick={irParaPagamento} disabled={salvando || !!enviando} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Continuar para pagamento{taxa ? ` · ${brl(taxa.valor)}` : ''}
          </button>
        ) : (
          <button
            onClick={() => onConcluir(jaFiliado ? { tipo: 'ja_filiado', federacao: jaFiliado.sigla || jaFiliado.nome } : { tipo: 'sem_federacao' })}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            {jaFiliado ? 'Concluir' : 'Concluir sem federação'}
          </button>
        )}
      </div>
    </>
  )
}
