import { describe, expect, it } from 'vitest'
import { comparar, nomesBatem, type ExtracaoDocumento } from '../lib/registro/verificacao-documento'

const ext = (p: Partial<ExtracaoDocumento>): ExtracaoDocumento => ({
  legivel: true,
  tipo_documento: 'RG',
  nome: null,
  data_nascimento: null,
  cpf: null,
  rg: null,
  sinais_de_problema: [],
  ...p,
})

describe('nomesBatem', () => {
  it('ignora acentos, caixa e pontuação', () => {
    expect(nomesBatem('Ana Souza Lima', 'ANA SOUZA LIMA')).toBe(true)
    expect(nomesBatem('João Conceição', 'JOAO CONCEICAO')).toBe(true)
  })
  it('aceita partículas e nome do meio abreviado', () => {
    expect(nomesBatem('Maria da Silva Santos', 'MARIA SILVA SANTOS')).toBe(true)
    expect(nomesBatem('Pedro H Alves', 'PEDRO HENRIQUE ALVES')).toBe(true)
  })
  it('aceita cadastro mais curto que o documento, com mesmo primeiro e último nome', () => {
    expect(nomesBatem('Lucas Pereira', 'LUCAS GABRIEL MOURA PEREIRA')).toBe(true)
  })
  it('rejeita primeiro ou último nome diferente', () => {
    expect(nomesBatem('Ana Souza Lima', 'ANA SOUZA COSTA')).toBe(false)
    expect(nomesBatem('Ana Souza Lima', 'BRUNA SOUZA LIMA')).toBe(false)
  })
  it('rejeita nome do meio que não existe no documento', () => {
    expect(nomesBatem('Ana Beatriz Lima', 'ANA SOUZA LIMA')).toBe(false)
  })
  it('rejeita documento sem nome', () => {
    expect(nomesBatem('Ana Lima', null)).toBe(false)
  })
})

describe('comparar', () => {
  const cadastro = { nome: 'Ana Souza Lima', data_nascimento: '2014-05-10', cpf: '123.456.789-09', rg: null }

  it('confere nome, nascimento e CPF formatado diferente', () => {
    const r = comparar(cadastro, ext({ nome: 'ANA SOUZA LIMA', data_nascimento: '2014-05-10', cpf: '12345678909' }))
    expect(r.map((c) => [c.campo, c.ok])).toEqual([['nome', true], ['data_nascimento', true], ['cpf', true]])
  })
  it('acusa data de nascimento divergente', () => {
    const r = comparar(cadastro, ext({ nome: 'ANA SOUZA LIMA', data_nascimento: '2014-10-05' }))
    expect(r.find((c) => c.campo === 'data_nascimento')?.ok).toBe(false)
  })
  it('só compara CPF/RG quando existem dos dois lados', () => {
    const r = comparar({ ...cadastro, cpf: null }, ext({ nome: 'ANA SOUZA LIMA', data_nascimento: '2014-05-10', cpf: '12345678909' }))
    expect(r.map((c) => c.campo)).toEqual(['nome', 'data_nascimento'])
  })
  it('compara RG sem pontuação', () => {
    const r = comparar({ ...cadastro, cpf: null, rg: '12.345.678-x' }, ext({ nome: 'ANA SOUZA LIMA', data_nascimento: '2014-05-10', rg: '12345678X' }))
    expect(r.find((c) => c.campo === 'rg')?.ok).toBe(true)
  })
})
