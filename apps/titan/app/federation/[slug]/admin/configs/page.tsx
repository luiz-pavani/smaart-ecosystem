'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, Save, AlertCircle, CheckCircle2, Mail, Phone, MapPin, Building2 } from 'lucide-react';

interface FederationConfig {
  id: string;
  nome_completo: string;
  sigla: string;
  cnpj: string;
  email: string;
  telefone: string;
  website: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  logo_url: string;
  slug: string;
  ativo: boolean;
  metadata: any;
}

export default function FederationConfigsPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const [federation, setFederation] = useState<FederationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState<Partial<FederationConfig>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const { data: fed } = await supabase
          .from('federacoes')
          .select('*')
          .eq('slug', params.slug)
          .single();

        setFederation(fed);
        setFormData(fed || {});
      } catch (error) {
        console.error('Error loading federation:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.slug, supabase]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage('');
  };

  async function handleSave() {
    if (!federation) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('federacoes')
        .update(formData)
        .eq('id', federation.id);

      if (error) throw error;

      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!federation) {
    return <div className="p-6">Federação não encontrada</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-gray-600">
          Gerencie os dados e configurações da federação
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Informações Importantes</p>
          <p>
            Modifique os dados da federação com cuidado. Essas configurações afetam todos os
            usuários e academias filiadas.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Basic Info */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.nome_completo || ''}
                onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sigla
              </label>
              <input
                type="text"
                value={formData.sigla || ''}
                onChange={(e) => handleInputChange('sigla', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ
              </label>
              <input
                type="text"
                value={formData.cnpj || ''}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL)
              </label>
              <input
                type="text"
                value={formData.slug || ''}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Slug não pode ser alterado</p>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Informações de Contato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.telefone || ''}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Address Info */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enderço
              </label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={formData.cidade || ''}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado (UF)
              </label>
              <select
                value={formData.estado || ''}
                onChange={(e) => handleInputChange('estado', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="AC">AC</option>
                <option value="AL">AL</option>
                <option value="AP">AP</option>
                <option value="AM">AM</option>
                <option value="BA">BA</option>
                <option value="CE">CE</option>
                <option value="DF">DF</option>
                <option value="ES">ES</option>
                <option value="GO">GO</option>
                <option value="MA">MA</option>
                <option value="MT">MT</option>
                <option value="MS">MS</option>
                <option value="MG">MG</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="PI">PI</option>
                <option value="RJ">RJ</option>
                <option value="RN">RN</option>
                <option value="RS">RS</option>
                <option value="RO">RO</option>
                <option value="RR">RR</option>
                <option value="SC">SC</option>
                <option value="SP">SP</option>
                <option value="SE">SE</option>
                <option value="TO">TO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => handleInputChange('cep', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Logo */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Logo</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL da Logo
            </label>
            <input
              type="url"
              value={formData.logo_url || ''}
              onChange={(e) => handleInputChange('logo_url', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.logo_url && (
              <div className="mt-4">
                <img
                  src={formData.logo_url}
                  alt="Federation Logo"
                  className="h-24 object-contain"
                />
              </div>
            )}
          </div>
        </section>

        {/* Status */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Status</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.ativo || false}
                onChange={(e) => handleInputChange('ativo', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Federação Ativa</span>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Configurações de Assinatura</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Os planos são gerenciados na seção de Planos</p>
            <p>• As assinaturas são sincronizadas com Safe2Pay</p>
            <p>• Webhooks são configurados automaticamente</p>
          </div>
          <button className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Ir para Planos
          </button>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Configurações de Segurança</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Controle de acesso gerenciado na seção de Acessos</p>
            <p>• Row Level Security (RLS) ativado</p>
            <p>• Dois fatores opcional para todos os usuários</p>
          </div>
          <button className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Ir para Acessos
          </button>
        </div>
      </div>
    </div>
  );
}
