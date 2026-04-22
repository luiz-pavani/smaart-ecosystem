import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon, ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 60; // revalidate every minute

interface EventData {
  id: string;
  name?: string;
  title?: string;
  url?: string;
  registration_url?: string;
  start_date?: string;
  date?: string;
  location: string;
  poster_url?: string;
  source?: string;
  modalities?: string[];
  category?: string;
  status: string;
}

export default async function Home() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .order('start_date', { ascending: true, nullsFirst: false });

  // Se a tabela usar as colunas antigas, tentamos buscar de novo com order('date')
  let finalEvents = events;
  if (error || !events) {
    const fallback = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: true });
    finalEvents = fallback.data || [];
  }

  return (
    <main className="container mx-auto py-10 px-4 max-w-7xl">
      <div className="flex flex-col items-center justify-center space-y-4 mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">VouLutar</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          O maior portal de eventos de artes marciais. Encontre e participe das próximas competições perto de você.
        </p>
      </div>

      {finalEvents && finalEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalEvents.map((evt: EventData) => {
            const eventName = evt.name || evt.title || 'Evento sem nome';
            const eventDate = evt.start_date || evt.date || '';
            const eventUrl = evt.url || evt.registration_url || '#';
            const mods = evt.modalities || (evt.category ? [evt.category] : []);
            
            // Format date if valid
            let formattedDate = eventDate;
            try {
              if (eventDate) {
                const dateObj = new Date(eventDate);
                if (!isNaN(dateObj.getTime())) {
                  formattedDate = new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }).format(dateObj);
                }
              }
            } catch (e) {}

            return (
              <Card key={evt.id || eventUrl} className="overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                <div className="h-48 w-full bg-muted relative overflow-hidden flex items-center justify-center">
                  {evt.poster_url ? (
                    <img 
                      src={evt.poster_url} 
                      alt={eventName}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-muted-foreground font-medium">Sem imagem</div>
                  )}
                  {evt.source && (
                    <Badge variant="secondary" className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm">
                      {evt.source}
                    </Badge>
                  )}
                </div>
                
                <CardHeader className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {mods.map((mod: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs uppercase">
                        {mod}
                      </Badge>
                    ))}
                  </div>
                  <CardTitle className="line-clamp-2 text-xl">{eventName}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 pb-6">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{formattedDate || 'Data a definir'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPinIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="line-clamp-1" title={evt.location}>{evt.location || 'Local a definir'}</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Link 
                    href={eventUrl}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                  >
                    Ver Evento
                    <ExternalLinkIcon className="ml-2 h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground border border-dashed rounded-lg">
          Nenhum evento encontrado no momento.
        </div>
      )}
    </main>
  );
}
