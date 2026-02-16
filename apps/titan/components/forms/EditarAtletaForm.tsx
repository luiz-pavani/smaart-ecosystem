'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

const GRADUACOES = [
  'BRANCA | MÚKYŪ',
  'CINZA | NANA-KYU',
  'AZUL | ROKKYŪ',
  'AMARELA | GOKYŪ',
  'LARANJA | YONKYŪ',
  'VERDE | SANKYŪ',
  'ROXA | NIKYŪ',
  'MARROM | IKKYŪ',
  'FAIXA PRETA | YUDANSHA',
  'FAIXA VERMELHA/BRANCA | KODANSHA',
]

const DAN_NIVEIS = ['SHODAN', 'NIDAN', 'SANDAN', 'YONDAN', 'GODAN', 'ROKUDAN', 'NANADAN', 'HACHIDAN']

const NIVEIS_ARBITRAGEM = [
  'Estadual C',
  'Estadual B',
  'Estadual A',
  'Nacional C',
  'Nacional B',
  'Nacional A',
  'Internacional C',
  'Internacional B',
  'Internacional A',
]

const TAMANHOS_BN = [
  'PEQUENO AZUL (28 cm2) - recomendado até 9 anos',
  'PEQUENO ROSA (28 cm2) - recomendado até 9 anos',
  'MÉDIO (34 cm2)',
  'GRANDE (41 cm2)',
]

const STATUS_OPTIONS = ['ativo', 'inativo', 'suspenso', 'transferido']
const PAGAMENTO_OPTIONS = ['em_dia', 'pendente', 'atrasado', 'isento']

interface EditarAtletaFormProps {
  atleta: any
  academiasDisponiveis: Array<{ id: string; nome: string }>
  role: string
}

export function EditarAtletaForm({
  atleta,
  academiasDisponiveis,
  role,
}: EditarAtletaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    nome_completo: atleta.nome_completo || '',
    cpf: atleta.cpf || '',
    rg: atleta.rg || '',
    data_nascimento: atleta.data_nascimento || '',
    genero: atleta.genero || '',
    email: atleta.email || '',
    celular: atleta.celular || '',
    instagram: atleta.instagram || '',
    cep: atleta.cep || '',
    endereco: atleta.endereco || '',
    numero: atleta.numero || '',
    complemento: atleta.complemento || '',
    bairro: atleta.bairro || '',
    cidade: atleta.cidade || '',
    estado: atleta.estado || '',
    graduacao: atleta.graduacao || '',
    dan_nivel: atleta.dan_nivel || '',
    data_graduacao: atleta.data_graduacao || '',
    nivel_arbitragem: atleta.nivel_arbitragem || '',
    numero_diploma_dan: atleta.numero_diploma_dan || '',
    academia_id: atleta.academia_id || '',
    lote: atleta.lote || '',
    backnumber_tamanho: atleta.backnumber_tamanho || '',
    backnumber_nome: atleta.backnumber_nome || '',
    backnumber_dourado: atleta.backnumber_dourado || false,
    status: atleta.status || 'ativo',
    status_pagamento: atleta.status_pagamento || 'pendente',
    observacoes: atleta.observacoes || '',
  })

  const isFaixaPreta = formData.graduacao.includes('FAIXA PRETA') || formData.graduacao.includes('KODANSHA')
  const isAdmin = role === 'federacao_admin' || role === 'academia_admin'

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const uploadData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value) uploadData.append(key, value)
      })

      const response = await fetch(`/api/atletas/${atleta.id}`, {
        method: 'PUT',
        body: uploadData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar atleta')
      }

      alert('Atleta atualizado com sucesso!')
      router.push(`/atletas/${atleta.id}`)
      router.refresh()
    } catch (error) {
      console.error('Erro:', error)
      alert(error instanceof Error ? error.message : 'Erro ao atualizar atleta')
    } finally {
      setLoading(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/atletas/${atleta.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Editar Atleta</h2>
            <p className="text-muted-foreground">Atualize os dados do atleta</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Pessoais */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Dados Pessoais</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CPF *</label>
                <input
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">RG</label>
                <input
                  type="text"
                  value={formData.rg}
                  onChange={(e) => handleChange('rg', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_nascimento}
                  onChange={(e) => handleChange('data_nascimento', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Gênero *</label>
                <select
                  required
                  value={formData.genero}
                  onChange={(e) => handleChange('genero', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Contato</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Celular *</label>
                <input
                  type="tel"
                  required
                  value={formData.celular}
                  onChange={(e) => handleChange('celular', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Instagram</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="@usuario"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Endereço</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">CEP</label>
              <input
                type="text"
                value={formData.cep}
                onChange={(e) => handleChange('cep', e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Logradouro</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Número</label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Complemento</label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => handleChange('complemento', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Graduação */}
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Graduação e Certificações</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Graduação Atual *
              </label>
              <select
                required
                value={formData.graduacao}
                onChange={(e) => handleChange('graduacao', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecione a graduação</option>
                {GRADUACOES.map((grad) => (
                  <option key={grad} value={grad}>
                    {grad}
                  </option>
                ))}
              </select>
            </div>

            {isFaixaPreta && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nível Dan</label>
                  <select
                    value={formData.dan_nivel}
                    onChange={(e) => handleChange('dan_nivel', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Selecione o nível Dan</option>
                    {DAN_NIVEIS.map((dan) => (
                      <option key={dan} value={dan}>
                        {dan}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Número do Diploma Dan
                  </label>
                  <input
                    type="text"
                    value={formData.numero_diploma_dan}
                    onChange={(e) => handleChange('numero_diploma_dan', e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Data da Graduação
              </label>
              <input
                type="date"
                value={formData.data_graduacao}
                onChange={(e) => handleChange('data_graduacao', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nível de Arbitragem
              </label>
              <select
                value={formData.nivel_arbitragem}
                onChange={(e) => handleChange('nivel_arbitragem', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Nenhum</option>
                {NIVEIS_ARBITRAGEM.map((nivel) => (
                  <option key={nivel} value={nivel}>
                    {nivel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kit de Filiação */}
        <div className="bg-card rounded-lg shadow border border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Kit de Filiação</h3>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-2">
            <p className="text-sm text-blue-900 font-medium">O kit de filiação inclui:</p>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>Identidade Esportiva</li>
              <li>Certificado de Graduação</li>
              <li>Backnumber (Patch)</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Lote</label>
              <input
                type="text"
                value={formData.lote}
                onChange={(e) => handleChange('lote', e.target.value)}
                placeholder="2026 1"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-md font-semibold text-foreground mb-3">Backnumber (Patch)</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tamanho do Patch
                </label>
                <select
                  value={formData.backnumber_tamanho}
                  onChange={(e) => handleChange('backnumber_tamanho', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione o tamanho</option>
                  {TAMANHOS_BN.map((tamanho) => (
                    <option key={tamanho} value={tamanho}>
                      {tamanho}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Tamanho do patch para as costas do casaco do judogi
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome no Patch
                </label>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="Máximo 14 caracteres"
                  value={formData.backnumber_nome}
                  onChange={(e) => handleChange('backnumber_nome', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                  <p className="text-xs text-yellow-900 font-medium mb-1">
                    ⚠️ ATENÇÃO - NOME NO BACKNUMBER (PATCH):
                  </p>
                  <p className="text-xs text-yellow-800">
                    O NOME NO PATCH DEVERÁ SER INFORMADO COM NO MÁXIMO 14 CARACTERES (LETRAS E ESPAÇOS). 
                    NOME /OU/ SOBRENOME /OU/ NOME E SOBRENOME /OU/ INICIAL DO NOME E SOBRENOME.
                  </p>
                  <p className="text-xs text-red-700 font-semibold mt-1">
                    * NÃO SERÃO ACEITOS SOBRENOMES ABREVIADOS OU APELIDOS.
                  </p>
                  {formData.backnumber_nome && (
                    <p className="text-xs text-blue-700 mt-2">
                      Caracteres utilizados: {formData.backnumber_nome.length}/14
                    </p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="backnumber_dourado"
                    checked={formData.backnumber_dourado}
                    onChange={(e) => handleChange('backnumber_dourado', String(e.target.checked))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="backnumber_dourado" className="text-sm font-medium text-foreground">
                    BN DOURADO (apenas para administradores)
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Administrativo */}
        <div className="bg-card rounded-lg shadow border border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Informações Administrativas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Academia *</label>
              <select
                required
                value={formData.academia_id}
                onChange={(e) => handleChange('academia_id', e.target.value)}
                disabled={role === 'academia_admin' || role === 'academia_staff'}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Selecione</option>
                {academiasDisponiveis.map((academia) => (
                  <option key={academia.id} value={academia.id}>
                    {academia.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status de Pagamento
              </label>
              <select
                value={formData.status_pagamento}
                onChange={(e) => handleChange('status_pagamento', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {PAGAMENTO_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-foreground mb-2">Observações</label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Observações adicionais sobre o atleta..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

