"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { 
  User, MapPin, Save, Loader2, Mail, Search as SearchIcon,
  ShieldCheck, CreditCard, GraduationCap, Star, CheckCircle2,
  Trophy, Award, ChevronRight, LogOut
} from "lucide-react";

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingSecurity, setUpdatingSecurity] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [manualAddress, setManualAddress] = useState(false);
  const [cepManualHint, setCepManualHint] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [certificados, setCertificados] = useState<any[]>([]);
  const [aulasConcluidasCount, setAulasConcluidasCount] = useState(0);

  const [dados, setDados] = useState({
    full_name: "",
    email: "",
    cep: "",
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
    numero: "",
    pontos: 0
  });

  const [pagamentos, setPagamentos] = useState<any[]>([]);

  const [security, setSecurity] = useState({
    newEmail: "",
    newPassword: "",
    confirmPassword: "",
  });

  const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

  useEffect(() => {
    async function loadFullProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      
      setUser(user);

      // 1. Perfil e Metadados
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      // 2. Contagem de Aulas Concluídas
      const { count } = await supabase.from("progresso_aulas").select("*", { count: 'exact', head: true }).eq("user_id", user.id);
      setAulasConcluidasCount(count || 0);

      // 3. Certificados (Exames Aprovados)
      const { data: certs } = await supabase
        .from("resultados_exames")
        .select(`id, nota, avaliacoes(titulo)`)
        .eq("user_id", user.id)
        .eq("aprovado", true);
      setCertificados(certs || []);

      // 4. Transações (somente pagamentos)
      try {
        const resp = await fetch('/api/me/transacoes', { method: 'GET' });
        const json = await resp.json();
        const sales = (json?.transacoes || []) as any[];
        const pagamentosFormatados = (sales || [])
          .filter(v => v.valor) // apenas itens pagos/monetários
          .map(v => ({
            id: v.id,
            plano: v.plano || 'Transação',
            data: v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '',
            valor: v.valor ? `R$ ${Number(v.valor).toFixed(2)}` : '—',
            status: 'Pago',
            metodo: v.metodo || ''
          }));
        setPagamentos(pagamentosFormatados);
      } catch (err) {
        console.warn('[PERFIL] Falha ao carregar transações:', err);
        setPagamentos([]);
      }

      if (profile) {
        setDados({
          full_name: profile.full_name || "",
          email: user.email || "",
          cep: profile.metadata?.cep || "",
          logradouro: profile.metadata?.logradouro || "",
          bairro: profile.metadata?.bairro || "",
          cidade: profile.metadata?.cidade || "",
          uf: profile.metadata?.uf || "",
          numero: profile.metadata?.numero || "",
          pontos: profile.pontos || 0
        });

        setSecurity((prev) => ({
          ...prev,
          newEmail: "",
        }));
      }
      setLoading(false);
    }
    loadFullProfile();
  }, [router]);

  const buscarCEP = async (cep: string) => {
    const valorLimpo = cep.replace(/\D/g, "");
    setDados({ ...dados, cep: valorLimpo });
    setCepManualHint(false);
    if (manualAddress) return;
    if (valorLimpo.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${valorLimpo}/json/`);
        const res = await response.json();
        if (!res.erro) {
          const isPartial = !res.logradouro || !res.bairro || !res.localidade || !res.uf;
          setCepManualHint(isPartial);
          setDados(prev => ({ 
            ...prev, 
            logradouro: res.logradouro || prev.logradouro, 
            bairro: res.bairro || prev.bairro, 
            cidade: res.localidade || prev.cidade, 
            uf: res.uf || prev.uf 
          }));
        } else {
          setCepManualHint(true);
        }
      } catch (error) { console.error("Erro CEP"); setCepManualHint(true); } finally { setLoadingCep(false); }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: dados.full_name,
      metadata: { cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, uf: dados.uf, numero: dados.numero }
    }).eq("id", user.id);
    if (!error) alert("Perfil atualizado! OSS!");
    setSaving(false);
  };

  const handleChangeEmail = async () => {
    const nextEmail = normalizeEmail(security.newEmail);
    if (!nextEmail || !nextEmail.includes("@") || !nextEmail.includes(".")) {
      alert("Informe um email válido.");
      return;
    }

    setUpdatingSecurity(true);
    try {
      const currentEmail = normalizeEmail(user?.email || "");
      const { data, error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) {
        alert(`Erro ao alterar email: ${error.message}`);
        return;
      }

      // Salva histórico de emails no profile para não perder associação com vendas antigas
      const { data: profile } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("id", user.id)
        .maybeSingle();

      const prevs = Array.isArray((profile as any)?.metadata?.previous_emails)
        ? (profile as any).metadata.previous_emails
        : [];

      const nextPrevious = Array.from(new Set([...(prevs || []), currentEmail].filter(Boolean).map(normalizeEmail)));

      await supabase
        .from("profiles")
        .update({
          email: nextEmail,
          metadata: { ...((profile as any)?.metadata || {}), previous_emails: nextPrevious },
        } as any)
        .eq("id", user.id);

      // A alteração de email pode exigir confirmação dependendo da configuração do Supabase
      alert(
        data?.user?.email === nextEmail
          ? "Email atualizado!"
          : "Email solicitado. Confirme no seu email para concluir a troca."
      );
      setSecurity((prev) => ({ ...prev, newEmail: "" }));
    } finally {
      setUpdatingSecurity(false);
    }
  };

  const handleChangePassword = async () => {
    if (!security.newPassword || security.newPassword.length < 8) {
      alert("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      alert("As senhas não conferem.");
      return;
    }

    setUpdatingSecurity(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: security.newPassword });
      if (error) {
        alert(`Erro ao alterar senha: ${error.message}`);
        return;
      }
      alert("Senha atualizada com sucesso!");
      setSecurity((prev) => ({ ...prev, newPassword: "", confirmPassword: "" }));
    } finally {
      setUpdatingSecurity(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-6xl mx-auto py-12 px-4 md:px-0">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tight">Minha Conta</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-red-600 hover:text-white text-zinc-400 px-4 py-2 rounded-full font-bold text-xs uppercase transition-all border border-zinc-800 hover:border-red-600"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA: CADASTRO */}
          <div className="lg:col-span-7 space-y-8">
            <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8 text-red-600">
                <User size={20} />
                <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Dados Cadastrais</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Nome Completo (Para Certificados)</label>
                  <input type="text" value={dados.full_name} onChange={(e) => setDados({...dados, full_name: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">CEP para busca</label>
                    <input type="text" maxLength={8} value={dados.cep} onChange={(e) => buscarCEP(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all" />
                    {loadingCep && <p className="text-[8px] text-red-600 font-bold mt-2">Buscando endereço...</p>}
                    {!manualAddress && cepManualHint && (
                      <div className="flex items-center justify-between text-[8px] text-zinc-500 font-bold mt-2">
                        <span>CEP sem logradouro? Preencha manualmente.</span>
                        <button type="button" className="text-[12px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl bg-red-600 text-white shadow-lg ring-2 ring-red-200/60 hover:bg-red-500 hover:ring-red-300/80 transition-all" onClick={() => setManualAddress(true)}>Digitar manualmente</button>
                      </div>
                    )}
                    {manualAddress && (
                      <div className="flex items-center justify-between text-[8px] text-zinc-500 font-bold mt-2">
                        <span>Preenchimento manual ativo.</span>
                        <button type="button" className="text-red-500 hover:text-red-400" onClick={() => setManualAddress(false)}>Usar busca automática</button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <input 
                      type="text" 
                      value={dados.logradouro} 
                      placeholder="Logradouro" 
                      readOnly={!manualAddress} 
                      onChange={(e) => setDados({ ...dados, logradouro: e.target.value })}
                      className={manualAddress ? "w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all" : "w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 px-6 text-sm font-bold text-zinc-600"}
                    />
                  </div>
                  <input type="text" value={dados.numero} placeholder="Número" onChange={(e) => setDados({...dados, numero: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  <input 
                    type="text" 
                    value={dados.bairro} 
                    placeholder="Bairro" 
                    readOnly={!manualAddress} 
                    onChange={(e) => setDados({ ...dados, bairro: e.target.value })}
                    className={manualAddress ? "w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all" : "w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 px-6 text-sm font-bold text-zinc-600"}
                  />
                  <input 
                    type="text" 
                    value={dados.cidade} 
                    placeholder="Cidade" 
                    readOnly={!manualAddress} 
                    onChange={(e) => setDados({ ...dados, cidade: e.target.value })}
                    className={manualAddress ? "w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all" : "w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 px-6 text-sm font-bold text-zinc-600"}
                  />
                  <input 
                    type="text" 
                    value={dados.uf} 
                    placeholder="UF" 
                    maxLength={2}
                    readOnly={!manualAddress} 
                    onChange={(e) => setDados({ ...dados, uf: e.target.value.toUpperCase() })}
                    className={manualAddress ? "w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all uppercase" : "w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 px-6 text-sm font-bold text-zinc-600 uppercase"}
                  />
                </div>
              </div>
              <button disabled={saving} onClick={handleSave} className="w-full mt-8 bg-red-600 hover:bg-white hover:text-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />} Salvar Perfil
              </button>
            </section>

            {/* SEGURANÇA */}
            <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8 text-red-600">
                <ShieldCheck size={20} />
                <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Segurança</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Email atual</label>
                  <div className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold text-zinc-400 flex items-center gap-3">
                    <Mail size={16} className="text-zinc-600" />
                    <span>{dados.email || user?.email || ""}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Novo email</label>
                  <input
                    type="email"
                    value={security.newEmail}
                    onChange={(e) => setSecurity({ ...security, newEmail: e.target.value })}
                    placeholder="seuemail@dominio.com"
                    className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all"
                  />
                  <button
                    disabled={updatingSecurity || !security.newEmail}
                    onClick={handleChangeEmail}
                    className="w-full mt-3 bg-zinc-800 hover:bg-white hover:text-black text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3"
                  >
                    {updatingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Save size={16} />} Alterar Email
                  </button>
                  <p className="text-[9px] text-zinc-600 font-bold mt-2">
                    Dependendo da configuração, o Supabase pode pedir confirmação no novo email.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Nova senha</label>
                    <input
                      type="password"
                      value={security.newPassword}
                      onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-zinc-500 mb-2 block tracking-widest">Confirmar senha</label>
                    <input
                      type="password"
                      value={security.confirmPassword}
                      onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                </div>

                <button
                  disabled={updatingSecurity || !security.newPassword}
                  onClick={handleChangePassword}
                  className="w-full bg-zinc-800 hover:bg-white hover:text-black text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3"
                >
                  {updatingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Save size={16} />} Alterar Senha
                </button>
              </div>
            </section>

            {/* GALERIA DE CERTIFICADOS */}
            <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8 text-red-600">
                <Trophy size={20} />
                <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Minhas Graduações</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {certificados.length === 0 && <p className="text-zinc-600 text-[10px] font-bold uppercase italic">Nenhum certificado emitido.</p>}
                {certificados.map((cert) => (
                  <button key={cert.id} onClick={() => router.push(`/certificado/${cert.id}`)} className="flex items-center justify-between p-6 bg-black border border-zinc-800 rounded-3xl hover:border-red-600 transition-all group">
                    <div className="flex items-center gap-4 text-left">
                      <Award className="text-red-600" size={24} />
                      <div>
                        <p className="text-[10px] font-black uppercase italic text-white leading-none mb-1">{cert.avaliacoes?.titulo}</p>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Nota: {cert.nota}%</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-800 group-hover:text-white" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA: STATUS */}
          <div className="lg:col-span-5 space-y-8">
            <section className="bg-red-600 rounded-[40px] p-8 text-black relative overflow-hidden">
              <Star className="absolute -right-4 -bottom-4 opacity-20" size={150} fill="black" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase italic mb-1">Pontuação de Honra</p>
                <h3 className="text-6xl font-black italic uppercase tracking-tighter">{dados.pontos} <span className="text-sm">XP</span></h3>
                <div className="mt-6 flex items-center gap-4">
                  <div className="bg-black/10 px-4 py-2 rounded-full flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase">{aulasConcluidasCount} Aulas</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
              <div className="flex items-center gap-3 mb-8 text-red-600">
                <CreditCard size={20} />
                <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Transações</h2>
              </div>
              <div className="space-y-4">
                {pagamentos.length === 0 && (
                  <p className="text-[10px] font-bold uppercase text-zinc-600">Nenhuma transação encontrada.</p>
                )}
                {pagamentos.map((pag) => (
                  <div key={pag.id} className="bg-black/50 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase italic text-white leading-none mb-1">{pag.plano}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">{pag.data} • {pag.valor} {pag.metodo ? `• ${pag.metodo}` : ''}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase bg-green-600/10 text-green-500 px-3 py-1 rounded-full border border-green-600/20">{pag.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}