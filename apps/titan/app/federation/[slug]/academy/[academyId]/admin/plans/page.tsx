'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CreatePlanForm } from '@/app/components/plans/CreatePlanForm';
import { Edit2, Trash2, Zap, AlertCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  frequency: number;
  safe2pay_plan_id: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  plan_scope: string;
}

const frequencyLabels: Record<number, string> = {
  1: 'Mensal',
  2: 'Semanal',
  3: 'Quinzenal',
  4: 'Trimestral',
};

export default function AcademyPlansPage({
  params,
}: {
  params: { slug: string; academyId: string };
}) {
  const supabase = createClient();
  const [federation, setFederation] = useState<any>(null);
  const [academy, setAcademy] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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

        // Get academy
        const { data: acad } = await supabase
          .from('academias')
          .select('*')
          .eq('id', params.academyId)
          .single();

        setAcademy(acad);

        // Get plans for this academy
        if (acad) {
          const response = await fetch(`/api/plans?academyId=${acad.id}`);
          if (response.ok) {
            const data = await response.json();
            setPlans(data.plans || []);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.slug, params.academyId, supabase, refreshKey]);

  async function handleDelete(planId: string) {
    if (!confirm('Tem certeza que deseja deletar este plano?')) return;

    try {
      const { error } = await supabase.from('plans').delete().eq('id', planId);

      if (error) throw error;

      setPlans(plans.filter((p) => p.id !== planId));
    } catch (error) {
      alert('Erro ao deletar plano');
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!federation || !academy) {
    return <div className="p-6">Dados não encontrados</div>;
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="text-sm text-gray-600 mb-1">
          {federation.nome_completo}
        </div>
        <h1 className="text-3xl font-bold mb-2">Planos de {academy.nome}</h1>
        <p className="text-gray-600">
          Crie e gerencie planos de assinatura exclusivos para sua academia
        </p>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Planos Exclusivos da Academia</p>
          <p>
            Os planos criados aqui serão exclusivos para sua academia. Atletas visualizarão
            esses planos ao se inscreverem. A receita é processada automaticamente via Safe2Pay.
          </p>
        </div>
      </div>

      {/* Create Plan Form */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Novo Plano de Academia</h2>
        <CreatePlanForm
          federationId={federation.id}
          academyId={academy.id}
          planScope="academy"
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      {/* Plans List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Meus Planos ({plans.length})
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum plano criado ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
              >
                {/* Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    {plan.is_featured && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">
                        ⭐ Destaque
                      </span>
                    )}
                    {!plan.is_active && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                {/* Plan Info */}
                <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>

                {plan.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.description}</p>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm mb-4 bg-gray-50 p-3 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">💰 Preço:</span>
                    <span className="font-semibold text-green-600">R$ {plan.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">📅 Frequência:</span>
                    <span className="font-medium">{frequencyLabels[plan.frequency]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">ID Safe2Pay:</span>
                    <span className="text-gray-600 font-mono">{plan.safe2pay_plan_id}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                {plan.is_active && (
                  <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                    ✓ Ativo e aceitando inscrições
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition">
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded text-sm font-medium transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Federation Plans Info */}
      <div className="border-t pt-6 mt-8">
        <h3 className="font-semibold text-lg mb-3">Planos da Federação</h3>
        <p className="text-sm text-gray-600 mb-3">
          Seus atletas também têm acesso aos planos oferecidos pela federação{' '}
          <span className="font-medium">{federation.nome_completo}</span>. Os planos da academia
          aparecem juntos com os da federação no checkout.
        </p>
      </div>
    </div>
  );
}
