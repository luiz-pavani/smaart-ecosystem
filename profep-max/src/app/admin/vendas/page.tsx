"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  BadgeDollarSign, Settings2, Save, Loader2, 
  Plus, Wallet, X, Ticket, CheckCircle2, ArrowUpRight, History, Edit3, Trash2
} from "lucide-react";

export default function ComercialPage() {
    // Deletar todos os cupons
    async function handleDeleteAllCupons() {
      if (!confirm('Tem certeza que deseja deletar TODOS os cupons? Essa ação não pode ser desfeita.')) return;
      const { error } = await supabase.from('coupons').delete().neq('id', 0);
      if (!error) fetchComercialData();
    }
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<'ofertas' | 'cupons' | 'metricas'>('ofertas');
  const [isModalCupomOpen, setIsModalCupomOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  
  const [precos, setPrecos] = useState<any>({ mensal: "", anual: "", vitalicio: "" });
  const [vendasReais, setVendasReais] = useState<any[]>([]);
  const [cupons, setCupons] = useState<any[]>([]);
  const [novoCupom, setNovoCupom] = useState({
    codigo: '',
    tipo: 'percent',
    desconto: '',
    first_month_type: 'none',
    first_month_value: '',
    landing_plan: 'mensal',
    landing_payment_method: '2',
    max_uses: '',
    payment_methods: [] as string[]
  });

  useEffect(() => {
    fetchComercialData();
  }, []);

  async function fetchComercialData() {
    setLoading(true);
    try {
      const { data: config } = await supabase.from('configuracoes').select('*');
      if (config) {
        const p = config.reduce((acc: any, cur: any) => ({ 
          ...acc, [cur.chave.replace('preco_', '')]: cur.valor 
        }), {});
        setPrecos(p);
      }
      const { data: sales } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
      if (sales) setVendasReais(sales);
      const { data: couponData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (couponData) setCupons(couponData);
    } catch (error) {
      console.error("Erro ao carregar dados comerciais:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrecos() {
    setSalvando(true);
    try {
      for (const [chave, valor] of Object.entries(precos)) {
        await supabase.from('configuracoes').update({ valor }).eq('chave', `preco_${chave}`);
      }
      alert("Tabela de preços ProfepMax atualizada!");
    } catch (err) {
      alert("Erro ao salvar preços.");
    } finally {
      setSalvando(false);
    }
  }

  const openNewCouponModal = () => {
    setEditingCoupon(null);
    setNovoCupom({
      codigo: '',
      tipo: 'percent',
      desconto: '',
      first_month_type: 'none',
      first_month_value: '',
      landing_plan: 'mensal',
      landing_payment_method: '2',
      max_uses: '',
      payment_methods: []
    });
    setIsModalCupomOpen(true);
  };

  const openEditCouponModal = (coupon: any) => {
    const methods = coupon.payment_method
      ? String(coupon.payment_method).split(',').map((m: string) => m.trim()).filter(Boolean)
      : [];
    setEditingCoupon(coupon);
    setNovoCupom({
      codigo: coupon.code || '',
      tipo: coupon.discount_percent ? 'percent' : 'fixed',
      desconto: String(coupon.discount_percent || coupon.discount_fixed || ''),
      first_month_type: coupon.first_month_discount_percent ? 'percent' : coupon.first_month_discount_fixed ? 'fixed' : 'none',
      first_month_value: String(coupon.first_month_discount_percent || coupon.first_month_discount_fixed || ''),
      landing_plan: coupon.landing_plan || 'mensal',
      landing_payment_method: coupon.landing_payment_method || '2',
      max_uses: coupon.max_uses === -1 ? '' : String(coupon.max_uses || ''),
      payment_methods: methods
    });
    setIsModalCupomOpen(true);
  };

  async function handleCriarCupom() {
    if (!novoCupom.codigo || !novoCupom.desconto) return;
    const now = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const maxUsesValue = novoCupom.max_uses ? Number(novoCupom.max_uses) : -1;
    const paymentMethodValue = novoCupom.payment_methods.length > 0 ? novoCupom.payment_methods.join(',') : null;

    const payload = {
      code: novoCupom.codigo.toUpperCase().trim(),
      description: `Cupom ${novoCupom.codigo.toUpperCase().trim()}`,
      discount_percent: novoCupom.tipo === 'percent' ? Number(novoCupom.desconto) : null,
      discount_fixed: novoCupom.tipo === 'fixed' ? Number(novoCupom.desconto) : null,
      first_month_discount_percent: novoCupom.first_month_type === 'percent' ? Number(novoCupom.first_month_value) : null,
      first_month_discount_fixed: novoCupom.first_month_type === 'fixed' ? Number(novoCupom.first_month_value) : null,
      landing_plan: novoCupom.landing_plan,
      landing_payment_method: novoCupom.landing_payment_method,
      valid_from: now.toISOString(),
      valid_until: validUntil.toISOString(),
      max_uses: Number.isFinite(maxUsesValue) ? maxUsesValue : -1,
      used_count: editingCoupon?.used_count ?? 0,
      status: editingCoupon?.status ?? 'ACTIVE',
      payment_method: paymentMethodValue
    };

    const { error } = editingCoupon
      ? await supabase.from('coupons').update(payload).eq('id', editingCoupon.id)
      : await supabase.from('coupons').insert([payload]);
    if (!error) {
      setIsModalCupomOpen(false);
      setEditingCoupon(null);
      setNovoCupom({
        codigo: '',
        tipo: 'percent',
        desconto: '',
        first_month_type: 'none',
        first_month_value: '',
        landing_plan: 'mensal',
        landing_payment_method: '2',
        max_uses: '',
        payment_methods: []
      });
      fetchComercialData();
    }
  }

  async function handleDeleteCupom(couponId: string) {
    if (!confirm('Apagar cupom? Essa ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    if (!error) fetchComercialData();
  }

  // Auditoria: considerar apenas vendas pagas/ativas e excluir testes
  const vendasFiltradas = vendasReais.filter(v => {
    const statusOk = !v.status || ["paga", "ativa", "paid", "active"].includes(String(v.status).toLowerCase());
    const notTest = v.email && !String(v.email).toLowerCase().includes("teste") && !String(v.email).toLowerCase().includes("test");
    return statusOk && notTest;
  });
  const faturamentoTotal = vendasFiltradas.reduce((acc, v) => acc + Number(v.valor), 0);
  const totalVendas = vendasFiltradas.length;
  const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-red-600" size={40} />
    </div>
  );

  return (
    // CORREÇÃO AQUI: Wrapper W-FULL com BG-BLACK para cobrir as laterais
    <div className="min-h-screen bg-black w-full animate-in fade-in duration-700">
      
      {/* Container Centralizado */}
      <div className="max-w-7xl mx-auto p-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BadgeDollarSign className="text-red-600" size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">Inteligência Comercial</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
              Finanças & <span className="text-red-600">Estratégia</span>
            </h1>
          </div>

          <nav className="flex bg-black p-1.5 rounded-2xl border border-zinc-900">
            {(['ofertas', 'cupons', 'metricas'] as const).map((tab) => (
              <button 
                key={tab} 
                onClick={() => setAba(tab)} 
                className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  aba === tab ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-zinc-600 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        <div className="space-y-8">
          {aba === 'ofertas' && (
            <div className="bg-black border border-zinc-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between mb-12 items-start md:items-center gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-red-600/10 p-3 rounded-2xl"><Settings2 className="text-red-600" size={24} /></div>
                  <h2 className="text-2xl font-black italic uppercase text-white tracking-tight">Vitrine ProfepMax</h2>
                </div>
                <button 
                  onClick={handleSavePrecos} 
                  disabled={salvando} 
                  className="w-full md:w-auto bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all shadow-xl"
                >
                  {salvando ? <Loader2 className="animate-spin" size={14} /> : <Save size={16} />} 
                  Salvar Valores
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {['mensal', 'anual', 'vitalicio'].map((tipo) => (
                  <div key={tipo} className="bg-black p-8 rounded-[32px] border border-zinc-900 group hover:border-red-600/50 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{tipo}</span>
                      {tipo === 'anual' && <span className="text-[8px] bg-red-600 text-white px-2 py-1 rounded font-black italic">POPULAR</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-600 font-black italic text-xl">R$</span>
                      <input 
                        value={precos[tipo]} 
                        onChange={(e) => setPrecos({...precos, [tipo]: e.target.value})} 
                        className="bg-transparent text-5xl font-black text-white outline-none w-full italic tracking-tighter" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aba === 'cupons' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Gestão de <span className="text-red-600">Promoções</span></h2>
                <div className="flex gap-2">
                  <button 
                    onClick={openNewCouponModal} 
                    className="bg-white text-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-lg"
                  >
                    <Plus size={16}/> Novo Cupom
                  </button>
                  <button
                    onClick={handleDeleteAllCupons}
                    className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-white hover:text-red-600 border border-red-600 transition-all shadow-lg"
                  >
                    <Trash2 size={16}/> Deletar Todos
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cupons.map(c => (
                  <div key={c.id} className="bg-black border border-zinc-900 p-8 rounded-[32px] relative overflow-hidden group hover:border-red-600 transition-colors">
                    <Ticket className="absolute -right-6 -top-6 text-white/5 rotate-12" size={120} />
                    <div className="relative z-10">
                      <span className="bg-red-600/10 text-red-600 font-black text-[10px] uppercase px-3 py-1 rounded-full">
                        {c.discount_percent ? `${c.discount_percent}% OFF` : `R$ ${Number(c.discount_fixed || 0).toFixed(2)} OFF`}
                      </span>
                      <h3 className="text-2xl font-black text-white italic tracking-widest uppercase mt-4">{c.code}</h3>
                      <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditCouponModal(c)} className="p-2 bg-white/5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteCupom(c.id)} className="p-2 bg-red-600/10 rounded-lg text-red-500 hover:bg-red-600 hover:text-white"><Trash2 size={16} /></button>
                      </div>
                      <div className="flex justify-between items-center mt-6 pt-6 border-t border-zinc-900">
                        <span className="text-[9px] font-black text-zinc-600 uppercase">
                          {c.max_uses === -1 ? `${c.used_count || 0} USOS` : `${c.used_count || 0}/${c.max_uses} USOS`}
                        </span>
                        <CheckCircle2 size={16} className={c.status === 'ACTIVE' ? "text-red-500" : "text-zinc-800"} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aba === 'metricas' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black border border-zinc-900 p-10 rounded-[40px]">
                  <div className="text-5xl font-black text-white italic tracking-tighter mb-2">R$ {faturamentoTotal.toLocaleString('pt-BR')}</div>
                  <div className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Receita Líquida Total
                  </div>
                </div>

                <div className="bg-black border border-zinc-900 p-10 rounded-[40px]">
                  <div className="text-5xl font-black text-white italic tracking-tighter mb-2">{totalVendas}</div>
                  <div className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em]">Vendas Convertidas</div>
                </div>

                <div className="bg-black border border-zinc-900 p-10 rounded-[40px]">
                  <div className="text-5xl font-black text-white italic tracking-tighter mb-2">R$ {ticketMedio.toFixed(2)}</div>
                  <div className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em]">Ticket Médio</div>
                </div>
              </div>

              <div className="bg-black border border-zinc-900 rounded-[40px] overflow-hidden">
                <div className="p-8 border-b border-zinc-900 bg-black">
                   <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                     <History size={16} className="text-red-600" /> Histórico de Transações
                   </h3>
                </div>
                <div className="divide-y divide-zinc-900">
                   {vendasFiltradas.slice(0, 10).map((v) => (
                     <div key={v.id} className="p-6 flex items-center justify-between hover:bg-zinc-900/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-black border border-zinc-900 rounded-xl flex items-center justify-center text-xs font-black italic text-zinc-700 group-hover:border-red-600 transition-all">
                            {v.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase italic tracking-tight">{v.email}</p>
                            <p className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest">{v.metodo}</p>
                            {v.status && (
                              <span className={`text-[8px] font-black ml-2 px-2 py-1 rounded ${["paga","ativa","paid","active"].includes(String(v.status).toLowerCase()) ? "bg-green-900 text-green-400" : "bg-yellow-900 text-yellow-400"}`}>{v.status}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black italic text-green-500">+ R$ {v.valor}</p>
                          <p className="text-[8px] font-black text-zinc-900 uppercase">{v.plano}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalCupomOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
          <div className="bg-black border border-zinc-900 p-12 rounded-[50px] w-full max-w-md relative shadow-2xl">
            <button onClick={() => setIsModalCupomOpen(false)} className="absolute top-10 right-10 text-zinc-600 hover:text-white"><X size={28}/></button>
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{editingCoupon ? 'Editar' : 'Gerar'} <span className="text-red-600">Cupom</span></h2>
            </div>
            <div className="space-y-5">
              <input placeholder="CÓDIGO" value={novoCupom.codigo} className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white uppercase font-black outline-none focus:border-red-600" onChange={e => setNovoCupom({...novoCupom, codigo: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select value={novoCupom.tipo} onChange={(e) => setNovoCupom({...novoCupom, tipo: e.target.value})} className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600">
                  <option value="percent">Desconto %</option>
                  <option value="fixed">Preço final (R$)</option>
                </select>
                <input placeholder={novoCupom.tipo === 'percent' ? "DESCONTO %" : "PREÇO FINAL"} value={novoCupom.desconto} type="number" className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600" onChange={e => setNovoCupom({...novoCupom, desconto: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={novoCupom.first_month_type} onChange={(e) => setNovoCupom({...novoCupom, first_month_type: e.target.value})} className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600">
                  <option value="none">1º mês sem ajuste</option>
                  <option value="percent">1º mês %</option>
                  <option value="fixed">1º mês preço final</option>
                </select>
                <input placeholder="1º mês" value={novoCupom.first_month_value} type="number" className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600" onChange={e => setNovoCupom({...novoCupom, first_month_value: e.target.value})} />
              </div>
              {/* Campos de recorrência removidos para simplificação dos cupons */}
              <div className="grid grid-cols-2 gap-4">
                <select value={novoCupom.landing_plan} onChange={(e) => setNovoCupom({...novoCupom, landing_plan: e.target.value})} className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600">
                  <option value="mensal">Plano Mensal</option>
                  <option value="anual">Plano Anual</option>
                  <option value="vitalicio">Plano Vitalício</option>
                </select>
                <select value={novoCupom.landing_payment_method} onChange={(e) => setNovoCupom({...novoCupom, landing_payment_method: e.target.value})} className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600">
                  <option value="2">Cartão</option>
                  <option value="1">Boleto</option>
                  <option value="6">Pix</option>
                </select>
              </div>
              <input placeholder="LIMITE DE USO (deixe vazio para ilimitado)" value={novoCupom.max_uses} type="number" className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-white font-black outline-none focus:border-red-600" onChange={e => setNovoCupom({...novoCupom, max_uses: e.target.value})} />
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Métodos válidos</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Pix', value: '6' },
                    { label: 'Boleto', value: '1' },
                    { label: 'Cartão', value: '2' }
                  ].map((m) => (
                    <label key={m.value} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500">
                      <input
                        type="checkbox"
                        checked={novoCupom.payment_methods.includes(m.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...novoCupom.payment_methods, m.value]
                            : novoCupom.payment_methods.filter((v) => v !== m.value);
                          setNovoCupom({ ...novoCupom, payment_methods: next });
                        }}
                        className="h-4 w-4 accent-red-600"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              {novoCupom.codigo && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Link personalizado</div>
                  <div className="text-xs text-white font-mono break-all">
                    {`https://www.profepmax.com.br/promo/${novoCupom.codigo.toUpperCase().trim()}?plan=${novoCupom.landing_plan}&paymentMethod=${novoCupom.landing_payment_method}`}
                  </div>
                </div>
              )}
              <button onClick={handleCriarCupom} className="w-full bg-red-600 py-6 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-black transition-all">Ativar Cupom</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}