'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, Lock, AlertCircle, ChevronRight } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  frequency: number;
  trial_days: number;
  features: string[];
  discount_type?: string;
  discount_value?: number;
}

const frequencyLabels: Record<number, string> = {
  1: 'mês',
  2: 'semana',
  3: 'quinzena',
  4: 'trimestre',
};

export default function CheckoutPage({ params }: { params: { planId: string } }) {
  const supabase = createClient();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        setUser(authUser?.user);

        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('id', params.planId)
          .single();

        setPlan(planData);
      } catch (error) {
        console.error('Error loading checkout data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.planId, supabase]);

  async function handleCheckout() {
    if (!agreedToTerms) {
      alert('Você deve concordar com os termos de serviço');
      return;
    }

    setProcessing(true);

    try {
      // Create subscription in database
      const { data: subscription, error: subError } = await supabase
        .from('plan_subscriptions')
        .insert({
          plan_id: plan?.id,
          user_id: user?.id,
          federation_id: user?.federation_id, // Would get from academy/federation
          status: 'pending',
        })
        .select()
        .single();

      if (subError) throw subError;

      // Redirect to Safe2Pay payment
      // In real implementation:
      // window.location.href = `/api/payment/safe2pay?subscriptionId=${subscription.id}&planId=${plan.id}`;

      alert(
        'Redirecionando para pagamento...\n\nEm produção, você seria redirecionado para Safe2Pay aqui.'
      );
    } catch (error) {
      alert('Erro ao processar pagamento');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  if (!plan) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <p>Plano não encontrado</p>
      </div>
    );
  }

  const finalPrice =
    plan.discount_type === 'fixed'
      ? (plan.price - (plan.discount_value || 0)).toFixed(2)
      : plan.discount_type === 'percentage'
      ? (plan.price * (1 - (plan.discount_value || 0) / 100)).toFixed(2)
      : plan.price.toFixed(2);

  const hasDiscount = parseFloat(finalPrice) < parseFloat(plan.price.toFixed(2));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/academy/plans" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
            ← Voltar aos planos
          </a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Finalizar Assinatura</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Plan Summary */}
          <div className="md:col-span-2 space-y-6">
            {/* Plan Details Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo do Plano</h2>

              <div className="border-b pb-4 mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-1">{plan.description}</p>
              </div>

              {/* Pricing Details */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Preço base:</span>
                  <span className={hasDiscount ? 'line-through text-gray-500' : 'font-semibold'}>
                    R$ {plan.price.toFixed(2)}
                  </span>
                </div>

                {hasDiscount && (
                  <>
                    <div className="flex items-center justify-between text-green-600">
                      <span>
                        Desconto ({plan.discount_type === 'percentage' ? plan.discount_value + '%' : 'R$'}):
                      </span>
                      <span className="font-semibold">
                        -R${((parseFloat(plan.price.toFixed(2)) - parseFloat(finalPrice)).toFixed(2))}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-3xl font-bold text-blue-600">R$ {finalPrice}</span>
                </div>

                <div className="text-sm text-gray-600">
                  Renovação: A cada {frequencyLabels[plan.frequency]}
                </div>
              </div>

              {/* Trial Info */}
              {plan.trial_days > 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                  <p className="text-green-800">
                    🎁 <span className="font-semibold">{plan.trial_days} dias grátis!</span>
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Teste o plano sem compromisso. Cancele a qualquer momento durante o período de trial.
                  </p>
                </div>
              )}

              {/* Features */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">O que está incluído:</h4>
                <ul className="space-y-2">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Your Information */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Suas Informações</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                A cobrança será feita com segurança através do Safe2Pay. Sua informação de cartão
                não é armazenada em nossos servidores.
              </p>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded mt-1 cursor-pointer"
                />
                <span className="text-gray-700">
                  Eu concordo com os{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Termos de Serviço
                  </a>{' '}
                  e a{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Política de Privacidade
                  </a>
                </span>
              </label>
            </div>
          </div>

          {/* Payment Card */}
          <div>
            <div className="sticky top-4 bg-white rounded-lg shadow-xl p-6">
              <div className="mb-6">
                <div className="text-sm text-gray-600 mb-1">Total a Pagar</div>
                <div className="text-4xl font-bold text-blue-600">R$ {finalPrice}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Renovação automática: A cada {frequencyLabels[plan.frequency]}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing || !agreedToTerms}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                  processing || !agreedToTerms
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {processing ? (
                  <>
                    <span className="animate-spin">⟳</span> Processando...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Prosseguir para Pagamento
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                🔒 Pagamento 100% seguro com Safe2Pay
              </p>

              {/* Cancel Policy */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-gray-600">
                  ✓ Cancele a qualquer momento{' '}
                  {plan.trial_days > 0 && `durante seu período de trial de ${plan.trial_days} dias`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>Processamento seguro com Safe2Pay | Sem cobranças ocultas | Cancele a qualquer hora</p>
        </div>
      </div>
    </div>
  );
}
