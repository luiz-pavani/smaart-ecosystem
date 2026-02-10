import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Deleta usuário da tabela e do auth do Supabase
export async function POST(req: NextRequest) {
  const { email, id } = await req.json();
  const supabase = supabaseAdmin;

  if (!email && !id) {
    return NextResponse.json({ error: 'Informe email ou id.' }, { status: 400 });
  }

  // Busca usuário pelo email ou id
  let user;
  if (id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    user = data;
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    user = data;
  }

  // Tenta deletar do auth (Supabase Auth)
  let authId = user.id;
  if (user.user_id) authId = user.user_id;
  let authError = null;
  try {
    const res = await supabase.auth.admin.deleteUser(authId);
    authError = res.error;
  } catch (e) {
    authError = e;
  }

  // Se o erro for "User not found", ignora e segue para deletar do banco
  const authMessage = (authError && typeof authError === 'object' && 'message' in authError) ? (authError as any).message : String(authError);
  if (authError && !(authMessage && authMessage.includes('User not found'))) {
    return NextResponse.json({ error: 'Erro ao deletar do auth.', details: authMessage }, { status: 500 });
  }

  // Deleta da tabela de usuários
  const { error: dbError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);
  if (dbError) {
    return NextResponse.json({ error: 'Erro ao deletar do banco.', details: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
