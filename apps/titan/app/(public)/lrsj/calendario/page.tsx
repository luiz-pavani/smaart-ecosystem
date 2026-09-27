import type { Metadata } from 'next'
import { CalendarDays, Download, MapPin, Star } from 'lucide-react'
import { ANO, CIRCUITOS, EVENTOS, PDF_URL, VERSAO } from './eventos'

export const metadata: Metadata = {
  title: `Calendário ${ANO} · Liga Riograndense de Judô`,
  description: `Calendário oficial de eventos, seletivas e cursos da LRSJ em ${ANO}.`,
}

// Revalida a cada hora para "próximo evento" e eventos passados andarem sozinhos
export const revalidate = 3600

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function parse(data: string) {
  const [y, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export default function CalendarioPublicoPage() {
  // "Hoje" no fuso de Brasília, como data pura
  const hoje = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00Z')
  const proximo = EVENTOS.find((e) => parse(e.data) >= hoje)

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Header */}
      <header className="relative overflow-hidden bg-zinc-950 text-white">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-10 select-none text-[11rem] font-black leading-none tracking-tighter text-white/[0.05] md:text-[16rem]"
        >
          {ANO}
        </span>
        <div className="relative mx-auto flex max-w-4xl items-center gap-5 px-4 py-8 sm:px-6 md:py-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lrsj/logo-lrsj.png"
            alt="LRSJ"
            className="h-20 w-16 flex-shrink-0 rounded-xl bg-white object-contain p-1.5 md:h-24 md:w-20"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Liga Riograndense de Judô
            </p>
            <h1 className="mt-1 text-4xl font-black uppercase leading-none tracking-tight md:text-5xl">
              Calendário <span className="text-red-600">{ANO}</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-300">Eventos oficiais, seletivas e cursos da temporada</p>
          </div>
        </div>
        <div className="flex h-1.5">
          <div className="flex-1 bg-[#009a44]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#d10a11]" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <CalendarDays className="h-4 w-4" />
            {EVENTOS.length} datas · versão de {VERSAO}
          </p>
          <a
            href={PDF_URL}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            <Download className="h-4 w-4" /> Baixar PDF
          </a>
        </div>

        <ol className="space-y-3">
          {EVENTOS.map((e) => {
            const d = parse(e.data)
            const c = CIRCUITOS[e.circuito]
            const passado = d < hoje
            const destaque = e === proximo
            return (
              <li
                key={e.data + e.titulo}
                className={`relative grid grid-cols-[4.25rem_1fr] gap-4 rounded-xl border bg-white p-4 shadow-sm transition sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:p-5 ${
                  destaque ? 'border-zinc-900 ring-2 ring-zinc-900' : 'border-zinc-200'
                } ${passado ? 'opacity-50' : ''}`}
              >
                <div className="border-l-[6px] pl-3" style={{ borderColor: c.cor }}>
                  <div className="text-4xl font-black leading-none tabular-nums">{d.getUTCDate()}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    {MESES[d.getUTCMonth()]}
                  </div>
                  <div className="text-[10px] text-zinc-400">{DIAS[d.getUTCDay()]}</div>
                </div>

                <div className="min-w-0">
                  {destaque && (
                    <span className="mb-1 inline-block rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                      Próximo evento
                    </span>
                  )}
                  <h2 className="text-lg font-extrabold uppercase leading-tight tracking-tight md:text-xl">
                    {e.titulo}
                  </h2>
                  {e.complementos.length > 0 && (
                    <p className="mt-1 text-sm font-medium text-zinc-600">{e.complementos.join(' · ')}</p>
                  )}
                  {/* Meta no mobile */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <Meta cor={c.cor} label={c.label} estrelas={e.estrelas} local={e.local} />
                  </div>
                </div>

                <div className="hidden flex-col items-end gap-1.5 text-right sm:flex">
                  <Meta cor={c.cor} label={c.label} estrelas={e.estrelas} local={e.local} />
                </div>
              </li>
            )
          })}
        </ol>

        <footer className="mt-8 border-t border-zinc-200 pt-5">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
            {Object.values(CIRCUITOS).map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5">
                <i className="inline-block h-3 w-3 rounded-sm" style={{ background: c.cor }} />
                {c.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-zinc-500" /> Peso no ranking
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">Datas sujeitas a alteração.</p>
        </footer>
      </main>
    </div>
  )
}

function Meta({ cor, label, estrelas, local }: { cor: string; label: string; estrelas: number; local: string }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
          style={{ background: cor }}
        >
          {label}
        </span>
        {estrelas > 0 && (
          <span className="inline-flex" aria-label={`Peso ${estrelas} no ranking`}>
            {Array.from({ length: estrelas }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5" style={{ color: cor, fill: cor }} />
            ))}
          </span>
        )}
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700">
        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
        {local}
      </span>
    </>
  )
}
