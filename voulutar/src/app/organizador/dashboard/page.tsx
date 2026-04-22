"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ExternalLinkIcon, PlusCircleIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface MyEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  location: string;
  status: string;
  registration_url: string;
}

export default function DashboardOrganizador() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/organizador/login");
        return;
      }
      setUser(user);

      const { data: myEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Erro ao carregar eventos");
      } else {
        setEvents(myEvents || []);
      }
      setLoading(false);
    };

    fetchUserAndEvents();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-600 text-white">Publicado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando painel...</div>;
  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Painel do Organizador</h1>
          <p className="text-muted-foreground mt-1">
            Olá, <span className="font-mono text-foreground">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/organizador/dashboard/novo">
            <Button className="gap-2">
              <PlusCircleIcon className="w-4 h-4" />
              Novo Evento
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>Sair</Button>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-xl font-semibold">Meus Eventos</h2>
      </div>

      {events.length === 0 ? (
        <div className="bg-muted p-12 rounded-lg text-center border border-dashed border-border flex flex-col items-center">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhum evento cadastrado</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Você ainda não cadastrou nenhum evento. Clique no botão abaixo para adicionar seu primeiro campeonato.
          </p>
          <Link href="/organizador/dashboard/novo">
            <Button>Cadastrar Novo Evento</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => (
            <Card key={evt.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <Badge variant="outline" className="uppercase text-[10px]">{evt.category}</Badge>
                  {getStatusBadge(evt.status)}
                </div>
                <CardTitle className="line-clamp-1">{evt.title}</CardTitle>
                <CardDescription className="flex items-center mt-2">
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  {new Date(evt.date).toLocaleDateString('pt-BR')}
                </CardDescription>
                <CardDescription className="flex items-center mt-1 line-clamp-1">
                  <MapPinIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  {evt.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 flex gap-2">
                <Link href={evt.registration_url} target="_blank" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  Link de Inscrição <ExternalLinkIcon className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
