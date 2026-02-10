"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  LayoutDashboard, Calculator, BookOpen, Receipt, Loader2, CreditCard, 
  Check, Calendar as CalendarIcon, TicketPercent, Barcode, Repeat, 
  PlayCircle, MapPin, Video, MonitorPlay, Briefcase, Menu, X, Lock, 
  User, LogOut, IdCard, PenSquare, UserCheck, ClipboardList, CheckCircle, 
  Award, FileText, UploadCloud, Eye, XCircle, AlertTriangle, ExternalLink, 
  Laptop, Medal, PenTool, GraduationCap, ListChecks, Scale, Trophy, 
  ScrollText, Gavel, Save, Wallet, CalendarDays, History, QrCode, Phone, Fingerprint
} from 'lucide-react';

// Componentes internos
import CalculadoraPontos from './components/CalculadoraPontos';
import TermsAndConditionsModal from '../../../../components/federation/TermsAndConditionsModal';

// Server Action de pagamento - Apontando para o arquivo blindado
import { createFederationSubscription } from '../../../actions/safe2pay';

type StudyPlatformColor = 'indigo' | 'green' | 'purple';
type StudyPlatform = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  external?: boolean;
  icon: React.ElementType;
  color: StudyPlatformColor;
  // Restrição opcional por federação (slug). Se definido, só aparece para essas federações.
  onlyFederations?: string[];
  // Restrição opcional por federação (slug). Se definido, esconde para essas federações.
  exceptFederations?: string[];
};

const STUDY_PLATFORMS: StudyPlatform[] = [
  {
    id: 'profep-max',
    title: 'Profep MAX',
    description: 'Cursos obrigatórios e aulas.',
    actionLabel: 'ACESSAR',
    href: '/cursos',
    icon: Laptop,
    color: 'indigo'
  },
  {
    id: 'instituto-olimpico',
    title: 'Instituto Olímpico',
    description: 'Cursos de ética e gestão.',
    actionLabel: 'ACESSAR',
    href: 'https://www.cob.org.br/cultura-educacao/cursos-do-iob',
    external: true,
    icon: Medal,
    color: 'green'
  },
  {
    id: 'simulado-geral',
    title: 'Simulado Geral',
    description: 'Teste seus conhecimentos.',
    actionLabel: 'INICIAR',
    icon: PenTool,
    color: 'purple'
  }
];

// --- DADOS DOS REQUISITOS (BASE DE CONHECIMENTO INTEGRAL) ---
const REQUIREMENTS_DATA: any = {
  shodan: {
      presential: [
          { title: "Nage-no-Kata", desc: "Execução completa (Tori e Uke).", type: "check" },
          { title: "Arbitragem", desc: "Exame prático em competição.", type: "check" },
          { title: "Waza", desc: "Demonstração técnica.", type: "check", subitems: ["Kihon-dōsa (Fundamentos)", "Go-kyō (5 grupos)", "Katame-waza (Solo)", "Renraku-waza (Combinações)", "Kaeshi-waza (Contra-ataques)"] }
      ],
      internships: [
          { title: "Oficial de Competição", desc: "Carga horária prática de 48 horas (6 competições completas ou 8 com atuação parcial).", type: "hours" },
          { title: "Árbitro", desc: "Carga horária prática de 48 horas (6 competições completas ou 8 com atuação parcial).", type: "hours" }
      ],
      theory: [
        { title: "Artigo ou Poster", desc: "Avaliação da banca.", type: "grade" },
        { title: "Exame Teórico Geral", desc: "Prova escrita.", type: "grade" },
        { title: "Exame Teórico de Arbitragem", desc: "Prova escrita.", type: "grade" }
      ],
      courses: {
          profep: ["Curso de Nage-no-Kata", "Curso Ensino do Judô Infantil", "Curso Seiryoku-Zen’yo-Kokumin-Taiiku-no-Kata", "Direto do Dojo com Douglas Vieira", "Curso de Oficiais de Competição", "Curso de Arbitragem", "Curso de Waza", "Curso de Kodomo-no-Kata", "Curso de Ensino do Judô com Segurança", "Curso de História do Judô", "Curso de Terminologia do Judô", "Curso de Atendimento Pré-hospitalar (1ºs socorros)"],
          cob: ["Esporte Antirracista", "Prevenção do Assédio e Abuso", "Saúde Mental no Esporte", "Formando Campeões", "Combate à Manipulação de Resultados", "Igualdade de Gênero"]
      },
      practical_exams: [
          { title: "Kodomo-no-Kata", desc: "Envio de vídeo", type: "grade" },
          { title: "Seiryoku-Zen’yo-Kokumin-Taiiku-no-Kata", desc: "Envio de vídeo", type: "grade" },
          { title: "Arbitragem", desc: "Presencial", type: "grade" },
          { title: "Nage-no-Kata", desc: "Presencial", type: "grade" },
          { title: "Waza", desc: "Presencial", type: "grade" }
      ]
  },
  nidan: {
      presential: [
          { title: "Katame-no-Kata", desc: "Execução completa.", type: "check" },
          { title: "Arbitragem", desc: "Prático.", type: "check" },
          { title: "Waza", desc: "Demonstração.", type: "check", subitems: ["Shinmeisho-no-waza", "Katame-waza", "Renraku-waza", "Kaeshi-waza"] }
      ],
      internships: [{ title: "Árbitro", desc: "Carga horária prática de 48 horas (6 competições completas ou 8 com atuação parcial).", type: "hours" }],
      theory: [{ title: "Artigo ou Poster", type: "grade" }, { title: "Exame Teórico Geral", type: "grade" }, { title: "Exame Teórico de Arbitragem", type: "grade" }],
      courses: { profep: ["Curso de Gestão de Academias", "Curso de Katame-no-Kata", "Direto do Dojo com Ma. Suelen Altheman", "Curso de Arbitragem", "Curso de Waza", "Curso de Kodomo-no-Kata", "Curso de Ensino do Judô com Segurança", "Curso de História do Judô", "Curso de História do Judô no Brasil", "Curso de Terminologia do Judô", "Curso de Atendimento Pré-hospitalar"], cob: ["Combate à Manipulação de Resultados", "Igualdade de Gênero", "Comissão de Atletas", "Conduta Ética na Prática", "Ginecologia do Esporte"] },
      practical_exams: [
          { title: "Kodomo-no-Kata", desc: "Envio de vídeo", type: "grade" },
          { title: "Seiryoku-Zen’yo-Kokumin-Taiiku-no-Kata", desc: "Envio de vídeo", type: "grade" },
          { title: "Arbitragem", desc: "Presencial", type: "grade" },
          { title: "Katame-no-Kata", desc: "Presencial", type: "grade" },
          { title: "Waza", desc: "Presencial", type: "grade" }
      ]
  },
  sandan: { 
      presential: [{title: "Kōdōkan Goshin-jutsu", desc: "Execução Completa", type: "check"}, {title: "Waza", desc: "Aula Magna", type: "check"}], 
      internships: [], 
      theory: [{title: "Artigo", type: "grade"}], 
      courses: {profep: ["Curso de Kōdōkan Goshin-jutsu"], cob: ["Fundamentos da Administração"]}, 
      practical_exams: [{title: "Goshin-jutsu (Nota)", type: "grade"}] 
  },
  yondan: { 
      presential: [{title: "Kime-no-Kata", desc: "Execução Completa", type: "check"}, {title: "Waza", desc: "Aula Magna", type: "check"}], 
      internships: [], 
      theory: [{title: "Artigo", type: "grade"}], 
      courses: {profep: ["Curso de Kime-no-Kata"], cob: ["Fundamentos do Treinamento"]}, 
      practical_exams: [{title: "Kime-no-Kata (Nota)", type: "grade"}] 
  },
  godan: { 
      presential: [{title: "Ju-no-Kata", desc: "Execução Completa", type: "check"}, {title: "Waza", desc: "Aula Magna", type: "check"}], 
      internships: [], 
      theory: [{title: "Artigo", type: "grade"}], 
      courses: {profep: ["Curso de Ju-no-Kata"], cob: ["Treinamento Avançado"]}, 
      practical_exams: [{title: "Ju-no-Kata (Nota)", type: "grade"}] 
  },
  rokudan: { 
      presential: [{title: "Waza", desc: "Aula Magna", type: "check"}], 
      internships: [], 
      theory: [{title: "Artigo", type: "grade"}], 
      courses: {profep: ["Itsutsu-no-Kata", "Koshiki-no-Kata"], cob: []}, 
      practical_exams: [] 
  }
};

const generateId = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');
};

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

export default function PortalCandidatoFederacao() {
  const { slug } = useParams();
  const router = useRouter(); 
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/federation/${slug}/login`);
  };

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [federation, setFederation] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]); 
  const [schedule, setSchedule] = useState<any[]>([]); 
  const [userProgress, setUserProgress] = useState<any>({});
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'card' | 'boleto'>('pix');
  const [installments, setInstallments] = useState(1);

  // --- ESTADOS DE FATURAMENTO ---
  const [billingCpf, setBillingCpf] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  
  // --- ESTADOS DO CHECKOUT ---
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [showBoletosModal, setShowBoletosModal] = useState(false);
  const [boletosData, setBoletosData] = useState<any[]>([]);
  const [isDownloadingBoletos, setIsDownloadingBoletos] = useState(false);
  
  // --- ESTADO DO MODAL DE TERMOS ---
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [studentSignatureName, setStudentSignatureName] = useState("");
  const [address, setAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: ''
  });
  const [manualAddress, setManualAddress] = useState(false);
  const [cepManualHint, setCepManualHint] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    cardExpiryMonth: '',
    cardExpiryYear: '',
    cardCVV: ''
  });

  // --- ESTADOS DO MODAL DE CADASTRO ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    nascimento: '',
    graduacao_atual: '',
    ultima_promocao: '',
    graduacao_pretendida: 'Shodan (1º Dan)',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Categorias de Documentos
  const docCategories = [
    { id: 'identidade', label: 'Documento de Identidade (RG/CNH)', required: true },
    { id: 'diploma_anterior', label: 'Diploma da Graduação Anterior', required: true },
    { id: 'historico_competitivo', label: 'Histórico Competitivo (Relatório do Smoothcomp)', required: false },
    { id: 'curso_primeiros_socorros', label: 'Currículo (cursos, formações, títulos...)', required: true },
    { id: 'certificados_cob', label: 'Certificados dos Cursos do COB', required: false, allowMultiple: true },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: fed } = await supabase.from('entities').select('*').eq('slug', slug).single();
        
        if (fed) {
          setFederation(fed);
          document.documentElement.style.setProperty('--fed-primary', fed.settings.primary_color);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            router.replace(`/federation/${slug}/login`);
            return;
          }
          if (user) {
            const [profResult, membResult, docsResult, schedResult] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('entity_memberships').select('*').eq('profile_id', user.id).eq('entity_id', fed.id).single(),
                supabase.from('entity_documents').select('*').eq('profile_id', user.id).eq('entity_id', fed.id),
                supabase.from('federation_schedule').select('*').eq('entity_id', fed.id).order('date', { ascending: true })
            ]);

            setUserProfile(profResult.data);
            setMembership(membResult.data);
            
            if (profResult.data) {
                setBillingCpf(profResult.data.cpf || '');
                setBillingPhone(profResult.data.phone || '');
            }

            if (docsResult.data) setDocuments(docsResult.data);
            if (membResult.data && membResult.data.progresso) setUserProgress(membResult.data.progresso);
            if (schedResult.data) setSchedule(schedResult.data);
            
            setEditForm({
                full_name: profResult.data?.full_name || '',
                nascimento: profResult.data?.nascimento || '',
                graduacao_atual: profResult.data?.graduacao || '',
                ultima_promocao: profResult.data?.ultima_promocao || '',
                graduacao_pretendida: membResult.data?.graduacao_pretendida || 'Shodan (1º Dan)'
            });
          }
        }
      } catch (err) { 
        console.error("Erro fatal no carregamento:", err); 
      } finally { 
        setLoading(false); 
      }
    }
    loadData();
  }, [slug, supabase]);

  const federationDisplayName = federation?.settings?.display_name || (federation?.name && federation.name.toLowerCase() !== 'teste' ? federation.name : (slug ? String(slug).toUpperCase() : 'Federação'));
  const primaryColor = federation?.settings?.primary_color || '#DC2626';
  const isInscrito = membership?.status_pagamento === 'PAGO' || membership?.status_inscricao === 'INSCRITO' || membership?.status_inscricao === 'APROVADO';
  const isPendente = membership?.status_pagamento === 'PENDENTE' || membership?.status_pagamento === 'PROCESSANDO';
  const isCadastroCompleto = Boolean(userProfile?.full_name && userProfile?.nascimento && userProfile?.graduacao);
  const cadastroPendenciaMsg = 'Complete seu cadastro (nome, nascimento e graduação) para liberar a inscrição.';
  const getPixQrSrc = (qr?: string) => {
    if (!qr) return '';
    if (qr.startsWith('data:image')) return qr;
    if (/^https?:\/\//i.test(qr)) return qr;
    return `data:image/png;base64,${qr}`;
  };

  const platformStyles: Record<StudyPlatformColor, { card: string; iconWrap: string; iconColor: string; button: string; shadow: string; }> = {
    indigo: {
      card: 'hover:border-indigo-500',
      iconWrap: 'bg-indigo-900/30 group-hover:bg-indigo-600',
      iconColor: 'text-indigo-400 group-hover:text-white',
      button: 'text-indigo-400 border-indigo-900/50 hover:bg-indigo-600 hover:text-white',
      shadow: 'hover:shadow-indigo-900/10'
    },
    green: {
      card: 'hover:border-green-500',
      iconWrap: 'bg-green-900/30 group-hover:bg-green-600',
      iconColor: 'text-green-400 group-hover:text-white',
      button: 'text-green-400 border-green-900/50 hover:bg-green-600 hover:text-white',
      shadow: 'hover:shadow-green-900/10'
    },
    purple: {
      card: 'hover:border-purple-500',
      iconWrap: 'bg-purple-900/30 group-hover:bg-purple-600',
      iconColor: 'text-purple-400 group-hover:text-white',
      button: 'text-purple-400 border-purple-900/50 hover:bg-purple-600 hover:text-white',
      shadow: 'hover:shadow-purple-900/10'
    }
  };

  const normalizeFederationTag = (value?: string | null) => value?.trim().toUpperCase();

  const matchesFederationRule = (rules: string[] | undefined, slugValue?: string | null) => {
    if (!rules || rules.length === 0) return false;
    const normalized = rules.map((r) => normalizeFederationTag(r));
    if (normalized.includes('ALL')) return true;
    if (!slugValue) return false;
    return normalized.includes(normalizeFederationTag(slugValue));
  };

  const isStudyPlatformVisible = (platform: StudyPlatform) => {
    const slugValue = federation?.slug;

    if (platform.onlyFederations?.length) {
      return matchesFederationRule(platform.onlyFederations, slugValue);
    }

    if (platform.exceptFederations?.length) {
      return !matchesFederationRule(platform.exceptFederations, slugValue);
    }

    const allowedBySettings = federation?.settings?.study_platforms;
    if (Array.isArray(allowedBySettings) && allowedBySettings.length > 0) {
      return allowedBySettings.includes(platform.id);
    }

    const blockedBySettings = federation?.settings?.study_platforms_blocked;
    if (Array.isArray(blockedBySettings) && blockedBySettings.length > 0) {
      return !blockedBySettings.includes(platform.id);
    }

    return true;
  };

  const visibleStudyPlatforms = useMemo(
    () => STUDY_PLATFORMS.filter(isStudyPlatformVisible),
    [federation?.slug, federation?.settings?.study_platforms, federation?.settings?.study_platforms_blocked]
  );

  // --- LÓGICA FINANCEIRA DINÂMICA (LENDO DO BANCO) ---
  const pricing = federation?.settings?.pricing;
  const isLrsj = federation?.slug === 'lrsj';
  const basePrice = isLrsj ? 2200.00 : (pricing?.base_price || 2200.00);
  const promoPrice = isLrsj ? 1880.00 : (pricing?.promo_price || 1880.00);
  const promoDeadline = isLrsj
    ? new Date('2026-02-01T00:00:00-03:00')
    : (pricing?.promo_deadline ? new Date(pricing.promo_deadline) : new Date('2026-02-01'));
  
  const isPromoActive = new Date() < promoDeadline;
  const cashPrice = isPromoActive ? promoPrice : basePrice;
  const finalPrice = selectedMethod === 'pix' ? cashPrice : basePrice;
  
  // Opções de parcelamento incluindo 1x
  const installmentOptions = [1, 5, 10, 20];

  const getFilteredSchedule = () => {
     if (!schedule || schedule.length === 0) return [];
     const targetGrade = membership?.graduacao_pretendida?.toLowerCase().split(' ')[0] || 'shodan';
     const filtered = schedule.filter(item => {
         if (!item.graduation_level || item.graduation_level.length === 0) return true;
         const levels = item.graduation_level.map((l:string) => l.toLowerCase());
         return levels.includes(targetGrade);
     }).sort((a, b) => {
         const timeA = a.start_time || '00:00';
         const timeB = b.start_time || '00:00';
         return new Date(`${a.date}T${timeA}`).getTime() - new Date(`${b.date}T${timeB}`).getTime();
     });
     const grouped: any = {};
     filtered.forEach(item => {
         const time = item.start_time || '12:00';
         const d = new Date(`${item.date}T${time}`);
         const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
         if (!grouped[key]) grouped[key] = [];
         grouped[key].push(item);
     });
     return Object.keys(grouped).sort().map(key => ({
         key,
         dateObj: new Date(`${key}-02T12:00:00`),
         items: grouped[key]
     }));
  };
  const scheduleGroups = useMemo(() => getFilteredSchedule(), [schedule, membership]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploading(categoryId);
      const uploads = Array.from(files);
      const newDocs: any[] = [];
      for (const file of uploads) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userProfile.id}/${categoryId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const filePath = `${federation.slug}/${fileName}`;
        await supabase.storage.from('federation_docs').upload(filePath, file);
        const { data: publicUrlData } = supabase.storage.from('federation_docs').getPublicUrl(filePath);
        const { data: newDoc, error: dbError } = await supabase
          .from('entity_documents')
          .insert({ profile_id: userProfile.id, entity_id: federation.id, category: categoryId, file_url: publicUrlData.publicUrl, file_name: file.name, status: 'Pendente' })
          .select().single();
        if (dbError) throw dbError;
        newDocs.push(newDoc);
      }
      if (newDocs.length > 0) {
        setDocuments(prev => categoryId === 'certificados_cob'
          ? [...newDocs, ...prev]
          : [...newDocs, ...prev.filter(d => d.category !== categoryId)]
        );
      }
      event.target.value = '';
      alert("Documento enviado com sucesso!");
    } catch (error: any) { alert(error.message || "Erro ao enviar documento."); } finally { setUploading(null); }
  };

  const buscarCEP = async (cep: string) => {
    const valorLimpo = cep.replace(/\D/g, "");
    setAddress({ ...address, zipCode: valorLimpo });
    setCepManualHint(false);
    if (manualAddress) return;
    if (valorLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${valorLimpo}/json/`);
        const res = await response.json();
        if (!res.erro) {
          const isPartial = !res.logradouro || !res.bairro || !res.localidade || !res.uf;
          setCepManualHint(isPartial);
          setAddress(prev => ({ 
            ...prev, 
            street: res.logradouro || prev.street, 
            district: res.bairro || prev.district, 
            city: res.localidade || prev.city, 
            state: res.uf || prev.state 
          }));
        } else {
          setCepManualHint(true);
        }
      } catch (error) { console.error("Erro CEP"); setCepManualHint(true); }
    }
  };

  async function handlePayment() {
    // Verificar se os termos foram aceitos (apenas para federações)
    if (!termsAccepted) {
      alert("Sensei, você precisa ler e concordar com os termos antes de prosseguir.");
      return;
    }

    if (!userProfile) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Você precisa estar logado para gerar o PIX.");
        router.push(`/federation/${slug}/login`);
        return;
      }
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!freshProfile) {
        alert("Carregando seu perfil. Tente novamente em alguns segundos.");
        return;
      }
      setUserProfile(freshProfile);
    }

    if (!membership) {
      alert("Inscrição não encontrada. Atualize a página e tente novamente.");
      return;
    }

    if (!billingCpf || !billingPhone) {
        alert("Sensei, preencha seu CPF e Telefone de faturamento antes de prosseguir.");
        return;
    }

    if (selectedMethod === 'card' && (!cardData.cardNumber || !cardData.cardHolder || !cardData.cardCVV)) {
        alert("Preencha os dados do cartão.");
        return;
    }

    if (!address.zipCode || !address.street) {
        alert("Preencha seu endereço completo.");
        return;
    }

    setIsProcessing(true);
    try {
      // 1. Sincroniza dados no perfil antes
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ cpf: billingCpf, phone: billingPhone })
        .eq('id', userProfile.id);

      if (profileError) throw new Error("Erro ao salvar dados de faturamento.");

      // 2. Calcula valor com base em parcelas
      const valorFinal = (selectedMethod === 'pix' && isPromoActive) ? cashPrice : basePrice;
      const valorParcela = installments > 1 ? (valorFinal / installments).toFixed(2) : valorFinal.toFixed(2);

      // 3. Chamar API de checkout
      const paymentMethodId = selectedMethod === 'pix' ? '6' : selectedMethod === 'boleto' ? '1' : '2';
      
      const payload: any = {
        email: userProfile.email,
        name: userProfile.full_name,
        cpf: billingCpf,
        phone: billingPhone,
        paymentMethod: paymentMethodId,
        address: address,
        entitySlug: slug,
        membershipId: membership.id,
        amount: valorFinal
      };

      if (selectedMethod === 'card') {
        payload.card = cardData;
        payload.installments = installments;
      }

      if (selectedMethod === 'boleto') {
        payload.installments = installments;
        // Data de vencimento 3 dias à frente
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        payload.dueDate = dueDate.toISOString().split('T')[0];
      }

      const response = await fetch('/api/federation/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        // Atualizar status local para PENDENTE imediatamente
        if (membership?.id) {
          await supabase
            .from('entity_memberships')
            .update({ status_pagamento: 'PENDENTE' })
            .eq('id', membership.id);
        }

        if (result.pix) {
          setPixData(result.pix);
          setShowPixModal(true);
          const pixWindow = window.open('', '_blank', 'noopener,noreferrer');
          if (pixWindow) {
            const qrSrc = getPixQrSrc(result.pix?.qrCode);
            const qrImg = qrSrc ? `<img src="${qrSrc}" style="width:220px;height:220px;border-radius:12px;" />` : '';
            const key = result.pix?.key || '';
            pixWindow.document.write(`
              <html><head><title>PIX Gerado</title></head>
              <body style="font-family:Arial,sans-serif;background:#0b0b0b;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <div style="max-width:420px;text-align:center;background:#111827;border:1px solid #1f2937;padding:24px;border-radius:16px;">
                  <h2 style="margin:0 0 12px;">PIX Gerado</h2>
                  <p style="margin:0 0 16px;color:#9ca3af;">Escaneie o QR Code ou copie a chave abaixo</p>
                  <div style="background:#fff;padding:12px;border-radius:12px;display:inline-block;">${qrImg}</div>
                  <div style="margin-top:16px;">
                    <input value="${key}" readonly style="width:100%;padding:10px;border-radius:10px;border:1px solid #374151;background:#0b0b0b;color:#fff;font-family:monospace;" />
                  </div>
                </div>
              </body></html>
            `);
            pixWindow.document.close();
          }
          alert('PIX gerado! Após o pagamento, sua inscrição será liberada automaticamente.');
        } else if (Array.isArray(result.boletos) && result.boletos.length > 0) {
          setBoletosData(result.boletos);
          setShowBoletosModal(true);
          const boletoWindow = window.open('', '_blank', 'noopener,noreferrer');
          if (boletoWindow) {
            const rows = result.boletos.map((b: any, idx: number) => {
              const due = b.dueDate ? new Date(b.dueDate).toLocaleDateString('pt-BR') : '--';
              const amount = typeof b.amount === 'number' ? b.amount.toFixed(2) : '--';
              return `<tr><td style="padding:8px 12px;color:#e5e7eb;">${idx + 1} / ${result.boletos.length}</td><td style="padding:8px 12px;color:#9ca3af;">${due}</td><td style="padding:8px 12px;color:#e5e7eb;">R$ ${amount}</td><td style="padding:8px 12px;"><a href="${b.bankSlipUrl}" target="_blank" style="color:#60a5fa;">Abrir boleto</a></td></tr>`;
            }).join('');
            const html = `
              <html><head><title>Boletos Gerados</title></head>
              <body style="font-family:Arial,sans-serif;background:#0b0b0b;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <div style="max-width:720px;width:100%;background:#111827;border:1px solid #1f2937;padding:24px;border-radius:16px;">
                  <h2 style="margin:0 0 12px;">Boletos Gerados (${result.boletos.length}x)</h2>
                  <p style="margin:0 0 16px;color:#9ca3af;">Abra cada boleto abaixo para efetuar o pagamento.</p>
                  <table style="width:100%;border-collapse:collapse;">
                    <thead><tr><th style="text-align:left;padding:8px 12px;color:#6b7280;">Parcela</th><th style="text-align:left;padding:8px 12px;color:#6b7280;">Vencimento</th><th style="text-align:left;padding:8px 12px;color:#6b7280;">Valor</th><th style="text-align:left;padding:8px 12px;color:#6b7280;">Boleto</th></tr></thead>
                    <tbody>${rows}</tbody>
                  </table>
                </div>
              </body></html>
            `;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            boletoWindow.location.href = url;
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          } else {
            alert('Popup bloqueado. Permita popups para abrir os boletos.');
          }
          alert('Boletos gerados! Após o pagamento, sua inscrição será liberada automaticamente.');
        } else if (result.url) {
          const boletoWindow = window.open(result.url, '_blank', 'noopener,noreferrer');
          if (!boletoWindow) {
            alert('Popup bloqueado. Permita popups para abrir o boleto em nova janela.');
          }
          alert('Boleto gerado! Após o pagamento, sua inscrição será liberada automaticamente.');
        } else if (result.card) {
          alert('Pagamento aprovado! Sua inscrição está sendo processada.');
        } else {
          alert('Pagamento processado com sucesso!');
        }
      } else {
        alert(`Erro: ${result.error || 'Tente novamente'}`);
      }
    } catch (error: any) { 
        console.error(error); 
        alert("Erro ao processar pagamento: " + error.message); 
    } finally { 
        setIsProcessing(false); 
    }
  }

  // Handler para aceitar termos com assinatura
  const handleAcceptTerms = (studentName: string) => {
    setTermsAccepted(true);
    setStudentSignatureName(studentName);
    setShowTermsModal(false);
  };

  const handleDownloadBoletosZip = async () => {
    if (!boletosData.length) return;
    try {
      setIsDownloadingBoletos(true);
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (let i = 0; i < boletosData.length; i += 1) {
        const boleto = boletosData[i];
        const res = await fetch(boleto.bankSlipUrl);
        if (!res.ok) throw new Error('Falha ao baixar boleto.');
        const blob = await res.blob();
        const fileName = `boleto_${String(i + 1).padStart(2, '0')}_de_${String(boletosData.length).padStart(2, '0')}.pdf`;
        zip.file(fileName, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boletos.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar arquivo de boletos.');
    } finally {
      setIsDownloadingBoletos(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!federation?.id) {
      alert("Federação não encontrada. Atualize a página e tente novamente.");
      return;
    }

    let profileToSave = userProfile;
    if (!profileToSave) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sessão expirada. Faça login novamente.");
        return;
      }
      const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profileToSave = freshProfile || null;
      if (!profileToSave) {
        alert("Não foi possível carregar seu perfil. Tente novamente.");
        return;
      }
      setUserProfile(profileToSave);
    }

    setSavingProfile(true);
    try {
        const { error: profileError } = await supabase.from('profiles').update({
                full_name: editForm.full_name,
                nascimento: editForm.nascimento || null, 
                graduacao: editForm.graduacao_atual,
                ultima_promocao: editForm.ultima_promocao || null
        }).eq('id', profileToSave.id);

        if (profileError) throw new Error(`Erro ao salvar Perfil: ${profileError.message}`);

        if (membership) {
            await supabase.from('entity_memberships').update({ graduacao_pretendida: editForm.graduacao_pretendida }).eq('id', membership.id);
        } else {
            await supabase.from('entity_memberships').insert({
              profile_id: profileToSave.id,
              entity_id: federation.id,
                    graduacao_pretendida: editForm.graduacao_pretendida,
              status_inscricao: 'PENDENTE',
                    role: 'member'
                });
        }
        alert("✅ Cadastro atualizado!");
        setIsEditModalOpen(false);
        window.location.reload(); 
    } catch (err: any) {
        alert("❌ " + err.message);
    } finally {
        setSavingProfile(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '--';
  const getStatusDisplay = () => { const s = membership?.status_inscricao; if (!s) return 'INSCRIÇÕES ABERTAS'; return s.toUpperCase(); };
  const getCurrentRequirements = () => REQUIREMENTS_DATA[membership?.graduacao_pretendida?.toLowerCase().split(' ')[0] || 'shodan'];
  const currentStatus = getStatusDisplay();

  if (loading) return <div className="h-screen bg-black flex flex-col items-center justify-center text-white"><Loader2 className="animate-spin text-red-600 mb-4" size={32} /><span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando Identidade...</span></div>;

  return (
    <>
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`w-72 border-r border-white/5 bg-black flex flex-col shrink-0 transition-all duration-300 ${isSidebarOpen ? '' : '-ml-72'}`}>
        <div className="p-8 border-b border-white/5">
           {federation?.settings?.logo_url ? <img src={federation.settings.logo_url} alt={federationDisplayName} className="h-12 w-auto mb-4" /> : <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center font-black text-xl bg-white/5" style={{ color: primaryColor }}>{federationDisplayName?.charAt(0)}</div>}
           <div className="font-black uppercase text-[12px] tracking-tighter leading-none text-white">{federationDisplayName}</div>
           <div className="text-[9px] font-bold uppercase text-slate-500 mt-1 tracking-widest">Portal do Candidato</div>
        </div>
        
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarButton active={activeTab === 'visao-geral'} onClick={() => setActiveTab('visao-geral')} icon={<LayoutDashboard size={18}/>} label="Visão Geral" primaryColor={primaryColor} />
          <SidebarButton active={activeTab === 'cronograma'} onClick={() => setActiveTab('cronograma')} icon={<CalendarIcon size={18}/>} label="Cronograma Oficial" primaryColor={primaryColor} />
          
          <SidebarButton 
            active={activeTab === 'area-estudo'} 
            onClick={() => setActiveTab('area-estudo')} 
            icon={<GraduationCap size={18}/>} 
            label="Área de Estudo" 
            primaryColor={primaryColor} 
            locked={false}
          />

          <SidebarButton active={activeTab === 'meus-requisitos'} onClick={() => setActiveTab('meus-requisitos')} icon={<ListChecks size={18}/>} label="Meus Requisitos" primaryColor={primaryColor} />
          <SidebarButton active={activeTab === 'calculadora'} onClick={() => setActiveTab('calculadora')} icon={<Calculator size={18}/>} label="Calculadora de Pontos" primaryColor={primaryColor} />
          <SidebarButton active={activeTab === 'documentos'} onClick={() => setActiveTab('documentos')} icon={<FileText size={18}/>} label="Documentos" primaryColor={primaryColor} />
          <SidebarButton active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<Receipt size={18}/>} label="Inscrição" primaryColor={primaryColor} locked={!isCadastroCompleto} lockReason={cadastroPendenciaMsg} />
          <SidebarButton active={activeTab === 'regulamento'} onClick={() => setActiveTab('regulamento')} icon={<BookOpen size={18}/>} label="Regulamento Oficial" primaryColor={primaryColor} />
        </nav>

        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400"><User size={16} /></div>
              <div className="flex-1 overflow-hidden"><div className="text-[10px] font-black uppercase text-white truncate">{userProfile?.full_name?.split(' ')[0]}</div><div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{userProfile?.graduacao || 'Sensei'}</div></div>
           </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative bg-black flex flex-col">
        
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-12 shrink-0 bg-black/50 backdrop-blur-md sticky top-0 z-20">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-white mr-2 transition-colors">{isSidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
             <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
             <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ambiente de Graduação <span className="text-white mx-2">/</span> <span style={{ color: primaryColor }}>{federationDisplayName}</span></h2>
           </div>
           
           <button 
             onClick={handleLogout} 
             className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors"
           >
             Sair do Portal <LogOut size={14} />
           </button>
        </header>

        <div className="p-12">
            
            {activeTab === 'visao-geral' && (
              <div className="max-w-6xl animate-in fade-in duration-700">
                  <div className="mb-12"><h1 className="text-4xl font-bold text-red-600 mb-2">Bem-vindo, {userProfile?.full_name?.split(' ')[0] || 'Sensei'}.</h1><p className="text-slate-400 text-sm max-w-2xl">Bem-vindo ao Programa de Formação e Especialização de Faixas Pretas da {federationDisplayName || 'LRSJ'}. Esse é seu Painel de Candidato.</p></div>
                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-8 mb-8 shadow-sm">
                     <div className="flex items-center gap-2 mb-8"><IdCard className="text-indigo-500" size={18} /><h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Dados do Candidato</h3></div>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-slate-800 pb-8"><InfoField label="Nome Completo" value={userProfile?.full_name} /><InfoField label="Nascimento" value={formatDate(userProfile?.nascimento)} /><InfoField label="Graduação Atual" value={userProfile?.graduacao} /><InfoField label="Última Promoção" value={formatDate(userProfile?.ultima_promocao)} /></div>
                     <div className="flex justify-between items-end">
                        <InfoField label="Início no Programa" value={formatDate(membership?.created_at)} />
                        <button onClick={() => setIsEditModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-indigo-900/50 hover:scale-105"><PenSquare size={16} /> Preencher Cadastro</button>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-[#111827] border border-indigo-900/30 p-6 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden group hover:border-indigo-500/50 transition-colors"><div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Objetivo</span><div className="text-3xl font-bold text-white">{membership?.graduacao_pretendida || 'Shodan'}</div></div>
                     <div className="bg-[#111827] border border-blue-900/30 p-6 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden group hover:border-blue-500/50 transition-colors"><div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div><span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Coordenação</span><div>{['Luiz Pavani', 'Bruno Chalar'].map((name: string, i: number) => (<div key={i} className={`text-sm font-bold ${i === 0 ? 'text-slate-200' : 'text-slate-400'}`}>{name}</div>))}</div></div>
                     <div className="bg-[#111827] border border-green-900/30 p-6 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden group hover:border-green-500/50 transition-colors"><div className="absolute top-0 left-0 w-1 h-full bg-green-600"></div>{isInscrito ? (<div className="flex flex-col justify-center items-center h-full"><CheckCircle className="text-green-500 mb-1" size={32}/><span className="text-[10px] font-black text-green-500 uppercase">Confirmado</span></div>) : isPendente ? (<div className="flex flex-col justify-center items-center h-full"><Loader2 className="text-yellow-500 mb-1 animate-spin" size={32}/><span className="text-[10px] font-black text-yellow-500 uppercase">Em Análise</span></div>) : (<div className="h-full flex flex-col justify-center gap-2"><button onClick={() => setActiveTab('financeiro')} disabled={!isCadastroCompleto} className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/50 rounded-lg py-3 flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed" title={cadastroPendenciaMsg}><PlayCircle size={20} className="group-hover:scale-110 transition-transform"/><span className="text-xs font-black uppercase">Realizar Inscrição</span></button>{!isCadastroCompleto && <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest">Complete o cadastro para liberar.</p>}</div>)}</div>
                  </div>
              </div>
            )}

            {/* MODAL DE EDIÇÃO DE CADASTRO */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                        <h2 className="text-xl font-black uppercase italic text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4"><PenSquare className="text-indigo-500" /> Preencher Cadastro</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none shadow-inner" placeholder="Ex: Luiz Pavani" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Nascimento</label><input type="date" value={editForm.nascimento} onChange={(e) => setEditForm({...editForm, nascimento: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none" /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graduação Atual</label><select value={editForm.graduacao_atual} onChange={(e) => setEditForm({...editForm, graduacao_atual: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none"><option value="">Selecione...</option><option value="Ikkyu (Marrom)">Ikkyu (Marrom)</option><option value="Shodan (1º Dan)">Shodan (1º Dan)</option><option value="Nidan (2º Dan)">Nidan (2º Dan)</option><option value="Sandan (3º Dan)">Sandan (3º Dan)</option><option value="Yondan (4º Dan)">Yondan (4º Dan)</option><option value="Godan (5º Dan)">Godan (5º Dan)</option></select></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data da Última Promoção</label><input type="date" value={editForm.ultima_promocao} onChange={(e) => setEditForm({...editForm, ultima_promocao: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none" /></div>
                            <div className="md:col-span-2 space-y-2 border-t border-white/5 pt-4"><label className="text-[10px] font-black uppercase text-indigo-400">Objetivo (Graduação Pretendida)</label><select value={editForm.graduacao_pretendida} onChange={(e) => setEditForm({...editForm, graduacao_pretendida: e.target.value})} className="w-full bg-indigo-900/20 border border-indigo-500/50 rounded-xl p-4 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none"><option value="Shodan (1º Dan)">Shodan (1º Dan)</option><option value="Nidan (2º Dan)">Nidan (2º Dan)</option><option value="Sandan (3º Dan)">Sandan (3º Dan)</option><option value="Yondan (4º Dan)">Yondan (4º Dan)</option><option value="Godan (5º Dan)">Godan (5º Dan)</option><option value="Rokudan (6º Dan)">Rokudan (6º Dan)</option></select></div>
                        </div>
                        <button onClick={handleSaveProfile} disabled={savingProfile} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg">{savingProfile ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Cadastro</button>
                    </div>
                </div>
            )}

            {/* CRONOGRAMA OFICIAL */}
            {activeTab === 'cronograma' && (
              <div className="max-w-4xl mx-auto animate-in fade-in duration-700">
                  <header className="mb-10 text-center"><h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Cronograma Oficial</h2><p className="text-slate-400 mt-2 text-sm">Datas importantes para o ciclo {new Date().getFullYear()}.</p></header>
                  <div className="space-y-12 relative">
                      {scheduleGroups.map((group: any) => (
                          <div key={group.key} className="relative">
                              <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#050505] z-10 py-2"><span className="text-xs font-black uppercase text-indigo-400 tracking-widest bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-500/30">{group.dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span><div className="h-px bg-white/10 flex-1"></div></div>
                              <div className="space-y-4">{group.items.map((item: any) => (<TimelineEventCard key={item.id} event={item} />))}</div>
                          </div>
                      ))}
                      {schedule.length === 0 && (<div className="p-10 text-center text-slate-500 italic text-xs uppercase font-bold">Nenhum evento cadastrado no momento.</div>)}
                  </div>
              </div>
            )}

            {/* ÁREA DE ESTUDO (CONTEÚDO INTEGRAL) */}
            {activeTab === 'area-estudo' && (
              <div className="max-w-6xl animate-in fade-in duration-700">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Área de Estudo</h2>
                  <p className="text-slate-400 text-sm">Links rápidos para plataformas de ensino.</p>
                  {!isInscrito && (
                    <div className="mt-4 bg-yellow-900/10 border border-yellow-900/30 rounded-2xl p-4 text-[11px] text-yellow-200/80">
                      Acesso liberado mesmo sem inscrição. No Profep MAX, apenas cursos <span className="text-yellow-200 font-bold">FREE</span> ficam disponíveis até a confirmação.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {visibleStudyPlatforms.length === 0 ? (
                    <div className="col-span-full bg-[#0f172a] border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">
                      Nenhuma plataforma disponível para esta federação.
                    </div>
                  ) : (
                    visibleStudyPlatforms.map((platform) => {
                      const Icon = platform.icon;
                      const styles = platformStyles[platform.color];
                      const isProfepMax = platform.id === 'profep-max';
                      const isFreeOnly = !isInscrito && isProfepMax;
                      const resolvedHref = isFreeOnly ? '/cursos?free=1' : platform.href;
                      const resolvedLabel = isFreeOnly ? 'VER FREE' : platform.actionLabel;

                      return (
                        <div key={platform.id} className={`bg-[#111827] border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center transition-all group shadow-lg ${styles.card} ${styles.shadow}`}>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${styles.iconWrap} ${styles.iconColor}`}>
                            <Icon size={28} />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{platform.title}</h3>
                          <p className="text-slate-400 text-xs mb-8">{platform.description}</p>
                          {resolvedHref ? (
                            <a
                              href={resolvedHref}
                              target={platform.external ? '_blank' : undefined}
                              rel={platform.external ? 'noreferrer' : undefined}
                              className={`text-[10px] font-black uppercase tracking-widest border px-6 py-2 rounded-lg transition-all flex items-center gap-2 ${styles.button}`}
                            >
                              {resolvedLabel} {platform.external && <ExternalLink size={10}/>}
                            </a>
                          ) : (
                            <button className={`text-[10px] font-black uppercase tracking-widest border px-6 py-2 rounded-lg transition-all ${styles.button}`}>
                              {resolvedLabel}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* MEUS REQUISITOS (INTEGRAL) */}
            {activeTab === 'meus-requisitos' && (
              <div className="max-w-6xl animate-in fade-in duration-700 space-y-8">
                 <div className="mb-8"><h2 className="text-3xl font-bold text-white mb-2">Requisitos: {membership?.graduacao_pretendida || 'Shodan'}</h2><p className="text-slate-400 text-sm">Lista oficial de tarefas para a sua promoção.</p></div>
                 <RequirementSection title="Cursos Presenciais" color="indigo" icon={<UserCheck size={18}/>} items={getCurrentRequirements().presential} progress={userProgress} />
                 {getCurrentRequirements().internships?.length > 0 && <RequirementSection title="Estágios" color="green" icon={<ClipboardList size={18}/>} items={getCurrentRequirements().internships} progress={userProgress} />}
                 {getCurrentRequirements().theory?.length > 0 && <RequirementSection title="Avaliações Teóricas" color="slate" icon={<BookOpen size={18}/>} items={getCurrentRequirements().theory} progress={userProgress} />}
                 <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-yellow-900/20 border-b border-yellow-900/50 px-6 py-4 flex items-center gap-3"><Award className="text-yellow-500" size={18} /><h3 className="font-bold text-yellow-500 uppercase text-xs tracking-wider">Cursos Teóricos</h3></div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                       {(() => {
                         const allCourses = [...(getCurrentRequirements().courses?.profep || []), ...(getCurrentRequirements().courses?.cob || [])];
                         return allCourses.map((c: string, i: number) => {
                           const id = generateId(c);
                           const isDone = userProgress?.[id] === true;
                           return (
                             <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${isDone ? 'bg-yellow-500/10 border-yellow-500/30' : 'border-transparent hover:bg-white/5'}`}>
                               <div className={`w-4 h-4 rounded border flex items-center justify-center ${isDone ? 'border-yellow-500 bg-yellow-500' : 'border-slate-600'}`}>
                                 {isDone && <Check size={10} className="text-black font-bold"/>}
                               </div>
                               <span className={`text-sm ${isDone ? 'text-yellow-400 font-bold' : 'text-slate-400'}`}>{c}</span>
                             </div>
                           );
                         });
                       })()}
                    </div>
                 </div>
                 {getCurrentRequirements().practical_exams?.length > 0 && <RequirementSection title="Exames Práticos" color="red" icon={<CheckCircle size={18}/>} items={getCurrentRequirements().practical_exams} progress={userProgress} />}
              </div>
            )}

            {activeTab === 'calculadora' && <div className="animate-in slide-in-from-bottom-6 duration-700"><CalculadoraPontos userId={userProfile?.id} entityId={federation?.id} currentTarget={membership?.graduacao_pretendida || 'shodan'} /></div>}

            {/* DOSSIÊ DOCUMENTAL (INTEGRAL) */}
            {activeTab === 'documentos' && (
              <div className="animate-in slide-in-from-bottom-6 duration-700 space-y-8">
                <div className="flex items-center gap-3 mb-6 pt-8 border-t border-white/5"><FileText className="text-blue-500" size={20}/><h3 className="text-lg font-black uppercase italic tracking-wider text-white">Dossiê Documental</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {docCategories.map((cat) => {
                    const categoryDocs = documents
                      .filter(d => d.category === cat.id)
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const currentDoc = categoryDocs[0];
                    const hasDocs = categoryDocs.length > 0;
                    const status = cat.allowMultiple
                      ? (categoryDocs.some((d: any) => d.status === 'Rejeitado')
                          ? 'Rejeitado'
                          : categoryDocs.some((d: any) => d.status === 'Pendente')
                            ? 'Pendente'
                            : hasDocs ? 'Aprovado' : 'Pendente de Envio')
                      : (currentDoc?.status || 'Pendente de Envio');
                    const hasFeedback = !cat.allowMultiple && currentDoc?.status === 'Rejeitado' && currentDoc?.feedback;
                    const uploadDisabled = !cat.allowMultiple && status === 'Aprovado';
                    return (
                      <div key={cat.id} className={`relative p-6 rounded-[32px] border transition-all group ${status === 'Rejeitado' ? 'bg-red-900/5 border-red-500/30' : status === 'Aprovado' ? 'bg-emerald-900/5 border-emerald-500/30' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}>
                        <div className="flex justify-between items-start mb-4"><div className={`p-3 rounded-2xl ${status === 'Aprovado' ? 'bg-emerald-500/20 text-emerald-500' : status === 'Rejeitado' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-400'}`}>{status === 'Aprovado' ? <CheckCircle size={20}/> : status === 'Rejeitado' ? <XCircle size={20}/> : <UploadCloud size={20}/>}</div>{cat.required && <span className="text-[8px] font-black uppercase bg-white/10 px-2 py-1 rounded text-slate-300">Obrigatório</span>}</div>
                        <h4 className="text-xs font-black uppercase text-white tracking-wide mb-1 leading-tight min-h-[32px]">{cat.label}</h4>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-6 ${status === 'Aprovado' ? 'text-emerald-500' : status === 'Rejeitado' ? 'text-red-500' : 'text-slate-500'}`}>
                          {cat.allowMultiple
                            ? (hasDocs ? `${categoryDocs.length} arquivo(s) enviado(s)` : 'Aguardando Envio')
                            : (currentDoc ? (status === 'Pendente' ? 'Em Análise' : status) : 'Aguardando Envio')}
                        </p>
                        {hasFeedback && (<div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><div className="flex items-center gap-2 text-red-400 text-[9px] font-black uppercase mb-1"><AlertTriangle size={10}/> Atenção Sensei:</div><p className="text-[10px] text-red-300 leading-tight italic">"{currentDoc.feedback}"</p></div>)}
                        {cat.allowMultiple && hasDocs && (
                          <div className="mb-4 space-y-2">
                            {categoryDocs.map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between text-[10px] text-slate-400 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                <span className="truncate pr-2">{doc.file_name}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase ${doc.status === 'Aprovado' ? 'text-emerald-400' : doc.status === 'Rejeitado' ? 'text-red-400' : 'text-yellow-400'}`}>{doc.status}</span>
                                  <a href={doc.file_url} target="_blank" className="text-slate-400 hover:text-white"><ExternalLink size={12}/></a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {uploading === cat.id ? (<div className="w-full py-3 bg-white/5 rounded-xl flex items-center justify-center gap-2 text-slate-400 text-[10px] uppercase font-bold animate-pulse"><Loader2 size={14} className="animate-spin"/> Enviando...</div>) : (
                          <div className="flex gap-2">
                            <label className={`flex-1 cursor-pointer py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${uploadDisabled ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-white text-black hover:scale-105'}`}>
                              {cat.allowMultiple ? 'Enviar arquivos' : (currentDoc ? 'Reenviar' : 'Enviar')}
                              <input
                                type="file"
                                className="hidden"
                                multiple={!!cat.allowMultiple}
                                disabled={uploadDisabled}
                                onChange={(e) => handleFileUpload(e, cat.id)}
                                accept=".pdf,.jpg,.jpeg,.png"
                              />
                            </label>
                            {!cat.allowMultiple && currentDoc && (
                              <a href={currentDoc.file_url} target="_blank" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><Eye size={16}/></a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REGULAMENTO OFICIAL (INTEGRAL) */}
            {activeTab === 'regulamento' && (
              <div className="max-w-5xl animate-in fade-in duration-700">
                  <header className="mb-10 text-center"><h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Código de Promoção da LRSJ</h2><p className="text-slate-400 mt-2 text-sm">Normas oficiais para o ciclo 2026.</p></header>
                  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 md:p-12 space-y-12">
                      <div className="text-center space-y-4 border-b border-slate-800 pb-10"><blockquote className="text-lg italic font-serif text-slate-300">"O respeito por aquilo que fazemos constitui a primeira condição e garantia do valor dos nossos atos."</blockquote><p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">As diferentes graduações no judô traduzem o acumular de conhecimentos que o praticante vai progressivamente adquirindo ao longo da sua carreira desportiva.</p></div>
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <h3 className="text-indigo-500 font-black uppercase text-xl tracking-widest flex items-center gap-3"><UserCheck size={24}/> Resumo prático para o candidato</h3>
                          <ul className="space-y-2 pl-5 text-xs text-slate-300 list-disc">
                            <li>Inscrição no site dentro do prazo do ciclo de promoção.</li>
                            <li>Primeira análise pela LRSJ (admissibilidade formal) e segunda análise pela CEG (currículo e requisitos).</li>
                            <li>Exames e atividades contam somente após a inscrição no processo.</li>
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-white font-bold text-sm uppercase tracking-widest">Inscrição e admissibilidade</h4>
                          <ul className="space-y-2 pl-5 text-xs text-slate-400 list-disc">
                            <li>Filiação ativa, graduação atual válida, carência e idade mínima (shodan: 16 anos).</li>
                            <li>Se a CEG indeferir, você será comunicado com os motivos.</li>
                            <li>Prazo máximo de 2 anos para concluir o processo após a inscrição.</li>
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-white font-bold text-sm uppercase tracking-widest">Exames e requisitos</h4>
                          <ul className="space-y-2 pl-5 text-xs text-slate-400 list-disc">
                            <li>Conclusão dos cursos oficiais definidos pela CEG para cada graduação.</li>
                            <li>Aprovação nos exames teóricos e práticos exigidos.</li>
                            <li>Sem sanção disciplinar no ano do exame.</li>
                            <li>Obrigações financeiras em dia conforme regimento de custas.</li>
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-white font-bold text-sm uppercase tracking-widest">Carência e pontuação</h4>
                          <ul className="space-y-2 pl-5 text-xs text-slate-400 list-disc">
                            <li>A carência varia conforme sua pontuação em resultados, contribuição e técnica.</li>
                            <li>Promoção por mérito (até sandan) exige pontuação específica por resultados ou serviços.</li>
                            <li>Promoção por antiguidade exige idade mínima de 40 anos e participação nas atividades.</li>
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-white font-bold text-sm uppercase tracking-widest">Deveres e direitos</h4>
                          <ul className="space-y-2 pl-5 text-xs text-slate-400 list-disc">
                            <li>Atuar em eventos oficiais (atleta, árbitro ou oficial), quando convocado.</li>
                            <li>Manter disciplina, acompanhar comunicados oficiais e cumprir horários e boletins.</li>
                            <li>Direito a tratamento respeitoso, igualdade de condições e material didático.</li>
                          </ul>
                        </div>
                      </div>
                  </div>
                  <div className="flex justify-center mt-12"><a href="https://drive.google.com/file/d/1hz03ygajtsj2Fe0RMmSrjNNY56kxuBKn/view?usp=sharing" target="_blank" className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-white/10 transition-all group hover:scale-105"><FileText size={16} /> Acessar Código na Íntegra (PDF) <ExternalLink size={12} className="opacity-50"/></a></div>
              </div>
            )}

            {/* ABA FINANCEIRA (EDIÇÃO FOCO AQUI) */}
            {activeTab === 'financeiro' && (
              <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in">
                 <div className="lg:col-span-2 space-y-6">
                    
                    {!isInscrito && (
                        <>
                        <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] shadow-2xl mb-6 shadow-inner animate-in slide-in-from-bottom-4">
                            <h3 className="text-[10px] font-black uppercase text-red-600 mb-6 tracking-[0.2em] flex items-center gap-2">
                                <Fingerprint size={14}/> Dados de Cobrança (Obrigatório)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">CPF do Candidato</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                        <input 
                                            value={billingCpf} 
                                            onChange={(e) => setBillingCpf(e.target.value)} 
                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-bold text-sm focus:border-red-600 focus:outline-none transition-all shadow-inner"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">WhatsApp / Telefone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                                        <input 
                                            value={billingPhone} 
                                            onChange={(e) => setBillingPhone(e.target.value)} 
                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-bold text-sm focus:border-red-600 focus:outline-none transition-all shadow-inner"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] shadow-2xl">
                            <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-6 tracking-[0.2em] flex items-center gap-2">
                                <MapPin size={14}/> Endereço de Cobrança
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">CEP</label>
                                    <input 
                                        value={address.zipCode} 
                                        onChange={(e) => buscarCEP(e.target.value)} 
                                        maxLength={8}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-indigo-600 focus:outline-none transition-all"
                                        placeholder="00000000"
                                    />
                                  {!manualAddress && cepManualHint && (
                                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold mt-2">
                                    <span>CEP sem logradouro? Preencha manualmente.</span>
                                    <button type="button" className="text-[12px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-200/60 hover:bg-indigo-500 hover:ring-indigo-300/80 transition-all" onClick={() => setManualAddress(true)}>Digitar manualmente</button>
                                    </div>
                                  )}
                                  {manualAddress && (
                                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold mt-2">
                                    <span>Preenchimento manual ativo.</span>
                                    <button type="button" className="text-indigo-400 hover:text-indigo-300" onClick={() => setManualAddress(false)}>Usar busca automática</button>
                                    </div>
                                  )}
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rua</label>
                                    <input 
                                        value={address.street} 
                                    readOnly={!manualAddress}
                                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                                    className={manualAddress ? "w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-indigo-600 focus:outline-none transition-all" : "w-full bg-zinc-950 border border-zinc-900 rounded-xl py-4 px-4 text-slate-600 font-bold text-sm"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Número</label>
                                    <input 
                                        value={address.number} 
                                        onChange={(e) => setAddress({...address, number: e.target.value})}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-indigo-600 focus:outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bairro</label>
                                    <input 
                                        value={address.district} 
                                    readOnly={!manualAddress}
                                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                                    className={manualAddress ? "w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-indigo-600 focus:outline-none transition-all" : "w-full bg-zinc-950 border border-zinc-900 rounded-xl py-4 px-4 text-slate-600 font-bold text-sm"}
                                    />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cidade</label>
                                  <input 
                                    value={address.city} 
                                    readOnly={!manualAddress}
                                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                    className={manualAddress ? "w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-indigo-600 focus:outline-none transition-all" : "w-full bg-zinc-950 border border-zinc-900 rounded-xl py-4 px-4 text-slate-600 font-bold text-sm"}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">UF</label>
                                  <input 
                                    value={address.state} 
                                    maxLength={2}
                                    readOnly={!manualAddress}
                                    onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                                    className={manualAddress ? "w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-indigo-600 focus:outline-none transition-all uppercase" : "w-full bg-zinc-950 border border-zinc-900 rounded-xl py-4 px-4 text-slate-600 font-bold text-sm uppercase"}
                                  />
                                </div>
                            </div>
                        </div>
                        </>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <PayOption active={selectedMethod==='pix'} onClick={()=>setSelectedMethod('pix')} icon={<QrCode size={20}/>} label="Pix" desc="Desconto Antecipado"/>
                        <PayOption active={selectedMethod==='card'} onClick={()=>setSelectedMethod('card')} icon={<CreditCard size={20}/>} label="Cartão" desc="Parcelamento Flexível"/>
                        <PayOption active={selectedMethod==='boleto'} onClick={()=>setSelectedMethod('boleto')} icon={<Barcode size={20}/>} label="Boleto" desc="Parcelamento Mensal"/>
                    </div>
                    
                        {(selectedMethod==='card' || selectedMethod==='boleto') && (
                      <div className="bg-white/5 p-6 rounded-[24px] border border-white/5 animate-in slide-in-from-top-2">
                         <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Parcelamento Disponível</h4>
                         <div className="grid grid-cols-4 gap-3">
                            {installmentOptions.map((p: number) => (
                               <button key={p} onClick={() => setInstallments(p)} className={`p-3 rounded-xl border text-left transition-all ${installments === p ? 'bg-white text-black shadow-lg' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                                  <div className="text-[9px] uppercase font-bold">{p}x de</div>
                                  <div className="text-xs font-black">R${(basePrice / p).toFixed(2)}</div>
                               </button>
                            ))}
                         </div>
                      </div>
                    )}

                    {selectedMethod === 'card' && !isInscrito && (
                        <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] shadow-2xl animate-in slide-in-from-top-2">
                            <h3 className="text-[10px] font-black uppercase text-blue-600 mb-6 tracking-[0.2em] flex items-center gap-2">
                                <CreditCard size={14}/> Dados do Cartão
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Número do Cartão</label>
                                    <input 
                                        value={cardData.cardNumber} 
                                        onChange={(e) => setCardData({...cardData, cardNumber: e.target.value})} 
                                        maxLength={16}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-blue-600 focus:outline-none transition-all"
                                        placeholder="0000000000000000"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome no Cartão</label>
                                    <input 
                                        value={cardData.cardHolder} 
                                        onChange={(e) => setCardData({...cardData, cardHolder: e.target.value})} 
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-blue-600 focus:outline-none transition-all"
                                        placeholder="NOME COMO NO CARTÃO"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mês</label>
                                    <input 
                                        value={cardData.cardExpiryMonth} 
                                        onChange={(e) => setCardData({...cardData, cardExpiryMonth: e.target.value})} 
                                        maxLength={2}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-blue-600 focus:outline-none transition-all"
                                        placeholder="MM"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ano</label>
                                    <input 
                                        value={cardData.cardExpiryYear} 
                                        onChange={(e) => setCardData({...cardData, cardExpiryYear: e.target.value})} 
                                        maxLength={4}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-blue-600 focus:outline-none transition-all"
                                        placeholder="AAAA"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">CVV</label>
                                    <input 
                                        value={cardData.cardCVV} 
                                        onChange={(e) => setCardData({...cardData, cardCVV: e.target.value})} 
                                        maxLength={4}
                                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-white font-bold text-sm focus:border-blue-600 focus:outline-none transition-all"
                                        placeholder="000"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedMethod === 'pix' && (
                        <div className="bg-emerald-900/10 border border-emerald-900/30 p-6 rounded-[24px]">
                            <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">Pagamento à Vista</h4>
                            <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl">
                                <span className="text-xs text-slate-400">Valor com Desconto</span>
                                <span className="text-xl font-black text-white">R$ {cashPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                 </div>

                 <div className="bg-[#111827] border border-slate-800 p-8 rounded-[32px] h-fit shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800 text-slate-400">
                            <Receipt size={20}/><h4 className="text-xs font-black uppercase tracking-widest">Resumo do Pedido</h4>
                        </div>
                        <div className="space-y-3 mb-8">
                           <div className="flex justify-between text-xs text-slate-400"><span>Valor Base</span><span className="text-white font-mono">R$ {basePrice.toFixed(2)}</span></div>
                           {selectedMethod === 'pix' && isPromoActive && (
                               <div className="flex justify-between text-xs text-emerald-500 font-bold items-center"><span className="flex items-center gap-1"><TicketPercent size={12}/> Desconto Pix</span><span className="font-mono">- R$ {(basePrice - cashPrice).toFixed(2)}</span></div>
                           )}
                           <div className="pt-4 border-t border-slate-800 flex justify-between items-end"><span className="text-xs font-bold text-slate-500 uppercase">Total</span><span className="text-3xl font-black italic text-white" style={{color:primaryColor}}>R$ {finalPrice.toFixed(2)}</span></div>
                        </div>
                    </div>
                    
                    {isInscrito ? (
                         <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                            <CheckCircle className="text-green-500 mx-auto mb-2" size={24}/>
                            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Inscrição Confirmada</p>
                         </div>
                    ) : isPendente ? (
                         <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                            <Loader2 className="text-yellow-500 mx-auto mb-2 animate-spin" size={24}/>
                            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Pagamento em Análise</p>
                         </div>
                    ) : (
                        <div className="space-y-3">
                          {!termsAccepted && (
                            <button 
                              onClick={() => setShowTermsModal(true)}
                              className="w-full py-4 rounded-xl font-black text-xs uppercase border-2 text-white hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all"
                              style={{ borderColor: primaryColor, color: primaryColor }}
                            >
                              <FileText size={16}/> 
                              Ler e Concordar com Termos
                            </button>
                          )}
                          
                          {termsAccepted && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                <CheckCircle size={14}/> Termos Assinados por {studentSignatureName}
                              </p>
                            </div>
                          )}

                          <button 
                            onClick={handlePayment} 
                            disabled={isProcessing || !userProfile || !membership || !termsAccepted} 
                            className="w-full py-4 rounded-xl font-black text-xs uppercase bg-[var(--fed-primary)] text-black hover:brightness-110 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                          >
                            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Wallet size={16}/>} 
                            {selectedMethod === 'pix' ? 'Gerar Pix' : 'Assinar Plano'}
                          </button>
                        </div>
                    )}
                 </div>
              </div>
            )}
        </div>

        <footer className="mt-auto p-8 text-center border-t border-white/5 shrink-0">
           <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Sistema operado por <span className="text-slate-400">Profep MAX</span></p>
        </footer>
      </main>

      {/* MODAL PIX */}
      {showPixModal && pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl w-full max-w-md p-8 relative shadow-2xl shadow-emerald-900/20">
            <button onClick={() => setShowPixModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="text-emerald-500" size={32} />
              </div>
              <h2 className="text-2xl font-black uppercase italic text-white mb-2">PIX Gerado!</h2>
              <p className="text-slate-400 text-sm">Escaneie o QR Code ou copie a chave abaixo</p>
            </div>
            {getPixQrSrc(pixData.qrCode) && (
              <div className="bg-white p-4 rounded-2xl mb-6 flex items-center justify-center">
                <img src={getPixQrSrc(pixData.qrCode)} alt="QR Code PIX" className="w-48 h-48" />
              </div>
            )}
            {pixData.key && (
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chave PIX (Copia e Cola)</label>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={pixData.key} 
                    className="flex-1 bg-black border border-white/10 rounded-xl py-3 px-4 text-white font-mono text-xs"
                  />
                  <button 
                    onClick={() => {navigator.clipboard.writeText(pixData.key); alert('Chave copiada!');}}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-black uppercase text-xs transition-all"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-xs text-yellow-400 text-center">
                <strong>Atenção:</strong> Após o pagamento, sua inscrição será liberada automaticamente em até 5 minutos.
              </p>
            </div>
          </div>
        </div>
      )}

      {showBoletosModal && boletosData.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-blue-500/30 rounded-3xl w-full max-w-2xl p-8 relative shadow-2xl">
            <button onClick={() => setShowBoletosModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black uppercase italic text-white mb-2">Boletos Gerados</h2>
            <p className="text-slate-400 text-sm mb-6">Abra cada boleto abaixo para efetuar o pagamento.</p>
            <div className="mb-6">
              <button
                onClick={handleDownloadBoletosZip}
                disabled={isDownloadingBoletos}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDownloadingBoletos ? 'Gerando arquivo...' : 'Baixar todos (ZIP)'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Parcela</th>
                    <th className="py-2">Vencimento</th>
                    <th className="py-2">Valor</th>
                    <th className="py-2">Boleto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {boletosData.map((b: any, idx: number) => (
                    <tr key={b.idTransaction || idx} className="text-slate-200">
                      <td className="py-3">{idx + 1} / {boletosData.length}</td>
                      <td className="py-3">{b.dueDate ? new Date(b.dueDate).toLocaleDateString('pt-BR') : '--'}</td>
                      <td className="py-3">R$ {typeof b.amount === 'number' ? b.amount.toFixed(2) : '--'}</td>
                      <td className="py-3"><a href={b.bankSlipUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">Abrir boleto</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
    <TermsAndConditionsModal
      isOpen={showTermsModal}
      onAccept={handleAcceptTerms}
      onDismiss={() => {
        setShowTermsModal(false);
      }}
      federationName={federationDisplayName}
      primaryColor={primaryColor}
    />
    </>
  );
}

// --- AUXILIARES (REQUISITOS E TIMELINE) ---

function RequirementSection({ title, color, icon, items, progress }: any) {
  const colors: any = { indigo: 'text-indigo-500 bg-indigo-900/20 border-indigo-900/50', green: 'text-green-500 bg-green-900/20 border-green-900/50', slate: 'text-slate-300 bg-slate-800 border-slate-700', red: 'text-red-500 bg-red-900/20 border-red-900/50' };
  const theme = colors[color] || colors.slate;
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className={`px-6 py-4 flex items-center gap-3 border-b ${theme}`}>{icon}<h3 className={`font-bold uppercase text-xs tracking-wider ${theme.split(' ')[0]}`}>{title}</h3></div>
        <div className="p-6 space-y-4">{items.map((item: any, i: number) => {
           const itemId = generateId(item.title);
           const isGrade = item.type === 'grade';
           const isDual = isGrade && DUAL_KATA_IDS.has(itemId);
           const gradeKey = `${itemId}_grade`;
           const toriKey = `${itemId}_tori`;
           const ukeKey = `${itemId}_uke`;
           const gradeValue = progress?.[gradeKey];
           const toriValue = progress?.[toriKey];
           const ukeValue = progress?.[ukeKey];
           const hasGrade = isDual ? (toriValue !== null && typeof toriValue !== 'undefined') || (ukeValue !== null && typeof ukeValue !== 'undefined') : (gradeValue !== null && typeof gradeValue !== 'undefined');
           const isDone = isGrade ? hasGrade : progress?.[itemId] === true;

           return (
             <div key={i} className={`flex items-start gap-4 p-3 rounded-xl border transition-all ${isDone ? 'bg-emerald-900/10 border-emerald-500/30' : 'border-transparent hover:bg-white/5'}`}>
                {isGrade ? (
                  <div className="mt-1 flex flex-col gap-1 min-w-[80px]">
                    {isDual ? (
                      <>
                        <div className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[10px] font-black text-slate-200">Tori: {toriValue ?? '--'}</div>
                        <div className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[10px] font-black text-slate-200">Uke: {ukeValue ?? '--'}</div>
                      </>
                    ) : (
                      <div className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[10px] font-black text-slate-200">Nota: {gradeValue ?? '--'}</div>
                    )}
                  </div>
                ) : (
                  <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center shrink-0 border ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>{isDone && <Check size={12} className="text-black font-black"/>}</div>
                )}
                <div>
                   <strong className={`block text-sm ${isDone ? 'text-emerald-400' : 'text-slate-200'}`}>{item.title}</strong>
                   <span className="text-xs text-slate-500">{item.desc}</span>
                   {item.subitems && (
                     <ul className="mt-2 space-y-1 pl-4 border-l border-slate-700 ml-1">
                        {item.subitems.map((sub: string, j: number) => (<li key={j} className="text-xs text-slate-400 list-disc ml-4">{sub}</li>))}
                     </ul>
                   )}
                </div>
             </div>
           );
        })}</div>
    </div>
  );
}

function TimelineEventCard({ event }: any) {
    const { title, description, location, modality, link, start_time } = event;
    const timeDisplay = start_time || '09:00';
    const date = new Date(`${event.date}T${timeDisplay}`);
    const day = date.getDate();
    return (
        <div className="flex gap-6 relative group">
            <div className="flex flex-col items-center w-12 pt-2"><span className="text-2xl font-black text-white">{day}</span><span className="text-[14px] font-bold text-blue-400 mt-1 font-mono">{timeDisplay}</span><div className="w-px flex-1 mt-2 bg-gradient-to-b from-white/20 to-transparent"></div></div>
            <div className="flex-1 rounded-2xl border border-slate-800 p-5 transition-all hover:scale-[1.01] bg-[#111827] group-hover:border-indigo-500">
                <div className="flex justify-between items-start mb-3">
                   <div className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-900/50 border border-white/5">{modality}</div>
                   {location && <div className="text-[12px] font-bold text-blue-400 flex items-center gap-1"><MapPin size={12}/> {location}</div>}
                </div>
                <h4 className="text-base font-bold text-white mb-1 uppercase">{title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function SidebarButton({ active, onClick, icon, label, primaryColor, locked, lockReason }: any) { return (<button onClick={locked ? undefined : onClick} className={`w-full flex items-center gap-4 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-r-4 ${active ? 'bg-white/[0.03] text-white' : 'text-slate-600 hover:text-slate-400'} ${locked ? 'opacity-30 cursor-not-allowed' : ''}`} style={{ borderRightColor: active ? primaryColor : 'transparent' }} title={locked ? lockReason : undefined} aria-disabled={locked}><span style={{ color: active && !locked ? primaryColor : 'inherit' }}>{icon}</span>{label}</button>); }
function InfoField({ label, value }: any) { return <div><div className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">{label}</div><div className="text-sm font-bold text-slate-200 uppercase truncate">{value || '--'}</div></div>; }
function PayOption({ active, onClick, icon, label, desc }: any) { return <button onClick={onClick} className={`p-4 rounded-[24px] border text-left transition-all ${active ? 'bg-white text-black shadow-xl' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}><div className={`mb-3 ${active ? 'text-black' : 'text-slate-500'}`}>{icon}</div><div className="text-[10px] font-black uppercase mb-1">{label}</div><div className={`text-[8px] font-bold ${active ? 'text-slate-600' : 'text-slate-500'}`}>{desc}</div></button>; }