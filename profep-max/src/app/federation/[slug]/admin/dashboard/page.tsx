"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ShieldAlert, LogOut, Users, FileCheck, Shield } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkSecurity() {
      try {
        // 1. Verifica se está logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Acesso negado");

        // 2. Busca o ID da federação pelo slug
        const { data: entity } = await supabase.from('entities').select('id').eq('slug', slug).single();
        if (!entity) throw new Error("Federação não encontrada");

        // 3. Verifica se tem permissão de GESTOR ou ADMIN e se está ATIVO
        const { data: membership, error: membError } = await supabase
          .from('entity_memberships')
          .select('role, status_inscricao')
          .eq('profile_id', user.id)
          .eq('entity_id', entity.id)
          .maybeSingle();

        if (membError || !membership) throw new Error("Acesso negado");

        // Regra de Acesso: Precisa ser manager/admin E não pode estar pendente
        const isAuthorized = 
          (membership.role === 'manager' || membership.role === 'admin') && 
          membership.status_inscricao === 'GESTOR_ATIVO';

        if (!isAuthorized) {
          alert("Sua conta de gestor ainda não foi aprovada pelo Administrador Principal.");
          router.push(`/federation/${slug}/login/gestor`);
          return;
        }

        setUserRole(membership.role);
        setLoading(false);

      } catch (error) {
        console.error("Segurança Admin:", error);
        router.push(`/federation/${slug}/login/gestor`);
      }
    }

    checkSecurity();
  }, [slug, router, supabase]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
        <span className="text-[10px] font-black uppercase tracking-widest">Validando Credenciais...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      {/* Aqui entra o seu conteúdo original da dashboard */}
      <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
        <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Painel de Gestão</h1>
            <p className="text-slate-500 text-sm mt-1">
                Conectado como: <span className="text-blue-500 font-bold uppercase">{userRole}</span>
            </p>
        </div>
        <button 
            onClick={async () => { await supabase.auth.signOut(); router.push(`/federation/${slug}/login/gestor`); }}
            className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 hover:text-white transition-colors"
        >
            Sair do Painel <LogOut size={14}/>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl hover:border-blue-500/30 transition-all cursor-pointer group">
            <Users size={24} className="text-blue-500 mb-4" />
            <h3 className="text-xl font-bold uppercase italic">Candidatos</h3>
            <p className="text-slate-500 text-xs mt-2">Lista completa de inscritos e status.</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl hover:border-green-500/30 transition-all cursor-pointer group">
            <FileCheck size={24} className="text-green-500 mb-4" />
            <h3 className="text-xl font-bold uppercase italic">Documentos</h3>
            <p className="text-slate-500 text-xs mt-2">Validar e aprovar dossiês pendentes.</p>
        </div>
      </div>
    </div>
  );
}