'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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

export default function FederationPlansPage({ params }: { params: { slug: string } }) {
  const supabase = createClientComponentClient();
  const [federation, setFederation] = useState<any>(null);
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

        // Get plans
        if (fed) {
          const response = await fetch(`/api/plans?federationId=${fed.id}`);
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
  }, [params.slug, supabase, refreshKey]);

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

  if (!federation) {
    return <div className="p-6">Federação não encontrada</div>;
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Planos de Assinatura</h1>
        <p className="text-gray-600">
          Gerencie os planos de assinatura para {federation.nome_completo}
        </p>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Integração Safe2Pay Ativa</p>
          <p>
            Os planos são criados automaticamente no Safe2Pay com webhooks configurados para
            rastrear assinaturas em tempo real.
          </p>
        </div>
      </div>

      {/* Create Plan Form */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Novo Plano</h2>
        <CreatePlanForm
          federationId={federation.id}
          planScope="federation"
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      {/* Plans List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Planos Existentes ({plans.length})
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
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                {/* Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    {plan.is_featured && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Destaque
                      </span>
                    )}
                    {!plan.is_active && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        Inativo
                      </span>
                    )}
                    {plan.plan_scope === 'academy' && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        Academia
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
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preço:</span>
                    <span className="font-medium">R$ {plan.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frequência:</span>
                    <span className="font-medium">{frequencyLabels[plan.frequency]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Safe2Pay ID:</span>
                    <span className="text-gray-600">{plan.safe2pay_plan_id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium">
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded text-sm font-medium"
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
    </div>
  );
}
