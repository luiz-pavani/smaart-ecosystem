"use client";

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Calculator, Save, Trophy, BookOpen, UserCheck, 
  AlertCircle, Loader2, CheckCircle, Medal, Scale,
  Book, GraduationCap, Gavel, Award
} from 'lucide-react';

// --- 1. REGRAS DE NEGÓCIO COMPLETAS (5 NÍVEIS) ---

const SCORING_RULES: any = {
  exam: {
    shodan: { min: 25, red: 15, std: 10, maj: 8, max: 5 },
    nidan: { min: 40, red: 30, std: 20, maj: 15, max: 10 },
    sandan: { min: 55, red: 40, std: 30, maj: 20, max: 15 },
    yondan: { min: 70, red: 50, std: 40, maj: 30, max: 20 },
    godan: { min: 80, red: 60, std: 50, maj: 40, max: 30 },
    rokudan: { min: 100, red: 80, std: 70, maj: 60, max: 50 }
  },
  merit: {
    shodan: { min: 50, red: 30, std: 20, maj: 16, max: 10 },
    nidan: { min: 80, red: 60, std: 40, maj: 30, max: 20 },
    sandan: { min: 110, red: 80, std: 60, maj: 40, max: 30 },
    yondan: { min: 140, red: 100, std: 80, maj: 60, max: 40 },
    godan: { min: 160, red: 120, std: 100, maj: 80, max: 60 },
    rokudan: { min: 200, red: 160, std: 140, maj: 120, max: 100 }
  }
};

const TIME_RULES: any = {
  exam: {
    shodan: { min: 1, red: 1.5, std: 2, maj: 4, max: 6 },
    nidan: { min: 1, red: 2, std: 3, maj: 5, max: 7 },
    sandan: { min: 2, red: 3, std: 4, maj: 6, max: 8 },
    yondan: { min: 3, red: 4, std: 5, maj: 7, max: 9 },
    godan: { min: 4, red: 5, std: 6, maj: 8, max: 10 },
    rokudan: { min: 5, red: 6, std: 7, maj: 10, max: 12 }
  },
  merit: {
    shodan: { min: 1, red: 1.5, std: 2, maj: 4, max: 6 },
    nidan: { min: 1, red: 2, std: 3, maj: 5, max: 7 },
    sandan: { min: 2, red: 3, std: 4, maj: 6, max: 8 },
    yondan: { min: 3, red: 4, std: 5, maj: 7, max: 9 },
    godan: { min: 4, red: 5, std: 6, maj: 8, max: 10 },
    rokudan: { min: 5, red: 6, std: 7, maj: 10, max: 12 }
  }
};

// --- 2. CONFIGURAÇÃO DE CAMPOS E PESOS ---

const FIELD_CONFIG = {
  // Seção 3: Contribuição (Valor x Peso) - Unidade: Anos
  contrib_pres: { label: "Presidente ou Diretor", weight: 4.0, sub: "LRSJ/LNJ/CSJ/UPJ/WJF" },
  contrib_arb_nac: { label: "Árbitro Nacional/Int.", weight: 3.0, sub: "Atuação ativa" },
  contrib_arb_est: { label: "Árbitro Estadual / Coord.", weight: 2.0, sub: "Atuação ativa" },
  contrib_oficial: { label: "Oficial Técnico / Colab.", weight: 2.0, sub: "Mesário, Súmula, Staff" },
  contrib_prof45: { label: "Professor (45+ alunos)", weight: 4.0, sub: "Registrados na LRSJ" },
  contrib_prof30: { label: "Professor (30+ alunos)", weight: 3.0, sub: "Registrados na LRSJ" },
  contrib_prof20: { label: "Professor (20+ alunos)", weight: 2.0, sub: "Registrados na LRSJ" },
  contrib_prof10: { label: "Professor (10+ alunos)", weight: 1.0, sub: "Registrados na LRSJ" },

  // Seção 4: Atividades em Prol (Valor x Peso) - Unidade: Qtd
  prol_livro: { label: "Livro Publicado", weight: 5.0, sub: "Autor/Co-autor/Org." },
  prol_capitulo: { label: "Capítulo em Livro", weight: 2.0, sub: "Publicado" },
  prol_artigo_princ: { label: "Artigo Científico (Principal)", weight: 4.0, sub: "Revista indexada" },
  prol_artigo_sec: { label: "Artigo Científico (Secundário)", weight: 2.0, sub: "Revista indexada" },
  prol_curso: { label: "Ministrante de Curso", weight: 0.5, sub: "Curso LRSJ - WJF" },
  prol_avaliador: { label: "Avaliador de Banca", weight: 0.5, sub: "Exames de Faixa" },
  prol_social: { label: "Atividade Social", weight: 2.0, sub: "Projetos/Eventos" },
  prol_colab: { label: "Colaborador Eventual", weight: 1.0, sub: "Apoio em eventos" },
};

const KATA_OPTIONS = [
  { id: 'itsutsu', label: 'Itsutsu no Kata', val: 3 },
  { id: 'koshiki', label: 'Koshiki no Kata', val: 3 },
  { id: 'goshin', label: 'Kodokan Goshin Jutsu', val: 3 },
  { id: 'kime', label: 'Kime no Kata', val: 3 },
  { id: 'ju', label: 'Ju no Kata', val: 3 },
  { id: 'katame', label: 'Katame no Kata', val: 2 },
  { id: 'nage', label: 'Nage no Kata', val: 2 },
  { id: 'seiryoku', label: "Seiryoku-Zen'yo", val: 1 },
  { id: 'kodomo', label: 'Kodomo-no-Kata', val: 1 },
  { id: 'gokyo', label: 'Go-kyō-no-waza', val: 2 },
  { id: 'katamewaza', label: 'Katame-waza', val: 2 },
  { id: 'shinmeisho', label: 'Shinmeisho-no-waza', val: 1 },
  { id: 'habukareta', label: 'Habukareta-waza', val: 1 }
];

const SELECT_OPTIONS = {
  personal: [
    { label: "Campeão Olímpico", val: 10 }, { label: "Atleta Olímpico", val: 9 },
    { label: "Campeão Mundial", val: 8 }, { label: "Medalhista Mundial", val: 7 },
    { label: "Campeão Continental", val: 6 }, { label: "Campeão Nacional", val: 5 },
    { label: "Medalhista Continental", val: 4 }, { label: "Medal. Nac. / Camp. Reg.", val: 3 },
    { label: "Camp. Est. / Medal. Reg.", val: 2 }, { label: "Medalhista Estadual", val: 1 }
  ],
  student: [
    { label: "Camp. Olímpico", val: 10 }, { label: "Atleta Olímpico", val: 9 },
    { label: "Camp. Mundial", val: 8 }, { label: "Medal. Mundial", val: 7 },
    { label: "Camp. Continental", val: 6 }, { label: "Camp. Nacional", val: 5 },
    { label: "Medal. Continental", val: 4 }, { label: "Medal. Nac. / Camp. Reg.", val: 3 },
    { label: "Camp. Est. / Medal. Reg.", val: 2 }, { label: "Medal. Estadual", val: 1 }
  ],
  referee: [
    { label: "Internacional A", val: 10 }, { label: "Internacional B", val: 8 },
    { label: "Internacional C", val: 6 }, { label: "Nacional A", val: 4 },
    { label: "Nacional B", val: 2 }, { label: "Nacional C", val: 1 }
  ],
  academic: [
    { label: "Doutorado", val: 10 }, { label: "Mestrado", val: 8 },
    { label: "Pós-Graduação > 1", val: 6 }, { label: "Pós-Graduação", val: 4 },
    { label: "Graduação Sup.", val: 2 }, { label: "Técnico", val: 1 }
  ],
  admin: [
    { label: "Federação Mundial", val: 10 }, { label: "União Pan-americana", val: 8 },
    { label: "Conf. Sul-americana", val: 6 }, { label: "Liga Nacional", val: 4 },
    { label: "Liga Riograndense", val: 2 }, { label: "Resp. Técnico Filiada", val: 1 }
  ]
};

export default function CalculadoraPontos({ 
  userId, 
  entityId, 
  currentTarget 
}: { 
  userId: string; 
  entityId: string; 
  currentTarget: string; 
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [track, setTrack] = useState<'exam' | 'merit'>('exam');
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [entityName, setEntityName] = useState<string>('');
  
  const [values, setValues] = useState<any>({
    calc_personal: 0,
    calc_student: 0,
    calc_vitorias: 0,
    calc_referee: 0,
    calc_academic: 0,
    calc_admin: 0,
    katas: [] 
  });

  useEffect(() => {
    async function loadSavedData() {
      try {
        setLoading(true);
        const [membershipRes, profileRes, entityRes] = await Promise.all([
          supabase
            .from('entity_memberships')
            .select('progresso')
            .eq('profile_id', userId)
            .eq('entity_id', entityId)
            .single(),
          supabase
            .from('profiles')
            .select('full_name, cpf, graduacao, ultima_promocao, nascimento')
            .eq('id', userId)
            .single(),
          supabase
            .from('entities')
            .select('name')
            .eq('id', entityId)
            .single()
        ]);

        if (membershipRes.data?.progresso?.calculator_inputs) {
          setValues(membershipRes.data.progresso.calculator_inputs);
          if (membershipRes.data.progresso.track) setTrack(membershipRes.data.progresso.track);
        }

        if (profileRes.data) setCandidateProfile(profileRes.data);
        if (entityRes.data?.name) setEntityName(entityRes.data.name);
      } finally {
        setLoading(false);
      }
    }
    loadSavedData();
  }, [userId, entityId]);

  // Função de Cálculo
  const calculateTotal = () => {
    let total = 0;
    total += Number(values.calc_personal) || 0;
    total += Number(values.calc_student) || 0;
    total += Number(values.calc_referee) || 0;
    total += Number(values.calc_academic) || 0;
    total += Number(values.calc_admin) || 0;
    total += (Number(values.calc_vitorias) || 0) * 0.2;

    Object.keys(FIELD_CONFIG).forEach(key => {
      const val = Number(values[key]) || 0;
      // @ts-ignore
      const weight = FIELD_CONFIG[key].weight;
      total += val * weight;
    });

    const checkedKatas = values.katas || [];
    checkedKatas.forEach((kataId: string) => {
      const kata = KATA_OPTIONS.find(k => k.id === kataId);
      if (kata) total += kata.val;
    });

    return parseFloat(total.toFixed(1));
  };

  const totalPoints = calculateTotal();
  const targetKey = currentTarget?.toLowerCase().split(' ')[0] || 'shodan';
  const rules = SCORING_RULES[track][targetKey] || SCORING_RULES[track]['shodan'];
  const times = TIME_RULES[track][targetKey] || TIME_RULES[track]['shodan'];

  // Helper para determinar o status atual com base na pontuação
  const getCarenciaStatus = () => {
    if (totalPoints >= rules.min) return { label: "CARÊNCIA MÍNIMA", time: `${times.min} ano(s)`, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (totalPoints >= rules.red) return { label: "CARÊNCIA REDUZIDA", time: `${times.red} anos`, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" };
    if (totalPoints >= rules.std) return { label: "CARÊNCIA PADRÃO", time: `${times.std} anos`, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" };
    if (totalPoints >= rules.maj) return { label: "CARÊNCIA MAJORADA", time: `${times.maj} anos`, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" };
    if (totalPoints >= rules.max) return { label: "CARÊNCIA MÁXIMA", time: `${times.max} anos`, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" };
    return { label: "INSUFICIENTE", time: "--", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" };
  };

  const status = getCarenciaStatus();

  const handleChange = (e: any) => {
    const { id, value } = e.target;
    setValues((prev: any) => ({ ...prev, [id]: value }));
  };

  const handleKataToggle = (id: string) => {
    setValues((prev: any) => {
      const current = prev.katas || [];
      if (current.includes(id)) {
        return { ...prev, katas: current.filter((k: string) => k !== id) };
      } else {
        return { ...prev, katas: [...current, id] };
      }
    });
  };

  const handleSave = async () => {
    if (!userId || !entityId) {
      alert("Não foi possível salvar. Faça login novamente e tente de novo.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('entity_memberships')
        .update({
          progresso: {
            total: totalPoints,
            calculator_inputs: values,
            track: track,
            updated_at: new Date().toISOString()
          }
        })
        .eq('profile_id', userId)
        .eq('entity_id', entityId);

      if (!error) {
        alert("Simulação salva com sucesso!");
        generatePdf();
      } else {
        alert(`Erro ao salvar: ${error.message || 'tente novamente.'}`);
      }
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || 'tente novamente.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePdf = () => {
    const doc = new jsPDF();
    const now = new Date();
    const title = 'Simulação de Pontos';
    const subtitle = `Gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

    const safeName = (candidateProfile?.full_name || 'candidato').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    doc.setFillColor(10, 18, 30);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(entityName || 'LRSJ', 150, 18, { align: 'right' });

    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, 34);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Dados do Candidato', 14, 44);

    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(14, 48, 182, 28, 3, 3, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nome: ${candidateProfile?.full_name || '--'}`, 18, 58);
    doc.text(`CPF: ${candidateProfile?.cpf || '--'}`, 18, 64);
    doc.text(`Nascimento: ${candidateProfile?.nascimento ? new Date(candidateProfile.nascimento).toLocaleDateString('pt-BR') : '--'}`, 18, 70);
    doc.text(`Graduação atual: ${candidateProfile?.graduacao || '--'}`, 110, 58);
    doc.text(`Última promoção: ${candidateProfile?.ultima_promocao ? new Date(candidateProfile.ultima_promocao).toLocaleDateString('pt-BR') : '--'}`, 110, 64);
    doc.text(`Graduação pretendida: ${currentTarget}`, 110, 70);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumo da Simulação', 14, 86);

    doc.setFillColor(240, 245, 255);
    doc.roundedRect(14, 90, 182, 30, 3, 3, 'F');
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(24);
    doc.text(String(totalPoints), 20, 110);
    doc.setFontSize(10);
    doc.text('Pontuação total', 20, 96);

    doc.setFontSize(10);
    doc.text(`Trilha: ${track === 'exam' ? 'Com Exame' : 'Por Mérito'}`, 110, 98);
    doc.text(`Status: ${status.label} (${status.time})`, 110, 105);

    doc.setFontSize(9);
    const thresholds = [
      { label: `Mínima (${times.min} anos)`, value: rules.min, color: [16, 185, 129] },
      { label: `Reduzida (${times.red} anos)`, value: rules.red, color: [34, 197, 94] },
      { label: `Padrão (${times.std} anos)`, value: rules.std, color: [59, 130, 246] },
      { label: `Majorada (${times.maj} anos)`, value: rules.maj, color: [234, 179, 8] },
      { label: `Máxima (${times.max} anos)`, value: rules.max, color: [249, 115, 22] }
    ];
    let ty = 124;
    thresholds.forEach((t) => {
      doc.setFillColor(t.color[0], t.color[1], t.color[2]);
      doc.rect(14, ty - 3, 3, 3, 'F');
      doc.setTextColor(70, 70, 70);
      doc.text(`${t.label}: ${t.value} pts`, 20, ty);
      ty += 6;
    });

    let y = ty + 6;
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Detalhamento dos Critérios', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const addLine = (text: string) => {
      if (y > 280) {
        doc.addPage();
        y = 14;
      }
      doc.text(text, 14, y);
      y += 6;
    };

    const resolveSelectLabel = (group: keyof typeof SELECT_OPTIONS, value: number) => {
      const opt = SELECT_OPTIONS[group]?.find(o => o.val === value);
      return opt ? `${opt.label} (${opt.val})` : 'Nenhum';
    };

    addLine(`Resultados - Melhor Título Pessoal: ${resolveSelectLabel('personal', Number(values.calc_personal) || 0)}`);
    addLine(`Resultados - Melhor Título de Aluno: ${resolveSelectLabel('student', Number(values.calc_student) || 0)}`);
    addLine(`Ranking (Vitórias): ${Number(values.calc_vitorias) || 0} (0,2 pts cada)`);
    addLine(`Qualificações - Árbitro: ${resolveSelectLabel('referee', Number(values.calc_referee) || 0)}`);
    addLine(`Qualificações - Acadêmico: ${resolveSelectLabel('academic', Number(values.calc_academic) || 0)}`);
    addLine(`Qualificações - Administração: ${resolveSelectLabel('admin', Number(values.calc_admin) || 0)}`);

    addLine('Contribuição ao Judô:');
    Object.keys(FIELD_CONFIG).filter(k => k.startsWith('contrib_')).forEach(key => {
      // @ts-ignore
      const label = FIELD_CONFIG[key].label;
      const val = Number(values[key]) || 0;
      if (val > 0) addLine(`- ${label}: ${val}`);
    });

    addLine('Atividades em Prol do Judô:');
    Object.keys(FIELD_CONFIG).filter(k => k.startsWith('prol_')).forEach(key => {
      // @ts-ignore
      const label = FIELD_CONFIG[key].label;
      const val = Number(values[key]) || 0;
      if (val > 0) addLine(`- ${label}: ${val}`);
    });

    const katas = values.katas || [];
    if (katas.length > 0) {
      addLine('Conhecimento Prático (Katas):');
      katas.forEach((kataId: string) => {
        const kata = KATA_OPTIONS.find(k => k.id === kataId);
        if (kata) addLine(`- ${kata.label}: ${kata.val} pts`);
      });
    }

    doc.save(`simulacao-pontos-${safeName}-${now.toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto"/> Carregando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 1. SELETOR DE TRILHA E PLACAR */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6">
        <div className="space-y-6">
           <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button onClick={() => setTrack('exam')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${track === 'exam' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Com Exame</button>
              <button onClick={() => setTrack('merit')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${track === 'merit' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Por Mérito</button>
           </div>

           {/* Seção 1: Resultados */}
           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-red-500 font-black uppercase text-xs mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Trophy size={14}/> 1. Resultados Esportivos</h4>
              <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Melhor Título Pessoal</label>
                       <select id="calc_personal" value={values.calc_personal} onChange={handleChange} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-xs text-white">
                          <option value="0">Selecione...</option>
                          {SELECT_OPTIONS.personal.map((opt, i) => <option key={i} value={opt.val}>{opt.label} ({opt.val})</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Melhor Título de Aluno</label>
                       <select id="calc_student" value={values.calc_student} onChange={handleChange} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-xs text-white">
                          <option value="0">Selecione...</option>
                          {SELECT_OPTIONS.student.map((opt, i) => <option key={i} value={opt.val}>{opt.label} ({opt.val})</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30">
                    <label className="text-[10px] font-bold text-red-400 uppercase">Pontuação no Ranking (Vitórias)</label>
                    <span className="text-[9px] text-red-300/70 block mb-1 uppercase font-bold">-- Nº de Vitórias (últimos 3 anos) --</span>
                    <input type="number" id="calc_vitorias" value={values.calc_vitorias} onChange={handleChange} className="w-full bg-black border border-red-900/50 rounded-lg p-2 text-white font-mono mt-1" placeholder="0"/>
                    <p className="text-[9px] text-red-300 mt-1">Critério: Cada vitória vale <strong>0,2 pontos</strong>.</p>
                 </div>
              </div>
           </div>

           {/* Seção 2: Qualificações */}
           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-red-500 font-black uppercase text-xs mb-4 border-b border-slate-800 pb-2 flex items-center gap-2"><Medal size={14}/> 2. Qualificações</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Árbitro</label>
                    <select id="calc_referee" value={values.calc_referee} onChange={handleChange} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-xs text-white">
                       <option value="0">Nenhum</option>
                       {SELECT_OPTIONS.referee.map((opt, i) => <option key={i} value={opt.val}>{opt.label} ({opt.val})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Acadêmico</label>
                    <select id="calc_academic" value={values.calc_academic} onChange={handleChange} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-xs text-white">
                       <option value="0">Nenhum</option>
                       {SELECT_OPTIONS.academic.map((opt, i) => <option key={i} value={opt.val}>{opt.label} ({opt.val})</option>)}
                    </select>
                 </div>
                 <div className="md:col-span-2 lg:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Administração</label>
                    <select id="calc_admin" value={values.calc_admin} onChange={handleChange} className="w-full bg-black border border-slate-700 rounded-lg p-2 text-xs text-white">
                       <option value="0">Nenhum</option>
                       {SELECT_OPTIONS.admin.map((opt, i) => <option key={i} value={opt.val}>{opt.label} ({opt.val})</option>)}
                    </select>
                 </div>
              </div>
           </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seção 3: Contribuição */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col border-b border-slate-800 pb-4 mb-4">
                  <h4 className="text-green-500 font-black uppercase text-xs flex items-center gap-2"><Gavel size={14}/> 3. Contribuição ao Judô</h4>
                  <span className="text-[9px] bg-green-900/50 text-green-300 px-2 py-1 rounded mt-2 w-fit">-- Nº de anos nessas funções na graduação atual --</span>
                </div>
                <div className="space-y-4">
                  {Object.keys(FIELD_CONFIG).filter(k => k.startsWith('contrib_')).map(key => (
                    // @ts-ignore
                    <div key={key} className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0"><div className="pr-4"><div className="text-xs font-bold text-slate-300">{FIELD_CONFIG[key].label}</div><div className="text-[9px] text-slate-500">{FIELD_CONFIG[key].sub} (x{FIELD_CONFIG[key].weight})</div></div><div className="flex items-center gap-2"><input type="number" id={key} value={values[key] || ''} onChange={handleChange} className="w-16 bg-black border border-slate-700 rounded-lg p-2 text-center text-white text-xs font-bold focus:border-green-500" placeholder="0"/><span className="text-[9px] font-bold text-slate-600 uppercase">Anos</span></div></div>
                  ))}
                </div>
              </div>

              {/* Seção 4: Atividades em Prol */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col border-b border-slate-800 pb-4 mb-4">
                  <h4 className="text-green-500 font-black uppercase text-xs flex items-center gap-2"><BookOpen size={14}/> 4. Atividades em Prol do Judô</h4>
                  <span className="text-[9px] bg-green-900/50 text-green-300 px-2 py-1 rounded mt-2 w-fit">-- Nº de produções na graduação atual --</span>
                </div>
                <div className="space-y-4">
                  {Object.keys(FIELD_CONFIG).filter(k => k.startsWith('prol_')).map(key => (
                    // @ts-ignore
                    <div key={key} className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0"><div className="pr-4"><div className="text-xs font-bold text-slate-300">{FIELD_CONFIG[key].label}</div><div className="text-[9px] text-slate-500">{FIELD_CONFIG[key].sub} (x{FIELD_CONFIG[key].weight})</div></div><div className="flex items-center gap-2"><input type="number" id={key} value={values[key] || ''} onChange={handleChange} className="w-16 bg-black border border-slate-700 rounded-lg p-2 text-center text-white text-xs font-bold focus:border-green-500" placeholder="0"/><span className="text-[9px] font-bold text-slate-600 uppercase">Qtd</span></div></div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. SEÇÃO 5: CONHECIMENTO PRÁTICO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-2 mb-6">
                <h4 className="text-slate-300 font-black uppercase text-xs flex items-center gap-2"><GraduationCap size={14}/> 5. Conhecimento Prático</h4>
                  <span className="text-[9px] bg-green-900/50 text-green-300 px-2 py-1 rounded mt-2 w-fit">-- com exame aprovado até o final do processo --</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {KATA_OPTIONS.map(kata => (
                  <label key={kata.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${values.katas?.includes(kata.id) ? 'bg-red-900/20 border-red-500/50' : 'bg-black border-slate-800 hover:border-slate-600'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${values.katas?.includes(kata.id) ? 'bg-red-600 border-red-600' : 'border-slate-600'}`}>
                      {values.katas?.includes(kata.id) && <CheckCircle size={14} className="text-white"/>}
                    </div>
                    <input type="checkbox" className="hidden" checked={values.katas?.includes(kata.id) || false} onChange={() => handleKataToggle(kata.id)} />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{kata.label}</div>
                      <div className="text-[9px] text-slate-500">{kata.val} pontos</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* PLACAR FLUTUANTE ATUALIZADO (5 NÍVEIS) */}
          <div className="lg:w-80 space-y-6 lg:sticky lg:top-6 h-fit">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pontuação Total</div>
              <div className="text-6xl font-black text-white tracking-tighter mb-4">{totalPoints}</div>
              
              <div className="space-y-2 pt-4 border-t border-slate-600 text-[10px]">
                 <div className={`flex justify-between items-center ${totalPoints >= rules.min ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    <span>Mínima ({times.min} anos):</span><span>{rules.min} pts</span>
                 </div>
                 <div className={`flex justify-between items-center ${totalPoints >= rules.red && totalPoints < rules.min ? 'text-green-400 font-bold' : 'text-slate-500'}`}>
                    <span>Reduzida ({times.red} anos):</span><span>{rules.red} pts</span>
                 </div>
                 <div className={`flex justify-between items-center ${totalPoints >= rules.std && totalPoints < rules.red ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                    <span>Padrão ({times.std} anos):</span><span>{rules.std} pts</span>
                 </div>
                 <div className={`flex justify-between items-center ${totalPoints >= rules.maj && totalPoints < rules.std ? 'text-yellow-400 font-bold' : 'text-slate-500'}`}>
                    <span>Majorada ({times.maj} anos):</span><span>{rules.maj} pts</span>
                 </div>
                 <div className={`flex justify-between items-center ${totalPoints >= rules.max && totalPoints < rules.maj ? 'text-orange-400 font-bold' : 'text-slate-500'}`}>
                    <span>Máxima ({times.max} anos):</span><span>{rules.max} pts</span>
                 </div>
              </div>

              <div className={`mt-6 text-center p-3 rounded-lg border ${status.bg} ${status.color}`}>
                 <div className="text-[10px] font-black uppercase">Status Atual</div>
                 <div className="font-bold text-sm">{status.label} ({status.time})</div>
              </div>

              <button onClick={handleSave} disabled={isSaving} className="mt-4 w-full py-3 bg-white hover:bg-slate-200 text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition">
                 {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Simulação
              </button>
            </div>
          </div>
        </div>

    </div>
  );
}