import { describe, expect, it } from 'vitest'
import { linhasDaPlanilha, normalizarData, resolverGraduacao, validarLinha, LINHA_VAZIA } from '../lib/registro/lote'

const G = [
  { id: 1, cor_faixa: 'Branca', kyu_dan: 'mūkyū' },
  { id: 4, cor_faixa: 'Cinza e Azul', kyu_dan: '9º kyū' },
  { id: 5, cor_faixa: 'Azul', kyu_dan: '8º kyū' },
  { id: 12, cor_faixa: 'Marrom', kyu_dan: '1º kyū' },
  { id: 13, cor_faixa: 'Preta', kyu_dan: '1º dan' },
  { id: 14, cor_faixa: 'Preta', kyu_dan: '2º dan' },
]

describe('resolverGraduacao', () => {
  it('cor exata não pega faixa combinada', () => expect(resolverGraduacao('azul', G)).toBe(5))
  it('faixa combinada', () => expect(resolverGraduacao('Cinza e azul', G)).toBe(4))
  it('kyu e dan por número', () => {
    expect(resolverGraduacao('1º kyu', G)).toBe(12)
    expect(resolverGraduacao('Preta 2º dan', G)).toBe(14)
    expect(resolverGraduacao('2 DAN', G)).toBe(14)
  })
  it('preta sem grau é 1º dan', () => expect(resolverGraduacao('Preta', G)).toBe(13))
  it('texto desconhecido', () => expect(resolverGraduacao('roxa clara', G)).toBeNull())
})

describe('normalizarData', () => {
  it('formatos brasileiros e ISO', () => {
    expect(normalizarData('10/05/2014')).toBe('2014-05-10')
    expect(normalizarData('1-2-95')).toBe('1995-02-01')
    expect(normalizarData('2014-5-9')).toBe('2014-05-09')
  })
  it('número de série do Excel', () => expect(normalizarData(41769)).toBe('2014-05-10'))
})

describe('linhasDaPlanilha', () => {
  it('mapeia cabeçalhos com variações e prioriza WhatsApp como acesso', () => {
    const [l] = linhasDaPlanilha([{
      'Nome do atleta': 'Ana Souza Lima', 'Nascimento': '10/05/2014', 'Celular': '(51) 98888-7777', 'E-mail': 'ana@x.com',
      'Sexo': 'F', 'RG': '1234567890', 'Graduação': 'Azul', 'Responsável': 'Maria', 'Telefone do responsável': '51977776666', 'Filiar': 'não',
    }], G)
    expect(l).toMatchObject({
      nome_completo: 'Ana Souza Lima', data_nascimento: '2014-05-10', canal: 'whatsapp', contato: '(51) 98888-7777',
      genero: 'Feminino', documento_tipo: 'rg', documento: '1234567890', kyu_dan_id: 5, responsavel_nome: 'Maria', filiar: false,
    })
  })
  it('descarta linhas sem nome', () => expect(linhasDaPlanilha([{ Nome: '' }, { Nome: 'Carlos Pereira' }], G)).toHaveLength(1))
})

describe('validarLinha', () => {
  const base = { ...LINHA_VAZIA, nome_completo: 'Carlos Pereira', data_nascimento: '1995-03-22', contato: '51988887777', kyu_dan_id: 13 }
  it('adulto completo é válido', () => expect(validarLinha(base)).toEqual([]))
  it('menor exige responsável', () => {
    expect(validarLinha({ ...base, data_nascimento: '2015-01-01' })).toContain('responsável (nome e telefone)')
  })
  it('filiar exige faixa', () => expect(validarLinha({ ...base, kyu_dan_id: null })).toContain('faixa (para filiar)'))
  it('email inválido', () => expect(validarLinha({ ...base, canal: 'email', contato: 'x@' })).toContain('email'))
})
