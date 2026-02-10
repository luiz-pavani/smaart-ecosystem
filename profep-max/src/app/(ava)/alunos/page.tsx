"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Users, Search, Calendar, ShieldCheck, Loader2, 
  BookOpen, X, GraduationCap, BarChart, Save, 
  ChevronRight, AlertCircle
} from "lucide-react";

export default function SecretariaPage() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    loadAlunos();
  }, []);

  async function loadAlunos() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setAlunos(data || []);
    setLoading(false);
  }

  // Função para salvar alteração de plano
  async function handleUpdatePlan(novoPlano: string) {
    if (!alunoSelecionado) return;
    setSalvando(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ plan: novoPlano })
      .eq("id", alunoSelecionado.id);

    if (!error) {
      setAlunoSelecionado({ ...alunoSelecionado, plan: novoPlano });
      loadAlunos(); // Atualiza a lista ao fundo
      alert("Graduação do aluno atualizada com sucesso!");
    } else {
      alert("Erro ao atualizar: " + error.message);
    }
    setSalvando(false);
  }

  const alunosFiltrados = alunos.filter(a => 
    a.full_name?.toLowerCase().includes(filtro.toLowerCase()) || 
    a.email?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="text-red-600" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Secretaria Executiva ProfepMax</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
            Gestão de <span className="text-red-600">Graduações</span>
          </h1>
        </div>

        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR SENSEI OU ALUNO..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black tracking-widest text-white outline-none focus:border-red-600 transition-all"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </header>

      {/* LISTAGEM PRINCIPAL */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-black/20 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <th className="p-8">Membro</th>
              <th className="p-8">Graduação Digital</th>
              <th className="p-8 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="p-8">
                  <div>
                    <p className="text-sm font-black uppercase italic tracking-tight text-white">{aluno.full_name || "Sem Nome"}</p>
                    <p className="text-[9px] font-bold text-zinc-600 tracking-widest uppercase">{aluno.email}</p>
                  </div>
                </td>
                <td className="p-8">
                   <span className={`text-[9px] font-black px-4 py-1.5 border rounded-full uppercase tracking-widest ${
                     aluno.plan === 'vitalicio' ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 
                     aluno.plan === 'free' ? 'border-zinc-700 text-zinc-600' : 'border-red-600 text-red-600 bg-red-600/5'
                   }`}>
                     {aluno.plan}
                   </span>
                </td>
                <td className="p-8 text-right">
                  <button 
                    onClick={() => setAlunoSelecionado(aluno)}
                    className="bg-zinc-800 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg"
                  >
                    Gerenciar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DOSSIÊ E EDIÇÃO DE PLANO */}
      {alunoSelecionado && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-end">
          <div className="bg-zinc-900 w-full max-w-xl h-full border-l border-zinc-800 p-12 overflow-y-auto relative shadow-2xl">
            
            <button onClick={() => setAlunoSelecionado(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-white"><X size={24} /></button>

            <div className="mb-12">
              <p className="text-red-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic">Dossiê Pedagógico</p>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                {alunoSelecionado.full_name}
              </h2>
            </div>

            {/* ÁREA DE TROCA DE PLANO */}
            <div className="space-y-6 mb-12 bg-black/40 border border-zinc-800 p-8 rounded-[32px]">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-red-600" size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Alterar Graduação Digital</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {['free', 'mensal', 'anual', 'vitalicio'].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdatePlan(p)}
                    disabled={salvando}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      alunoSelecionado.plan === p 
                      ? "border-red-600 bg-red-600/10 text-white" 
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 text-zinc-500"
                    }`}
                  >
                    {p}
                    {alunoSelecionado.plan === p && <Save size={14} />}
                  </button>
                ))}
              </div>
              
              {salvando && <div className="flex items-center gap-2 text-red-600 justify-center animate-pulse">
                <Loader2 className="animate-spin" size={14} />
                <span className="text-[8px] font-black uppercase">Sincronizando Banco de Dados...</span>
              </div>}
            </div>

            {/* RESUMO PEDAGÓGICO RÁPIDO */}
            <div className="space-y-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 italic">Histórico de Atividade</h3>
               <div className="bg-zinc-800/20 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-red-600" />
                    <span className="text-[10px] font-black uppercase text-white">Cursos em andamento</span>
                  </div>
                  <span className="text-sm font-black italic text-red-600">03</span>
               </div>
               <div className="bg-zinc-800/20 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart size={16} className="text-red-600" />
                    <span className="text-[10px] font-black uppercase text-white">Média de Progresso</span>
                  </div>
                  <span className="text-sm font-black italic text-red-600">68%</span>
               </div>
            </div>

            <div className="mt-12 p-6 bg-red-600/5 border border-red-600/20 rounded-2xl">
               <p className="text-zinc-500 text-[8px] font-bold leading-relaxed uppercase tracking-widest">
                 <AlertCircle className="inline mr-1" size={10} /> 
                 Qualquer alteração manual nesta área será refletida imediatamente no acesso do aluno ao AVA.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}