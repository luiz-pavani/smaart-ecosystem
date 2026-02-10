"use client";

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Upload, FileText, CheckCircle, Clock, XCircle, 
  Loader2, Award, Zap, ExternalLink, Trash2 
} from 'lucide-react';

export default function UploadDocumentos({ userId, entityId }: { userId: string, entityId: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [avaCertificates, setAvaCertificates] = useState<any[]>([]);
  const [category, setCategory] = useState('Certificado Externo');

  const loadData = async () => {
    // 1. Carregar documentos manuais (Auditoria)
    const { data: docs } = await supabase
      .from('entity_documents')
      .select('*')
      .eq('profile_id', userId)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    
    // 2. Sincronizar Certificados do AVA (Padrão Profep MAX)
    const { data: ava } = await supabase
      .from('user_courses')
      .select('*, courses(title)')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (docs) setDocuments(docs);
    if (ava) setAvaCertificates(ava);
  };

  useEffect(() => { loadData(); }, [userId, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      
      // Validação Extra de Sessão para evitar erro de RLS
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão não identificada.");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${entityId}/${fileName}`;

      // 1. Upload para o Storage (Bucket: 'federation-docs')
      const { error: uploadError } = await supabase.storage
        .from('federation-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('federation-docs')
        .getPublicUrl(filePath);

      // 2. Inserção na Tabela (Aqui ocorria o erro de RLS)
      // Usamos user.id (vido da sessão) em vez de userId (vindo da prop) por segurança
      const { error: dbError } = await supabase.from('entity_documents').insert({
        profile_id: user.id,
        entity_id: entityId,
        category: category,
        file_url: publicUrl,
        file_name: file.name,
        status: 'Pendente'
      });

      if (dbError) throw dbError;

      loadData();
      alert("Documento enviado para análise!");
    } catch (error: any) {
      console.error("Erro no Upload:", error.message);
      alert("Erro de permissão: Certifique-se de que o Bucket e a Tabela têm políticas de RLS ativas.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* Certificados Profep MAX */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
           <Zap size={14} /> Certificados Profep MAX (Sincronizados)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {avaCertificates.length > 0 ? avaCertificates.map((cert) => (
            <div key={cert.id} className="bg-red-600/5 border border-red-600/20 p-5 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600/20 rounded-2xl text-red-500"><Award size={20} /></div>
                <div>
                  <div className="text-xs font-black uppercase italic text-white">{cert.courses?.title}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold">AVA Oficial</div>
                </div>
              </div>
              <CheckCircle size={18} className="text-green-500" />
            </div>
          )) : (
            <div className="col-span-2 py-8 text-center border border-dashed border-white/5 rounded-3xl text-[10px] text-slate-500 uppercase font-black">Nenhum certificado do AVA encontrado.</div>
          )}
        </div>
      </section>

      {/* Upload de Documentos Externos */}
      <section className="space-y-6">
        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
           <FileText size={14} /> Documentação Complementar
        </h3>
        
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[40px] p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Categoria</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:border-red-500 text-white appearance-none"
            >
              <option value="Identidade">Identidade (RG/CNH)</option>
              <option value="Certificado Externo">Certificado Externo</option>
              <option value="Curriculo">Currículo Desportivo</option>
            </select>
          </div>

          <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group">
            {uploading ? <Loader2 className="animate-spin text-red-600" /> : <Upload className="text-slate-500 group-hover:text-white" />}
            <span className="text-[10px] font-black uppercase mt-2">{uploading ? 'Processando...' : 'Fazer Upload'}</span>
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl flex items-center justify-between group transition-all hover:bg-white/[0.04]">
              <div className="flex items-center gap-4">
                <FileText size={18} className="text-slate-500" />
                <div>
                  <div className="text-[10px] font-black uppercase italic text-slate-200">{doc.category}</div>
                  <div className="text-[9px] text-slate-500 font-mono">{doc.file_name}</div>
                </div>
              </div>
              <div className={`text-[9px] font-black uppercase flex items-center gap-2 ${
                doc.status === 'Aprovado' ? 'text-green-500' : 
                doc.status === 'Rejeitado' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {doc.status} {doc.status === 'Aprovado' ? <CheckCircle size={12} /> : <Clock size={12} />}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}