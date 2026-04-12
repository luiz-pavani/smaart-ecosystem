'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'organizador'
            }
          }
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          setMessage('Verifique seu e-mail para confirmar o cadastro e depois faça login.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error('Erro Auth:', err);
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold uppercase tracking-tighter">
            Vou<span className="text-orange-600">Lutar</span>.com
          </h1>
          <p className="text-zinc-400 mt-2">
            {isLogin ? 'Acesse o painel do organizador' : 'Crie sua conta de organizador'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-800 text-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
          {!isLogin && (
            <div className="relative">
              <input 
                required
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome Completo (ou da Empresa)" 
                className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
              />
              <User className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
            </div>
          )}

          <div className="relative">
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail profissional" 
              className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
            />
            <Mail className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
          </div>

          <div className="relative">
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha (mín. 6 caracteres)" 
              minLength={6}
              className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
            />
            <Lock className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-lg font-bold rounded-lg uppercase tracking-widest transition-all ${
              loading ? 'bg-zinc-800 cursor-not-allowed text-zinc-500' : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white'
            }`}
          >
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar no Painel' : 'Criar Conta')}
          </button>
        </form>

        <div className="text-center mt-6">
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
}