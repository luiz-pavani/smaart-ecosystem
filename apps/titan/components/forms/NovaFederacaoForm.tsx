'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Landmark, Save, Loader2 } from 'lucide-react'

export default function NovaFederacaoForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    sigla: '',
    cnpj: '',
    email: '',
    telefone: '',
    site: '',
    endereco_cep: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    cor_primaria: '#16A34A',
    cor_secundaria: '#DC2626',
    logo_url: '',
  })

  const emptyToNull = (value: string) => {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  const resolveStakeholderId = async (email: string, fallbackUserId: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return fallbackUserId

    const { data, error } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1)

    if (error || !data || data.length === 0) return fallbackUserId
    return data[0].id as string
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const normalizedEmail = formData.email.trim().toLowerCase()
      const stakeholderId = await resolveStakeholderId(normalizedEmail, user.id)

      const payload = {
        nome: formData.nome.trim(),
        sigla: formData.sigla.trim().toUpperCase(),
        cnpj: emptyToNull(formData.cnpj),
        email: emptyToNull(normalizedEmail),
        telefone: emptyToNull(formData.telefone),
        site: emptyToNull(formData.site),
        endereco_cep: emptyToNull(formData.endereco_cep),
        endereco_rua: emptyToNull(formData.endereco_rua),
        endereco_numero: emptyToNull(formData.endereco_numero),
        endereco_complemento: emptyToNull(formData.endereco_complemento),
        endereco_bairro: emptyToNull(formData.endereco_bairro),
        endereco_cidade: emptyToNull(formData.endereco_cidade),
        endereco_estado: emptyToNull(formData.endereco_estado)?.toUpperCase() ?? null,
        cor_primaria: emptyToNull(formData.cor_primaria) ?? '#16A34A',
        cor_secundaria: emptyToNull(formData.cor_secundaria) ?? '#DC2626',
        logo_url: emptyToNull(formData.logo_url),
        ativo: true,
        stakeholder_id: stakeholderId,
      }

      const { error } = await supabase
        .from('federacoes')
        .insert([payload])

      if (error) throw error

      alert('Federação cadastrada com sucesso!')
      router.push('/federacoes')
      router.refresh()
    } catch (err) {
      console.error('Error:', err)
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Erro ao cadastrar federação'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="w-8 h-8 text-primary" />
            Nova Federação
          </h1>
          <p className="text-muted-foreground mt-2">
            Cadastre uma nova federação
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">Dados da Federação</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Sigla</label>
                <input
                  type="text"
                  value={formData.sigla}
                  onChange={(e) => setFormData({ ...formData, sigla: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CNPJ</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Site</label>
              <input
                type="text"
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">Endereço</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CEP</label>
                <input
                  type="text"
                  value={formData.endereco_cep}
                  onChange={(e) => setFormData({ ...formData, endereco_cep: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Estado (UF)</label>
                <input
                  type="text"
                  value={formData.endereco_estado}
                  onChange={(e) => setFormData({ ...formData, endereco_estado: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Rua</label>
              <input
                type="text"
                value={formData.endereco_rua}
                onChange={(e) => setFormData({ ...formData, endereco_rua: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Número</label>
                <input
                  type="text"
                  value={formData.endereco_numero}
                  onChange={(e) => setFormData({ ...formData, endereco_numero: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Complemento</label>
                <input
                  type="text"
                  value={formData.endereco_complemento}
                  onChange={(e) => setFormData({ ...formData, endereco_complemento: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.endereco_bairro}
                  onChange={(e) => setFormData({ ...formData, endereco_bairro: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                <input
                  type="text"
                  value={formData.endereco_cidade}
                  onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
            <h2 className="text-lg font-bold text-foreground">Branding</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cor Primaria</label>
                <input
                  type="text"
                  value={formData.cor_primaria}
                  onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cor Secundaria</label>
                <input
                  type="text"
                  value={formData.cor_secundaria}
                  onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Logo URL</label>
              <input
                type="text"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Federação
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
