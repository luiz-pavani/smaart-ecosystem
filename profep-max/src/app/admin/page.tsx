"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Users, BadgeDollarSign, TrendingUp, Loader2, UserPlus, ShieldAlert, Wallet, Activity, BarChart3 } from "lucide-react";
import Link from "next/link";

// Use service role key for admin dashboard to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", // Fall back to anon, but service role would be better
  { auth: { persistSession: false } }
);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    faturamentoTotal: 0,
    totalAlunos: 0,
    alunosAtivos: 0,
    totalVendas: 0,
    ticketMedio: 0,
    conversao: 0,
    receita7d: 0,
    vendas7d: 0,
    serieReceita: [] as { label: string; value: number }[],
  });
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);

  useEffect(() => { fetchDashboardData(); }, []);

  function formatCurrency(valor: number) {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function isPaidStatus(status?: string | null) {
    if (!status) return true;
    return ["paga", "pago", "paid", "active", "ativa"].includes(String(status).toLowerCase());
  }

  function isNotTestEmail(email: string): boolean {
    const testDomains = ["profepmax.com", "example.com"];
    const testPatterns = ["test-rls", "webhook-test", "teste-webhook", "teste-recorrencia", "final-test", "debug-vendas", "teste-fix", "test"];
    const domain = email.split("@")[1] || "";
    return !testDomains.includes(domain) && !testPatterns.some(p => email.toLowerCase().includes(p));
  }

  async function fetchDashboardData() {
    setLoading(true);
    const { data: vendas } = await supabaseAdmin.from('vendas').select('valor, status, email, created_at, plano, metodo, transaction_id').order('created_at', { ascending: false });
    const { count: totalUsers } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    const { count: ativos } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).not('plan', 'eq', 'free');

    const vendasFiltradas = (vendas || []).filter((v: any) => {
      const statusOk = isPaidStatus(v.status);
      const notTest = isNotTestEmail(v.email || "");
      return statusOk && notTest;
    });

    const totalFaturado = vendasFiltradas.reduce((acc: number, v: any) => acc + Number(v.valor || 0), 0);
    const totalVendas = vendasFiltradas.length;
    const ticketMedio = totalVendas > 0 ? totalFaturado / totalVendas : 0;

    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() - 7);
    const vendas7d = vendasFiltradas.filter((v: any) => new Date(v.created_at) >= seteDias);
    const receita7d = vendas7d.reduce((acc: number, v: any) => acc + Number(v.valor || 0), 0);

    const conversao = totalUsers ? Math.round(((ativos || 0) / totalUsers) * 100) : 0;

    const serieReceita: { label: string; value: number }[] = [];
    const mapaReceita: Record<string, number> = {};
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      mapaReceita[key] = 0;
      serieReceita.push({
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: 0,
      });
    }

    vendasFiltradas.forEach((v: any) => {
      const key = new Date(v.created_at).toISOString().slice(0, 10);
      if (mapaReceita[key] !== undefined) {
        mapaReceita[key] += Number(v.valor || 0);
      }
    });

    serieReceita.forEach((item, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      item.value = mapaReceita[key] || 0;
    });

    setUltimasVendas(vendasFiltradas.slice(0, 6));
    setStats({
      faturamentoTotal: totalFaturado,
      totalAlunos: totalUsers || 0,
      alunosAtivos: ativos || 0,
      totalVendas,
      ticketMedio,
      conversao,
      receita7d,
      vendas7d: vendas7d.length,
      serieReceita,
    });
    setLoading(false);
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-red-500" /></div>;

  return (
    <div className="p-8 lg:p-12 space-y-10 bg-black min-h-screen">
      <header>
        <div className="flex items-center gap-2 mb-2 text-zinc-700">
          <ShieldAlert size={14} className="text-red-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Dojo Central Admin</span>
        </div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
          Visão <span className="text-red-500">Geral</span>
        </h1>
      </header>

      {/* CARDS COM FUNDO PRETO PURO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Receita Total", value: `R$ ${formatCurrency(stats.faturamentoTotal)}`, icon: Wallet, color: "text-green-500" },
          { label: "Vendas Convertidas", value: stats.totalVendas, icon: BadgeDollarSign, color: "text-red-500" },
          { label: "Ticket Médio", value: `R$ ${formatCurrency(stats.ticketMedio)}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Assinantes Ativos", value: stats.alunosAtivos, icon: UserPlus, color: "text-blue-500" },
        ].map((item, i) => (
          <div key={i} className="bg-black border border-zinc-900 p-8 rounded-[32px] hover:border-red-500/50 transition-all group">
             <item.icon className={`${item.color} mb-4 opacity-80 group-hover:opacity-100`} size={28} />
             <p className="text-3xl font-black italic text-white tracking-tighter">{item.value}</p>
             <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-black border border-zinc-900 p-8 rounded-[32px]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Receita últimos 7 dias
          </div>
          <div className="text-4xl font-black italic text-white">R$ {formatCurrency(stats.receita7d)}</div>
          <p className="text-[10px] uppercase font-black text-zinc-600 mt-2">{stats.vendas7d} vendas confirmadas</p>
        </div>

        <div className="bg-black border border-zinc-900 p-8 rounded-[32px]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Conversão base
          </div>
          <div className="text-4xl font-black italic text-white">{stats.conversao}%</div>
          <p className="text-[10px] uppercase font-black text-zinc-600 mt-2">{stats.alunosAtivos} ativos / {stats.totalAlunos} alunos</p>
        </div>

        <div className="bg-black border border-zinc-900 p-8 rounded-[32px]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Engajamento
          </div>
          <div className="text-4xl font-black italic text-white">{stats.conversao}%</div>
          <p className="text-[10px] uppercase font-black text-zinc-600 mt-2">base ativa / base total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black border border-zinc-900 rounded-[40px] p-8">
          <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
            <Activity size={14} className="text-red-500" /> Receita 14 dias
          </div>
          <div className="h-48 flex items-end gap-2">
            {stats.serieReceita.map((item, idx) => {
              const max = Math.max(...stats.serieReceita.map(s => s.value), 1);
              const height = Math.round((item.value / max) * 100);
              return (
                <div key={`${item.label}-${idx}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-zinc-900/60 rounded-xl overflow-hidden h-32 flex items-end">
                    <div
                      className="w-full bg-red-600/80"
                      style={{ height: `${height}%` }}
                      title={`R$ ${formatCurrency(item.value)}`}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-black border border-zinc-900 rounded-[40px] p-8">
          <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
            <BadgeDollarSign size={14} className="text-green-500" /> Últimas vendas
          </div>
          <div className="space-y-3">
            {ultimasVendas.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">Sem vendas recentes</p>
            ) : (
              ultimasVendas.map((v) => (
                <div key={v.id || `${v.email}-${v.created_at}`} className="flex items-center justify-between bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4">
                  <div>
                    <p className="text-white text-sm font-black italic">{v.email}</p>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">
                      {new Date(v.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-500 font-black text-sm">+ R$ {formatCurrency(Number(v.valor || 0))}</p>
                    <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.3em]">{v.plano || "Plano"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Link href="/admin/analytics" className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 transition-colors text-white font-black uppercase tracking-[0.2em] px-8 py-4 rounded-[24px] text-sm">
          <BarChart3 size={20} />
          Ver Estatísticas Completas
        </Link>
      </div>
    </div>
  );
}