"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Chrome, 
  Loader2, 
  LogIn, 
  GraduationCap,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  UserPlus
} from "lucide-react";

export default function LoginPage() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // LOGIN COM GOOGLE (Cria conta automaticamente se não existir)
  async function signInWithGoogle() {
    setLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: any) {
      alert("Erro Google: " + error.message);
      setLoadingGoogle(false);
    }
  }

  // LOGIN OU CADASTRO TRADICIONAL
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoadingEmail(true);
    
    try {
      if (isRegistering) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Erro ao cadastrar.");
        }
        if (data.session) {
          window.location.assign("/dashboard");
          return;
        }
        alert("Cadastro realizado! Verifique seu e-mail ou faça login.");
        setIsRegistering(false);
      } else {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Erro ao entrar.");
        }
        window.location.assign("/dashboard");
      }
    } catch (error: any) {
      alert(error.message || "Erro ao autenticar.");
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        
        <div className="text-center mb-10">
          <div className="bg-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-600/20">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter italic">
            PROFEP<span className="text-red-600">MAX</span>
          </h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 md:p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 text-center">
              {isRegistering ? "Crie sua conta" : "Acesse sua Plataforma"}
            </h2>

            {/* GOOGLE SEMPRE EM DESTAQUE (Funciona para ambos) */}
            <button 
              onClick={signInWithGoogle}
              disabled={loadingGoogle || loadingEmail}
              className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 mb-8"
            >
              {loadingGoogle ? <Loader2 className="animate-spin" size={18} /> : <><Chrome size={18} /> {isRegistering ? "Cadastrar com Google" : "Entrar com Google"}</>}
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">Ou e-mail</span>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <div className="relative group">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input 
                    type="text" 
                    placeholder="Nome Completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-red-600 transition-all"
                    required
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input 
                  type="email" 
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-red-600 transition-all"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input 
                  type="password" 
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-red-600 transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loadingGoogle || loadingEmail}
                className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 group"
              >
                {loadingEmail ? <Loader2 className="animate-spin" size={16} /> : (
                  isRegistering ? "Criar Minha Conta" : "Acessar Agora"
                )}
              </button>
            </form>

            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full mt-6 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              {isRegistering ? "Já tenho conta? Entrar" : "Não tem conta? Cadastre-se"}
            </button>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-zinc-700">
          <ShieldCheck size={14} />
          <p className="text-[8px] font-black uppercase tracking-widest">Acesso 100% Criptografado</p>
        </div>
      </div>
    </div>
  );
}