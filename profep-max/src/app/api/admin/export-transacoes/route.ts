import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // Permitir filtro por período via query params (ex: ?start=2026-01-01&end=2026-01-31)
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let query = supabase.from("vendas").select("id,email,valor,plano,metodo,transaction_id,created_at").order("created_at", { ascending: false });
  if (start) query = query.gte("created_at", start);
  if (end) query = query.lte("created_at", end);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // CSV export se ?csv=1
  if (searchParams.get("csv") === "1") {
    const header = "id,email,valor,plano,metodo,transaction_id,created_at";
    const rows = (data || []).map(v => [v.id, v.email, v.valor, v.plano, v.metodo, v.transaction_id, v.created_at].join(",")).join("\n");
    const csv = header + "\n" + rows;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=transacoes_profepmax.csv"
      }
    });
  }

  return NextResponse.json({ transacoes: data });
}
