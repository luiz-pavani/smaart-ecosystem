import { NextResponse } from 'next/server';
// Importa o cliente ADMIN (que tem permissão para gravar no banco)
// Usamos o alias "as supabase" para não quebrar o código abaixo que já usa "supabase.from..."
import { supabaseAdmin as supabase } from '../../../lib/supabase-admin';

export async function GET() {
  const csvData = `NOME;EMAIL;FONE;COND;ORIGEM
antonio jose pereira pinheiro;admjudopinheiro@gmail.com;;ATIVO;HOT
... (cole aqui os dados da sua planilha ou aponte para o arquivo)`;

  // Nota: Para 163 registros, o ideal é converter o CSV em um array de objetos JSON
  const alunosParaImportar = [
    { full_name: "antonio jose pereira pinheiro", email: "admjudopinheiro@gmail.com", phone: "", cond: "ATIVO", origem: "HOT", plan: "free", migracao_pendente: true },
    // ... adicione os outros aqui
  ];

  const { data, error } = await supabase
    .from('profiles')
    .upsert(alunosParaImportar, { onConflict: 'email' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: `${alunosParaImportar.length} alunos importados com sucesso!` });
}