"use client";

import React from 'react';
import { User, Building2, Trophy, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PortaisPage() {
  const portais = [
    {
      title: 'ATLETA',
      icon: User,
      href: '/atleta',
      gradient: 'from-blue-400 to-blue-700',
      glow: 'bg-blue-500/20 group-hover:bg-blue-500/40',
    },
    {
      title: 'GESTÃO DE ACADEMIA',
      icon: Building2,
      href: '/academia',
      gradient: 'from-orange-400 to-amber-600',
      glow: 'bg-orange-500/20 group-hover:bg-orange-500/40',
    },
    {
      title: 'GESTÃO DE EVENTO',
      icon: Trophy,
      href: '/evento',
      gradient: 'from-red-400 to-red-700',
      glow: 'bg-red-500/20 group-hover:bg-red-500/40',
    },
    {
      title: 'GESTÃO DE FEDERAÇÃO',
      icon: Shield,
      href: '/federacao',
      gradient: 'from-indigo-400 to-indigo-700',
      glow: 'bg-indigo-500/20 group-hover:bg-indigo-500/40',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 sm:p-12 font-sans selection:bg-orange-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center">
        <div className="w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <header className="mb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tight mb-4">
            Titan
          </h1>
          <p className="text-gray-400 text-lg font-medium tracking-wide">
            Selecione o seu portal de acesso
          </p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
          {portais.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link key={portal.title} href={portal.href} className="outline-none">
                {/* Outer Glass Shell */}
                <div className="relative group rounded-[2.5rem] p-3 sm:p-4 bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 cursor-pointer">
                  {/* Ambient Glow behind the core */}
                  <div className={`absolute inset-0 rounded-[2.5rem] blur-2xl transition-all duration-500 ${portal.glow}`}></div>
                  {/* Luminous Core */}
                  <div className={`relative h-56 sm:h-64 w-full rounded-[2rem] bg-gradient-to-br ${portal.gradient} flex flex-col items-center justify-center border border-white/20 shadow-inner overflow-hidden`}>
                    {/* Liquid Glass Highlight (Top reflection) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-60 pointer-events-none"></div>
                    {/* Bottom Darkening for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center transform transition-transform duration-500 group-hover:-translate-y-2">
                      <Icon className="w-16 h-16 sm:w-20 sm:h-20 text-white mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] stroke-[1.5]" />
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] text-center px-4">
                        {portal.title}
                      </h2>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </main>
      </div>
    </div>
  );
}
