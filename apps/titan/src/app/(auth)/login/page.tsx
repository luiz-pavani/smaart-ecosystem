import React from 'react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 sm:p-12 font-sans selection:bg-orange-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center">
        <div className="w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight mb-4">
            Titan Login
          </h1>
          <p className="text-gray-400 text-lg font-medium tracking-wide">
            Entre com sua conta ou crie uma nova
          </p>
        </header>

        <form className="w-full flex flex-col gap-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-2xl p-8">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded-lg bg-white/30 text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full px-4 py-3 rounded-lg bg-white/30 text-white placeholder-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Entrar
          </button>
          <button
            type="button"
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            onClick={() => window.location.href = '/api/auth/google'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.805 10.023h-9.765v3.977h5.588c-.241 1.238-1.03 2.287-2.199 2.963v2.463h3.548c2.078-1.916 3.298-4.74 3.298-8.403 0-.553-.045-1.09-.13-1.623z" fill="#4285F4"/><path d="M12.04 21c2.7 0 4.968-.896 6.624-2.427l-3.548-2.463c-.984.66-2.24 1.05-3.076 1.05-2.364 0-4.37-1.6-5.086-3.75h-3.6v2.513c1.654 3.263 5.23 5.077 8.686 5.077z" fill="#34A853"/><path d="M6.978 13.41a5.01 5.01 0 0 1 0-3.41v-2.513h-3.6a8.96 8.96 0 0 0 0 8.436l3.6-2.513z" fill="#FBBC05"/><path d="M12.04 7.5c1.47 0 2.79.505 3.83 1.49l2.87-2.87c-1.656-1.531-3.924-2.427-6.624-2.427-3.456 0-7.032 1.814-8.686 5.077l3.6 2.513c.716-2.15 2.722-3.75 5.086-3.75z" fill="#EA4335"/></svg>
            Entrar com Google
          </button>
          <Link href="/register" className="w-full text-center text-blue-400 hover:underline mt-2">
            Criar uma conta
          </Link>
        </form>
      </div>
    </div>
  );
}
