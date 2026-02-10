"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Loader2, ShieldCheck, XCircle, Award } from "lucide-react";
import Link from "next/link";

type CertificadoResultado = {
  id: string;
  aprovado: boolean;
  nota: number | null;
  created_at: string | null;
  cursos: {
    titulo: string | null;
    instrutor: string | null;
    duracao: number | null;
  } | null | Array<{
    titulo: string | null;
    instrutor: string | null;
    duracao: number | null;
  }>;
  profiles: {
    full_name: string | null;
  } | null | Array<{
    full_name: string | null;
  }>;
};

export default function ValidarCertificadoPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<CertificadoResultado | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("resultados_exames")
          .select("id, aprovado, nota, created_at, cursos(titulo, instrutor, duracao), profiles(full_name)")
          .eq("id", id)
          .single();

        if (error) {
          setResultado(null);
        } else {
          setResultado(data);
        }
      } catch (err) {
        console.error("Erro ao validar certificado:", err);
        setResultado(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) carregar();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-red-600 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin mb-4" size={42} />
        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Validando certificado...</span>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <XCircle size={64} className="text-red-600 mb-6" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Certificado não encontrado</h1>
        <p className="text-zinc-500 mt-2 text-sm uppercase tracking-widest">Verifique o código informado.</p>
        <Link href="/" className="mt-8 bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">Voltar ao site</Link>
      </div>
    );
  }

  const curso = Array.isArray(resultado.cursos) ? resultado.cursos[0] : resultado.cursos;
  const perfil = Array.isArray(resultado.profiles) ? resultado.profiles[0] : resultado.profiles;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[40px] p-10 md:p-14 text-center shadow-2xl">
        {resultado.aprovado ? (
          <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-green-600/10 border border-green-600/30 flex items-center justify-center">
            <ShieldCheck size={40} className="text-green-500" />
          </div>
        ) : (
          <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-red-600/10 border border-red-600/30 flex items-center justify-center">
            <XCircle size={40} className="text-red-500" />
          </div>
        )}

        <p className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-500 mb-4">Validação Oficial</p>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
          {resultado.aprovado ? "Certificado Válido" : "Certificado Inválido"}
        </h1>

        <div className="mt-8 bg-black/40 border border-white/5 rounded-3xl p-6 text-left space-y-4">
          <div>
            <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Aluno</p>
            <p className="text-sm font-bold uppercase text-white">{perfil?.full_name || "---"}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Curso</p>
            <p className="text-sm font-bold uppercase text-white">{curso?.titulo || "---"}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Instrutor</p>
              <p className="text-sm font-bold uppercase text-white">{curso?.instrutor || "Luiz Pavani"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Carga Horária</p>
              <p className="text-sm font-bold uppercase text-white">{curso?.duracao ? `${curso.duracao}h` : "---"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Nota</p>
              <p className="text-sm font-bold uppercase text-white">{typeof resultado.nota === "number" ? `${resultado.nota}%` : "---"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Emissão</p>
              <p className="text-sm font-bold uppercase text-white">{resultado.created_at ? new Date(resultado.created_at).toLocaleDateString("pt-BR") : "---"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-black">
          <Award size={14} /> PROFEP MAX 2026
        </div>
      </div>
    </div>
  );
}
