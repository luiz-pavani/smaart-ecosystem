import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // Permite filtro por email (parâmetro opcional)
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  // Buscar todos os perfis
  let query = supabase.from("profiles").select("id,full_name,email,plan,status,updated_at").order("updated_at", { ascending: false });
  if (email) query = query.ilike("email", `%${email}%`);
  const { data: perfis, error: perfisError } = await query;
  if (perfisError) return NextResponse.json({ error: perfisError.message }, { status: 500 });

  // Buscar vendas para todos os emails encontrados
  const emails = perfis.map((p: any) => p.email);
  const { data: vendas, error: vendasError } = await supabase
    .from("vendas")
    .select("id,email,valor,plano,metodo,transaction_id,created_at,status")
    .in("email", emails);
  if (vendasError) return NextResponse.json({ error: vendasError.message }, { status: 500 });

  // Montar resposta agrupada por email
  const resultado = perfis.map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    plan: p.plan,
    status: p.status,
    updated_at: p.updated_at,
    vendas: (vendas || []).filter((v: any) => v.email === p.email)
  }));

  return NextResponse.json({ usuarios: resultado });
}
