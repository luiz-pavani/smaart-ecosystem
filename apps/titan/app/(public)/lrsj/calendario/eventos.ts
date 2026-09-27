// Calendário oficial LRSJ 2027 — mesma fonte usada no PDF
// (LRSJ/2027/CALENDÁRIO 2027/calendario-2027.html). Alterou aqui, alterar lá.

export type Circuito = 'LRSJ' | 'SUL' | 'INT' | 'SULBR' | 'NAC'

export interface EventoCalendario {
  data: string // YYYY-MM-DD
  circuito: Circuito
  estrelas: 0 | 1 | 2 | 3 // peso no ranking
  titulo: string
  complementos: string[]
  local: string
}

export const CIRCUITOS: Record<Circuito, { label: string; cor: string }> = {
  LRSJ: { label: 'LRSJ', cor: '#009a44' },
  SUL: { label: 'Circuito Sul', cor: '#d10a11' },
  INT: { label: 'Internacional', cor: '#0480c3' },
  SULBR: { label: 'Sul-Brasileiro', cor: '#f2a200' },
  NAC: { label: 'Nacional', cor: '#4b2a8f' },
}

export const ANO = 2027
export const VERSAO = '27/09/2026'
export const PDF_URL = '/lrsj/calendario-lrsj-2027.pdf'

export const EVENTOS: EventoCalendario[] = [
  { data: '2027-02-21', circuito: 'LRSJ', estrelas: 0, titulo: 'Credenciamento Técnico', complementos: ['Curso de Arbitragem e de Oficiais de Competição — Aula 1 (presencial)'], local: 'Santa Maria, RS' },
  { data: '2027-03-14', circuito: 'SUL', estrelas: 2, titulo: 'Copa Verão de Judô 2027', complementos: ['Premiação dos Destaques 2026'], local: 'Litoral, RS' },
  { data: '2027-04-11', circuito: 'INT', estrelas: 1, titulo: 'Uruguaiana Open Internacional de Judô 2027', complementos: ['Seletiva Sub 13'], local: 'Uruguaiana, RS' },
  { data: '2027-05-16', circuito: 'SUL', estrelas: 2, titulo: '27ª Super Copa Santa Maria de Judô', complementos: ['Seletiva Sub 18'], local: 'Santa Maria, RS' },
  { data: '2027-06-13', circuito: 'SULBR', estrelas: 3, titulo: 'Campeonato Sul-Brasileiro de Judô 2027', complementos: ['Seletiva Sub 15'], local: 'Canoas, RS' },
  { data: '2027-07-11', circuito: 'LRSJ', estrelas: 0, titulo: 'Cursos Presenciais', complementos: [], local: 'Santa Maria e Canoas, RS' },
  { data: '2027-08-15', circuito: 'INT', estrelas: 3, titulo: 'Rivera Open Internacional de Judô 2027', complementos: ['Seletiva'], local: 'Rivera, Uruguai' },
  { data: '2027-09-12', circuito: 'SUL', estrelas: 3, titulo: '27º Campeonato Estadual de Judô', complementos: ['Seletiva Sub 21 e Sênior'], local: 'Santa Maria, RS' },
  { data: '2027-10-10', circuito: 'SUL', estrelas: 0, titulo: 'Copa dos Campeões & Desafio Golden Score', complementos: [], local: 'Júlio de Castilhos, RS' },
  { data: '2027-11-07', circuito: 'LRSJ', estrelas: 0, titulo: 'AGO 2027', complementos: ['Exames de Graduação'], local: 'A definir' },
  { data: '2027-11-28', circuito: 'NAC', estrelas: 0, titulo: 'Campeonato Brasileiro de Judô', complementos: [], local: 'Belo Horizonte, MG' },
]
