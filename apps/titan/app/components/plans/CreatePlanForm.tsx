'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface CreatePlanFormProps {
  federationId: string;
  academyId?: string;
  planScope?: 'federation' | 'academy';
  onSuccess?: () => void;
}

export function CreatePlanForm({
  federationId,
  academyId,
  planScope = 'federation',
  onSuccess,
}: CreatePlanFormProps) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const frequencies = [
    { value: 1, label: 'Mensal' },
    { value: 2, label: 'Semanal' },
    { value: 3, label: 'Quinzenal' },
    { value: 4, label: 'Trimestral' },
  ];

  const discountTypes = [
    { value: 'percentage', label: 'Percentual (%)' },
    { value: 'fixed', label: 'Valor Fixo (R$)' },
    { value: 'early_bird', label: 'Early Bird' },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          federationId,
          academyId: planScope === 'academy' ? academyId : null,
          planScope,
          name: formData.get('name'),
          description: formData.get('description'),
          price: parseFloat(formData.get('price') as string),
          frequency: parseInt(formData.get('frequency') as string),
          maxAthletes: formData.get('maxAthletes')
            ? parseInt(formData.get('maxAthletes') as string)
            : null,
          maxAcademies: formData.get('maxAcademies')
            ? parseInt(formData.get('maxAcademies') as string)
            : null,
          trialDays: formData.get('trialDays')
            ? parseInt(formData.get('trialDays') as string)
            : 0,
          discountType: formData.get('discountType') || null,
          discountValue: formData.get('discountValue')
            ? parseFloat(formData.get('discountValue') as string)
            : null,
          isFeatured: formData.get('isFeatured') === 'on',
          features: formData.get('features')?.toString().split(',').filter(f => f.trim()) || [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar plano');
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `✓ Plano "${data.name}" criado com sucesso! Safe2Pay ID: ${data.safe2payId}`,
      });

      e.currentTarget.reset();
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao criar plano',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg border">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Criar {planScope === 'academy' ? 'Plano da Academia' : 'Plano da Federação'}
        </h3>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Plan Name and Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do Plano *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="ex: Plano Bronze"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Preço (R$) *</label>
          <input
            type="number"
            name="price"
            step="0.01"
            min="0"
            required
            placeholder="49.90"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          name="description"
          placeholder="Descreva este plano de assinatura"
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Frequency and Limits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Frequência *</label>
          <select
            name="frequency"
            defaultValue="1"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Máx. Atletas</label>
          <input
            type="number"
            name="maxAthletes"
            min="0"
            placeholder="Deixe em branco para ilimitado"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dias Trial</label>
          <input
            type="number"
            name="trialDays"
            min="0"
            defaultValue="0"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Discount Section */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-sm mb-3">Desconto (Opcional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              name="discountType"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Nenhum</option>
              {discountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor</label>
            <input
              type="number"
              name="discountValue"
              step="0.01"
              placeholder="10"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Máx Academias</label>
            <input
              type="number"
              name="maxAcademies"
              min="0"
              placeholder="Deixe em branco para ilimitado"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Features and Display */}
      <div className="border-t pt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Recursos (separados por vírgula)</label>
          <input
            type="text"
            name="features"
            placeholder="ex: API ilimitada, Suporte 24/7, Analytics"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isFeatured"
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm">Destaque este plano</span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Criando...' : 'Criar Plano'}
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">ℹ Processo automático:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Plano será criado automaticamente no Safe2Pay</li>
          <li>Webhook será configurado para rastrear assinaturas</li>
          <li>Atletas poderão se inscrever no plano imediatamente</li>
        </ul>
      </div>
    </form>
  );
}
