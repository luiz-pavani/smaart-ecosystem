"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { 
  GraduationCap, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Infinity, 
  Users,
  BookOpen,
  Trophy,
  BarChart3,
  PlayCircle,
  Star,
  Plus
} from "lucide-react";

export default function LandingPage() {

  // --- LÓGICA DE PREÇOS DINÂMICOS ---
  const [precos, setPrecos] = useState<any>({});
  // Calcula o valor do cartão (20% OFF) dinamicamente
  const precoMensal = parseFloat(precos.mensal || '49.90');
  const precoCartao = (precoMensal * 0.8).toFixed(2).replace('.', ',');

  useEffect(() => {
    async function loadPrices() {
        const { data } = await supabase.from('configuracoes').select('*');
        if (data) {
          const p = data.reduce((acc: any, cur: any) => ({ 
            ...acc, [cur.chave.replace('preco_', '')]: cur.valor 
          }), {});
          setPrecos(p);
        }
      }
      loadPrices();
      // Atualiza preços a cada 10 segundos para garantir sincronização
      const interval = setInterval(loadPrices, 10000);
      return () => clearInterval(interval);
  }, []);
  // ----------------------------------
  
  const scrollToPlanos = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  };

  const professores = [
    { nome: "Yuko Fujii", cargo: "Técnica Multimedalhista Olímpica" },
    { nome: "Douglas Vieira", cargo: "Vice-campeão Olímpico" },
    { nome: "Maria Suelen Altheman", cargo: "Multimedalhista Mundial" },
    { nome: "Kento Iwanaga", cargo: "Professor da Kodokan" },
    { nome: "Shusaku Kiryu", cargo: "Professor da Kodokan" },
    { nome: "Luiz Pavani", cargo: "Kodansha e Mestre em Ed. Física" },
    { nome: "Gustavo Goulart", cargo: "Mestre em Ed. Física e Faixa Preta da Kodokan" },
  ];

  const categorias = [
    {
      id: "SENSEI",
      titulo: "SENSEI",
      subtitulo: "DIDÁTICA, PEDAGOGIA E HISTÓRIA",
      icon: <Users size={32} />,
      cursos: [
        "Ensino do Judô Infantil", "História do Judô", "Conde Koma: A História Definitiva",
        "Terminologia do Judô", "Curso Avançado de Waza", "História do Judô no Brasil",
        "Palestra com Kento Iwanaga (Kodokan)", "Diferenças entre Técnicas Semelhantes",
        "Palestra com Shusaku Kiryu (Kodokan)"
      ]
    },
    {
      id: "TREINADOR",
      titulo: "TREINADOR",
      subtitulo: "ALTO RENDIMENTO E METODOLOGIA",
      icon: <Trophy size={32} />,
      cursos: [
        "Direto do Dojo com Maria Suelen Altheman", "Metodologia Japonesa com Yuko Fujii",
        "Treinamento de Categorias de Base", "Curso de Arbitragem", "Direto do Dojo com Douglas Vieira"
      ]
    },
    {
      id: "KATA",
      titulo: "KATA",
      subtitulo: "FUNDAMENTOS E FORMAS OFICIAIS",
      icon: <BookOpen size={32} />,
      cursos: [
        "Kodomo-no-Kata", "Nage-no-Kata", "Seiryoku Zen'yo Kokumin Taiiku",
        "Kodokan Goshin-jutsu", "Katame-no-Kata"
      ]
    },
    {
      id: "GESTÃO",
      titulo: "GESTÃO",
      subtitulo: "ADMINISTRAÇÃO E MARKETING DE DOJOS",
      icon: <BarChart3 size={32} />,
      cursos: [
        "Gestão de Projetos Sociais", "Administração Esportiva", "Gestão de Academias",
        "Gestão de Eventos Esportivos"
      ]
    }
  ];

  const faqs = [
    {
      q: "COMO RECEBO O ACESSO?",
      a: "Imediatamente após a confirmação do pagamento. Você receberá um e-mail automático com seus dados de login para nossa plataforma exclusiva."
    },
    {
      q: "PRECISO TER CONHECIMENTOS AVANÇADOS?",
      a: "Não! O PROFEPMAX foi desenhado para todos os níveis. Desde o estudante que quer começar com a base correta até o Sensei experiente que busca atualização com a elite da Kodokan."
    },
    {
      q: "QUAIS SÃO AS FORMAS DE PAGAMENTO?",
      a: "Aceitamos Cartão de Crédito (com parcelamento), Boleto e Pix (com liberação imediata)."
    },
    {
      q: "O CONTEÚDO TEM CERTIFICADO?",
      a: "Sim, nossas formações oferecem certificados de conclusão que enriquecem seu currículo acadêmico e profissional no Judô."
    },
    {
      q: "TENHO GARANTIA?",
      a: "Sim! Oferecemos 7 dias de garantia incondicional. Se você sentir que a plataforma não é para você, devolvemos 100% do seu investimento."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600">
      
      {/* NAVBAR */}
      <nav className="border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="text-sm font-black italic uppercase tracking-tighter">
              PROFEP<span className="text-red-600">MAX</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition">Entrar</Link>
            <button onClick={scrollToPlanos} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              Ver Planos
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* HERO SECTION - TAGLINE ATUALIZADA */}
        <section className="relative pt-32 pb-48 px-6 overflow-hidden text-center md:text-left">
          <div className="max-w-7xl mx-auto relative z-10">
            <span className="bg-red-600/10 text-red-600 border border-red-600/20 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.3em] mb-10 inline-block">
              A Maior Plataforma de Ensino de Judô da América Latina
            </span>
            
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-8 leading-[0.9]">
              A Inteligência <br /> 
              <span className="text-red-600">Por Trás do Ippon</span>
            </h1>

            {/* TAGLINE ATUALIZADA AQUI */}
            <p className="text-zinc-400 text-xl md:text-2xl max-w-3xl font-medium mb-12 leading-relaxed">
              Onde a tradição da <span className="text-white font-bold">Kodokan</span> encontra a experiência dos grandes campeões e a <span className="text-red-600 font-black italic">inovação da ciência e tecnologia</span>. Tudo o que você precisa saber, da <span className="text-white font-bold">iniciação ao alto rendimento</span>, em um só lugar.
            </p>

            <div className="flex flex-col md:flex-row gap-6">
              <button onClick={scrollToPlanos} className="bg-white text-black px-12 py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-4 shadow-2xl">
                Escolha seu plano <ArrowRight size={20} />
              </button>
              <button onClick={scrollToPlanos} className="bg-zinc-900 border border-zinc-800 text-white px-12 py-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:border-zinc-600 transition-all flex items-center justify-center">
                Acesso Degustação (Free)
              </button>
            </div>
          </div>
          <GraduationCap size={600} className="absolute -right-20 -bottom-20 text-white/[0.02] pointer-events-none" />
        </section>

        {/* SEÇÃO DE PROFESSORES */}
        <section className="py-24 px-6 border-y border-zinc-900 bg-zinc-950/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/3">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-6 leading-tight text-white">
                  Aprenda com a <br /> <span className="text-red-600">Elite do Judô</span>
                </h2>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                  Grandes nomes da Kodokan e medalhistas olímpicos reunidos para transformar sua carreira.
                </p>
              </div>
              <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {professores.map((prof, i) => (
                  <div key={i} className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl hover:border-red-600 transition-all group">
                    <div className="bg-red-600/10 p-2 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                      <Star size={16} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase text-white tracking-tight">{prof.nome}</p>
                      <p className="text-[9px] font-bold uppercase text-zinc-500">{prof.cargo}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-zinc-800 italic">
                   <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">... e muito mais</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VITRINE DE CURSOS POR CATEGORIA */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto space-y-32">
            {categorias.map((cat) => (
              <div key={cat.id} className="space-y-12">
                <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[40px] flex flex-col items-start group hover:border-red-600 transition-all shadow-xl">
                  <div className="text-red-600 mb-6 group-hover:scale-110 transition-transform">{cat.icon}</div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2">{cat.titulo}</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{cat.subtitulo}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cat.cursos.map((curso, idx) => (
                    <div key={idx} className="group bg-zinc-900/30 border border-zinc-800 p-6 rounded-[32px] hover:bg-zinc-900/60 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <PlayCircle size={20} className="text-red-600" />
                        <span className="text-sm font-black uppercase italic tracking-tight leading-tight">{curso}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-center py-10 border-2 border-dashed border-zinc-900 rounded-[40px]">
              <p className="text-zinc-700 font-black uppercase tracking-[0.5em] text-xs">+ Novas atualizações mensais</p>
            </div>
          </div>
        </section>

        {/* SEÇÃO DE PLANOS */}
        <section id="planos" className="py-32 px-6 scroll-mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4 text-white">Escolha sua <span className="text-red-600">Jornada</span></h2>
              <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Acesso imediato a +20 formações especializadas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {/* 1. FREE */}
              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[32px] flex flex-col h-full">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 text-center">DEGUSTAÇÃO</p>
                <h4 className="text-xl font-black text-white italic mb-2 uppercase tracking-tighter text-center">Iniciante Free</h4>
                <p className="text-zinc-500 text-[10px] font-bold uppercase mb-8 text-center">Acesso à plataforma e um curso gratuito</p>
                <div className="mt-auto pt-8 mb-8 text-center"><span className="text-4xl font-black italic">R$ 0</span></div>
                <Link href="/login" className="text-center w-full py-4 border border-zinc-700 hover:bg-white hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Começar Grátis</Link>
              </div>

              {/* 2. MENSAL */}
              <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-[32px] flex flex-col h-full hover:border-green-500/50 transition-all">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 text-center">PLANO</p>
                <h4 className="text-xl font-black text-white italic mb-2 uppercase tracking-tighter text-center">Mensal</h4>
                <p className="text-zinc-500 text-[10px] font-bold uppercase mb-4 text-center italic">Acesso total com renovação mensal</p>
                
                {/* Badge de Desconto no Cartão */}
                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-xl mb-4">
                  <p className="text-green-400 text-[9px] font-black uppercase text-center tracking-tight">
                    💳 R$ {precoCartao} no Cartão
                  </p>
                </div>

                <div className="mt-auto pt-8 mb-8 text-center text-white">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-zinc-600 text-lg line-through">R$ 59,90</span>
                  </div>
                  <span className="text-3xl font-black italic text-white mb-1">R$ {precoMensal.toFixed(2).replace('.', ',')}/mês</span>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase">Promo de Lançamento</span>
                  <p className="text-green-400 text-[10px] mt-3 font-black uppercase">💳 R$ {precoCartao} com Cartão</p>
                </div>
                <Link href="/checkout?plan=mensal" className="text-center w-full py-4 bg-green-600 hover:bg-white hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Assinar com Desconto</Link>
              </div>

              {/* 3. ANUAL */}
              <div className="bg-red-600/5 border-2 border-red-600 p-8 rounded-[40px] relative flex flex-col h-full shadow-2xl shadow-red-600/10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">MAIS ESCOLHIDO</div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center justify-center gap-2"><Zap size={12} fill="currentColor" /> Economia de 50%</p>
                <h4 className="text-2xl font-black text-white italic mb-2 uppercase tracking-tighter text-center">Anual</h4>
                <p className="text-red-600/60 text-[10px] font-bold uppercase mb-8 text-center italic">O melhor custo-benefício para sua formação</p>
                <div className="mt-auto pt-8 mb-8 text-center text-white">
                  <span className="text-5xl font-black italic">R$ {precos.anual}</span>
                  <span className="text-zinc-500 text-[10px] ml-2 font-bold uppercase">/ano</span>
                </div>
                <Link href="/checkout?plan=anual" className="text-center w-full py-6 bg-red-600 hover:bg-white hover:text-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl shadow-red-600/20">ASSINAR ANUAL</Link>
              </div>

              {/* 4. VITALÍCIO */}
              <div className="bg-zinc-900/40 border border-[#D4AF37]/30 p-8 rounded-[32px] flex flex-col h-full transition-all hover:border-[#D4AF37]">
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-4 flex items-center justify-center gap-2"><Infinity size={14} /> Legado Permanente</p>
                <h4 className="text-xl font-black text-white italic mb-2 uppercase tracking-tighter text-center">Infinito</h4>
                <p className="text-zinc-500 text-[10px] font-bold uppercase mb-8 text-center italic">Pagamento único. Acesso para sempre.</p>
                <div className="mt-auto pt-8 mb-8 text-center text-[#D4AF37]"><span className="text-4xl font-black italic">R$ {precos.vitalicio}</span></div>
                <Link href="/checkout?plan=vitalicio" className="text-center w-full py-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Acesso Vitalício</Link>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO FAQ */}
        <section className="py-32 px-6 border-t border-zinc-900 bg-zinc-950/20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Dúvidas <span className="text-red-600">Frequentes</span></h2>
              <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[9px]">Tudo o que você precisa saber para começar</p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <details key={idx} className="group bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-zinc-700">
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-200">{faq.q}</span>
                    <Plus size={16} className="text-red-600 transition-transform group-open:rotate-45" />
                  </summary>
                  <div className="px-6 pb-6 text-zinc-400 text-sm font-medium leading-relaxed border-t border-zinc-800/50 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-zinc-900 text-center">
        <div className="flex items-center justify-center gap-2 text-zinc-800 mb-4">
          <ShieldCheck size={14} />
          <p className="text-[8px] font-black uppercase tracking-widest">Plataforma Segura • ProfepMax © 2026</p>
        </div>
      </footer>
    </div>
  );
}