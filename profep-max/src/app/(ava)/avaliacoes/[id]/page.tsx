"use client";

import { useEffect, useState, useCallback } from "react";
// CORREÇÃO: Adicionado useSearchParams
import { useParams, useRouter, useSearchParams } from "next/navigation"; 
import { supabase } from "../../../../lib/supabase";
import { Loader2, ChevronRight, ChevronLeft, Award, Trophy, XCircle, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function PaginaExecucaoAvaliacao() {
  const { id } = useParams();
  const router = useRouter();
  // CORREÇÃO: Inicialização do hook de busca
  const searchParams = useSearchParams(); 

  const [avaliacao, setAvaliacao] = useState<any>(null);
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string[]>>({}); 
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ idResultado?: string; nota: number; aprovado: boolean } | null>(null);

  const shuffle = (array: any[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const loadProvaCompleta = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // CORREÇÃO: Verifica se a URL contém o comando para refazer
      const forcandoRefazer = searchParams.get('refazer') === 'true';

      const { data: jaAprovado } = await supabase
        .from("resultados_exames")
        .select("id")
        .eq("user_id", user.id)
        .eq("exame_id", id)
        .eq("aprovado", true)
        .maybeSingle();

      // CORREÇÃO: Só redireciona se já aprovado E NÃO estiver forçando o refazer
      if (jaAprovado && !forcandoRefazer) {
        return router.push(`/certificado/${jaAprovado.id}`);
      }

      const { data: prova, error: errProva } = await supabase
        .from("avaliacoes")
        .select("*")
        .eq("id", id)
        .single();
      
      if (errProva || !prova) return;
      setAvaliacao(prova);

      let { data: allQuests } = await supabase
        .from("perguntas_avaliacao")
        .select("*")
        .or(`tema1.eq.${prova.tema_obrigatorio},tema2.eq.${prova.tema_obrigatorio}`);

      if (!allQuests || allQuests.length === 0) {
        const { data: fallback } = await supabase.from("perguntas_avaliacao").select("*").eq("avaliacao_id", id);
        allQuests = fallback;
      }

      if (allQuests && allQuests.length > 0) {
        const sorteadas = shuffle([...allQuests]).slice(0, 10);
        const formatadas = sorteadas.map(q => {
          const alternativas = [
            { texto: q.opcao_a },
            { texto: q.opcao_b },
            { texto: q.opcao_c },
            { texto: q.opcao_d },
            { texto: q.opcao_e }
          ].filter(alt => alt.texto);

          return {
            ...q,
            alternativasEmbaralhadas: shuffle(alternativas)
          };
        });

        setPerguntas(formatadas);
      }
    } catch (e) {
      console.error("Erro ao carregar prova:", e);
    }
    // CORREÇÃO: searchParams adicionado às dependências
  }, [id, router, searchParams]); 

  useEffect(() => {
    if (id) loadProvaCompleta();
  }, [id, loadProvaCompleta]);

  const handleResponder = (textoOpcao: string) => {
    const q = perguntas[indiceAtual];
    const gabaritoOriginal = q.resposta_correta || "";
    const eMultipla = gabaritoOriginal.includes('|');
    const selecoes = respostas[q.id] || [];

    if (eMultipla) {
      setRespostas({ 
        ...respostas, 
        [q.id]: selecoes.includes(textoOpcao) 
          ? selecoes.filter(i => i !== textoOpcao) 
          : [...selecoes, textoOpcao] 
      });
    } else {
      setRespostas({ ...respostas, [q.id]: [textoOpcao] });
    }
  };

  const finalizarProva = async () => {
    setEnviando(true);
    let acertos = 0;
    
    perguntas.forEach(p => {
      const escolhas = respostas[p.id] || [];
      const gabarito = (p.resposta_correta || "").split('|').map((s: string) => s.trim());
      const acertou = gabarito.length === escolhas.length && 
                      gabarito.every((g: string) => escolhas.includes(g));
      if (acertou) acertos++;
    });

    const notaFinal = Math.round((acertos / perguntas.length) * 100);
    const aprovado = notaFinal >= (avaliacao?.media_aprovacao || 80);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: resInsert, error: errInsert } = await supabase
        .from("resultados_exames")
        .insert([{
          user_id: user?.id,
          curso_id: avaliacao.curso_id,
          exame_id: id,
          nota: notaFinal,
          aprovado: aprovado
        }])
        .select()
        .single();

      if (errInsert && errInsert.code === '23505') {
        const { data: existente } = await supabase
          .from("resultados_exames")
          .select("id")
          .eq("user_id", user?.id)
          .eq("curso_id", avaliacao.curso_id)
          .eq("aprovado", true)
          .single();
          
        setResultado({ idResultado: existente?.id, nota: notaFinal, aprovado: true });
      } else {
        if (aprovado) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff0000', '#ffffff', '#000000'] });
        }
        setResultado({ idResultado: resInsert?.id, nota: notaFinal, aprovado });
      }
    } catch (e) {
      console.error("Erro ao salvar resultado:", e);
    } finally {
      setEnviando(false);
    }
  };

  if (!avaliacao || perguntas.length === 0) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white italic font-black text-[10px] uppercase tracking-widest">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      Sorteando Conteúdo Único...
    </div>
  );

  if (resultado) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl w-full bg-zinc-950 border border-zinc-900 p-12 rounded-[40px] space-y-8 shadow-2xl">
        {resultado.aprovado ? (
          <>
            <Trophy size={64} className="text-amber-500 mx-auto" />
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">Aprovado!</h2>
            <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">Graduação validada com nota {resultado.nota}%</p>
            <button 
              onClick={() => router.push(`/certificado/${resultado.idResultado}`)}
              className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase text-xs hover:bg-red-600 hover:text-white transition-all shadow-xl"
            >
              Baixar Certificado
            </button>
            {/* BOTÃO ADICIONAL PARA REPETIR IMEDIATAMENTE */}
            <button onClick={() => window.location.reload()} className="w-full text-zinc-600 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">Refazer para Treinar</button>
          </>
        ) : (
          <>
            <XCircle size={64} className="text-red-600 mx-auto" />
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-500">Tente Novamente</h2>
            <p className="text-zinc-600 font-bold text-sm uppercase tracking-widest leading-relaxed">Nota: {resultado.nota}% <br/> Critério de elite: {avaliacao.media_aprovacao}%</p>
            <button onClick={() => window.location.reload()} className="w-full bg-zinc-900 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all">Reiniciar Exame</button>
          </>
        )}
      </div>
    </div>
  );

  const questao = perguntas[indiceAtual];
  const eMultipla = (questao.resposta_correta || "").includes('|');

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 lg:p-20">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-red-600 font-black uppercase text-[10px] tracking-[0.3em] mb-2 italic">
                {eMultipla ? "Múltipla Escolha" : "Alternativa Única"}
              </p>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">{avaliacao.titulo}</h1>
            </div>
            <span className="text-2xl font-black italic text-zinc-800">{indiceAtual + 1} / {perguntas.length}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${((indiceAtual + 1) / perguntas.length) * 100}%` }} />
          </div>
        </header>

        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h3 className="text-2xl font-black italic uppercase tracking-tight leading-tight">{questao.enunciado}</h3>

          <div className="grid gap-4">
            {questao.alternativasEmbaralhadas.map((alt: any, index: number) => {
              const texto = alt.texto;
              const isSelected = respostas[questao.id]?.includes(texto);
              
              return (
                <button
                  key={index}
                  onClick={() => handleResponder(texto)}
                  className={`p-6 rounded-2xl border text-left transition-all font-bold uppercase text-[11px] tracking-widest flex items-center justify-between ${
                    isSelected 
                    ? "bg-red-600 border-red-500 text-white shadow-lg translate-x-2" 
                    : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  <span>{texto}</span>
                  {isSelected && <CheckCircle2 size={18} className="text-white" />}
                </button>
              );
            })}
          </div>
        </section>

        <footer className="mt-16 flex justify-between items-center">
          <button 
            disabled={indiceAtual === 0} 
            onClick={() => setIndiceAtual(prev => prev - 1)} 
            className="flex items-center gap-2 text-zinc-600 font-black uppercase text-[10px] tracking-widest disabled:opacity-0 transition-all hover:text-white"
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          {indiceAtual === perguntas.length - 1 ? (
            <button 
              onClick={finalizarProva}
              disabled={enviando || !respostas[questao.id] || respostas[questao.id].length === 0}
              className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-xl"
            >
              {enviando ? <Loader2 className="animate-spin" size={16} /> : "Finalizar Graduação"}
            </button>
          ) : (
            <button 
              disabled={!respostas[questao.id] || respostas[questao.id].length === 0}
              onClick={() => setIndiceAtual(prev => prev + 1)}
              className="flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest bg-zinc-900 px-8 py-5 rounded-2xl hover:bg-zinc-800 transition-all border border-zinc-800"
            >
              Próxima Questão <ChevronRight size={16} />
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}