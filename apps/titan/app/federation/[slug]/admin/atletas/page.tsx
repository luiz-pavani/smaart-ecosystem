'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Search, Filter, Download, Trash2, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Atleta {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  federacao_id: string;
  academia_id: string;
  status: string;
  status_pagamento: string;
  graduacao: string;
  data_criacao: string;
  academia?: {
    id: string;
    nome: string;
    sigla: string;
  };
}

export default function FederationAthletesPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [federation, setFederation] = useState<any>(null);
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo' | 'pendente'>('todos');
  const [selectedAtleta, setSelectedAtleta] = useState<Atleta | null>(null);

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

        // Get athletes for this federation
        if (fed) {
          let query = supabase
            .from('atletas')
            .select(`
              *,
              academia:academias!atletas_academia_id_fkey (
                id,
                nome,
                sigla
              )
            `)
            .eq('federacao_id', fed.id)
            .order('created_at', { ascending: false });

          // Apply status filter
          if (filterStatus !== 'todos') {
            query = query.eq('status', filterStatus);
          }

          const { data, error } = await query;

          if (error) throw error;
          setAtletas(data || []);
        }
      } catch (error) {
        console.error('Error loading athletes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.slug, supabase, filterStatus]);

  // Filter by search term
  const filteredAtletas = atletas.filter(
    (a) =>
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cpf.includes(searchTerm) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleDelete(atletaId: string) {
    if (!confirm('Tem certeza que deseja remover este atleta?')) return;

    try {
      const { error } = await supabase
        .from('atletas')
        .delete()
        .eq('id', atletaId);

      if (error) throw error;

      setAtletas(atletas.filter((a) => a.id !== atletaId));
    } catch (error) {
      alert('Erro ao remover atleta');
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['Nome', 'CPF', 'Email', 'Academia', 'Graduação', 'Status', 'Status Pagamento', 'Data Criação'],
      ...filteredAtletas.map((a) => [
        a.nome,
        a.cpf,
        a.email,
        a.academia?.nome || 'N/A',
        a.graduacao || 'N/A',
        a.status,
        a.status_pagamento,
        new Date(a.data_criacao).toLocaleDateString('pt-BR'),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atletas-${params.slug}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!federation) {
    return <div className="p-6">Federação não encontrada</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Atletas
          </h1>
          <p className="text-gray-600">
            Gerenceie todos os atletas filiados a {federation.nome_completo}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total de Atletas</p>
          <p className="text-2xl font-bold text-blue-600">{atletas.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Ativos</p>
          <p className="text-2xl font-bold text-green-600">
            {atletas.filter((a) => a.status === 'ativo').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Pagamento Pendente</p>
          <p className="text-2xl font-bold text-yellow-600">
            {atletas.filter((a) => a.status_pagamento === 'pendente').length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Pagamento Atrasado</p>
          <p className="text-2xl font-bold text-purple-600">
            {atletas.filter((a) => a.status_pagamento === 'atrasado').length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>
      </div>

      {/* Athletes List */}
      <div className="overflow-x-auto">
        {filteredAtletas.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum atleta encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">E-mail</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Academia</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Graduação</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Pagamento</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtletas.map((atleta) => (
                <tr key={atleta.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{atleta.nome}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{atleta.email}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {atleta.academia?.sigla || 'N/A'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{atleta.graduacao || '-'}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        atleta.status === 'ativo'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {atleta.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        atleta.status_pagamento === 'pago'
                          ? 'bg-green-100 text-green-800'
                          : atleta.status_pagamento === 'pendente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {atleta.status_pagamento}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm space-x-2">
                    <button
                      onClick={() => setSelectedAtleta(atleta)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(atleta.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAtleta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{selectedAtleta.nome}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{selectedAtleta.email}</p>
              </div>
              <div>
                <p className="text-gray-600">CPF</p>
                <p className="font-medium">{selectedAtleta.cpf}</p>
              </div>
              <div>
                <p className="text-gray-600">Academia</p>
                <p className="font-medium">{selectedAtleta.academia?.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Graduação</p>
                <p className="font-medium">{selectedAtleta.graduacao || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className="font-medium capitalize">{selectedAtleta.status}</p>
              </div>
              <div>
                <p className="text-gray-600">Status Pagamento</p>
                <p className="font-medium capitalize">{selectedAtleta.status_pagamento}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedAtleta(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
