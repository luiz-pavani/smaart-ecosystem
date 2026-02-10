"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Send, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  Search
} from "lucide-react";

export default function AdminForum() {
  const [duvidas, setDuvidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resposta, setResposta] = useState<{ [key: string]: string }>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendentes' | 'todas'>('pendentes');

  useEffect(() => {
    fetchDuvidas();
  }, [filtro]);

  async function fetchDuvidas() {
    setLoading(true);
    let query = supabase
      .from("discussoes_aulas")
      .select(`
        *,
        profiles:usuario_id (full_name),
        cursos:curso_id (nome)
      `)
      .order("created_at", { ascending: true });

    if (filtro === 'pendentes') {
      query = query.is("resposta_admin", null);
    }

    const { data } = await query;
    setDuvidas(data || []);
    setLoading(false);
  }

  async function enviarResposta(id: string) {
    const texto = resposta[id];
    if (!texto?.trim()) return;

    setEnviando(id);
    const { error } = await supabase
      .from("discussoes_aulas")
      .update({ resposta_admin: texto })
      .eq("id", id);

    if (!error) {
      setResposta({ ...resposta, [id]: "" });
      fetchDuvidas();
    }
    setEnviando(null);
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      {/* HEADER ADMIN */}
      <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            Gestão do <span className="text-red-600">Fórum</span>
          </h1>
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mt-2">
            Central de Comando do Sensei
          </p>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
          <button 
            onClick={() => setFiltro('pendentes')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition ${filtro === 'pendentes' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFiltro('todas')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition ${filtro === 'todas' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={40} /></div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6">
          {duvidas.map((d) => (
            <div key={d.id} className={`bg-zinc-900/50 border ${!d.resposta_admin ? 'border-red-600/30' : 'border-zinc-800'} p-8 rounded-[32px] transition-all`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center font-black text-red-600 italic border border-zinc-700">
                    {d.profiles?.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic tracking-tight">{d.profiles?.full_name}</h4>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase italic">{d.cursos?.nome} • {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {!d.resposta_admin && (
                  <span className="bg-red-600/10 text-red-600 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-red-600/20 animate-pulse">
                    Aguardando Sensei
                  </span>
                )}
              </div>

              <div className="bg-black/40 p-6 rounded-2xl mb-6 italic text-zinc-300 text-sm border-l-2 border-zinc-700">
                "{d.comentario}"
              </div>

              {/* CAMPO DE RESPOSTA */}
              <div className="relative">
                <textarea 
                  placeholder="Escreve a tua orientação técnica aqui..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm italic focus:border-red-600/50 outline-none transition-all h-24 resize-none"
                  value={resposta[d.id] || ""}
                  onChange={(e) => setResposta({ ...resposta, [d.id]: e.target.value })}
                />
                <div className="absolute bottom-4 right-4">
                  <button 
                    onClick={() => enviarResposta(d.id)}
                    disabled={enviando === d.id || !resposta[d.id]?.trim()}
                    className="bg-red-600 hover:bg-white text-white hover:text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 disabled:opacity-30"
                  >
                    {enviando === d.id ? <Loader2 className="animate-spin" size={12} /> : <><Send size={12} /> Enviar Resposta</>}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {duvidas.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[40px]">
              <CheckCircle2 size={40} className="mx-auto mb-4 text-zinc-800" />
              <p className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.4em] italic">Nenhuma pendência. A tribo está em ordem.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}