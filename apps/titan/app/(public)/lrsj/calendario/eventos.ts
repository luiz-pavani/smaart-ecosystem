// Calendário oficial LRSJ 2027 — mesma fonte usada no PDF
// (LRSJ/2027/CALENDÁRIO 2027/calendario-2027.html). Alterou aqui, alterar lá.

// Cor por abrangência: azul internacional, amarelo nacional,
// vermelho regional, verde cursos e reuniões
export type Abrangencia = 'INT' | 'NAC' | 'REG' | 'CURSO'

export interface EventoCalendario {
  data: string // YYYY-MM-DD
  abrangencia: Abrangencia
  estrelas: 0 | 1 | 2 | 3 | 4 // peso no ranking
  titulo: string
  complementos: string[]
  local: string
}

export const ABRANGENCIAS: Record<Abrangencia, { label: string; cor: string; texto: string }> = {
  INT: { label: 'Internacional', cor: '#0480c3', texto: '#ffffff' },
  NAC: { label: 'Nacional', cor: '#f5b800', texto: '#111418' },
  REG: { label: 'Regional', cor: '#d10a11', texto: '#ffffff' },
  CURSO: { label: 'Cursos e reuniões', cor: '#009a44', texto: '#ffffff' },
}

export const ANO = 2027
export const VERSAO = '27/09/2026'
export const PDF_URL = '/lrsj/calendario-lrsj-2027.pdf'

export const EVENTOS: EventoCalendario[] = [
  { data: '2027-02-21', abrangencia: 'CURSO', estrelas: 0, titulo: 'Credenciamento Técnico', complementos: ['Curso de Arbitragem e de Oficiais de Competição — Aula 1 (presencial)'], local: 'Santa Maria, RS' },
  { data: '2027-03-14', abrangencia: 'REG', estrelas: 1, titulo: 'Copa Verão de Judô 2027', complementos: ['Premiação dos Destaques 2026'], local: 'Litoral, RS' },
  { data: '2027-04-11', abrangencia: 'INT', estrelas: 2, titulo: 'Uruguaiana Open Internacional de Judô 2027', complementos: ['Seletiva Sub 13'], local: 'Uruguaiana, RS' },
  { data: '2027-05-16', abrangencia: 'REG', estrelas: 2, titulo: '27ª Super Copa Santa Maria de Judô', complementos: ['Seletiva Sub 18'], local: 'Santa Maria, RS' },
  { data: '2027-06-13', abrangencia: 'NAC', estrelas: 3, titulo: 'Campeonato Sul-Brasileiro de Judô 2027', complementos: ['Seletiva Sub 15'], local: 'Canoas, RS' },
  { data: '2027-07-11', abrangencia: 'CURSO', estrelas: 0, titulo: 'Cursos Presenciais', complementos: [], local: 'Santa Maria e Canoas, RS' },
  { data: '2027-08-15', abrangencia: 'INT', estrelas: 2, titulo: 'Rivera Open Internacional de Judô 2027', complementos: ['Seletiva Sênior'], local: 'Rivera, Uruguai' },
  { data: '2027-09-12', abrangencia: 'REG', estrelas: 3, titulo: '27º Campeonato Estadual de Judô', complementos: ['Seletiva Sub 21'], local: 'Santa Maria, RS' },
  { data: '2027-10-10', abrangencia: 'REG', estrelas: 0, titulo: 'Copa dos Campeões & Desafio Golden Score', complementos: [], local: 'Júlio de Castilhos, RS' },
  { data: '2027-11-07', abrangencia: 'CURSO', estrelas: 0, titulo: 'AGO 2027', complementos: ['Exames de Graduação'], local: 'Santa Maria, RS' },
  { data: '2027-11-28', abrangencia: 'NAC', estrelas: 4, titulo: 'Campeonato Brasileiro de Judô', complementos: [], local: 'Belo Horizonte, MG' },
]
