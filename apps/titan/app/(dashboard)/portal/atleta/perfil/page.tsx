'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, User, Mail, Phone, MapPin, Award, Building2, CreditCard, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface KyuDan { id: number; cor_faixa: string; kyu_dan: string; icones?: string }

interface AtletaPerfil {
  stakeholder_id: string
  nome_completo: string | null
  nome_patch: string | null
  genero: string | null
  data_nascimento: string | null
  nacionalidade: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  pais: string | null
  kyu_dan_id: number | null
  academias: string | null
  status_plano: string | null
  status_membro: string | null
  data_expiracao: string | null
  url_foto: string | null
  tamanho_patch: string | null
}

const statusColor = (s: string | null) => {
  if (s === 'Válido' || s === 'Aceito') return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (s === 'Vencido' || s === 'Rejeitado') return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right">{value || '—'}</span>
    </div>
  )
}

export default function PerfilAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [atleta, setAtleta] = useState<AtletaPerfil | null>(null)
  const [kyuDan, setKyuDan] = useState<KyuDan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Usuário não autenticado'); return }

        const [{ data: fedData, error: fedErr }, { data: kdData }] = await Promise.all([
          supabase.from('user_fed_lrsj').select('*').eq('stakeholder_id', user.id).maybeSingle(),
          supabase.from('kyu_dan').select('id, cor_faixa, kyu_dan, icones').order('id'),
        ])

        if (fedErr) throw fedErr

        if (fedData) {
          setAtleta(fedData as AtletaPerfil)
          const kd = (kdData || []).find((k: KyuDan) => k.id === fedData.kyu_dan_id)
          setKyuDan(kd || null)
        }
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar seu perfil')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/portal/atleta')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
          <p className="text-gray-400 mt-1">Dados pessoais e de filiação na federação</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-200 mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : atleta ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {atleta.url_foto ? (
                  <img src={atleta.url_foto} alt={atleta.nome_completo || ''} className="w-28 h-28 object-cover rounded-xl border-4 border-white/10 shrink-0" />
                ) : (
                  <div className="w-28 h-28 bg-blue-500/20 rounded-xl border-4 border-white/10 flex items-center justify-center shrink-0">
                    <User className="w-14 h-14 text-blue-300" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{atleta.nome_completo || '—'}</h2>
                  {atleta.nome_patch && <p className="text-gray-400 text-sm mb-3">"{atleta.nome_patch}"</p>}
                  <div className="flex flex-wrap gap-2">
                    {kyuDan && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {kyuDan.icones ? `${kyuDan.icones} ` : ''}{kyuDan.cor_faixa} | {kyuDan.kyu_dan}
                      </span>
                    )}
                    {atleta.academias && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-orange-500/20 text-orange-300 border-orange-500/30">
                        🥋 {atleta.academias}
                      </span>
                    )}
                    {atleta.status_plano && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(atleta.status_plano)}`}>
                        Plano {atleta.status_plano}
                      </span>
                    )}
                    {atleta.status_membro && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor(atleta.status_membro)}`}>
                        {atleta.status_membro}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => router.push('/configuracoes')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shrink-0"
                >
                  <Settings className="w-4 h-4" />
                  Editar Perfil
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados Pessoais */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Dados Pessoais</h3>
                </div>
                <Row label="Gênero" value={atleta.genero} />
                <Row label="Data de Nascimento" value={atleta.data_nascimento} />
                <Row label="Nacionalidade" value={atleta.nacionalidade} />
                <Row label="Tamanho do Patch" value={atleta.tamanho_patch} />
              </div>

              {/* Contato */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Contato</h3>
                </div>
                <Row label="Email" value={atleta.email} />
                <Row label="Telefone" value={atleta.telefone} />
                <Row label="Cidade" value={atleta.cidade} />
                <Row label="Estado" value={atleta.estado} />
                <Row label="País" value={atleta.pais} />
              </div>

              {/* Graduação */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Graduação</h3>
                </div>
                <Row
                  label="Faixa"
                  value={kyuDan ? `${kyuDan.cor_faixa} | ${kyuDan.kyu_dan}` : '—'}
                />
              </div>

              {/* Filiação */}
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Filiação</h3>
                </div>
                <Row label="Academia" value={atleta.academias} />
                <Row label="Status do Plano" value={atleta.status_plano} />
                <Row label="Status do Membro" value={atleta.status_membro} />
                <Row label="Validade" value={atleta.data_expiracao} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
            <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum perfil de filiação encontrado</p>
            <p className="text-gray-500 text-sm mt-1">Entre em contato com sua academia ou federação</p>
          </div>
        )}
      </div>
    </div>
  )
}
