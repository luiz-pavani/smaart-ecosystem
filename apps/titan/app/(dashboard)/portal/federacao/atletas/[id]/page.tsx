"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, User, Mail, Phone, MapPin, Calendar, Award, Building2, FileText, Image as ImageIcon, CreditCard, CheckCircle } from "lucide-react";

export default function AtletaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [atleta, setAtleta] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Regex para detectar UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(params.id);
        
        let data = null;
        let error = null;
        
        if (isUUID) {
          // Se parece UUID, busca por id
          const result = await supabase
            .from("user_fed_lrsj")
            .select("*")
            .eq("id", params.id)
            .maybeSingle();
          data = result.data;
          error = result.error;
        } else {
          // Senão, busca por numero_membro (sempre como string)
          const result = await supabase
            .from("user_fed_lrsj")
            .select("*")
            .eq("numero_membro", String(params.id))
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
        
        if (error) {
          console.error("Erro ao buscar atleta:", error);
        }
        if (!data) {
          console.log("Atleta não encontrado para ID/numero_membro:", params.id);
        } else {
          console.log("Atleta carregado:", data.nome_completo);
        }
        
        setAtleta(data);
      } catch (err) {
        console.error("Erro inesperado ao carregar atleta:", err);
        setAtleta(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, supabase]);

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
    <div className="flex justify-between items-start">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-200 text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );

  const StatusBadge = ({ status }: any) => {
    const colors: any = {
      'Active': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Expired': 'bg-red-500/20 text-red-300 border-red-500/30',
      'approved': 'bg-green-500/20 text-green-300 border-green-500/30',
      'pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'rejected': 'bg-red-500/20 text-red-300 border-red-500/30'
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
                  alt={atleta.nome_completo}
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
                    {atleta.graduacao}
                  </div>
                )}
                {atleta.dan && (
                  <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg border border-purple-500/30 font-semibold">
                    Dan: {atleta.dan}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {atleta.status_plano && <StatusBadge status={atleta.status_plano} />}
                {atleta.status_membro && <StatusBadge status={atleta.status_membro} />}
              </div>
            </div>
          </div>
        </div>

        {/* Grid de informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <InfoCard title="Dados Pessoais" icon={User}>
            <InfoRow label="Número de Membro" value={atleta.numero_membro} />
            <InfoRow label="Gênero" value={atleta.genero} />
            <InfoRow label="Data de Nascimento" value={atleta.data_nascimento} />
            <InfoRow label="Idade" value={atleta.idade} />
            <InfoRow label="Nacionalidade" value={atleta.nacionalidade} />
          </InfoCard>

          {/* Contato */}
          <InfoCard title="Contato" icon={Mail}>
            <InfoRow label="Email" value={atleta.email} />
            <InfoRow label="Telefone" value={atleta.telefone} />
            <InfoRow label="Cidade" value={atleta.cidade} />
            <InfoRow label="Estado" value={atleta.estado} />
            <InfoRow label="Residência" value={atleta.endereco_residencia} />
          </InfoCard>

          {/* Graduação e Arbitragem */}
          <InfoCard title="Graduação e Arbitragem" icon={Award}>
            <InfoRow label="Graduação" value={atleta.graduacao} />
            <InfoRow label="Nível Dan" value={atleta.dan} />
            <InfoRow label="Nível de Arbitragem" value={atleta.nivel_arbitragem} />
            <InfoRow label="Tamanho do Patch" value={atleta.tamanho_patch} />
            <InfoRow label="Nome no Patch" value={atleta.nome_patch} />
          </InfoCard>

          {/* Academia */}
          <InfoCard title="Academia" icon={Building2}>
            <InfoRow label="Academia" value={atleta.academias} />
            <InfoRow label="ID da Academia" value={atleta.academia_id} />
          </InfoCard>

          {/* Plano e Status */}
          <InfoCard title="Plano e Filiação" icon={CreditCard}>
            <InfoRow label="Data de Adesão" value={atleta.data_adesao} />
            <InfoRow label="Tipo de Plano" value={atleta.plano_tipo} />
            <InfoRow label="Status do Plano" value={atleta.status_plano} />
            <InfoRow label="Data de Expiração" value={atleta.data_expiracao} />
            <InfoRow label="Status do Membro" value={atleta.status_membro} />
            <InfoRow label="Lote" value={atleta.lote_id} />
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
        {atleta.observacoes && (
          <div className="mt-6 bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Observações</h2>
            </div>
            <p className="text-gray-300 whitespace-pre-wrap">{atleta.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
