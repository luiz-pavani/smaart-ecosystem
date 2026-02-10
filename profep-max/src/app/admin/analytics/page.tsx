"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  BarChart3, Download, Filter, Calendar, ChevronLeft, TrendingUp, Users, Wallet, 
  ArrowUpRight, ArrowDownRight, Eye, EyeOff, Loader2
} from "lucide-react";
import Link from "next/link";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false } }
);

export default function VendasAnalytics() {
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  const [filteredVendas, setFilteredVendas] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    plan: "",
    method: "",
    searchEmail: "",
  });

  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    average: 0,
    byPlan: {} as Record<string, number>,
    byMethod: {} as Record<string, number>,
  });

  useEffect(() => {
    fetchVendas();
  }, []);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setFilters(prev => ({
      ...prev,
      dateFrom: from.toISOString().split("T")[0],
      dateTo: now.toISOString().split("T")[0]
    }));
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vendas, filters]);

  async function fetchVendas() {
    setLoading(true);
    const { data } = await supabaseAdmin
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false });
    
    setVendas(data || []);
    setLoading(false);
  }

  function applyFilters() {
    let filtered = [...vendas];

    // Date range
    if (filters.dateFrom) {
      filtered = filtered.filter(v => new Date(v.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(v => new Date(v.created_at) <= endOfDay);
    }

    // Plan filter
    if (filters.plan) {
      filtered = filtered.filter(v => v.plano === filters.plan);
    }

    // Method filter
    if (filters.method) {
      filtered = filtered.filter(v => v.metodo === filters.method);
    }

    // Email search
    if (filters.searchEmail) {
      filtered = filtered.filter(v => 
        v.email.toLowerCase().includes(filters.searchEmail.toLowerCase())
      );
    }

    setFilteredVendas(filtered);

    // Calculate stats
    const total = filtered.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const byPlan: Record<string, number> = {};
    const byMethod: Record<string, number> = {};

    filtered.forEach(v => {
      byPlan[v.plano] = (byPlan[v.plano] || 0) + Number(v.valor || 0);
      byMethod[v.metodo] = (byMethod[v.metodo] || 0) + Number(v.valor || 0);
    });

    setStats({
      total,
      count: filtered.length,
      average: filtered.length > 0 ? total / filtered.length : 0,
      byPlan,
      byMethod,
    });
  }

  function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCSV() {
    const headers = ['Email', 'Valor', 'Plano', 'Método', 'ID Transação', 'Data'];
    const rows = filteredVendas.map(v => [
      v.email,
      v.valor,
      v.plano,
      v.metodo,
      v.transaction_id || '-',
      new Date(v.created_at).toLocaleString('pt-BR')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 space-y-8 bg-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition mb-4">
            <ChevronLeft size={16} />
            Voltar ao Dashboard
          </Link>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
            Análise de <span className="text-red-500">Vendas</span>
          </h1>
          <p className="text-zinc-600 text-sm font-black uppercase tracking-[0.2em] mt-2">
            {filteredVendas.length} transações • R$ {formatCurrency(stats.total)}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded-2xl transition-colors"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Total Faturado</p>
          <p className="text-3xl font-black text-green-500">R$ {formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Transações</p>
          <p className="text-3xl font-black text-blue-500">{stats.count}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Ticket Médio</p>
          <p className="text-3xl font-black text-purple-500">R$ {formatCurrency(stats.average)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mb-2">Total Geral BD</p>
          <p className="text-3xl font-black text-orange-500">
            R$ {formatCurrency(vendas.reduce((s, v) => s + Number(v.valor || 0), 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-red-500" />
          <h2 className="text-white font-black uppercase tracking-[0.2em] text-sm">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-2">Data Inicial</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-2">Data Final</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-2">Plano</label>
            <select
              value={filters.plan}
              onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Todos</option>
              {Object.keys(stats.byPlan).map(plan => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-2">Método</label>
            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Todos</option>
              {Object.keys(stats.byMethod).map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-zinc-400 mb-2">Email</label>
            <input
              type="text"
              placeholder="Buscar email..."
              value={filters.searchEmail}
              onChange={(e) => setFilters({ ...filters, searchEmail: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Breakdown by Plan & Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-4">Faturamento por Plano</h3>
          <div className="space-y-3">
            {Object.entries(stats.byPlan).map(([plan, amount]: [string, any]) => (
              <div key={plan} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                <span className="text-white font-bold text-sm">{plan}</span>
                <span className="text-green-500 font-black">R$ {formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-4">Faturamento por Método</h3>
          <div className="space-y-3">
            {Object.entries(stats.byMethod).map(([method, amount]: [string, any]) => (
              <div key={method} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                <span className="text-white font-bold text-sm">{method}</span>
                <span className="text-blue-500 font-black">R$ {formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm mb-4">
          Transações Detalhadas ({filteredVendas.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-zinc-400 font-black uppercase text-xs">Email</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-black uppercase text-xs">Plano</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-black uppercase text-xs">Método</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-black uppercase text-xs">Valor</th>
                <th className="text-left py-3 px-4 text-zinc-400 font-black uppercase text-xs">Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendas.map((venda, idx) => (
                <tr key={idx} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition">
                  <td className="py-3 px-4 text-white text-xs break-all">{venda.email}</td>
                  <td className="py-3 px-4 text-white text-xs">{venda.plano}</td>
                  <td className="py-3 px-4">
                    <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold">
                      {venda.metodo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-green-500 font-bold">
                    R$ {formatCurrency(Number(venda.valor || 0))}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-xs">
                    {new Date(venda.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVendas.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <p className="font-black uppercase tracking-[0.2em] text-xs">Nenhuma transação encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
