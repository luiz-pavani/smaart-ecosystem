"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  MessageSquare, Send, CheckCircle2, 
  Loader2, User, Search, Clock
} from "lucide-react";

export default function SuporteAdminPage() {
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [respostaTexto, setRespostaTexto] = useState<{ [key: string]: string }>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendentes' | 'todas'>('pendentes');

  async function loadComentarios() {
    setLoading(true);
    let query = supabase
      .from("discussoes_aulas")
      .select(`
        *,
        profiles:usuario_id (full_name),
        aulas:aula_id (titulo)
      `)
      .order("created_at", { ascending: false });

    if (filtro === 'pendentes') {
      query = query.is("resposta_admin", null);
    }

    const { data } = await query;
    if (data) setComentarios(data);
    setLoading(false);
  }

  useEffect(() => { loadComentarios(); }, [filtro]);

  async function enviarResposta(id: string) {
    const texto = respostaTexto[id];
    if (!texto?.trim()) return;

    setEnviando(id);
    const { error } = await supabase
      .from("discussoes_aulas")
      .update({ 
        resposta_admin: texto,
        respondido_em: new Date().toISOString()
      })
      .eq("id", id);

    if (!error) {
      setRespostaTexto({ ...respostaTexto, [id]: "" });
      loadComentarios();
    }
    setEnviando(null);
  }

  if (loading && comentarios.length === 0) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-red-600" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-8 lg:p-12 font-sans">
      
      <header className="max-w-5xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-zinc-800">
            <MessageSquare size={14} className="text-red-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Dojo Support Central</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
            Suporte ao <span className="text-red-600">Aluno</span>
          </h1>
        </div>

        <nav className="flex bg-black p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setFiltro('pendentes')}
            className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filtro === 'pendentes' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-800 hover:text-white'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFiltro('todas')}
            className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filtro === 'todas' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-800 hover:text-white'}`}
          >
            Histórico
          </button>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto space-y-6">
        {comentarios.map((c) => (
          <div key={c.id} className="bg-black border border-white/5 p-8 rounded-[40px] hover:border-red-600/30 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black border border-white/10 rounded-2xl flex items-center justify-center text-red-600 font-black italic group-hover:border-red-600 transition-all text-xl">
                  {c.profiles?.full_name?.charAt(0) || <User size={20}/>}
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase italic tracking-tight">{c.profiles?.full_name || "Membro da Tribo"}</p>
                  <p className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={10}/> {new Date(c.created_at).toLocaleDateString()} • {c.aulas?.titulo || 'Aula Geral'}
                  </p>
                </div>
              </div>
              {c.resposta_admin && (
                <span className="bg-green-500/10 text-green-500 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-green-500/20">
                  Respondido
                </span>
              )}
            </div>

            <div className="bg-white/[0.02] p-6 rounded-3xl mb-6 italic text-zinc-300 text-sm border-l-2 border-red-600/50">
              "{c.comentario}"
            </div>

            <div className="relative">
              <textarea 
                placeholder="Escreva sua orientação técnica aqui, Sensei..."
                className="w-full bg-black border border-white/5 rounded-[30px] p-6 text-sm italic focus:border-red-600/50 outline-none transition-all h-32 resize-none shadow-inner"
                value={respostaTexto[c.id] || c.resposta_admin || ""}
                onChange={(e) => setRespostaTexto({ ...respostaTexto, [c.id]: e.target.value })}
              />
              <div className="absolute bottom-4 right-4">
                <button 
                  onClick={() => enviarResposta(c.id)}
                  disabled={enviando === c.id || (!respostaTexto[c.id]?.trim() && !c.resposta_admin)}
                  className="bg-red-600 hover:bg-white text-white hover:text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-xl disabled:opacity-20"
                >
                  {enviando === c.id ? <Loader2 className="animate-spin" size={14} /> : <><Send size={14} /> {c.resposta_admin ? "Atualizar" : "Enviar Resposta"}</>}
                </button>
              </div>
            </div>
          </div>
        ))}

        {comentarios.length === 0 && !loading && (
          <div className="text-center py-32 border border-dashed border-white/5 rounded-[60px]">
            <CheckCircle2 size={40} className="mx-auto mb-4 text-zinc-900" />
            <p className="text-[10px] font-black uppercase text-zinc-800 tracking-[0.4em] italic">Nenhuma pendência. O Dojo está em ordem.</p>
          </div>
        )}
      </div>
    </div>
  );
}