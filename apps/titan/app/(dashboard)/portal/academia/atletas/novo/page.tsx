'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Mail, MapPin, MessageCircle, Plus, Trash2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resolveAcademiaId } from '@/lib/portal/resolveAcademiaId'
import {
  ARTES_MARCIAIS,
  ARTE_COM_KYU_DAN,
  FORMAS_PAGAMENTO,
  CONDICOES_SAUDE,
  TIPOS_SANGUINEOS,
  buscarCep,
  idadeEm,
  isMenorDeIdade,
  type CanalAcesso,
  type CondicaoSaude,
  type GraduacaoHistoricoInput,
  type TipoDocumento,
} from '@/lib/registro/atleta'
import { Campo, Secao, inputCls } from './ui'
import FiliacaoFederacao, { type ResultadoFederacao } from './FiliacaoFederacao'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Plano { id: string; nome: string; valor: number; periodicidade: string }
interface Graduacao { id: number; cor_faixa: string | null; kyu_dan: string | null }
interface Opcoes { academia: { id: string; nome: string; sigla: string }; planos: Plano[]; graduacoes: Graduacao[] }

type Passo = 1 | 2 | 3 | 4 | 5 | 'fim'

const PASSOS = [
  { n: 1, titulo: 'Atleta e acesso' },
  { n: 2, titulo: 'Cadastro' },
  { n: 3, titulo: 'Filiação' },
  { n: 4, titulo: 'Federação' },
  { n: 5, titulo: 'Pagamento' },
] as const

const vazio = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v ?? ''])) as Record<keyof T, string>

function rotuloGraduacao(g: Graduacao) {
  return [g.cor_faixa, g.kyu_dan].filter(Boolean).join(' | ')
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function RegistroAtletaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <RegistroAtletaWizard />
    </Suspense>
  )
}

function RegistroAtletaWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [passo, setPasso] = useState<Passo>(1)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [fichaId, setFichaId] = useState<string | null>(searchParams.get('ficha'))
  const [stakeholderId, setStakeholderId] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoFederacao | null>(null)
  const [ativacao, setAtivacao] = useState<{ canal: CanalAcesso; enviado: boolean } | null>(null)

  // Passo 1
  const [nome, setNome] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [canal, setCanal] = useState<CanalAcesso>('whatsapp')
  const [contato, setContato] = useState('')

  // Passo 2
  const [cadastro, setCadastro] = useState({
    documento_tipo: 'cpf' as TipoDocumento, documento: '', genero: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    contato_emergencia_nome: '', contato_emergencia_telefone: '', tipo_sanguineo: '', observacoes_saude: '', como_conheceu: '',
    responsavel_nome: '', responsavel_cpf: '', responsavel_telefone: '', responsavel_email: '', responsavel_parentesco: '',
  })
  const [condicoes, setCondicoes] = useState<CondicaoSaude[]>([])
  const [cepStatus, setCepStatus] = useState<'idle' | 'buscando' | 'ok' | 'erro'>('idle')

  // Passo 3
  const [filiacao, setFiliacao] = useState({
    arte_marcial: ARTE_COM_KYU_DAN as string, kyu_dan_id: '', graduacao_texto: '', data_ultima_graduacao: '',
    plano_id: '', valor: '', parcelas: '1', forma_pagamento: '', dia_vencimento: '', data_inicio: new Date().toISOString().slice(0, 10),
  })
  const [historico, setHistorico] = useState<GraduacaoHistoricoInput[]>([])

  const idade = idadeEm(nascimento)
  const menor = isMenorDeIdade(nascimento)
  const isJudo = filiacao.arte_marcial === ARTE_COM_KYU_DAN

  // Carrega opções e, se veio ?ficha=, retoma o registro.
  useEffect(() => {
    (async () => {
      try {
        const id = await resolveAcademiaId(supabase)
        setAcademiaId(id)
        const res = await fetch(`/api/academia/registro-atleta${id ? `?academia_id=${id}` : ''}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar')
        setOpcoes(json)

        if (fichaId) {
          const r = await fetch(`/api/academia/registro-atleta/${fichaId}`)
          const f = await r.json()
          if (!r.ok) throw new Error(f.error || 'Ficha não encontrada')
          setStakeholderId(f.atleta.id)
          setNome(f.atleta.nome_completo ?? '')
          setNascimento(f.atleta.data_nascimento ?? '')
          setCanal(f.ficha.canal_acesso ?? 'whatsapp')
          setContato(f.atleta.email ?? f.atleta.telefone ?? '')
          setCadastro((c) => ({ ...c, ...vazio({
            documento: f.atleta.cpf ?? f.ficha.rg, genero: f.atleta.genero, cep: f.ficha.cep, logradouro: f.ficha.logradouro, numero: f.ficha.numero,
            complemento: f.ficha.complemento, bairro: f.ficha.bairro, cidade: f.ficha.cidade, uf: f.ficha.uf,
            contato_emergencia_nome: f.ficha.contato_emergencia_nome, contato_emergencia_telefone: f.ficha.contato_emergencia_telefone,
            tipo_sanguineo: f.ficha.tipo_sanguineo, observacoes_saude: f.ficha.observacoes_saude, como_conheceu: f.ficha.como_conheceu,
            responsavel_nome: f.ficha.responsavel_nome, responsavel_cpf: f.ficha.responsavel_cpf,
            responsavel_telefone: f.ficha.responsavel_telefone, responsavel_email: f.ficha.responsavel_email,
            responsavel_parentesco: f.ficha.responsavel_parentesco,
          }), documento_tipo: !f.atleta.cpf && f.ficha.rg ? 'rg' : 'cpf' }))
          setFiliacao((s) => ({ ...s, ...vazio({
            arte_marcial: f.ficha.arte_marcial ?? s.arte_marcial,
            kyu_dan_id: f.atleta.kyu_dan_id != null ? String(f.atleta.kyu_dan_id) : '',
            graduacao_texto: f.ficha.graduacao_texto, data_ultima_graduacao: f.ficha.data_ultima_graduacao,
            plano_id: f.ficha.plano_id,
            valor: f.ficha.valor != null ? String(f.ficha.valor) : '', parcelas: f.ficha.parcelas != null ? String(f.ficha.parcelas) : '1',
            forma_pagamento: f.ficha.forma_pagamento, dia_vencimento: f.ficha.dia_vencimento != null ? String(f.ficha.dia_vencimento) : '',
            data_inicio: f.ficha.data_inicio ?? s.data_inicio,
          }) }))
          setCondicoes(f.ficha.condicoes_saude ?? [])
          setHistorico(f.historico ?? [])
          setPasso(f.ficha.etapa === 'cadastro' ? 2 : f.ficha.etapa === 'filiacao' ? 3 : 4)
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        setCarregando(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chamar = async (url: string, method: string, body: unknown) => {
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      return json
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
      return null
    } finally {
      setSalvando(false)
    }
  }

  const enviarPasso1 = async () => {
    const json = await chamar('/api/academia/registro-atleta', 'POST', {
      nome_completo: nome, data_nascimento: nascimento, canal, contato, academia_id: academiaId,
    })
    if (!json) return
    setFichaId(json.ficha_id)
    setStakeholderId(json.stakeholder_id)
    setAtivacao(json.ativacao)
    router.replace(`/portal/academia/atletas/novo?ficha=${json.ficha_id}`, { scroll: false })
    setPasso(2)
  }

  const enviarPasso2 = async () => {
    if (!fichaId) return
    if (await chamar(`/api/academia/registro-atleta/${fichaId}`, 'PATCH', { passo: 'cadastro', dados: { ...cadastro, condicoes_saude: condicoes } })) setPasso(3)
  }

  // Pular: adulto segue direto; menor grava só o responsável, que é obrigatório.
  const pularPasso2 = async () => {
    if (!menor) { setPasso(3); return }
    if (!fichaId) return
    const { responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email, responsavel_parentesco } = cadastro
    const dados = { responsavel_nome, responsavel_cpf, responsavel_telefone, responsavel_email, responsavel_parentesco }
    if (await chamar(`/api/academia/registro-atleta/${fichaId}`, 'PATCH', { passo: 'cadastro', dados })) setPasso(3)
  }

  const mudarCep = async (valor: string) => {
    const digits = valor.replace(/\D/g, '').slice(0, 8)
    setCadastro((c) => ({ ...c, cep: digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits }))
    if (digits.length !== 8) { setCepStatus('idle'); return }
    setCepStatus('buscando')
    const end = await buscarCep(digits)
    if (!end) { setCepStatus('erro'); return }
    setCadastro((c) => ({ ...c, logradouro: end.logradouro, bairro: end.bairro, cidade: end.cidade, uf: end.uf }))
    setCepStatus('ok')
    document.getElementById('registro-numero')?.focus()
  }

  const enviarPasso3 = async () => {
    if (!fichaId) return
    const dados = {
      ...filiacao,
      kyu_dan_id: filiacao.kyu_dan_id ? Number(filiacao.kyu_dan_id) : null,
      valor: filiacao.valor === '' ? null : Number(filiacao.valor.replace(',', '.')),
      parcelas: Number(filiacao.parcelas) || null,
      dia_vencimento: Number(filiacao.dia_vencimento) || null,
      forma_pagamento: filiacao.forma_pagamento || null,
      plano_id: filiacao.plano_id || null,
      historico,
    }
    if (await chamar(`/api/academia/registro-atleta/${fichaId}`, 'PATCH', { passo: 'filiacao', dados })) setPasso(4)
  }

  const escolherPlano = (id: string) => {
    const plano = opcoes?.planos.find((p) => p.id === id)
    setFiliacao((f) => ({ ...f, plano_id: id, valor: plano ? String(plano.valor) : f.valor }))
  }

  const passo1Valido = nome.trim().split(/\s+/).length >= 2 && idade != null && idade >= 0 && contato.trim().length > 0

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-3xl mx-auto px-4 space-y-3">
          <button
            onClick={() => router.push('/portal/academia/atletas')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Meus atletas
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Registro individual de atleta</h1>
            {opcoes && <p className="text-slate-400 text-sm mt-1">{opcoes.academia.nome}</p>}
          </div>

          {/* Stepper */}
          <ol className="flex gap-2 overflow-x-auto pt-2">
            {PASSOS.map((p) => {
              const atual = passo === p.n
              const feito = passo === 'fim' ? p.n <= (resultado?.tipo === 'pago' ? 5 : resultado?.tipo === 'pagamento_pendente' ? 4 : 3) : typeof passo === 'number' && p.n < passo
              return (
                <li key={p.n} className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  atual ? 'border-blue-500 bg-blue-500/20 text-white'
                  : feito ? 'border-green-600/40 bg-green-600/10 text-green-300'
                  : 'border-white/10 text-slate-500'}`}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10">
                    {feito ? <Check className="w-3 h-3" /> : p.n}
                  </span>
                  {p.titulo}
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {erro && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">{erro}</div>
        )}

        {/* ── Passo 1 ── */}
        {passo === 1 && (
          <>
            <Secao titulo="Atleta" descricao="Somente o essencial para criar a conta.">
              <Campo label="Nome completo" obrigatorio>
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" autoFocus />
              </Campo>
              <Campo label="Data de nascimento" obrigatorio>
                <input type="date" className={inputCls} value={nascimento} onChange={(e) => setNascimento(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </Campo>
              {idade != null && idade >= 0 && (
                <p className="text-sm text-slate-400">
                  {idade} anos{menor && <span className="text-amber-300"> · menor de idade: o responsável será pedido no cadastro</span>}
                </p>
              )}
            </Secao>

            <Secao titulo="Acesso ao sistema" descricao="Este contato é o login do atleta e por onde ele cria a própria senha.">
              <div className="grid grid-cols-2 gap-3">
                {([['whatsapp', 'WhatsApp', MessageCircle], ['email', 'Email', Mail]] as const).map(([valor, rotulo, Icone]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => { setCanal(valor); setContato('') }}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold transition-colors ${
                      canal === valor ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    <Icone className="w-4 h-4" /> {rotulo}
                  </button>
                ))}
              </div>
              <Campo label={canal === 'email' ? 'Email' : 'WhatsApp (com DDD)'} obrigatorio>
                <input
                  className={inputCls}
                  type={canal === 'email' ? 'email' : 'tel'}
                  inputMode={canal === 'email' ? 'email' : 'tel'}
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder={canal === 'email' ? 'atleta@email.com' : '(51) 99999-9999'}
                />
              </Campo>
              {menor && (
                <p className="text-xs text-slate-400">Para atletas pequenos, use o contato do responsável. Ele será o acesso da conta.</p>
              )}
            </Secao>

            <div className="flex justify-end">
              <button
                onClick={enviarPasso1}
                disabled={!passo1Valido || salvando}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Criar atleta e continuar
              </button>
            </div>
          </>
        )}

        {/* ── Passo 2 ── */}
        {passo === 2 && (
          <>
            {ativacao && (
              <div className={`rounded-lg px-4 py-3 text-sm border ${ativacao.enviado ? 'bg-green-600/10 border-green-600/30 text-green-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                {ativacao.enviado
                  ? ativacao.canal === 'email'
                    ? `Conta criada. ${nome.split(' ')[0]} recebeu o link para criar a senha no email.`
                    : `Conta criada. ${nome.split(' ')[0]} recebeu as boas-vindas no WhatsApp e entra em /acesso com o código enviado ao número.`
                  : 'Conta criada, mas a mensagem de ativação não foi enviada. O atleta pode entrar por “Esqueci minha senha” (email) ou pelo código no WhatsApp em /acesso.'}
              </div>
            )}

            {menor && (
              <Secao titulo="Responsável legal" descricao={`Atleta com ${idade} anos: o responsável é obrigatório e é o titular do contrato.`}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Campo label="Nome do responsável" obrigatorio>
                    <input className={inputCls} value={cadastro.responsavel_nome} onChange={(e) => setCadastro({ ...cadastro, responsavel_nome: e.target.value })} />
                  </Campo>
                  <Campo label="Parentesco">
                    <select className={inputCls} value={cadastro.responsavel_parentesco} onChange={(e) => setCadastro({ ...cadastro, responsavel_parentesco: e.target.value })}>
                      <option value="">—</option>
                      {['Mãe', 'Pai', 'Avó', 'Avô', 'Tutor(a) legal', 'Outro'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Campo>
                  <Campo label="CPF do responsável" obrigatorio>
                    <input className={inputCls} inputMode="numeric" value={cadastro.responsavel_cpf} onChange={(e) => setCadastro({ ...cadastro, responsavel_cpf: e.target.value })} />
                  </Campo>
                  <Campo label="Telefone / WhatsApp" obrigatorio>
                    <input className={inputCls} type="tel" value={cadastro.responsavel_telefone} onChange={(e) => setCadastro({ ...cadastro, responsavel_telefone: e.target.value })} />
                  </Campo>
                  <Campo label="Email do responsável" className="sm:col-span-2">
                    <input className={inputCls} type="email" value={cadastro.responsavel_email} onChange={(e) => setCadastro({ ...cadastro, responsavel_email: e.target.value })} />
                  </Campo>
                </div>
              </Secao>
            )}

            <Secao titulo="Documento e dados pessoais">
              <div className="grid sm:grid-cols-[8rem_1fr_1fr] gap-4">
                <Campo label="Documento">
                  <select className={inputCls} value={cadastro.documento_tipo} onChange={(e) => setCadastro({ ...cadastro, documento_tipo: e.target.value as TipoDocumento })}>
                    <option value="cpf">CPF</option>
                    <option value="rg">RG</option>
                  </select>
                </Campo>
                <Campo label={cadastro.documento_tipo === 'cpf' ? 'Número do CPF' : 'Número do RG'}>
                  <input className={inputCls} inputMode="numeric" value={cadastro.documento} onChange={(e) => setCadastro({ ...cadastro, documento: e.target.value })} placeholder={cadastro.documento_tipo === 'cpf' ? '000.000.000-00' : '0000000000'} />
                </Campo>
                <Campo label="Gênero">
                  <select className={inputCls} value={cadastro.genero} onChange={(e) => setCadastro({ ...cadastro, genero: e.target.value })}>
                    <option value="">—</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Endereço" descricao="Digite o CEP: o endereço é preenchido e você completa número e complemento.">
              <div className="grid sm:grid-cols-6 gap-4">
                <Campo label="CEP" className="sm:col-span-2">
                  <div className="relative">
                    <input className={inputCls} inputMode="numeric" value={cadastro.cep} onChange={(e) => mudarCep(e.target.value)} placeholder="00000-000" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cepStatus === 'buscando' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                      {cepStatus === 'ok' && <MapPin className="w-4 h-4 text-green-400" />}
                    </span>
                  </div>
                  {cepStatus === 'erro' && <span className="block text-xs text-amber-300 mt-1">CEP não encontrado. Preencha o endereço manualmente.</span>}
                </Campo>
                <Campo label="Número" className="sm:col-span-2">
                  <input id="registro-numero" className={inputCls} value={cadastro.numero} onChange={(e) => setCadastro({ ...cadastro, numero: e.target.value })} />
                </Campo>
                <Campo label="Complemento / apto" className="sm:col-span-2">
                  <input className={inputCls} value={cadastro.complemento} onChange={(e) => setCadastro({ ...cadastro, complemento: e.target.value })} placeholder="Apto 302" />
                </Campo>
                <Campo label="Logradouro" className="sm:col-span-6">
                  <input className={inputCls} value={cadastro.logradouro} onChange={(e) => setCadastro({ ...cadastro, logradouro: e.target.value })} />
                </Campo>
                <Campo label="Bairro" className="sm:col-span-2">
                  <input className={inputCls} value={cadastro.bairro} onChange={(e) => setCadastro({ ...cadastro, bairro: e.target.value })} />
                </Campo>
                <Campo label="Cidade" className="sm:col-span-3">
                  <input className={inputCls} value={cadastro.cidade} onChange={(e) => setCadastro({ ...cadastro, cidade: e.target.value })} />
                </Campo>
                <Campo label="UF" className="sm:col-span-1">
                  <input className={inputCls} maxLength={2} value={cadastro.uf} onChange={(e) => setCadastro({ ...cadastro, uf: e.target.value.toUpperCase() })} />
                </Campo>
              </div>
            </Secao>

            <Secao titulo="Saúde" descricao="Marque o que se aplica e descreva. Fica visível para os professores da academia.">
              <Campo label="Tipo sanguíneo" className="sm:w-48">
                <select className={inputCls} value={cadastro.tipo_sanguineo} onChange={(e) => setCadastro({ ...cadastro, tipo_sanguineo: e.target.value })}>
                  <option value="">—</option>
                  {TIPOS_SANGUINEOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Campo>
              <div className="space-y-2">
                {CONDICOES_SAUDE.map((c) => {
                  const marcada = condicoes.find((x) => x.tipo === c.tipo)
                  return (
                    <div key={c.tipo} className={`rounded-lg border px-3 py-2 ${marcada ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10'}`}>
                      <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-200">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-amber-500"
                          checked={!!marcada}
                          onChange={(e) => setCondicoes(e.target.checked
                            ? [...condicoes, { tipo: c.tipo, detalhe: '' }]
                            : condicoes.filter((x) => x.tipo !== c.tipo))}
                        />
                        {c.rotulo}
                      </label>
                      {marcada && (
                        <input
                          className={`${inputCls} mt-2`}
                          value={marcada.detalhe}
                          onChange={(e) => setCondicoes(condicoes.map((x) => (x.tipo === c.tipo ? { ...x, detalhe: e.target.value } : x)))}
                          placeholder={c.exemplo}
                          autoFocus
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <Campo label="Outras observações de saúde">
                <textarea rows={2} className={inputCls} value={cadastro.observacoes_saude} onChange={(e) => setCadastro({ ...cadastro, observacoes_saude: e.target.value })} placeholder="Qualquer informação que o professor deva saber" />
              </Campo>
            </Secao>

            <Secao titulo="Emergência e origem">
              <div className="grid sm:grid-cols-2 gap-4">
                <Campo label="Contato de emergência">
                  <input className={inputCls} value={cadastro.contato_emergencia_nome} onChange={(e) => setCadastro({ ...cadastro, contato_emergencia_nome: e.target.value })} placeholder="Nome" />
                </Campo>
                <Campo label="Telefone de emergência">
                  <input className={inputCls} type="tel" value={cadastro.contato_emergencia_telefone} onChange={(e) => setCadastro({ ...cadastro, contato_emergencia_telefone: e.target.value })} />
                </Campo>
                <Campo label="Como conheceu a academia" className="sm:col-span-2">
                  <input className={inputCls} value={cadastro.como_conheceu} onChange={(e) => setCadastro({ ...cadastro, como_conheceu: e.target.value })} />
                </Campo>
              </div>
            </Secao>

            <div className="flex justify-between gap-3">
              <button onClick={pularPasso2} disabled={salvando} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                {menor ? 'Salvar só o responsável' : 'Pular esta etapa'}
              </button>
              <button onClick={enviarPasso2} disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar e continuar
              </button>
            </div>
          </>
        )}

        {/* ── Passo 3 ── */}
        {passo === 3 && (
          <>
            <Secao titulo="Arte marcial e graduação">
              <div className="grid sm:grid-cols-2 gap-4">
                <Campo label="Arte marcial" obrigatorio>
                  <select className={inputCls} value={filiacao.arte_marcial} onChange={(e) => { setFiliacao({ ...filiacao, arte_marcial: e.target.value, kyu_dan_id: '', graduacao_texto: '' }); setHistorico([]) }}>
                    {ARTES_MARCIAIS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Campo>
                <Campo label="Graduação atual" obrigatorio>
                  {isJudo ? (
                    <select className={inputCls} value={filiacao.kyu_dan_id} onChange={(e) => setFiliacao({ ...filiacao, kyu_dan_id: e.target.value })}>
                      <option value="">Selecione…</option>
                      {opcoes?.graduacoes.map((g) => <option key={g.id} value={g.id}>{rotuloGraduacao(g)}</option>)}
                    </select>
                  ) : (
                    <input className={inputCls} value={filiacao.graduacao_texto} onChange={(e) => setFiliacao({ ...filiacao, graduacao_texto: e.target.value })} placeholder="Ex.: Faixa azul, 2 graus" />
                  )}
                </Campo>
                <Campo label="Data da última graduação">
                  <input type="date" className={inputCls} value={filiacao.data_ultima_graduacao} onChange={(e) => setFiliacao({ ...filiacao, data_ultima_graduacao: e.target.value })} />
                </Campo>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Histórico de faixas</span>
                  <button type="button" onClick={() => setHistorico([...historico, {}])} className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200">
                    <Plus className="w-3.5 h-3.5" /> Adicionar faixa
                  </button>
                </div>
                {historico.length === 0 && <p className="text-sm text-slate-500">Nenhuma faixa anterior informada.</p>}
                {historico.map((h, i) => {
                  const set = (patch: Partial<GraduacaoHistoricoInput>) => setHistorico(historico.map((x, j) => (j === i ? { ...x, ...patch } : x)))
                  return (
                    <div key={i} className="grid sm:grid-cols-[1fr_9rem_1fr_auto] gap-2 items-center">
                      {isJudo ? (
                        <select className={inputCls} value={h.kyu_dan_id ?? ''} onChange={(e) => set({ kyu_dan_id: e.target.value ? Number(e.target.value) : null })}>
                          <option value="">Faixa…</option>
                          {opcoes?.graduacoes.map((g) => <option key={g.id} value={g.id}>{rotuloGraduacao(g)}</option>)}
                        </select>
                      ) : (
                        <input className={inputCls} placeholder="Faixa" value={h.graduacao_texto ?? ''} onChange={(e) => set({ graduacao_texto: e.target.value })} />
                      )}
                      <input type="date" className={inputCls} value={h.data_graduacao ?? ''} onChange={(e) => set({ data_graduacao: e.target.value })} />
                      <input className={inputCls} placeholder="Outorgada por" value={h.entidade ?? ''} onChange={(e) => set({ entidade: e.target.value })} />
                      <button type="button" onClick={() => setHistorico(historico.filter((_, j) => j !== i))} className="p-2 text-slate-500 hover:text-red-400" aria-label="Remover faixa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Secao>

            <Secao titulo="Plano e pagamento na academia">
              <div className="grid sm:grid-cols-2 gap-4">
                <Campo label="Plano" className="sm:col-span-2">
                  <select className={inputCls} value={filiacao.plano_id} onChange={(e) => escolherPlano(e.target.value)}>
                    <option value="">{opcoes?.planos.length ? 'Selecione…' : 'Nenhum plano cadastrado (informe o valor)'}</option>
                    {opcoes?.planos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} · R$ {Number(p.valor).toFixed(2).replace('.', ',')} / {p.periodicidade}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Valor (R$)">
                  <input className={inputCls} inputMode="decimal" value={filiacao.valor} onChange={(e) => setFiliacao({ ...filiacao, valor: e.target.value })} placeholder="0,00" />
                </Campo>
                <Campo label="Parcelas">
                  <select className={inputCls} value={filiacao.parcelas} onChange={(e) => setFiliacao({ ...filiacao, parcelas: e.target.value })}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}
                  </select>
                </Campo>
                <Campo label="Forma de pagamento">
                  <select className={inputCls} value={filiacao.forma_pagamento} onChange={(e) => setFiliacao({ ...filiacao, forma_pagamento: e.target.value })}>
                    <option value="">—</option>
                    {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Dia de vencimento">
                  <input className={inputCls} type="number" min={1} max={31} value={filiacao.dia_vencimento} onChange={(e) => setFiliacao({ ...filiacao, dia_vencimento: e.target.value })} />
                </Campo>
                <Campo label="Início">
                  <input type="date" className={inputCls} value={filiacao.data_inicio} onChange={(e) => setFiliacao({ ...filiacao, data_inicio: e.target.value })} />
                </Campo>
              </div>
            </Secao>

            <div className="flex justify-between gap-3">
              <button onClick={() => setPasso(2)} disabled={salvando} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                Voltar
              </button>
              <button onClick={enviarPasso3} disabled={salvando} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Concluir filiação à academia
              </button>
            </div>
          </>
        )}

        {/* ── Fim ── */}
        {/* ── Passos 4 e 5 ── */}
        {(passo === 4 || passo === 5) && fichaId && (
          <FiliacaoFederacao
            fichaId={fichaId}
            onEtapa={(n) => setPasso(n)}
            onVoltar={() => setPasso(3)}
            onConcluir={(r) => { setResultado(r); setPasso('fim') }}
          />
        )}

        {/* ── Fim ── */}
        {passo === 'fim' && (
          <Secao titulo={resultado?.tipo === 'pago' && resultado.aprovado ? 'Atleta registrado e filiado' : 'Atleta registrado na academia'}>
            <p className="text-slate-300">
              <strong className="text-white">{nome}</strong>{' '}
              {resultado?.tipo === 'pago'
                ? resultado.aprovado
                  ? `está filiado(a) à ${resultado.federacao}. Certificado, carteira digital e amostra do back number foram enviados por ${canal === 'email' ? 'email' : 'email e WhatsApp'}.`
                  : `está registrado(a) e o pagamento da ${resultado.federacao} foi recebido. A federação vai revisar o documento; os documentos são enviados quando ela aprovar.`
                : resultado?.tipo === 'pagamento_pendente'
                  ? `está registrado(a). A filiação à ${resultado.federacao} (${resultado.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) aguarda pagamento: abra este registro de novo para pagar.`
                  : resultado?.tipo === 'ja_filiado'
                    ? `está registrado(a) e já é filiado(a) à ${resultado.federacao}.`
                    : 'está registrado(a) na academia. A filiação à federação pode ser feita depois.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {stakeholderId && (
                <button onClick={() => router.push(`/portal/academia/atletas/${stakeholderId}`)} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-200 hover:bg-white/5">
                  Ver atleta
                </button>
              )}
              <button onClick={() => { window.location.href = '/portal/academia/atletas/novo' }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                <UserPlus className="w-4 h-4" /> Registrar outro atleta
              </button>
            </div>
          </Secao>
        )}
      </div>
    </div>
  )
}
