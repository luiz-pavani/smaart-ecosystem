"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import { 
  Trophy, 
  ArrowLeft, 
  Download, 
  XCircle, 
  Loader2, 
  Calendar,
  Share2
} from "lucide-react";
import Link from "next/link";

export default function ConclusaoPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dadosCertificado, setDadosCertificado] = useState<any>(null);

  useEffect(() => {
    const carregarDadosCertificado = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('full_name, aprovado_avaliacao, ultima_nota')
        .eq('id', user.id)
        .single();

      const { data: curso } = await supabase
        .from('cursos')
        .select('titulo, instrutor, duracao')
        .eq('id', params.id)
        .single();

      if (perfil && curso) {
        setDadosCertificado({
          aluno: perfil.full_name,
          curso: curso.titulo,
          instrutor: curso.instrutor || "Luiz Pavani",
          cargaHoraria: curso.duracao,
          nota: perfil.ultima_nota,
          aprovado: perfil.aprovado_avaliacao,
          dataEmissao: new Date().toLocaleDateString('pt-BR')
        });

        if (perfil.aprovado_avaliacao) {
          const { data: existente } = await supabase
            .from("resultados_exames")
            .select("id")
            .eq("user_id", user.id)
            .eq("curso_id", params.id)
            .eq("aprovado", true)
            .maybeSingle();

          if (existente?.id) {
            router.replace(`/certificado/${existente.id}`);
            return;
          }

          const { data: criado, error } = await supabase
            .from("resultados_exames")
            .insert([{
              user_id: user.id,
              curso_id: params.id,
              exame_id: null,
              nota: perfil.ultima_nota ?? 100,
              aprovado: true
            }])
            .select("id")
            .single();

          if (error && error.code === '23505') {
            const { data: fallback } = await supabase
              .from("resultados_exames")
              .select("id")
              .eq("user_id", user.id)
              .eq("curso_id", params.id)
              .eq("aprovado", true)
              .maybeSingle();
            if (fallback?.id) {
              router.replace(`/certificado/${fallback.id}`);
              return;
            }
          }

          if (criado?.id) {
            router.replace(`/certificado/${criado.id}`);
            return;
          }
        }
      }
      setLoading(false);
    };
    carregarDadosCertificado();
  }, [params.id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  const { aluno, curso, instrutor, cargaHoraria, aprovado, dataEmissao, nota } = dadosCertificado;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Glow de mérito dourado */}
      {aprovado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4AF37] blur-[200px] opacity-10 -z-10 rounded-full"></div>
      )}

      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[50px] p-10 md:p-16 text-center shadow-2xl relative">
        
        <div className={`w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center shadow-2xl transition-transform ${
          aprovado 
          ? 'bg-gradient-to-br from-[#D4AF37] to-[#AA8419] shadow-[#D4AF37]/20 rotate-3' 
          : 'bg-zinc-800'
        }`}>
          {aprovado ? <Trophy size={48} className="text-black" /> : <XCircle size={48} className="text-zinc-500" />}
        </div>

        {aprovado ? (
          <>
            <span className="text-[#D4AF37] font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Capacitação Técnica</span>
            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] mb-6">
              Certificação <br/><span className="text-[#D4AF37]">Concedida!</span>
            </h1>
            
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed max-w-md mx-auto font-medium">
              Parabéns, Professor(a) <span className="text-white font-bold">{aluno}</span>. Sua performance de <span className="text-[#D4AF37] font-black">{nota}%</span> garante sua aprovação no curso {curso}.
            </p>

            <div className="bg-black/50 border border-[#D4AF37]/20 rounded-3xl p-8 mb-10 text-left grid grid-cols-2 gap-y-6">
               <div>
                  <p className="text-zinc-500 text-[9px] uppercase font-black tracking-[0.2em] mb-1">Professor Responsável</p>
                  <p className="text-sm font-bold text-white uppercase">{instrutor}</p>
               </div>
               <div>
                  <p className="text-zinc-500 text-[9px] uppercase font-black tracking-[0.2em] mb-1">Carga Horária</p>
                  <p className="text-sm font-bold text-white uppercase">{cargaHoraria} Horas</p>
               </div>
               <div className="col-span-2 pt-4 border-t border-zinc-800/50 flex items-center gap-2 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
                  <Calendar size={14} /> Data de Emissão: {dataEmissao}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="w-full bg-[#D4AF37] text-black hover:bg-[#F5D76E] py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#D4AF37]/10">
                    <Download size={18} /> Baixar Certificado
                </button>
                <button className="w-full bg-zinc-800 text-white hover:bg-zinc-700 py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3">
                    <Share2 size={18} /> Compartilhar
                </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Desempenho <br/> Insuficiente</h1>
            <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">Sua nota: {nota}% • Necessário: 70%</p>
            <p className="text-zinc-600 text-xs leading-relaxed max-w-xs mx-auto">Recomendamos revisar os módulos técnicos antes de realizar uma nova tentativa do exame.</p>
            <Link href={`/cursos/${params.id}/prova`} className="block w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black uppercase text-xs transition-all shadow-xl shadow-red-600/20">
              Reiniciar Avaliação
            </Link>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition font-black text-[10px] uppercase tracking-[0.2em]">
            <ArrowLeft size={14} /> Voltar ao Painel
          </Link>
        </div>
      </div>
    </div>
  );
}