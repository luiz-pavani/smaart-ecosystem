'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Edit, Trash2, CheckCircle, Clock, DollarSign } from 'lucide-react'

interface Atleta {
  id: string
  nome_completo: string
  cpf: string
  data_nascimento: string
  graduacao: string
  dan_nivel: string | null
  nivel_arbitragem: string | null
  foto_perfil_url: string | null
  numero_registro: string
  lote: string | null
  status: string
  status_pagamento: string
  academia: {
    id: string
    nome: string
  }
}

export default function AtletasPage() {
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAtletas()
  }, [])

  const loadAtletas = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      // Get user profile to check role
      const { data: perfilData } = await supabase
        .from('user_roles')
        .select('role, federacao_id, academia_id')
        .eq('user_id', user.id)
        .single()

      if (!perfilData) {
        window.location.href = '/login'
        return
      }

      setPerfil(perfilData)

      // Build query based on user role
      let query = supabase
        .from('atletas')
        .select(`
          *,
          academia:academias!atletas_academia_id_fkey (
            id,
            nome
          )
        `)
        .order('created_at', { ascending: false })

      // Filter by role
      if (perfilData.role === 'academia_admin' || perfilData.role === 'academia_staff') {
        query = query.eq('academia_id', perfilData.academia_id)
      } else if (perfilData.role === 'federacao_admin' || perfilData.role === 'federacao_staff') {
        query = query.eq('federacao_id', perfilData.federacao_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching atletas:', error)
      } else {
        setAtletas(data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o atleta "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const response = await fetch(`/api/atletas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir atleta')
      }

      alert('✅ Atleta excluído com sucesso!')
      loadAtletas()
    } catch (error) {
      console.error('Error deleting atleta:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Erro ao excluir atleta'}`)
    }
  }

  // Statistics
  const total = atletas.length
  const ativos = atletas.filter(a => a.status === 'ativo').length
  const faixasPreta = atletas.filter(a => a.graduacao.includes('FAIXA PRETA')).length
  const arbitros = atletas.filter(a => a.nivel_arbitragem).length

  const getBeltColor = (graduacao: string) => {
    if (graduacao.includes('BRANCA')) return 'bg-white text-black border border-gray-300'
    if (graduacao.includes('CINZA')) return 'bg-gray-400 text-white'
    if (graduacao.includes('AZUL')) return 'bg-blue-500 text-white'
    if (graduacao.includes('AMARELA')) return 'bg-yellow-400 text-black'
    if (graduacao.includes('LARANJA')) return 'bg-orange-500 text-white'
    if (graduacao.includes('VERDE')) return 'bg-green-500 text-white'
    if (graduacao.includes('ROXA')) return 'bg-purple-500 text-white'
    if (graduacao.includes('MARROM')) return 'bg-amber-700 text-white'
    if (graduacao.includes('FAIXA PRETA') || graduacao.includes('YUDANSHA')) return 'bg-black text-white'
    return 'bg-gray-200 text-gray-700'
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ativo: 'bg-green-100 text-green-800',
      inativo: 'bg-gray-100 text-gray-800',
      suspenso: 'bg-red-100 text-red-800',
      transferido: 'bg-blue-100 text-blue-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      em_dia: 'bg-green-100 text-green-800',
      pendente: 'bg-yellow-100 text-yellow-800',
      atrasado: 'bg-red-100 text-red-800',
      isento: 'bg-blue-100 text-blue-800',
    }
    const labels: Record<string, string> = {
      em_dia: 'Em dia',
      pendente: 'Pendente',
      atrasado: 'Atrasado',
      isento: 'Isento',
    }
    return { color: colors[status] || 'bg-gray-100 text-gray-800', label: labels[status] || status }
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Atletas</h2>
          <p className="text-muted-foreground">
            Gerencie o cadastro completo dos atletas
          </p>
        </div>
        <Link href="/atletas/novo">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Novo Atleta
          </button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total de Atletas</p>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <p className="text-xs text-muted-foreground">{ativos} ativos</p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Faixas-Pretas</p>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{faixasPreta}</div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((faixasPreta / total) * 100).toFixed(1) : 0}% do total
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Árbitros</p>
            <span className="text-2xl">🥋</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{arbitros}</div>
          <p className="text-xs text-muted-foreground">Com certificação</p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Buscar</p>
            <span className="text-2xl">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Nome ou CPF..."
            className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Athletes Table */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Lista de Atletas</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-muted-foreground">Carregando atletas...</p>
            </div>
          ) : atletas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-6xl mb-4">👥</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum atleta cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece cadastrando o primeiro atleta da sua {perfil?.role?.includes('academia') ? 'academia' : 'federação'}
              </p>
              <Link href="/atletas/novo">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  + Cadastrar Primeiro Atleta
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-muted-foreground">Atleta</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Registro</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Graduação</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Academia</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Lote</th>
                    <th className="text-center p-4 font-medium text-muted-foreground">Status/Pagamento</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {atletas.map((atleta) => {
                    const payment = getPaymentBadge(atleta.status_pagamento)
                    return (
                      <tr key={atleta.id} className="border-b border-border hover:bg-muted">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-foreground">{atleta.nome_completo}</div>
                            <div className="text-xs text-muted-foreground">
                              {atleta.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="text-xs bg-muted text-foreground px-2 py-1 rounded">
                            {atleta.numero_registro}
                          </code>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getBeltColor(atleta.graduacao)}`}>
                            {atleta.graduacao.split('|')[0].split(' ').pop()}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-foreground">{atleta.academia?.nome || '-'}</td>
                        <td className="p-4 text-sm text-foreground text-center">{atleta.lote || '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 text-xs">
                            {atleta.status === 'ativo' ? (
                              <div title="Ativo"><CheckCircle className="w-4 h-4 text-green-600" /></div>
                            ) : (
                              <div title="Inativo"><Clock className="w-4 h-4 text-gray-400" /></div>
                            )}
                            {atleta.status_pagamento === 'em_dia' ? (
                              <div title="Em dia"><DollarSign className="w-4 h-4 text-green-600" /></div>
                            ) : (
                              <div title="Pendente"><DollarSign className="w-4 h-4 text-red-600" /></div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/atletas/${atleta.id}`}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/atletas/${atleta.id}/editar`}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(atleta.id, atleta.nome_completo)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
