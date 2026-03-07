'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'


interface Academia {
  id: string
  nome: string
  sigla: string | null
  cnpj: string | null
  ativo: boolean
  anualidade_status: string
  anualidade_vencimento: string | null
  logo_url: string | null
  responsavel_nome: string | null
  responsavel_email: string | null
  responsavel_telefone: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  federacao_id: string
}

type SortKey = 'nome' | 'localizacao' | 'responsavel' | 'status'
type SortDirection = 'asc' | 'desc'

export default function AcademiasPage() {
  const [academias, setAcademias] = useState<Academia[]>([])
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const supabase = createClient()

  useEffect(() => {
    loadAcademias()

    // Reload data when page becomes visible (user returns from edit page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📄 Page became visible - reloading academias...')
        loadAcademias()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadAcademias = async () => {
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
        .from('user_roles')
        .select('role, federacao_id, academia_id')
        .eq('user_id', user.id)
        .limit(1)

      const perfilData = perfilArray?.[0]

      if (!perfilData) {
        console.warn('⚠️ Usuário não tem role definido:', user.id)
        window.location.href = '/login'
        return
      }

      console.log('📊 Perfil do usuário:', perfilData)
      setPerfil(perfilData)

      // Fetch from API endpoint instead of direct Supabase query
      console.log('📤 Buscando academias via API endpoint...')
      const response = await fetch('/api/academias/listar')
      
      console.log('📊 Response status:', response.status)
      console.log('📊 Response ok:', response.ok)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erro na API:', errorData.error)
        console.error('Detalhes:', errorData)
        console.error('Status:', response.status)
        setAcademias([])
        return
      }

      const responseData = await response.json()
      console.log('📥 Response data:', responseData)
      
      const { academias, error: apiError } = responseData

      if (apiError) {
        console.error('❌ Erro da API:', apiError)
        setAcademias([])
        return
      }

      console.log('✅ Academias retornadas pela API:', academias?.length || 0)
      
      // Now filter on client side based on user role
      let filtered = academias || []
      
      if (perfilData.role === 'academia_admin' || perfilData.role === 'academia_staff') {
        if (perfilData.academia_id) {
          console.log('🏢 Filtrando client-side por academia_id:', perfilData.academia_id)
          filtered = filtered.filter((a: Academia) => a.id === perfilData.academia_id)
        }
      } else if (perfilData.role === 'federacao_admin' || perfilData.role === 'federacao_staff') {
        if (perfilData.federacao_id) {
          console.log('🏟️ Filtrando client-side por federacao_id:', perfilData.federacao_id)
          filtered = filtered.filter((a: Academia) => a.federacao_id === perfilData.federacao_id)
        }
      }
      
      console.log('✅ Academias após filtro:', filtered.length)
      console.table(filtered)
      setAcademias(filtered)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a academia "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const response = await fetch(`/api/academias/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir academia')
      }

      alert('✅ Academia excluída com sucesso!')
      loadAcademias()
    } catch (error) {
      console.error('Error deleting academia:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Erro ao excluir academia'}`)
    }
  }

  // Statistics
  const total = academias.length
  const ativas = academias.filter(a => a.ativo).length
  const emDia = academias.filter(a => a.anualidade_status === 'paga').length
  const vencidas = academias.filter(a => a.anualidade_status === 'vencida').length

  const getStatusOrder = (status: string) => {
    const order: Record<string, number> = {
      paga: 0,
      pendente: 1,
      cancelada: 2,
      vencida: 3,
    }

    return order[status] ?? 4
  }

  const getStatusIconConfig = (academia: Academia) => {
    if (!academia.ativo) {
      return { color: 'bg-gray-400', label: 'Inativa' }
    }

    if (academia.anualidade_status === 'cancelada') {
      return { color: 'bg-red-500', label: 'Cancelada' }
    }

    if (academia.anualidade_status === 'paga') {
      return { color: 'bg-green-500', label: 'Em dia' }
    }

    if (academia.anualidade_status === 'pendente') {
      return { color: 'bg-yellow-400', label: 'Pendente' }
    }

    return { color: 'bg-yellow-400', label: 'Ativa' }
  }

  const compareText = (a: string | null | undefined, b: string | null | undefined) => {
    return (a || '').localeCompare((b || ''), 'pt-BR', { sensitivity: 'base' })
  }

  const sortedAcademias = useMemo(() => {
    const items = [...academias]

    items.sort((a, b) => {
      if (sortKey === 'status') {
        const statusDiff = getStatusOrder(a.anualidade_status) - getStatusOrder(b.anualidade_status)
        if (statusDiff !== 0) {
          return sortDirection === 'asc' ? statusDiff : -statusDiff
        }

        const nomeDiff = compareText(a.nome, b.nome)
        return sortDirection === 'asc' ? nomeDiff : -nomeDiff
      }

      if (sortKey === 'nome') {
        const nomeDiff = compareText(a.nome, b.nome)
        return sortDirection === 'asc' ? nomeDiff : -nomeDiff
      }

      if (sortKey === 'responsavel') {
        const responsavelDiff = compareText(a.responsavel_nome, b.responsavel_nome)
        return sortDirection === 'asc' ? responsavelDiff : -responsavelDiff
      }

      const localA = `${a.endereco_cidade || ''} ${a.endereco_estado || ''}`.trim()
      const localB = `${b.endereco_cidade || ''} ${b.endereco_estado || ''}`.trim()
      const localDiff = compareText(localA, localB)
      return sortDirection === 'asc' ? localDiff : -localDiff
    })

    return items
  }, [academias, sortDirection, sortKey])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5" />
    }

    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5" />
      : <ArrowDown className="w-3.5 h-3.5" />
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Academias Filiadas</h2>
          <p className="text-muted-foreground">
            Gerencie o cadastro de todas as academias
          </p>
        </div>
        <Link href="/academias/criar">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            + Nova Anuidade
          </button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total de Academias</p>
            <span className="text-2xl">🏢</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <p className="text-xs text-muted-foreground">{ativas} ativas</p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Anuidade Em Dia</p>
            <span className="text-2xl">✅</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{emDia}</div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((emDia / total) * 100).toFixed(1) : 0}% do total
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Anuidade Vencida</p>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{vencidas}</div>
          <p className="text-xs text-muted-foreground">Requer atenção</p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Buscar</p>
            <span className="text-2xl">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Nome ou Responsável..."
            className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Academias Table */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Lista de Academias</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-muted-foreground">Carregando academias...</p>
            </div>
          ) : academias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-6xl mb-4">🏢</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma academia cadastrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece cadastrando a primeira academia da sua {perfil?.role?.includes('academia') ? 'academia' : 'federação'}
              </p>
              <Link href="/academias/nova">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  + Cadastrar Primeira Academia
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      <button onClick={() => handleSort('nome')} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                        Academia
                        {renderSortIcon('nome')}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      <button onClick={() => handleSort('localizacao')} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                        Localização
                        {renderSortIcon('localizacao')}
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium text-muted-foreground">
                      <button onClick={() => handleSort('responsavel')} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                        Responsável
                        {renderSortIcon('responsavel')}
                      </button>
                    </th>
                    <th className="text-center p-4 font-medium text-muted-foreground">
                      <button onClick={() => handleSort('status')} className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                        Status
                        {renderSortIcon('status')}
                      </button>
                    </th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAcademias.map((academia) => {
                    const statusIcon = getStatusIconConfig(academia)
                    
                    return (
                      <tr key={academia.id} className="border-b border-border hover:bg-muted">
                        <td className="p-4">
                          <Link href={`/academias/${academia.id}`} className="hover:text-blue-600">
                            <div className="font-medium text-foreground">{academia.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {academia.sigla ? `SIGLA: ${academia.sigla}` : '-'}
                            </div>
                          </Link>
                        </td>
                        <td className="p-4 text-sm text-foreground">
                          {academia.endereco_cidade && academia.endereco_estado 
                            ? `${academia.endereco_cidade}, ${academia.endereco_estado}` 
                            : '-'}
                        </td>
                        <td className="p-4 text-sm text-foreground">
                          <div className="max-w-xs truncate">{academia.responsavel_nome || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <div className="flex items-center gap-2" title={statusIcon.label}>
                              <span className={`w-3 h-3 rounded-full ${statusIcon.color}`} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/academias/${academia.id}`}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/academias/${academia.id}/editar`}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(academia.id, academia.nome)}
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
