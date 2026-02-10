import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function GET() {
  try {
    // 1. Localiza o ficheiro na raiz do projeto (profep-max-2026)
    // Certifica-te de que o nome do ficheiro na pasta é EXATAMENTE este:
    const fileName = 'PROFEP MIGRAÇÃO.csv';
    const filePath = path.join(process.cwd(), fileName);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: `Ficheiro não encontrado: ${fileName}. Verifica se ele está na raiz do projeto.` 
      }, { status: 404 });
    }

    // 2. Lê o conteúdo do ficheiro
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // 3. Divide por linhas e remove o cabeçalho
    const lines = fileContent.split(/\r?\n/);
    lines.shift(); // Remove: NOME;EMAIL;FONE;COND;ORIGEM

    // 4. Dicionário para evitar duplicados (Resolve o erro "ON CONFLICT DO UPDATE")
    const uniqueUsers = new Map();

    lines.forEach(line => {
      if (line.trim() !== '' && line.includes(';')) {
        const [nome, email, fone, cond, origem] = line.split(';');
        const cleanEmail = email?.toLowerCase().trim();

        // Só adiciona se o email for válido e ainda não estiver no Map
        if (cleanEmail && cleanEmail.includes('@')) {
          uniqueUsers.set(cleanEmail, {
            id: crypto.randomUUID(), // Resolve o erro de "null value in column id"
            full_name: nome?.trim() || 'Sem Nome',
            email: cleanEmail,
            phone: fone?.trim() || null,
            cond: cond?.trim() || 'INATIVO',
            origem: origem?.trim() || 'MIGRACAO',
            plan: 'free',
            migracao_pendente: true
          });
        }
      }
    });

    // Converte o Map de volta para uma lista (Array)
    const usuariosParaImportar = Array.from(uniqueUsers.values());

    if (usuariosParaImportar.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum dado válido extraído do CSV." });
    }

    // 5. Inserção no Supabase (Upsert)
    // ATENÇÃO: Lembra-te de DESATIVAR o RLS da tabela 'profiles' no painel do Supabase antes de correr.
    const { error } = await supabase
      .from('profiles')
      .upsert(usuariosParaImportar, { onConflict: 'email' });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      total_linhas_csv: lines.length,
      total_unicos_importados: usuariosParaImportar.length,
      message: "Missão cumprida! Os alunos já estão na Secretaria."
    });

  } catch (err: any) {
    console.error("Erro na Importação:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}