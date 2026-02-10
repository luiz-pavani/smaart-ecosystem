"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Lock, Mail, ArrowRight, AlertCircle, User, UserPlus, LogIn } from "lucide-react";

export default function FederationLoginPage() {
  const router = useRouter();
  const { slug } = useParams();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Estados
  const [mode, setMode] = useState<'login' | 'register'>('login'); // Alterna entre login e cadastro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Novo campo para cadastro
  
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [federationName, setFederationName] = useState("Portal da Federação");

  // Busca o nome da federação
  useEffect(() => {
    async function loadFed() {
      if (!slug) return;
      const { data } = await supabase.from('entities').select('name').eq('slug', slug).single();
      if (data) setFederationName(data.name);
    }
    loadFed();
  }, [slug, supabase]);

  // AUTENTICAÇÃO (LOGIN OU CADASTRO)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        // --- MODO LOGIN ---
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } else {
        // --- MODO CADASTRO ---
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              federation_slug: slug, // Salva de qual federação ele veio
            },
          },
        });
        if (signUpError) throw signUpError;
        
        // Se o Supabase exigir confirmação de e-mail, avisar. Se não, entra direto.
        if (data.session) {
             // Login automático sucesso
        } else if (data.user && !data.session) {
             alert("Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.");
             setMode('login');
             setLoading(false);
             return;
        }
      }

      // Redirecionamento Padrão
      router.push(`/federation/${slug}/candidato`);
      
    } catch (err: any) {
      console.error(err);
      if (mode === 'login') {
        setError(err.message.includes("Invalid login") ? "E-mail ou senha incorretos." : "Erro ao conectar.");
      } else {
        setError("Erro ao criar conta. Tente uma senha mais forte ou outro e-mail.");
      }
    } finally {
      setLoading(false);
    }
  };

  // LOGIN COM GOOGLE
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
        const redirectUrl = `${window.location.origin}/federation/${slug}/candidato`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectUrl },
        });
        if (error) throw error;
    } catch (err: any) {
        console.error("Erro Google:", err);
        setError("Erro ao iniciar login com Google.");
        setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-600/20">
            <Lock size={24} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Novo Acesso'}
          </p>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
            {federationName}
          </h1>
        </div>

        {/* Abas de Navegação (Login vs Cadastro) */}
        <div className="grid grid-cols-2 bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
            <button 
                onClick={() => setMode('login')}
                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Entrar
            </button>
            <button 
                onClick={() => setMode('register')}
                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Criar Conta
            </button>
        </div>

        {/* Botão Google */}
        <button
            onClick={handleGoogleLogin}
            disabled={loading || loadingGoogle}
            className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 mb-6"
        >
            {loadingGoogle ? (
                <Loader2 className="animate-spin" size={20} />
            ) : (
                <>
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" style={{fill: '#4285F4'}}></path><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" style={{fill: '#34A853'}}></path><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" style={{fill: '#FBBC05'}}></path><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" style={{fill: '#EA4335'}}></path></svg>
                {mode === 'login' ? 'Entrar com Google' : 'Cadastrar com Google'}
                </>
            )}
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-[#050505] px-4 text-zinc-500">Ou via e-mail</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Nome Completo (Apenas no Cadastro) */}
          {mode === 'register' && (
             <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-2">Nome Completo</label>
                <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-red-600 focus:ring-0 outline-none transition-all placeholder:text-zinc-700 text-white"
                    placeholder="Seu nome real"
                />
                </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-red-600 focus:ring-0 outline-none transition-all placeholder:text-zinc-700 text-white"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-red-600 focus:ring-0 outline-none transition-all placeholder:text-zinc-700 text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || loadingGoogle}
            className="w-full bg-red-600 hover:bg-white hover:text-black text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-red-900/20"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : mode === 'login' ? <>Acessar Portal <LogIn size={14}/></> : <>Criar Minha Conta <UserPlus size={14}/></>}
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <button onClick={() => router.push('/')} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">
                Voltar ao Início
            </button>
        </div>

      </div>
    </div>
  );
}