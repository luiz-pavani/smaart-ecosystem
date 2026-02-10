"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { ShieldCheck, Download, ArrowLeft, Loader2, Award, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CertificadoPage() {
  const { id } = useParams();
  const router = useRouter();
  const certificadoRef = useRef<HTMLDivElement>(null);
  
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const LINK_ASSINATURA = "https://sxmrqiohfrktwlkwmfyr.supabase.co/storage/v1/object/public/imagens/HANKO%20LUIZ%20PAVANI%205%20SIGN%20copy.png";

  useEffect(() => {
    async function loadCertificado() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push("/login");

        // 1. Buscamos o resultado básico primeiro para evitar erro de Join
        const { data: resultado, error: resError } = await supabase
          .from("resultados_exames")
          .select("*")
          .eq("id", id)
          .single();

        if (resError || !resultado || !resultado.aprovado) {
          console.error("Resultado não encontrado ou não aprovado");
          // Fallback para o dashboard caso não encontre o resultado
          return router.push('/dashboard');
        }

        // 2. Buscamos Curso e Perfil em paralelo (Mais rápido e seguro)
        const [cursoRes, perfilRes] = await Promise.all([
          supabase.from("cursos").select("*").eq("id", resultado.curso_id).single(),
          supabase.from("profiles").select("*").eq("id", resultado.user_id).single()
        ]);

        if (cursoRes.error || perfilRes.error) {
          throw new Error("Erro ao carregar detalhes do certificado");
        }

        const urlValidacao = `${window.location.origin}/validar/${resultado.id}`;
        
        setDados({ 
          curso: cursoRes.data, 
          perfil: perfilRes.data, 
          nota: resultado.nota,
          dataEmissao: new Date(resultado.created_at).toLocaleDateString('pt-BR'),
          codigoVerificacao: `CERT-${resultado.id.substring(0, 8)}`.toUpperCase(),
          urlValidacao
        });
      } catch (err) {
        console.error("Erro sistêmico:", err);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadCertificado();
  }, [id, router]);

  const baixarPDF = async () => {
    if (!certificadoRef.current || !dados) return;
    setGerandoPdf(true);

    try {
      const element = certificadoRef.current;
      const canvas = await html2canvas(element, {
        scale: 3, 
        useCORS: true, 
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificado-ProfepMax-${dados.perfil?.full_name || 'Graduado'}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setGerandoPdf(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-black uppercase italic tracking-widest text-red-600">
      <Loader2 className="animate-spin mb-4" size={48} /> Autenticando Graduação...
    </div>
  );

  if (!dados) return null;

  return (
    <div className="min-h-screen bg-zinc-200 flex flex-col items-center py-12 px-4 selection:bg-red-600 print:p-0 print:bg-white">
      
      {/* FERRAMENTAS */}
      <div className="w-full max-w-[1120px] flex justify-between items-center mb-8 print:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-zinc-600 hover:text-black transition-colors font-black uppercase text-[10px] tracking-widest">
          <ArrowLeft size={16} /> Voltar ao Painel
        </Link>
        <div className="flex gap-4">
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-3 bg-zinc-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl"
            >
                <Printer size={18} /> Imprimir
            </button>
            <button 
                onClick={baixarPDF}
                disabled={gerandoPdf}
                className="flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50"
            >
                {gerandoPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {gerandoPdf ? "Gerando PDF..." : "Baixar PDF"}
            </button>
        </div>
      </div>

      {/* ÁREA DO CERTIFICADO */}
      <div 
        ref={certificadoRef}
        className="bg-white w-[1120px] aspect-[1.414] relative border-[30px] border-black p-16 flex flex-col items-center justify-between text-black overflow-hidden shadow-2xl print:shadow-none print:border-[20px]"
      >
        <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
            <Award size={800} />
        </div>

        <div className="w-full flex justify-between items-start relative z-10">
          <div className="flex flex-col items-start text-left">
             <h4 className="text-red-600 font-black italic uppercase tracking-tighter text-4xl leading-none">PROFEP<span className="text-black">MAX</span></h4>
             <p className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-400 mt-1 max-w-xs">
               PROGRAMA DE FORMAÇÃO E ESPECIALIZAÇÃO DE PROFESSORES DE JUDÔ
             </p>
          </div>
          <div className="bg-black text-white px-4 py-1.5 flex flex-col items-end">
             <span className="text-[9px] font-black uppercase tracking-widest italic">Graduação Digital</span>
             <span className="text-[7px] font-bold text-zinc-500">{dados.codigoVerificacao}</span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center relative z-10 w-full mt-4">
          <p className="text-zinc-400 font-serif italic text-2xl mb-4">Certificamos para os devidos fins que</p>
          <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-6 px-10 leading-tight inline-block border-b-4 border-black pb-2">
            {dados.perfil?.full_name}
          </h2>

          <div className="max-w-4xl px-10 mt-4">
            <p className="text-xl leading-relaxed text-zinc-800">
              Concluiu com excelência técnica o curso de formação técnica de elite <br />
              <strong className="text-5xl uppercase font-black italic block my-6 text-black tracking-tighter bg-zinc-50 py-2">
                {dados.curso?.titulo}
              </strong>
              com carga horária de <strong className="text-red-600">{dados.curso?.duracao || "10"} horas</strong>, 
              sob coordenação técnica de <strong className="uppercase">{dados.curso?.instrutor || "Luiz Pavani"}</strong>, <br />
              obtendo nota final de <strong>{dados.nota}%</strong>, validada pela metodologia <strong className="text-red-600 italic">PROFEP MAX 2026</strong>.
            </p>
          </div>
        </div>

        <div className="w-full flex justify-between items-end relative z-10 px-6">
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 border border-zinc-100 rounded-lg bg-white shadow-sm">
              <QRCodeSVG value={dados.urlValidacao} size={90} />
            </div>
            <p className="text-[6px] font-black uppercase tracking-[0.2em] text-zinc-400">Verificar Autenticidade</p>
          </div>

          <div className="text-center relative min-w-[320px]">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-32 flex items-end justify-center pointer-events-none">
              <img 
                src={LINK_ASSINATURA} 
                alt="Assinatura Luiz Pavani" 
                crossOrigin="anonymous" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="w-full border-b-2 border-black mb-2 mx-auto"></div>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] leading-none">Luiz Pavani</p>
            <p className="text-[7px] text-zinc-400 uppercase font-black mt-2 tracking-[0.3em]">Diretor Técnico • Sensei 5º Dan</p>
          </div>

          <div className="text-right">
             <div className="w-24 h-24 border-4 border-red-600 rounded-full flex items-center justify-center mb-4 ml-auto bg-white shadow-xl relative">
                <ShieldCheck size={48} className="text-red-600" />
                <Award size={20} className="absolute -top-2 -right-2 text-black fill-black" />
             </div>
             <p className="text-3xl font-black italic leading-none tracking-tighter">{dados.dataEmissao}</p>
             <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest mt-1 italic">Data de Outorga</p>
          </div>
        </div>

        <div className="absolute bottom-6 flex justify-between w-full px-16 text-[7px] font-mono text-zinc-300 uppercase tracking-[0.3em]">
          <span>PROGRAMA DE ESPECIALIZAÇÃO PARA PROFESSORES DE JUDÔ</span>
          <span>SESSÃO: {id?.toString().toUpperCase()}</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; padding: 0 !important; }
          .min-h-screen { min-height: auto !important; padding: 0 !important; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>
    </div>
  );
}