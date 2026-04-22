'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Calendar,
  MapPin,
  ExternalLink,
  Filter,
  Search,
  Award,
  LocateFixed,
} from 'lucide-react';
import Link from 'next/link';

type EventRow = {
  id: string;
  title: string;
  date: string;
  category: string;
  location: string;
  registration_url: string;
  poster_url: string | null;
  is_featured: boolean | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  country_code: string | null;
};

const NEARBY_RADIUS_KM = 800;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const CATEGORIES = ['Todas', 'BJJ (Gi)', 'No-Gi', 'Judô', 'MMA'];
const DATE_FILTERS = [
  { value: 'all', label: 'Qualquer data' },
  { value: '7d', label: 'Próximos 7 dias' },
  { value: '30d', label: 'Próximos 30 dias' },
  { value: '90d', label: 'Próximos 90 dias' },
] as const;

type DateFilter = (typeof DATE_FILTERS)[number]['value'];

export default function Home() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterDate, setFilterDate] = useState<DateFilter>('all');
  const [locationHint, setLocationHint] = useState<string>('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );

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
        setEvents((data || []) as EventRow[]);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const detectLocation = () => {
    if (userCoords) {
      setUserCoords(null);
      setLocationHint('');
      return;
    }
    if (!('geolocation' in navigator)) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10&accept-language=pt-BR`
          );
          const j = await res.json();
          const city: string =
            j.address?.city ||
            j.address?.town ||
            j.address?.municipality ||
            j.address?.state ||
            '';
          if (city) setLocationHint(city);
        } catch {
          // ignore geocode errors
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const horizonDays =
      filterDate === '7d' ? 7 : filterDate === '30d' ? 30 : filterDate === '90d' ? 90 : null;
    const horizon = horizonDays
      ? new Date(now.getTime() + horizonDays * 86400000)
      : null;

    const q = searchTerm.trim().toLowerCase();

    const passes = events.filter((event) => {
      const matchesSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q);
      const matchesCategory =
        filterCategory === 'Todas' || event.category === filterCategory;
      if (!matchesSearch || !matchesCategory) return false;

      if (horizon) {
        const d = new Date(event.date + 'T12:00:00');
        if (d < now || d > horizon) return false;
      }

      if (userCoords) {
        if (event.latitude == null || event.longitude == null) return false;
        const km = haversineKm(
          userCoords.lat,
          userCoords.lon,
          event.latitude,
          event.longitude
        );
        if (km > NEARBY_RADIUS_KM) return false;
      }
      return true;
    });

    // Sort: featured → Brasil → (distance if geo) → date
    const isBR = (e: EventRow) =>
      e.country_code === 'br' ||
      /\s-\s[A-Z]{2}$/i.test(e.location) ||
      /\/[A-Z]{2}$/i.test(e.location) ||
      /brasil/i.test(e.location);

    return passes.slice().sort((a, b) => {
      const af = a.is_featured ? 1 : 0;
      const bf = b.is_featured ? 1 : 0;
      if (af !== bf) return bf - af;

      const ab = isBR(a) ? 1 : 0;
      const bb = isBR(b) ? 1 : 0;
      if (ab !== bb) return bb - ab;

      if (userCoords && a.latitude && a.longitude && b.latitude && b.longitude) {
        const da = haversineKm(userCoords.lat, userCoords.lon, a.latitude, a.longitude);
        const db = haversineKm(userCoords.lat, userCoords.lon, b.latitude, b.longitude);
        if (da !== db) return da - db;
      }

      return a.date.localeCompare(b.date);
    });
  }, [events, searchTerm, filterCategory, filterDate, userCoords]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600/30">
      {/* Header / Nav */}
      <nav className="border-b border-zinc-900 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-red-600" />
            <h1 className="font-heading text-2xl font-bold uppercase tracking-tight">
              Vou<span className="text-red-600">Lutar</span>.com
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/organizador/login"
              className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Área do Organizador
            </Link>
            <Link
              href="/organizador/dashboard/novo"
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all"
            >
              Divulgar Evento
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/15 via-black to-black pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <h2 className="font-heading text-5xl md:text-7xl font-bold uppercase tracking-tight leading-none">
            O Maior{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
              Agregador
            </span>{' '}
            de Lutas
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Encontre campeonatos de Jiu-Jitsu, Judô, Submission e MMA espalhados
            por diversas plataformas em um único lugar.
          </p>

          {/* Search + Geo */}
          <div className="mt-10 flex flex-col md:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome, cidade ou estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-red-600 outline-none transition-all shadow-xl"
              />
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={geoLoading}
              className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-all shadow-xl border disabled:opacity-50 ${
                userCoords
                  ? 'bg-red-600/10 border-red-600 text-red-300 hover:bg-red-600/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-red-600'
              }`}
              title={userCoords ? 'Remover filtro de localização' : 'Buscar eventos em até 800 km'}
            >
              <LocateFixed
                className={`w-5 h-5 ${
                  geoLoading
                    ? 'animate-pulse text-red-500'
                    : userCoords
                      ? 'text-red-400'
                      : 'text-zinc-400'
                }`}
              />
              <span className="text-sm font-semibold hidden md:inline">
                {geoLoading
                  ? 'Localizando…'
                  : userCoords
                    ? 'Remover 800 km'
                    : 'Perto de mim (800 km)'}
              </span>
            </button>
          </div>

          {/* Filters: category + date */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-red-600 outline-none appearance-none transition-all cursor-pointer shadow-xl text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value as DateFilter)}
                className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-xl focus:border-red-600 outline-none appearance-none transition-all cursor-pointer shadow-xl text-white"
              >
                {DATE_FILTERS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {userCoords && (
            <p className="text-xs text-zinc-500 mt-2">
              Mostrando eventos em até{' '}
              <span className="text-red-500 font-semibold">800 km</span>
              {locationHint && (
                <>
                  {' '}de{' '}
                  <span className="text-red-500 font-semibold">{locationHint}</span>
                </>
              )}
              .
            </p>
          )}
        </div>
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-heading text-2xl font-bold uppercase tracking-wider">
            Próximos Eventos
          </h3>
          <span className="text-zinc-500 text-sm font-semibold">
            {filteredEvents.length} eventos encontrados
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-96 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 text-lg">
              Nenhum evento encontrado com esses filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`group bg-zinc-900 border rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  event.is_featured
                    ? 'border-red-600/50 shadow-red-900/20'
                    : 'border-zinc-800'
                }`}
              >
                {/* Poster / Fallback */}
                <div className="h-48 bg-zinc-800 relative overflow-hidden">
                  {event.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      Destaque
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-zinc-700 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                    {event.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h4 className="font-heading text-xl font-semibold uppercase leading-tight group-hover:text-red-500 transition-colors line-clamp-2">
                    {event.title}
                  </h4>

                  <div className="space-y-2 text-zinc-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        {new Date(event.date + 'T12:00:00').toLocaleDateString(
                          'pt-BR',
                          { day: '2-digit', month: 'long', year: 'numeric' }
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {event.location}
                        {userCoords && event.latitude != null && event.longitude != null && (
                          <span className="text-zinc-500 ml-1">
                            · {Math.round(
                              haversineKm(
                                userCoords.lat,
                                userCoords.lon,
                                event.latitude,
                                event.longitude
                              )
                            )} km
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${
                      event.is_featured
                        ? 'bg-red-600 hover:bg-red-700 text-white'
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
        <p>
          © {new Date().getFullYear()} VouLutar.com. O maior agregador de
          eventos de artes marciais.
        </p>
      </footer>
    </div>
  );
}
