'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Edit, Trash2, CheckCircle, Clock, DollarSign, Settings2 } from 'lucide-react'
import { getBeltColorClasses, getGraduationDisplayText, getGraduationTooltip, getDualOvalBadges } from '@/lib/utils/graduacao'
import { useColumnOrder } from '@/hooks/useColumnOrder'
import ColumnOrderDialog from '@/components/ColumnOrderDialog'

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

const PER_PAGE = 50

export default function AtletasPage() {
  const [atletas, setAtletas] = useState<Atleta[]>([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const supabase = createClient()
  const { columns, isLoaded, moveColumn, resetToDefault } = useColumnOrder()

  useEffect(() => {
    loadAtletas(page)
  }, [page])

  const loadAtletas = async (currentPage: number) => {
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
      const { data: perfilArray } = await supabase
        .from('stakeholders')
        .select('role, federacao_id, academia_id')
        .eq('id', user.id)
        .limit(1)

      const perfilData = perfilArray?.[0]

      if (!perfilData) {
        window.location.href = '/login'
        return
      }

      setPerfil(perfilData)

      // Build query based on user role
      const from = (currentPage - 1) * PER_PAGE
      const to = from + PER_PAGE - 1

      let query = supabase
        .from('stakeholders')
        .select(`
          *,
          academia:academias!stakeholders_academia_id_fkey (
            id,
            nome
          )
        `, { count: 'exact' })
        .eq('role', 'atleta')
        .order('created_at', { ascending: false })
        .range(from, to)

      // Filter by role
      if (perfilData.role === 'academia_admin' || perfilData.role === 'academia_staff') {
        query = query.eq('academia_id', perfilData.academia_id)
      } else if (perfilData.role === 'federacao_admin' || perfilData.role === 'federacao_staff') {
        query = query.eq('federacao_id', perfilData.federacao_id)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching atletas:', error)
      } else {
        setAtletas(data || [])
        setTotal(count ?? 0)
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

  // Statistics (page-local counts for current page; total from server)
  const ativos = atletas.filter(a => a.status === 'ativo').length
  const faixasPreta = atletas.filter(a => a.graduacao.includes('FAIXA PRETA')).length
  const arbitros = atletas.filter(a => a.nivel_arbitragem).length

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
        <div className="flex gap-2">
          <button
            onClick={() => setColumnDialogOpen(true)}
            className="bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            title="Reordenar colunas"
          >
            <Settings2 className="w-4 h-4" />
            Colunas
          </button>
          <Link href="/atletas/novo">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Novo Atleta
            </button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total de Atletas</p>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <p className="text-xs text-muted-foreground">{ativos} ativos nesta página</p>
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
                          <div className="flex items-center gap-2">
                            {(() => {
                              const badges = getDualOvalBadges(atleta.graduacao, atleta.dan_nivel)
                              return (
                                <>
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border border-gray-300"
                                    style={{
                                      backgroundColor: badges.left.rgb,
                                      color: badges.left.text === 'text-white' ? 'white' : 'black',
                                    }}
                                    title={`${getGraduationDisplayText(atleta.graduacao, atleta.dan_nivel)}`}
                                  >
                                    {badges.danNumber ? String(badges.danNumber) : ''}
                                  </div>
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border border-gray-300"
                                    style={{
                                      backgroundColor: badges.right.rgb,
                                      color: badges.right.text === 'text-white' ? 'white' : 'black',
                                    }}
                                  />
                                </>
                              )
                            })()}
                          </div>
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

          {/* Pagination */}
          {total > PER_PAGE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} de {total} atletas
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  Página {page} de {Math.ceil(total / PER_PAGE)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * PER_PAGE >= total}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        <ColumnOrderDialog
          columns={columns}
          isOpen={columnDialogOpen}
          onClose={() => setColumnDialogOpen(false)}
          onReorder={moveColumn}
          onReset={resetToDefault}
        />
      </div>
    </div>
  )
}
