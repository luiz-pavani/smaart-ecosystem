import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {
            // Route handler GET: não precisamos setar cookies
          },
        },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authEmail = normalizeEmail(userData.user.email || "");
    const authUserId = String(userData.user.id || "");

    // Busca perfil para recuperar subscription_id e emails anteriores (para manter histórico após troca de email)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, id_subscription, metadata")
      .eq("id", authUserId)
      .maybeSingle();

    const profileEmail = normalizeEmail((profile as any)?.email || "");
    const previousEmails = Array.isArray((profile as any)?.metadata?.previous_emails)
      ? (profile as any).metadata.previous_emails
      : [];
    const emailCandidates = Array.from(
      new Set([authEmail, profileEmail, ...(previousEmails || [])].filter(Boolean).map(normalizeEmail))
    );
    const subscriptionId = (profile as any)?.id_subscription ? String((profile as any).id_subscription) : "";

    // 1) Transações por subscription_id (mais estável se o email mudar)
    const bySubscription = subscriptionId
      ? await supabaseAdmin
          .from("vendas")
          .select(
            "id, created_at, plano, valor, metodo, transaction_id, subscription_id, cycle_number, event_type"
          )
          .eq("subscription_id", subscriptionId)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [], error: null };

    if ((bySubscription as any).error) {
      console.warn("[ME/TRANSACOES] Erro ao buscar por subscription_id:", (bySubscription as any).error.message);
    }

    // 2) Transações por email (fallback)
    const byEmail = emailCandidates.length
      ? await supabaseAdmin
          .from("vendas")
          .select(
            "id, created_at, plano, valor, metodo, transaction_id, subscription_id, cycle_number, event_type"
          )
          .in("email", emailCandidates)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [], error: null };

    if ((byEmail as any).error) {
      // Mantém compatibilidade com bases onde email não está normalizado
      const fallbackEmail = authEmail || profileEmail;
      if (fallbackEmail) {
        const byEmailIlike = await supabaseAdmin
          .from("vendas")
          .select(
            "id, created_at, plano, valor, metodo, transaction_id, subscription_id, cycle_number, event_type"
          )
          .ilike("email", fallbackEmail)
          .order("created_at", { ascending: false })
          .limit(50);
        if (byEmailIlike.error) {
          return NextResponse.json({ error: byEmailIlike.error.message }, { status: 500 });
        }
        const merged = [...((bySubscription as any).data || []), ...(byEmailIlike.data || [])];
        const uniq = Array.from(new Map(merged.map((v: any) => [v.id, v])).values());
        return NextResponse.json({ transacoes: uniq.slice(0, 20) }, { status: 200 });
      }
      return NextResponse.json({ transacoes: [] }, { status: 200 });
    }

    const merged = [...((bySubscription as any).data || []), ...(((byEmail as any).data) || [])];
    const uniq = Array.from(new Map(merged.map((v: any) => [v.id, v])).values());
    return NextResponse.json({ transacoes: uniq.slice(0, 20) }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
