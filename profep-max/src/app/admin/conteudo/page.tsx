"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Plus, Trash2, Edit3, Loader2, X, Save, 
  Image as ImageIcon, Play, ChevronLeft, Video, FileText, ClipboardCheck, ChevronRight, Zap 
} from "lucide-react";

export default function GestaoConteudo() {
  const [loading, setLoading] = useState(true);
  const [cursos, setCursos] = useState<any[]>([]);
  const [view, setView] = useState<'cursos' | 'detalhes'>('cursos');
  const [cursoSelecionado, setCursoSelecionado] = useState<any>(null);
  
  const [videos, setVideos] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [exames, setExames] = useState<any[]>([]);
  
  const [modalCurso, setModalCurso] = useState<any>(null);
  const [modalVideo, setModalVideo] = useState<any>(null);
  const [modalMaterial, setModalMaterial] = useState<any>(null);
  const [modalExame, setModalExame] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchCursos(); }, []);

  async function fetchCursos() {
    setLoading(true);
    const { data } = await supabase.from('cursos').select('*').order('created_at', { ascending: false });
    if (data) setCursos(data);
    setLoading(false);
  }

  async function fetchDetalhes(cursoId: string) {
    setLoading(true);
    const { data: vds } = await supabase.from('curso_videos').select('*').eq('curso_id', cursoId);
    const { data: mts } = await supabase.from('curso_materiais').select('*').eq('curso_id', cursoId);
    const { data: exs } = await supabase.from('avaliacoes').select('*').eq('curso_id', cursoId);
    
    setVideos(vds || []);
    setMateriais(mts || []);
    setExames(exs || []);
    setLoading(false);
  }

  const selecionarCurso = (curso: any) => {
    setCursoSelecionado(curso);
    fetchDetalhes(curso.id);
    setView('detalhes');
  };

  // --- LÓGICAS DE EXCLUSÃO (NOVO) ---
  async function handleDeleteItem(tabela: string, id: string) {
    if (!confirm("⚠️ ATENÇÃO: Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.")) return;
    
    const { error } = await supabase.from(tabela).delete().eq('id', id);
    if (!error) {
      fetchDetalhes(cursoSelecionado.id);
    } else {
      alert("Erro ao excluir: " + error.message);
    }
  }

  async function handleDeleteCurso(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("🚨 PERIGO: Isso excluirá o curso e TODOS os vídeos, materiais e exames vinculados a ele. Continuar?")) return;
    
    const { error } = await supabase.from('cursos').delete().eq('id', id);
    if (!error) fetchCursos();
  }

  async function handleSaveCurso(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      titulo: modalCurso.titulo,
      categoria: modalCurso.categoria,
      imagem_url: modalCurso.imagem_url,
      federation_scope: (modalCurso.federation_scope || 'ALL').toUpperCase(),
      gratuito: Boolean(modalCurso.gratuito)
    };

    const { error } = modalCurso.id
      ? await supabase.from('cursos').update(payload).eq('id', modalCurso.id)
      : await supabase.from('cursos').insert([payload]);

    if (!error) {
      setModalCurso(null);
      fetchCursos();
    } else {
      alert("Erro ao salvar: " + error.message);
    }

    setIsSubmitting(false);
  }

  // --- LÓGICAS DE SALVAR ---
  async function handleSaveExame(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { 
      titulo: modalExame.titulo, 
      media_aprovacao: Number(modalExame.media_aprovacao), 
      tema_obrigatorio: modalExame.tema_obrigatorio,
      curso_id: cursoSelecionado.id 
    };
    const { error } = modalExame.id 
      ? await supabase.from('avaliacoes').update(payload).eq('id', modalExame.id)
      : await supabase.from('avaliacoes').insert([payload]);
    if (!error) { setModalExame(null); fetchDetalhes(cursoSelecionado.id); }
    setIsSubmitting(false);
  }

  async function handleSaveVideo(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { titulo: modalVideo.titulo, url: modalVideo.url, curso_id: cursoSelecionado.id };
    const { error } = modalVideo.id 
      ? await supabase.from('curso_videos').update(payload).eq('id', modalVideo.id)
      : await supabase.from('curso_videos').insert([payload]);
    if (!error) { setModalVideo(null); fetchDetalhes(cursoSelecionado.id); }
    setIsSubmitting(false);
  }

  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { titulo: modalMaterial.titulo, url: modalMaterial.url, curso_id: cursoSelecionado.id };
    const { error } = modalMaterial.id 
      ? await supabase.from('curso_materiais').update(payload).eq('id', modalMaterial.id)
      : await supabase.from('curso_materiais').insert([payload]);
    if (!error) { setModalMaterial(null); fetchDetalhes(cursoSelecionado.id); }
    setIsSubmitting(false);
  }

  if (loading && view === 'cursos') return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-red-500" size={40} /></div>;

  return (
    <div className="p-8 lg:p-12 bg-black min-h-screen text-white font-sans">
      
      {view === 'cursos' && (
        <>
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Gestão <span className="text-red-500">Pedagógica</span></h1>
              <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mt-4 italic italic">Controle de Módulos e Grade Curricular</p>
            </div>
            <button onClick={() => setModalCurso({ titulo: '', categoria: '', imagem_url: '', federation_scope: 'ALL', gratuito: false })} className="bg-red-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all hover:bg-white hover:text-black shadow-lg shadow-red-600/20"><Plus size={16} /> Novo Módulo</button>
          </header>
          <div className="grid grid-cols-1 gap-4">
            {cursos.map((item) => (
              <div key={item.id} onClick={() => selecionarCurso(item)} className="bg-black border border-zinc-900 rounded-[32px] p-6 flex items-center justify-between group hover:border-red-500/50 transition-all cursor-pointer">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-14 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900 shrink-0">
                    {item.imagem_url ? <img src={item.imagem_url} className="w-full h-full object-cover opacity-40 group-hover:opacity-100" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800"><ImageIcon size={20}/></div>}
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase tracking-tight group-hover:text-red-500 transition-colors">{item.titulo}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-md">{item.categoria}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-zinc-500">{(item.federation_scope || 'ALL').toUpperCase()}</span>
                      {item.gratuito && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-400">Free</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <button onClick={(e) => { e.stopPropagation(); setModalCurso({ ...item, federation_scope: (item.federation_scope || 'ALL').toUpperCase(), gratuito: Boolean(item.gratuito) }); }} className="p-3 text-zinc-700 hover:text-white transition-all">
                      <Edit3 size={18} />
                   </button>
                   <button onClick={(e) => handleDeleteCurso(item.id, e)} className="p-3 text-zinc-800 hover:text-red-600 transition-all">
                      <Trash2 size={18} />
                   </button>
                   <ChevronRight className="text-zinc-800 group-hover:text-white" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'detalhes' && (
        <>
          <header className="mb-12">
            <button onClick={() => setView('cursos')} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 uppercase text-[10px] font-black tracking-widest transition-all"><ChevronLeft size={16} /> Voltar</button>
            <h1 className="text-4xl font-black italic uppercase leading-none">{cursoSelecionado?.titulo}</h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* VIDEOAULAS */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Video size={18} className="text-red-500" /> Videoaulas</h2>
                <button onClick={() => setModalVideo({ titulo: '', url: '' })} className="p-1 bg-zinc-900 rounded hover:bg-red-600 transition-all"><Plus size={16}/></button>
              </div>
              {videos.map(v => (
                <div key={v.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex justify-between items-center group">
                  <span className="text-[11px] font-bold uppercase truncate">{v.titulo}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalVideo(v)} className="text-zinc-600 hover:text-white"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteItem('curso_videos', v.id)} className="text-zinc-800 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            {/* MATERIAIS */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><FileText size={18} className="text-red-500" /> Materiais PDF</h2>
                <button onClick={() => setModalMaterial({ titulo: '', url: '' })} className="p-1 bg-zinc-900 rounded hover:bg-red-600 transition-all"><Plus size={16}/></button>
              </div>
              {materiais.map(m => (
                <div key={m.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex justify-between items-center group">
                  <span className="text-[11px] font-bold uppercase truncate">{m.titulo}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalMaterial(m)} className="text-zinc-600 hover:text-white"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteItem('curso_materiais', m.id)} className="text-zinc-800 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            {/* EXAMES */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><ClipboardCheck size={18} className="text-red-500" /> Exames</h2>
                <button onClick={() => setModalExame({ titulo: '', media_aprovacao: '80', tema_obrigatorio: '' })} className="p-1 bg-zinc-900 rounded hover:bg-red-600 transition-all"><Plus size={16}/></button>
              </div>
              {exames.map(e => (
                <div key={e.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex justify-between items-center group">
                  <div>
                    <span className="text-[11px] font-bold uppercase block">{e.titulo}</span>
                    <span className="text-[9px] text-zinc-600 font-black uppercase">Tema: {e.tema_obrigatorio || 'Geral'}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalExame(e)} className="text-zinc-600 hover:text-white"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteItem('avaliacoes', e.id)} className="text-zinc-800 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* MODAIS (MANTIDOS CONFORME ANTERIOR COM FIX DE INPUTS) */}
      {modalExame && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-10 rounded-[40px] shadow-2xl animate-in fade-in zoom-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase">Exame <span className="text-red-500">Inteligente</span></h2>
              <button onClick={() => setModalExame(null)} className="text-zinc-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveExame} className="space-y-4">
              <input required value={modalExame.titulo || ""} onChange={e => setModalExame({...modalExame, titulo: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white font-bold" placeholder="Título" />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" value={modalExame.media_aprovacao || ""} onChange={e => setModalExame({...modalExame, media_aprovacao: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white" placeholder="Média %" />
                <input required value={modalExame.tema_obrigatorio || ""} onChange={e => setModalExame({...modalExame, tema_obrigatorio: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white" placeholder="Tema" />
              </div>
              <button className="w-full bg-red-600 py-5 rounded-xl font-black uppercase text-xs">SALVAR EXAME</button>
            </form>
          </div>
        </div>
      )}

      {modalVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-10 rounded-[40px] animate-in fade-in zoom-in">
            <button onClick={() => setModalVideo(null)} className="absolute top-8 right-8 text-zinc-500"><X/></button>
            <form onSubmit={handleSaveVideo} className="space-y-4">
              <input required value={modalVideo.titulo || ""} onChange={e => setModalVideo({...modalVideo, titulo: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-bold" placeholder="Título" />
              <input required value={modalVideo.url || ""} onChange={e => setModalVideo({...modalVideo, url: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white text-xs" placeholder="URL" />
              <button className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase text-xs">SALVAR VÍDEO</button>
            </form>
          </div>
        </div>
      )}

      {modalMaterial && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-10 rounded-[40px] animate-in fade-in zoom-in">
            <button onClick={() => setModalMaterial(null)} className="absolute top-8 right-8 text-zinc-500"><X/></button>
            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <input required value={modalMaterial.titulo || ""} onChange={e => setModalMaterial({...modalMaterial, titulo: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-bold" placeholder="Nome do PDF" />
              <input required value={modalMaterial.url || ""} onChange={e => setModalMaterial({...modalMaterial, url: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white text-xs" placeholder="URL" />
              <button className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase text-xs">SALVAR MATERIAL</button>
            </form>
          </div>
        </div>
      )}

      {modalCurso && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-10 rounded-[40px] animate-in fade-in zoom-in relative">
            <button onClick={() => setModalCurso(null)} className="absolute top-8 right-8 text-zinc-500"><X/></button>
            <form onSubmit={handleSaveCurso} className="space-y-4">
              <input required value={modalCurso.titulo || ""} onChange={e => setModalCurso({...modalCurso, titulo: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white font-bold" placeholder="Título do Curso" />
              <input required value={modalCurso.categoria || ""} onChange={e => setModalCurso({...modalCurso, categoria: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white text-xs" placeholder="Categoria" />
              <input value={modalCurso.imagem_url || ""} onChange={e => setModalCurso({...modalCurso, imagem_url: e.target.value})} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white text-xs" placeholder="URL da Capa" />
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Disponibilidade</label>
                <select
                  value={(modalCurso.federation_scope || 'ALL').toUpperCase()}
                  onChange={(e) => setModalCurso({ ...modalCurso, federation_scope: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white text-xs"
                >
                  <option value="ALL">ALL (todas as federações)</option>
                  <option value="LRSJ">LRSJ</option>
                </select>
              </div>
              <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <input
                  type="checkbox"
                  checked={Boolean(modalCurso.gratuito)}
                  onChange={(e) => setModalCurso({ ...modalCurso, gratuito: e.target.checked })}
                  className="h-4 w-4 accent-emerald-500"
                />
                Disponível para Free
              </label>
              <button disabled={isSubmitting} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} SALVAR CURSO
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}