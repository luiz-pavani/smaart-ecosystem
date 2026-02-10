"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Lock, Mail, AlertCircle, User, ShieldCheck, Briefcase, ChevronLeft } from "lucide-react";

export default function ManagerLoginPage() {
  const router = useRouter();
  const { slug } = useParams();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [federation, setFederation] = useState<any>(null);

  useEffect(() => {
    async function loadFed() {
      if (!slug) return;
      const { data } = await supabase.from('entities').select('*').eq('slug', slug).single();
      if (data) setFederation(data);
    }
    loadFed();
  }, [slug, supabase]);

  // --- LOGIN / CADASTRO COM E-MAIL ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const { error: authError, data: authData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;

        // A verificação de ROLE e STATUS é feita pela tranca da página /admin
        router.push(`/federation/${slug}/admin`);

      } else {
        // Cadastro de Solicitação
        const { error: signUpError, data: authData } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        
        if (signUpError) throw signUpError;

        if (authData.user) {
            const { error: memberError } = await supabase
                .from('entity_memberships')
                .insert({
                    profile_id: authData.user.id,
                    entity_id: federation.id,
                    role: 'manager',
                    status_inscricao: 'PENDENTE_APROVACAO',
                    graduacao_pretendida: 'Gestão'
                });
            if (memberError) throw memberError;
        }

        setSuccessMsg("Solicitação enviada! O administrador principal revisará seu acesso.");
        setMode('login');
      }
      
    } catch (err: any) {
      setError(err.message || "Erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  // --- NOVO: LOGIN COM GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      // O redirect volta para a dashboard. 
      // Se for o primeiro acesso, o admin (você) precisará aprovar via banco.
      const redirectUrl = `${window.location.origin}/federation/${slug}/admin`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Erro Google:", err);
      setError("Erro ao iniciar acesso com Google.");
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] backdrop-blur-xl relative z-10">
        
        <button onClick={() => router.push(`/federation/${slug}`)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white mb-8 transition-colors">
            <ChevronLeft size={14}/> Voltar ao Início
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500 border border-blue-600/20">
            <Briefcase size={24} />
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Portal do Gestor</h1>
          <p className="text-[10px] font-bold uppercase text-zinc-500 mt-2 tracking-widest">{federation?.name}</p>
        </div>

        {/* Google Auth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading || loadingGoogle}
          className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 mb-6"
        >
          {loadingGoogle ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" style={{fill: '#4285F4'}}></path>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" style={{fill: '#34A853'}}></path>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" style={{fill: '#FBBC05'}}></path>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" style={{fill: '#EA4335'}}></path>
              </svg>
              Acessar com Google
            </>
          )}
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest">
                <span className="bg-[#0b0b0b] px-4 text-zinc-600">Ou use seu e-mail</span>
            </div>
        </div>

        <div className="grid grid-cols-2 bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
            <button onClick={() => setMode('login')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}>Entrar</button>
            <button onClick={() => setMode('register')} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}>Solicitar</button>
        </div>

        {successMsg && <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-[11px] text-green-200 leading-relaxed italic">{successMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">Nome Completo</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-sm focus:border-blue-600 outline-none text-white transition-all" placeholder="Nome do Gestor"/>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-sm focus:border-blue-600 outline-none text-white transition-all" placeholder="seu@email.com"/>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">Senha</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-sm focus:border-blue-600 outline-none text-white transition-all" placeholder="••••••••"/>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[11px] flex gap-2 font-bold italic"><AlertCircle size={14}/> {error}</div>}

          <button type="submit" disabled={loading || loadingGoogle} className="w-full bg-blue-600 hover:bg-white hover:text-black text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg shadow-blue-900/20">
            {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : mode === 'login' ? 'Entrar no Dashboard' : 'Enviar Solicitação'}
          </button>
        </form>
      </div>
    </div>
  );
}