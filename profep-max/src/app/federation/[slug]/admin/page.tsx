"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Users, Search, CheckCircle, XCircle, Clock, Menu, ChevronLeft, ChevronRight,
  LayoutDashboard, Receipt, Settings, X, Save, FileText, ExternalLink, 
  Loader2, DollarSign, BarChart3, TrendingUp, Upload, Printer,
  Filter, AlertTriangle, Zap, ShieldCheck, LogOut, Mail, Activity,
  MessageSquare, Send, GraduationCap, Award, Ban, Archive, 
  ClipboardCheck, Trash2, Plus, Edit3, MapPin, Video, MonitorPlay, Briefcase,
  Shield, UserCheck, UserX, UserPlus, Calendar as CalendarIcon
} from 'lucide-react';

// Importação com caminho corrigido
import { sendDossierNotification } from '../../../actions/notifications';
import { sendCertificateAvailableEmail } from '../../../actions/email-templates';

// --- 1. BASE DE CONHECIMENTO ---
const REQUIREMENTS_DATA: any = {
    shodan: {
        presential: ["Nage-no-Kata", "Arbitragem", "Waza"],
        internships: ["Oficial de Competição", "Árbitro"],
        theory: ["Artigo ou Poster", "Exame Teórico Geral", "Exame Teórico de Arbitragem"],
        courses: {
            profep: [
                "Curso de Nage-no-Kata",
                "Curso Ensino do Judô Infantil",
                "Curso Seiryoku-Zen’yo-Kokumin-Taiiku-no-Kata",
                "Direto do Dojo com Douglas Vieira",
                "Curso de Oficiais de Competição",
                "Curso de Arbitragem",
                "Curso de Waza",
                "Curso de Kodomo-no-Kata",
                "Curso de Ensino do Judô com Segurança",
                "Curso de História do Judô",
                "Curso de Terminologia do Judô",
                "Curso de Atendimento Pré-hospitalar (1ºs socorros)"
            ],
            cob: [
                "Esporte Antirracista",
                "Prevenção do Assédio e Abuso",
                "Saúde Mental no Esporte",
                "Formando Campeões",
                "Combate à Manipulação de Resultados",
                "Igualdade de Gênero"
            ]
        },
        practical_exams: ["Kodomo-no-Kata", "Seiryoku-Zen’yo", "Arbitragem Prática", "Nage-no-Kata Prático", "Waza Prático"]
    },
    nidan: {
        presential: ["Katame-no-Kata", "Arbitragem", "Waza"],
        internships: ["Árbitro"],
        theory: ["Artigo ou Poster", "Exame Teórico Geral", "Exame Teórico de Arbitragem"],
        courses: {
            profep: [
                "Curso de Gestão de Academias",
                "Curso de Katame-no-Kata",
                "Direto do Dojo com Ma. Suelen Altheman",
                "Curso de Arbitragem",
                "Curso de Waza",
                "Curso de Kodomo-no-Kata",
                "Curso de Ensino do Judô com Segurança",
                "Curso de História do Judô",
                "Curso de História do Judô no Brasil",
                "Curso de Terminologia do Judô",
                "Curso de Atendimento Pré-hospitalar"
            ],
            cob: [
                "Combate à Manipulação de Resultados",
                "Igualdade de Gênero",
                "Comissão de Atletas",
                "Conduta Ética na Prática",
                "Ginecologia do Esporte"
            ]
        },
        practical_exams: ["Kodomo-no-Kata", "Seiryoku-Zen’yo", "Arbitragem Prática", "Katame-no-Kata Prático", "Waza Prático"]
    },
    sandan: {
        presential: ["Kōdōkan Goshin-jutsu", "Waza"],
        internships: [],
        theory: ["Artigo"],
        courses: { profep: ["Curso de Kōdōkan Goshin-jutsu"], cob: ["Fundamentos da Administração"] },
        practical_exams: ["Goshin-jutsu (Nota)"]
    },
    yondan: {
        presential: ["Kime-no-Kata", "Waza"],
        internships: [],
        theory: ["Artigo"],
        courses: { profep: ["Curso de Kime-no-Kata"], cob: ["Fundamentos do Treinamento"] },
        practical_exams: ["Kime-no-Kata (Nota)"]
    },
    godan: {
        presential: ["Ju-no-Kata", "Waza"],
        internships: [],
        theory: ["Artigo"],
        courses: { profep: ["Curso de Ju-no-Kata"], cob: ["Treinamento Avançado"] },
        practical_exams: ["Ju-no-Kata (Nota)"]
    },
    rokudan: {
        presential: ["Waza"],
        internships: [],
        theory: ["Artigo"],
        courses: { profep: ["Itsutsu-no-Kata", "Koshiki-no-Kata"], cob: [] },
        practical_exams: []
    }
};

const DOC_CATEGORIES = [
    { id: 'identidade', label: 'Documento de Identidade (RG/CNH)' },
    { id: 'diploma_anterior', label: 'Diploma da Graduação Anterior' },
    { id: 'historico_competitivo', label: 'Histórico Competitivo (Relatório do Smoothcomp)' },
    { id: 'curso_primeiros_socorros', label: 'Currículo (cursos, formações, títulos...)' }
];

const CALC_LABELS: Record<string, string> = {
    calc_personal: "Melhor Título Pessoal",
    calc_student: "Melhor Título de Aluno",
    calc_vitorias: "Vitórias (últ. 3 anos)",
    calc_referee: "Árbitro",
    calc_academic: "Acadêmico",
    calc_admin: "Administração"
};

const CALC_FIELD_META: Record<string, { label: string; unit: string }> = {
    contrib_pres: { label: "Presidente ou Diretor", unit: "anos" },
    contrib_arb_nac: { label: "Árbitro Nacional/Int.", unit: "anos" },
    contrib_arb_est: { label: "Árbitro Estadual / Coord.", unit: "anos" },
    contrib_oficial: { label: "Oficial Técnico / Colab.", unit: "anos" },
    contrib_prof45: { label: "Professor (45+ alunos)", unit: "anos" },
    contrib_prof30: { label: "Professor (30+ alunos)", unit: "anos" },
    contrib_prof20: { label: "Professor (20+ alunos)", unit: "anos" },
    contrib_prof10: { label: "Professor (10+ alunos)", unit: "anos" },
    prol_livro: { label: "Livro Publicado", unit: "qtd" },
    prol_capitulo: { label: "Capítulo em Livro", unit: "qtd" },
    prol_artigo_princ: { label: "Artigo Científico (Principal)", unit: "qtd" },
    prol_artigo_sec: { label: "Artigo Científico (Secundário)", unit: "qtd" },
    prol_curso: { label: "Ministrante de Curso", unit: "qtd" },
    prol_avaliador: { label: "Avaliador de Banca", unit: "qtd" },
    prol_social: { label: "Atividade Social", unit: "qtd" },
    prol_colab: { label: "Colaborador Eventual", unit: "qtd" }
};

const KATA_LABELS: Record<string, string> = {
    itsutsu: "Itsutsu no Kata",
    koshiki: "Koshiki no Kata",
    goshin: "Kodokan Goshin Jutsu",
    kime: "Kime no Kata",
    ju: "Ju no Kata",
    katame: "Katame no Kata",
    nage: "Nage no Kata",
    seiryoku: "Seiryoku-Zen'yo",
    kodomo: "Kodomo-no-Kata",
    gokyo: "Go-kyō-no-waza",
    katamewaza: "Katame-waza",
    shinmeisho: "Shinmeisho-no-waza",
    habukareta: "Habukareta-waza"
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('pt-BR') : '--';
const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '--';
const formatMoney = (value?: number | null) => typeof value === 'number' ? `R$ ${value.toFixed(2)}` : '--';
const formatPaymentMethod = (method?: string | number | null) => {
    const map: Record<string, string> = { '1': 'Boleto', '2': 'Cartão', '6': 'PIX', boleto: 'Boleto', cartao: 'Cartão', pix: 'PIX' };
    if (method === null || typeof method === 'undefined') return '--';
    return map[String(method).toLowerCase()] || String(method).toUpperCase();
};

const generateId = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');

const DUAL_KATA_IDS = new Set([
    "Nage-no-Kata",
    "Nage-no-Kata Prático",
    "Katame-no-Kata",
    "Katame-no-Kata Prático",
    "Kime-no-Kata",
    "Kime-no-Kata (Nota)",
    "Ju-no-Kata",
    "Ju-no-Kata (Nota)",
    "Kōdōkan Goshin-jutsu",
    "Kodokan Goshin-jutsu",
    "Goshin-jutsu (Nota)",
    "Goshin-jutsu"
].map(generateId));

// --- 2. COMPONENTE PRINCIPAL ---
export default function AdminFederacao() {
  const { slug } = useParams();
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidatos' | 'cronograma' | 'financeiro' | 'morto' | 'arquivo' | 'config' | 'acessos'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [federation, setFederation] = useState<any>(null);
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [gestores, setGestores] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");

  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAddManagerModalOpen, setIsAddManagerModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [bottleneckFilter, setBottleneckFilter] = useState<'todos' | 'auditoria_pendente' | 'pagamento_pendente' | 'finalizados'>('todos');

  const loadData = async (fedId: string) => {
    const [membersRes, schedRes] = await Promise.all([
      supabase.from('entity_memberships').select('*, profiles:profile_id (*)').eq('entity_id', fedId),
      supabase.from('federation_schedule').select('*').eq('entity_id', fedId).order('date', { ascending: true })
    ]);

    if (membersRes.data) {
      const allMembers = membersRes.data;
      // Mostrar TODOS os membros na lista de candidatos, independente do role
      // Isso inclui admins/gestores que também se inscreveram para exame
      setCandidatos(allMembers);
      setGestores(allMembers.filter(m => m.role === 'manager' || m.role === 'admin'));
    }
    if (schedRes.data) setSchedule(schedRes.data);
  };

  useEffect(() => {
    async function initAdmin() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.replace(`/federation/${slug}/admin/login`);
        setUserEmail(user.email || '');

        const { data: fedData } = await supabase.from('entities').select('*').eq('slug', slug).single();
        if (!fedData) return router.replace('/');
        
        const { data: membership } = await supabase.from('entity_memberships').select('role, status_inscricao').eq('profile_id', user.id).eq('entity_id', fedData.id).maybeSingle();
        
        const isSuperAdmin = user.email === 'luizpavani@gmail.com' || user.email === 'luizzpavani@gmail.com';
        const isAuthorized = isSuperAdmin || (membership && (membership.role === 'manager' || membership.role === 'admin') && membership.status_inscricao === 'GESTOR_ATIVO');

        if (!isAuthorized) {
          alert("Acesso restrito.");
          return router.replace(`/federation/${slug}/admin/login`);
        }

        setFederation(fedData);
        setUserRole(isSuperAdmin ? 'admin' : membership?.role || 'manager');
        setAuthorized(true);
        document.documentElement.style.setProperty('--fed-primary', fedData.settings.primary_color);

        await loadData(fedData.id);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    initAdmin();
  }, [slug, supabase, router]);

  const filteredList = useMemo(() => {
    return candidatos.filter(c => {
    // Não excluir ninguém: mostrar todos os inscritos
      
    const matchesSearch = c.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.profiles?.cpf?.includes(searchTerm);
      if (!matchesSearch) return false;
      if (activeTab === 'morto') return ['REPROVADO', 'CANCELADO'].includes(c.status_inscricao);
      if (activeTab === 'arquivo') return c.status_inscricao === 'APROVADO';
      if (['REPROVADO', 'CANCELADO'].includes(c.status_inscricao)) return false;
      if (activeTab === 'candidatos') {
        if (bottleneckFilter === 'auditoria_pendente') return c.status_pagamento === 'PAGO' && (c.status_inscricao === 'PENDENTE' || c.status_inscricao === 'EM ANÁLISE' || c.status_inscricao === 'INSCRITO');
        if (bottleneckFilter === 'pagamento_pendente') return ['PENDENTE', 'EM PAGAMENTO', 'EM ATRASO'].includes(c.status_pagamento);
        if (bottleneckFilter === 'finalizados') return c.status_inscricao === 'APROVADO';
      }
      return true;
    });
  }, [candidatos, searchTerm, activeTab, bottleneckFilter]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/federation/${slug}/admin/login`);
  };

  const handleManageManager = async (managerId: string, newStatus: string) => {
      const { error } = await supabase.from('entity_memberships').update({ status_inscricao: newStatus }).eq('id', managerId);
      if (!error) {
          alert("Acesso atualizado!");
          await loadData(federation.id);
      }
  };

  const handleAddManagerByEmail = async (email: string, role: string) => {
    try {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
        if (profileError) throw profileError;
        if (!profile) { alert("Usuário não encontrado. O gestor precisa criar uma conta primeiro."); return; }

        const { error: memberError } = await supabase.from('entity_memberships').upsert({
                profile_id: profile.id,
                entity_id: federation.id,
                role: role,
                status_inscricao: 'GESTOR_ATIVO',
                graduacao_pretendida: 'Gestão'
            }, { onConflict: 'profile_id, entity_id' });

        if (memberError) throw memberError;
        alert(`Sucesso! ${email} liberado.`);
        setIsAddManagerModalOpen(false);
        await loadData(federation.id);
    } catch (err: any) { alert("Erro: " + err.message); }
  };

  const handleSaveCandidate = async (updatedData: any, newProgress: any) => {
    try {
        const nowIso = new Date().toISOString();
        const prevLog = Array.isArray(newProgress?.audit_log) ? newProgress.audit_log : [];
        const auditEntry = {
            at: nowIso,
            by: userEmail || 'admin',
            action: 'update_candidate',
            status_inscricao: updatedData.status_inscricao,
            status_pagamento: updatedData.status_pagamento,
            valor_pago: typeof updatedData.valor_pago === 'number' ? updatedData.valor_pago : null
        };

        const payload: any = {
            status_inscricao: updatedData.status_inscricao,
            status_pagamento: updatedData.status_pagamento,
            graduacao_pretendida: updatedData.graduacao_pretendida,
            progresso: { ...newProgress, audit_log: [auditEntry, ...prevLog].slice(0, 50) },
            cond: updatedData.status_inscricao === 'APROVADO' ? 'ATIVO' : 'INATIVO'
        };

        if (typeof updatedData.valor_pago === 'number' && !Number.isNaN(updatedData.valor_pago)) {
            payload.valor_pago = updatedData.valor_pago;
        }

        const { error } = await supabase
            .from('entity_memberships')
            .update(payload)
            .eq('id', selectedCandidate.id);

        if (error) throw error;

        // Se aprovado, enviar notificação de dossiê E email de certificado disponível
        if (updatedData.status_inscricao === 'APROVADO') {
            // Notificação de aprovação
            await sendDossierNotification(
                selectedCandidate.profiles.email, 
                selectedCandidate.profiles.full_name, 
                'APROVADO', 
                federation.name
            );
            
            // Email com certificado disponível
            await sendCertificateAvailableEmail(
                selectedCandidate.profiles.email,
                selectedCandidate.profiles.full_name,
                federation.name,
                updatedData.graduacao_pretendida || selectedCandidate.graduacao_pretendida,
                selectedCandidate.id
            );
        }

        alert("✅ Dados sincronizados com sucesso!");
        await loadData(federation.id);
        setSelectedCandidate(null);
    } catch (err: any) {
        console.error("Erro ao salvar:", err);
        alert("❌ Erro ao salvar cadastro: " + err.message);
    }
  };

  const handleDeleteCandidate = async (candidate: any) => {
    const name = candidate?.profiles?.full_name || 'candidato';
    if (!confirm(`Excluir definitivamente ${name}? Essa ação limpa a inscrição e permite recomeçar do zero.`)) return;
    try {
        const { data: docs, error: docsFetchError } = await supabase
            .from('entity_documents')
            .select('file_url')
            .eq('profile_id', candidate.profile_id)
            .eq('entity_id', candidate.entity_id);
        if (docsFetchError) throw docsFetchError;

        const filePaths = (docs || [])
            .map((doc: any) => {
                const url = doc?.file_url || '';
                const marker = '/federation_docs/';
                const idx = url.indexOf(marker);
                return idx >= 0 ? url.substring(idx + marker.length) : '';
            })
            .filter((p: string) => p);

        if (filePaths.length) {
            const { error: storageError } = await supabase
                .storage
                .from('federation_docs')
                .remove(filePaths);
            if (storageError) throw storageError;
        }

        const { error: docsError } = await supabase
            .from('entity_documents')
            .delete()
            .eq('profile_id', candidate.profile_id)
            .eq('entity_id', candidate.entity_id);
        if (docsError) throw docsError;

        const { error: membershipError } = await supabase
            .from('entity_memberships')
            .delete()
            .eq('id', candidate.id);
        if (membershipError) throw membershipError;

        alert('Candidato removido com sucesso.');
        await loadData(federation.id);
        if (selectedCandidate?.id === candidate.id) setSelectedCandidate(null);
    } catch (err: any) {
        console.error('Erro ao deletar candidato:', err);
        alert('Erro ao deletar candidato: ' + (err?.message || 'Tente novamente.'));
    }
  };

  if (loading || !authorized) return <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4"><Loader2 className="animate-spin text-blue-500" size={40} /><p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Gestão...</p></div>;

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 font-sans overflow-hidden">
      
      <aside className={`bg-black border-r border-white/5 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="p-8 border-b border-white/5">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-600/20"><ShieldCheck size={20}/></div>
              {isSidebarOpen && <div className="font-black uppercase text-xs text-white leading-tight">Painel Admin</div>}
           </div>
        </div>
        <nav className="flex-1 py-8 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" isOpen={isSidebarOpen} color={federation.settings.primary_color} />
          <SidebarNavItem active={activeTab === 'candidatos'} onClick={() => setActiveTab('candidatos')} icon={<Users size={18}/>} label="Candidatos" isOpen={isSidebarOpen} color={federation.settings.primary_color} />
          <SidebarNavItem active={activeTab === 'cronograma'} onClick={() => setActiveTab('cronograma')} icon={<CalendarIcon size={18}/>} label="Cronograma" isOpen={isSidebarOpen} color={federation.settings.primary_color} />
          <SidebarNavItem active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<Receipt size={18}/>} label="Financeiro" isOpen={isSidebarOpen} color={federation.settings.primary_color} />
          {userRole === 'admin' && <SidebarNavItem active={activeTab === 'acessos'} onClick={() => setActiveTab('acessos')} icon={<Shield size={18} className="text-red-500"/>} label="Gestão de Acessos" isOpen={isSidebarOpen} color="#ef4444" />}
          <SidebarNavItem active={activeTab === 'morto'} onClick={() => setActiveTab('morto')} icon={<Ban size={18}/>} label="Arquivo Morto" isOpen={isSidebarOpen} color={federation.settings.primary_color} />
        </nav>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-6 border-t border-white/5 flex items-center gap-4 text-slate-500 hover:text-white transition-all">
           {isSidebarOpen ? <ChevronLeft size={20}/> : <Menu size={20}/>}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col bg-black">
        <header className="h-20 border-b border-white/5 bg-black/50 backdrop-blur-md px-12 flex items-center justify-between sticky top-0 z-10">
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gestão / <span className="text-white">{federation.name}</span></h2>
           <button onClick={handleLogout} className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500 hover:text-red-500 transition-colors">Sair <LogOut size={14}/></button>
        </header>

        <div className="p-12 space-y-12 max-w-7xl mx-auto w-full">
           {activeTab === 'dashboard' && <DashboardView candidatos={candidatos} primaryColor={federation.settings.primary_color} userRole={userRole} onSetTab={setActiveTab} />}
           {activeTab === 'cronograma' && <CronogramaView schedule={schedule} onEdit={(ev: any) => { setSelectedEvent(ev); setIsEventModalOpen(true); }} onCreate={() => { setSelectedEvent({ entity_id: federation.id, title: '', date: '', start_time: '09:00', modality: 'Presencial', graduation_level: [] }); setIsEventModalOpen(true); }} />}
                     {(['candidatos', 'morto', 'arquivo'].includes(activeTab)) && (
                         <ListView list={filteredList} activeTab={activeTab} onManage={(c: any) => setSelectedCandidate(c)} onDelete={handleDeleteCandidate} canDelete={userRole === 'admin'} searchTerm={searchTerm} setSearchTerm={setSearchTerm} bottleneck={bottleneckFilter} setBottleneck={setBottleneckFilter} />
                     )}
           {activeTab === 'financeiro' && <FinanceiroView candidatos={candidatos.filter(c => c.status_pagamento === 'PAGO')} color={federation.settings.primary_color} />}
           {activeTab === 'acessos' && <AcessosView gestores={gestores} onManage={handleManageManager} onOpenAdd={() => setIsAddManagerModalOpen(true)} />}
        </div>
      </main>

      {isAddManagerModalOpen && <AddManagerModal onClose={() => setIsAddManagerModalOpen(false)} onAdd={handleAddManagerByEmail} />}

      {isEventModalOpen && (
        <EventModal event={selectedEvent} onClose={() => setIsEventModalOpen(false)} onSave={async (ev: any) => {
                const { error } = await supabase.from('federation_schedule').upsert(ev);
                if (!error) { await loadData(federation.id); setIsEventModalOpen(false); }
            }}
            onDelete={async (id: string) => {
                if(!confirm("Deletar evento?")) return;
                const { error } = await supabase.from('federation_schedule').delete().eq('id', id);
                if (!error) { await loadData(federation.id); setIsEventModalOpen(false); }
            }}
        />
      )}

      {selectedCandidate && (
        <AuditModal 
            candidate={selectedCandidate} 
            supabase={supabase} 
            federation={federation}
            onClose={() => setSelectedCandidate(null)}
            onSave={handleSaveCandidate}
        />
      )}
    </div>
  );
}

// --- 3. SUB-VIEWS ---

function DashboardView({ candidatos, primaryColor, userRole, onSetTab }: any) {
    const pagos = candidatos.filter((c:any) => c.status_pagamento === 'PAGO');
    const totalReceita = pagos.reduce((acc:number, c:any) => acc + (c.valor_pago || 0), 0);
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="Inscritos" value={candidatos.length} icon={<Users className="text-blue-500" />} />
                <StatCard label="Receita Geral" value={`R$ ${totalReceita.toFixed(2)}`} icon={<DollarSign className="text-green-500" />} />
                <StatCard label="Pagamentos OK" value={pagos.length} icon={<TrendingUp className="text-emerald-500" />} />
                <StatCard label="Aprovados" value={candidatos.filter((c:any) => c.status_inscricao === 'APROVADO').length} icon={<CheckCircle className="text-white" />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[40px] p-10">
                    <h3 className="text-xs font-black uppercase text-slate-500 italic mb-8 flex items-center gap-2"><BarChart3 size={18}/> Funil de Homologação</h3>
                    <div className="space-y-6">
                        <ProgressBar label="Pagamentos OK" current={pagos.length} total={candidatos.length} color={primaryColor} />
                        <ProgressBar label="Aprovações Finais" current={candidatos.filter((c:any) => c.status_inscricao === 'APROVADO').length} total={candidatos.length} color="#22c55e" />
                    </div>
                </div>
                {userRole === 'admin' && (
                    <div onClick={() => onSetTab('acessos')} className="bg-red-900/5 border border-red-900/20 rounded-[40px] p-10 cursor-pointer hover:bg-red-900/10 transition-all group">
                        <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 group-hover:bg-red-600 group-hover:text-white transition-all"><Shield size={24}/></div>
                        <h3 className="text-xl font-black uppercase italic text-white mb-2">Gestão de Acessos</h3>
                        <p className="text-slate-500 text-xs leading-relaxed">Você tem novos gestores aguardando aprovação para acessar o painel administrativo.</p>
                        <div className="mt-6 text-[10px] font-black uppercase text-red-500 flex items-center gap-2">Gerenciar Permissões <ChevronRight size={14}/></div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AcessosView({ gestores, onManage, onOpenAdd }: any) {
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Controle de Administradores</h2>
                <button onClick={onOpenAdd} className="px-6 py-3 bg-red-600 text-white font-bold uppercase text-[10px] rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg"><UserPlus size={16}/> Novo Gestor</button>
            </div>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[9px] font-black uppercase text-slate-500 border-b border-white/5">
                        <tr><th className="px-8 py-5">Gestor</th><th className="px-8 py-5">Nível</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-right">Ação</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {gestores.map((g: any) => (
                            <tr key={g.id} className="hover:bg-white/[0.01]">
                                <td className="px-8 py-4">
                                    <div className="font-bold text-sm text-white">{g.profiles?.full_name || 'Usuário Sem Perfil'}</div>
                                    <div className="text-[10px] text-slate-500">{g.profiles?.email}</div>
                                </td>
                                <td className="px-8 py-4 text-[10px] font-black uppercase text-blue-500">{g.role}</td>
                                <td className="px-8 py-4"><span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase ${g.status_inscricao === 'GESTOR_ATIVO' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'}`}>{g.status_inscricao}</span></td>
                                <td className="px-8 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {g.status_inscricao === 'PENDENTE_APROVACAO' && <button onClick={() => onManage(g.id, 'GESTOR_ATIVO')} className="p-2 bg-green-600/10 text-green-500 rounded-lg hover:bg-green-600 hover:text-white transition-all"><UserCheck size={18}/></button>}
                                        <button onClick={() => { if(confirm("Remover acesso?")) onManage(g.id, 'CANCELADO'); }} className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"><UserX size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CronogramaView({ schedule, onEdit, onCreate }: any) {
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Cronograma Oficial</h2>
                <button onClick={onCreate} className="px-6 py-3 bg-white text-black font-bold uppercase text-[10px] rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg"><Plus size={16}/> Novo Evento</button>
            </div>
            <div className="space-y-4">
                {schedule.map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl hover:border-white/20 transition-all group">
                        <div className="text-center min-w-[60px] border-r border-white/10 pr-6">
                            <div className="text-2xl font-black text-white">{new Date(ev.date + 'T12:00:00').getDate()}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">{new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</div>
                        </div>
                        <div className="flex-1">
                            <div className="text-[9px] font-black uppercase text-blue-500 mb-1">{ev.modality} • {ev.start_time}</div>
                            <h4 className="font-bold text-white uppercase tracking-tight">{ev.title}</h4>
                            <p className="text-xs text-slate-500">{ev.location}</p>
                        </div>
                        <button onClick={() => onEdit(ev)} className="p-3 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 text-slate-400"><Edit3 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ListView({ list, onManage, onDelete, canDelete, searchTerm, setSearchTerm, bottleneck, setBottleneck }: any) {
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-2 bg-black border border-white/5 p-1 rounded-2xl">
                    <FilterBtn active={bottleneck === 'todos'} onClick={() => setBottleneck('todos')} label="Todos" />
                    <FilterBtn active={bottleneck === 'auditoria_pendente'} onClick={() => setBottleneck('auditoria_pendente')} label="Auditoria Pendente" />
                    <FilterBtn active={bottleneck === 'pagamento_pendente'} onClick={() => setBottleneck('pagamento_pendente')} label="Pgmto Pendente" />
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} type="text" placeholder="Nome ou CPF..." className="bg-[#0a0a0a] border border-white/10 rounded-full pl-12 pr-6 py-3 text-xs text-white outline-none focus:border-red-600 w-80 transition-all shadow-inner" />
                </div>
            </div>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                        <tr>
                            <th className="px-8 py-5">Atleta</th>
                            <th className="px-8 py-5">Objetivo</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5">Pagamento</th>
                            <th className="px-8 py-5">Valor</th>
                            <th className="px-8 py-5">Atualizado</th>
                            <th className="px-8 py-5 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {list.map((c: any) => (
                            <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-8 py-4">
                                    <div className="font-bold text-sm text-white group-hover:text-red-500 transition-colors">{c.profiles?.full_name}</div>
                                    <div className="text-[9px] font-mono text-slate-600">{c.profiles?.cpf}</div>
                                </td>
                                <td className="px-8 py-4 text-[10px] font-black uppercase text-red-600 italic tracking-wider">{c.graduacao_pretendida}</td>
                                <td className="px-8 py-4"><StatusBadge status={c.status_inscricao} /></td>
                                <td className="px-8 py-4"><PaymentBadge status={c.status_pagamento} /></td>
                                <td className="px-8 py-4 text-[10px] font-mono text-slate-400">{formatMoney(c.valor_pago)}</td>
                                <td className="px-8 py-4 text-[10px] text-slate-500 italic">{formatDate(c.updated_at)}</td>
                                <td className="px-8 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => onManage(c)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 shadow-sm">Gerenciar</button>
                                        {canDelete && (
                                            <button onClick={() => onDelete(c)} className="p-2 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all" aria-label="Excluir candidato">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FinanceiroView({ candidatos, color }: any) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const filtered = candidatos.filter((c: any) => {
        if (!from && !to) return true;
        const date = new Date(c.updated_at);
        if (from) {
            const fromDate = new Date(`${from}T00:00:00`);
            if (date < fromDate) return false;
        }
        if (to) {
            const toDate = new Date(`${to}T23:59:59`);
            if (date > toDate) return false;
        }
        return true;
    });

    const exportCsv = () => {
        const header = ['data', 'nome', 'email', 'cpf', 'status_pagamento', 'metodo', 'parcelas', 'vencimento', 'valor'];
        const rows = filtered.map((c: any) => {
            const paymentInfo = c.progresso?.payment_info || {};
            return {
                data: formatDateTime(c.updated_at),
                nome: c.profiles?.full_name || '',
                email: c.profiles?.email || '',
                cpf: c.profiles?.cpf || '',
                status_pagamento: c.status_pagamento || '',
                metodo: formatPaymentMethod(paymentInfo.method || paymentInfo.payment_method),
                parcelas: paymentInfo.installments || '',
                vencimento: paymentInfo.due_date ? formatDate(paymentInfo.due_date) : '',
                valor: typeof c.valor_pago !== 'undefined' ? Number(c.valor_pago).toFixed(2) : ''
            };
        });
        const csv = [header.join(','), ...rows.map((r: any) => header.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'financeiro_candidatos.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Filtro de Período</div>
                <div className="flex items-center gap-2">
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white" />
                    <span className="text-[9px] text-slate-500">até</span>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white" />
                    <button onClick={exportCsv} className="px-3 py-2 bg-white/10 text-white rounded-lg text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all">Exportar CSV</button>
                </div>
            </div>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5">
                        <tr>
                            <th className="px-8 py-5">Data</th>
                            <th className="px-8 py-5">Atleta</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5">Método</th>
                            <th className="px-8 py-5">Parcelas</th>
                            <th className="px-8 py-5">Vencimento</th>
                            <th className="px-8 py-5 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {filtered.map((c: any) => (
                            (() => {
                                const paymentInfo = c.progresso?.payment_info || {};
                                return (
                            <tr key={c.id} className="hover:bg-white/[0.01]">
                                <td className="px-8 py-4 text-xs font-mono text-slate-500 italic">{formatDate(c.updated_at || c.created_at)}</td>
                                <td className="px-8 py-4">
                                    <div className="font-bold text-sm text-white">{c.profiles?.full_name}</div>
                                    <div className="text-[9px] text-slate-600">{c.profiles?.email}</div>
                                </td>
                                <td className="px-8 py-4"><PaymentBadge status={c.status_pagamento} /></td>
                                <td className="px-8 py-4 text-[10px] text-slate-400 uppercase">{formatPaymentMethod(paymentInfo.method_label || paymentInfo.method || paymentInfo.payment_method)}</td>
                                <td className="px-8 py-4 text-[10px] text-slate-400">{paymentInfo.installments || '--'}</td>
                                <td className="px-8 py-4 text-[10px] text-slate-400">{paymentInfo.due_date ? formatDate(paymentInfo.due_date) : '--'}</td>
                                <td className="px-8 py-4 text-right font-black italic" style={{ color }}>R$ {c.valor_pago?.toFixed(2)}</td>
                            </tr>
                                );
                            })()
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- 4. MODAIS ---

function AddManagerModal({ onClose, onAdd }: any) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('manager');
    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] w-full max-w-md rounded-[32px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-xl font-black uppercase italic text-white mb-8 tracking-tighter">Liberar Acesso</h3>
                <div className="space-y-6 mb-8">
                    <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-red-600 transition-all shadow-inner" placeholder="exemplo@email.com" /></div>
                    <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nível</label><select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none cursor-pointer"><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
                </div>
                <footer className="flex gap-4"><button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Cancelar</button><button onClick={() => onAdd(email, role)} className="flex-1 py-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Liberar</button></footer>
            </div>
        </div>
    );
}

function AuditModal({ candidate, onClose, onSave, supabase, federation }: any) {
    const [tab, setTab] = useState<'overview' | 'financeiro' | 'pontos' | 'docs' | 'boletim' | 'raw'>('overview');
    const [form, setForm] = useState({ ...candidate, valor_pago: typeof candidate.valor_pago === 'number' ? candidate.valor_pago : null });
    const [prog, setProg] = useState(candidate.progresso || {});
    const syncRef = useRef<string | null>(null);
    const [docs, setDocs] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [docsError, setDocsError] = useState<string | null>(null);
    const [uploadCategory, setUploadCategory] = useState<string>('identidade');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [sales, setSales] = useState<any[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);
    const [salesFrom, setSalesFrom] = useState('');
    const [salesTo, setSalesTo] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        async function fetchDocs() {
            setLoadingDocs(true);
            setDocsError(null);
            try {
                const { data, error } = await supabase
                    .from('entity_documents')
                    .select('*')
                    .eq('profile_id', candidate.profile_id)
                    .eq('entity_id', candidate.entity_id);
                if (error) {
                    setDocsError(error.message || 'Erro ao buscar documentos.');
                    setDocs([]);
                } else {
                    setDocs(data || []);
                }
            } catch (err: any) {
                setDocsError(err?.message || 'Erro ao buscar documentos.');
                setDocs([]);
            } finally {
                setLoadingDocs(false);
            }
        }
        fetchDocs();
    }, [candidate, supabase]);

    useEffect(() => {
        async function fetchSales() {
            if (!candidate.profiles?.email) return;
            setLoadingSales(true);
            const { data } = await supabase
                .from('vendas')
                .select('*')
                .eq('email', candidate.profiles.email)
                .order('created_at', { ascending: false });
            if (data) setSales(data);
            setLoadingSales(false);
        }
        fetchSales();
    }, [candidate, supabase]);

    useEffect(() => {
        async function syncProfepCourses() {
            const target = form.graduacao_pretendida?.toLowerCase().split(' ')[0] || 'shodan';
            const syncKey = `${candidate.id}:${target}`;
            if (syncRef.current === syncKey) return;
            syncRef.current = syncKey;

            const reqs = REQUIREMENTS_DATA[target] || REQUIREMENTS_DATA.shodan;
            const profepCourses: string[] = reqs?.courses?.profep || [];
            if (!profepCourses.length) return;

            const { data: ava } = await supabase
                .from('user_courses')
                .select('courses(title)')
                .eq('user_id', candidate.profile_id)
                .eq('status', 'completed');

            const completedTitles = new Set(
                (ava || [])
                    .map((c: any) => c.courses?.title)
                    .filter(Boolean)
                    .map((title: string) => generateId(title))
            );

            const updates: Record<string, boolean> = {};
            profepCourses.forEach((title) => {
                const id = generateId(title);
                if (completedTitles.has(id) && prog?.[id] !== true) {
                    updates[id] = true;
                }
            });

            if (Object.keys(updates).length === 0) return;

            const updatedProgress = { ...(prog || {}), ...updates };
            setProg(updatedProgress);

            await supabase
                .from('entity_memberships')
                .update({ progresso: updatedProgress })
                .eq('id', candidate.id);
        }

        syncProfepCourses();
    }, [candidate.id, candidate.profile_id, form.graduacao_pretendida, prog, supabase]);

    const updateDoc = async (id: string, status: string) => {
        const feedback = status === 'Rejeitado' ? prompt("Motivo:") : null;
        if (status === 'Rejeitado' && !feedback) return;
        const { error } = await supabase.from('entity_documents').update({ status, feedback }).eq('id', id);
        if (!error) setDocs(prev => prev.map(d => d.id === id ? { ...d, status, feedback } : d));
    };

    const handleAdminUpload = async () => {
        if (!uploadFile) return;
        try {
            setUploadingDoc(true);
            const fileExt = uploadFile.name.split('.').pop();
            const fileName = `${candidate.profile_id}/${uploadCategory}_${Date.now()}.${fileExt}`;
            const filePath = `${federation.slug}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('federation_docs')
                .upload(filePath, uploadFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('federation_docs')
                .getPublicUrl(filePath);

            const { data: newDoc, error: dbError } = await supabase
                .from('entity_documents')
                .insert({
                    profile_id: candidate.profile_id,
                    entity_id: candidate.entity_id,
                    category: uploadCategory,
                    file_url: publicUrlData.publicUrl,
                    file_name: uploadFile.name,
                    status: 'Pendente'
                })
                .select()
                .single();

            if (dbError) throw dbError;
            setDocs(prev => [newDoc, ...prev]);
            setUploadFile(null);
            alert('Documento enviado.');
        } catch (err: any) {
            alert(err?.message || 'Erro ao enviar documento.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const docsApproved = docs.filter(d => d.status === 'Aprovado').length;
    const docsPending = docs.filter(d => d.status !== 'Aprovado').length;

    const calcInputs = prog?.calculator_inputs || {};
    const calcKatas = Array.isArray(calcInputs.katas) ? calcInputs.katas : [];
    const auditLog = Array.isArray(prog?.audit_log) ? prog.audit_log : [];
    const paymentInfo = prog?.payment_info || {};
    const updatePaymentInfo = (updates: Record<string, any>) => {
        setProg((prev: any) => ({
            ...prev,
            payment_info: { ...(prev?.payment_info || {}), ...updates }
        }));
    };

    const rawPayload = {
        membership: candidate,
        profile: candidate.profiles,
        progresso: prog,
        documentos: docs,
        vendas: sales
    };

    const handleCopyRaw = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
            alert('JSON copiado.');
        } catch {
            alert('Falha ao copiar JSON.');
        }
    };

    const filteredSales = sales.filter((sale: any) => {
        if (!salesFrom && !salesTo) return true;
        const saleDate = new Date(sale.created_at);
        if (salesFrom) {
            const fromDate = new Date(`${salesFrom}T00:00:00`);
            if (saleDate < fromDate) return false;
        }
        if (salesTo) {
            const toDate = new Date(`${salesTo}T23:59:59`);
            if (saleDate > toDate) return false;
        }
        return true;
    });

    const exportSalesCsv = () => {
        const rows = filteredSales.map((sale: any) => ({
            data: formatDateTime(sale.created_at),
            email: sale.email || '',
            plano: sale.plano || '',
            metodo: sale.metodo || '',
            valor: typeof sale.valor !== 'undefined' ? Number(sale.valor).toFixed(2) : '',
            transaction_id: sale.transaction_id || ''
        }));

        const header = ['data', 'email', 'plano', 'metodo', 'valor', 'transaction_id'];
        const csv = [header.join(','), ...rows.map(r => header.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transacoes_${candidate.profiles?.full_name?.replace(/\s+/g, '_') || 'candidato'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderBoletim = () => {
        const target = form.graduacao_pretendida?.toLowerCase().split(' ')[0] || 'shodan';
        const reqs = REQUIREMENTS_DATA[target] || REQUIREMENTS_DATA.shodan;
        const labelMap: Record<string, string> = {
            presential: 'Cursos Presenciais',
            internships: 'Estágios',
            theory: 'Avaliações Teóricas',
            courses: 'Cursos Teóricos',
            practical_exams: 'Exames Práticos'
        };
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(reqs).map(([category, items]: any) => (
                    <div key={category} className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h5 className="text-[9px] font-black uppercase text-slate-500 mb-3 border-b border-white/5 pb-1 tracking-widest">{labelMap[category] || category}</h5>
                        <div className="space-y-2">
                            {((Array.isArray(items)
                                ? items
                                : (items?.profep || []).concat(items?.cob || [])) as string[]).map((item: string) => {
                                const id = generateId(item);
                                const isGradeCategory = ['theory', 'practical_exams'].includes(category);
                                if (isGradeCategory) {
                                    const isDual = DUAL_KATA_IDS.has(id);
                                    const toriKey = `${id}_tori`;
                                    const ukeKey = `${id}_uke`;
                                    const gradeKey = `${id}_grade`;
                                    const toriValue = prog?.[toriKey] ?? '';
                                    const ukeValue = prog?.[ukeKey] ?? '';
                                    const gradeValue = prog?.[gradeKey] ?? '';
                                    return (
                                        <div key={id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-white/5 bg-black/30">
                                            <span className="text-[11px] font-bold text-slate-200">{item}</span>
                                            {isDual ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] uppercase text-slate-500 font-black">Tori</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={toriValue}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setProg((prev: any) => ({ ...prev, [toriKey]: value === '' ? null : Number(value) }));
                                                            }}
                                                            className="w-20 bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                                                            placeholder="--"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] uppercase text-slate-500 font-black">Uke</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={ukeValue}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setProg((prev: any) => ({ ...prev, [ukeKey]: value === '' ? null : Number(value) }));
                                                            }}
                                                            className="w-20 bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                                                            placeholder="--"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] uppercase text-slate-500 font-black">Nota</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={gradeValue}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setProg((prev: any) => ({ ...prev, [gradeKey]: value === '' ? null : Number(value) }));
                                                        }}
                                                        className="w-24 bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                                                        placeholder="--"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                const checked = prog[id] === true;
                                return (
                                    <label key={id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${checked ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'hover:bg-white/5 text-slate-500 border-transparent'} border`}>
                                        <input type="checkbox" className="hidden" checked={checked} onChange={() => setProg({ ...prog, [id]: !checked })} />
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-green-600 border-green-600' : 'border-slate-600 shadow-inner'}`}>{checked && <CheckCircle size={10} className="text-white"/>}</div>
                                        <span className="text-[11px] font-bold">{item}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] w-full max-w-5xl max-h-[90vh] rounded-[40px] border border-white/10 flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
                <header className="p-8 border-b border-white/5 flex justify-between bg-gradient-to-r from-blue-600/5 to-transparent">
                    <div><h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">{candidate.profiles?.full_name}</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{candidate.profiles?.email} • {candidate.profiles?.cpf}</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500"><X size={24}/></button>
                </header>
                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="space-y-6">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-6 shadow-inner">
                            <StatusSelect label="Inscrição" value={form.status_inscricao} onChange={(v:any) => setForm({...form, status_inscricao: v})} options={['PENDENTE', 'INSCRITO', 'APROVADO', 'REPROVADO', 'CANCELADO']} />
                            <StatusSelect label="Financeiro" value={form.status_pagamento} onChange={(v:any) => setForm({...form, status_pagamento: v})} options={['PENDENTE', 'PAGO', 'EM PAGAMENTO', 'EM ATRASO']} />
                        </div>
                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ações Rápidas</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setForm({ ...form, status_inscricao: 'APROVADO' })} className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg text-[9px] font-black uppercase hover:bg-green-600 hover:text-black transition-all">Aprovar</button>
                                <button onClick={() => setForm({ ...form, status_inscricao: 'REPROVADO' })} className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-[9px] font-black uppercase hover:bg-red-600 hover:text-black transition-all">Reprovar</button>
                                <button onClick={() => setForm({ ...form, status_pagamento: 'PAGO' })} className="px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-black transition-all">Marcar Pago</button>
                                <button onClick={() => setForm({ ...form, status_pagamento: 'PENDENTE' })} className="px-3 py-2 bg-yellow-600/20 text-yellow-400 rounded-lg text-[9px] font-black uppercase hover:bg-yellow-600 hover:text-black transition-all">Marcar Pendente</button>
                            </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Documentos</div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Aprovados</span>
                                <span className="text-green-400 font-black">{docsApproved}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                                <span>Pendentes</span>
                                <span className="text-yellow-400 font-black">{docsPending}</span>
                            </div>
                        </div>
                        <div className="bg-blue-600/5 p-6 rounded-2xl border border-blue-600/20 shadow-lg shadow-blue-900/10">
                            <textarea className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white h-20 resize-none outline-none focus:border-blue-500 shadow-inner" placeholder="Aviso..." value={msg} onChange={(e) => setMsg(e.target.value)} />
                            <button onClick={() => { if(!msg.trim()) return; sendDossierNotification(candidate.profiles.email, candidate.profiles.full_name, 'Aviso', federation.name, msg); setMsg(''); alert('Enviado!'); }} className="w-full py-2 bg-blue-600 text-[10px] font-black uppercase rounded-lg mt-2 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg"><Send size={12}/> Enviar</button>
                        </div>
                    </div>
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex gap-4 border-b border-white/5 pb-4">
                            <button onClick={() => setTab('overview')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'overview' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Overview</button>
                            <button onClick={() => setTab('financeiro')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'financeiro' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Financeiro</button>
                            <button onClick={() => setTab('pontos')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'pontos' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Pontuação</button>
                            <button onClick={() => setTab('docs')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'docs' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Documentos</button>
                            <button onClick={() => setTab('boletim')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'boletim' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Boletim</button>
                            <button onClick={() => setTab('raw')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'raw' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Raw</button>
                        </div>
                        {tab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoCard title="Identidade">
                                    <InfoRow label="Nome" value={candidate.profiles?.full_name} />
                                    <InfoRow label="Email" value={candidate.profiles?.email} />
                                    <InfoRow label="CPF" value={candidate.profiles?.cpf} />
                                    <InfoRow label="Telefone" value={candidate.profiles?.phone} />
                                </InfoCard>
                                <InfoCard title="Dados Pessoais">
                                    <InfoRow label="Nascimento" value={formatDate(candidate.profiles?.nascimento)} />
                                    <InfoRow label="Graduação Atual" value={candidate.profiles?.graduacao} />
                                    <InfoRow label="Última Promoção" value={formatDate(candidate.profiles?.ultima_promocao)} />
                                    <InfoRow label="Federação" value={federation?.name} />
                                </InfoCard>
                                <InfoCard title="Inscrição">
                                    <InfoRow label="Objetivo" value={candidate.graduacao_pretendida} />
                                    <InfoRow label="Status" value={candidate.status_inscricao} />
                                    <InfoRow label="Criado em" value={formatDate(candidate.created_at)} />
                                    <InfoRow label="Atualizado" value={formatDate(candidate.updated_at)} />
                                </InfoCard>
                                <InfoCard title="Financeiro (Resumo)">
                                    <InfoRow label="Status" value={candidate.status_pagamento} />
                                    <InfoRow label="Valor Pago" value={formatMoney(candidate.valor_pago)} />
                                    <InfoRow label="ID" value={candidate.id} />
                                    <InfoRow label="Role" value={candidate.role} />
                                </InfoCard>
                                <InfoCard title="Auditoria (Últimas Ações)">
                                    {auditLog.length === 0 && <div className="text-[10px] text-slate-500">Sem ações registradas.</div>}
                                    {auditLog.slice(0, 6).map((entry: any, idx: number) => (
                                        <div key={idx} className="text-[10px] text-slate-300">
                                            <div className="font-black uppercase">{entry.action || 'update'}</div>
                                            <div className="text-[9px] text-slate-500">{formatDateTime(entry.at)} • {entry.by || 'admin'}</div>
                                            <div className="text-[9px] text-slate-400">{entry.status_inscricao} / {entry.status_pagamento} {typeof entry.valor_pago === 'number' ? `• R$ ${entry.valor_pago.toFixed(2)}` : ''}</div>
                                        </div>
                                    ))}
                                </InfoCard>
                            </div>
                        )}
                        {tab === 'financeiro' && (
                            <div className="space-y-4">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Dados Financeiros</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoRow label="Status" value={form.status_pagamento} />
                                        <InfoRow label="Última Atualização" value={formatDate(candidate.updated_at || candidate.created_at)} />
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Método</label>
                                            <select
                                                value={paymentInfo.method || ''}
                                                onChange={(e) => updatePaymentInfo({
                                                    method: e.target.value,
                                                    method_label: formatPaymentMethod(e.target.value)
                                                })}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-600 transition-all shadow-inner"
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="pix">PIX</option>
                                                <option value="boleto">Boleto</option>
                                                <option value="cartao">Cartão</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Parcelas</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={paymentInfo.installments ?? ''}
                                                onChange={(e) => updatePaymentInfo({ installments: e.target.value === '' ? null : Number(e.target.value) })}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-600 transition-all shadow-inner"
                                                placeholder="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Vencimento</label>
                                            <input
                                                type="date"
                                                value={paymentInfo.due_date ?? ''}
                                                onChange={(e) => updatePaymentInfo({ due_date: e.target.value || null })}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-600 transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Transação</label>
                                            <input
                                                type="text"
                                                value={paymentInfo.transaction_id ?? candidate.last_transaction_id ?? ''}
                                                onChange={(e) => updatePaymentInfo({ transaction_id: e.target.value || null })}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-600 transition-all shadow-inner"
                                                placeholder="ID da transação"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Valor Pago</label>
                                            <input
                                                type="number"
                                                value={form.valor_pago ?? ''}
                                                onChange={(e) => setForm({ ...form, valor_pago: e.target.value === '' ? null : Number(e.target.value) })}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-600 transition-all shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <InfoRow label="Email" value={candidate.profiles?.email} />
                                    </div>
                                    {(paymentInfo.boleto || paymentInfo.bankSlipUrl || paymentInfo.digitableLine || paymentInfo.barcode) && (
                                        <div className="mt-6 grid grid-cols-1 gap-2">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Boleto</div>
                                            <InfoRow label="Linha Digitável" value={paymentInfo.digitableLine || paymentInfo.boleto?.digitableLine || '--'} />
                                            <InfoRow label="Código de Barras" value={paymentInfo.barcode || paymentInfo.boleto?.barcode || '--'} />
                                            {paymentInfo.bankSlipUrl && (
                                                <a href={paymentInfo.bankSlipUrl} target="_blank" className="text-[10px] text-blue-400 hover:text-blue-300 underline">Abrir Boleto</a>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Histórico de Transações</h4>
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white" />
                                            <span className="text-[9px] text-slate-500">até</span>
                                            <input type="date" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white" />
                                            <button onClick={exportSalesCsv} className="px-3 py-2 bg-white/10 text-white rounded-lg text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all">Exportar CSV</button>
                                        </div>
                                    </div>
                                    {loadingSales && <div className="text-[10px] text-slate-500">Carregando transações...</div>}
                                    {!loadingSales && filteredSales.length === 0 && <div className="text-[10px] text-slate-500">Nenhuma transação encontrada.</div>}
                                    {!loadingSales && filteredSales.length > 0 && (
                                        <div className="divide-y divide-white/5">
                                            {filteredSales.slice(0, 10).map((sale: any) => (
                                                <div key={sale.id} className="py-3 flex items-center justify-between">
                                                    <div>
                                                        <div className="text-[11px] font-black text-white">{sale.plano || 'Plano'}</div>
                                                        <div className="text-[9px] text-slate-500 uppercase">{sale.metodo} • {formatDateTime(sale.created_at)}</div>
                                                        {sale.transaction_id && <div className="text-[9px] text-slate-600">ID: {sale.transaction_id}</div>}
                                                    </div>
                                                    <div className="text-[11px] font-black text-emerald-400">{formatMoney(Number(sale.valor))}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {tab === 'pontos' && (
                            <div className="space-y-4">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Simulação</div>
                                            <div className="text-2xl font-black text-white">{prog?.total ?? '--'} pts</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] uppercase text-slate-500">Trilha</div>
                                            <div className="text-[11px] font-black text-emerald-400 uppercase">{prog?.track || '--'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoCard title="Principais Inputs">
                                        {Object.entries(CALC_LABELS).map(([key, label]) => (
                                            <InfoRow key={key} label={label} value={calcInputs?.[key] ?? 0} />
                                        ))}
                                    </InfoCard>
                                    <InfoCard title="Katas Selecionados">
                                        {calcKatas.length === 0 && <div className="text-[10px] text-slate-500">Nenhum kata informado.</div>}
                                        {calcKatas.map((k: string) => (
                                            <div key={k} className="text-[11px] font-bold text-slate-300">• {KATA_LABELS[k] || k}</div>
                                        ))}
                                    </InfoCard>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoCard title="Contribuição">
                                        {Object.keys(CALC_FIELD_META).filter(k => k.startsWith('contrib_')).map(key => (
                                            <InfoRow key={key} label={CALC_FIELD_META[key].label} value={`${calcInputs?.[key] || 0} ${CALC_FIELD_META[key].unit}`} />
                                        ))}
                                    </InfoCard>
                                    <InfoCard title="Atividades em Prol">
                                        {Object.keys(CALC_FIELD_META).filter(k => k.startsWith('prol_')).map(key => (
                                            <InfoRow key={key} label={CALC_FIELD_META[key].label} value={`${calcInputs?.[key] || 0} ${CALC_FIELD_META[key].unit}`} />
                                        ))}
                                    </InfoCard>
                                </div>
                            </div>
                        )}
                        {tab === 'raw' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dump completo</div>
                                    <button onClick={handleCopyRaw} className="px-3 py-2 bg-white/10 text-white rounded-lg text-[9px] font-black uppercase hover:bg-white hover:text-black transition-all">Copiar JSON</button>
                                </div>
                                <pre className="bg-black/60 border border-white/10 rounded-2xl p-4 text-[10px] text-slate-300 overflow-auto max-h-[420px] whitespace-pre-wrap">
                                    {JSON.stringify(rawPayload, null, 2)}
                                </pre>
                            </div>
                        )}
                        {tab === 'docs' ? (
                            <div className="space-y-3">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adicionar Documento (Admin)</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <select
                                            value={uploadCategory}
                                            onChange={(e) => setUploadCategory(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                                        >
                                            {DOC_CATEGORIES.map((c) => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="file"
                                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                                        />
                                        <button
                                            onClick={handleAdminUpload}
                                            disabled={!uploadFile || uploadingDoc}
                                            className="px-4 py-3 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
                                        >
                                            {uploadingDoc ? 'Enviando...' : 'Anexar'}
                                        </button>
                                    </div>
                                </div>
                                {docsError && (
                                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-[10px] text-red-300">
                                        {docsError}
                                    </div>
                                )}
                                {docs.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:border-white/10 shadow-sm group">
                                        <div className="text-xs font-bold uppercase text-slate-300">{d.category} <span className="text-[9px] text-slate-600 block italic">{d.file_name}</span></div>
                                        <div className="flex gap-2">
                                            <a href={d.file_url} target="_blank" className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"><ExternalLink size={14}/></a>
                                            <button onClick={() => updateDoc(d.id, 'Aprovado')} className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${d.status === 'Aprovado' ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-black'}`}>OK</button>
                                            <button onClick={() => updateDoc(d.id, 'Rejeitado')} className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${d.status === 'Rejeitado' ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-black'}`}>X</button>
                                        </div>
                                    </div>
                                ))}
                                {docs.length === 0 && !loadingDocs && !docsError && <div className="text-center py-20 text-[10px] font-black uppercase text-slate-700 italic tracking-[0.3em]">Nenhum documento.</div>}
                            </div>
                        ) : renderBoletim()}
                    </div>
                </div>
                <footer className="p-8 border-t border-white/5 flex justify-end gap-4 bg-[#050505]">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Cancelar</button>
                    <button onClick={() => onSave(form, prog)} className="px-8 py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-900/20 hover:scale-105 transition-all flex items-center gap-2"><Save size={16}/> Sincronizar Cadastro</button>
                </footer>
            </div>
        </div>
    );
}

function EventModal({ event, onClose, onSave, onDelete }: any) {
    const [form, setForm] = useState({ ...event });
    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] w-full max-w-2xl rounded-[32px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-xl font-black uppercase italic text-white mb-8 tracking-tighter">Evento</h3>
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="col-span-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Título</label><input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-white/30 transition-all shadow-inner" /></div>
                    <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Data</label><input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none shadow-inner" /></div>
                    <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Hora</label><input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none shadow-inner" /></div>
                    <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Modalidade</label><select value={form.modality} onChange={(e) => setForm({...form, modality: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none cursor-pointer"><option value="Presencial">Presencial</option><option value="Estágio">Estágio</option><option value="Online (gravado)">Online (gravado)</option><option value="Online ao vivo">Online ao vivo</option></select></div>
                    <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Local / Link</label><input type="text" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none shadow-inner" /></div>
                </div>
                <footer className="flex justify-between items-center border-t border-white/5 pt-8">
                    <button onClick={() => onDelete(form.id)} className="text-red-600 text-[10px] font-black uppercase hover:text-red-400 transition-all flex items-center gap-2"><Trash2 size={16}/> Excluir</button>
                    <div className="flex gap-4"><button onClick={onClose} className="px-6 py-2 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Cancelar</button><button onClick={() => onSave(form)} className="px-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Salvar</button></div>
                </footer>
            </div>
        </div>
    );
}

// --- 5. UI ATÔMICA ---

function SidebarNavItem({ icon, label, active, onClick, isOpen, color }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-8 py-4 cursor-pointer transition-all border-r-4 ${active ? 'bg-white/[0.03] text-white' : 'text-slate-600 hover:text-slate-400'}`} style={{ borderRightColor: active ? color : 'transparent' }}>
       <div style={{ color: active ? color : 'inherit' }}>{icon}</div>
       {isOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-in fade-in">{label}</span>}
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] shadow-lg shadow-black/40 hover:border-white/10 transition-all group shadow-inner">
       <div className="p-3 bg-white/5 w-fit rounded-2xl mb-6 text-slate-400 group-hover:text-white transition-colors shadow-sm">{icon}</div>
       <div className="text-3xl font-black italic text-white leading-none mb-2 tracking-tighter">{value}</div>
       <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none">{label}</div>
    </div>
  );
}

function ProgressBar({ label, current, total, color }: any) {
  const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="space-y-3">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>{label}</span><span className="text-white italic">{current} de {total}</span></div>
       <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner"><div className="h-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: color }}></div></div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    let color = 'bg-slate-900 text-slate-500 border-slate-800';
    if (status === 'APROVADO') color = 'bg-green-900/20 text-green-400 border-green-500/30';
    else if (status === 'INSCRITO') color = 'bg-blue-900/20 text-blue-400 border-blue-500/30';
    else if (status === 'PENDENTE' || status === 'EM ANÁLISE') color = 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
    return <span className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${color}`}>{status || 'AGUARDANDO'}</span>;
}

function PaymentBadge({ status }: { status?: string }) {
    let color = 'bg-slate-900 text-slate-500 border-slate-800';
    if (status === 'PAGO') color = 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30';
    else if (status === 'PENDENTE' || status === 'EM PAGAMENTO') color = 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30';
    else if (status === 'EM ATRASO') color = 'bg-red-900/20 text-red-400 border-red-500/30';
    return <span className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${color}`}>{status || 'PENDENTE'}</span>;
}

function FilterBtn({ active, onClick, label }: any) {
    return <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{label}</button>;
}

function StatusSelect({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[8px] font-black text-slate-600 uppercase pl-1 tracking-widest">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white focus:border-red-600 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-all shadow-inner">
          {options.map((opt: string) => <option key={opt} value={opt} className="bg-black text-white">{opt}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 text-[10px]">▼</div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{title}</div>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value?: any }) {
    return (
        <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 uppercase text-[9px] tracking-widest font-black">{label}</span>
            <span className="text-slate-200 font-bold text-right ml-3">{value ?? '--'}</span>
        </div>
    );
}