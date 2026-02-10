"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import { 
  Loader2, 
  ClipboardCheck, 
  AlertCircle, 
  ChevronLeft
} from "lucide-react";
import Link from "next/link";

export default function ProvaPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [curso, setCurso] = useState<any>(null);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      
      // Busca dados do curso
      const { data: cursoData } = await supabase
        .from("cursos")
        .select("*")
        .eq("id", params.id)
        .single();
      
      if (!cursoData) {
        router.push("/cursos");
        return;
      }
      setCurso(cursoData);

      // Busca perguntas pelo nome do curso
      const { data: perguntasData } = await supabase
        .from("perguntas")
        .select("*")
        .eq("curso_nome", cursoData.titulo)
        .limit(10);

      setPerguntas(perguntasData || []);
      setLoading(false);
    };

    carregarDados();
  }, [params.id, router]);

  const finalizarProva = async () => {
    setEnviando(true);
    let acertos = 0;

    perguntas.forEach((p, index) => {
      if (respostas[index] === p.correta) {
        acertos++;
      }
    });

    const notaFinal = (acertos / perguntas.length) * 100;
    const aprovado = notaFinal >= 70;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("profiles").update({
        ultima_nota: notaFinal,
        aprovado_avaliacao: aprovado
      }).eq("id", user.id);

      await supabase.from("progresso_aulas").upsert({
        usuario_id: user.id,
        curso_id: params.id,
        concluido: true
      });
    }

    router.push(`/cursos/${params.id}/conclusao`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-red-600" size={40} />
    </div>
  );

  if (perguntas.length === 0) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={64} className="text-zinc-700 mb-6" />
      <h2 className="text-2xl font-black uppercase italic">Nenhuma pergunta cadastrada</h2>
      <p className="text-zinc-500 mt-2 mb-8 uppercase text-[10px] font-bold tracking-widest">Este curso ainda não possui questões no banco de dados.</p>
      <Link href={`/cursos/${params.id}`} className="bg-red-600 px-8 py-4 rounded-2xl font-black uppercase text-xs">Voltar ao curso</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans py-20 px-6">
      
      <div className="max-w-3xl mx-auto text-center mb-20">
        <Link href={`/cursos/${params.id}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition font-bold text-xs uppercase tracking-widest">
          <ChevronLeft size={16} /> Cancelar Exame
        </Link>
        <div className="bg-red-600/10 border border-red-600/20 w-fit mx-auto px-4 py-1 rounded-full text-red-500 text-[10px] font-black uppercase mb-4 tracking-widest">
            Banca Examinadora ProfepMax
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">Prova Final</h1>
        <p className="text-zinc-500 mt-4 font-bold uppercase text-xs tracking-widest">Curso: {curso?.titulo}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-10">
        {perguntas.map((p, index) => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-8 md:p-12 rounded-[40px] relative">
            <div className="absolute top-0 left-0 bg-red-600 text-white font-black text-[10px] px-6 py-2 rounded-br-2xl uppercase tracking-widest">
              Questão {index + 1} de {perguntas.length}
            </div>
            
            <h3 className="text-xl md:text-2xl font-bold mt-6 mb-10 leading-tight text-zinc-100">
              {p.pergunta}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {[p.opcao1, p.opcao2, p.opcao3, p.opcao4, p.opcao5].filter(Boolean).map((opcao) => (
                <button
                  key={opcao}
                  onClick={() => setRespostas({ ...respostas, [index]: opcao })}
                  className={`w-full text-left p-6 rounded-2xl font-bold text-sm transition-all border-2 ${
                    respostas[index] === opcao 
                    ? "bg-red-600 border-red-500 text-white shadow-xl shadow-red-600/20 translate-x-2" 
                    : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${respostas[index] === opcao ? "border-white" : "border-zinc-800"}`}>
                      {respostas[index] === opcao && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    {opcao}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-10">
          <button 
            onClick={finalizarProva}
            disabled={enviando || Object.keys(respostas).length < perguntas.length}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-8 rounded-[32px] font-black uppercase text-sm transition-all disabled:opacity-20 disabled:grayscale shadow-2xl shadow-red-600/20 flex items-center justify-center gap-3"
          >
            {enviando ? <Loader2 className="animate-spin" /> : (
              <>
                CONCLUIR PROVA <ClipboardCheck size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}