'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Link, Image as ImageIcon, PlusCircle, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import { Session } from '@supabase/supabase-js';

export default function NovoEvento() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [meusEventos, setMeusEventos] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    category: 'BJJ (Gi)',
    location: '',
    registration_url: '',
    is_featured: false,
  });

  const [posterFile, setPosterFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMeusEventos = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setMeusEventos(data);
    }
  };

  useEffect(() => {
    if (session) {
      fetchMeusEventos();
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPosterFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      if (!session?.user) throw new Error('Sessão expirada. Faça login novamente.');

      let poster_url = null;
      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-posters')
          .upload(filePath, posterFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('event-posters')
          .getPublicUrl(filePath);
          
        poster_url = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('events')
        .insert([
          {
            title: formData.name,
            date: formData.date,
            category: formData.category,
            location: formData.location,
            registration_url: formData.registration_url,
            is_featured: formData.is_featured,
            poster_url: poster_url,
            user_id: session.user.id,
            status: 'pending'
          }
        ]);

      if (insertError) throw insertError;

      setSucesso(true);
      setFormData({
        name: '', date: '', category: 'BJJ (Gi)', location: '', registration_url: '', is_featured: false
      });
      setPosterFile(null);
      fetchMeusEventos();

    } catch (err: any) {
      console.error('Erro ao salvar evento:', err);
      setErro(err.message || 'Ocorreu um erro ao salvar o evento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 border border-orange-600/30 bg-zinc-900 p-8 rounded-xl">
          <CheckCircle2 className="w-16 h-16 text-orange-600 mx-auto" />
          <h1 className="text-2xl font-bold">Evento Enviado!</h1>
          <p className="text-zinc-400">Seu evento será analisado e aparecerá na vitrine em breve.</p>
          <button 
            onClick={() => setSucesso(false)}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all"
          >
            Cadastrar outro evento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 flex justify-between items-end border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold uppercase tracking-tighter">
              Vou<span className="text-orange-600">Lutar</span>.com
            </h1>
            <p className="text-zinc-400 mt-2">Painel do Organizador</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </header>

        {erro && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{erro}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl mb-12">
          <div className="space-y-4">
            <label className="block text-sm font-semibold uppercase text-orange-600 tracking-wider">Informações Básicas</label>
            
            <div className="relative">
              <input 
                required
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                type="text" 
                placeholder="Nome do Evento (ex: Copa Sul de BJJ)" 
                className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
              />
              <PlusCircle className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input 
                  required
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  type="date" 
                  className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
                />
                <Calendar className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
              </div>
              <div className="relative">
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none appearance-none"
                >
                  <option>BJJ (Gi)</option>
                  <option>No-Gi</option>
                  <option>Judô</option>
                  <option>MMA</option>
                </select>
                <div className="absolute left-4 top-4 text-zinc-500">🥊</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold uppercase text-orange-600 tracking-wider">Localização e Inscrição</label>
            <div className="relative">
              <input 
                required
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                type="text" 
                placeholder="Cidade / Estado / Ginásio" 
                className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
              />
              <MapPin className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
            </div>
            <div className="relative">
              <input 
                required
                name="registration_url"
                value={formData.registration_url}
                onChange={handleInputChange}
                type="url" 
                placeholder="Link Original para Inscrição (Smoothcomp, etc)" 
                className="w-full bg-zinc-950 border border-zinc-800 p-4 pl-12 rounded-lg focus:border-orange-600 outline-none transition-all"
              />
              <Link className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold uppercase text-orange-600 tracking-wider">Material Visual</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="poster-upload"
              />
              <div className={`border-2 border-dashed border-zinc-800 hover:border-orange-600/50 p-8 rounded-xl text-center transition-all bg-zinc-950 ${posterFile ? 'border-orange-600/50' : ''}`}>
                <ImageIcon className={`w-10 h-10 mx-auto mb-2 ${posterFile ? 'text-orange-500' : 'text-zinc-600'}`} />
                <p className="text-zinc-500 text-sm">
                  {posterFile ? posterFile.name : 'Clique ou arraste para subir o cartaz oficial (JPEG/PNG)'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-zinc-800 rounded-xl bg-zinc-950 cursor-pointer hover:border-orange-600/30 transition-all">
              <input 
                type="checkbox" 
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleInputChange}
                className="w-5 h-5 accent-orange-600 cursor-pointer" 
              />
              <div>
                <p className="font-semibold text-white">Destacar Evento</p>
                <p className="text-zinc-500 text-xs mt-1">Sinaliza o desejo de aparecer no banner principal (Requer pagamento posterior).</p>
              </div>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-lg font-bold rounded-lg uppercase tracking-widest transition-all ${
              loading ? 'bg-zinc-800 cursor-not-allowed text-zinc-500' : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white'
            }`}
          >
            {loading ? 'Processando...' : 'Publicar Evento'}
          </button>
        </form>

        {meusEventos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-6">Meus Eventos</h2>
            <div className="space-y-4">
              {meusEventos.map((evento) => (
                <div key={evento.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{evento.title}</h3>
                    <p className="text-zinc-500 text-sm flex gap-2">
                      <span>{new Date(evento.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{evento.category}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                      evento.status === 'published' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                      evento.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                      'bg-red-900/50 text-red-400 border border-red-800'
                    }`}>
                      {evento.status === 'published' ? 'Aprovado' :
                       evento.status === 'pending' ? 'Em Análise' : 'Rejeitado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}