'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pause, Play, Download, AlertCircle, CheckCircle } from 'lucide-react';

interface Subscription {
  id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  renewal_date: string;
  plan: {
    name: string;
    price: number;
    frequency: number;
  };
  safe2pay_subscription_id?: number;
}

const frequencyLabels: Record<number, string> = {
  1: 'Mensal',
  2: 'Semanal',
  3: 'Quinzenal',
  4: 'Trimestral',
};

export default function SubscriptionManagementPage() {
  const supabase = createClient();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('plan_subscriptions')
        .select('*, plan:plans(name, price, frequency)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active', 'paused'])
        .order('created_at', { ascending: false });

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePauseResume(subscriptionId: string, currentStatus: string) {
    setActionInProgress(subscriptionId);

    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';

      const { error } = await supabase
        .from('plan_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Update local state
      setSubscriptions((subs) =>
        subs.map((sub) =>
          sub.id === subscriptionId ? { ...sub, status: newStatus as any } : sub
        )
      );
    } catch (error) {
      alert('Erro ao atualizar assinatura');
      console.error(error);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!confirm('Deseja realmente cancelar esta assinatura? Você perderá o acesso aos recursos.')) {
      return;
    }

    setActionInProgress(subscriptionId);

    try {
      const { error } = await supabase
        .from('plan_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscriptionId);

      if (error) throw error;

      setSubscriptions((subs) => subs.filter((sub) => sub.id !== subscriptionId));
    } catch (error) {
      alert('Erro ao cancelar assinatura');
      console.error(error);
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDownloadInvoice(subscriptionId: string) {
    alert('Funcionalidade de fatura disponível em breve');
  }

  if (loading) {
    return <div className="p-6 text-center">Carregando assinaturas...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Assinaturas</h1>
          <p className="text-gray-600 mt-2">Gerencie suas assinaturas e pagamentos</p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Você não tem assinaturas ativas.</p>
            <a href="/academy/plans" className="text-blue-600 hover:underline mt-2 inline-block">
              Explorar planos disponíveis →
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  sub.status === 'active'
                    ? 'border-green-500'
                    : sub.status === 'paused'
                    ? 'border-yellow-500'
                    : 'border-gray-300'
                }`}
              >
                {/* Subscription Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">{sub.plan.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          sub.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : sub.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sub.status === 'active' && <CheckCircle className="inline mr-1 h-4 w-4" />}
                        {sub.status === 'paused' && <Pause className="inline mr-1 h-4 w-4" />}
                        {sub.status === 'active'
                          ? 'Ativo'
                          : sub.status === 'paused'
                          ? 'Pausado'
                          : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      R$ {sub.plan.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {frequencyLabels[sub.plan.frequency]}
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="grid md:grid-cols-3 gap-4 mb-6 py-4 border-y border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Início da Assinatura</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(sub.start_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Próxima Renovação</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(sub.renewal_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">ID Safe2Pay</p>
                    <p className="font-mono text-sm text-gray-900">
                      {sub.safe2pay_subscription_id || '—'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {sub.status === 'active' ? (
                    <button
                      onClick={() => handlePauseResume(sub.id, sub.status)}
                      disabled={actionInProgress === sub.id}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 rounded-lg font-medium transition disabled:opacity-50"
                    >
                      <Pause className="h-5 w-5" />
                      {actionInProgress === sub.id ? 'Pausando...' : 'Pausar'}
                    </button>
                  ) : sub.status === 'paused' ? (
                    <button
                      onClick={() => handlePauseResume(sub.id, sub.status)}
                      disabled={actionInProgress === sub.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-medium transition disabled:opacity-50"
                    >
                      <Play className="h-5 w-5" />
                      {actionInProgress === sub.id ? 'Retomando...' : 'Retomar'}
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleDownloadInvoice(sub.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg font-medium transition"
                  >
                    <Download className="h-5 w-5" />
                    Fatura
                  </button>

                  <button
                    onClick={() => handleCancel(sub.id)}
                    disabled={actionInProgress === sub.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition disabled:opacity-50 ml-auto"
                  >
                    {actionInProgress === sub.id ? 'Cancelando...' : 'Cancelar Assinatura'}
                  </button>
                </div>

                {/* Status Messages */}
                {sub.status === 'paused' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <p className="font-semibold mb-1">⏸️ Assinatura Pausada</p>
                    <p>Você não será cobrado durante a pausa. Retome quando quiser para continuar.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Precisa de Ajuda?</h3>
          <p className="text-blue-800 text-sm">
            Se você tiver problemas com sua assinatura, entre em contato com nosso suporte:
            <a href="mailto:support@smaartpro.com" className="font-semibold underline ml-1">
              support@smaartpro.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
