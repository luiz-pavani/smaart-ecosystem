import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function CursosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Criamos o cliente do Supabase para o lado do Servidor (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // O Middleware lida com a gravação de cookies na maioria das vezes
          }
        },
      },
    }
  );

  // 1. Verificamos se existe uma sessão ativa
  const { data: { session } } = await supabase.auth.getSession();

  // 2. Se NÃO estiver logado, manda para a página de login
  if (!session) {
    return redirect("/login");
  }

  // 3. Bypass para você (Admin)
  // Garante que você sempre tenha acesso total sem restrições
  if (session.user.email === "luizpavani@gmail.com") {
    return <>{children}</>;
  }

  /* NOTA IMPORTANTE: 
     Não fazemos o redirecionamento por 'status' ou 'plano' aqui no Layout.
     Isso permite que o aluno logado (mesmo que seja Plano Free) consiga:
     - Ver a lista de cursos disponível.
     - Clicar em um curso VIP e ver a tela de "Conteúdo Restrito" com o botão de Upgrade.
     Se bloqueássemos aqui, ele seria expulso antes de ver o que pode comprar.
  */

  return <>{children}</>;
}