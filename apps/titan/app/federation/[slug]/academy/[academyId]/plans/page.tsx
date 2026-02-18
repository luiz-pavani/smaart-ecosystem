'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, X, Zap, Lock, Calendar } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  frequency: number;
  features: string[];
  trial_days: number;
  discount_type?: string;
  discount_value?: number;
  is_featured: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  renewal_date: string;
  plan: Plan;
}

const frequencyLabels: Record<number, string> = {
  1: 'Mês',
  2: 'Semana',
  3: 'Quinzena',
  4: 'Trimestre',
};

export default function PlansPage({
  params,
}: {
  params: { slug: string; academyId?: string };
}) {
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user) return;

        // Get academies for user
        const { data: academies } = await supabase
          .from('atletas')
          .select('academy_id, federation_id')
          .eq('user_id', user.id);

        if (!academies || academies.length === 0) {
          setLoading(false);
          return;
        }

        const academy = academies[0];
        const academyId = params.academyId || academy.academy_id;
        const federation = academy.federation_id;

        // Load available plans
        let query = supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('sort_order', { ascending: true });

        // Get federation plans + academy plans
        const { data: availablePlans } = await query;

        const filtered = availablePlans?.filter((p) => {
          // Federation-wide plans always visible
          if (p.plan_scope === 'federation' && p.federation_id === federation)
            return true;
          // Academy-specific plans only for that academy
          if (p.plan_scope === 'academy' && p.academy_id === academyId)
            return true;
          return false;
        });

        setPlans(filtered || []);

        // Load user subscriptions
        const { data: userSubs } = await supabase
          .from('plan_subscriptions')
          .select('*, plan:plans(*)')
          .eq('user_id', user.id)
          .in('status', ['active', 'paused']);

        setSubscriptions(userSubs || []);
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, [params.slug, params.academyId, supabase]);

  async function handleSubscribe(planId: string) {
    setSelectedPlanId(planId);
    setProcessingPayment(true);

    try {
      // Redirect to Safe2Pay checkout
      // In real implementation, would create plan subscription and redirect
      const plan = plans.find((p) => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert(`Redirecionando para pagamento: ${plan.name}`);
      // window.location.href = `/checkout/${planId}`;
    } catch (error) {
      alert('Erro ao processar assinatura');
      console.error(error);
    } finally {
      setProcessingPayment(false);
      setSelectedPlanId(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Carregando planos...</div>;
  }

  const hasActiveSubscription = subscriptions.some((s) => s.status === 'active');
  const activeSub = subscriptions.find((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Planos de Assinatura</h1>
          <p className="text-lg text-gray-600">Escolha o plano que melhor atende sua academia</p>
        </div>

        {/* Active Subscription Alert */}
        {hasActiveSubscription && activeSub && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900">
                Assinatura Ativa: {activeSub.plan.name}
              </h3>
              <p className="text-sm text-green-800">
                Renovação em: {new Date(activeSub.renewal_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plans.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum plano disponível no momento</p>
            </div>
          ) : (
            plans.map((plan) => {
              const isCurrentPlan = activeSub?.plan.id === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg overflow-hidden transition-all ${
                    plan.is_featured
                      ? 'ring-2 ring-blue-500 shadow-xl scale-105'
                      : 'bg-white shadow-lg'
                  } ${isCurrentPlan ? 'bg-blue-50' : 'bg-white'}`}
                >
                  {/* Featured Badge */}
                  {plan.is_featured && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold">
                      ⭐ POPULAR
                    </div>
                  )}

                  {/* Plan Content */}
                  <div className="p-6 flex flex-col h-full">
                    {/* Plan Name & Price */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      )}
                    </div>

                    {/* Price Section */}
                    <div className="mb-6 pb-6 border-b">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-blue-600">
                          R$ {plan.price.toFixed(2)}
                        </span>
                        <span className="text-gray-600">/ {frequencyLabels[plan.frequency]}</span>
                      </div>

                      {plan.discount_value && (
                        <div className="text-sm text-green-600 font-semibold mt-2">
                          💰 {plan.discount_value}
                          {plan.discount_type === 'percentage' ? '%' : ''} de desconto!
                        </div>
                      )}

                      {plan.trial_days > 0 && (
                        <div className="text-sm text-blue-600 font-semibold mt-2">
                          🎁 {plan.trial_days} dias grátis
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    {plan.features && plan.features.length > 0 && (
                      <div className="mb-6 flex-1">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          Incluídos:
                        </h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Status Badge or Button */}
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full bg-green-100 text-green-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                      >
                        <Check className="h-5 w-5" />
                        Plano Atual
                      </button>
                    ) : hasActiveSubscription ? (
                      <button
                        disabled
                        className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Lock className="h-5 w-5" />
                        Você já tem assinatura ativa
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={processingPayment && selectedPlanId === plan.id}
                        className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                          processingPayment && selectedPlanId === plan.id
                            ? 'bg-gray-100 text-gray-600'
                            : plan.is_featured
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {processingPayment && selectedPlanId === plan.id ? (
                          <>
                            <span className="animate-spin">⟳</span> Processando...
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5" />
                            Assinar Agora
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* My Subscriptions Section */}
        {subscriptions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Minhas Assinaturas
            </h2>

            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={`border rounded-lg p-4 flex items-start justify-between ${
                    sub.status === 'active'
                      ? 'bg-green-50 border-green-200'
                      : sub.status === 'paused'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{sub.plan.name}</h3>
                    <p className="text-sm text-gray-600">
                      {sub.status === 'active'
                        ? 'Ativo'
                        : sub.status === 'paused'
                        ? 'Pausado'
                        : sub.status === 'cancelled'
                        ? 'Cancelado'
                        : 'Expirado'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Próxima renovação: {new Date(sub.renewal_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        sub.status === 'active'
                          ? 'bg-green-200 text-green-800'
                          : sub.status === 'paused'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {sub.status === 'active'
                        ? '✓ Ativo'
                        : sub.status === 'paused'
                        ? '⏸ Pausado'
                        : sub.status === 'cancelled'
                        ? '✗ Cancelado'
                        : '⏱ Expirado'}
                    </span>
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium">
                      Gerenciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>
            Métodos de pagamento seguro: <span className="font-semibold">Safe2Pay</span>
          </p>
          <p className="mt-1">Cancele sua assinatura a qualquer momento, sem penalidades.</p>
        </div>
      </div>
    </div>
  );
}
