"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, User, Mail, Award, Building2, FileText, CreditCard, CheckCircle2, XCircle, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import AtletaDocumentos from "@/components/AtletaDocumentos";

// ── Types ────────────────────────────────────────────────────────────────────

type AthleteRecord = {
  stakeholder_id: string;
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
  pais?: string | null;
  kyu_dan_id?: number | string | null;
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
  cor_patch?: string | null;
  lote_id?: string | null;
  observacoes?: string | null;
  validado_em?: string | null;
  validado_por?: string | null;
};

type Academia = { id: string; nome?: string; sigla?: string; federacao_id?: string };
type Graduacao = { id: number; cor_faixa: string; kyu_dan: string };
type Federacao = { id: string; nome?: string; sigla?: string };

// Context passed down to module-level components to avoid inline redefinition
type EditCtx = {
  editMode: boolean;
  canEdit: boolean;
  formData: Partial<AthleteRecord>;
  setField: (field: keyof AthleteRecord, value: string) => void;
  academias: Academia[];
  graduacoes: Graduacao[];
  nivelHierarquico: number; // 1=master … 7=atleta
  federacoes: Federacao[];
  federacaoFiltro: string;
  setFederacaoFiltro: (id: string) => void;
};

// Fields only writable by levels 1–3
const NIVEL_1_3_FIELDS: (keyof AthleteRecord)[] = ['status_plano', 'data_expiracao', 'status_membro', 'lote_id'];
// Fields writable by 1–7, but locked to 1–3 once status_membro = "Aceito"
const GRAD_FIELDS: (keyof AthleteRecord)[] = ['kyu_dan_id', 'nivel_arbitragem'];

function canEditField(field: keyof AthleteRecord, nivelHierarquico: number, statusMembro: string | null | undefined): boolean {
  if (NIVEL_1_3_FIELDS.includes(field)) return nivelHierarquico <= 3;
  if (GRAD_FIELDS.includes(field)) {
    const aceito = String(statusMembro ?? '').trim().toLowerCase() === 'aceito';
    if (aceito) return nivelHierarquico <= 3;
    return true; // not aceito → any level can edit
  }
  return true; // all other fields: unrestricted
}

// ── Constants ────────────────────────────────────────────────────────────────

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
  "Sem nível","Estadual C","Estadual B","Estadual A",
  "Nacional C","Nacional B","Nacional A",
  "Internacional C","Internacional B","Internacional A",
];
const TAMANHOS_PATCH = ["P", "M", "G"];
const CORES_PATCH = ["AZUL", "ROSA"];
const STATUS_PLANO_OPCOES = ["Válido", "Vencido"];
const STATUS_MEMBRO_OPCOES = ["Em análise", "Aceito", "Rejeitado"];
const PAISES_TOP = ["Brasil", "Uruguai"];
const PAISES_PTBR = [
  "Afeganistão","África do Sul","Albânia","Alemanha","Andorra","Angola","Antígua e Barbuda",
  "Arábia Saudita","Argélia","Argentina","Armênia","Austrália","Áustria","Azerbaijão","Bahamas",
  "Bahrein","Bangladesh","Barbados","Bélgica","Belize","Benim","Belarus","Bolívia",
  "Bósnia e Herzegovina","Botsuana","Brasil","Brunei","Bulgária","Burkina Faso","Burundi",
  "Butão","Cabo Verde","Camarões","Camboja","Canadá","Catar","Cazaquistão","Chade","Chile",
  "China","Chipre","Colômbia","Comores","Congo","Coreia do Norte","Coreia do Sul","Costa do Marfim",
  "Costa Rica","Croácia","Cuba","Dinamarca","Djibuti","Dominica","Egito","El Salvador",
  "Emirados Árabes Unidos","Equador","Eritreia","Eslováquia","Eslovênia","Espanha","Essuatíni",
  "Estados Unidos","Estônia","Etiópia","Fiji","Filipinas","Finlândia","França","Gabão","Gâmbia",
  "Gana","Geórgia","Granada","Grécia","Guatemala","Guiana","Guiné","Guiné-Bissau","Guiné Equatorial",
  "Haiti","Honduras","Hungria","Iêmen","Ilhas Marshall","Índia","Indonésia","Irã","Iraque",
  "Irlanda","Islândia","Israel","Itália","Jamaica","Japão","Jordânia","Kiribati","Kuwait",
  "Laos","Lesoto","Letônia","Líbano","Libéria","Líbia","Liechtenstein","Lituânia","Luxemburgo",
  "Macedônia do Norte","Madagascar","Malásia","Maláui","Maldivas","Mali","Malta","Marrocos",
  "Maurícia","Mauritânia","México","Micronésia","Moçambique","Moldávia","Mônaco","Mongólia",
  "Montenegro","Mianmar","Namíbia","Nauru","Nepal","Nicarágua","Níger","Nigéria","Noruega",
  "Nova Zelândia","Omã","Países Baixos","Palau","Panamá","Papua-Nova Guiné","Paquistão","Paraguai",
  "Peru","Polônia","Portugal","Quênia","Quirguistão","Reino Unido","República Centro-Africana",
  "República Checa","República Democrática do Congo","República Dominicana","Romênia","Ruanda","Rússia",
  "Samoa","San Marino","Santa Lúcia","São Cristóvão e Nevis","São Tomé e Príncipe",
  "São Vicente e Granadinas","Seicheles","Senegal","Serra Leoa","Sérvia","Singapura","Síria","Somália",
  "Sri Lanka","Sudão","Sudão do Sul","Suécia","Suíça","Suriname","Tailândia","Tajiquistão",
  "Tanzânia","Timor-Leste","Togo","Tonga","Trinidad e Tobago","Tunísia","Turcomenistão","Turquia",
  "Tuvalu","Ucrânia","Uganda","Uruguai","Uzbequistão","Vanuatu","Vaticano","Venezuela","Vietnã",
  "Zâmbia","Zimbábue",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const computeAgeByBirthYear = (d?: string | null) => {
  if (!d) return null;
  const y = Number(String(d).slice(0, 4));
  return Number.isNaN(y) ? null : new Date().getFullYear() - y;
};

const normalizeDate = (v: unknown) => (!v ? "" : String(v).slice(0, 10));

const inputCls = "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white";
const selectCls = "w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white";

// ── Module-level sub-components (MUST be outside parent to avoid remounting) ─

function InfoRow({ label, value }: { label: string; value?: unknown }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right max-w-[60%]">{String(value ?? "") || "—"}</span>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const colors: Record<string, string> = {
    Válido: "bg-green-500/20 text-green-300 border-green-500/30",
    Vencido: "bg-red-500/20 text-red-300 border-red-500/30",
    Aceito: "bg-green-500/20 text-green-300 border-green-500/30",
    "Em análise": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    Rejeitado: "bg-red-500/20 text-red-300 border-red-500/30",
    approved: "bg-green-500/20 text-green-300 border-green-500/30",
    Active: "bg-green-500/20 text-green-300 border-green-500/30",
    Expired: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  if (!status) return null;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
      {status}
    </span>
  );
}

// EditableRow is at module scope so React never unmounts/remounts it mid-edit
function EditableRow({
  label, field, type = "text", readOnly = false, ctx,
}: {
  label: string;
  field: keyof AthleteRecord;
  type?: string;
  readOnly?: boolean;
  ctx: EditCtx;
}) {
  const { editMode, canEdit, formData, setField, academias, graduacoes, nivelHierarquico } = ctx;
  // federacoes/federacaoFiltro are used in inline JSX in the parent, not in EditableRow
  const fieldAllowed = canEditField(field, nivelHierarquico, formData.status_membro);

  if (editMode && canEdit && !readOnly && fieldAllowed) {
    if (field === "academia_id") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione uma academia</option>
            {academias.map(a => <option key={a.id} value={a.id}>{a.sigla || a.nome}</option>)}
          </select>
        </div>
      );
    }
    if (field === "genero") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      );
    }
    if (field === "nacionalidade" || field === "pais") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {PAISES_TOP.map(p => <option key={`top-${p}`} value={p}>{p}</option>)}
            <option disabled>──────────</option>
            {PAISES_PTBR.filter(p => !PAISES_TOP.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      );
    }
    if (field === "plano_tipo") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {TIPOS_PLANO.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      );
    }
    if (field === "nivel_arbitragem") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "Sem nível")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            {NIVEIS_ARBITRAGEM.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      );
    }
    if (field === "tamanho_patch") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {TAMANHOS_PATCH.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      );
    }
    if (field === "cor_patch") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {CORES_PATCH.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      );
    }
    if (field === "status_plano") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {STATUS_PLANO_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      );
    }
    if (field === "status_membro") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "Em análise")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            {STATUS_MEMBRO_OPCOES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      );
    }
    if (field === "kyu_dan_id") {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">{label}</span>
          <select value={String(formData[field] ?? "")} onChange={e => setField(field, e.target.value)} className={selectCls}>
            <option value="">Selecione</option>
            {graduacoes.map(g => <option key={g.id} value={String(g.id)}>{g.cor_faixa} | {g.kyu_dan}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-sm">{label}</span>
        <input
          type={type}
          value={type === "date" ? normalizeDate(formData[field]) : String(formData[field] ?? "")}
          onChange={e => setField(field, e.target.value)}
          className={inputCls}
        />
      </div>
    );
  }

  // View mode
  if (field === "academias") {
    const ac = academias.find(a => a.id === formData.academia_id);
    return <InfoRow label={label} value={ac?.nome ?? formData[field]} />;
  }
  if (field === "kyu_dan_id") {
    const g = graduacoes.find(g => g.id === Number(formData[field]));
    return <InfoRow label={label} value={g ? `${g.cor_faixa} | ${g.kyu_dan}` : "—"} />;
  }
  const raw = type === "date" ? normalizeDate(formData[field]) : formData[field];
  return <InfoRow label={label} value={raw} />;
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AtletaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [atleta, setAtleta] = useState<AthleteRecord | null>(null);
  const [formData, setFormData] = useState<Partial<AthleteRecord>>({});
  const [roles, setRoles] = useState<{ role: string }[]>([]);
  const [nivelHierarquico, setNivelHierarquico] = useState<number>(7);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [graduacoes, setGraduacoes] = useState<Graduacao[]>([]);
  const [federacoes, setFederacoes] = useState<Federacao[]>([]);
  const [federacaoFiltro, setFederacaoFiltro] = useState<string>('');
  const [atletaId, setAtletaId] = useState<string | null>(null);
  const [stNomeUsuario, setStNomeUsuario] = useState<string>('');
  const [stRole, setStRole] = useState<string>('');
  const [savingStakeholder, setSavingStakeholder] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [stCandidato, setStCandidato] = useState(false);
  const [auditLogs, setAuditLogs] = useState<{ id: string; actor_nome: string; action: string; fields: string[]; created_at: string }[]>([]);
  // Quick actions state
  const [qaAction, setQaAction] = useState<'renovar' | 'graduacao' | null>(null);
  const [qaNovaData, setQaNovaData] = useState('');
  const [qaNovaGrad, setQaNovaGrad] = useState('');
  const [qaSaving, setQaSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { id } = await params;
        setAtletaId(id);

        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
        setCurrentUserEmail(user?.email ?? null);

        if (user?.id) {
          const [{ data: r }, { data: nivel }] = await Promise.all([
            supabase.from("stakeholders").select("role").eq("id", user.id),
            supabase.rpc("get_my_nivel"),
          ]);
          setRoles(r || []);
          if (typeof nivel === "number") setNivelHierarquico(nivel);
        }

        const [
          acadRes,
          fedListRes,
          { data: kdData },
          { data: fedData, error: fedErr },
          { data: stData },
        ] = await Promise.all([
          fetch('/api/academias/listar').then(r => r.json()),
          fetch('/api/federacoes/listar').then(r => r.json()),
          supabase.from("kyu_dan").select("id, cor_faixa, kyu_dan").order("id"),
          supabase.from("user_fed_lrsj").select("*").eq("stakeholder_id", id).maybeSingle(),
          supabase.from("stakeholders").select("nome_usuario, role, candidato").eq("id", id).maybeSingle(),
        ]);

        const acadList = (acadRes.academias || []) as Academia[];
        setAcademias(acadList);
        setGraduacoes((kdData || []) as Graduacao[]);
        setFederacoes((fedListRes.federacoes || []) as Federacao[]);

        if (fedErr) console.error("Erro ao buscar atleta:", fedErr);
        setStNomeUsuario(stData?.nome_usuario ?? '');
        setStRole(stData?.role ?? '');
        setStCandidato(stData?.candidato ?? false);

        // Fetch audit log
        fetch(`/api/atletas/${id}/audit-log`)
          .then(r => r.json())
          .then(j => setAuditLogs(j.logs || []))
          .catch(() => {});

        // Pre-select the federation matching the athlete's current academy
        if (fedData?.academia_id) {
          const currentAcad = acadList.find(a => a.id === fedData.academia_id);
          if (currentAcad?.federacao_id) setFederacaoFiltro(currentAcad.federacao_id);
        }

        const normalized = fedData
          ? { ...(fedData as AthleteRecord), idade: computeAgeByBirthYear((fedData as AthleteRecord).data_nascimento) }
          : null;

        setAtleta(normalized);
        setFormData(normalized || {});
      } catch (err) {
        console.error("Erro inesperado:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  if (!atleta) return <div className="text-center text-white p-8">Atleta não encontrado.</div>;

  const isMaster = roles.some(r => r.role === "master_access");
  const isFederacao = roles.some(r => ["federacao_admin", "federacao_staff"].includes(r.role));
  const isAcademia = roles.some(r => ["academia_admin", "academia_staff"].includes(r.role));
  const isAtletaRole = roles.some(r => r.role === "atleta");
  const isSelfAthlete = Boolean(currentUserEmail && atleta?.email && currentUserEmail.toLowerCase() === String(atleta.email).toLowerCase());

  const statusMembroAtual = String(atleta?.status_membro ?? "").trim().toLowerCase();
  const membroAceito = statusMembroAtual === "aceito" || statusMembroAtual === "approved";
  const canValidate = isMaster || isFederacao;
  const canEdit = isMaster || isFederacao || (!membroAceito && (isAcademia || isAtletaRole || isSelfAthlete));

  const setField = (field: keyof AthleteRecord, value: string) => {
    if (field === "data_nascimento") {
      setFormData(prev => ({ ...prev, [field]: value, idade: computeAgeByBirthYear(value) }));
      return;
    }
    if (field === "academia_id") {
      const ac = academias.find(a => a.id === value);
      setFormData(prev => ({ ...prev, [field]: value, academias: ac?.nome ?? null }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const academiasFiltradas = federacaoFiltro
    ? academias.filter(a => a.federacao_id === federacaoFiltro)
    : academias;

  const ctx: EditCtx = { editMode, canEdit, formData, setField, academias, graduacoes, nivelHierarquico, federacoes, federacaoFiltro, setFederacaoFiltro };

  const saveChanges = async () => {
    if (!atleta || !canEdit || !atletaId) return;
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
        pais: formData.pais ?? null,
        kyu_dan_id: formData.kyu_dan_id === undefined || formData.kyu_dan_id === null || String(formData.kyu_dan_id).trim() === ""
          ? null : Number(formData.kyu_dan_id),
        nivel_arbitragem: formData.nivel_arbitragem ?? "Sem nível",
        academia_id: formData.academia_id ?? null,
        academias: formData.academia_id
          ? academias.find(a => a.id === formData.academia_id)?.nome || formData.academias || null
          : formData.academias ?? null,
        status_membro: formData.status_membro ?? "Em análise",
        data_adesao: formData.data_adesao || null,
        plano_tipo: formData.plano_tipo ?? null,
        status_plano: formData.status_plano ?? null,
        data_expiracao: formData.data_expiracao || null,
        tamanho_patch: formData.tamanho_patch || null,
        cor_patch: formData.cor_patch || null,
        lote_id: formData.lote_id ?? null,
        observacoes: formData.observacoes ?? null,
      };

      const res = await fetch(`/api/atletas/${atletaId}/update-fed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");

      setAtleta(json.data as AthleteRecord);
      setFormData(json.data as AthleteRecord);
      setEditMode(false);
      setMessage("Dados salvos com sucesso.");
    } catch (err: any) {
      setMessage(err?.message || "Erro ao salvar dados do atleta.");
    } finally {
      setSaving(false);
    }
  };

  const validateAthleteData = async () => {
    if (!atleta || !canValidate || !atletaId) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/atletas/${atletaId}/update-fed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_membro: "Aceito" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao validar");
      setAtleta(json.data as AthleteRecord);
      setFormData(json.data as AthleteRecord);
      setEditMode(false);
      setMessage("Dados validados pela federação.");
    } catch (err: any) {
      setMessage(err?.message || "Erro ao validar dados.");
    } finally {
      setSaving(false);
    }
  };

  const quickPatch = async (payload: Record<string, unknown>, successMsg: string) => {
    if (!atletaId) return;
    setQaSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/atletas/${atletaId}/update-fed`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      setAtleta(json.data as AthleteRecord);
      setFormData(json.data as AthleteRecord);
      setQaAction(null);
      setMessage(successMsg);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao salvar');
    } finally {
      setQaSaving(false);
    }
  };

  const kyuDanAtual = graduacoes.find(g => g.id === Number(atleta.kyu_dan_id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-8 mb-6 border border-white/10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0">
              {atleta.url_foto ? (
                <img src={atleta.url_foto} alt={atleta.nome_completo || ""} className="w-48 h-48 object-cover rounded-xl border-4 border-white/10"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'; }} />
              ) : (
                <div className="w-48 h-48 bg-white/10 rounded-xl border-4 border-white/10 flex items-center justify-center">
                  <User className="w-24 h-24 text-gray-500" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{atleta.nome_completo}</h1>
              {atleta.nome_patch && <p className="text-lg text-gray-400 mb-4">"{atleta.nome_patch}"</p>}
              <div className="flex flex-wrap gap-3 mb-4">
                {kyuDanAtual && (
                  <div className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg border border-blue-500/30 font-semibold">
                    {kyuDanAtual.cor_faixa} | {kyuDanAtual.kyu_dan}
                  </div>
                )}
                {atleta.academia_id && (() => {
                  const ac = academias.find(a => a.id === atleta.academia_id);
                  return ac ? (
                    <div className="bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg border border-orange-500/30 font-semibold">🥋 {ac.nome || ac.sigla}</div>
                  ) : atleta.academias ? (
                    <div className="bg-gray-500/20 text-gray-300 px-4 py-2 rounded-lg border border-gray-500/30 font-semibold">🥋 {atleta.academias}</div>
                  ) : null;
                })()}
              </div>
              <div className="flex flex-wrap gap-3">
                {atleta.status_plano && <StatusBadge status={atleta.status_plano} />}
                {atleta.status_membro && <StatusBadge status={atleta.status_membro} />}
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {canEdit && !editMode && (
                  <button onClick={() => setEditMode(true)} className="px-4 py-2 rounded-lg bg-blue-600/70 hover:bg-blue-600 text-white text-sm">Editar dados</button>
                )}
                {editMode && canEdit && (
                  <>
                    <button onClick={saveChanges} disabled={saving} className="px-4 py-2 rounded-lg bg-green-600/70 hover:bg-green-600 text-white text-sm disabled:opacity-60">
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button onClick={() => { setEditMode(false); setFormData(atleta); setMessage(""); }} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
                      Cancelar
                    </button>
                  </>
                )}
                {canValidate && !membroAceito && (
                  <button onClick={validateAthleteData} disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white text-sm disabled:opacity-60">
                    Marcar como Aceito (Federação)
                  </button>
                )}
              </div>
              {message && <p className="text-sm text-gray-300 mt-3">{message}</p>}
            </div>
          </div>
        </div>

        {/* Ações Rápidas — only visible to federation staff */}
        {canValidate && (
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6 border border-white/10">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Ações Rápidas</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Aprovar */}
              {atleta.status_membro !== 'Aceito' && (
                <button
                  onClick={() => quickPatch({ status_membro: 'Aceito' }, 'Atleta aprovado com sucesso.')}
                  disabled={qaSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar
                </button>
              )}

              {/* Rejeitar */}
              {atleta.status_membro !== 'Rejeitado' && (
                <button
                  onClick={() => quickPatch({ status_membro: 'Rejeitado' }, 'Atleta rejeitado.')}
                  disabled={qaSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/70 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
              )}

              {/* Renovar Plano */}
              <button
                onClick={() => { setQaAction(qaAction === 'renovar' ? null : 'renovar'); setQaNovaData(''); }}
                disabled={qaSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                  qaAction === 'renovar' ? 'bg-blue-600 text-white' : 'bg-blue-600/40 hover:bg-blue-600/60 text-blue-200'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Renovar plano
              </button>

              {/* Alterar Graduação */}
              <button
                onClick={() => { setQaAction(qaAction === 'graduacao' ? null : 'graduacao'); setQaNovaGrad(String(atleta.kyu_dan_id ?? '')); }}
                disabled={qaSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                  qaAction === 'graduacao' ? 'bg-purple-600 text-white' : 'bg-purple-600/40 hover:bg-purple-600/60 text-purple-200'
                }`}
              >
                <Award className="w-4 h-4" />
                Graduação
              </button>
            </div>

            {/* Inline: Renovar */}
            {qaAction === 'renovar' && (
              <div className="mt-4 flex items-end gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Nova data de expiração</label>
                  <input
                    type="date"
                    value={qaNovaData}
                    onChange={e => setQaNovaData(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  onClick={() => quickPatch({ data_expiracao: qaNovaData, status_plano: 'Válido' }, 'Plano renovado com sucesso.')}
                  disabled={!qaNovaData || qaSaving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {qaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                </button>
                <button onClick={() => setQaAction(null)} className="px-3 py-2 rounded-lg bg-white/10 text-gray-400 hover:text-white text-sm transition-colors">✕</button>
              </div>
            )}

            {/* Inline: Graduação */}
            {qaAction === 'graduacao' && (
              <div className="mt-4 flex items-end gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Nova graduação</label>
                  <select
                    value={qaNovaGrad}
                    onChange={e => setQaNovaGrad(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Selecione</option>
                    {graduacoes.map(g => (
                      <option key={g.id} value={String(g.id)}>{g.cor_faixa} | {g.kyu_dan}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => quickPatch({ kyu_dan_id: Number(qaNovaGrad) }, 'Graduação atualizada.')}
                  disabled={!qaNovaGrad || qaSaving}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {qaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                </button>
                <button onClick={() => setQaAction(null)} className="px-3 py-2 rounded-lg bg-white/10 text-gray-400 hover:text-white text-sm transition-colors">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoCard title="Dados Pessoais" icon={User}>
            <EditableRow label="Stakeholder ID" field="stakeholder_id" readOnly ctx={ctx} />
            <EditableRow label="Gênero" field="genero" type="select" ctx={ctx} />
            <EditableRow label="Data de Nascimento" field="data_nascimento" type="date" ctx={ctx} />
            <EditableRow label="Idade" field="idade" type="number" readOnly ctx={ctx} />
            <EditableRow label="Nacionalidade" field="nacionalidade" type="select" ctx={ctx} />
          </InfoCard>

          <InfoCard title="Contato" icon={Mail}>
            <EditableRow label="Email" field="email" ctx={ctx} />
            <EditableRow label="Telefone" field="telefone" ctx={ctx} />
            <EditableRow label="Cidade" field="cidade" ctx={ctx} />
            <EditableRow label="Estado" field="estado" ctx={ctx} />
            <EditableRow label="País" field="pais" type="select" ctx={ctx} />
          </InfoCard>

          <InfoCard title="Graduação e Arbitragem" icon={Award}>
            <EditableRow label="Graduação (Kyu/Dan)" field="kyu_dan_id" type="select" ctx={ctx} />
            <EditableRow label="Nível de Arbitragem" field="nivel_arbitragem" type="select" ctx={ctx} />
            <EditableRow label="Tamanho do Patch" field="tamanho_patch" type="select" ctx={ctx} />
            <EditableRow label="Cor do Patch" field="cor_patch" type="select" ctx={ctx} />
            <EditableRow label="Nome no Patch" field="nome_patch" ctx={ctx} />
          </InfoCard>

          <InfoCard title="Academia" icon={Building2}>
            <EditableRow label="Academia" field="academias" readOnly ctx={ctx} />
          </InfoCard>

          <InfoCard title="Plano e Filiação" icon={CreditCard}>
            {editMode && canEdit && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 text-sm">Federação</span>
                  <select
                    value={federacaoFiltro}
                    onChange={e => {
                      setFederacaoFiltro(e.target.value);
                      setField("academia_id", "");
                    }}
                    className={selectCls}
                  >
                    <option value="">Todas as Federações</option>
                    {federacoes.map(f => (
                      <option key={f.id} value={f.id}>{f.nome || f.sigla}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 text-sm">Academia</span>
                  <select
                    value={String(formData.academia_id ?? "")}
                    onChange={e => setField("academia_id", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Selecione uma academia</option>
                    {academiasFiltradas.map(a => (
                      <option key={a.id} value={a.id}>{a.nome || a.sigla}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <EditableRow label="Data de Adesão" field="data_adesao" type="date" ctx={ctx} />
            <EditableRow label="Tipo de Plano" field="plano_tipo" type="select" ctx={ctx} />
            <EditableRow label="Status do Plano" field="status_plano" type="select" ctx={ctx} />
            <EditableRow label="Data de Expiração" field="data_expiracao" type="date" ctx={ctx} />
            <EditableRow label="Status do Membro" field="status_membro" type="select" ctx={ctx} />
            <EditableRow label="Lote" field="lote_id" ctx={ctx} />
          </InfoCard>

          {/* Acesso */}
          <InfoCard title="Acesso" icon={ShieldCheck}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-sm">Nome de Usuário</span>
                {editMode && (isMaster || isFederacao || roles.some(r => r.role === 'professor') || isSelfAthlete) ? (
                  <input
                    value={stNomeUsuario}
                    onChange={e => setStNomeUsuario(e.target.value)}
                    className={inputCls}
                    placeholder="nome_usuario"
                  />
                ) : (
                  <span className="text-gray-200 text-sm font-medium">{stNomeUsuario || '—'}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-sm">Nível de Acesso</span>
                {editMode && isMaster ? (
                  <select value={stRole} onChange={e => setStRole(e.target.value)} className={selectCls}>
                    <option value="">Selecione</option>
                    {['atleta', 'professor', 'federacao_admin', 'master_access'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-200 text-sm font-medium">{stRole || '—'}</span>
                )}
              </div>
              {/* Candidato toggle — federacao_admin or master */}
              {(isMaster || isFederacao) && (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-gray-400 text-sm">Candidato PROFEP</span>
                  {editMode ? (
                    <button
                      onClick={() => setStCandidato(v => !v)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${stCandidato ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-400'}`}
                    >
                      {stCandidato ? 'Sim' : 'Não'}
                    </button>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stCandidato ? 'bg-emerald-600/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}>
                      {stCandidato ? 'Sim' : 'Não'}
                    </span>
                  )}
                </div>
              )}

              {editMode && (isMaster || isFederacao || roles.some(r => r.role === 'professor') || isSelfAthlete) && (
                <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
                  <span className="text-gray-400 text-sm">Nova Senha</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={inputCls}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                  />
                  {newPassword.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!atletaId) return;
                        setSavingPassword(true);
                        try {
                          const res = await fetch(`/api/atletas/${atletaId}/update-password`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: newPassword }),
                          });
                          const json = await res.json();
                          if (!res.ok) throw new Error(json.error || 'Erro ao alterar senha');
                          setNewPassword('');
                          setMessage('Senha alterada com sucesso.');
                        } catch (err: any) {
                          setMessage(err.message || 'Erro ao alterar senha.');
                        } finally {
                          setSavingPassword(false);
                        }
                      }}
                      disabled={savingPassword || newPassword.length < 6}
                      className="self-start px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar Senha'}
                    </button>
                  )}
                </div>
              )}
              {editMode && (isMaster || isFederacao || roles.some(r => r.role === 'professor') || isSelfAthlete) && (
                <button
                  onClick={async () => {
                    if (!atletaId) return;
                    setSavingStakeholder(true);
                    try {
                      const body: Record<string, unknown> = { nome_usuario: stNomeUsuario };
                      if (isMaster) body.role = stRole;
                      if (isMaster || isFederacao) body.candidato = stCandidato;
                      const res = await fetch(`/api/atletas/${atletaId}/update-stakeholder`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
                      setStNomeUsuario(json.data.nome_usuario ?? '');
                      setStRole(json.data.role ?? '');
                      setMessage('Dados de acesso salvos.');
                    } catch (err: any) {
                      setMessage(err.message || 'Erro ao salvar acesso.');
                    } finally {
                      setSavingStakeholder(false);
                    }
                  }}
                  disabled={savingStakeholder}
                  className="self-start px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {savingStakeholder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Acesso'}
                </button>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Documentos" icon={FileText}>
            {atleta.url_documento_id && (
              <a href={atleta.url_documento_id} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline break-all">Ver Documento de Identidade</a>
            )}
            {atleta.url_certificado_dan && (
              <a href={atleta.url_certificado_dan} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline break-all">Ver Certificado Dan</a>
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
              <textarea value={String(formData.observacoes ?? "")} onChange={e => setField("observacoes", e.target.value)} rows={4}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white" />
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap">{atleta.observacoes || "—"}</p>
            )}
          </div>
        )}

        {/* Documentos Gerados */}
        <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
          <AtletaDocumentos
            atletaId={atleta.stakeholder_id}
            statusMembro={atleta.status_membro}
            kyuDanId={atleta.kyu_dan_id != null ? Number(atleta.kyu_dan_id) : null}
          />
        </div>

        {/* Log de Alterações */}
        {auditLogs.length > 0 && (
          <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Log de Alterações</h2>
            </div>
            <div className="space-y-2">
              {auditLogs.map(log => {
                const dt = new Date(log.created_at)
                const dateStr = dt.toLocaleDateString('pt-BR')
                const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const actionLabel: Record<string, string> = {
                  update_fed: 'Dados de filiação',
                  update_stakeholder: 'Dados de acesso',
                  update_password: 'Senha',
                  update_role: 'Nível de acesso',
                }
                return (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm border-b border-white/5 pb-2">
                    <span className="text-gray-500 text-xs whitespace-nowrap">{dateStr} {timeStr}</span>
                    <span className="text-gray-300 font-medium">{log.actor_nome || '—'}</span>
                    <span className="text-gray-500">alterou</span>
                    <span className="text-blue-300">{actionLabel[log.action] || log.action}</span>
                    {log.fields?.length > 0 && (
                      <span className="text-gray-500 text-xs">({log.fields.join(', ')})</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
