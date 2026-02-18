'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, Plus, Trash2, Edit2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  user_email: string;
  role: string;
  status: string;
  created_at: string;
}

const roleDescriptions: Record<string, string> = {
  federacao_admin: 'Administrador da Federação - Acesso completo',
  federacao_staff: 'Staff da Federação - Acesso moderado',
  federacao_viewer: 'Visualizador - Apenas leitura',
  academia_admin: 'Administrador da Academia',
  academia_staff: 'Staff da Academia',
  professor: 'Professor/Instrutor',
  atleta: 'Atleta',
};

const roleColors: Record<string, string> = {
  federacao_admin: 'bg-red-100 text-red-800',
  federacao_staff: 'bg-orange-100 text-orange-800',
  federacao_viewer: 'bg-yellow-100 text-yellow-800',
  academia_admin: 'bg-blue-100 text-blue-800',
  academia_staff: 'bg-cyan-100 text-cyan-800',
  professor: 'bg-purple-100 text-purple-800',
  atleta: 'bg-green-100 text-green-800',
};

export default function FederationAuthsPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [federation, setFederation] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('federacao_staff');
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        // Get federation
        const { data: fed } = await supabase
          .from('federacoes')
          .select('*')
          .eq('slug', params.slug)
          .single();

        setFederation(fed);

        // Get user roles for this federation
        if (fed) {
          const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .eq('federacao_id', fed.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setUserRoles(data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.slug, supabase]);

  const filteredRoles = userRoles.filter(
    (r) =>
      r.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();

    if (!newUserEmail || !newUserRole) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      // In production, you'd create the user via an API route
      // For now, we'll add the role assuming user exists
      const { error } = await supabase.from('user_roles').insert({
        federacao_id: federation.id,
        user_email: newUserEmail,
        role: newUserRole,
        status: 'active',
      });

      if (error) throw error;

      setNewUserEmail('');
      setNewUserRole('federacao_staff');
      setShowAddModal(false);

      // Reload data
      const { data } = await supabase
        .from('user_roles')
        .select('*')
        .eq('federacao_id', federation.id);
      setUserRoles(data || []);
    } catch (error: any) {
      alert(`Erro ao adicionar usuário: ${error.message}`);
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!confirm('Tem certeza que deseja remover este acesso?')) return;

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);

      if (error) throw error;

      setUserRoles(userRoles.filter((r) => r.id !== roleId));
    } catch (error) {
      alert('Erro ao remover acesso');
    }
  }

  async function handleUpdateRole(roleId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', roleId);

      if (error) throw error;

      setUserRoles(
        userRoles.map((r) => (r.id === roleId ? { ...r, role: newRole } : r))
      );
      setEditingRole(null);
    } catch (error) {
      alert('Erro ao atualizar acesso');
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!federation) {
    return <div className="p-6">Federação não encontrada</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Controle de Acesso
          </h1>
          <p className="text-gray-600">
            Gerencie permissões e acessos para {federation.nome_completo}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Novo Acesso
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Gerenciamento de Permissões</p>
          <p>
            Adicione novos acessos ou modifique as permissões dos usuários da federação.
            Apenas administradores podem gerenciar acessos.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total de Acessos</p>
          <p className="text-2xl font-bold text-blue-600">{userRoles.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Administradores</p>
          <p className="text-2xl font-bold text-red-600">
            {userRoles.filter((r) => r.role === 'federacao_admin').length}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Ativos</p>
          <p className="text-2xl font-bold text-green-600">
            {userRoles.filter((r) => r.status === 'active').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por email ou rol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* User Roles List */}
      <div className="overflow-x-auto">
        {filteredRoles.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum acesso encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Função</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Descrição</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((userRole) => (
                <tr key={userRole.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{userRole.user_email}</td>
                  <td className="px-6 py-3 text-sm">
                    {editingRole?.id === userRole.id ? (
                      <select
                        value={editingRole.role}
                        onChange={(e) =>
                          setEditingRole({ ...editingRole, role: e.target.value })
                        }
                        className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(roleDescriptions).map(([role, _]) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          roleColors[userRole.role] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {userRole.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {roleDescriptions[userRole.role] || 'Sem descrição'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        userRole.status === 'active'
                          ? 'bg-green-100 text-green-800 flex items-center gap-1 w-fit'
                          : 'bg-gray-100 text-gray-800 flex items-center gap-1 w-fit'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {userRole.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm space-x-2">
                    {editingRole?.id === userRole.id ? (
                      <>
                        <button
                          onClick={() =>
                            handleUpdateRole(userRole.id, editingRole.role)
                          }
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X className="h-4 w-4 inline" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingRole(userRole)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(userRole.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Novo Acesso</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email do Usuário
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(roleDescriptions).map(([role, desc]) => (
                    <option key={role} value={role}>
                      {role} - {desc}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
