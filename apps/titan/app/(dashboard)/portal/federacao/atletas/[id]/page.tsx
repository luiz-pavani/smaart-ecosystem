"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, User, Mail, Award, Building2, FileText, CreditCard, CheckCircle } from "lucide-react";
import AtletaDocumentos from "@/components/AtletaDocumentos";

type AthleteRecord = {
  id: number;
  numero_membro?: string | null;
  nome_completo?: string | null;
  nome_patch?: string | null;
  genero?: string | null;
  data_nascimento?: string | null;
  idade?: number | string | null;
  nacionalidade?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco_residencia?: string | null;
  graduacao?: string | null;
  dan?: number | string | null;
  nivel_arbitragem?: string | null;
  academia_id?: string | null;
  academias?: string | null;
  status_membro?: string | null;
  data_adesao?: string | null;
  plano_tipo?: string | null;
  status_plano?: string | null;
  data_expiracao?: string | null;
  url_foto?: string | null;
  url_documento_id?: string | null;
  url_certificado_dan?: string | null;
  tamanho_patch?: string | null;
  lote_id?: string | null;
  observacoes?: string | null;
  validado_em?: string | null;
  validado_por?: string | null;
};

type UserRole = {
  role: string;
  federacao_id: string | null;
  academia_id: string | null;
};

type Academia = {
  id: string;
  nome?: string;
  sigla?: string;
};

type Graduacao = {
  id: number;
  cor_faixa: string;
  kyu_dan: string;
};

const GENEROS = ["Masculino", "Feminino"];

const TIPOS_PLANO = [
  "Anuidade de atleta - projeto social",
  "Anuidade de atleta - faixa branca a marrom",
  "Anuidade de professor - faixa preta - sho-dan",
  "Anuidade de professor - faixa preta - ni-dan / san-dan",
  "Anuidade de professor - faixa preta - yon-dan / go-dan",
  "Anuidade de professor - kōdansha",
];

const NIVEIS_ARBITRAGEM = [
  "Sem nível",
  "Estadual C",
  "Estadual B",
  "Estadual A",
  "Nacional C",
  "Nacional B",
  "Nacional A",
  "Internacional C",
  "Internacional B",
  "Internacional A",
];

const TAMANHOS_PATCH = [
  "Grande Azul 41cm2",
  "Médio Azul 34cm2",
  "Pequeno Azul 28cm2",
  "Pequeno Rosa 28cm2",
];

const STATUS_PLANO_OPCOES = ["Válido", "Vencido"];

const STATUS_MEMBRO_OPCOES = ["Em análise", "Aceito", "Rejeitado"];

const PAISES_TOP = ["Brasil", "Uruguai"];

const PAISES_PTBR = [
  "Afeganistão", "África do Sul", "Albânia", "Alemanha", "Andorra", "Angola", "Antígua e Barbuda",
  "Arábia Saudita", "Argélia", "Argentina", "Armênia", "Austrália", "Áustria", "Azerbaijão", "Bahamas",
  "Bahrein", "Bangladesh", "Barbados", "Bélgica", "Belize", "Benim", "Belarus", "Bolívia",
  "Bósnia e Herzegovina", "Botsuana", "Brasil", "Brunei", "Bulgária", "Burkina Faso", "Burundi",
  "Butão", "Cabo Verde", "Camarões", "Camboja", "Canadá", "Catar", "Cazaquistão", "Chade", "Chile",
  "China", "Chipre", "Colômbia", "Comores", "Congo", "Coreia do Norte", "Coreia do Sul", "Costa do Marfim",
  "Costa Rica", "Croácia", "Cuba", "Dinamarca", "Djibuti", "Dominica", "Egito", "El Salvador",
  "Emirados Árabes Unidos", "Equador", "Eritreia", "Eslováquia", "Eslovênia", "Espanha", "Essuatíni",
  "Estados Unidos", "Estônia", "Etiópia", "Fiji", "Filipinas", "Finlândia", "França", "Gabão", "Gâmbia",
  "Gana", "Geórgia", "Granada", "Grécia", "Guatemala", "Guiana", "Guiné", "Guiné-Bissau", "Guiné Equatorial",
  "Haiti", "Honduras", "Hungria", "Iêmen", "Ilhas Marshall", "Índia", "Indonésia", "Irã", "Iraque",
  "Irlanda", "Islândia", "Israel", "Itália", "Jamaica", "Japão", "Jordânia", "Kiribati", "Kuwait",
  "Laos", "Lesoto", "Letônia", "Líbano", "Libéria", "Líbia", "Liechtenstein", "Lituânia", "Luxemburgo",
  "Macedônia do Norte", "Madagascar", "Malásia", "Maláui", "Maldivas", "Mali", "Malta", "Marrocos",
  "Maurícia", "Mauritânia", "México", "Micronésia", "Moçambique", "Moldávia", "Mônaco", "Mongólia",
  "Montenegro", "Mianmar", "Namíbia", "Nauru", "Nepal", "Nicarágua", "Níger", "Nigéria", "Noruega",
  "Nova Zelândia", "Omã", "Países Baixos", "Palau", "Panamá", "Papua-Nova Guiné", "Paquistão", "Paraguai",
  "Peru", "Polônia", "Portugal", "Quênia", "Quirguistão", "Reino Unido", "República Centro-Africana",
  "República Checa", "República Democrática do Congo", "República Dominicana", "Romênia", "Ruanda", "Rússia",
  "Samoa", "San Marino", "Santa Lúcia", "São Cristóvão e Nevis", "São Tomé e Príncipe",
  "São Vicente e Granadinas", "Seicheles", "Senegal", "Serra Leoa", "Sérvia", "Singapura", "Síria", "Somália",
  "Sri Lanka", "Sudão", "Sudão do Sul", "Suécia", "Suíça", "Suriname", "Tailândia", "Tajiquistão",
  "Tanzânia", "Timor-Leste", "Togo", "Tonga", "Trinidad e Tobago", "Tunísia", "Turcomenistão", "Turquia",
  "Tuvalu", "Ucrânia", "Uganda", "Uruguai", "Uzbequistão", "Vanuatu", "Vaticano", "Venezuela", "Vietnã",
  "Zâmbia", "Zimbábue",
];

const computeAgeByBirthYear = (dataNascimento?: string | null) => {
  if (!dataNascimento) return null;
  const anoNascimento = Number(String(dataNascimento).slice(0, 4));
  if (Number.isNaN(anoNascimento)) return null;
  return new Date().getFullYear() - anoNascimento;
};

const normalizeGraduacaoPipeSpacing = (value?: string | null) => {
  if (!value) return value ?? null;
  return String(value).replace(/\s*\|\s*/g, " | ").trim();
};

export default function AtletaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [atleta, setAtleta] = useState<AthleteRecord | null>(null);
  const [formData, setFormData] = useState<Partial<AthleteRecord>>({});
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  
  // Dropdowns data
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [graduacoes, setGraduacoes] = useState<Graduacao[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Await params in Next.js 14+
        const { id } = await params;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
        setCurrentUserEmail(user?.email ?? null);

        if (user?.id) {
          const { data: userRoles } = await supabase
            .from("user_roles")
            .select("role, federacao_id, academia_id")
            .eq("user_id", user.id);
          setRoles((userRoles || []) as UserRole[]);
        } else {
          setRoles([]);
        }
        
        // Load academias
        const { data: academiasData } = await supabase
          .from("academias")
          .select("id, nome, sigla")
          .order("sigla");
        setAcademias((academiasData || []) as Academia[]);
        
        // Load graduacoes
        const { data: graduacoesData } = await supabase
          .from("kyu_dan")
          .select("id, cor_faixa, kyu_dan")
          .order("id");
        setGraduacoes((graduacoesData || []) as Graduacao[]);
        
        // Regex para detectar UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(id);
        
        let data = null;
        let error = null;
        
        if (isUUID) {
          // Se parece UUID, busca por id
          const result = await supabase
            .from("user_fed_lrsj")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          data = result.data;
          error = result.error;
        } else {
          // Senão, busca por numero_membro (sempre como string)
          const result = await supabase
            .from("user_fed_lrsj")
            .select("*")
            .eq("numero_membro", String(id))
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
        
        if (error) {
          console.error("Erro ao buscar atleta:", error);
        }
        if (!data) {
          console.log("Atleta não encontrado para ID/numero_membro:", id);
        } else {
          console.log("Atleta carregado:", data.nome_completo);
        }
        
        const normalizedData = data
          ? {
              ...(data as AthleteRecord),
              idade: computeAgeByBirthYear((data as AthleteRecord).data_nascimento),
            }
          : null;

        setAtleta(normalizedData as AthleteRecord | null);
        setFormData((normalizedData as AthleteRecord | null) || {});
      } catch (err) {
        console.error("Erro inesperado ao carregar atleta:", err);
        setAtleta(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!atleta) {
    return <div className="text-center text-white">Atleta não encontrado.</div>;
  }

  const isMaster = roles.some((r) => r.role === "master_access");
  const isFederacao = roles.some((r) => ["federacao_admin", "federacao_staff"].includes(r.role));
  const isAcademia = roles.some((r) => ["academia_admin", "academia_staff"].includes(r.role));
  const isAtletaRole = roles.some((r) => r.role === "atleta");
  const isSelfAthlete = Boolean(
    currentUserEmail &&
      atleta?.email &&
      currentUserEmail.toLowerCase() === String(atleta.email).toLowerCase()
  );

  const statusMembroAtual = String(atleta?.status_membro ?? "").trim().toLowerCase();
  const membroAceito = statusMembroAtual === "aceito" || statusMembroAtual === "approved";
  const canValidate = isMaster || isFederacao;
  const canEdit =
    isMaster ||
    isFederacao ||
    (!membroAceito && (isAcademia || isAtletaRole || isSelfAthlete));

  const setField = (field: keyof AthleteRecord, value: string) => {
    if (field === "data_nascimento") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        idade: computeAgeByBirthYear(value),
      }));
      return;
    }

    if (field === "academia_id") {
      const academiaSelecionada = academias.find((a) => a.id === value);
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        academias: academiaSelecionada?.nome || null,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeDate = (value: unknown) => {
    if (!value) return "";
    return String(value).slice(0, 10);
  };

  const saveChanges = async () => {
    if (!atleta || !canEdit) return;
    setSaving(true);
    setMessage("");
    try {
      const payload: Partial<AthleteRecord> = {
        nome_completo: formData.nome_completo ?? null,
        nome_patch: formData.nome_patch ?? null,
        genero: formData.genero ?? null,
        data_nascimento: formData.data_nascimento || null,
        idade: computeAgeByBirthYear(formData.data_nascimento ?? null),
        nacionalidade: formData.nacionalidade ?? null,
        email: formData.email ?? null,
        telefone: formData.telefone ?? null,
        cidade: formData.cidade ?? null,
        estado: formData.estado ?? null,
        endereco_residencia: formData.endereco_residencia ?? null,
        graduacao: normalizeGraduacaoPipeSpacing(formData.graduacao ?? null),
        nivel_arbitragem: formData.nivel_arbitragem ?? "Sem nível",
        academia_id: formData.academia_id ?? null,
        academias: formData.academia_id
          ? academias.find((a) => a.id === formData.academia_id)?.nome || formData.academias || null
          : formData.academias ?? null,
        status_membro: formData.status_membro ?? "Em análise",
        data_adesao: formData.data_adesao || null,
        plano_tipo: formData.plano_tipo ?? null,
        status_plano: formData.status_plano ?? null,
        data_expiracao: formData.data_expiracao || null,
        tamanho_patch: formData.tamanho_patch ?? null,
        lote_id: formData.lote_id ?? null,
        observacoes: formData.observacoes ?? null,
      };

      const { data, error } = await supabase
        .from("user_fed_lrsj")
        .update(payload)
        .eq("id", atleta.id)
        .select("*")
        .single();

      if (error) throw error;
      setAtleta(data as AthleteRecord);
      setFormData(data as AthleteRecord);
      setEditMode(false);
      setMessage("Dados salvos com sucesso.");
    } catch (err: any) {
      setMessage(err?.message || "Erro ao salvar dados do atleta.");
    } finally {
      setSaving(false);
    }
  };

  const validateAthleteData = async () => {
    if (!atleta || !canValidate || !currentUserId) return;
    setSaving(true);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("user_fed_lrsj")
        .update({
          status_membro: "Aceito",
          validado_em: new Date().toISOString(),
          validado_por: currentUserId,
        })
        .eq("id", atleta.id)
        .select("*")
        .single();

      if (error) throw error;
      setAtleta(data as AthleteRecord);
      setFormData(data as AthleteRecord);
      setEditMode(false);
      setMessage("Dados validados pela federação.");
    } catch (err: any) {
      setMessage(
        err?.message ||
          "Erro ao validar dados. Execute a migration de validação no Supabase se necessário."
      );
    } finally {
      setSaving(false);
    }
  };

  const InfoCard = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value }: any) => (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );

  const EditableRow = ({
    label,
    field,
    type = "text",
    readOnly = false,
  }: {
    label: string;
    field: keyof AthleteRecord;
    type?: "text" | "number" | "date" | "select";
    readOnly?: boolean;
  }) => {
    if (editMode && canEdit && !readOnly) {
      // Dropdown para academia_id
      if (field === "academia_id") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione uma academia</option>
              {academias.map((academia) => (
                <option key={academia.id} value={academia.id}>
                  {academia.sigla || academia.nome}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "genero") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione o gênero</option>
              {GENEROS.map((genero) => (
                <option key={genero} value={genero}>
                  {genero}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "nacionalidade") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione a nacionalidade</option>
              {PAISES_TOP.map((pais) => (
                <option key={`top-${pais}`} value={pais}>
                  {pais}
                </option>
              ))}
              <option disabled>──────────</option>
              {PAISES_PTBR.filter((pais) => !PAISES_TOP.includes(pais)).map((pais) => (
                <option key={pais} value={pais}>
                  {pais}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "plano_tipo") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione o tipo de plano</option>
              {TIPOS_PLANO.map((plano) => (
                <option key={plano} value={plano}>
                  {plano}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "nivel_arbitragem") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "Sem nível")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              {NIVEIS_ARBITRAGEM.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "tamanho_patch") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione o tamanho do patch</option>
              {TAMANHOS_PATCH.map((tamanho) => (
                <option key={tamanho} value={tamanho}>
                  {tamanho}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "status_plano") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione o status do plano</option>
              {STATUS_PLANO_OPCOES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (field === "status_membro") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={String(formData[field] ?? "Em análise")}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              {STATUS_MEMBRO_OPCOES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        );
      }
      
      // Dropdown para graduação
      if (field === "graduacao") {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              value={normalizeGraduacaoPipeSpacing(String(formData[field] ?? "")) ?? ""}
              onChange={(e) => setField(field, e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione uma graduação</option>
              {graduacoes.map((grad) => (
                <option key={grad.id} value={`${grad.cor_faixa} | ${grad.kyu_dan}`}>
                  {grad.cor_faixa} | {grad.kyu_dan}
                </option>
              ))}
            </select>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <input
            type={type}
            value={
              type === "date"
                ? normalizeDate(formData[field])
                : String(formData[field] ?? "")
            }
            onChange={(e) => setField(field, e.target.value)}
            className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
          />
        </div>
      );
    }

    const rawValue = type === "date" ? normalizeDate(formData[field] ?? atleta?.[field]) : formData[field] ?? atleta?.[field];
    const value = field === "graduacao" ? normalizeGraduacaoPipeSpacing(String(rawValue ?? "")) : rawValue;
    
    // Display friendly name for academia_id
    if (field === "academia_id" && value) {
      const academia = academias.find((a) => a.id === value);
      return <InfoRow label={label} value={academia?.sigla || value} />;
    }

    if (field === "academias") {
      const academia = academias.find((a) => a.id === (formData.academia_id ?? atleta?.academia_id));
      return <InfoRow label={label} value={academia?.nome || value} />;
    }
    
    return <InfoRow label={label} value={value} />;
  };

  const StatusBadge = ({ status }: any) => {
    const colors: any = {
      'Active': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Expired': 'bg-red-500/20 text-red-300 border-red-500/30',
      'approved': 'bg-green-500/20 text-green-300 border-green-500/30',
      'pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'rejected': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Válido': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Vencido': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Aceito': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Em análise': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Rejeitado': 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="max-w-6xl mx-auto">
        {/* Header com foto e nome */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-8 mb-6 border border-white/10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Foto do atleta */}
            <div className="flex-shrink-0">
              {atleta.url_foto ? (
                <img
                  src={atleta.url_foto}
                  alt={atleta.nome_completo || "Foto do atleta"}
                  className="w-48 h-48 object-cover rounded-xl border-4 border-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-48 h-48 bg-white/10 rounded-xl border-4 border-white/10 flex items-center justify-center">
                  <User className="w-24 h-24 text-gray-500" />
                </div>
              )}
            </div>

            {/* Informações principais */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{atleta.nome_completo}</h1>
              {atleta.nome_patch && (
                <p className="text-lg text-gray-400 mb-4">"{atleta.nome_patch}"</p>
              )}
              <div className="flex flex-wrap gap-3 mb-4">
                {atleta.graduacao && (
                  <div className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg border border-blue-500/30 font-semibold">
                    {normalizeGraduacaoPipeSpacing(atleta.graduacao)}
                  </div>
                )}
                {atleta.academia_id && (() => {
                  const academia = academias.find(a => a.id === atleta.academia_id);
                  return academia ? (
                    <div className="bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg border border-orange-500/30 font-semibold">
                      🥋 {academia.nome || academia.sigla}
                    </div>
                  ) : atleta.academias ? (
                    <div className="bg-gray-500/20 text-gray-300 px-4 py-2 rounded-lg border border-gray-500/30 font-semibold">
                      🥋 {atleta.academias}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="flex flex-wrap gap-3">
                {atleta.status_plano && <StatusBadge status={atleta.status_plano} />}
                {atleta.status_membro && <StatusBadge status={atleta.status_membro} />}
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                {canEdit && !editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 rounded-lg bg-blue-600/70 hover:bg-blue-600 text-white text-sm"
                  >
                    Editar dados
                  </button>
                )}
                {editMode && canEdit && (
                  <>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-green-600/70 hover:bg-green-600 text-white text-sm disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setFormData(atleta);
                        setMessage("");
                      }}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {canValidate && !membroAceito && (
                  <button
                    onClick={validateAthleteData}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white text-sm disabled:opacity-60"
                  >
                    Marcar como Aceito (Federação)
                  </button>
                )}
              </div>
              {message && <p className="text-sm text-gray-300 mt-3">{message}</p>}
            </div>
          </div>
        </div>

        {/* Grid de informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <InfoCard title="Dados Pessoais" icon={User}>
            <EditableRow label="Número de Membro" field="numero_membro" readOnly />
            <EditableRow label="Gênero" field="genero" type="select" />
            <EditableRow label="Data de Nascimento" field="data_nascimento" type="date" />
            <EditableRow label="Idade" field="idade" type="number" readOnly />
            <EditableRow label="Nacionalidade" field="nacionalidade" type="select" />
          </InfoCard>

          {/* Contato */}
          <InfoCard title="Contato" icon={Mail}>
            <EditableRow label="Email" field="email" />
            <EditableRow label="Telefone" field="telefone" />
            <EditableRow label="Cidade" field="cidade" />
            <EditableRow label="Estado" field="estado" />
            <EditableRow label="Residência" field="endereco_residencia" />
          </InfoCard>

          {/* Graduação e Arbitragem */}
          <InfoCard title="Graduação e Arbitragem" icon={Award}>
            <EditableRow label="Graduação" field="graduacao" type="select" />
            <EditableRow label="Nível de Arbitragem" field="nivel_arbitragem" type="select" />
            <EditableRow label="Tamanho do Patch" field="tamanho_patch" type="select" />
            <EditableRow label="Nome no Patch" field="nome_patch" />
          </InfoCard>

          {/* Academia */}
          <InfoCard title="Academia" icon={Building2}>
            <EditableRow label="Sigla da Academia" field="academia_id" type="select" />
            <EditableRow label="Academia (nome completo)" field="academias" readOnly />
          </InfoCard>

          {/* Plano e Status */}
          <InfoCard title="Plano e Filiação" icon={CreditCard}>
            <EditableRow label="Data de Adesão" field="data_adesao" type="date" />
            <EditableRow label="Tipo de Plano" field="plano_tipo" type="select" />
            <EditableRow label="Status do Plano" field="status_plano" type="select" />
            <EditableRow label="Data de Expiração" field="data_expiracao" type="date" />
            <EditableRow label="Status do Membro" field="status_membro" type="select" />
            <EditableRow label="Lote" field="lote_id" />
          </InfoCard>

          {/* Documentos */}
          <InfoCard title="Documentos" icon={FileText}>
            {atleta.url_documento_id && (
              <a href={atleta.url_documento_id} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline break-all">
                Ver Documento de Identidade
              </a>
            )}
            {atleta.url_certificado_dan && (
              <a href={atleta.url_certificado_dan} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline break-all">
                Ver Certificado Dan
              </a>
            )}
            {!atleta.url_documento_id && !atleta.url_certificado_dan && (
              <p className="text-gray-500 text-sm">Nenhum documento anexado</p>
            )}
          </InfoCard>
        </div>

        {/* Observações */}
        {(atleta.observacoes || (editMode && canEdit)) && (
          <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Observações</h2>
            </div>
            {editMode && canEdit ? (
              <textarea
                value={String(formData.observacoes ?? "")}
                onChange={(e) => setField("observacoes", e.target.value)}
                rows={4}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
              />
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap">{atleta.observacoes || "—"}</p>
            )}
          </div>
        )}

        {/* Documentos Gerados Automaticamente */}
        <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
          <AtletaDocumentos 
            atletaId={atleta.id} 
            showIdentidade={true} 
            showCertificado={true} 
          />
        </div>
      </div>
    </div>
  );
}
