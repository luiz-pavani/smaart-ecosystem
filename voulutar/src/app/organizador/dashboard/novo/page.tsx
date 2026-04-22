"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

const eventSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres"),
  date: z.string().min(1, "A data é obrigatória"),
  category: z.string().min(2, "A categoria é obrigatória"),
  location: z.string().min(5, "O local é obrigatório"),
  registration_url: z.string().url("Insira uma URL válida"),
  poster_url: z.string().url("Insira uma URL válida").optional().or(z.literal("")),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function NovoEvento() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: "",
      category: "",
      location: "",
      registration_url: "",
      poster_url: "",
    },
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/organizador/login");
      } else {
        setUser(user);
      }
    };
    checkUser();
  }, [router]);

  async function onSubmit(data: EventFormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("events").insert({
        title: data.title,
        date: data.date,
        category: data.category,
        location: data.location,
        registration_url: data.registration_url,
        poster_url: data.poster_url || null,
        user_id: user.id,
        status: "pending", // Por padrão cai como pendente para aprovação
      });

      if (error) throw error;

      toast.success("Evento cadastrado com sucesso!");
      router.push("/organizador/dashboard");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao salvar o evento");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/organizador/dashboard" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Voltar ao Painel
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cadastrar Novo Evento</CardTitle>
          <CardDescription>
            Preencha os dados do campeonato. Ele passará por uma rápida revisão antes de ser publicado na vitrine principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Evento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Open Jiu-Jitsu Championship 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Evento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidade / Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jiu-Jitsu, Judô, Submission" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local / Ginásio</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ginásio do Ibirapuera - São Paulo, SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registration_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link para Inscrição (URL Oficial)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poster_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Cartaz (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://... (Link direto para a imagem)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting ? "Salvando..." : "Enviar Evento"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
