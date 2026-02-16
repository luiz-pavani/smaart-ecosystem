'use client'

import { useState, useEffect } from 'react'
import { Shield, Edit, Trash2, UserPlus, AlertCircle, Check } from 'lucide-react'

interface RoleInfo {
  role: string
  nome: string
  descricao: string
  nivel_hierarquico: number
  acesso_financeiro: boolean
}

interface Usuario {
  user_id: string
  role: string
  nivel_hierarquico: number
  federacao_id: string | null
  academia_id: string | null
  federacao?: { nome: string; sigla: string }
  academia?: { nome: string; sigla: string }
  created_at: string
}

interface PerfilAtual {
  role: string
  nivel_hierarquico: number
  federacao_id: string | null
  academia_id: string | null
}

export default function PermissoesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [rolesInfo, setRolesInfo] = useState<RoleInfo[]>([])
  const [perfilAtual, setPerfilAtual] = useState<PerfilAtual | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [selectedRole, setSelectedRole] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/permissoes')
      if (!response.ok) {
        const error = await response.json()
        console.error('Error from API:', error)
        alert(error.error || 'Erro ao carregar dados')
        return
      }

      const data = await response.json()
      console.log('Permissoes data loaded:', {
        usuarios: data.usuarios?.length,
        roles: data.rolesInfo?.length,
        perfil: data.perfilAtual
      })
      setUsuarios(data.usuarios || [])
      setRolesInfo(data.rolesInfo || [])
      setPerfilAtual(data.perfilAtual)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const getRoleInfo = (role: string): RoleInfo | undefined => {
    return rolesInfo.find((r) => r.role === role)
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      master_access: 'bg-purple-100 text-purple-800 border-purple-200',
      federacao_admin: 'bg-blue-100 text-blue-800 border-blue-200',
      federacao_gestor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      academia_admin: 'bg-green-100 text-green-800 border-green-200',
      academia_gestor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      professor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      atleta: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const canEdit = (usuario: Usuario): boolean => {
    if (!perfilAtual) return false
    // Can only edit users below your level
    return usuario.nivel_hierarquico > perfilAtual.nivel_hierarquico
  }

  const getAvailableRoles = (): RoleInfo[] => {
    if (!perfilAtual) return []
    // Can only assign roles below your level
    return rolesInfo.filter((r) => r.nivel_hierarquico > perfilAtual.nivel_hierarquico)
  }

  const handleEditClick = (usuario: Usuario) => {
    setEditingUser(usuario)
    setSelectedRole(usuario.role)
    setShowModal(true)
  }

  const handleSavePermission = async () => {
    if (!editingUser || !selectedRole) return

    try {
      const response = await fetch('/api/permissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editingUser.user_id,
          role: selectedRole,
          federacao_id: editingUser.federacao_id,
          academia_id: editingUser.academia_id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao atribuir permissão')
        return
      }

      alert('Permissão atribuída com sucesso!')
      setShowModal(false)
      setEditingUser(null)
      setSelectedRole('')
      loadData()
    } catch (error) {
      console.error('Error saving permission:', error)
      alert('Erro ao salvar permissão')
    }
  }

  const handleRemovePermission = async (usuario: Usuario) => {
    if (!confirm(`Deseja remover as permissões administrativas de ${usuario.user_id}?\n\nO usuário será rebaixado para "Atleta".`)) {
      return
    }

    try {
      const response = await fetch(`/api/permissoes?user_id=${usuario.user_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Erro ao remover permissão')
        return
      }

      alert('Permissão removida com sucesso!')
      loadData()
    } catch (error) {
      console.error('Error removing permission:', error)
      alert('Erro ao remover permissão')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!perfilAtual) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-lg font-semibold">Acesso Negado</p>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página</p>
        </div>
      </div>
    )
  }

  const perfilAtualInfo = getRoleInfo(perfilAtual.role)

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestão de Permissões</h2>
        <p className="text-muted-foreground">Atribua e gerencie níveis de acesso dos usuários</p>
      </div>

      {/* Current User Info */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg shadow border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-foreground">Seu Nível de Acesso</h3>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(perfilAtual.role)}`}>
                {perfilAtualInfo?.nome || perfilAtual.role}
              </span>
              <span className="text-sm text-muted-foreground">
                {perfilAtualInfo?.descricao}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy Info */}
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Hierarquia de Permissões</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesInfo.map((roleInfo) => (
            <div
              key={roleInfo.role}
              className={`p-4 rounded-lg border ${
                roleInfo.nivel_hierarquico <= perfilAtual.nivel_hierarquico
                  ? 'border-gray-300 bg-gray-50 opacity-60'
                  : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{roleInfo.nome}</span>
                    {roleInfo.acesso_financeiro && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">$$</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{roleInfo.descricao}</p>
                  <span className="text-xs text-gray-500">Nível {roleInfo.nivel_hierarquico}</span>
                </div>
                {roleInfo.nivel_hierarquico === perfilAtual.nivel_hierarquico && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Usuários e Permissões</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {usuarios.length} usuário(s) sob sua gestão
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Permissão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Federação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Academia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-2">Nenhum usuário encontrado sob sua gestão</p>
                      <p className="text-xs text-gray-500">
                        • Se você é master_access, verifique se existem outros usuários no sistema
                        <br />
                        • Se você é federacao/academia, verifique se há usuários em sua federação/academia
                        <br />
                        • Professores e atletas não aparecem nesta lista
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const roleInfo = getRoleInfo(usuario.role)
                  return (
                    <tr key={usuario.user_id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {usuario.user_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(usuario.role)}`}>
                          {roleInfo?.nome || usuario.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {usuario.federacao?.nome || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {usuario.academia?.nome || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {canEdit(usuario) && (
                            <>
                              <button
                                onClick={() => handleEditClick(usuario)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar permissões"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemovePermission(usuario)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover permissões"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {!canEdit(usuario) && (
                            <span className="text-xs text-muted-foreground px-2 py-1">
                              Sem permissão
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Atribuir Permissão</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Usuário
                </label>
                <p className="text-sm text-muted-foreground">
                  {editingUser.user_id.substring(0, 16)}...
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nível de Permissão
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                >
                  <option value="">Selecione uma permissão</option>
                  {getAvailableRoles().map((roleInfo) => (
                    <option key={roleInfo.role} value={roleInfo.role}>
                      {roleInfo.nome} - {roleInfo.descricao}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRole && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Esta ação atribuirá novas permissões ao usuário.
                    {getRoleInfo(selectedRole)?.acesso_financeiro && (
                      <span className="block mt-1">
                        Este nível inclui acesso a informações financeiras.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingUser(null)
                  setSelectedRole('')
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePermission}
                disabled={!selectedRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
