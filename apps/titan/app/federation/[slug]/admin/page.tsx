'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart3, Users, Building2, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalAtletas: number;
  totalAcademias: number;
  totalPlans: number;
  totalUsers: number;
  atletasAtivos: number;
  academiasAtivas: number;
  plansAtivos: number;
}

export default function FederationAdminDashboard({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [federation, setFederation] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAtletas: 0,
    totalAcademias: 0,
    totalPlans: 0,
    totalUsers: 0,
    atletasAtivos: 0,
    academiasAtivas: 0,
    plansAtivos: 0,
  });
  const [loading, setLoading] = useState(true);

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

        if (fed) {
          // Load all stats in parallel
          const [
            { data: atletas },
            { data: academias },
            { data: plans },
            { data: userRoles },
          ] = await Promise.all([
            supabase.from('atletas').select('id, status').eq('federacao_id', fed.id),
            supabase.from('academias').select('id, ativo').eq('federacao_id', fed.id),
            supabase.from('plans').select('id, is_active').eq('federacao_id', fed.id),
            supabase.from('user_roles').select('id').eq('federacao_id', fed.id),
          ]);

          setStats({
            totalAtletas: atletas?.length || 0,
            totalAcademias: academias?.length || 0,
            totalPlans: plans?.length || 0,
            totalUsers: userRoles?.length || 0,
            atletasAtivos: atletas?.filter((a: any) => a.status === 'ativo').length || 0,
            academiasAtivas: academias?.filter((a: any) => a.ativo).length || 0,
            plansAtivos: plans?.filter((p: any) => p.is_active).length || 0,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.slug, supabase]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    href,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    subtext?: string;
    href?: string;
  }) => {
    const content = (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${href ? 'hover:shadow-lg transition cursor-pointer' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
          </div>
          <div className="text-blue-600 opacity-20">{Icon}</div>
        </div>
      </div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!federation) {
    return <div className="p-6">Federação não encontrada</div>;
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">{federation.nome_completo}</h1>
        <p className="text-gray-600">
          Bem-vindo ao painel de administração. Aqui você pode gerenciar todas as operações da federação.
        </p>
      </div>

      {/* Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Sistema Operacional</p>
          <p>Todos os serviços estão operacionais. Últimas alterações sincronizadas.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="h-8 w-8" />}
          label="Atletas"
          value={stats.totalAtletas}
          subtext={`${stats.atletasAtivos} ativos`}
          href={`/federation/${params.slug}/admin/atletas`}
        />
        <StatCard
          icon={<Building2 className="h-8 w-8" />}
          label="Academias"
          value={stats.totalAcademias}
          subtext={`${stats.academiasAtivas} ativas`}
          href={`/federacoes`}
        />
        <StatCard
          icon={<TrendingUp className="h-8 w-8" />}
          label="Planos"
          value={stats.totalPlans}
          subtext={`${stats.plansAtivos} ativos`}
          href={`/federation/${params.slug}/admin/plans`}
        />
        <StatCard
          icon={<Users className="h-8 w-8" />}
          label="Usuários"
          value={stats.totalUsers}
          subtext="Com acesso"
          href={`/federation/${params.slug}/admin/auths`}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/federation/${params.slug}/admin/atletas`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition text-center"
          >
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-medium text-gray-900">Gerenciar Atletas</p>
            <p className="text-xs text-gray-500">Visualizar e editar</p>
          </Link>

          <Link
            href={`/federation/${params.slug}/admin/auths`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition text-center"
          >
            <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="font-medium text-gray-900">Controle de Acesso</p>
            <p className="text-xs text-gray-500">Gerenciar permissões</p>
          </Link>

          <Link
            href={`/federation/${params.slug}/admin/plans`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition text-center"
          >
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-medium text-gray-900">Planos</p>
            <p className="text-xs text-gray-500">Assinaturas</p>
          </Link>

          <Link
            href={`/federation/${params.slug}/admin/configs`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition text-center"
          >
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="font-medium text-gray-900">Configurações</p>
            <p className="text-xs text-gray-500">Dados federação</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Informações</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">Detalhes da Federação</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">CNPJ:</span>
                <span className="font-medium">{federation.cnpj}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{federation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Telefone:</span>
                <span className="font-medium">{federation.telefone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  federation.ativo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {federation.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold mb-3">Localização</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Endereço:</span>
                <span className="font-medium">{federation.endereco || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cidade:</span>
                <span className="font-medium">{federation.cidade || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="font-medium">{federation.estado || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CEP:</span>
                <span className="font-medium">{federation.cep || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
