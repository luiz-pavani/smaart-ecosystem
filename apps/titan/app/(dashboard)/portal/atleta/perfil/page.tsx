'use client'


import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Award, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilAtletaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [atleta, setAtleta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  useEffect(() => {
    const fetchAtleta = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: role } = await supabase
          .from('user_roles')
          .select('atleta_id')
          .eq('user_id', user.id)
          .not('atleta_id', 'is', null)
          .limit(1)
          .single()

        if (!role?.atleta_id) return

        const { data } = await supabase
          .from('atletas')
          .select('*')
          .eq('id', role.atleta_id)
          .limit(1)
          .single()

        setAtleta(data)
      } catch (error) {
        console.error('Erro ao buscar perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAtleta()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          {/* Content */}
          <div className="max-w-4xl mx-auto px-4 py-12">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Carregando...</div>
              </div>
            ) : atleta ? (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8">
                {/* Profile Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{atleta.nome}</h2>
                    <p className="text-gray-400">CPF: {atleta.cpf}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">
                      {atleta.nome?.[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* ...existing code... */}
                <div className="flex justify-end mb-6">
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                    onClick={() => {
                      setEditData(atleta)
                      setEditModalOpen(true)
                    }}
                  >Editar Perfil</button>
                </div>
                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <h3 className="font-semibold text-white mb-4">Contato</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-300">
                        <Mail className="w-5 h-5" />
                        <span>{atleta.email || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-300">
                        <Phone className="w-5 h-5" />
                        <span>{atleta.celular || 'Não informado'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODAL DE EDIÇÃO */}
                {editModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-slate-900 rounded-xl p-8 w-full max-w-lg relative border border-white/10">
                      <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setEditModalOpen(false)}>
                        <X className="w-6 h-6" />
                      </button>
                      <h2 className="text-2xl font-bold text-white mb-6">Editar Perfil</h2>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const formData = new FormData(form);
                          const updated = {
                            nome: formData.get('nome') as string,
                            email: formData.get('email') as string,
                            celular: formData.get('celular') as string,
                            cidade: formData.get('cidade') as string,
                            estado: formData.get('estado') as string,
                            data_nascimento: formData.get('data_nascimento') as string,
                            nivel: formData.get('nivel') as string,
                          };
                          const { error } = await supabase
                            .from('atletas')
                            .update(updated)
                            .eq('id', editData.id);
                          if (!error) {
                            setAtleta({ ...atleta, ...updated });
                            setEditModalOpen(false);
                          } else {
                            alert('Erro ao salvar: ' + error.message);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-gray-300 mb-1">Nome</label>
                          <input name="nome" defaultValue={editData.nome} className="w-full rounded p-2 bg-slate-800 text-white" required />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Email</label>
                          <input name="email" type="email" defaultValue={editData.email} className="w-full rounded p-2 bg-slate-800 text-white" />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Celular</label>
                          <input name="celular" defaultValue={editData.celular} className="w-full rounded p-2 bg-slate-800 text-white" />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Cidade</label>
                          <input name="cidade" defaultValue={editData.cidade} className="w-full rounded p-2 bg-slate-800 text-white" />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Estado</label>
                          <input name="estado" defaultValue={editData.estado} className="w-full rounded p-2 bg-slate-800 text-white" />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Data de Nascimento</label>
                          <input name="data_nascimento" type="date" defaultValue={editData.data_nascimento} className="w-full rounded p-2 bg-slate-800 text-white" />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Graduação</label>
                          <input name="nivel" defaultValue={editData.nivel} className="w-full rounded p-2 bg-slate-800 text-white" />
                        </div>
                        <div className="flex justify-end mt-6">
                          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all">Salvar</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Perfil não encontrado</div>
              </div>
            )}
              {/* ...existing code... */}

              {/* Location */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Localização</h3>
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 mt-1" />
                  <div>
                    <p>{atleta?.cidade || 'Não informado'}</p>
                    <p className="text-sm">{atleta?.estado || ''}</p>
                  </div>
                </div>
              </div>

              {/* Birth */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Nascimento</h3>
                <p className="text-gray-300">{atleta?.data_nascimento || 'Não informado'}</p>
              </div>

              {/* Graduação */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">Graduação</h3>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-300">{atleta?.nivel || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Edit Button removed: now handled by modal trigger above for best UX */}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">Nenhum perfil encontrado</p>
          </div>
        {/* ...existing code... */}
        {/* Close Content div */}
      </div>
      {/* Close main wrapper div */}
    </div>
  )
}
