import Link from 'next/link'
import { Award, CreditCard, FileText, ShieldCheck, ShieldX, Shirt } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarEntrega, temCertificadoKyu } from '@/lib/registro/federacao'
import { resolveAssetUrl } from '@/lib/pdf/atletaDocumentos'
import BackNumberAmostra from './BackNumberAmostra'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Documentos do atleta — Titan', robots: { index: false, follow: false } }

function Cartao({ icone: Icone, titulo, children }: { icone: typeof Award; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icone className="h-5 w-5 text-green-700" />
        <h2 className="font-bold text-slate-900">{titulo}</h2>
      </div>
      {children}
    </section>
  )
}

const botao = 'inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800'

export default async function DocumentosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const entrega = await carregarEntrega(token)

  if (!entrega) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldX className="mx-auto mb-4 h-10 w-10 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Link inválido ou expirado</h1>
        <p className="mt-2 text-slate-600">Entre no Titan para ver seus documentos ou peça um novo link à sua academia.</p>
        <Link href="/acesso" className={`${botao} mt-6`}>Entrar no Titan</Link>
      </main>
    )
  }

  const [{ data: atleta }, { data: filiacao }, { data: federacao }, { data: templates }] = await Promise.all([
    supabaseAdmin.from('stakeholders').select('nome_completo, academia_id').eq('id', entrega.stakeholder_id).maybeSingle(),
    supabaseAdmin
      .from('stakeholder_filiacoes')
      .select('status_membro, data_expiracao, kyu_dan_id, nome_patch, tamanho_patch, cor_patch, siglas, academia_id, url_foto')
      .eq('stakeholder_id', entrega.stakeholder_id)
      .eq('federacao_id', entrega.federacao_id)
      .maybeSingle(),
    supabaseAdmin.from('federacoes').select('nome, sigla').eq('id', entrega.federacao_id).maybeSingle(),
    supabaseAdmin
      .from('document_templates')
      .select('template_type, background_url')
      .in('template_type', ['backnumber_azul', 'backnumber_rosa'])
      .eq('is_active', true),
  ])

  const ativa = !!filiacao && ['ativo', 'aprovado'].includes(filiacao.status_membro ?? '')
  const academiaId = filiacao?.academia_id ?? atleta?.academia_id
  const [{ data: academia }, { data: kd }] = await Promise.all([
    academiaId
      ? supabaseAdmin.from('academias').select('nome, sigla').eq('id', academiaId).maybeSingle()
      : Promise.resolve({ data: null }),
    filiacao?.kyu_dan_id
      ? supabaseAdmin.from('kyu_dan').select('kyu_dan, cor_faixa').eq('id', filiacao.kyu_dan_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const nome = atleta?.nome_completo ?? 'Atleta'
  const fed = federacao?.sigla || federacao?.nome || 'Federação'
  const validade = filiacao?.data_expiracao ? new Date(filiacao.data_expiracao + 'T00:00:00').toLocaleDateString('pt-BR') : null
  const cor = (filiacao?.cor_patch?.toUpperCase() === 'ROSA' ? 'ROSA' : 'AZUL') as 'AZUL' | 'ROSA'
  const tam = filiacao?.tamanho_patch?.toUpperCase().charAt(0)
  const tamanho = (tam === 'P' || tam === 'M' ? tam : 'G') as 'P' | 'M' | 'G'
  const fundo = templates?.find((t) => t.template_type === `backnumber_${cor.toLowerCase()}`)?.background_url

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <header className="flex items-center gap-4">
          {filiacao?.url_foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={filiacao.url_foto} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow" />
          ) : null}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">{fed}</p>
            <h1 className="text-2xl font-bold text-slate-900">{nome}</h1>
            <p className={`mt-1 inline-flex items-center gap-1 text-sm ${ativa ? 'text-green-700' : 'text-amber-700'}`}>
              {ativa ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
              {ativa ? `Filiação ativa${validade ? ` até ${validade}` : ''}` : 'Filiação não está ativa'}
            </p>
          </div>
        </header>

        {!ativa ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Os documentos ficam disponíveis enquanto a filiação estiver ativa. Fale com a sua academia.
          </p>
        ) : (
          <>
            <Cartao icone={Award} titulo="Certificado de graduação">
              {temCertificadoKyu(filiacao!.kyu_dan_id) ? (
                <>
                  <p className="mb-3 text-sm text-slate-600">{kd ? `${kd.cor_faixa} — ${kd.kyu_dan}` : 'Graduação registrada'}</p>
                  <a href={`/api/documentos/${token}/certificado`} target="_blank" rel="noopener" className={botao}>
                    <FileText className="h-4 w-4" /> Baixar certificado (PDF)
                  </a>
                </>
              ) : (
                <p className="text-sm text-slate-600">O certificado de faixa preta é emitido pela {fed} após o exame de graduação.</p>
              )}
            </Cartao>

            <Cartao icone={CreditCard} titulo="Carteira digital de atleta">
              <p className="mb-3 text-sm text-slate-600">Mostre a carteira em competições. O QR code confirma a filiação.</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/carteira/${entrega.stakeholder_id}`} className={botao}>
                  <CreditCard className="h-4 w-4" /> Abrir carteira
                </Link>
                <a href={`/api/documentos/${token}/identidade`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  <FileText className="h-4 w-4" /> Identidade em PDF
                </a>
              </div>
            </Cartao>

            <Cartao icone={Shirt} titulo="Back number">
              <p className="mb-3 text-sm text-slate-600">
                Amostra do patch das costas (tamanho {tamanho}). O back number oficial será produzido e entregue pela sua academia.
              </p>
              <BackNumberAmostra
                dados={{
                  nome_completo: nome,
                  nome_patch: filiacao!.nome_patch || nome,
                  academia: academia?.nome ?? '',
                  sigla: filiacao!.siglas || academia?.sigla || '',
                  tamanho,
                  cor,
                }}
                fundoUrl={fundo ? resolveAssetUrl(fundo) : null}
              />
            </Cartao>
          </>
        )}

        <p className="pt-4 text-center text-xs text-slate-500">
          O certificado e a carteira também podem ser baixados na sua conta de aluno do Titan (Portal do Atleta → Perfil e Carteira).{' '}
          <Link href="/acesso" className="underline">Entrar</Link>
        </p>
      </div>
    </main>
  )
}
