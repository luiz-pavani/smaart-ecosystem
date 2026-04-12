'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, ExternalLink, Filter, Search, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Event = {
  id: string;
  title: string;
  date: string;
  category: string;
  location: string;
  registration_url: string;
  poster_url: string | null;
  is_featured: boolean;
};

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }

    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Todas' || event.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-600/30">
      {/* Header / Nav */}
      <nav className="border-b border-zinc-900 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-orange-600" />
            <h1 className="text-2xl font-extrabold uppercase tracking-tighter">
              Vou<span className="text-orange-600">Lutar</span>.com
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/organizador" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Área do Organizador
            </Link>
            <Link 
              href="/organizador"
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
            >
              Divulgar Evento
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-600/10 to-black pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-tight">
            O Maior <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Agregador</span> de Lutas
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Encontre campeonatos de Jiu-Jitsu, Judô, Submission e MMA espalhados por diversas plataformas em um único lugar.
          </p>

          {/* Search Bar */}
          <div className="mt-10 flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar por nome, cidade ou estado..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-orange-600 outline-none transition-all shadow-xl"
              />
            </div>
            <div className="relative md:w-48">
              <Filter className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-orange-600 outline-none appearance-none transition-all cursor-pointer shadow-xl"
              >
                <option>Todas</option>
                <option>BJJ (Gi)</option>
                <option>No-Gi</option>
                <option>Judô</option>
                <option>MMA</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold uppercase tracking-wider">
            Próximos Eventos
          </h3>
          <span className="text-zinc-500 text-sm font-semibold">{filteredEvents.length} eventos encontrados</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 text-lg">Nenhum evento encontrado com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div 
                key={event.id} 
                className={`group bg-zinc-900 border rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  event.is_featured ? 'border-orange-600/50 shadow-orange-900/20' : 'border-zinc-800'
                }`}
              >
                {/* Poster / Fallback */}
                <div className="h-48 bg-zinc-800 relative overflow-hidden">
                  {event.poster_url ? (
                    <img 
                      src={event.poster_url} 
                      alt={`Cartaz ${event.title}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                      <Award className="w-16 h-16 text-zinc-800" />
                    </div>
                  )}
                  {event.is_featured && (
                    <div className="absolute top-4 right-4 bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      Destaque
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-zinc-700 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {event.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h4 className="text-xl font-bold leading-tight group-hover:text-orange-500 transition-colors line-clamp-2">
                    {event.title}
                  </h4>
                  
                  <div className="space-y-2 text-zinc-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{event.location}</span>
                    </div>
                  </div>

                  <a 
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
                      event.is_featured 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    Inscrever-se 
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 mt-24 text-center text-zinc-500">
        <p>© {new Date().getFullYear()} VouLutar.com. O maior agregador de eventos de artes marciais.</p>
      </footer>
    </div>
  );
}