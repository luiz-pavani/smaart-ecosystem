'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AcademiaForm {
  nome: string
  nome_fantasia: string
  sigla: string
  cnpj: string
  endereco_rua: string
  endereco_numero: string
  endereco_complemento: string
  endereco_bairro: string
  endereco_cidade: string
  endereco_estado: string
  endereco_cep: string
  responsavel_nome: string
  responsavel_cpf: string
  responsavel_rg: string
  responsavel_telefone: string
  responsavel_email: string
  responsavel_faixa: string
  tecnico_nome: string
  tecnico_cpf: string
  tecnico_registro_profissional: string
  tecnico_telefone: string
  tecnico_email: string
  horario_funcionamento: string
  quantidade_alunos: string
}

const EMPTY: AcademiaForm = {
  nome: '', nome_fantasia: '', sigla: '', cnpj: '',
  endereco_rua: '', endereco_numero: '', endereco_complemento: '',
  endereco_bairro: '', endereco_cidade: '', endereco_estado: '', endereco_cep: '',
  responsavel_nome: '', responsavel_cpf: '', responsavel_rg: '',
  responsavel_telefone: '', responsavel_email: '', responsavel_faixa: '',
  tecnico_nome: '', tecnico_cpf: '', tecnico_registro_profissional: '',
  tecnico_telefone: '', tecnico_email: '',
  horario_funcionamento: '', quantidade_alunos: '',
}

function Field({ label, name, value, onChange, type = 'text', maxLength }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; maxLength?: number
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  )
}

export default function ConfiguracoesAcademiaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<AcademiaForm>(EMPTY)
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: perfil } = await supabase
          .from('stakeholders')
          .select('academia_id')
          .eq('id', user.id)
          .not('academia_id', 'is', null)
          .limit(1)
          .single()

        if (!perfil?.academia_id) { setError('Academia não encontrada'); return }
        setAcademiaId(perfil.academia_id)

        const { data: academia, error: acadErr } = await supabase
          .from('academias')
          .select('*')
          .eq('id', perfil.academia_id)
          .single()

        if (acadErr || !academia) { setError('Erro ao carregar dados da academia'); return }

        setForm({
          nome: academia.nome || '',
          nome_fantasia: academia.nome_fantasia || '',
          sigla: academia.sigla || '',
          cnpj: academia.cnpj || '',
          endereco_rua: academia.endereco_rua || '',
          endereco_numero: academia.endereco_numero || '',
          endereco_complemento: academia.endereco_complemento || '',
          endereco_bairro: academia.endereco_bairro || '',
          endereco_cidade: academia.endereco_cidade || '',
          endereco_estado: academia.endereco_estado || '',
          endereco_cep: academia.endereco_cep || '',
          responsavel_nome: academia.responsavel_nome || '',
          responsavel_cpf: academia.responsavel_cpf || '',
          responsavel_rg: academia.responsavel_rg || '',
          responsavel_telefone: academia.responsavel_telefone || '',
          responsavel_email: academia.responsavel_email || '',
          responsavel_faixa: academia.responsavel_faixa || '',
          tecnico_nome: academia.tecnico_nome || '',
          tecnico_cpf: academia.tecnico_cpf || '',
          tecnico_registro_profissional: academia.tecnico_registro_profissional || '',
          tecnico_telefone: academia.tecnico_telefone || '',
          tecnico_email: academia.tecnico_email || '',
          horario_funcionamento: academia.horario_funcionamento || '',
          quantidade_alunos: academia.quantidade_alunos?.toString() || '',
        })
      } catch {
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!academiaId) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const { error: updateErr } = await supabase
        .from('academias')
        .update({
          nome: form.nome,
          nome_fantasia: form.nome_fantasia,
          sigla: form.sigla.slice(0, 3).toUpperCase(),
          cnpj: form.cnpj,
          endereco_rua: form.endereco_rua,
          endereco_numero: form.endereco_numero,
          endereco_complemento: form.endereco_complemento,
          endereco_bairro: form.endereco_bairro,
          endereco_cidade: form.endereco_cidade,
          endereco_estado: form.endereco_estado.slice(0, 2).toUpperCase(),
          endereco_cep: form.endereco_cep,
          responsavel_nome: form.responsavel_nome,
          responsavel_cpf: form.responsavel_cpf,
          responsavel_rg: form.responsavel_rg,
          responsavel_telefone: form.responsavel_telefone,
          responsavel_email: form.responsavel_email,
          responsavel_faixa: form.responsavel_faixa,
          tecnico_nome: form.tecnico_nome,
          tecnico_cpf: form.tecnico_cpf,
          tecnico_registro_profissional: form.tecnico_registro_profissional,
          tecnico_telefone: form.tecnico_telefone,
          tecnico_email: form.tecnico_email,
          horario_funcionamento: form.horario_funcionamento,
          quantidade_alunos: form.quantidade_alunos ? parseInt(form.quantidade_alunos) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', academiaId)

      if (updateErr) throw updateErr
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/academia')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Configurações da Academia</h1>
          <p className="text-gray-400 mt-1">Dados institucionais, endereço, responsável e técnico</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400">{error}</div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400">Dados salvos com sucesso!</div>
        )}

        {/* Dados Gerais */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Dados Gerais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Nome" name="nome" value={form.nome} onChange={handleChange} /></div>
            <Field label="Nome Fantasia" name="nome_fantasia" value={form.nome_fantasia} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sigla (3 letras)" name="sigla" value={form.sigla} onChange={handleChange} maxLength={3} />
              <Field label="Quantidade de Alunos" name="quantidade_alunos" value={form.quantidade_alunos} onChange={handleChange} type="number" />
            </div>
            <Field label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} />
            <Field label="Horário de Funcionamento" name="horario_funcionamento" value={form.horario_funcionamento} onChange={handleChange} />
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <div className="col-span-2"><Field label="Rua" name="endereco_rua" value={form.endereco_rua} onChange={handleChange} /></div>
              <Field label="Número" name="endereco_numero" value={form.endereco_numero} onChange={handleChange} />
            </div>
            <Field label="Complemento" name="endereco_complemento" value={form.endereco_complemento} onChange={handleChange} />
            <Field label="Bairro" name="endereco_bairro" value={form.endereco_bairro} onChange={handleChange} />
            <Field label="Cidade" name="endereco_cidade" value={form.endereco_cidade} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estado (UF)" name="endereco_estado" value={form.endereco_estado} onChange={handleChange} maxLength={2} />
              <Field label="CEP" name="endereco_cep" value={form.endereco_cep} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Responsável */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Responsável</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Nome" name="responsavel_nome" value={form.responsavel_nome} onChange={handleChange} /></div>
            <Field label="CPF" name="responsavel_cpf" value={form.responsavel_cpf} onChange={handleChange} />
            <Field label="RG" name="responsavel_rg" value={form.responsavel_rg} onChange={handleChange} />
            <Field label="Telefone" name="responsavel_telefone" value={form.responsavel_telefone} onChange={handleChange} />
            <Field label="Email" name="responsavel_email" value={form.responsavel_email} onChange={handleChange} type="email" />
            <Field label="Faixa" name="responsavel_faixa" value={form.responsavel_faixa} onChange={handleChange} />
          </div>
        </div>

        {/* Técnico */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Técnico Responsável</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Field label="Nome" name="tecnico_nome" value={form.tecnico_nome} onChange={handleChange} /></div>
            <Field label="CPF" name="tecnico_cpf" value={form.tecnico_cpf} onChange={handleChange} />
            <Field label="Registro Profissional" name="tecnico_registro_profissional" value={form.tecnico_registro_profissional} onChange={handleChange} />
            <Field label="Telefone" name="tecnico_telefone" value={form.tecnico_telefone} onChange={handleChange} />
            <Field label="Email" name="tecnico_email" value={form.tecnico_email} onChange={handleChange} type="email" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-semibold rounded-lg transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
