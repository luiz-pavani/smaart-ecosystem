import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Se houver um redirecionamento específico após o login, use-o, senão vá para o dashboard
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
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

    // Troca o código temporário do Google por uma sessão real do Supabase
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Login sucesso! Redireciona para o Dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se algo deu errado (código inválido ou erro de sessão), volta para o login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}